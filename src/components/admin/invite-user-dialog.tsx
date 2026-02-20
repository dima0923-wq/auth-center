"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus } from "lucide-react"

interface ProjectRoleSelect {
  projectId: string
  projectName: string
  role: string
}

interface InviteUserDialogProps {
  projects: { projectId: string; projectName: string }[]
  onInvite: (username: string, projectRoles: { projectId: string; role: string }[]) => Promise<void>
}

export function InviteUserDialog({ projects, onInvite }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [projectRoles, setProjectRoles] = useState<ProjectRoleSelect[]>(
    projects.map((p) => ({ ...p, role: "none" }))
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/roles")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { name: string }[]) => {
        setAvailableRoles(data.map((r) => r.name))
      })
      .catch(() => {})
  }, [])

  function reset() {
    setUsername("")
    setProjectRoles(projects.map((p) => ({ ...p, role: "none" })))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanUsername = username.trim().replace(/^@/, "")

    if (!cleanUsername) {
      setError("Telegram username is required")
      return
    }

    if (!/^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername)) {
      setError("Enter a valid Telegram username (5-32 characters, letters, numbers, underscores)")
      return
    }

    const assignedRoles = projectRoles
      .filter((pr) => pr.role !== "none")
      .map((pr) => ({ projectId: pr.projectId, role: pr.role }))

    setSending(true)
    try {
      await onInvite(cleanUsername, assignedRoles)
      reset()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Invite a user by their Telegram username with initial project role assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-username">Telegram Username</Label>
              <Input
                id="invite-username"
                type="text"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Project Roles</Label>
              <div className="space-y-2">
                {projectRoles.map((pr) => (
                  <div
                    key={pr.projectId}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <span className="text-sm">{pr.projectName}</span>
                    <Select
                      value={pr.role}
                      onValueChange={(value) =>
                        setProjectRoles((prev) =>
                          prev.map((p) =>
                            p.projectId === pr.projectId ? { ...p, role: value } : p
                          )
                        )
                      }
                    >
                      <SelectTrigger className="w-[130px]" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Access</SelectItem>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
