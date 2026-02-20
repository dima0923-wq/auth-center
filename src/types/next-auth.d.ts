/**
 * Telegram-based auth session types.
 * Replaces the previous next-auth type extensions.
 */

export interface TelegramUser {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  email: string | null;
}

export interface SessionUser extends TelegramUser {
  roles: Record<string, string>; // project -> role name
  permissions: string[];
}

export interface Session {
  user: SessionUser;
}
