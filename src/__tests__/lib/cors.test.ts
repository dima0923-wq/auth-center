// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.unmock("@/lib/cors");

import { getCorsHeaders, corsResponse, corsOptionsResponse } from "@/lib/cors";

describe("CORS Utilities", () => {
  describe("getCorsHeaders", () => {
    it("should include Access-Control-Allow-Origin for allowed origins", () => {
      const headers = getCorsHeaders("http://localhost:3000");
      expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:3000");
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("should include CORS headers for production origins", () => {
      const headers = getCorsHeaders("https://ag1.q37fh758g.click");
      expect(headers["Access-Control-Allow-Origin"]).toBe("https://ag1.q37fh758g.click");
    });

    it("should NOT include Access-Control-Allow-Origin for disallowed origins", () => {
      const headers = getCorsHeaders("https://evil.example.com");
      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    it("should handle null origin", () => {
      const headers = getCorsHeaders(null);
      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(headers["Access-Control-Allow-Methods"]).toBeDefined();
    });

    it("should always include method and header CORS fields", () => {
      const headers = getCorsHeaders(null);
      expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
      expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
      expect(headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
      expect(headers["Access-Control-Allow-Headers"]).toContain("Authorization");
    });
  });

  describe("corsResponse", () => {
    it("should return a JSON response with given status", () => {
      const res = corsResponse({ ok: true }, "http://localhost:3000", 200);
      expect(res.status).toBe(200);
    });

    it("should use 200 as default status", () => {
      const res = corsResponse({ ok: true }, null);
      expect(res.status).toBe(200);
    });

    it("should return error status when specified", () => {
      const res = corsResponse({ error: "bad" }, null, 400);
      expect(res.status).toBe(400);
    });
  });

  describe("corsOptionsResponse", () => {
    it("should return 204 for preflight requests", () => {
      const res = corsOptionsResponse("http://localhost:3000");
      expect(res.status).toBe(204);
    });
  });
});
