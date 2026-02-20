"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Role,
  Permission,
  fetchRoles,
  fetchPermissions,
  createRole,
  deleteRole,
} from "@/lib/roles-api";
import { RoleCard } from "@/components/admin/role-card";
import { CreateRoleDialog } from "@/components/admin/create-role-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import Link from "next/link";

export default function RolesListPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleCreate = async (data: {
    name: string;
    description: string;
    permissionIds: string[];
  }) => {
    await createRole(data);
    await loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading roles...</div>
      </div>
    );
  }

  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Roles Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system and custom roles across all projects.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/permissions">Permission Matrix</Link>
          </Button>
          <CreateRoleDialog
            allPermissions={allPermissions}
            onSubmit={handleCreate}
          />
        </div>
      </div>

      {systemRoles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">System Roles</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemRoles.map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Custom Roles</h2>
        {customRoles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No custom roles yet. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role &ldquo;
              {deleteTarget?.name}&rdquo;? This action cannot be undone. Users
              with this role will lose their permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
