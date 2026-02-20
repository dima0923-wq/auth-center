"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export function TelegramLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTelegramAuth = useCallback(async (data: TelegramAuthData) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Authentication failed");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  }, [router]);

  const handleClick = () => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      setError("Telegram bot is not configured");
      return;
    }

    // Build Telegram OAuth URL
    const origin = window.location.origin;
    const authUrl = `https://oauth.telegram.org/auth?bot_id=${botUsername}&origin=${encodeURIComponent(origin)}&request_access=write`;

    // Open popup for Telegram auth
    const width = 550;
    const height = 470;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);

    const popup = window.open(
      authUrl,
      "telegram_auth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=no`
    );

    if (!popup) {
      setError("Popup blocked. Please allow popups for this site.");
      return;
    }

    setIsLoading(true);

    // Listen for message from Telegram OAuth popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://oauth.telegram.org") return;

      const data = event.data as Record<string, unknown>;
      if (data && typeof data === "object" && "id" in data && "hash" in data) {
        window.removeEventListener("message", handleMessage);
        clearInterval(pollTimer);
        handleTelegramAuth(data as unknown as TelegramAuthData);
      }
    };

    window.addEventListener("message", handleMessage);

    // Poll for popup close (user cancelled)
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        window.removeEventListener("message", handleMessage);
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        className="w-full h-12 text-base font-medium gap-3 bg-[#0088cc] hover:bg-[#0077b5] text-white"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <TelegramIcon className="size-5" />
        )}
        {isLoading ? "Signing in..." : "Sign in with Telegram"}
      </Button>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
