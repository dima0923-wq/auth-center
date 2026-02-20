import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const GENERIC_ERROR = "Could not send code. Make sure you've sent /start to the bot.";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = body.username?.trim()?.replace("@", "")?.toLowerCase();

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Rate limit by username: 3 requests per 15 minutes
    const userLimit = rateLimit(`req-code:user:${username}`, 3, 15 * 60 * 1000);
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: "Too many code requests. Please try again later." },
        { status: 429 }
      );
    }

    // Rate limit by IP: 5 requests per 15 minutes
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipLimit = rateLimit(`req-code:ip:${ip}`, 5, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many code requests. Please try again later." },
        { status: 429 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
    }

    // Try to find chatId: first from DB, then from getUpdates
    let chatId: bigint | null = null;

    const existingUser = await prisma.user.findFirst({
      where: { username },
      select: { telegramChatId: true },
    });

    if (existingUser?.telegramChatId) {
      chatId = existingUser.telegramChatId;
    }

    // Fallback: search getUpdates for this username
    if (!chatId) {
      try {
        const updatesRes = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?limit=100`
        );
        const updatesData = await updatesRes.json();

        if (updatesData.ok && updatesData.result) {
          for (const update of updatesData.result) {
            const msg = update.message;
            if (msg?.from?.username?.toLowerCase() === username) {
              chatId = BigInt(msg.chat.id);
              // Save chatId to user record for next time
              await prisma.user.updateMany({
                where: { username },
                data: { telegramChatId: chatId },
              });
              break;
            }
          }
        }
      } catch (e) {
        console.error("getUpdates failed:", e);
      }
    }

    if (!chatId) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
    }

    // Generate crypto-random 6-digit code
    const code = randomInt(100000, 999999).toString();

    // Invalidate any existing codes for this username
    await prisma.loginCode.deleteMany({ where: { username } });

    // Store hashed code in DB
    await prisma.loginCode.create({
      data: {
        username,
        codeHash: hashCode(code),
        chatId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    // Send the code via Telegram bot
    const message = `🔐 Your Auth Center login code:\n\n<b>${code}</b>\n\nThis code expires in 5 minutes. Do not share it.`;

    const sendRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId.toString(),
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    const sendData = await sendRes.json();

    if (!sendData.ok) {
      console.error("Failed to send Telegram message:", sendData);
      // Clean up the code since we couldn't send it
      await prisma.loginCode.deleteMany({ where: { username } });
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Code sent via Telegram" });
  } catch (err) {
    console.error("Request code error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
