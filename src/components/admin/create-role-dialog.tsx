"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Permission,
  groupPermissionsByProjectAndResource,
} from "@/lib/roles-api";
import { Plus } from "lucide-react";

interface CreateRoleDialogProps {
  allPermissions: Permission[];
  onSubmit: (data: {
    name: string;
    description: string;
    permissionIds: string[];
  }) => Promise<void>;
}

export function CreateRoleDialog({
  allPermissions,
  onSubmit,
}: CreateRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [submitting, setSubmitting] = useState(false);

  const grouped = groupPermissionsByProjectAndResource(allPermissions);

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

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        permissionIds: [...selectedPermissions],
      });
      setOpen(false);
      setName("");
      setDescription("");
      setSelectedPermissions(new Set());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Define a custom role with specific permissions for each project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Campaign Manager"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this role can do..."
              rows={2}
            />
          </div>

          <div className="space-y-4">
            <Label>Permissions</Label>
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
          >
            {submitting ? "Creating..." : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
