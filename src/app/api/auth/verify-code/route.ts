import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loginCodes } from "../request-code/route";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = body.username?.trim()?.replace("@", "")?.toLowerCase();
    const code = body.code?.trim();

    if (!username || !code) {
      return NextResponse.json({ error: "Username and code are required" }, { status: 400 });
    }

    // Look up code
    const stored = loginCodes.get(username);

    if (!stored) {
      return NextResponse.json({ error: "No code found. Please request a new one." }, { status: 400 });
    }

    if (Date.now() > stored.expiresAt) {
      loginCodes.delete(username);
      return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 });
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 401 });
    }

    // Code is valid — delete it
    loginCodes.delete(username);

    // Get Telegram user info from bot API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    let telegramId: bigint | null = null;
    let firstName = username;
    let lastName: string | null = null;
    let photoUrl: string | null = null;

    if (botToken && stored.telegramChatId) {
      // We have the chat_id from when we sent the code
      telegramId = BigInt(stored.telegramChatId);

      // Try to get user info from recent updates
      try {
        const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`);
        const updatesData = await updatesRes.json();

        if (updatesData.ok) {
          for (const update of updatesData.result) {
            const msg = update.message;
            if (msg?.from?.username?.toLowerCase() === username) {
              firstName = msg.from.first_name || username;
              lastName = msg.from.last_name || null;
              telegramId = BigInt(msg.from.id);
              break;
            }
          }
        }

        // Try to get profile photo
        const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${stored.telegramChatId}&limit=1`);
        const photosData = await photosRes.json();
        if (photosData.ok && photosData.result.total_count > 0) {
          const fileId = photosData.result.photos[0][0].file_id;
          const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
          const fileData = await fileRes.json();
          if (fileData.ok) {
            photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          }
        }
      } catch {
        // Non-critical — proceed without extra info
      }
    }

    if (!telegramId) {
      return NextResponse.json({ error: "Could not verify Telegram identity" }, { status: 500 });
    }

    // Look up or create user (same logic as the widget auth)
    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (user) {
      if (user.status === "DISABLED") {
        return NextResponse.json({ error: "Account is disabled. Contact an administrator." }, { status: 403 });
      }

      // Update user info
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firstName, lastName, username, photoUrl },
      });
    } else {
      // New user — check bootstrap or invitation
      const userCount = await prisma.user.count();

      if (userCount === 0) {
        // First user = Super Admin
        user = await prisma.user.create({
          data: { telegramId, firstName, lastName, username, photoUrl, status: "ACTIVE" },
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
          data: { telegramId, firstName, lastName, username, photoUrl, status: "ACTIVE" },
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

    // Issue session
    const token = await createSessionToken(user.id);

    return NextResponse.json({
      token,
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
