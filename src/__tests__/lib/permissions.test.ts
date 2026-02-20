// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Unmock the permissions module so we test the real code
vi.unmock("@/lib/permissions");

// Keep Prisma mocked (from setup.ts)
import { prisma } from "@/lib/db";
const mockPrisma = vi.mocked(prisma, true);

import {
  PERMISSION_CATALOG,
  getAllPermissions,
  getUserPermissions,
  hasPermission,
} from "@/lib/permissions";

describe("Permission Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PERMISSION_CATALOG", () => {
    it("should have permissions for all project scopes", () => {
      expect(PERMISSION_CATALOG).toHaveProperty("creative_center");
      expect(PERMISSION_CATALOG).toHaveProperty("traffic_center");
      expect(PERMISSION_CATALOG).toHaveProperty("retention_center");
      expect(PERMISSION_CATALOG).toHaveProperty("global");
    });

    it("should have permission keys in project:resource:action format", () => {
      for (const [_project, perms] of Object.entries(PERMISSION_CATALOG)) {
        for (const perm of perms) {
          expect(perm.key).toMatch(/^[a-z]+:[a-z]+:[a-z]+$/);
          expect(typeof perm.name).toBe("string");
          expect(perm.name.length).toBeGreaterThan(0);
        }
      }
    });

    it("should include auth management permissions in global scope", () => {
      const globalKeys = PERMISSION_CATALOG.global.map((p) => p.key);
      expect(globalKeys).toContain("auth:users:read");
      expect(globalKeys).toContain("auth:roles:create");
      expect(globalKeys).toContain("auth:permissions:assign");
    });

    it("should include creative center permissions", () => {
      const creativeKeys = PERMISSION_CATALOG.creative_center.map((p) => p.key);
      expect(creativeKeys).toContain("creative:agents:create");
      expect(creativeKeys).toContain("creative:chat:send");
    });
  });

  describe("getAllPermissions", () => {
    it("should return permissions grouped by project", () => {
      const result = getAllPermissions();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(Object.keys(PERMISSION_CATALOG).length);
      for (const group of result) {
        expect(group).toHaveProperty("project");
        expect(group).toHaveProperty("permissions");
        expect(Array.isArray(group.permissions)).toBe(true);
      }
    });
  });

  describe("getUserPermissions", () => {
    it("should return permissions for a user with project roles", async () => {
      mockPrisma.userProjectRole.findMany.mockResolvedValue([
        {
          role: { id: "role-1", name: "editor", description: null, isSystem: false, createdAt: new Date(), updatedAt: new Date() },
          project: "creative_center",
        },
      ] as any);
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { roleId: "role-1", permissionId: "p1", permission: { id: "p1", key: "creative:agents:read", name: "View Agents" } },
        { roleId: "role-1", permissionId: "p2", permission: { id: "p2", key: "creative:chat:send", name: "Send Chat" } },
      ] as any);

      const perms = await getUserPermissions("user-1");
      expect(perms).toContain("creative:agents:read");
      expect(perms).toContain("creative:chat:send");
      expect(perms.length).toBe(2);
    });

    it("should return empty array for user with no roles", async () => {
      mockPrisma.userProjectRole.findMany.mockResolvedValue([]);

      const perms = await getUserPermissions("user-1");
      expect(perms).toEqual([]);
    });

    it("should deduplicate permissions across multiple roles", async () => {
      mockPrisma.userProjectRole.findMany.mockResolvedValue([
        { role: { id: "role-1", name: "editor" }, project: "creative_center" },
        { role: { id: "role-2", name: "viewer" }, project: "traffic_center" },
      ] as any);
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { roleId: "role-1", permissionId: "p1", permission: { id: "p1", key: "creative:agents:read" } },
        { roleId: "role-2", permissionId: "p1", permission: { id: "p1", key: "creative:agents:read" } },
        { roleId: "role-2", permissionId: "p2", permission: { id: "p2", key: "traffic:campaigns:read" } },
      ] as any);

      const perms = await getUserPermissions("user-1");
      expect(perms.length).toBe(2);
      expect(perms).toContain("creative:agents:read");
      expect(perms).toContain("traffic:campaigns:read");
    });
  });

  describe("hasPermission", () => {
    it("should return true when user has the exact permission", async () => {
      mockPrisma.userProjectRole.findMany.mockResolvedValue([
        { role: { id: "role-1", name: "editor" }, project: "creative_center" },
      ] as any);
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { roleId: "role-1", permissionId: "p1", permission: { id: "p1", key: "creative:agents:read" } },
      ] as any);

      const result = await hasPermission("user-1", "creative:agents:read");
      expect(result).toBe(true);
    });

    it("should return false when user lacks the permission", async () => {
      mockPrisma.userProjectRole.findMany.mockResolvedValue([
        { role: { id: "role-1", name: "viewer" }, project: "creative_center" },
      ] as any);
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { roleId: "role-1", permissionId: "p1", permission: { id: "p1", key: "creative:agents:read" } },
      ] as any);

      const result = await hasPermission("user-1", "creative:agents:delete");
      expect(result).toBe(false);
    });

    it("should support wildcard permissions", async () => {
      mockPrisma.userProjectRole.findMany.mockResolvedValue([
        { role: { id: "role-admin", name: "super_admin" }, project: "global" },
      ] as any);
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { roleId: "role-admin", permissionId: "p-wild", permission: { id: "p-wild", key: "*:*:*" } },
      ] as any);

      const result = await hasPermission("admin-1", "creative:agents:delete");
      expect(result).toBe(true);
    });

    it("should support partial wildcards", async () => {
      mockPrisma.userProjectRole.findMany.mockResolvedValue([
        { role: { id: "role-1", name: "creative-all" }, project: "creative_center" },
      ] as any);
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { roleId: "role-1", permissionId: "p1", permission: { id: "p1", key: "creative:*:*" } },
      ] as any);

      const result = await hasPermission("user-1", "creative:agents:delete");
      expect(result).toBe(true);
    });
  });
});
