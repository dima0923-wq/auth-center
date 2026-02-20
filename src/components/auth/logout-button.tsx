"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (res.ok || res.redirected) {
        router.push("/login")
        router.refresh()
      } else {
        console.error("Logout failed:", res.status)
        // Force redirect even on error
        window.location.href = "/login"
      }
    } catch {
      window.location.href = "/login"
    }
  }

  return (
    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
      <LogOut className="size-4" />
      Sign Out
    </DropdownMenuItem>
  )
}
