"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

// Declare global callback for Telegram widget
declare global {
  interface Window {
    onTelegramAuth: (user: TelegramAuthData) => void;
  }
}

export function TelegramLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    // Set global callback that Telegram widget will call
    window.onTelegramAuth = (user: TelegramAuthData) => {
      handleTelegramAuth(user);
    };

    // Load Telegram Login Widget script
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername || !widgetRef.current) return;

    // Clear previous widget
    widgetRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    widgetRef.current.appendChild(script);

    return () => {
      delete (window as Record<string, unknown>).onTelegramAuth;
    };
  }, [handleTelegramAuth]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Telegram Login Widget renders here */}
      <div ref={widgetRef} className="flex justify-center min-h-[40px]" />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-[#0088cc]/40 border-t-[#0088cc]" />
          Signing in...
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
