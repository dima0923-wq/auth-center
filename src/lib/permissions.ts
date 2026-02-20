import { prisma } from "@/lib/db";

/**
 * Permission key format: {project}:{resource}:{action}
 * Examples: creative:agents:create, traffic:campaigns:view, *:*:*
 * Wildcards: * matches any segment
 */

export const PERMISSION_CATALOG: Record<string, { key: string; name: string; description: string }[]> = {
  creative_center: [
    { key: "creative:agents:view", name: "View Agents", description: "View creative agents list" },
    { key: "creative:agents:create", name: "Create Agents", description: "Create new creative agents" },
    { key: "creative:agents:edit", name: "Edit Agents", description: "Edit agent configuration" },
    { key: "creative:agents:delete", name: "Delete Agents", description: "Delete creative agents" },
    { key: "creative:generations:view", name: "View Generations", description: "View generated creatives" },
    { key: "creative:generations:create", name: "Create Generations", description: "Generate new creatives" },
    { key: "creative:memory:view", name: "View Memory", description: "View agent memory entries" },
    { key: "creative:memory:manage", name: "Manage Memory", description: "Add/edit/delete memory entries" },
    { key: "creative:history:view", name: "View History", description: "View historical data and batches" },
    { key: "creative:history:import", name: "Import History", description: "Import CSV/GDrive historical data" },
  ],
  traffic_center: [
    { key: "traffic:campaigns:view", name: "View Campaigns", description: "View ad campaigns" },
    { key: "traffic:campaigns:create", name: "Create Campaigns", description: "Create new ad campaigns" },
    { key: "traffic:campaigns:edit", name: "Edit Campaigns", description: "Edit campaign settings" },
    { key: "traffic:campaigns:delete", name: "Delete Campaigns", description: "Delete ad campaigns" },
    { key: "traffic:analytics:view", name: "View Analytics", description: "View traffic analytics and reports" },
    { key: "traffic:budgets:manage", name: "Manage Budgets", description: "Set and adjust campaign budgets" },
    { key: "traffic:rules:manage", name: "Manage Rules", description: "Create/edit automation rules" },
    { key: "traffic:accounts:manage", name: "Manage Ad Accounts", description: "Connect and manage Meta ad accounts" },
  ],
  retention_center: [
    { key: "retention:campaigns:view", name: "View Retention Campaigns", description: "View email/SMS campaigns" },
    { key: "retention:campaigns:create", name: "Create Retention Campaigns", description: "Create email/SMS campaigns" },
    { key: "retention:campaigns:edit", name: "Edit Retention Campaigns", description: "Edit retention campaign settings" },
    { key: "retention:campaigns:delete", name: "Delete Retention Campaigns", description: "Delete retention campaigns" },
    { key: "retention:contacts:view", name: "View Contacts", description: "View CRM contacts" },
    { key: "retention:contacts:manage", name: "Manage Contacts", description: "Import/edit/delete contacts" },
    { key: "retention:templates:manage", name: "Manage Templates", description: "Create/edit message templates" },
    { key: "retention:analytics:view", name: "View Retention Analytics", description: "View retention reports" },
  ],
  global: [
    { key: "global:users:view", name: "View Users", description: "View user list" },
    { key: "global:users:create", name: "Create Users", description: "Invite new users" },
    { key: "global:users:edit", name: "Edit Users", description: "Edit user profiles and status" },
    { key: "global:users:delete", name: "Delete Users", description: "Disable or remove users" },
    { key: "global:roles:view", name: "View Roles", description: "View roles and permissions" },
    { key: "global:roles:manage", name: "Manage Roles", description: "Create/edit/delete roles" },
    { key: "global:audit:view", name: "View Audit Log", description: "View system audit log" },
    { key: "global:settings:manage", name: "Manage Settings", description: "Manage system settings" },
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
