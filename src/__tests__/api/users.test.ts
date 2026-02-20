// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma, true);

function makeRequest(url: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  const { method = "GET", body, headers = {} } = options ?? {};
  const init: any = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function setAdmin() {
  mockAuth.mockResolvedValue({
    user: {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      image: null,
      role: "admin",
      permissions: ["users:read", "users:create", "users:update", "users:delete"],
    },
  } as any);
}

function setViewer() {
  mockAuth.mockResolvedValue({
    user: {
      id: "viewer-1",
      email: "viewer@example.com",
      name: "Viewer",
      image: null,
      role: "viewer",
      permissions: [],
    },
  } as any);
}

function setUnauthenticated() {
  mockAuth.mockResolvedValue(null);
}

const now = new Date();
const testUser = {
  id: "user-1",
  telegramId: BigInt(123456789),
  username: "testuser",
  firstName: "Test User",
  lastName: null,
  email: null,
  photoUrl: null,
  status: "ACTIVE",
  createdAt: now,
  updatedAt: now,
  projectRoles: [],
};

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    setUnauthenticated();
    const { GET } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 when user lacks users:read permission", async () => {
    setViewer();
    const { GET } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("should return paginated users for admin", async () => {
    setAdmin();
    mockPrisma.user.findMany.mockResolvedValue([testUser] as any);
    mockPrisma.user.count.mockResolvedValue(1);

    const { GET } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users?page=1&limit=20");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.users[0].firstName).toBe("Test User");
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("should support search parameter", async () => {
    setAdmin();
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const { GET } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users?search=test");
    await GET(req);

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { firstName: { contains: "test" } },
            { username: { contains: "test" } },
          ]),
        }),
      })
    );
  });
});

describe("POST /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    setUnauthenticated();
    const { POST } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users", {
      method: "POST",
      body: { telegramId: "999999", firstName: "New" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 when user lacks users:create permission", async () => {
    setViewer();
    const { POST } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users", {
      method: "POST",
      body: { telegramId: "999999", firstName: "New" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should create a user with valid telegramId", async () => {
    setAdmin();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const createdUser = { ...testUser, id: "new-1", telegramId: BigInt(999999) };
    mockPrisma.user.create.mockResolvedValue(createdUser as any);

    const { POST } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users", {
      method: "POST",
      body: { telegramId: "999999", firstName: "New User" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should return 422 when telegramId is missing", async () => {
    setAdmin();
    const { POST } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users", {
      method: "POST",
      body: { firstName: "No Telegram" },
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("should return 422 when telegram user already exists", async () => {
    setAdmin();
    mockPrisma.user.findUnique.mockResolvedValue(testUser as any);

    const { POST } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users", {
      method: "POST",
      body: { telegramId: "123456789", firstName: "Duplicate" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(422);
    expect(data.error).toContain("already exists");
  });

  it("should return 422 when firstName is missing", async () => {
    setAdmin();
    const { POST } = await import("@/app/api/users/route");
    const req = makeRequest("http://localhost:3000/api/users", {
      method: "POST",
      body: { telegramId: "999999" },
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    setUnauthenticated();
    const { GET } = await import("@/app/api/users/me/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("should return current user profile with permissions", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", telegramId: "123456789" },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue({
      ...testUser,
      projectRoles: [
        {
          project: "creative_center",
          role: {
            id: "role-1",
            name: "editor",
            description: "Editor role",
            permissions: [
              { permission: { id: "p1", key: "creative:agents:read", name: "Read agents", description: "Read agents" } },
            ],
          },
        },
      ],
    } as any);

    const { GET } = await import("@/app/api/users/me/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("user-1");
    expect(data.projectRoles).toHaveLength(1);
    expect(data.projectRoles[0].role.name).toBe("editor");
    expect(data.projectRoles[0].role.permissions).toHaveLength(1);
    expect(data.projectRoles[0].role.permissions[0].name).toBe("Read agents");
  });
});

describe("PUT /api/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    setUnauthenticated();
    const { PUT } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1", {
      method: "PUT",
      body: { name: "Updated" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 403 without users:update permission", async () => {
    setViewer();
    const { PUT } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1", {
      method: "PUT",
      body: { name: "Updated" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(403);
  });

  it("should return 404 when user not found", async () => {
    setAdmin();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const { PUT } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/nonexistent", {
      method: "PUT",
      body: { name: "Updated" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("should update user firstName and status", async () => {
    setAdmin();
    mockPrisma.user.findUnique.mockResolvedValue(testUser as any);
    const updated = { ...testUser, firstName: "Updated", status: "DISABLED", projectRoles: [] };
    mockPrisma.user.update.mockResolvedValue(updated as any);

    const { PUT } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1", {
      method: "PUT",
      body: { firstName: "Updated", status: "DISABLED" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(200);
  });

  it("should return 422 when status is invalid", async () => {
    setAdmin();
    mockPrisma.user.findUnique.mockResolvedValue(testUser as any);
    const { PUT } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1", {
      method: "PUT",
      body: { status: "INVALID" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    setUnauthenticated();
    const { DELETE } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 403 without users:delete permission", async () => {
    setViewer();
    const { DELETE } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(403);
  });

  it("should prevent self-deletion", async () => {
    setAdmin();
    const { DELETE } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/admin-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "admin-1" }) });
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("own account");
  });

  it("should return 404 when user not found", async () => {
    setAdmin();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/nonexistent", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("should soft-delete (disable) the user", async () => {
    setAdmin();
    mockPrisma.user.findUnique.mockResolvedValue(testUser as any);
    mockPrisma.user.update.mockResolvedValue({ ...testUser, status: "DISABLED" } as any);

    const { DELETE } = await import("@/app/api/users/[id]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(200);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { status: "DISABLED" },
    });
  });
});
