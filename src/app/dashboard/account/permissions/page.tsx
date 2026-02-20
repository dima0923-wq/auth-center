"use client"

import { PermissionsTable } from "@/components/account/permissions-table"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Permission {
  id: string
  name: string
  description: string
  granted: boolean
}

interface ProjectPermissions {
  projectId: string
  projectName: string
  permissions: Permission[]
}

// Default permissions structure for when API is not yet available
const DEFAULT_PERMISSIONS: ProjectPermissions[] = [
  {
    projectId: "creative-center",
    projectName: "Creative Center",
    permissions: [
      { id: "cc-view", name: "View Creatives", description: "View generated creatives and templates", granted: false },
      { id: "cc-create", name: "Create Creatives", description: "Generate new creatives using AI agents", granted: false },
      { id: "cc-manage", name: "Manage Agents", description: "Configure AI agents and their settings", granted: false },
      { id: "cc-memory", name: "Access Memory", description: "View and manage agent memory entries", granted: false },
    ],
  },
  {
    projectId: "traffic-center",
    projectName: "Traffic Center",
    permissions: [
      { id: "tc-view", name: "View Campaigns", description: "View campaign performance and analytics", granted: false },
      { id: "tc-manage", name: "Manage Campaigns", description: "Create, edit, and pause ad campaigns", granted: false },
      { id: "tc-budget", name: "Manage Budgets", description: "Set and adjust campaign budgets", granted: false },
      { id: "tc-analytics", name: "View Analytics", description: "Access detailed performance reports", granted: false },
    ],
  },
  {
    projectId: "retention-center",
    projectName: "Retention Center",
    permissions: [
      { id: "rc-view", name: "View Contacts", description: "View leads and contact lists", granted: false },
      { id: "rc-email", name: "Send Emails", description: "Create and send email campaigns", granted: false },
      { id: "rc-sms", name: "Send SMS", description: "Create and send SMS campaigns", granted: false },
      { id: "rc-manage", name: "Manage Campaigns", description: "Create and manage retention campaigns", granted: false },
    ],
  },
]

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<ProjectPermissions[]>(DEFAULT_PERMISSIONS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPermissions() {
      try {
        // /api/users/me returns projectRoles with nested role.permissions
        const res = await fetch("/api/users/me")
        if (res.ok) {
          const data = await res.json()
          if (data.projectRoles && Array.isArray(data.projectRoles)) {
            // Build granted permission set per project
            const projectPerms: ProjectPermissions[] = DEFAULT_PERMISSIONS.map((dp) => {
              // Find matching projectRole (project IDs use underscores: creative_center)
              const projectKey = dp.projectId.replace(/-/g, "_")
              const pr = data.projectRoles.find((r: { project: string }) => r.project === projectKey)
              const grantedKeys = new Set<string>()
              if (pr?.role?.permissions) {
                for (const rp of pr.role.permissions) {
                  grantedKeys.add(rp.key ?? rp.name)
                }
              }
              return {
                ...dp,
                permissions: dp.permissions.map((p) => ({
                  ...p,
                  granted: grantedKeys.has(p.id) || grantedKeys.has(p.name),
                })),
              }
            })
            setPermissions(projectPerms)
          }
        }
      } catch {
        // API not available yet — use defaults
      }
      setLoading(false)
    }

    fetchPermissions()
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/account">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Permissions</h1>
          <p className="text-muted-foreground">
            Your permissions across all projects (read-only)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading permissions...</div>
      ) : (
        <PermissionsTable projects={permissions} />
      )}

      <p className="text-xs text-muted-foreground">
        Only administrators can modify permissions. Contact your admin if you need additional access.
      </p>
    </div>
  )
}
