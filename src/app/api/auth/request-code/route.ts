import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// In-memory store for login codes (in production, use Redis)
const loginCodes = new Map<string, { code: string; expiresAt: number; telegramChatId?: number }>();

export { loginCodes };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = body.username?.trim()?.replace("@", "");

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store code
    loginCodes.set(username.toLowerCase(), { code, expiresAt });

    // Send code via Telegram Bot API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
    }

    // First, we need the chat_id. The bot can only send messages to users who started it.
    // We'll try to find updates from this user to get their chat_id
    const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`);
    const updatesData = await updatesRes.json();

    let chatId: number | null = null;

    if (updatesData.ok && updatesData.result) {
      for (const update of updatesData.result) {
        const msg = update.message;
        if (msg?.from?.username?.toLowerCase() === username.toLowerCase()) {
          chatId = msg.chat.id;
          break;
        }
      }
    }

    if (!chatId) {
      // Also check existing users in DB who may have a stored chat_id
      const existingUser = await prisma.user.findFirst({
        where: { username },
      });

      if (!existingUser) {
        return NextResponse.json({
          error: `Bot hasn't seen @${username} yet. Please open @fdsjgdsfigj2n432bot in Telegram and send /start first.`,
        }, { status: 400 });
      }
    }

    if (!chatId) {
      return NextResponse.json({
        error: `Please send /start to @fdsjgdsfigj2n432bot in Telegram first, then try again.`,
      }, { status: 400 });
    }

    // Store chat_id with the code
    loginCodes.set(username.toLowerCase(), { code, expiresAt, telegramChatId: chatId });

    // Send the code via bot
    const message = `🔐 Your Auth Center login code:\n\n<b>${code}</b>\n\nThis code expires in 5 minutes. Do not share it.`;

    const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const sendData = await sendRes.json();

    if (!sendData.ok) {
      console.error("Failed to send Telegram message:", sendData);
      return NextResponse.json({ error: "Failed to send code. Make sure you started the bot." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Code sent to @${username}` });
  } catch (err) {
    console.error("Request code error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
