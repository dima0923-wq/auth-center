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

    // Upsert user by telegramId (BigInt in schema)
    const telegramId = BigInt(body.id);

    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (user) {
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
      // Create new user
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
    }

    // Check if user is disabled
    if (user.status === "DISABLED") {
      return NextResponse.json(
        { error: "Account is disabled" },
        { status: 403 }
      );
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
