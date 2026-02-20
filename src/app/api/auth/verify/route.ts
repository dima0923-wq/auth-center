import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    const body = await req.json();
    const { token } = body as { token?: string };

    if (!token) {
      return corsResponse({ error: "Token is required" }, origin, 400);
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
