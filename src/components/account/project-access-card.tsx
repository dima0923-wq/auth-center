import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

interface ProjectAccess {
  projectId: string
  projectName: string
  projectUrl: string
  roles: string[]
  hasAccess: boolean
}

interface ProjectAccessCardProps {
  project: ProjectAccess
}

const projectColors: Record<string, string> = {
  "creative-center": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "traffic-center": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "retention-center": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
}

export function ProjectAccessCard({ project }: ProjectAccessCardProps) {
  const colorClass = projectColors[project.projectId] ?? "bg-muted text-muted-foreground"

  return (
    <Card className={!project.hasAccess ? "opacity-60" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{project.projectName}</CardTitle>
          {project.hasAccess ? (
            <a
              href={project.projectUrl}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Open
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <Badge variant="outline" className="text-xs">
              No Access
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {project.hasAccess && project.roles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {project.roles.map((role) => (
              <span
                key={role}
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}`}
              >
                {role}
              </span>
            ))}
          </div>
        ) : project.hasAccess ? (
          <p className="text-xs text-muted-foreground">No roles assigned</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Contact an administrator to request access
          </p>
        )}
      </CardContent>
    </Card>
  )
}
