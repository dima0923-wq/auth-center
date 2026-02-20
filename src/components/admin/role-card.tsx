"use client";

import { Role } from "@/lib/roles-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, Pencil, Trash2, Lock } from "lucide-react";
import Link from "next/link";

interface RoleCardProps {
  role: Role;
  onDelete?: (role: Role) => void;
}

export function RoleCard({ role, onDelete }: RoleCardProps) {
  const uniqueProjects = new Set(role.permissions.map((p) => p.projectName));

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{role.name}</CardTitle>
            {role.isSystem && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="mr-1 h-3 w-3" />
                System
              </Badge>
            )}
          </div>
          {!role.isSystem && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/dashboard/admin/roles/${role.id}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete?.(role)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
        <CardDescription>{role.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>{role.permissions.length} permissions</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              {role.userCount} {role.userCount === 1 ? "user" : "users"}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[...uniqueProjects].map((project) => (
            <Badge key={project} variant="outline" className="text-xs">
              {project}
            </Badge>
          ))}
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/dashboard/admin/roles/${role.id}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
