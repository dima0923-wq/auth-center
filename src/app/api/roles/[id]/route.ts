import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withPermission } from "@/lib/auth-middleware";

// PUT /api/roles/[id] — update role
export const PUT = withPermission("global:roles:manage", async (req, context) => {
  const { id } = await context.params;
  const body = await req.json();
  const { name, description } = body;

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  if (name) {
    const existing = await prisma.role.findFirst({
      where: { name: name.trim(), id: { not: id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Role name already taken" }, { status: 409 });
    }
  }

  const updated = await prisma.role.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
    },
  });

  return NextResponse.json(updated);
});

// DELETE /api/roles/[id] — delete custom role (not system roles)
export const DELETE = withPermission("global:roles:manage", async (_req, context) => {
  const { id } = await context.params;

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  if (role.isSystem) {
    return NextResponse.json({ error: "Cannot delete system role" }, { status: 403 });
  }

  await prisma.role.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
