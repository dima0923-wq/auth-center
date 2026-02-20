import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createSessionToken } from "@/lib/auth";
import { issueProjectToken } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import {
  validateRedirectUrl,
  projectFromRedirectUrl,
  CROSS_DOMAIN_COOKIE,
  COOKIE_DOMAIN,
} from "@/lib/redirect";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = body.username?.trim()?.replace("@", "")?.toLowerCase();
    const code = body.code?.trim();
    const redirectUrl = body.redirect_url as string | undefined;

    if (!username || !code) {
      return NextResponse.json({ error: "Username and code are required" }, { status: 400 });
    }

    // Look up code from DB (not expired)
    const loginCode = await prisma.loginCode.findFirst({
      where: {
        username,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!loginCode) {
      return NextResponse.json({ error: "No code found. Please request a new one." }, { status: 400 });
    }

    // Brute force protection: check attempts
    if (loginCode.attempts >= loginCode.maxAttempts) {
      await prisma.loginCode.delete({ where: { id: loginCode.id } });
      return NextResponse.json({ error: "Too many attempts, request a new code." }, { status: 429 });
    }

    // Timing-safe comparison: hash submitted code, compare with stored hash
    const submittedHash = hashCode(code);
    const storedHashBuf = Buffer.from(loginCode.codeHash, "hex");
    const submittedHashBuf = Buffer.from(submittedHash, "hex");

    const isValid =
      storedHashBuf.length === submittedHashBuf.length &&
      timingSafeEqual(storedHashBuf, submittedHashBuf);

    if (!isValid) {
      // Increment attempts
      await prisma.loginCode.update({
        where: { id: loginCode.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = loginCode.maxAttempts - loginCode.attempts - 1;
      if (remaining <= 0) {
        await prisma.loginCode.delete({ where: { id: loginCode.id } });
        return NextResponse.json({ error: "Too many attempts, request a new code." }, { status: 429 });
      }

      return NextResponse.json(
        { error: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
        { status: 401 }
      );
    }

    // Code is valid — delete it so it can't be reused
    await prisma.loginCode.delete({ where: { id: loginCode.id } });

    // Use chatId from LoginCode as telegramId (chatId === telegramId for private chats)
    const telegramId = loginCode.chatId;

    // Look up or create user
    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (user) {
      if (user.status === "DISABLED") {
        return NextResponse.json({ error: "Account is disabled. Contact an administrator." }, { status: 403 });
      }

      // Update username (don't update photoUrl from bot API — it leaks the token)
      user = await prisma.user.update({
        where: { id: user.id },
        data: { username },
      });
    } else {
      // New user — check bootstrap or invitation
      const userCount = await prisma.user.count();

      if (userCount === 0) {
        // First user = Super Admin
        user = await prisma.user.create({
          data: { telegramId, firstName: username, username, status: "ACTIVE" },
        });

        const superAdminRole = await prisma.role.findUnique({ where: { name: "Super Admin" } });
        if (superAdminRole) {
          await prisma.userProjectRole.create({
            data: { userId: user.id, project: "global", roleId: superAdminRole.id },
          });
        }
      } else {
        // Check invitation
        const invitation = await prisma.invitation.findFirst({
          where: {
            telegramUsername: username,
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

        if (!invitation) {
          return NextResponse.json({ error: "Access denied. You need an invitation." }, { status: 403 });
        }

        user = await prisma.user.create({
          data: { telegramId, firstName: username, username, status: "ACTIVE" },
        });

        await prisma.userProjectRole.create({
          data: { userId: user.id, project: invitation.project, roleId: invitation.roleId },
        });

        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        });
      }
    }

    // Issue session cookie (for Auth Center itself)
    const sessionToken = await createSessionToken(user.id);

    // Load user roles/permissions for project token
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        projectRoles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    // Cross-project redirect flow
    const validatedRedirect = redirectUrl
      ? validateRedirectUrl(redirectUrl)
      : null;

    if (validatedRedirect) {
      const project = projectFromRedirectUrl(validatedRedirect);

      // Build roles/permissions
      const allPermissions = new Set<string>();
      let role = "viewer";
      if (userWithRoles) {
        for (const pr of userWithRoles.projectRoles) {
          if (pr.project === project || pr.project === "global") {
            role = pr.role.name;
            for (const rp of pr.role.permissions) {
              allPermissions.add(rp.permission.key);
            }
          }
        }
      }

      // Issue a project-scoped access token
      const projectTokens = await issueProjectToken(
        {
          id: user.id,
          telegramId: user.telegramId.toString(),
          username: user.username ?? null,
          firstName: user.firstName,
          photoUrl: user.photoUrl ?? null,
          role,
        },
        project || "creative_center",
        Array.from(allPermissions)
      );

      // Build redirect URL with token
      const redirectTarget = new URL(validatedRedirect);
      redirectTarget.searchParams.set("ac_token", projectTokens.accessToken);

      const response = NextResponse.json({
        redirect_url: redirectTarget.toString(),
        token: sessionToken,
        user: {
          id: user.id,
          firstName: user.firstName,
          username: user.username,
          telegramId: user.telegramId.toString(),
        },
      });

      // Set cross-domain cookie readable by all subdomains
      response.cookies.set(CROSS_DOMAIN_COOKIE, projectTokens.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        domain: COOKIE_DOMAIN,
        path: "/",
        maxAge: 3600, // 1 hour (matches access token expiry)
      });

      return response;
    }

    // Standard login (no redirect) — just set session cookie
    return NextResponse.json({
      token: sessionToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        username: user.username,
        telegramId: user.telegramId.toString(),
      },
    });
  } catch (err) {
    console.error("Verify code error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
