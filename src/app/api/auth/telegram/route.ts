import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramAuth, type TelegramAuthData } from "@/lib/telegram-auth";
import { createSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    let body: TelegramAuthData;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
    }

    // Validate required fields
    if (!body.id || !body.first_name || !body.auth_date || !body.hash) {
      return NextResponse.json(
        { error: "Missing required Telegram auth fields" },
        { status: 422 }
      );
    }

    // Verify Telegram hash
    let valid: boolean;
    try {
      valid = verifyTelegramAuth(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification error";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid Telegram authentication data" },
        { status: 401 }
      );
    }

    // Look up user by telegramId
    const telegramId = BigInt(body.id);

    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (user) {
      // Existing user — check status
      if (user.status === "DISABLED") {
        return NextResponse.json(
          { error: "Account is disabled. Contact an administrator." },
          { status: 403 }
        );
      }

      // Update existing user's info from Telegram
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: body.first_name,
          lastName: body.last_name || null,
          username: body.username || null,
          photoUrl: body.photo_url || null,
        },
      });
    } else {
      // New user — check if this is the very first user (bootstrap Super Admin)
      const userCount = await prisma.user.count();

      if (userCount === 0) {
        // First user bootstrap: create as Super Admin
        user = await prisma.user.create({
          data: {
            telegramId,
            firstName: body.first_name,
            lastName: body.last_name || null,
            username: body.username || null,
            photoUrl: body.photo_url || null,
            status: "ACTIVE",
          },
        });

        // Assign Super Admin role for global scope
        const superAdminRole = await prisma.role.findUnique({
          where: { name: "Super Admin" },
        });
        if (superAdminRole) {
          await prisma.userProjectRole.create({
            data: {
              userId: user.id,
              project: "global",
              roleId: superAdminRole.id,
            },
          });
        }
      } else {
        // Not first user — check for invitation by @username
        const username = body.username;
        if (!username) {
          return NextResponse.json(
            { error: "Access denied. You need an invitation to access this platform." },
            { status: 403 }
          );
        }

        const invitation = await prisma.invitation.findFirst({
          where: {
            telegramUsername: username,
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

        if (!invitation) {
          return NextResponse.json(
            { error: "Access denied. You need an invitation to access this platform." },
            { status: 403 }
          );
        }

        // Create user from invitation
        user = await prisma.user.create({
          data: {
            telegramId,
            firstName: body.first_name,
            lastName: body.last_name || null,
            username: username,
            photoUrl: body.photo_url || null,
            status: "ACTIVE",
          },
        });

        // Assign the invited role and project scope
        await prisma.userProjectRole.create({
          data: {
            userId: user.id,
            project: invitation.project,
            roleId: invitation.roleId,
          },
        });

        // Mark invitation as accepted
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        });
      }
    }

    // Issue session JWT and set cookie
    const token = await createSessionToken(user.id);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        telegramId: user.telegramId.toString(),
      },
    });
  } catch (err) {
    console.error("Telegram auth error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
