import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Overview from "./Overview";

// useNavigate must be a let so beforeEach can reset it (vi.mock is hoisted)
let mockNavigate;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const tournamentMocks = vi.hoisted(() => ({ useTournament: vi.fn() }));
vi.mock("../context/TournamentContext", () => ({
  useTournament: () => tournamentMocks.useTournament(),
}));

function renderOverview(props = {}) {
  return render(
    <MemoryRouter>
      <Overview {...props} />
    </MemoryRouter>
  );
}

describe("Overview view", () => {
  beforeEach(() => {
    mockNavigate = vi.fn();
    tournamentMocks.useTournament.mockReturnValue({
      activeTournament: { id: "t-1", name: "Test Cup 2025" },
    });
  });

  it("renders tournament name from context", () => {
    renderOverview();
    expect(screen.getByText("Test Cup 2025")).toBeTruthy();
  });

  it('falls back to "HJ All Stars" when activeTournament is null', () => {
    tournamentMocks.useTournament.mockReturnValue({ activeTournament: null });
    renderOverview();
    expect(screen.getByText("HJ All Stars")).toBeTruthy();
  });

  it("renders Overview Dashboard subtitle", () => {
    renderOverview();
    expect(screen.getByText("Overview Dashboard")).toBeTruthy();
  });

  it("renders welcome text referencing tournament name", () => {
    renderOverview();
    expect(screen.getByText(/Welcome to the official hub for Test Cup 2025/)).toBeTruthy();
  });

  it("View Fixtures button navigates to first group fixtures", () => {
    renderOverview({ groups: [{ id: "U12", label: "U12" }] });
    fireEvent.click(screen.getByRole("button", { name: /view fixtures/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/U12/fixtures");
  });

  it("View Standings button navigates to first group standings", () => {
    renderOverview({ groups: [{ id: "U12", label: "U12" }] });
    fireEvent.click(screen.getByRole("button", { name: /view standings/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/U12/standings");
  });

  it("defaults to U9M when groups is empty", () => {
    renderOverview({ groups: [] });
    fireEvent.click(screen.getByRole("button", { name: /view fixtures/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/U9M/fixtures");
  });

  it("defaults to U9M when groups is omitted", () => {
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: /view standings/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/U9M/standings");
  });

  it("Clubs card navigates to /franchises on click", () => {
    renderOverview();
    // The div[role=button] containing "Clubs" heading
    fireEvent.click(screen.getByRole("button", { name: /clubs/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/franchises");
  });

  it("Teams card navigates to /{defaultAgeId}/teams on click", () => {
    renderOverview({ groups: [{ id: "U10", label: "U10" }] });
    fireEvent.click(screen.getByRole("button", { name: /^teams/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/U10/teams");
  });

  it("Feedback card navigates to /feedback on click", () => {
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: /feedback/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/feedback");
  });

  it("Clubs card responds to Enter keydown", () => {
    renderOverview();
    const clubsCard = screen.getByRole("button", { name: /clubs/i });
    fireEvent.keyDown(clubsCard, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/franchises");
  });

  it("Clubs card responds to Space keydown", () => {
    renderOverview();
    const clubsCard = screen.getByRole("button", { name: /clubs/i });
    fireEvent.keyDown(clubsCard, { key: " " });
    expect(mockNavigate).toHaveBeenCalledWith("/franchises");
  });

  it("Teams card responds to Enter keydown", () => {
    renderOverview({ groups: [{ id: "U10", label: "U10" }] });
    const teamsCard = screen.getByRole("button", { name: /^teams/i });
    fireEvent.keyDown(teamsCard, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/U10/teams");
  });

  it("Feedback card responds to Enter keydown", () => {
    renderOverview();
    const feedbackCard = screen.getByRole("button", { name: /feedback/i });
    fireEvent.keyDown(feedbackCard, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/feedback");
  });

  it("ignores non-Enter/Space keydown on Clubs card", () => {
    renderOverview();
    const clubsCard = screen.getByRole("button", { name: /clubs/i });
    fireEvent.keyDown(clubsCard, { key: "Tab" });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("renders Explore section heading", () => {
    renderOverview();
    expect(screen.getByText("Explore")).toBeTruthy();
  });
});
