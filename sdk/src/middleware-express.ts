import type { AuthMiddlewareOptions, AuthUser } from "./types.js";
import { extractBearerToken, verifyToken } from "./verify.js";
import { hasAllPermissions } from "./permissions.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type ExpressRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
};

type ExpressResponse = {
  status: (code: number) => ExpressResponse;
  json: (body: unknown) => void;
};

type NextFunction = (err?: unknown) => void;

/**
 * Express/Fastify middleware that validates Bearer token from Authorization header.
 * Attaches decoded user to `req.user`.
 * Returns 401 if token is missing or invalid.
 * Returns 403 if user lacks required permissions.
 */
export function authMiddleware(options: AuthMiddlewareOptions = {}) {
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const token = extractBearerToken(headerValue);

    if (!token) {
      if (options.onUnauthorized) {
        options.onUnauthorized("Missing or invalid Authorization header");
        return;
      }
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const user = await verifyToken(token, options);
    if (!user) {
      if (options.onUnauthorized) {
        options.onUnauthorized("Invalid or expired token");
        return;
      }
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.user = user;

    // Check required permissions if specified
    if (
      options.requiredPermissions &&
      options.requiredPermissions.length > 0
    ) {
      if (!hasAllPermissions(user, options.requiredPermissions, options.projectScope)) {
        res.status(403).json({
          error: "Insufficient permissions",
          required: options.requiredPermissions,
        });
        return;
      }
    }

    next();
  };
}

/**
 * Express middleware that requires a specific permission.
 * Must be used after authMiddleware.
 */
export function requirePermissionMiddleware(
  ...permissions: string[]
) {
  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!hasAllPermissions(req.user, permissions)) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: permissions,
      });
      return;
    }

    next();
  };
}
