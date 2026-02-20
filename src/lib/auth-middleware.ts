import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, getUserRoles } from "@/lib/permissions";

type RouteHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

interface AuthenticatedRequest extends NextRequest {
  userId: string;
}

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (req, context) => {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }
    (req as AuthenticatedRequest).userId = session.user.id;
    return handler(req as AuthenticatedRequest, context);
  };
}

export function withPermission(permission: string, handler: AuthenticatedHandler): RouteHandler {
  return withAuth(async (req, context) => {
    const allowed = await hasPermission(req.userId, permission);
    if (!allowed) {
      return forbidden(`Missing permission: ${permission}`);
    }
    return handler(req, context);
  });
}

export function withRole(roleName: string, handler: AuthenticatedHandler): RouteHandler {
  return withAuth(async (req, context) => {
    const roles = await getUserRoles(req.userId);
    const hasRole = roles.some((r) => r.name === roleName);
    if (!hasRole) {
      return forbidden(`Missing role: ${roleName}`);
    }
    return handler(req, context);
  });
}
