import { vi } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  [K in keyof typeof prisma]: {
    [M: string]: ReturnType<typeof vi.fn>;
  };
};

export { mockAuth, mockPrisma };

export function setSession(session: {
  user: {
    id: string;
    email?: string;
    name?: string;
    image?: string | null;
    role?: string | null;
    permissions?: string[];
  };
} | null) {
  mockAuth.mockResolvedValue(session);
}

export function setUnauthenticated() {
  mockAuth.mockResolvedValue(null);
}

export function setAuthenticatedUser(overrides?: {
  id?: string;
  email?: string;
  permissions?: string[];
  role?: string;
}) {
  setSession({
    user: {
      id: overrides?.id ?? "user-1",
      email: overrides?.email ?? "user@example.com",
      name: "Test User",
      image: null,
      role: overrides?.role ?? "viewer",
      permissions: overrides?.permissions ?? [],
    },
  });
}

export function setAdminUser(overrides?: { id?: string; email?: string }) {
  setSession({
    user: {
      id: overrides?.id ?? "admin-1",
      email: overrides?.email ?? "admin@example.com",
      name: "Admin User",
      image: null,
      role: "admin",
      permissions: [
        "users:read",
        "users:create",
        "users:update",
        "users:delete",
        "auth:roles:read",
        "auth:roles:create",
        "auth:roles:update",
        "auth:roles:delete",
        "auth:permissions:read",
        "auth:permissions:assign",
      ],
    },
  });
}

export function createRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): NextRequest {
  const { method = "GET", body, headers = {} } = options ?? {};
  const init: any = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

export function makeUser(overrides?: Partial<{
  id: string;
  telegramId: bigint;
  username: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  photoUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  projectRoles: any[];
}>) {
  const now = new Date();
  return {
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
    ...overrides,
  };
}

export function makeRole(overrides?: Partial<{
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}>) {
  const now = new Date();
  return {
    id: "role-1",
    name: "editor",
    description: "Can edit content",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function resetAllMocks() {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === "object" && model !== null) {
      Object.values(model).forEach((fn) => {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset();
        }
      });
    }
  });
  mockAuth.mockReset();
}
