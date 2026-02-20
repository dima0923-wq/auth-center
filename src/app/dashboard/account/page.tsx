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

const PROJECTS: ProjectAccess[] = [
  {
    projectId: "creative-center",
    projectName: "Creative Center",
    projectUrl: "https://ag1.q37fh758g.click",
    roles: [],
    hasAccess: false,
  },
  {
    projectId: "traffic-center",
    projectName: "Traffic Center",
    projectUrl: "https://ag3.q37fh758g.click",
    roles: [],
    hasAccess: false,
  },
  {
    projectId: "retention-center",
    projectName: "Retention Center",
    projectUrl: "http://ag2.q37fh758g.click",
    roles: [],
    hasAccess: false,
  },
]

export default function AccountPage() {
  const [user, setUser] = useState<UserProfile>(MOCK_USER)
  const [projects, setProjects] = useState<ProjectAccess[]>(PROJECTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/users/me")
        if (res.ok) {
          const data = await res.json()
          setUser({
            id: data.id,
            name: [data.firstName, data.lastName].filter(Boolean).join(" ") || data.name || "Unknown",
            firstName: data.firstName ?? "Unknown",
            lastName: data.lastName ?? null,
            username: data.username ?? null,
            photoUrl: data.photoUrl ?? data.image ?? null,
            status: data.status?.toLowerCase() ?? "active",
            createdAt: data.createdAt ?? new Date().toISOString(),
            telegramConnected: !!data.telegramId,
          })
        }
      } catch {
        // API not available yet
      }

      try {
        const res = await fetch("/api/users/me/projects")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setProjects(data)
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
    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setUser((prev) => ({ ...prev, name }))
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
