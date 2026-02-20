import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { Role, Permission, updateRole } from "@/lib/roles-api";

const mockPermissions: Permission[] = [
  {
    id: "p1",
    key: "creative-center:campaigns:view",
    name: "View campaigns",
    description: "Can view campaigns",
    resource: "campaigns",
    action: "view",
    projectId: "creative-center",
    projectName: "Creative Center",
  },
  {
    id: "p2",
    key: "creative-center:campaigns:create",
    name: "Create campaigns",
    description: "Can create campaigns",
    resource: "campaigns",
    action: "create",
    projectId: "creative-center",
    projectName: "Creative Center",
  },
  {
    id: "p3",
    key: "traffic-center:reports:view",
    name: "View reports",
    description: "Can view reports",
    resource: "reports",
    action: "view",
    projectId: "traffic-center",
    projectName: "Traffic Center",
  },
];

const mockRoles: Role[] = [
  {
    id: "r1",
    name: "Admin",
    description: "Full access",
    isSystem: true,
    permissions: mockPermissions,
    userCount: 2,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "r2",
    name: "Editor",
    description: "Can edit",
    isSystem: false,
    permissions: [mockPermissions[0]], // Only has view campaigns
    userCount: 3,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

describe("PermissionMatrix", () => {
  it("renders project names as section headers", () => {
    render(
      <PermissionMatrix roles={mockRoles} allPermissions={mockPermissions} />
    );
    expect(screen.getByText("Creative Center")).toBeInTheDocument();
    expect(screen.getByText("Traffic Center")).toBeInTheDocument();
  });

  it("renders role names as column headers", () => {
    render(
      <PermissionMatrix roles={mockRoles} allPermissions={mockPermissions} />
    );
    // Role names appear once per project section
    expect(screen.getAllByText("Admin").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Editor").length).toBeGreaterThanOrEqual(1);
  });

  it("renders resource names", () => {
    render(
      <PermissionMatrix roles={mockRoles} allPermissions={mockPermissions} />
    );
    expect(screen.getByText("campaigns")).toBeInTheDocument();
    expect(screen.getByText("reports")).toBeInTheDocument();
  });

  it("renders action badges", () => {
    render(
      <PermissionMatrix roles={mockRoles} allPermissions={mockPermissions} />
    );
    expect(screen.getAllByText("view").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("create")).toBeInTheDocument();
  });

  it("renders checkboxes for each role-permission pair", () => {
    render(
      <PermissionMatrix roles={mockRoles} allPermissions={mockPermissions} />
    );
    // 3 permissions x 2 roles = 6 checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(6);
  });

  it("disables checkboxes for system roles", () => {
    render(
      <PermissionMatrix roles={mockRoles} allPermissions={mockPermissions} />
    );
    const checkboxes = screen.getAllByRole("checkbox");
    // Admin is system role, so first checkbox of each row should be disabled
    // Checkboxes alternate: Admin, Editor for each permission
    expect(checkboxes[0]).toBeDisabled(); // Admin - p1
    expect(checkboxes[1]).not.toBeDisabled(); // Editor - p1
  });

  it("shows lock icon for system roles", () => {
    render(
      <PermissionMatrix roles={mockRoles} allPermissions={mockPermissions} />
    );
    // Lock icon should be present for system role Admin
    const locks = document.querySelectorAll(".lucide-lock");
    expect(locks.length).toBeGreaterThan(0);
  });

  it("calls updateRole when toggling a non-system role permission", async () => {
    const user = userEvent.setup();
    const onRoleUpdated = vi.fn();
    vi.mocked(updateRole).mockResolvedValue(mockRoles[1]);

    render(
      <PermissionMatrix
        roles={mockRoles}
        allPermissions={mockPermissions}
        onRoleUpdated={onRoleUpdated}
      />
    );

    // Click the Editor checkbox for "create campaigns" (p2) which Editor doesn't have
    const checkboxes = screen.getAllByRole("checkbox");
    // Index 3 = Editor's checkbox for p2 (create campaigns)
    await user.click(checkboxes[3]);

    expect(updateRole).toHaveBeenCalledWith("r2", {
      permissionIds: ["p1", "p2"], // existing p1 + newly added p2
    });
  });
});
