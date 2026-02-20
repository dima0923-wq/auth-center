import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectSwitcher } from "@/components/layout/project-switcher";

describe("ProjectSwitcher", () => {
  it("renders all three projects", () => {
    render(<ProjectSwitcher />);
    expect(screen.getByText("Creative Center")).toBeInTheDocument();
    expect(screen.getByText("Traffic Center")).toBeInTheDocument();
    expect(screen.getByText("Retention Center")).toBeInTheDocument();
  });

  it("renders project descriptions", () => {
    render(<ProjectSwitcher />);
    expect(screen.getByText("AI-powered ad creative generation")).toBeInTheDocument();
    expect(screen.getByText("Automated Meta/Facebook ad buying")).toBeInTheDocument();
    expect(screen.getByText("SMS, email & call conversion")).toBeInTheDocument();
  });

  it("shows all projects as accessible by default (no accessibleProjects prop)", () => {
    render(<ProjectSwitcher />);
    // All project cards should be links with href
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(3);
  });

  it("shows 'No Access' badge for inaccessible projects", () => {
    render(<ProjectSwitcher accessibleProjects={["creative"]} />);
    const noAccessBadges = screen.getAllByText("No Access");
    expect(noAccessBadges).toHaveLength(2); // Traffic and Retention
  });

  it("shows role badges when userRoles provided", () => {
    render(
      <ProjectSwitcher
        userRoles={{ creative: "Admin", traffic: "Viewer" }}
      />
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
  });

  it("links to correct project URLs", () => {
    render(<ProjectSwitcher />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("https://ag1.q37fh758g.click");
    expect(hrefs).toContain("https://ag3.q37fh758g.click");
    expect(hrefs).toContain("http://ag2.q37fh758g.click");
  });

  it("opens links in new tab", () => {
    render(<ProjectSwitcher />);
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
    });
  });
});
