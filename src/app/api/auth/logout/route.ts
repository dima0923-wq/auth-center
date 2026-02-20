import { NextResponse } from "next/server";
import { clearSessionToken } from "@/lib/auth";

export async function POST() {
  await clearSessionToken();
  return NextResponse.json({ success: true });
}
