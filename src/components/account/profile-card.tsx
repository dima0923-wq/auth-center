"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { User, AtSign, Calendar, Shield, Pencil, Check, X, Send } from "lucide-react"
import { useState } from "react"

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

interface ProfileCardProps {
  user: UserProfile
  onUpdateName?: (name: string) => Promise<void>
}

export function ProfileCard({ user, onUpdateName }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [saving, setSaving] = useState(false)

  const initials = user.firstName
    ? user.firstName[0]?.toUpperCase() + (user.lastName?.[0]?.toUpperCase() || "")
    : user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

  const statusVariant = {
    active: "default" as const,
    disabled: "destructive" as const,
    pending: "secondary" as const,
  }

  async function handleSave() {
    if (!onUpdateName || editName.trim() === user.name) {
      setIsEditing(false)
      return
    }
    setSaving(true)
    try {
      await onUpdateName(editName.trim())
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditName(user.name)
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your personal information and account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-16">
            {user.photoUrl && <AvatarImage src={user.photoUrl} alt={user.name} />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 max-w-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave()
                    if (e.key === "Escape") handleCancel()
                  }}
                />
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{user.name}</h3>
                {onUpdateName && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                )}
              </div>
            )}
            {user.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
          </div>
          <Badge variant={statusVariant[user.status]}>
            {user.status}
          </Badge>
        </div>

        <Separator />

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
              <User className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Account Status</p>
              <p className="text-sm font-medium capitalize">{user.status}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-muted">
              <Calendar className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="text-sm font-medium">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
