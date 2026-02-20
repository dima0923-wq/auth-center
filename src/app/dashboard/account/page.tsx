"use client"

import { ProfileCard } from "@/components/account/profile-card"
import { ProjectAccessCard } from "@/components/account/project-access-card"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState } from "react"

interface UserProfile {
  id: string
  name: string
  firstName: string
  lastName?: string | null
  username?: string | null
  photoUrl?: string | null
  status: "active" | "disabled" | "pending"
  createdAt: string
  telegramConnected: boolean
}

interface ProjectAccess {
  projectId: string
  projectName: string
  projectUrl: string
  roles: string[]
  hasAccess: boolean
}

const MOCK_USER: UserProfile = {
  id: "1",
  name: "Loading...",
  firstName: "Loading...",
  username: null,
  photoUrl: null,
  status: "active",
  createdAt: new Date().toISOString(),
  telegramConnected: true,
}

// Known projects — used as base list, enriched with user's actual roles
const PROJECT_META: Record<string, { name: string; url: string }> = {
  creative_center: { name: "Creative Center", url: "https://ag1.q37fh758g.click" },
  traffic_center: { name: "Traffic Center", url: "https://ag3.q37fh758g.click" },
  retention_center: { name: "Retention Center", url: "http://ag2.q37fh758g.click" },
}

function buildProjectAccess(projectRoles?: { project: string; role: { name: string } }[]): ProjectAccess[] {
  const rolesByProject: Record<string, string[]> = {}
  if (projectRoles) {
    for (const pr of projectRoles) {
      if (!rolesByProject[pr.project]) rolesByProject[pr.project] = []
      rolesByProject[pr.project].push(pr.role.name)
    }
  }

  return Object.entries(PROJECT_META).map(([projectId, meta]) => ({
    projectId,
    projectName: meta.name,
    projectUrl: meta.url,
    roles: rolesByProject[projectId] ?? [],
    hasAccess: !!rolesByProject[projectId],
  }))
}

export default function AccountPage() {
  const [user, setUser] = useState<UserProfile>(MOCK_USER)
  const [projects, setProjects] = useState<ProjectAccess[]>(buildProjectAccess())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/users/me")
        if (res.ok) {
          const data = await res.json()
          setUser({
            id: data.id,
            name: [data.firstName, data.lastName].filter(Boolean).join(" ") || "Unknown",
            firstName: data.firstName ?? "Unknown",
            lastName: data.lastName ?? null,
            username: data.username ?? null,
            photoUrl: data.photoUrl ?? null,
            status: data.status?.toLowerCase() ?? "active",
            createdAt: data.createdAt ?? new Date().toISOString(),
            telegramConnected: !!data.telegramId,
          })
          // projectRoles comes from /api/users/me response
          if (data.projectRoles) {
            setProjects(buildProjectAccess(data.projectRoles))
          }
        }
      } catch {
        // API not available yet
      }

      setLoading(false)
    }

    fetchProfile()
  }, [])

  async function handleUpdateName(name: string) {
    // PUT /api/users/me expects firstName (and optionally lastName)
    const parts = name.trim().split(/\s+/)
    const firstName = parts[0] || name
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null

    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    })
    if (res.ok) {
      setUser((prev) => ({ ...prev, name, firstName, lastName }))
    } else {
      throw new Error("Failed to update name")
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground">
          Manage your profile and view project access
        </p>
      </div>

      <ProfileCard
        user={loading ? MOCK_USER : user}
        onUpdateName={handleUpdateName}
      />

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Project Access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectAccessCard key={project.projectId} project={project} />
          ))}
        </div>
      </div>
    </div>
  )
}
