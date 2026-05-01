import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Overview from "./Overview";

let mockNavigate;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const tournamentMocks = vi.hoisted(() => ({ useTournament: vi.fn() }));
vi.mock("../context/TournamentContext", () => ({
  useTournament: () => tournamentMocks.useTournament(),
}));

const apiMocks = vi.hoisted(() => ({ getFixturesRows: vi.fn() }));
vi.mock("../lib/api", () => ({
  getFixturesRows: (...args) => apiMocks.getFixturesRows(...args),
}));

// Date helpers matching parseDateToUTCms format ("D MMM YYYY")
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const utcLabel = (d) => `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const TODAY_LABEL = utcLabel(new Date());
const TOMORROW_LABEL = utcLabel(new Date(Date.now() + 86400000));

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
      activeTournamentId: "t-1",
    });
    apiMocks.getFixturesRows.mockResolvedValue([]);
  });

  it("renders tournament name from context", async () => {
    renderOverview();
    expect(screen.getByText("Test Cup 2025")).toBeTruthy();
  });

  it('falls back to "HJ All Stars" when activeTournament is null', async () => {
    tournamentMocks.useTournament.mockReturnValue({ activeTournament: null, activeTournamentId: null });
    renderOverview();
    expect(screen.getByText("HJ All Stars")).toBeTruthy();
  });

  it("shows loading skeleton while fetching", () => {
    apiMocks.getFixturesRows.mockReturnValue(new Promise(() => {}));
    renderOverview();
    expect(screen.getByLabelText("Loading match statistics")).toBeTruthy();
  });

  it("shows no fixtures today message when empty", async () => {
    apiMocks.getFixturesRows.mockResolvedValue([]);
    renderOverview();
    await waitFor(() => expect(screen.getByText("No fixtures today")).toBeTruthy());
  });

  it("shows live count badge when fixtures are live", async () => {
    apiMocks.getFixturesRows.mockResolvedValue([
      { Status: "live", Date: TODAY_LABEL, Team1: "A", Team2: "B" },
      { Status: "live", Date: TODAY_LABEL, Team1: "C", Team2: "D" },
    ]);
    renderOverview();
    await waitFor(() => expect(screen.getByText(/2 Live/)).toBeTruthy());
  });

  it("shows today fixture count", async () => {
    apiMocks.getFixturesRows.mockResolvedValue([
      { Status: "", Date: TODAY_LABEL, Team1: "A", Team2: "B" },
      { Status: "", Date: TODAY_LABEL, Team1: "C", Team2: "D" },
      { Status: "", Date: TOMORROW_LABEL, Team1: "E", Team2: "F" },
    ]);
    renderOverview();
    await waitFor(() => expect(screen.getByText("2 today")).toBeTruthy());
  });

  it("shows next fixture team names", async () => {
    apiMocks.getFixturesRows.mockResolvedValue([
      { Status: "", Date: TODAY_LABEL, Time: "10:00", Team1: "Lions", Team2: "Tigers", Score1: "" },
    ]);
    renderOverview();
    await waitFor(() => {
      expect(screen.getByText(/Lions vs Tigers/)).toBeTruthy();
    });
  });

  it("shows next fixture time when available", async () => {
    apiMocks.getFixturesRows.mockResolvedValue([
      { Status: "", Date: TODAY_LABEL, Time: "14:30", Team1: "A", Team2: "B", Score1: "" },
    ]);
    renderOverview();
    await waitFor(() => expect(screen.getByText("14:30")).toBeTruthy());
  });

  it("does not show live badge when no live fixtures", async () => {
    apiMocks.getFixturesRows.mockResolvedValue([
      { Status: "", Date: TODAY_LABEL, Team1: "A", Team2: "B" },
    ]);
    renderOverview();
    await waitFor(() => expect(screen.queryByText(/Live/)).toBeNull());
  });

  it("shows pool count from groups prop", async () => {
    renderOverview({ groups: [{ id: "U12" }, { id: "U14" }, { id: "U16" }] });
    await waitFor(() => expect(screen.getByText("3 pools")).toBeTruthy());
  });

  it("skips fixture with Score1 set when finding next", async () => {
    apiMocks.getFixturesRows.mockResolvedValue([
      { Status: "final", Date: TODAY_LABEL, Time: "09:00", Team1: "Old", Team2: "News", Score1: "3" },
      { Status: "", Date: TODAY_LABEL, Time: "11:00", Team1: "Next", Team2: "Up", Score1: "" },
    ]);
    renderOverview();
    await waitFor(() => expect(screen.queryByText(/Old vs News/)).toBeNull());
    await waitFor(() => expect(screen.getByText(/Next vs Up/)).toBeTruthy());
  });

  it("renders Explore section heading", async () => {
    renderOverview();
    expect(screen.getByText("Explore")).toBeTruthy();
  });

  it("renders explore card icons", async () => {
    renderOverview();
    const icons = document.querySelectorAll(".overview-explore-icon");
    expect(icons.length).toBe(4);
  });

  it("Teams card description shows group count", async () => {
    renderOverview({ groups: [{ id: "U10" }, { id: "U12" }] });
    await waitFor(() => expect(screen.getByText("2 age groups")).toBeTruthy());
  });

  it("Teams card description is singular for one group", async () => {
    renderOverview({ groups: [{ id: "U10" }] });
    await waitFor(() => expect(screen.getByText("1 age group")).toBeTruthy());
  });

  it("Clubs card navigates to /franchises on click", async () => {
    renderOverview();
    fireEvent.click(screen.getByRole("link", { name: /clubs/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/franchises");
  });

  it("Tournaments card navigates to /tournaments on click", async () => {
    renderOverview();
    fireEvent.click(screen.getByRole("link", { name: /tournaments/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/tournaments");
  });

  it("Teams card navigates to /{defaultAgeId}/teams on click", async () => {
    renderOverview({ groups: [{ id: "U10", label: "U10" }] });
    fireEvent.click(screen.getByRole("link", { name: /^teams/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/U10/teams");
  });

  it("Teams card defaults to U9M when groups empty", async () => {
    renderOverview({ groups: [] });
    fireEvent.click(screen.getByRole("link", { name: /^teams/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/U9M/teams");
  });

  it("Feedback card navigates to /feedback on click", async () => {
    renderOverview();
    fireEvent.click(screen.getByRole("link", { name: /feedback/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/feedback");
  });

  it("explore card responds to Enter keydown", async () => {
    renderOverview();
    const clubsCard = screen.getByRole("link", { name: /clubs/i });
    fireEvent.keyDown(clubsCard, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/franchises");
  });

  it("explore card responds to Space keydown", async () => {
    renderOverview();
    const clubsCard = screen.getByRole("link", { name: /clubs/i });
    fireEvent.keyDown(clubsCard, { key: " " });
    expect(mockNavigate).toHaveBeenCalledWith("/franchises");
  });

  it("explore card ignores other keys", async () => {
    renderOverview();
    const clubsCard = screen.getByRole("link", { name: /clubs/i });
    fireEvent.keyDown(clubsCard, { key: "Tab" });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does not fetch fixtures when no activeTournamentId", async () => {
    tournamentMocks.useTournament.mockReturnValue({
      activeTournament: null,
      activeTournamentId: null,
    });
    renderOverview();
    await waitFor(() => expect(apiMocks.getFixturesRows).not.toHaveBeenCalled());
  });

  it("handles API error gracefully without crashing", async () => {
    apiMocks.getFixturesRows.mockRejectedValue(new Error("Network error"));
    renderOverview();
    await waitFor(() => expect(screen.getByText("No fixtures today")).toBeTruthy());
  });
});
