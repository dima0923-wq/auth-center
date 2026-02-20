import { NextResponse } from "next/server";
import { getAllPermissions } from "@/lib/permissions";
import { withPermission } from "@/lib/auth-middleware";

// GET /api/permissions — list all available permissions (grouped by project)
export const GET = withPermission("auth:permissions:read", async () => {
  const grouped = getAllPermissions();
  return NextResponse.json(grouped);
});
