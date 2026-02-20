// Core types
export type {
  AuthUser,
  Permission,
  ProjectId,
  Role,
  ProjectAccess,
  VerifyOptions,
  VerifyResponse,
  AuthMiddlewareOptions,
} from "./types.js";

// Token verification
export {
  verifyToken,
  extractBearerToken,
  clearTokenCache,
  invalidateToken,
} from "./verify.js";

// Permission checking
export {
  hasPermission,
  requirePermission,
  hasAllPermissions,
  hasAnyPermission,
  AuthPermissionError,
} from "./permissions.js";
