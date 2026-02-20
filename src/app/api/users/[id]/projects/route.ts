import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PROJECTS, isValidProject, type ProjectId } from "@/lib/projects";

// GET /api/users/[id]/projects — list user's roles across all projects
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const records = await prisma.userProjectRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  const projects = records
    .filter((r: { project: string }) => isValidProject(r.project))
    .map((r: { project: string; role: { id: string; name: string; permissions: { permission: { name: string } }[] }; createdAt: Date }) => ({
      project: r.project,
      projectMeta: PROJECTS[r.project as ProjectId],
      role: {
        id: r.role.id,
        name: r.role.name,
        permissions: r.role.permissions.map((rp: { permission: { name: string } }) => rp.permission.name),
      },
      assignedAt: r.createdAt,
    }));

  return NextResponse.json({ userId, projects });
}
