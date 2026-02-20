// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.unmock("@/lib/jwt");

import { issueProjectToken, verifyToken, refreshToken } from "@/lib/jwt";

describe("JWT Token Service", () => {
  const testUser = {
    id: "user-123",
    telegramId: "123456789",
    username: "testuser",
    firstName: "Test User",
    photoUrl: null,
    role: "editor",
  };

  const testProject = "creative_center";
  const testPermissions = ["creative:agents:read", "creative:chat:send"];

  describe("issueProjectToken", () => {
    it("should return accessToken, refreshToken, and expiresAt", async () => {
      const result = await issueProjectToken(testUser, testProject, testPermissions);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("expiresAt");
      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");
      expect(typeof result.expiresAt).toBe("number");
    });

    it("should set expiresAt approximately 1 hour in the future", async () => {
      const before = Math.floor(Date.now() / 1000);
      const result = await issueProjectToken(testUser, testProject, testPermissions);
      const after = Math.floor(Date.now() / 1000);

      // expiresAt should be ~3600 seconds from now
      expect(result.expiresAt).toBeGreaterThanOrEqual(before + 3599);
      expect(result.expiresAt).toBeLessThanOrEqual(after + 3601);
    });

    it("should produce distinct access and refresh tokens", async () => {
      const result = await issueProjectToken(testUser, testProject, testPermissions);
      expect(result.accessToken).not.toBe(result.refreshToken);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid access token and return user info", async () => {
      const tokens = await issueProjectToken(testUser, testProject, testPermissions);
      const result = await verifyToken(tokens.accessToken);

      expect(result.valid).toBe(true);
      expect(result.user).toEqual({
        id: testUser.id,
        telegramId: testUser.telegramId,
        username: testUser.username,
        firstName: testUser.firstName,
        photoUrl: testUser.photoUrl,
        role: testUser.role,
      });
      expect(result.project).toBe(testProject);
      expect(result.permissions).toEqual(testPermissions);
    });

    it("should verify a valid refresh token", async () => {
      const tokens = await issueProjectToken(testUser, testProject, testPermissions);
      const result = await verifyToken(tokens.refreshToken);

      expect(result.valid).toBe(true);
      expect(result.user!.id).toBe(testUser.id);
    });

    it("should reject an invalid token", async () => {
      const result = await verifyToken("invalid.jwt.token");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject a tampered token", async () => {
      const tokens = await issueProjectToken(testUser, testProject, testPermissions);
      const tampered = tokens.accessToken.slice(0, -5) + "XXXXX";
      const result = await verifyToken(tampered);
      expect(result.valid).toBe(false);
    });

    it("should reject an empty string", async () => {
      const result = await verifyToken("");
      expect(result.valid).toBe(false);
    });
  });

  describe("refreshToken", () => {
    it("should issue new tokens from a valid refresh token", async () => {
      const original = await issueProjectToken(testUser, testProject, testPermissions);
      const result = await refreshToken(original.refreshToken);

      expect(result).not.toBeNull();
      expect(typeof result!.accessToken).toBe("string");
      expect(result!.accessToken.length).toBeGreaterThan(0);
      expect(typeof result!.refreshToken).toBe("string");
      expect(result!.refreshToken.length).toBeGreaterThan(0);
      expect(typeof result!.expiresAt).toBe("number");
      // The new access token should be verifiable
      const verified = await verifyToken(result!.accessToken);
      expect(verified.valid).toBe(true);
      expect(verified.user!.id).toBe(testUser.id);
    });

    it("should reject an access token used as refresh token", async () => {
      const tokens = await issueProjectToken(testUser, testProject, testPermissions);
      const result = await refreshToken(tokens.accessToken);
      expect(result).toBeNull();
    });

    it("should reject an invalid token", async () => {
      const result = await refreshToken("invalid.token.here");
      expect(result).toBeNull();
    });

    it("should preserve user claims in refreshed tokens", async () => {
      const original = await issueProjectToken(testUser, testProject, testPermissions);
      const newTokens = await refreshToken(original.refreshToken);
      expect(newTokens).not.toBeNull();

      const verified = await verifyToken(newTokens!.accessToken);
      expect(verified.valid).toBe(true);
      expect(verified.user!.id).toBe(testUser.id);
      expect(verified.user!.telegramId).toBe(testUser.telegramId);
      expect(verified.project).toBe(testProject);
      expect(verified.permissions).toEqual(testPermissions);
    });
  });
});
