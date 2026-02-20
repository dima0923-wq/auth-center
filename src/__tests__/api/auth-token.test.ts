// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

const mockAuth = vi.mocked(auth);

// Mock JWT functions
vi.mock("@/lib/jwt", () => ({
  issueProjectToken: vi.fn(),
  verifyToken: vi.fn(),
  refreshToken: vi.fn(),
}));

vi.mock("@/lib/cors", () => ({
  corsResponse: vi.fn((body: unknown, _origin: string | null, status = 200) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(body, { status });
  }),
  corsOptionsResponse: vi.fn((_origin: string | null) => {
    const { NextResponse } = require("next/server");
    return new NextResponse(null, { status: 204 });
  }),
  getCorsHeaders: vi.fn(() => ({})),
}));

import { issueProjectToken, verifyToken, refreshToken } from "@/lib/jwt";
const mockIssueToken = vi.mocked(issueProjectToken);
const mockVerifyToken = vi.mocked(verifyToken);
const mockRefreshToken = vi.mocked(refreshToken);

function makeRequest(url: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  const { method = "POST", body, headers = {} } = options ?? {};
  const init: any = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("POST /api/auth/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/token/route");
    const req = makeRequest("http://localhost:3000/api/auth/token", {
      body: { project: "creative_center" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid project", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", telegramId: "123456789", username: "test", firstName: "Test", roles: {}, permissions: [] },
    } as any);

    const { POST } = await import("@/app/api/auth/token/route");
    const req = makeRequest("http://localhost:3000/api/auth/token", {
      body: { project: "invalid_project" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 when project is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", telegramId: "123456789", username: "test", firstName: "Test", roles: {}, permissions: [] },
    } as any);

    const { POST } = await import("@/app/api/auth/token/route");
    const req = makeRequest("http://localhost:3000/api/auth/token", {
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should issue tokens for a valid project", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        telegramId: "123456789",
        username: "testuser",
        firstName: "Test User",
        photoUrl: null,
        roles: { creative_center: "editor" },
        permissions: ["creative:agents:read"],
      },
    } as any);

    const tokenResponse = {
      accessToken: "access.token.here",
      refreshToken: "refresh.token.here",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    mockIssueToken.mockResolvedValue(tokenResponse);

    const { POST } = await import("@/app/api/auth/token/route");
    const req = makeRequest("http://localhost:3000/api/auth/token", {
      body: { project: "creative_center" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accessToken).toBe("access.token.here");
    expect(data.refreshToken).toBe("refresh.token.here");
  });
});

describe("POST /api/auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when token is missing", async () => {
    const { POST } = await import("@/app/api/auth/verify/route");
    const req = makeRequest("http://localhost:3000/api/auth/verify", {
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return valid=true for a valid token", async () => {
    mockVerifyToken.mockResolvedValue({
      valid: true,
      user: {
        id: "user-1",
        telegramId: "123456789",
        username: "testuser",
        firstName: "Test",
        photoUrl: null,
        role: "editor",
      },
      project: "creative_center",
      permissions: ["creative:agents:read"],
    });

    const { POST } = await import("@/app/api/auth/verify/route");
    const req = makeRequest("http://localhost:3000/api/auth/verify", {
      body: { token: "valid.jwt.token" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.user.id).toBe("user-1");
    expect(data.project).toBe("creative_center");
    expect(data.permissions).toContain("creative:agents:read");
  });

  it("should return 401 for an invalid token", async () => {
    mockVerifyToken.mockResolvedValue({
      valid: false,
      error: "Token expired",
    });

    const { POST } = await import("@/app/api/auth/verify/route");
    const req = makeRequest("http://localhost:3000/api/auth/verify", {
      body: { token: "expired.jwt.token" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.valid).toBe(false);
    expect(data.error).toBe("Token expired");
  });
});

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when refresh token is missing", async () => {
    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = makeRequest("http://localhost:3000/api/auth/refresh", {
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return new tokens for a valid refresh token", async () => {
    const newTokens = {
      accessToken: "new.access.token",
      refreshToken: "new.refresh.token",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    mockRefreshToken.mockResolvedValue(newTokens);

    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = makeRequest("http://localhost:3000/api/auth/refresh", {
      body: { refreshToken: "old.refresh.token" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accessToken).toBe("new.access.token");
    expect(data.refreshToken).toBe("new.refresh.token");
  });

  it("should return 401 for an invalid refresh token", async () => {
    mockRefreshToken.mockResolvedValue(null);

    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = makeRequest("http://localhost:3000/api/auth/refresh", {
      body: { refreshToken: "invalid.token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
