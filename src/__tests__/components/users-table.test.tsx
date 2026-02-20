import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersTable, AdminUser } from "@/components/admin/users-table";

const mockUsers: AdminUser[] = [
  {
    id: "1",
    name: "Alice Smith",
    username: "alicesmith",
    image: null,
    status: "active",
    roles: ["Admin"],
    projectAccess: ["creative-center", "traffic-center"],
    lastLoginAt: "2026-02-15T10:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Bob Jones",
    username: "bobjones",
    image: null,
    status: "disabled",
    roles: ["Viewer"],
    projectAccess: ["creative-center"],
    lastLoginAt: null,
    createdAt: "2026-01-10T00:00:00Z",
  },
  {
    id: "3",
    name: "Charlie Brown",
    username: null,
    image: null,
    status: "pending",
    roles: [],
    projectAccess: [],
    lastLoginAt: null,
    createdAt: "2026-02-01T00:00:00Z",
  },
];

const mockProjects = [
  { projectId: "creative-center", projectName: "Creative Center" },
  { projectId: "traffic-center", projectName: "Traffic Center" },
];

describe("UsersTable", () => {
  it("renders all users", () => {
    render(<UsersTable users={mockUsers} projects={mockProjects} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
  });

  it("shows user usernames", () => {
    render(<UsersTable users={mockUsers} projects={mockProjects} />);
    expect(screen.getByText("@alicesmith")).toBeInTheDocument();
    expect(screen.getByText("@bobjones")).toBeInTheDocument();
  });

  it("shows dash for users without username", () => {
    render(<UsersTable users={mockUsers} projects={mockProjects} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows user initials as avatar fallbacks", () => {
    render(<UsersTable users={mockUsers} projects={mockProjects} />);
    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(screen.getByText("BJ")).toBeInTheDocument();
    expect(screen.getByText("CB")).toBeInTheDocument();
  });

  it("shows role badges for users with roles", () => {
    render(<UsersTable users={mockUsers} projects={mockProjects} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
  });

  it("shows 'No roles' for users without roles", () => {
    render(<UsersTable users={mockUsers} projects={mockProjects} />);
    expect(screen.getByText("No roles")).toBeInTheDocument();
  });

  it("shows total user count", () => {
    render(<UsersTable users={mockUsers} projects={mockProjects} />);
    expect(screen.getByText("3 users total")).toBeInTheDocument();
  });

  it("shows 'Never' for users who never logged in", () => {
    render(<UsersTable users={mockUsers} projects={mockProjects} />);
    const neverElements = screen.getAllByText("Never");
    expect(neverElements.length).toBe(2);
  });

  it("filters users by search text", async () => {
    const user = userEvent.setup();
    render(<UsersTable users={mockUsers} projects={mockProjects} />);

    const searchInput = screen.getByPlaceholderText("Search by name or username...");
    await user.type(searchInput, "alice");

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie Brown")).not.toBeInTheDocument();
    expect(screen.getByText("1 user total")).toBeInTheDocument();
  });

  it("filters users by username search", async () => {
    const user = userEvent.setup();
    render(<UsersTable users={mockUsers} projects={mockProjects} />);

    const searchInput = screen.getByPlaceholderText("Search by name or username...");
    await user.type(searchInput, "bobjones");

    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("shows empty state when no users match", async () => {
    const user = userEvent.setup();
    render(<UsersTable users={mockUsers} projects={mockProjects} />);

    const searchInput = screen.getByPlaceholderText("Search by name or username...");
    await user.type(searchInput, "nonexistent");

    expect(screen.getByText("No users found.")).toBeInTheDocument();
  });

  it("paginates when users exceed page size", () => {
    const manyUsers: AdminUser[] = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      name: `User ${i}`,
      username: `user${i}`,
      image: null,
      status: "active" as const,
      roles: [],
      projectAccess: [],
      lastLoginAt: null,
      createdAt: "2026-01-01T00:00:00Z",
    }));

    render(<UsersTable users={manyUsers} projects={mockProjects} pageSize={10} />);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("15 users total")).toBeInTheDocument();
  });

  it("navigates between pages", async () => {
    const user = userEvent.setup();
    const manyUsers: AdminUser[] = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      name: `User ${i}`,
      username: `user${i}`,
      image: null,
      status: "active" as const,
      roles: [],
      projectAccess: [],
      lastLoginAt: null,
      createdAt: "2026-01-01T00:00:00Z",
    }));

    render(<UsersTable users={manyUsers} projects={mockProjects} pageSize={10} />);

    const buttons = screen.getAllByRole("button");
    const nextBtn = buttons[buttons.length - 1];
    await user.click(nextBtn);

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });
});
