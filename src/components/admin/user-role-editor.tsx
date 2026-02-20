"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

interface ProjectRole {
  projectId: string
  projectName: string
  currentRole: string | null
}

const AVAILABLE_ROLES = ["admin", "editor", "viewer", "none"] as const

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  editor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  viewer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
}

interface UserRoleEditorProps {
  projects: ProjectRole[]
  onSave: (updates: { projectId: string; role: string | null }[]) => Promise<void>
}

export function UserRoleEditor({ projects, onSave }: UserRoleEditorProps) {
  const [roles, setRoles] = useState<Record<string, string>>(
    Object.fromEntries(
      projects.map((p) => [p.projectId, p.currentRole ?? "none"])
    )
  )
  const [saving, setSaving] = useState(false)

  const hasChanges = projects.some(
    (p) => (p.currentRole ?? "none") !== roles[p.projectId]
  )

  async function handleSave() {
    setSaving(true)
    try {
      const updates = Object.entries(roles).map(([projectId, role]) => ({
        projectId,
        role: role === "none" ? null : role,
      }))
      await onSave(updates)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Project Roles</CardTitle>
        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.projectId}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{project.projectName}</span>
                {project.currentRole && (
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      roleColors[project.currentRole] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {project.currentRole}
                  </span>
                )}
              </div>
              <Select
                value={roles[project.projectId]}
                onValueChange={(value) =>
                  setRoles((prev) => ({ ...prev, [project.projectId]: value }))
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "none" ? "No Access" : role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
