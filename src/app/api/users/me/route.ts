import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function formatUserResponse(user: any) {
  return {
    id: user.id,
    telegramId: user.telegramId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    status: user.status,
    projectRoles: user.projectRoles.map((pr: any) => ({
      project: pr.project,
      role: {
        id: pr.role.id,
        name: pr.role.name,
        description: pr.role.description,
        permissions: pr.role.permissions.map((rp: any) => ({
          id: rp.permission.id,
          key: rp.permission.key,
          name: rp.permission.name,
          description: rp.permission.description,
        })),
      },
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

const userInclude = {
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
};

// GET /api/users/me — get current user's profile with all permissions
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: userInclude,
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(formatUserResponse(user));
}

// PUT /api/users/me — update own profile (firstName, lastName, username)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  const data: any = {};
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName || null;
  if (body.username !== undefined) data.username = body.username || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update. Allowed: firstName, lastName, username." }, { status: 422 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    include: userInclude,
  });

  return NextResponse.json(formatUserResponse(user));
}
