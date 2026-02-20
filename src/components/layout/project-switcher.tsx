"use client"

import { Palette, BarChart3, MessageSquare, ExternalLink, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ProjectConfig {
  id: string
  name: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
}

const projects: ProjectConfig[] = [
  {
    id: "creative",
    name: "Creative Center",
    description: "AI-powered ad creative generation",
    href: "https://ag1.q37fh758g.click",
    icon: <Palette className="size-6" />,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200 hover:border-violet-400",
  },
  {
    id: "traffic",
    name: "Traffic Center",
    description: "Automated Meta/Facebook ad buying",
    href: "https://ag3.q37fh758g.click",
    icon: <BarChart3 className="size-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200 hover:border-blue-400",
  },
  {
    id: "retention",
    name: "Retention Center",
    description: "SMS, email & call conversion",
    href: "http://ag2.q37fh758g.click",
    icon: <MessageSquare className="size-6" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200 hover:border-emerald-400",
  },
]

interface ProjectSwitcherProps {
  userRoles?: Record<string, string>
  accessibleProjects?: string[]
}

export function ProjectSwitcher({
  userRoles = {},
  accessibleProjects,
}: ProjectSwitcherProps) {
  const hasAccess = (projectId: string) =>
    !accessibleProjects || accessibleProjects.includes(projectId)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const accessible = hasAccess(project.id)
        const role = userRoles[project.id]

        return (
          <a
            key={project.id}
            href={accessible ? project.href : undefined}
            target={accessible ? "_blank" : undefined}
            rel={accessible ? "noopener noreferrer" : undefined}
            className={cn(!accessible && "pointer-events-none")}
          >
            <Card
              className={cn(
                "relative cursor-pointer transition-all duration-200",
                accessible
                  ? cn("border-2", project.borderColor, "hover:shadow-md")
                  : "border-2 border-dashed border-muted opacity-50"
              )}
            >
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-xl",
                      accessible ? cn(project.bgColor, project.color) : "bg-muted text-muted-foreground"
                    )}
                  >
                    {accessible ? project.icon : <Lock className="size-6" />}
                  </div>
                  {accessible && (
                    <ExternalLink className="size-4 text-muted-foreground" />
                  )}
                </div>

                <div>
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {role && (
                    <Badge variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  )}
                  {!accessible && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      No Access
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </a>
        )
      })}
    </div>
  )
}
