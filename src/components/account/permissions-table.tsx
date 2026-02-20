import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Check, X } from "lucide-react"

interface Permission {
  id: string
  name: string
  description: string
  granted: boolean
}

interface ProjectPermissions {
  projectId: string
  projectName: string
  permissions: Permission[]
}

interface PermissionsTableProps {
  projects: ProjectPermissions[]
}

export function PermissionsTable({ projects }: PermissionsTableProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>You have no project permissions assigned</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {projects.map((project) => (
        <Card key={project.projectId}>
          <CardHeader>
            <CardTitle className="text-base">{project.projectName}</CardTitle>
            <CardDescription>
              {project.permissions.filter((p) => p.granted).length} of{" "}
              {project.permissions.length} permissions granted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.permissions.map((perm) => (
                  <TableRow key={perm.id}>
                    <TableCell className="font-medium">{perm.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {perm.description}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.granted ? (
                        <Badge variant="default" className="gap-1">
                          <Check className="size-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <X className="size-3" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
