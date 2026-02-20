/**
 * Shared types for Auth Center.
 * Extended by other modules as needed.
 */

export interface AuthUser {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  email: string | null;
  role: string;
}

export interface ProjectPermission {
  projectId: string;
  projectName: string;
  permissions: string[];
}

export interface SessionUser extends AuthUser {
  projectPermissions: ProjectPermission[];
}
