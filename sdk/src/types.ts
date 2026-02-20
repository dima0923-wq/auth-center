/** Permission string in format "resource:action" (e.g. "agents:read", "creatives:generate") */
export type Permission = string;

/** Project identifiers within the platform */
export type ProjectId = "creative-center" | "traffic-center" | "retention-center" | "orchestrator";

/** Role assigned to a user */
export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

/** Project-scoped access entry */
export interface ProjectAccess {
  projectId: ProjectId;
  roles: Role[];
  permissions: Permission[];
}

/** Decoded auth user from JWT token */
export interface AuthUser {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  email: string | null;
  globalRoles: Role[];
  globalPermissions: Permission[];
  projects: ProjectAccess[];
}

/** Options for token verification */
export interface VerifyOptions {
  /** Base URL of the Auth Center (default: process.env.AUTH_CENTER_URL) */
  authCenterUrl?: string;
  /** Cache TTL for public key in milliseconds (default: 300000 = 5 min) */
  cacheTtl?: number;
}

/** Response from Auth Center /api/auth/verify endpoint */
export interface VerifyResponse {
  valid: boolean;
  user: AuthUser | null;
  error?: string;
}

/** Options for auth middleware */
export interface AuthMiddlewareOptions extends VerifyOptions {
  /** Permissions required to access the route (checked with AND logic) */
  requiredPermissions?: Permission[];
  /** Project scope to check permissions against */
  projectScope?: ProjectId;
  /** Custom handler for auth failures (default: 401 response) */
  onUnauthorized?: (error: string) => void;
}
