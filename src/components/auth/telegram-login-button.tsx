"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "the_bot";

export function TelegramCodeLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"code-request" | "code-verify">("code-request");
  const [codeSentTo, setCodeSentTo] = useState("");
  const [code, setCode] = useState("");
  const [chatId, setChatId] = useState("");
  const router = useRouter();

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
