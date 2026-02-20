import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { issueProjectToken } from "@/lib/jwt";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

const VALID_PROJECTS = [
  "creative_center",
  "traffic_center",
  "retention_center",
];

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.telegramId) {
      return corsResponse(
        { error: "Unauthorized -- sign in required" },
        origin,
        401
      );
    }

    const body = await req.json();
    const { project } = body as { project?: string };

    if (!project || !VALID_PROJECTS.includes(project)) {
      return corsResponse(
        {
          error: `Invalid project. Must be one of: ${VALID_PROJECTS.join(", ")}`,
        },
        origin,
        400
      );
    }

    // Derive role and permissions from session
    const role = session.user.roles[project] || "viewer";
    const permissions = session.user.permissions.length > 0
      ? session.user.permissions
      : getDefaultPermissions(role);

    const tokens = await issueProjectToken(
      {
        id: session.user.id,
        telegramId: session.user.telegramId,
        username: session.user.username ?? null,
        firstName: session.user.firstName ?? session.user.name ?? "User",
        photoUrl: session.user.photoUrl ?? null,
        role,
      },
      project,
      permissions
    );

    return corsResponse(tokens, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return corsResponse({ error: message }, origin, 500);
  }
}

function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case "admin":
      return ["read", "write", "delete", "manage_users", "manage_settings"];
    case "manager":
      return ["read", "write", "delete"];
    case "viewer":
      return ["read"];
    default:
      return ["read"];
  }
}
