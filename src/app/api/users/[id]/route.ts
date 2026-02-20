import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/users/[id] — get user by ID with role info
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[] | undefined;
  if (!permissions?.includes("global:users:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      projectRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    telegramId: user.telegramId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    status: user.status,
    projectRoles: user.projectRoles.map((pr) => ({
      project: pr.project,
      role: {
        id: pr.role.id,
        name: pr.role.name,
        description: pr.role.description,
        permissions: pr.role.permissions.map((rp) => ({
          id: rp.permission.id,
          key: rp.permission.key,
          name: rp.permission.name,
          description: rp.permission.description,
        })),
      },
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}

// PUT /api/users/[id] — update user (name, status, project role)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[] | undefined;
  if (!permissions?.includes("global:users:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  const data: any = {};

  if (body.firstName !== undefined) {
    data.firstName = body.firstName;
  }
  if (body.lastName !== undefined) {
    data.lastName = body.lastName || null;
  }
  if (body.username !== undefined) {
    data.username = body.username || null;
  }

  if (body.status !== undefined) {
    const validStatuses = ["ACTIVE", "DISABLED", "PENDING"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "status must be one of: ACTIVE, DISABLED, PENDING" }, { status: 422 });
    }
    data.status = body.status;
  }

  // Handle project role assignment: { roleId, project }
  if (body.roleId !== undefined && body.project) {
    if (body.roleId === null) {
      // Remove role for this project
      await prisma.userProjectRole.deleteMany({
        where: { userId: id, project: body.project },
      });
    } else {
      const role = await prisma.role.findUnique({ where: { id: body.roleId } });
      if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 422 });
      }
      // Upsert project role
      await prisma.userProjectRole.upsert({
        where: { userId_project: { userId: id, project: body.project } },
        create: { userId: id, roleId: body.roleId, project: body.project },
        update: { roleId: body.roleId },
      });
    }
  }

  if (Object.keys(data).length === 0 && body.roleId === undefined) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 422 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    include: {
      projectRoles: {
        include: {
          role: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    id: user.id,
    telegramId: user.telegramId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    status: user.status,
    projectRoles: user.projectRoles.map((pr) => ({
      project: pr.project,
      role: pr.role ? { id: pr.role.id, name: pr.role.name } : null,
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}

// DELETE /api/users/[id] — soft-delete (disable user)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[] | undefined;
  if (!permissions?.includes("global:users:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot disable your own account" }, { status: 422 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { status: "DISABLED" },
  });

  return NextResponse.json({ message: "User disabled successfully" });
}
