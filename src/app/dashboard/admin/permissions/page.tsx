"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Role,
  Permission,
  fetchRoles,
  fetchPermissions,
} from "@/lib/roles-api";
import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Grid3X3 } from "lucide-react";
import Link from "next/link";

export default function PermissionsMatrixPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [rolesData, permsData] = await Promise.all([
      fetchRoles(),
      fetchPermissions(),
    ]);
    setRoles(rolesData);
    setAllPermissions(permsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading permissions...</div>
      </div>
    );
  }

  const projects = [...new Set(allPermissions.map((p) => p.projectName))];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin/roles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3X3 className="h-6 w-6" />
            Permission Matrix
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage permissions across all roles and projects. System
            role permissions are read-only.
          </p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Projects</TabsTrigger>
          {projects.map((project) => (
            <TabsTrigger key={project} value={project}>
              {project}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <PermissionMatrix
            roles={roles}
            allPermissions={allPermissions}
            onRoleUpdated={loadData}
          />
        </TabsContent>

        {projects.map((project) => (
          <TabsContent key={project} value={project} className="mt-4">
            <PermissionMatrix
              roles={roles}
              allPermissions={allPermissions.filter(
                (p) => p.projectName === project
              )}
              onRoleUpdated={loadData}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
