import { auth, type SessionUser } from "@/lib/auth";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

export async function requirePermission(permission: string): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.permissions?.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
  return user;
}
