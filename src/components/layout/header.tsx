"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home, Settings, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/profile": "Profile",
  "/dashboard/permissions": "My Permissions",
  "/dashboard/admin/users": "User Management",
  "/dashboard/admin/roles": "Role Management",
  "/dashboard/admin/permissions": "Permission Management",
  "/dashboard/projects": "Projects",
}

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const crumbs = segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/")
    const label = pageTitles[path] || segment.charAt(0).toUpperCase() + segment.slice(1)
    const isLast = index === segments.length - 1

    return (
      <span key={path} className="flex items-center gap-1.5">
        <ChevronRight className="size-3.5 text-muted-foreground" />
        {isLast ? (
          <span className="text-sm font-medium text-foreground">{label}</span>
        ) : (
          <Link
            href={path}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </Link>
        )}
      </span>
    )
  })

  return (
    <nav className="flex items-center gap-1.5">
      <Link
        href="/dashboard"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="size-4" />
      </Link>
      {crumbs}
    </nav>
  )
}

export function Header({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null; username?: string | null; firstName?: string | null; photoUrl?: string | null }
}) {
  const pathname = usePathname()
  const title = pageTitles[pathname] || "Dashboard"

  const displayName = user.firstName || user.name || "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"
  const avatarSrc = user.photoUrl || user.image

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-lg font-semibold leading-none lg:text-xl">{title}</h1>
        <Breadcrumbs />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-accent">
            <Avatar size="sm">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              {user.username ? `@${user.username}` : user.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile">
              <Settings className="size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/api/auth/logout">
              <LogOut className="size-4" />
              Sign Out
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
