/**
 * Edge-compatible auth utilities for use in Next.js middleware.
 * This module only uses jose (edge-compatible) — no prisma, no node:crypto.
 */
import { jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "auth-session";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-jwt-secret-change-in-production"
);
const ISSUER = "auth-center";

/**
 * Verify a session token string. Returns userId or null.
 */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: ISSUER });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
