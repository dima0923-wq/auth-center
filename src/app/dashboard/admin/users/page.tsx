"use client"

import { useEffect, useState } from "react"
import { UsersTable, type AdminUser } from "@/components/admin/users-table"
import { InviteUserDialog } from "@/components/admin/invite-user-dialog"
import { Users } from "lucide-react"

const PROJECTS = [
  { projectId: "creative_center", projectName: "Creative Center" },
  { projectId: "traffic_center", projectName: "Traffic Center" },
  { projectId: "retention_center", projectName: "Retention Center" },
]

async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch("/api/users?limit=100")
  if (!res.ok) throw new Error("Failed to fetch users")
  const data = await res.json()
  return (data.users ?? []).map((u: any) => ({
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown",
    username: u.username,
    image: u.photoUrl,
    status: (u.status ?? "ACTIVE").toLowerCase() as "active" | "disabled" | "pending",
    roles: (u.projectRoles ?? []).map((pr: any) => pr.role?.name).filter(Boolean),
    projectAccess: (u.projectRoles ?? []).map((pr: any) => pr.project).filter(Boolean),
    lastLoginAt: null,
    createdAt: u.createdAt,
  }))
}

async function toggleUserStatus(userId: string, newStatus: "active" | "disabled") {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus.toUpperCase() }),
  })
  if (!res.ok) throw new Error("Failed to update user status")
}

async function inviteUser(username: string, projectRoles: { projectId: string; role: string }[]) {
  // The API creates a user by telegramId. Since we only have a username,
  // we create a placeholder user and assign roles per project.
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: "0", // placeholder — real ID comes when user logs in via Telegram
      username,
      firstName: username,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? "Failed to create user")
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchUsers()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleToggleStatus(userId: string, newStatus: "active" | "disabled") {
    await toggleUserStatus(userId, newStatus)
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    )
  }

  async function handleInvite(
    username: string,
    projectRoles: { projectId: string; role: string }[]
  ) {
    await inviteUser(username, projectRoles)
    await loadUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage user accounts, roles, and access across projects.
            </p>
          </div>
        </div>
        <InviteUserDialog projects={PROJECTS} onInvite={handleInvite} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      ) : (
        <UsersTable
          users={users}
          projects={PROJECTS}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  )
}
