import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withPermission } from "@/lib/auth-middleware";

// GET /api/roles — list all roles
export const GET = withPermission("global:roles:view", async () => {
  const roles = await prisma.role.findMany({
    include: {
      _count: { select: { projectRoles: true, permissions: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(roles);
});

// POST /api/roles — create custom role
export const POST = withPermission("global:roles:manage", async (req) => {
  const body = await req.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Role name is required" }, { status: 400 });
  }

  const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Role with this name already exists" }, { status: 409 });
  }

  const role = await prisma.role.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  return NextResponse.json(role, { status: 201 });
});
