import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const PROJECTS = [
  "creative_center",
  "traffic_center",
  "retention_center",
  "global",
] as const;

// Permissions per project scope
const PERMISSION_DEFINITIONS: Record<
  string,
  { key: string; name: string; description: string }[]
> = {
  creative_center: [
    {
      key: "creative:agents:view",
      name: "View Agents",
      description: "View creative agents list",
    },
    {
      key: "creative:agents:create",
      name: "Create Agents",
      description: "Create new creative agents",
    },
    {
      key: "creative:agents:edit",
      name: "Edit Agents",
      description: "Edit agent configuration",
    },
    {
      key: "creative:agents:delete",
      name: "Delete Agents",
      description: "Delete creative agents",
    },
    {
      key: "creative:generations:view",
      name: "View Generations",
      description: "View generated creatives",
    },
    {
      key: "creative:generations:create",
      name: "Create Generations",
      description: "Generate new creatives",
    },
    {
      key: "creative:memory:view",
      name: "View Memory",
      description: "View agent memory entries",
    },
    {
      key: "creative:memory:manage",
      name: "Manage Memory",
      description: "Add/edit/delete memory entries",
    },
    {
      key: "creative:history:view",
      name: "View History",
      description: "View historical data and batches",
    },
    {
      key: "creative:history:import",
      name: "Import History",
      description: "Import CSV/GDrive historical data",
    },
  ],
  traffic_center: [
    {
      key: "traffic:campaigns:view",
      name: "View Campaigns",
      description: "View ad campaigns",
    },
    {
      key: "traffic:campaigns:create",
      name: "Create Campaigns",
      description: "Create new ad campaigns",
    },
    {
      key: "traffic:campaigns:edit",
      name: "Edit Campaigns",
      description: "Edit campaign settings",
    },
    {
      key: "traffic:campaigns:delete",
      name: "Delete Campaigns",
      description: "Delete ad campaigns",
    },
    {
      key: "traffic:analytics:view",
      name: "View Analytics",
      description: "View traffic analytics and reports",
    },
    {
      key: "traffic:budgets:manage",
      name: "Manage Budgets",
      description: "Set and adjust campaign budgets",
    },
    {
      key: "traffic:rules:manage",
      name: "Manage Rules",
      description: "Create/edit automation rules",
    },
    {
      key: "traffic:accounts:manage",
      name: "Manage Ad Accounts",
      description: "Connect and manage Meta ad accounts",
    },
  ],
  retention_center: [
    {
      key: "retention:campaigns:view",
      name: "View Retention Campaigns",
      description: "View email/SMS campaigns",
    },
    {
      key: "retention:campaigns:create",
      name: "Create Retention Campaigns",
      description: "Create email/SMS campaigns",
    },
    {
      key: "retention:campaigns:edit",
      name: "Edit Retention Campaigns",
      description: "Edit retention campaign settings",
    },
    {
      key: "retention:campaigns:delete",
      name: "Delete Retention Campaigns",
      description: "Delete retention campaigns",
    },
    {
      key: "retention:contacts:view",
      name: "View Contacts",
      description: "View CRM contacts",
    },
    {
      key: "retention:contacts:manage",
      name: "Manage Contacts",
      description: "Import/edit/delete contacts",
    },
    {
      key: "retention:templates:manage",
      name: "Manage Templates",
      description: "Create/edit message templates",
    },
    {
      key: "retention:analytics:view",
      name: "View Retention Analytics",
      description: "View retention reports",
    },
  ],
  global: [
    {
      key: "global:users:view",
      name: "View Users",
      description: "View user list",
    },
    {
      key: "global:users:create",
      name: "Create Users",
      description: "Invite new users",
    },
    {
      key: "global:users:edit",
      name: "Edit Users",
      description: "Edit user profiles and status",
    },
    {
      key: "global:users:delete",
      name: "Delete Users",
      description: "Disable or remove users",
    },
    {
      key: "global:roles:view",
      name: "View Roles",
      description: "View roles and permissions",
    },
    {
      key: "global:roles:manage",
      name: "Manage Roles",
      description: "Create/edit/delete roles",
    },
    {
      key: "global:audit:view",
      name: "View Audit Log",
      description: "View system audit log",
    },
    {
      key: "global:settings:manage",
      name: "Manage Settings",
      description: "Manage system settings",
    },
  ],
};

