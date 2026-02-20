// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

const mockPrisma = vi.mocked(prisma, true);

// Mock the projects module
vi.mock("@/lib/projects", async () => {
  return {
    PROJECT_IDS: ["creative_center", "traffic_center", "retention_center"],
    isValidProject: (p: string) => ["creative_center", "traffic_center", "retention_center"].includes(p),
    PROJECTS: {
      creative_center: { id: "creative_center", name: "Creative Center", description: "AI creative gen", url: "https://ag1.q37fh758g.click", icon: "palette" },
      traffic_center: { id: "traffic_center", name: "Traffic Center", description: "Meta ad buying", url: "https://ag3.q37fh758g.click", icon: "bar-chart" },
      retention_center: { id: "retention_center", name: "Retention Center", description: "Retention", url: "http://ag2.q37fh758g.click", icon: "mail" },
    },
    getProject: vi.fn(),
    canAccessProject: vi.fn(),
    getAccessibleProjects: vi.fn(),
    getUserProjectRole: vi.fn(),
  };
});

function makeRequest(url: string, options?: { method?: string; body?: unknown }) {
  const { method = "GET", body } = options ?? {};
  const init: any = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

const now = new Date();

describe("GET /api/users/[id]/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/users/[id]/projects/route");
    const req = makeRequest("http://localhost:3000/api/users/nonexistent/projects");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("should return user project roles", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" } as any);
    mockPrisma.userProjectRole.findMany.mockResolvedValue([
      {
        project: "creative_center",
        role: { id: "r1", name: "editor", permissions: [{ permission: { name: "creative:agents:read" } }] },
        createdAt: now,
      },
    ] as any);

    const { GET } = await import("@/app/api/users/[id]/projects/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects");
    const res = await GET(req, { params: Promise.resolve({ id: "user-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userId).toBe("user-1");
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].project).toBe("creative_center");
    expect(data.projects[0].role.name).toBe("editor");
  });

  it("should filter out invalid project IDs", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" } as any);
    mockPrisma.userProjectRole.findMany.mockResolvedValue([
      { project: "creative_center", role: { id: "r1", name: "editor", permissions: [] }, createdAt: now },
      { project: "invalid_project", role: { id: "r2", name: "viewer", permissions: [] }, createdAt: now },
    ] as any);

    const { GET } = await import("@/app/api/users/[id]/projects/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects");
    const res = await GET(req, { params: Promise.resolve({ id: "user-1" }) });
    const data = await res.json();

    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].project).toBe("creative_center");
  });
});

describe("GET /api/users/[id]/projects/[project]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 for invalid project", async () => {
    const { GET } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/invalid");
    const res = await GET(req, { params: Promise.resolve({ id: "user-1", project: "invalid" }) });
    expect(res.status).toBe(400);
  });

  it("should return 404 when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/nonexistent/projects/creative_center");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent", project: "creative_center" }) });
    expect(res.status).toBe(404);
  });

  it("should return 404 when user has no role for the project", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" } as any);
    mockPrisma.userProjectRole.findUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/creative_center");
    const res = await GET(req, { params: Promise.resolve({ id: "user-1", project: "creative_center" }) });
    expect(res.status).toBe(404);
  });

  it("should return user project role with permissions", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" } as any);
    mockPrisma.userProjectRole.findUnique.mockResolvedValue({
      userId: "user-1",
      project: "creative_center",
      role: {
        id: "r1",
        name: "editor",
        permissions: [{ permission: { name: "creative:agents:read" } }],
      },
      createdAt: now,
    } as any);

    const { GET } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/creative_center");
    const res = await GET(req, { params: Promise.resolve({ id: "user-1", project: "creative_center" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.project).toBe("creative_center");
    expect(data.role.name).toBe("editor");
    expect(data.role.permissions).toContain("creative:agents:read");
  });
});

describe("PUT /api/users/[id]/projects/[project]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 for invalid project", async () => {
    const { PUT } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/invalid", {
      method: "PUT",
      body: { roleId: "r1" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "user-1", project: "invalid" }) });
    expect(res.status).toBe(400);
  });

  it("should return 400 when roleId is missing", async () => {
    const { PUT } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/creative_center", {
      method: "PUT",
      body: {},
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "user-1", project: "creative_center" }) });
    expect(res.status).toBe(400);
  });

  it("should return 404 when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const { PUT } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/nonexistent/projects/creative_center", {
      method: "PUT",
      body: { roleId: "r1" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "nonexistent", project: "creative_center" }) });
    expect(res.status).toBe(404);
  });

  it("should return 404 when role not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" } as any);
    mockPrisma.role.findUnique.mockResolvedValue(null);
    const { PUT } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/creative_center", {
      method: "PUT",
      body: { roleId: "nonexistent-role" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "user-1", project: "creative_center" }) });
    expect(res.status).toBe(404);
  });

  it("should assign or update project role via upsert", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" } as any);
    mockPrisma.role.findUnique.mockResolvedValue({ id: "r1", name: "editor" } as any);
    mockPrisma.userProjectRole.upsert.mockResolvedValue({
      userId: "user-1",
      project: "creative_center",
      role: { id: "r1", name: "editor", permissions: [] },
      createdAt: now,
    } as any);

    const { PUT } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/creative_center", {
      method: "PUT",
      body: { roleId: "r1" },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "user-1", project: "creative_center" }) });
    expect(res.status).toBe(200);

    expect(mockPrisma.userProjectRole.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_project: { userId: "user-1", project: "creative_center" } },
      create: { userId: "user-1", project: "creative_center", roleId: "r1" },
      update: { roleId: "r1" },
    }));
  });
});

describe("DELETE /api/users/[id]/projects/[project]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 for invalid project", async () => {
    const { DELETE } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/invalid", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "user-1", project: "invalid" }) });
    expect(res.status).toBe(400);
  });

  it("should return 404 when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/nonexistent/projects/creative_center", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent", project: "creative_center" }) });
    expect(res.status).toBe(404);
  });

  it("should return 404 when no role assignment exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" } as any);
    mockPrisma.userProjectRole.findUnique.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/creative_center", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "user-1", project: "creative_center" }) });
    expect(res.status).toBe(404);
  });

  it("should remove project access", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" } as any);
    mockPrisma.userProjectRole.findUnique.mockResolvedValue({
      userId: "user-1",
      project: "creative_center",
    } as any);
    mockPrisma.userProjectRole.delete.mockResolvedValue({} as any);

    const { DELETE } = await import("@/app/api/users/[id]/projects/[project]/route");
    const req = makeRequest("http://localhost:3000/api/users/user-1/projects/creative_center", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "user-1", project: "creative_center" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.userProjectRole.delete).toHaveBeenCalledWith({
      where: { userId_project: { userId: "user-1", project: "creative_center" } },
    });
  });
});
