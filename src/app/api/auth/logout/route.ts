import { NextResponse } from "next/server";
import { clearSessionToken } from "@/lib/auth";
import { CROSS_DOMAIN_COOKIE, COOKIE_DOMAIN } from "@/lib/redirect";

export async function POST() {
  await clearSessionToken();

  const response = NextResponse.json({ success: true });

  // Also clear cross-domain cookie
  response.cookies.set(CROSS_DOMAIN_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    domain: COOKIE_DOMAIN,
    path: "/",
    maxAge: 0,
  });

  return response;
}
