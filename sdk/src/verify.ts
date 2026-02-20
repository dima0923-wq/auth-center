import type { AuthUser, VerifyOptions, VerifyResponse } from "./types.js";

const DEFAULT_AUTH_CENTER_URL = "https://auth.q37fh758g.click";
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  user: AuthUser;
  expiresAt: number;
}

/** In-memory token verification cache */
const tokenCache = new Map<string, CacheEntry>();

function getAuthCenterUrl(options?: VerifyOptions): string {
  return (
    options?.authCenterUrl ||
    (typeof process !== "undefined" && process.env?.AUTH_CENTER_URL) ||
    DEFAULT_AUTH_CENTER_URL
  );
}

function getCacheTtl(options?: VerifyOptions): number {
  return options?.cacheTtl ?? DEFAULT_CACHE_TTL;
}

/**
 * Verify a JWT token against the Auth Center.
 * Returns the decoded user if valid, null if invalid.
 * Results are cached in memory for the configured TTL.
 */
export async function verifyToken(
  token: string,
  options?: VerifyOptions
): Promise<AuthUser | null> {
  if (!token) return null;

  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  const baseUrl = getAuthCenterUrl(options);
  const cacheTtl = getCacheTtl(options);

  try {
    const response = await fetch(`${baseUrl}/api/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      tokenCache.delete(token);
      return null;
    }

    const data = (await response.json()) as VerifyResponse;
    if (!data.valid || !data.user) {
      tokenCache.delete(token);
      return null;
    }

    // Cache the result
    tokenCache.set(token, {
      user: data.user,
      expiresAt: Date.now() + cacheTtl,
    });

    return data.user;
  } catch {
    // Network error — don't cache failures
    return null;
  }
}

/**
 * Extract Bearer token from an Authorization header value.
 */
export function extractBearerToken(
  authHeader: string | null | undefined
): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Clear the token verification cache.
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Remove a specific token from the cache (e.g. on logout).
 */
export function invalidateToken(token: string): void {
  tokenCache.delete(token);
}
