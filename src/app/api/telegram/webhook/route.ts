import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      username?: string;
      first_name?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();

    const msg = update.message;
    if (!msg || !msg.text || !msg.from) {
      return NextResponse.json({ ok: true });
    }

    // Handle /start command — save username → chatId mapping
    if (msg.text.startsWith("/start")) {
      const chatId = BigInt(msg.chat.id);
      const username = msg.from.username?.toLowerCase();

      if (username) {
        // Update existing user's telegramChatId if they exist
        await prisma.user.updateMany({
          where: { username },
          data: { telegramChatId: chatId },
        });
      }

      console.log(
        `Webhook /start: username=${username || "none"}, chatId=${chatId}`
      );
    }
  } catch (err) {
    console.error("Telegram webhook error:", err);
  }

  // Always return 200 — Telegram expects this
  return NextResponse.json({ ok: true });
}
