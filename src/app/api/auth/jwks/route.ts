import { NextRequest } from "next/server";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

/**
 * JWKS endpoint — returns signing key metadata.
 *
 * Since Auth Center uses HS256 (symmetric HMAC), the actual secret
 * cannot be exposed.  This endpoint advertises the algorithm and key-id
 * so that downstream services know they must verify tokens via the
 * /api/auth/verify endpoint rather than local verification.
 */

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  return corsResponse(
    {
      keys: [
        {
          kty: "oct",
          alg: "HS256",
          use: "sig",
          kid: "auth-center-hs256-v1",
        },
      ],
      // Clients should use the /api/auth/verify endpoint for token validation
      verify_endpoint: "https://ag4.q37fh758g.click/api/auth/verify",
    },
    origin
  );
}
