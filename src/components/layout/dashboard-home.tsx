"use client"

import {
  Shield,
  Users,
  KeyRound,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectSwitcher } from "./project-switcher"

interface DashboardHomeProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    firstName?: string | null
    roles?: Record<string, string>
  }
}

export function DashboardHome({ user }: DashboardHomeProps) {
  const firstName = user.firstName || user.name?.split(" ")[0] || "there"

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h2>
        <p className="mt-1 text-muted-foreground">
          Manage your account, permissions, and access your projects.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-50">
              <Shield className="size-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Projects</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50">
              <KeyRound className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permissions</p>
              <p className="text-2xl font-bold">--</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50">
              <Users className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">--</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50">
              <Activity className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Sessions</p>
              <p className="text-2xl font-bold">1</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Your Projects</h3>
        </div>
        <ProjectSwitcher
          userRoles={user.roles ?? {}}
        />
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No recent activity to display.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Activity will appear here once you start using the platform.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
