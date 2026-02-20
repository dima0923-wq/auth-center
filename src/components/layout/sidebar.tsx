"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Shield,
  User,
  KeyRound,
  Users,
  Crown,
  Lock,
  Palette,
  BarChart3,
  MessageSquare,
  ChevronLeft,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  external?: boolean
}

const accountNav: NavItem[] = [
  { label: "Profile", href: "/dashboard/account", icon: <User className="size-4" /> },
  { label: "Permissions", href: "/dashboard/account/permissions", icon: <KeyRound className="size-4" /> },
]

const adminNav: NavItem[] = [
  { label: "Users", href: "/dashboard/admin/users", icon: <Users className="size-4" /> },
  { label: "Roles", href: "/dashboard/admin/roles", icon: <Crown className="size-4" /> },
  { label: "Permissions", href: "/dashboard/admin/permissions", icon: <Lock className="size-4" /> },
]

const projectNav: NavItem[] = [
  {
    label: "Creative Center",
    href: "https://ag1.q37fh758g.click",
    icon: <Palette className="size-4 text-violet-500" />,
    external: true,
  },
  {
    label: "Traffic Center",
    href: "https://ag3.q37fh758g.click",
    icon: <BarChart3 className="size-4 text-blue-500" />,
    external: true,
  },
  {
    label: "Retention Center",
    href: "http://ag2.q37fh758g.click",
    icon: <MessageSquare className="size-4 text-emerald-500" />,
    external: true,
  },
]

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const isActive = !item.external && pathname === item.href

  const Component = item.external ? "a" : Link
  const extraProps = item.external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {}

  return (
    <Component
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
      {...extraProps}
    >
      {item.icon}
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.external && <ExternalLink className="size-3 text-muted-foreground" />}
        </>
      )}
    </Component>
  )
}

function NavSection({
  title,
  items,
  collapsed,
}: {
  title: string
  items: NavItem[]
  collapsed: boolean
}) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink key={item.href} item={item} collapsed={collapsed} />
      ))}
    </div>
  )
}

function SidebarContent({
  collapsed,
  onToggle,
  user,
}: {
  collapsed: boolean
  onToggle?: () => void
  user: { name?: string | null; email?: string | null; image?: string | null; isAdmin?: boolean; username?: string | null; firstName?: string | null; photoUrl?: string | null }
}) {
  const displayName = user.firstName || user.name || "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"
  const avatarSrc = user.photoUrl || user.image

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-2")}>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="size-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between">
            <span className="text-lg font-bold tracking-tight">Auth Center</span>
            {onToggle && (
              <button
                onClick={onToggle}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
          </div>
        )}
        {collapsed && onToggle && (
          <button
            onClick={onToggle}
            className="absolute right-2 top-5 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Menu className="size-4" />
          </button>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <NavSection title="My Account" items={accountNav} collapsed={collapsed} />
        {user.isAdmin && (
          <NavSection title="Admin" items={adminNav} collapsed={collapsed} />
        )}
        <NavSection title="Projects" items={projectNav} collapsed={collapsed} />
      </nav>

      <Separator />

      {/* User */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                collapsed && "justify-center px-2"
              )}
            >
              <Avatar size="sm">
                {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left">
                  <p className="truncate font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.username ? `@${user.username}` : user.email}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/account">
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
      </div>
    </div>
  )
}

export function Sidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null; isAdmin?: boolean; username?: string | null; firstName?: string | null; photoUrl?: string | null }
}) {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen border-r bg-sidebar transition-all duration-300 lg:flex lg:flex-col",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          user={user}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="fixed left-4 top-4 z-40 rounded-md border bg-background p-2 shadow-sm lg:hidden">
            <Menu className="size-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent collapsed={false} user={user} />
        </SheetContent>
      </Sheet>
    </>
  )
}
