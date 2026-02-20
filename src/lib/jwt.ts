import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "auth-center-jwt-secret-change-in-production"
);

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";
const ISSUER = "auth-center";

export interface TokenPayload extends JWTPayload {
  sub: string; // userId
  telegramId: string;
  username: string | null;
  firstName: string;
  photoUrl: string | null;
  role: string;
  project: string;
  permissions: string[];
  type: "access" | "refresh";
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

export interface VerifyResponse {
  valid: boolean;
  user?: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string;
    photoUrl: string | null;
    role: string;
  };
  project?: string;
  permissions?: string[];
  error?: string;
}

export async function issueProjectToken(
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string;
    photoUrl: string | null;
    role: string;
  },
  project: string,
  permissions: string[]
): Promise<TokenResponse> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // 1 hour

  const accessToken = await new SignJWT({
    sub: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    photoUrl: user.photoUrl,
    role: user.role,
    project,
    permissions,
    type: "access",
  } satisfies Omit<TokenPayload, "iat" | "exp" | "iss">)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  const refreshToken = await new SignJWT({
    sub: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    photoUrl: user.photoUrl,
    role: user.role,
    project,
    permissions,
    type: "refresh",
  } satisfies Omit<TokenPayload, "iat" | "exp" | "iss">)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return { accessToken, refreshToken, expiresAt };
}

export async function verifyToken(token: string): Promise<VerifyResponse> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
    });

    const p = payload as TokenPayload;

    return {
      valid: true,
      user: {
        id: p.sub!,
        telegramId: p.telegramId,
        username: p.username,
        firstName: p.firstName,
        photoUrl: p.photoUrl,
        role: p.role,
      },
      project: p.project,
      permissions: p.permissions,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token verification failed";
    return { valid: false, error: message };
  }
}

export async function refreshToken(
  token: string
): Promise<TokenResponse | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
    });

    const p = payload as TokenPayload;

    if (p.type !== "refresh") {
      return null;
    }

    // Issue a new access token (and new refresh token) with the same claims
    return issueProjectToken(
      {
        id: p.sub!,
        telegramId: p.telegramId,
        username: p.username,
        firstName: p.firstName,
        photoUrl: p.photoUrl,
        role: p.role,
      },
      p.project,
      p.permissions
    );
  } catch {
    return null;
  }
}
