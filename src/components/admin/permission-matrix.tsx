"use client";

import { useState, useCallback } from "react";
import {
  Role,
  Permission,
  groupPermissionsByProjectAndResource,
  updateRole,
} from "@/lib/roles-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

interface PermissionMatrixProps {
  roles: Role[];
  allPermissions: Permission[];
  onRoleUpdated?: () => void;
}

export function PermissionMatrix({
  roles,
  allPermissions,
  onRoleUpdated,
}: PermissionMatrixProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const grouped = groupPermissionsByProjectAndResource(allPermissions);

  const hasPermission = useCallback(
    (role: Role, permissionId: string) => {
      return role.permissions.some((p) => p.id === permissionId);
    },
    []
  );

  const togglePermission = useCallback(
    async (role: Role, permission: Permission) => {
      if (role.isSystem) return;

      const currentPermIds = role.permissions.map((p) => p.id);
      const has = currentPermIds.includes(permission.id);
      const newPermIds = has
        ? currentPermIds.filter((id) => id !== permission.id)
        : [...currentPermIds, permission.id];

      setSaving(`${role.id}:${permission.id}`);
      try {
        await updateRole(role.id, { permissionIds: newPermIds });
        onRoleUpdated?.();
      } finally {
        setSaving(null);
      }
    },
    [onRoleUpdated]
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {[...grouped.entries()].map(([projectName, resources]) => (
          <div key={projectName}>
            <h3 className="text-lg font-semibold mb-3">{projectName}</h3>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Resource</TableHead>
                    <TableHead className="w-[80px]">Action</TableHead>
                    {roles.map((role) => (
                      <TableHead key={role.id} className="text-center min-w-[100px]">
                        <div className="flex items-center justify-center gap-1">
                          {role.name}
                          {role.isSystem && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...resources.entries()].map(
                    ([resource, permissions]) =>
                      permissions.map((perm, idx) => (
                        <TableRow key={perm.id}>
                          {idx === 0 && (
                            <TableCell
                              rowSpan={permissions.length}
                              className="font-medium capitalize align-top border-r"
                            >
                              {resource}
                            </TableCell>
                          )}
                          <TableCell className="border-r">
                            <Badge variant="outline" className="text-xs capitalize">
                              {perm.action}
                            </Badge>
                          </TableCell>
                          {roles.map((role) => {
                            const checked = hasPermission(role, perm.id);
                            const isSaving =
                              saving === `${role.id}:${perm.id}`;

                            return (
                              <TableCell
                                key={role.id}
                                className="text-center"
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={checked}
                                        disabled={role.isSystem || isSaving}
                                        onCheckedChange={() =>
                                          togglePermission(role, perm)
                                        }
                                        className={
                                          role.isSystem && checked
                                            ? "opacity-60"
                                            : ""
                                        }
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  {role.isSystem && (
                                    <TooltipContent>
                                      System roles cannot be modified
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
