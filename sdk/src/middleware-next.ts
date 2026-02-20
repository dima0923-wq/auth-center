import type { AuthMiddlewareOptions, AuthUser, Permission, ProjectId } from "./types.js";
import { extractBearerToken, verifyToken } from "./verify.js";
import { hasAllPermissions } from "./permissions.js";

interface NextRequest {
  headers: {
    get(name: string): string | null;
  };
  cookies?: {
    get(name: string): { value: string } | undefined;
  };
  nextUrl?: { pathname: string };
}

interface NextResponse {
  json: (body: unknown, init?: { status?: number }) => unknown;
}

/**
 * Extract auth token from a Next.js request.
 * Checks Authorization header first, then auth-token cookie.
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // Try Authorization header
  const authHeader = request.headers.get("authorization");
  const token = extractBearerToken(authHeader);
  if (token) return token;

  // Try cookie
  const cookie = request.cookies?.get("auth-token");
  if (cookie?.value) return cookie.value;

  return null;
}

/**
 * Get the authenticated user from a Next.js request.
 * Returns null if not authenticated.
 */
export async function getServerUser(
  request: NextRequest,
  options?: AuthMiddlewareOptions
): Promise<AuthUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token, options);
}

type NextApiHandler = (request: NextRequest, context?: unknown) => Promise<Response> | Response;

/**
 * Wrap a Next.js API route handler with auth validation.
 * Returns 401 if not authenticated, 403 if insufficient permissions.
 */
export function withAuth(
  handler: (request: NextRequest & { user: AuthUser }, context?: unknown) => Promise<Response> | Response,
  options?: AuthMiddlewareOptions
): NextApiHandler {
  return async (request: NextRequest, context?: unknown) => {
    const user = await getServerUser(request, options);

    if (!user) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (
      options?.requiredPermissions &&
      options.requiredPermissions.length > 0 &&
      !hasAllPermissions(user, options.requiredPermissions, options.projectScope)
    ) {
      return Response.json(
        {
          error: "Insufficient permissions",
          required: options.requiredPermissions,
        },
        { status: 403 }
      );
    }

    const authenticatedRequest = Object.assign(request, { user });
    return handler(authenticatedRequest, context);
  };
}

/**
 * Helper to create a permission-guarded API route.
 * Shorthand for withAuth with requiredPermissions.
 */
export function withPermission(
  permissions: Permission[],
  handler: (request: NextRequest & { user: AuthUser }, context?: unknown) => Promise<Response> | Response,
  options?: Omit<AuthMiddlewareOptions, "requiredPermissions">
): NextApiHandler {
  return withAuth(handler, { ...options, requiredPermissions: permissions });
}

/**
 * Helper to create a project-scoped permission guard.
 */
export function withProjectPermission(
  projectId: ProjectId,
  permissions: Permission[],
  handler: (request: NextRequest & { user: AuthUser }, context?: unknown) => Promise<Response> | Response,
  options?: Omit<AuthMiddlewareOptions, "requiredPermissions" | "projectScope">
): NextApiHandler {
  return withAuth(handler, {
    ...options,
    requiredPermissions: permissions,
    projectScope: projectId,
  });
}
