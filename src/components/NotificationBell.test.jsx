import { it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationBell from "./NotificationBell";

const DISMISSED_KEY = "hj_dismissed_announcements";

const ANNOUNCEMENTS = [
  { id: "a1", title: "Field change", body: "Game moved to pitch 2", severity: "info" },
  { id: "a2", title: "Cancelled", body: "U12B game cancelled", severity: "alert" },
];

beforeEach(() => {
  localStorage.removeItem(DISMISSED_KEY);
});

it("renders nothing when announcements is empty", () => {
  const { container } = render(<NotificationBell announcements={[]} />);
  expect(container.firstChild).toBeNull();
});

it("renders bell button with aria-label", () => {
  render(<NotificationBell announcements={ANNOUNCEMENTS} />);
  expect(screen.getByRole("button", { name: /notifications/i })).toBeTruthy();
});

it("shows unread badge count in aria-label", () => {
  render(<NotificationBell announcements={ANNOUNCEMENTS} />);
  const btn = screen.getByRole("button", { name: /2 unread/i });
  expect(btn).toBeTruthy();
});

it("panel is not visible before click", () => {
  render(<NotificationBell announcements={ANNOUNCEMENTS} />);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("opens panel on button click", () => {
  render(<NotificationBell announcements={ANNOUNCEMENTS} />);
  fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
  expect(screen.getByRole("dialog", { name: /notifications/i })).toBeTruthy();
});

it("shows all announcement titles in panel", () => {
  render(<NotificationBell announcements={ANNOUNCEMENTS} />);
  fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
  expect(screen.getByText("Field change")).toBeTruthy();
  expect(screen.getByText("Cancelled")).toBeTruthy();
});

it("closes panel on Escape key", () => {
  render(<NotificationBell announcements={ANNOUNCEMENTS} />);
  fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("dismiss button removes item from unread and updates badge", () => {
  render(<NotificationBell announcements={ANNOUNCEMENTS} />);
  fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

  const dismissBtn = screen.getByRole("button", { name: /dismiss: field change/i });
  fireEvent.click(dismissBtn);

  // unread count should now be 1
  expect(screen.getByRole("button", { name: /1 unread/i })).toBeTruthy();
  // dismiss button for that item should be gone
  expect(screen.queryByRole("button", { name: /dismiss: field change/i })).toBeNull();
});

it("dismissed items are still shown but dimmed", () => {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(["a1"]));
  render(<NotificationBell announcements={ANNOUNCEMENTS} />);
  fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

  // Title still present
  expect(screen.getByText("Field change")).toBeTruthy();
  // Dismiss button not shown for already-dismissed item
  expect(screen.queryByRole("button", { name: /dismiss: field change/i })).toBeNull();
});

it("toggles panel closed on second click", () => {
  render(<NotificationBell announcements={ANNOUNCEMENTS} />);
  const bell = screen.getByRole("button", { name: /notifications/i });
  fireEvent.click(bell);
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.click(bell);
  expect(screen.queryByRole("dialog")).toBeNull();
});
