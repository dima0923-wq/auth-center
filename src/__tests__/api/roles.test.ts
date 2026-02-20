// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

const mockPrisma = vi.mocked(prisma, true);

// The roles routes use withPermission middleware from auth-middleware.ts
// We need to mock the auth and hasPermission checks
vi.mock("@/lib/auth-middleware", () => {
  let mockUserId: string | null = null;
  let mockAllowed = false;

  return {
    __setMockAuth: (userId: string | null, allowed: boolean) => {
      mockUserId = userId;
      mockAllowed = allowed;
    },
    withAuth: (handler: any) => {
      return async (req: any, context: any) => {
        if (!mockUserId) {
          const { NextResponse } = await import("next/server");
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        req.userId = mockUserId;
        return handler(req, context);
      };
    },
    withPermission: (_permission: string, handler: any) => {
      return async (req: any, context: any) => {
        if (!mockUserId) {
          const { NextResponse } = await import("next/server");
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!mockAllowed) {
          const { NextResponse } = await import("next/server");
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        req.userId = mockUserId;
        return handler(req, context);
      };
    },
    withRole: (_roleName: string, handler: any) => {
      return async (req: any, context: any) => {
        if (!mockUserId) {
          const { NextResponse } = await import("next/server");
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!mockAllowed) {
          const { NextResponse } = await import("next/server");
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        req.userId = mockUserId;
        return handler(req, context);
      };
    },
  };
});

// Mock permissions module with actual SYSTEM_ROLES values
vi.mock("@/lib/permissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/permissions")>("@/lib/permissions");
  return {
    ...actual,
    hasPermission: vi.fn(),
    getUserRoles: vi.fn(),
    getUserPermissions: vi.fn(),
    getPermissionMatrix: vi.fn(),
  };
});

import { NextRequest } from "next/server";

function makeRequest(url: string, options?: { method?: string; body?: unknown }) {
  const { method = "GET", body } = options ?? {};
  const init: any = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

async function setAuth(userId: string | null, allowed: boolean) {
  const mod = await import("@/lib/auth-middleware") as any;
  mod.__setMockAuth(userId, allowed);
}

const now = new Date();

describe("GET /api/roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    await setAuth(null, false);
    const { GET } = await import("@/app/api/roles/route");
    const req = makeRequest("http://localhost:3000/api/roles");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("should return 403 when user lacks permission", async () => {
    await setAuth("user-1", false);
    const { GET } = await import("@/app/api/roles/route");
    const req = makeRequest("http://localhost:3000/api/roles");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it("should return roles list for authorized user", async () => {
    await setAuth("admin-1", true);
    const roles = [
      { id: "r1", name: "admin", description: "Full access", createdAt: now, updatedAt: now, _count: { users: 2, permissions: 10 } },
      { id: "r2", name: "viewer", description: "Read only", createdAt: now, updatedAt: now, _count: { users: 5, permissions: 3 } },
    ];
    mockPrisma.role.findMany.mockResolvedValue(roles as any);

    const { GET } = await import("@/app/api/roles/route");
    const req = makeRequest("http://localhost:3000/api/roles");
    const res = await GET(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("admin");
  });
});

describe("POST /api/roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    await setAuth(null, false);
    const { POST } = await import("@/app/api/roles/route");
    const req = makeRequest("http://localhost:3000/api/roles", {
      method: "POST",
      body: { name: "new-role" },
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("should create a new role", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue(null);
    const newRole = { id: "r-new", name: "custom-role", description: "A custom role", createdAt: now, updatedAt: now };
    mockPrisma.role.create.mockResolvedValue(newRole as any);

    const { POST } = await import("@/app/api/roles/route");
    const req = makeRequest("http://localhost:3000/api/roles", {
      method: "POST",
      body: { name: "custom-role", description: "A custom role" },
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
  });

  it("should return 400 when name is empty", async () => {
    await setAuth("admin-1", true);
    const { POST } = await import("@/app/api/roles/route");
    const req = makeRequest("http://localhost:3000/api/roles", {
      method: "POST",
      body: { name: "" },
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it("should return 409 when role name already exists", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue({ id: "r-existing", name: "editor" } as any);

    const { POST } = await import("@/app/api/roles/route");
    const req = makeRequest("http://localhost:3000/api/roles", {
      method: "POST",
      body: { name: "editor" },
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(409);
  });
});

describe("PUT /api/roles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update a role", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue({ id: "r1", name: "editor" } as any);
    mockPrisma.role.findFirst.mockResolvedValue(null);
    mockPrisma.role.update.mockResolvedValue({ id: "r1", name: "senior-editor", description: "Updated" } as any);

    const { PUT } = await import("@/app/api/roles/[id]/route");
    const req = makeRequest("http://localhost:3000/api/roles/r1", {
      method: "PUT",
      body: { name: "senior-editor", description: "Updated" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
  });

  it("should return 404 when role not found", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue(null);

    const { PUT } = await import("@/app/api/roles/[id]/route");
    const req = makeRequest("http://localhost:3000/api/roles/nonexistent", {
      method: "PUT",
      body: { name: "updated" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("should return 409 when new name conflicts with existing role", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue({ id: "r1", name: "editor" } as any);
    mockPrisma.role.findFirst.mockResolvedValue({ id: "r2", name: "admin" } as any);

    const { PUT } = await import("@/app/api/roles/[id]/route");
    const req = makeRequest("http://localhost:3000/api/roles/r1", {
      method: "PUT",
      body: { name: "admin" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/roles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a custom role", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue({ id: "r1", name: "custom-role", isSystem: false } as any);
    mockPrisma.role.delete.mockResolvedValue({} as any);

    const { DELETE } = await import("@/app/api/roles/[id]/route");
    const req = makeRequest("http://localhost:3000/api/roles/r1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("should return 403 when trying to delete a system role", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue({ id: "r-admin", name: "admin", isSystem: true } as any);

    const { DELETE } = await import("@/app/api/roles/[id]/route");
    const req = makeRequest("http://localhost:3000/api/roles/r-admin", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "r-admin" }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("system role");
  });

  it("should return 404 when role not found", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/roles/[id]/route");
    const req = makeRequest("http://localhost:3000/api/roles/nonexistent", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/roles/[id]/permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return permissions for a role", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue({
      id: "r1",
      name: "editor",
      permissions: [
        { permission: { id: "p1", name: "creative:agents:read", description: "Read agents", createdAt: now } },
        { permission: { id: "p2", name: "creative:chat:send", description: "Send messages", createdAt: now } },
      ],
    } as any);

    const { GET } = await import("@/app/api/roles/[id]/permissions/route");
    const req = makeRequest("http://localhost:3000/api/roles/r1/permissions");
    const res = await GET(req, { params: Promise.resolve({ id: "r1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.role.name).toBe("editor");
    expect(data.permissions).toHaveLength(2);
  });

  it("should return 404 when role not found", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/roles/[id]/permissions/route");
    const req = makeRequest("http://localhost:3000/api/roles/nonexistent/permissions");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/roles/[id]/permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set permissions for a role", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique
      .mockResolvedValueOnce({ id: "r1", name: "editor" } as any) // first call: check role exists
      .mockResolvedValueOnce({ // second call: return updated
        id: "r1",
        name: "editor",
        permissions: [
          { permission: { id: "p1", name: "creative:agents:read" } },
        ],
      } as any);
    mockPrisma.permission.findMany.mockResolvedValue([
      { id: "p1", name: "creative:agents:read" },
    ] as any);
    mockPrisma.$transaction.mockResolvedValue([]);

    const { PUT } = await import("@/app/api/roles/[id]/permissions/route");
    const req = makeRequest("http://localhost:3000/api/roles/r1/permissions", {
      method: "PUT",
      body: { permissionIds: ["p1"] },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
  });

  it("should return 400 when permissionIds is not an array", async () => {
    await setAuth("admin-1", true);
    const { PUT } = await import("@/app/api/roles/[id]/permissions/route");
    const req = makeRequest("http://localhost:3000/api/roles/r1/permissions", {
      method: "PUT",
      body: { permissionIds: "not-array" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(400);
  });

  it("should return 400 when some permission IDs are invalid", async () => {
    await setAuth("admin-1", true);
    mockPrisma.role.findUnique.mockResolvedValue({ id: "r1", name: "editor" } as any);
    mockPrisma.permission.findMany.mockResolvedValue([
      { id: "p1", name: "creative:agents:read" },
    ] as any);

    const { PUT } = await import("@/app/api/roles/[id]/permissions/route");
    const req = makeRequest("http://localhost:3000/api/roles/r1/permissions", {
      method: "PUT",
      body: { permissionIds: ["p1", "p-invalid"] },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("invalid");
  });
});
