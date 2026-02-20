import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { LoginError } from "./login-error";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Sign In - Auth Center",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = params.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#0088cc] text-white shadow-lg">
            <Shield className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Auth Center</h1>
        </div>

        <Card className="shadow-lg">
          <CardContent className="flex flex-col gap-4 pt-6">
            {error && <LoginError error={error} />}
            <TelegramLoginButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
