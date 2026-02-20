import { Badge } from "@/components/ui/badge"

type UserStatus = "active" | "disabled" | "pending"

const statusConfig: Record<UserStatus, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  active: { label: "Active", variant: "default" },
  disabled: { label: "Disabled", variant: "destructive" },
  pending: { label: "Pending", variant: "secondary" },
}

interface UserStatusBadgeProps {
  status: UserStatus
  className?: string
}

export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
