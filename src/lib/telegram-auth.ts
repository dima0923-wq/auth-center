import { createHmac, createHash } from "crypto";

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const MAX_AUTH_AGE_SECONDS = 3600; // 1 hour

/**
 * Verify Telegram Login Widget callback data.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(data: TelegramAuthData): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }

  // 1. Check auth_date is not too old
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > MAX_AUTH_AGE_SECONDS) {
    return false;
  }

  // 2. Build data-check-string: sort all fields except "hash" alphabetically, join with \n
  const checkFields: string[] = [];
  for (const key of Object.keys(data).sort()) {
    if (key === "hash") continue;
    const value = (data as unknown as Record<string, unknown>)[key];
    if (value !== undefined && value !== null) {
      checkFields.push(`${key}=${value}`);
    }
  }
  const dataCheckString = checkFields.join("\n");

  // 3. Secret key = SHA256(bot_token)
  const secretKey = createHash("sha256").update(botToken).digest();

  // 4. HMAC-SHA256(data_check_string, secret_key)
  const hmac = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // 5. Compare with provided hash
  return hmac === data.hash;
}
