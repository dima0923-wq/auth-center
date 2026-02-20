"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth: (user: TelegramAuthData) => void;
  }
}

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "the_bot";

export function TelegramLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"widget" | "code-request" | "code-verify">("widget");
  const [codeSentTo, setCodeSentTo] = useState("");
  const [code, setCode] = useState("");
  const [chatId, setChatId] = useState("");
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

  // Load Telegram Login Widget
  useEffect(() => {
    if (mode !== "widget") return;

    window.onTelegramAuth = (user: TelegramAuthData) => {
      handleTelegramAuth(user);
    };

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername || !widgetRef.current) return;

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
      delete (window as unknown as Record<string, unknown>).onTelegramAuth;
    };
  }, [handleTelegramAuth, mode]);

  // Request login code via bot
  const requestCode = async () => {
    if (!chatId.trim()) {
      setError("Please enter your Telegram username");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: chatId.trim().replace("@", "") }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to send code");
        setIsLoading(false);
        return;
      }

      setCodeSentTo(chatId.trim());
      setMode("code-verify");
      setIsLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  // Verify login code
  const verifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: codeSentTo.replace("@", ""), code: code.trim() }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Invalid code");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {mode === "widget" && (
        <>
          {/* Telegram Login Widget */}
          <div ref={widgetRef} className="flex justify-center min-h-[40px]" />

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-[#0088cc]/40 border-t-[#0088cc]" />
              Signing in...
            </div>
          )}

          <div className="flex items-center gap-2 w-full">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setMode("code-request")}
          >
            Sign in with code via bot
          </Button>
        </>
      )}

      {mode === "code-request" && (
        <div className="w-full flex flex-col gap-3">
          <p className="text-sm text-muted-foreground text-center">
            Enter your Telegram username. We&apos;ll send a login code via <strong>@{botUsername}</strong>.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            First, open Telegram and send <strong>/start</strong> to <strong>@{botUsername}</strong>
          </p>
          <Input
            placeholder="@username"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && requestCode()}
            disabled={isLoading}
          />
          <Button
            size="lg"
            className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white"
            onClick={requestCode}
            disabled={isLoading}
          >
            {isLoading ? "Sending code..." : "Send login code"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setMode("widget"); setError(null); }}
          >
            Back to Telegram widget
          </Button>
        </div>
      )}

      {mode === "code-verify" && (
        <div className="w-full flex flex-col gap-3">
          <p className="text-sm text-muted-foreground text-center">
            Code sent to <strong>@{codeSentTo.replace("@", "")}</strong> via bot. Check your Telegram.
          </p>
          <Input
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && verifyCode()}
            disabled={isLoading}
            className="text-center text-2xl tracking-widest"
            maxLength={6}
          />
          <Button
            size="lg"
            className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white"
            onClick={verifyCode}
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Verify code"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setMode("code-request"); setCode(""); setError(null); }}
          >
            Resend code
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
