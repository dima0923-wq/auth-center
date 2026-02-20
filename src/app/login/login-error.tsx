"use client";

import { AlertCircle } from "lucide-react";

const errorMessages: Record<string, string> = {
  OAuthSignin: "Could not start the sign-in process. Please try again.",
  OAuthCallback: "Sign-in was interrupted. Please try again.",
  AccessDenied: "You do not have permission to access this platform.",
  TelegramAuthFailed: "Telegram authentication failed. Please try again.",
  AccountDisabled: "Your account has been disabled. Contact an administrator.",
  Default: "An unexpected error occurred. Please try again.",
};

export function LoginError({ error }: { error: string }) {
  const message = errorMessages[error] || errorMessages.Default;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
