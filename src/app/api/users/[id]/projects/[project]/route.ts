import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PROJECTS, isValidProject, type ProjectId } from "@/lib/projects";

type Params = Promise<{ id: string; project: string }>;

function formatRole(role: { id: string; name: string; permissions: { permission: { name: string } }[] }) {
  return {
    id: role.id,
    name: role.name,
    permissions: role.permissions.map((rp: { permission: { name: string } }) => rp.permission.name),
  };
}

// GET /api/users/[id]/projects/[project] — get user's role for a specific project
export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const { id: userId, project } = await params;

  if (!isValidProject(project)) {
    return NextResponse.json(
      { error: `Invalid project: ${project}` },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const record = await prisma.userProjectRole.findUnique({
    where: { userId_project: { userId, project } },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  if (!record) {
    return NextResponse.json(
      { error: "User has no role assigned for this project" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    userId,
    project,
    projectMeta: PROJECTS[project as ProjectId],
    role: formatRole(record.role),
    assignedAt: record.createdAt,
  });
}

// PUT /api/users/[id]/projects/[project] — assign or change user's role for a project
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const { id: userId, project } = await params;

  if (!isValidProject(project)) {
    return NextResponse.json(
      { error: `Invalid project: ${project}` },
      { status: 400 }
    );
  }

  const body = await request.json() as { roleId?: string };
  const { roleId } = body;

  if (!roleId) {
    return NextResponse.json(
      { error: "roleId is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const record = await prisma.userProjectRole.upsert({
    where: { userId_project: { userId, project } },
    create: { userId, project, roleId },
    update: { roleId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  return NextResponse.json({
    userId,
    project,
    projectMeta: PROJECTS[project as ProjectId],
    role: formatRole(record.role),
    assignedAt: record.createdAt,
  });
}

// DELETE /api/users/[id]/projects/[project] — remove user's access to a project
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { id: userId, project } = await params;

  if (!isValidProject(project)) {
    return NextResponse.json(
      { error: `Invalid project: ${project}` },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.userProjectRole.findUnique({
    where: { userId_project: { userId, project } },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "User has no role assigned for this project" },
      { status: 404 }
    );
  }

  await prisma.userProjectRole.delete({
    where: { userId_project: { userId, project } },
  });

  return NextResponse.json({ success: true, message: "Project access removed" });
}
