import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardHome } from "@/components/layout/dashboard-home"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return <DashboardHome user={session.user} />
}
