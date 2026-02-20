import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"));
}

/**
 * POST /api/auth/verify
 *
 * Accepts token in two ways:
 * 1. JSON body: { "token": "..." }
 * 2. Authorization header: Bearer <token>
 *
 * Returns decoded user info if valid, 401 if not.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    // Try Authorization header first
    let token: string | undefined;

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }

    // Fall back to JSON body
    if (!token) {
      try {
        const body = await req.json();
        token = body.token;
      } catch {
        // Body may not be JSON
      }
    }

    if (!token) {
      return corsResponse({ error: "Token is required (body or Authorization header)" }, origin, 400);
    }

    const result = await verifyToken(token);

    if (!result.valid) {
      return corsResponse(
        { valid: false, error: result.error },
        origin,
        401
      );
    }

    return corsResponse(
      {
        valid: true,
        user: result.user,
        project: result.project,
        permissions: result.permissions,
      },
      origin
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return corsResponse({ error: message }, origin, 500);
  }
}
