import type { AuthUser, Permission, ProjectId } from "./types.js";

/**
 * Check if a user has a specific permission.
 * Checks global permissions first, then project-scoped permissions.
 */
export function hasPermission(
  user: AuthUser,
  permission: Permission,
  projectId?: ProjectId
): boolean {
  // Check global permissions (includes wildcard)
  if (
    user.globalPermissions.includes(permission) ||
    user.globalPermissions.includes("*")
  ) {
    return true;
  }

  // Check resource-level wildcard (e.g. "agents:*" matches "agents:read")
  const [resource] = permission.split(":");
  if (user.globalPermissions.includes(`${resource}:*`)) {
    return true;
  }

  // If project scope specified, check project-level permissions
  if (projectId) {
    const project = user.projects.find((p) => p.projectId === projectId);
    if (project) {
      if (
        project.permissions.includes(permission) ||
        project.permissions.includes("*") ||
        project.permissions.includes(`${resource}:*`)
      ) {
        return true;
      }
    }
  }

  // Check all project permissions if no specific project requested
  if (!projectId) {
    for (const project of user.projects) {
      if (
        project.permissions.includes(permission) ||
        project.permissions.includes("*") ||
        project.permissions.includes(`${resource}:*`)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Assert that a user has a specific permission. Throws if not.
 */
export function requirePermission(
  user: AuthUser,
  permission: Permission,
  projectId?: ProjectId
): void {
  if (!hasPermission(user, permission, projectId)) {
    throw new AuthPermissionError(
      `User "${user.username || user.id}" lacks required permission: ${permission}${projectId ? ` (project: ${projectId})` : ""}`
    );
  }
}

/**
 * Check if a user has ALL of the specified permissions.
 */
export function hasAllPermissions(
  user: AuthUser,
  permissions: Permission[],
  projectId?: ProjectId
): boolean {
  return permissions.every((p) => hasPermission(user, p, projectId));
}

/**
 * Check if a user has ANY of the specified permissions.
 */
export function hasAnyPermission(
  user: AuthUser,
  permissions: Permission[],
  projectId?: ProjectId
): boolean {
  return permissions.some((p) => hasPermission(user, p, projectId));
}

export class AuthPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthPermissionError";
  }
}
