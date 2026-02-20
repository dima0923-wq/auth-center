import { NextResponse } from "next/server";
import { getPermissionMatrix } from "@/lib/permissions";
import { withPermission } from "@/lib/auth-middleware";

// GET /api/permissions/matrix — get full role-permission matrix
export const GET = withPermission("global:roles:view", async () => {
  const matrix = await getPermissionMatrix();
  return NextResponse.json(matrix);
});
