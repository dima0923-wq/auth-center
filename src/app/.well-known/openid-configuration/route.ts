import { NextRequest } from "next/server";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

/**
 * OpenID Connect Discovery endpoint.
 * Allows downstream projects to auto-discover auth endpoints.
 */

const BASE_URL = "https://ag4.q37fh758g.click";

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  return corsResponse(
    {
      issuer: "auth-center",
      authorization_endpoint: `${BASE_URL}/login`,
      token_endpoint: `${BASE_URL}/api/auth/token`,
      userinfo_endpoint: `${BASE_URL}/api/auth/me`,
      jwks_uri: `${BASE_URL}/api/auth/jwks`,
      verify_endpoint: `${BASE_URL}/api/auth/verify`,
      id_token_signing_alg_values_supported: ["HS256"],
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      scopes_supported: [
        "creative_center",
        "traffic_center",
        "retention_center",
      ],
    },
    origin
  );
}
