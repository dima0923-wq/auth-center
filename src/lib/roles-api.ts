/**
 * API helpers for roles and permissions management.
 * These call the backend API routes.
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

// --- Helper to convert API permission catalog to flat Permission[] ---

interface CatalogPermission {
  key: string;
  name: string;
  description: string;
  id?: string;
}

interface CatalogGroup {
  project: string;
  permissions: CatalogPermission[];
}

function catalogToPermissions(groups: CatalogGroup[]): Permission[] {
  const result: Permission[] = [];
  for (const group of groups) {
    for (const p of group.permissions) {
      const parts = p.key.split(":");
      result.push({
        id: p.id || p.key,
        key: p.key,
        name: p.name,
        description: p.description,
        resource: parts[1] || "",
        action: parts[2] || "",
        projectId: group.project,
        projectName: group.project.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    }
  }
  return result;
}

// --- API functions ---

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res;
}

export async function fetchRoles(): Promise<Role[]> {
  const res = await apiFetch("/api/roles");
  const data = await res.json();

  return data.map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    description: r.description || "",
    isSystem: r.isSystem ?? false,
    permissions: [], // permissions not included in list endpoint
    userCount: (r._count as Record<string, number>)?.projectRoles ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function fetchRole(id: string): Promise<Role | null> {
  try {
    // No dedicated GET /api/roles/[id] — use list endpoint and filter
    const [rolesRes, permsRes] = await Promise.all([
      apiFetch("/api/roles"),
      apiFetch(`/api/roles/${id}/permissions`),
    ]);

    const allRoles = await rolesRes.json();
    const permsData = await permsRes.json();

    const role = allRoles.find((r: Record<string, unknown>) => r.id === id);
    if (!role) return null;

    const permissions: Permission[] = (permsData.permissions || []).map(
      (p: Record<string, unknown>) => {
        const parts = (p.key as string).split(":");
        return {
          id: p.id,
          key: p.key,
          name: p.name,
          description: p.description || "",
          resource: parts[1] || "",
          action: parts[2] || "",
          projectId: parts[0] || "",
          projectName: (parts[0] as string || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        };
      }
    );

    return {
      id: role.id,
      name: role.name,
      description: role.description || "",
      isSystem: role.isSystem ?? false,
      permissions,
      userCount: role._count?.projectRoles ?? 0,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function fetchRoleUsers(_roleId: string): Promise<RoleUser[]> {
  // No dedicated users-by-role endpoint exists yet — return empty
  return [];
}

export async function fetchPermissions(): Promise<Permission[]> {
  const res = await apiFetch("/api/permissions");
  const groups: CatalogGroup[] = await res.json();
  return catalogToPermissions(groups);
}

export async function createRole(input: CreateRoleInput): Promise<Role> {
  // Step 1: Create the role
  const res = await apiFetch("/api/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name, description: input.description }),
  });
  const role = await res.json();

  // Step 2: Assign permissions if any
  if (input.permissionIds.length > 0) {
    await apiFetch(`/api/roles/${role.id}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionIds: input.permissionIds }),
    });
  }

  // Return the full role
  const full = await fetchRole(role.id);
  return full!;
}

export async function updateRole(
  id: string,
  input: UpdateRoleInput
): Promise<Role> {
  // Update name/description if provided
  if (input.name !== undefined || input.description !== undefined) {
    await apiFetch(`/api/roles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      }),
    });
  }

  // Update permissions if provided
  if (input.permissionIds) {
    await apiFetch(`/api/roles/${id}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionIds: input.permissionIds }),
    });
  }

  const full = await fetchRole(id);
  return full!;
}

export async function deleteRole(id: string): Promise<void> {
  await apiFetch(`/api/roles/${id}`, { method: "DELETE" });
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
