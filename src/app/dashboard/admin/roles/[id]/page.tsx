"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Role,
  RoleUser,
  Permission,
  fetchRole,
  fetchRoleUsers,
  fetchPermissions,
  updateRole,
  groupPermissionsByProjectAndResource,
} from "@/lib/roles-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Lock, Save, Shield, Users } from "lucide-react";
import Link from "next/link";

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );

  const loadData = useCallback(async () => {
    const [roleData, usersData, permsData] = await Promise.all([
      fetchRole(roleId),
      fetchRoleUsers(roleId),
      fetchPermissions(),
    ]);
    if (!roleData) {
      router.push("/dashboard/admin/roles");
      return;
    }
    setRole(roleData);
    setUsers(usersData);
    setAllPermissions(permsData);
    setEditName(roleData.name);
    setEditDescription(roleData.description);
    setSelectedPermissions(new Set(roleData.permissions.map((p) => p.id)));
    setLoading(false);
  }, [roleId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!role || role.isSystem) return;
    setSaving(true);
    try {
      await updateRole(role.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        permissionIds: [...selectedPermissions],
      });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = useCallback((permId: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }, []);

  const toggleResourceGroup = useCallback(
    (permissions: Permission[]) => {
      const allSelected = permissions.every((p) =>
        selectedPermissions.has(p.id)
      );
      setSelectedPermissions((prev) => {
        const next = new Set(prev);
        for (const p of permissions) {
          if (allSelected) next.delete(p.id);
          else next.add(p.id);
        }
        return next;
      });
    },
    [selectedPermissions]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading role...</div>
      </div>
    );
  }

  if (!role) return null;

  const grouped = groupPermissionsByProjectAndResource(allPermissions);
  const isReadOnly = role.isSystem;
  const hasChanges =
    editName !== role.name ||
    editDescription !== role.description ||
    selectedPermissions.size !== role.permissions.length ||
    ![...selectedPermissions].every((id) =>
      role.permissions.some((p) => p.id === id)
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin/roles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {role.name}
            {isReadOnly && (
              <Badge variant="secondary">
                <Lock className="mr-1 h-3 w-3" />
                System Role
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isReadOnly
              ? "System roles cannot be modified."
              : "Edit role details and permissions."}
          </p>
        </div>
        {!isReadOnly && (
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Role Details */}
          <Card>
            <CardHeader>
              <CardTitle>Role Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={isReadOnly}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Permissions Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                {selectedPermissions.size} of {allPermissions.length} permissions
                selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...grouped.entries()].map(([projectName, resources]) => (
                <div key={projectName} className="rounded-lg border p-3">
                  <h4 className="font-medium text-sm mb-2">{projectName}</h4>
                  <div className="space-y-2">
                    {[...resources.entries()].map(
                      ([resource, permissions]) => {
                        const allChecked = permissions.every((p) =>
                          selectedPermissions.has(p.id)
                        );
                        const someChecked =
                          !allChecked &&
                          permissions.some((p) =>
                            selectedPermissions.has(p.id)
                          );

                        return (
                          <div key={resource} className="ml-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Checkbox
                                checked={
                                  allChecked
                                    ? true
                                    : someChecked
                                      ? "indeterminate"
                                      : false
                                }
                                onCheckedChange={() =>
                                  toggleResourceGroup(permissions)
                                }
                                disabled={isReadOnly}
                              />
                              <span className="text-sm font-medium capitalize">
                                {resource}
                              </span>
                            </div>
                            <div className="ml-6 flex flex-wrap gap-x-4 gap-y-1">
                              {permissions.map((perm) => (
                                <label
                                  key={perm.id}
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selectedPermissions.has(
                                      perm.id
                                    )}
                                    onCheckedChange={() =>
                                      togglePermission(perm.id)
                                    }
                                    disabled={isReadOnly}
                                  />
                                  {perm.action}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Users with this role */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users with this role
              </CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? "user" : "users"} assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users have this role yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.image ?? undefined} />
                              <AvatarFallback className="text-xs">
                                {(user.name ?? user.email)
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">
                                {user.name ?? user.email}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(user.assignedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