// Role definitions with their permission mappings
const ROLE_DEFINITIONS = [
  {
    name: "Super Admin",
    description:
      "Full access to all projects and settings. Cannot be modified or deleted.",
    isSystem: true,
    permissions: "all", // gets every permission
  },
  {
    name: "Project Admin",
    description:
      "Full access within assigned project. Can manage users and roles for that project.",
    isSystem: true,
    permissions: "project_all", // gets all permissions for their assigned project
  },
  {
    name: "Manager",
    description:
      "Can create, edit, and view resources. Cannot manage users, roles, or system settings.",
    isSystem: true,
    permissions: "project_manage", // view + create + edit (no delete, no admin)
  },
  {
    name: "Viewer",
    description: "Read-only access to assigned project resources.",
    isSystem: true,
    permissions: "project_view", // view-only permissions
  },
];

async function main() {
  console.log("Seeding database...");

  // 1. Create all permissions
  const permissionMap: Record<string, string> = {};
  for (const [project, perms] of Object.entries(PERMISSION_DEFINITIONS)) {
    for (const perm of perms) {
      const created = await prisma.permission.upsert({
        where: { key: perm.key },
        update: { name: perm.name, description: perm.description, project },
        create: {
          key: perm.key,
          name: perm.name,
          description: perm.description,
          project,
        },
      });
      permissionMap[perm.key] = created.id;
    }
  }
  console.log(
    `Created ${Object.keys(permissionMap).length} permissions across ${PROJECTS.length} project scopes`
  );

  // 2. Collect permission IDs by category for role assignment
  const allPermissionIds = Object.values(permissionMap);

  // View-only permissions (keys containing ":view")
  const viewPermissionIds = Object.entries(permissionMap)
    .filter(([key]) => key.includes(":view"))
    .map(([, id]) => id);

  // Manager permissions (view + create + edit, no delete/manage admin)
  const managerPermissionIds = Object.entries(permissionMap)
    .filter(
      ([key]) =>
        key.includes(":view") ||
        key.includes(":create") ||
        key.includes(":edit") ||
        key.includes(":import")
    )
    .filter(
      ([key]) =>
        !key.startsWith("global:users:") &&
        !key.startsWith("global:roles:") &&
        !key.startsWith("global:settings:") &&
        !key.startsWith("global:audit:")
    )
    .map(([, id]) => id);

  // Project admin: all project-scoped + user view/edit (no global:roles:manage, no global:settings)
  const projectAdminPermissionIds = Object.entries(permissionMap)
    .filter(
      ([key]) =>
        !key.startsWith("global:roles:manage") &&
        !key.startsWith("global:settings:")
    )
    .map(([, id]) => id);

  // 3. Create roles and assign permissions
  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    });

    // Determine which permissions this role gets
    let rolePermIds: string[];
    switch (roleDef.permissions) {
      case "all":
        rolePermIds = allPermissionIds;
        break;
      case "project_all":
        rolePermIds = projectAdminPermissionIds;
        break;
      case "project_manage":
        rolePermIds = managerPermissionIds;
        break;
      case "project_view":
        rolePermIds = viewPermissionIds;
        break;
      default:
        rolePermIds = [];
    }

    // Upsert role-permission links
    for (const permId of rolePermIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permId },
        },
        update: {},
        create: { roleId: role.id, permissionId: permId },
      });
    }

    console.log(
      `Role "${role.name}" → ${rolePermIds.length} permissions assigned`
    );
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
