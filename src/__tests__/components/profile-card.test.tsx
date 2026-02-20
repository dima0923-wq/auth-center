import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileCard } from "@/components/account/profile-card";

const mockUser = {
  id: "1",
  name: "John Doe",
  firstName: "John",
  lastName: "Doe",
  username: "johndoe",
  photoUrl: null,
  status: "active" as const,
  createdAt: "2026-01-15T00:00:00Z",
  telegramConnected: true,
};

describe("ProfileCard", () => {
  it("renders user name and username", () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    const usernameElements = screen.getAllByText("@johndoe");
    expect(usernameElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders profile title", () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("shows user initials as avatar fallback", () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows active status badge", () => {
    render(<ProfileCard user={mockUser} />);
    const badges = screen.getAllByText("active");
    expect(badges.length).toBeGreaterThanOrEqual(1);
    const badge = badges.find((el) => el.getAttribute("data-slot") === "badge");
    expect(badge).toBeInTheDocument();
  });

  it("shows Telegram as connected", () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows Telegram as not connected when false", () => {
    render(<ProfileCard user={{ ...mockUser, telegramConnected: false }} />);
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  });

  it("shows Telegram username in info section", () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText("Telegram Username")).toBeInTheDocument();
    const usernameElements = screen.getAllByText("@johndoe");
    expect(usernameElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows edit button when onUpdateName is provided", () => {
    render(<ProfileCard user={mockUser} onUpdateName={vi.fn()} />);
    const editButtons = screen.getAllByRole("button");
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it("enters edit mode and saves name", async () => {
    const user = userEvent.setup();
    const onUpdateName = vi.fn().mockResolvedValue(undefined);

    render(<ProfileCard user={mockUser} onUpdateName={onUpdateName} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("John Doe");

    await user.clear(input);
    await user.type(input, "Jane Doe");

    const saveButtons = screen.getAllByRole("button");
    await user.click(saveButtons[0]);

    expect(onUpdateName).toHaveBeenCalledWith("Jane Doe");
  });

  it("cancels edit and reverts name", async () => {
    const user = userEvent.setup();
    render(<ProfileCard user={mockUser} onUpdateName={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "New Name");

    const editButtons = screen.getAllByRole("button");
    await user.click(editButtons[1]);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("formats member since date", () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText("January 15, 2026")).toBeInTheDocument();
  });
});
