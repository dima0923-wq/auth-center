import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";

const adminUser = {
  name: "Admin User",
  email: null,
  image: null,
  isAdmin: true,
  username: "adminuser",
  firstName: "Admin",
  photoUrl: null,
};

const regularUser = {
  name: "Regular User",
  email: null,
  image: null,
  isAdmin: false,
  username: "regularuser",
  firstName: "Regular",
  photoUrl: null,
};

describe("Sidebar", () => {
  it("renders Auth Center branding", () => {
    render(<Sidebar user={adminUser} />);
    expect(screen.getAllByText("Auth Center").length).toBeGreaterThan(0);
  });

  it("renders account navigation links", () => {
    render(<Sidebar user={adminUser} />);
    expect(screen.getAllByText("Profile").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Permissions").length).toBeGreaterThan(0);
  });

  it("shows admin section for admin users", () => {
    render(<Sidebar user={adminUser} />);
    expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Roles").length).toBeGreaterThan(0);
  });

  it("hides admin section for non-admin users", () => {
    render(<Sidebar user={regularUser} />);
    // Admin nav items should not appear (Users, Roles as nav links)
    // Note: "Users" in admin nav has href /dashboard/admin/users
    const links = screen.getAllByRole("link");
    const adminLinks = links.filter(
      (link) => link.getAttribute("href")?.includes("/admin/")
    );
    expect(adminLinks).toHaveLength(0);
  });

  it("renders project navigation links", () => {
    render(<Sidebar user={adminUser} />);
    expect(screen.getAllByText("Creative Center").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Traffic Center").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Retention Center").length).toBeGreaterThan(0);
  });

  it("renders project links as external (target _blank)", () => {
    render(<Sidebar user={adminUser} />);
    const externalLinks = screen.getAllByRole("link").filter(
      (link) => link.getAttribute("target") === "_blank"
    );
    expect(externalLinks.length).toBeGreaterThanOrEqual(3);
  });

  it("shows user initials in avatar", () => {
    render(<Sidebar user={adminUser} />);
    // firstName is "Admin" (single word), so initials = "A"
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
  });

  it("shows user name and username", () => {
    render(<Sidebar user={adminUser} />);
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("@adminuser").length).toBeGreaterThan(0);
  });
});
