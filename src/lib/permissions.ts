import { prisma } from "@/lib/db";

/**
 * Permission key format: {project}:{resource}:{action}
 * Examples: creative:agents:create, traffic:campaigns:read, *:*:*
 * Wildcards: * matches any segment
 */

export const PERMISSION_CATALOG: Record<string, { key: string; name: string; description: string }[]> = {
  creative_center: [
    { key: "creative:agents:create", name: "Create AI Agents", description: "Create AI agents" },
    { key: "creative:agents:read", name: "View AI Agents", description: "View AI agents" },
    { key: "creative:agents:update", name: "Edit AI Agents", description: "Edit AI agents" },
    { key: "creative:agents:delete", name: "Delete AI Agents", description: "Delete AI agents" },
    { key: "creative:chat:send", name: "Send Chat Messages", description: "Send chat messages" },
    { key: "creative:memory:read", name: "View Memory", description: "View agent memory" },
    { key: "creative:memory:write", name: "Edit Memory", description: "Edit agent memory" },
    { key: "creative:historical:import", name: "Import Historical", description: "Import historical data" },
    { key: "creative:historical:read", name: "View Historical", description: "View historical data" },
  ],
  traffic_center: [
    { key: "traffic:campaigns:create", name: "Create Campaigns", description: "Create ad campaigns" },
    { key: "traffic:campaigns:read", name: "View Campaigns", description: "View campaigns" },
    { key: "traffic:campaigns:update", name: "Edit Campaigns", description: "Edit campaigns" },
    { key: "traffic:campaigns:delete", name: "Delete Campaigns", description: "Delete campaigns" },
    { key: "traffic:adsets:create", name: "Create Ad Sets", description: "Create ad sets" },
    { key: "traffic:adsets:read", name: "View Ad Sets", description: "View ad sets" },
    { key: "traffic:adsets:update", name: "Edit Ad Sets", description: "Edit ad sets" },
    { key: "traffic:analytics:read", name: "View Analytics", description: "View analytics" },
  ],
  retention_center: [
    { key: "retention:leads:create", name: "Create Leads", description: "Create leads" },
    { key: "retention:leads:read", name: "View Leads", description: "View leads" },
    { key: "retention:leads:update", name: "Edit Leads", description: "Edit leads" },
    { key: "retention:leads:delete", name: "Delete Leads", description: "Delete leads" },
    { key: "retention:campaigns:create", name: "Create Email Campaigns", description: "Create email campaigns" },
    { key: "retention:campaigns:read", name: "View Email Campaigns", description: "View email campaigns" },
    { key: "retention:campaigns:update", name: "Edit Email Campaigns", description: "Edit email campaigns" },
  ],
  global: [
    { key: "auth:users:read", name: "View Users", description: "View users" },
    { key: "auth:users:update", name: "Edit Users", description: "Edit users" },
    { key: "auth:users:delete", name: "Delete Users", description: "Delete/disable users" },
    { key: "auth:roles:create", name: "Create Roles", description: "Create roles" },
    { key: "auth:roles:read", name: "View Roles", description: "View roles" },
    { key: "auth:roles:update", name: "Edit Roles", description: "Edit roles" },
    { key: "auth:roles:delete", name: "Delete Roles", description: "Delete roles" },
    { key: "auth:permissions:read", name: "View Permissions", description: "View permissions" },
    { key: "auth:permissions:assign", name: "Assign Permissions", description: "Assign permissions to roles" },
  ],
};

function matchesWildcard(pattern: string, value: string): boolean {
  if (pattern === "*") return true;
  return pattern === value;
}

function permissionMatches(userPerm: string, requiredPerm: string): boolean {
  const userParts = userPerm.split(":");
  const reqParts = requiredPerm.split(":");
  if (userParts.length !== 3 || reqParts.length !== 3) return false;
  return (
    matchesWildcard(userParts[0], reqParts[0]) &&
    matchesWildcard(userParts[1], reqParts[1]) &&
    matchesWildcard(userParts[2], reqParts[2])
  );
}

export async function getUserRoles(userId: string, project?: string) {
  const projectRoles = await prisma.userProjectRole.findMany({
    where: {
      userId,
      ...(project ? { project } : {}),
    },
    include: { role: true },
  });

  return projectRoles.map((pr) => ({
    id: pr.role.id,
    name: pr.role.name,
    description: pr.role.description,
    isSystem: pr.role.isSystem,
    project: pr.project,
  }));
}

export async function getUserPermissions(userId: string, project?: string): Promise<string[]> {
  const roles = await getUserRoles(userId, project);
  const roleIds = roles.map((r) => r.id);
  if (roleIds.length === 0) return [];

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: { in: roleIds } },
    include: { permission: true },
  });

  const permSet = new Set<string>();
  for (const rp of rolePermissions) {
    permSet.add(rp.permission.key);
  }
  return Array.from(permSet);
}

export async function hasPermission(
  userId: string,
  permission: string,
  project?: string
): Promise<boolean> {
  const userPerms = await getUserPermissions(userId, project);
  return userPerms.some((p) => permissionMatches(p, permission));
}

export function getAllPermissions() {
  return Object.entries(PERMISSION_CATALOG).map(([project, permissions]) => ({
    project,
    permissions,
  }));
}

export async function getPermissionMatrix() {
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  return roles.map((role) => ({
    role: { id: role.id, name: role.name, isSystem: role.isSystem },
    permissions: role.permissions.map((rp) => rp.permission.key),
  }));
}
