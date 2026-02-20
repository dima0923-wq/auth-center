import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[] | undefined;
  if (!permissions?.includes("users:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
  const search = url.searchParams.get("search") ?? "";
  const roleId = url.searchParams.get("roleId") ?? "";
  const status = url.searchParams.get("status") ?? ""; // "ACTIVE" | "DISABLED" | ""

  const where: any = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { username: { contains: search } },
    ];
  }

  if (roleId) {
    where.projectRoles = {
      some: { roleId },
    };
  }

  if (status) {
    where.status = status;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        projectRoles: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      telegramId: u.telegramId.toString(),
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      photoUrl: u.photoUrl,
      status: u.status,
      projectRoles: u.projectRoles.map((pr) => ({
        project: pr.project,
        role: { id: pr.role.id, name: pr.role.name },
      })),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/users — create/invite a user (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[] | undefined;
  if (!permissions?.includes("users:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  const { telegramId, username, firstName, lastName, roleId, project } = body;

  if (!telegramId) {
    return NextResponse.json({ error: "telegramId is required" }, { status: 422 });
  }

  if (!firstName || typeof firstName !== "string") {
    return NextResponse.json({ error: "firstName is required" }, { status: 422 });
  }

  const existing = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
  if (existing) {
    return NextResponse.json({ error: "User with this Telegram ID already exists" }, { status: 422 });
  }

  if (roleId) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 422 });
    }
  }

  const user = await prisma.user.create({
    data: {
      telegramId: BigInt(telegramId),
      username: username || null,
      firstName,
      lastName: lastName || null,
      ...(roleId && project
        ? {
            projectRoles: {
              create: { roleId, project },
            },
          }
        : {}),
    },
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
      role: { id: pr.role.id, name: pr.role.name },
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }, { status: 201 });
}
