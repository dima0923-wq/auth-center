import { NextRequest } from "next/server";
import { refreshToken } from "@/lib/jwt";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    const body = await req.json();
    const { refreshToken: token } = body as { refreshToken?: string };

    if (!token) {
      return corsResponse(
        { error: "Refresh token is required" },
        origin,
        400
      );
    }

    const result = await refreshToken(token);

    if (!result) {
      return corsResponse(
        { error: "Invalid or expired refresh token" },
        origin,
        401
      );
    }

    return corsResponse(
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      },
      origin
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return corsResponse({ error: message }, origin, 500);
  }
}
