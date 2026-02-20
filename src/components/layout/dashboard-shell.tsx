"use client"

import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface DashboardShellProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    isAdmin?: boolean
    username?: string | null
    firstName?: string | null
    photoUrl?: string | null
  }
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
