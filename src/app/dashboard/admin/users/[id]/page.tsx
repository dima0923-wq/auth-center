"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserStatusBadge } from "@/components/admin/user-status-badge"
import { UserRoleEditor } from "@/components/admin/user-role-editor"
import {
  ArrowLeft,
  AtSign,
  Calendar,
  Clock,
  Send,
  ShieldOff,
  ShieldCheck,
} from "lucide-react"

const PROJECT_NAMES: Record<string, string> = {
  creative_center: "Creative Center",
  traffic_center: "Traffic Center",
  retention_center: "Retention Center",
}

const ALL_PROJECTS = ["creative_center", "traffic_center", "retention_center"]

interface UserDetail {
  id: string
  name: string
  username: string | null
  image: string | null
  status: "active" | "disabled" | "pending"
  createdAt: string
  lastLoginAt: string | null
  telegramConnected: boolean
  projectRoles: {
    projectId: string
    projectName: string
    currentRole: string | null
  }[]
  auditLog: {
    id: string
    action: string
    details: string
    createdAt: string
    performedBy: string
  }[]
}

async function fetchUser(id: string): Promise<UserDetail> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error("Failed to fetch user")
  const u = await res.json()

  // Build project roles map from API response
  const assignedProjects = new Set(
    (u.projectRoles ?? []).map((pr: any) => pr.project)
  )

  const projectRoles = ALL_PROJECTS.map((projectId) => {
    const assigned = (u.projectRoles ?? []).find((pr: any) => pr.project === projectId)
    return {
      projectId,
      projectName: PROJECT_NAMES[projectId] ?? projectId,
      currentRole: assigned?.role?.name ?? null,
    }
  })

  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown",
    username: u.username,
    image: u.photoUrl,
    status: (u.status ?? "ACTIVE").toLowerCase() as "active" | "disabled" | "pending",
    createdAt: u.createdAt,
    lastLoginAt: null,
    telegramConnected: !!u.telegramId,
    projectRoles,
    auditLog: [],
  }
}

async function updateUserStatus(id: string, status: "active" | "disabled") {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: status.toUpperCase() }),
  })
  if (!res.ok) throw new Error("Failed to update status")
}

async function updateUserRoles(
  id: string,
  updates: { projectId: string; role: string | null }[]
) {
  // Fetch available roles to map role names to IDs
  const rolesRes = await fetch("/api/roles")
  const roles: { id: string; name: string }[] = rolesRes.ok ? await rolesRes.json() : []
  const roleMap = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]))

  // Update each project individually via the per-project endpoint
  const results = await Promise.all(
    updates.map(async ({ projectId, role }) => {
      if (!role) {
        // Remove access
        const res = await fetch(`/api/users/${id}/projects/${projectId}`, {
          method: "DELETE",
        })
        return res.ok
      }
      const roleId = roleMap.get(role.toLowerCase())
      if (!roleId) return false
      const res = await fetch(`/api/users/${id}/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      })
      return res.ok
    })
  )

  if (results.some((ok) => !ok)) {
    throw new Error("Failed to update some roles")
  }
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchUser(userId)
        setUser(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  async function handleToggleStatus() {
    if (!user) return
    const newStatus = user.status === "active" ? "disabled" : "active"
    await updateUserStatus(userId, newStatus)
    setUser((prev) => (prev ? { ...prev, status: newStatus } : null))
  }

  async function handleSaveRoles(
    updates: { projectId: string; role: string | null }[]
  ) {
    await updateUserRoles(userId, updates)
    setUser((prev) => {
      if (!prev) return null
      return {
        ...prev,
        projectRoles: prev.projectRoles.map((pr) => {
          const update = updates.find((u) => u.projectId === pr.projectId)
          return update ? { ...pr, currentRole: update.role } : pr
        }),
      }
    })
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading user...</p>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/admin/users">
            <ArrowLeft className="size-4" />
            Back to Users
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error ?? "User not found"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/dashboard/admin/users">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center gap-4">
          <Avatar className="size-14">
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback className="text-lg">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
              <UserStatusBadge status={user.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {user.username ? `@${user.username}` : "No username"}
            </p>
          </div>
          <Button
            variant={user.status === "active" ? "destructive" : "default"}
            size="sm"
            onClick={handleToggleStatus}
          >
            {user.status === "active" ? (
              <>
                <ShieldOff className="size-4" />
                Disable User
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                Enable User
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  <AtSign className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telegram Username</p>
                  <p className="text-sm font-medium">
                    {user.username ? `@${user.username}` : "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  <Send className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telegram</p>
                  <p className="text-sm font-medium">
                    {user.telegramConnected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  <Calendar className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  <Clock className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Login</p>
                  <p className="text-sm font-medium">{formatDate(user.lastLoginAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Editor */}
        <UserRoleEditor
          projects={user.projectRoles}
          onSave={handleSaveRoles}
        />
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
          <CardDescription>Recent account activity and changes</CardDescription>
        </CardHeader>
        <CardContent>
          {user.auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.auditLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.details}
                    </TableCell>
                    <TableCell className="text-sm">{entry.performedBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
