import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "auth-session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-jwt-secret-change-in-production"
);
const SESSION_EXPIRY = "7d";
const ISSUER = "auth-center";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  telegramId?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  isAdmin?: boolean;
  roles: Record<string, string>;
  permissions: string[];
}

export interface Session {
  user: SessionUser;
}

export interface SessionTokenPayload {
  sub: string; // userId
  type: "session";
}

/**
 * Issue a session JWT and set it as an httpOnly cookie.
 */
export async function createSessionToken(userId: string): Promise<string> {
  const token = await new SignJWT({ sub: userId, type: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(SESSION_EXPIRY)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return token;
}

/**
 * Clear the session cookie (logout).
 */
export async function clearSessionToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Read and verify the session JWT from the cookie.
 * Returns the session with user data, or null if not authenticated.
 * This replaces the next-auth `auth()` function — same call signature for existing code.
 */
export async function auth(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: ISSUER });
    const userId = payload.sub;
    if (!userId) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projectRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!dbUser || dbUser.status === "DISABLED") return null;

    // Collect roles and permissions from project-scoped assignments
    const allPermissions = new Set<string>();
    const roles: Record<string, string> = {};

    for (const pr of dbUser.projectRoles) {
      roles[pr.project] = pr.role.name;
      for (const rp of pr.role.permissions) {
        allPermissions.add(rp.permission.key);
      }
    }

    const isAdmin = !!roles["global"] && roles["global"].toLowerCase() === "admin";

    return {
      user: {
        id: dbUser.id,
        name: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || null,
        email: dbUser.email,
        image: dbUser.photoUrl,
        telegramId: dbUser.telegramId?.toString() ?? null,
        username: dbUser.username,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        photoUrl: dbUser.photoUrl,
        isAdmin,
        roles,
        permissions: Array.from(allPermissions),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Verify a session token string (for middleware / edge use without cookies()).
 * Returns userId or null.
 */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: ISSUER });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
