/**
 * API helpers for roles and permissions management.
 * These call the backend API routes built by rbac-dev.
 */

export interface Permission {
  id: string;
  key: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  projectId: string;
  projectName: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  assignedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description: string;
  permissionIds: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

// --- Mock data for development until backend is ready ---

const PROJECTS = [
  { id: "creative-center", name: "Creative Center" },
  { id: "traffic-center", name: "Traffic Center" },
  { id: "retention-center", name: "Retention Center" },
];

const RESOURCES = ["campaigns", "creatives", "reports", "settings", "users"];
const ACTIONS = ["view", "create", "edit", "delete"];

function generatePermissions(): Permission[] {
  const perms: Permission[] = [];
  let i = 0;
  for (const project of PROJECTS) {
    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        i++;
        perms.push({
          id: `perm-${i}`,
          key: `${project.id}:${resource}:${action}`,
          name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
          description: `Can ${action} ${resource} in ${project.name}`,
          resource,
          action,
          projectId: project.id,
          projectName: project.name,
        });
      }
    }
  }
  return perms;
}

const ALL_PERMISSIONS = generatePermissions();

const MOCK_ROLES: Role[] = [
  {
    id: "role-admin",
    name: "Admin",
    description: "Full access to all projects and resources",
    isSystem: true,
    permissions: ALL_PERMISSIONS,
    userCount: 2,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "role-manager",
    name: "Manager",
    description: "Can manage campaigns and creatives, view reports",
    isSystem: true,
    permissions: ALL_PERMISSIONS.filter(
      (p) => p.action !== "delete" || p.resource === "campaigns"
    ),
    userCount: 5,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "role-viewer",
    name: "Viewer",
    description: "Read-only access to all projects",
    isSystem: true,
    permissions: ALL_PERMISSIONS.filter((p) => p.action === "view"),
    userCount: 12,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "role-creative-editor",
    name: "Creative Editor",
    description: "Full access to Creative Center, view-only elsewhere",
    isSystem: false,
    permissions: [
      ...ALL_PERMISSIONS.filter((p) => p.projectId === "creative-center"),
      ...ALL_PERMISSIONS.filter(
        (p) => p.projectId !== "creative-center" && p.action === "view"
      ),
    ],
    userCount: 3,
    createdAt: "2026-02-10T00:00:00Z",
    updatedAt: "2026-02-15T00:00:00Z",
  },
];

const MOCK_USERS: RoleUser[] = [
  {
    id: "u1",
    email: "admin@example.com",
    name: "Admin User",
    image: null,
    assignedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "u2",
    email: "manager@example.com",
    name: "Manager User",
    image: null,
    assignedAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "u3",
    email: "viewer@example.com",
    name: "Viewer User",
    image: null,
    assignedAt: "2026-02-01T00:00:00Z",
  },
];

// --- API functions (using mock data, replace with fetch calls when backend is ready) ---

export async function fetchRoles(): Promise<Role[]> {
  // TODO: Replace with: const res = await fetch("/api/roles"); return res.json();
  return MOCK_ROLES;
}

export async function fetchRole(id: string): Promise<Role | null> {
  // TODO: Replace with: const res = await fetch(`/api/roles/${id}`); return res.json();
  return MOCK_ROLES.find((r) => r.id === id) ?? null;
}

export async function fetchRoleUsers(roleId: string): Promise<RoleUser[]> {
  // TODO: Replace with: const res = await fetch(`/api/roles/${roleId}/users`); return res.json();
  void roleId;
  return MOCK_USERS.slice(0, Math.floor(Math.random() * 3) + 1);
}

export async function fetchPermissions(): Promise<Permission[]> {
  // TODO: Replace with: const res = await fetch("/api/permissions"); return res.json();
  return ALL_PERMISSIONS;
}

export async function createRole(input: CreateRoleInput): Promise<Role> {
  // TODO: Replace with: const res = await fetch("/api/roles", { method: "POST", body: JSON.stringify(input) }); return res.json();
  const newRole: Role = {
    id: `role-${Date.now()}`,
    name: input.name,
    description: input.description,
    isSystem: false,
    permissions: ALL_PERMISSIONS.filter((p) =>
      input.permissionIds.includes(p.id)
    ),
    userCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  MOCK_ROLES.push(newRole);
  return newRole;
}

export async function updateRole(
  id: string,
  input: UpdateRoleInput
): Promise<Role> {
  // TODO: Replace with: const res = await fetch(`/api/roles/${id}`, { method: "PATCH", body: JSON.stringify(input) }); return res.json();
  const role = MOCK_ROLES.find((r) => r.id === id);
  if (!role) throw new Error("Role not found");
  if (input.name) role.name = input.name;
  if (input.description) role.description = input.description;
  if (input.permissionIds) {
    role.permissions = ALL_PERMISSIONS.filter((p) =>
      input.permissionIds!.includes(p.id)
    );
  }
  role.updatedAt = new Date().toISOString();
  return role;
}

export async function deleteRole(id: string): Promise<void> {
  // TODO: Replace with: await fetch(`/api/roles/${id}`, { method: "DELETE" });
  const idx = MOCK_ROLES.findIndex((r) => r.id === id);
  if (idx !== -1) MOCK_ROLES.splice(idx, 1);
}

/** Group permissions by project */
export function groupPermissionsByProject(
  permissions: Permission[]
): Map<string, Permission[]> {
  const grouped = new Map<string, Permission[]>();
  for (const p of permissions) {
    const key = p.projectName;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }
  return grouped;
}

/** Group permissions by project then resource */
export function groupPermissionsByProjectAndResource(
  permissions: Permission[]
): Map<string, Map<string, Permission[]>> {
  const grouped = new Map<string, Map<string, Permission[]>>();
  for (const p of permissions) {
    if (!grouped.has(p.projectName))
      grouped.set(p.projectName, new Map<string, Permission[]>());
    const projectMap = grouped.get(p.projectName)!;
    if (!projectMap.has(p.resource)) projectMap.set(p.resource, []);
    projectMap.get(p.resource)!.push(p);
  }
  return grouped;
}
