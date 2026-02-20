import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withPermission } from "@/lib/auth-middleware";

// GET /api/roles/[id]/permissions — get permissions for a role
export const GET = withPermission("global:roles:view", async (_req, context) => {
  const { id } = await context.params;

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  return NextResponse.json({
    role: { id: role.id, name: role.name },
    permissions: role.permissions.map((rp) => rp.permission),
  });
});

// PUT /api/roles/[id]/permissions — set permissions for a role
export const PUT = withPermission("global:roles:manage", async (req, context) => {
  const { id } = await context.params;
  const body = await req.json();
  const { permissionIds } = body;

  if (!Array.isArray(permissionIds)) {
    return NextResponse.json({ error: "permissionIds must be an array" }, { status: 400 });
  }

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  // Verify all permission IDs exist
  const permissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
  });

  if (permissions.length !== permissionIds.length) {
    return NextResponse.json({ error: "Some permission IDs are invalid" }, { status: 400 });
  }

  // Replace all permissions in a transaction
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    ...permissionIds.map((permissionId: string) =>
      prisma.rolePermission.create({
        data: { roleId: id, permissionId },
      })
    ),
  ]);

  // Return updated permissions
  const updated = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
    },
  });

  return NextResponse.json({
    role: { id: role.id, name: role.name },
    permissions: updated!.permissions.map((rp) => rp.permission),
  });
});
