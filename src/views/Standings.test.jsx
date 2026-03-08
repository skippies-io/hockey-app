import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Standings from "./Standings";

// --- mocks ---
const apiMocks = vi.hoisted(() => ({ getStandingsRows: vi.fn() }));
const tournamentMocks = vi.hoisted(() => ({ useTournament: vi.fn() }));

vi.mock("../lib/api", () => apiMocks);
vi.mock("../context/TournamentContext", () => ({
  useTournament: () => tournamentMocks.useTournament(),
}));

function setupMatchMedia(matches = false) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderStandings(props, { route = "/", path = "*" } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={<Standings {...props} />} />
      </Routes>
    </MemoryRouter>
  );
}

const DEFAULT_PROPS = {
  ageId: "U12",
  ageLabel: "U12 Boys",
  format: "ROUND_ROBIN",
  poolsMeta: [],
  ageGroups: [{ id: "U12", label: "U12 Boys" }],
};

// Sample standings rows (no Pool = single-pool round robin)
const SAMPLE_ROWS = [
  { Team: "Alpha FC", Points: "9", GP: "3", W: "3", D: "0", L: "0", GF: "7", GA: "2", GD: "5" },
  { Team: "Beta United", Points: "6", GP: "3", W: "2", D: "0", L: "1", GF: "5", GA: "3", GD: "2" },
  { Team: "Gamma Rovers", Points: "0", GP: "3", W: "0", D: "0", L: "3", GF: "1", GA: "8", GD: "-7" },
];

// Sample rows with pool assignment
const POOL_ROWS = [
  { Team: "Alpha FC", Points: "9", GP: "3", W: "3", D: "0", L: "0", GF: "7", GA: "2", GD: "5", Pool: "A" },
  { Team: "Beta United", Points: "6", GP: "3", W: "2", D: "0", L: "1", GF: "5", GA: "3", GD: "2", Pool: "A" },
  { Team: "Gamma Rovers", Points: "3", GP: "3", W: "1", D: "0", L: "2", GF: "3", GA: "5", GD: "-2", Pool: "B" },
  { Team: "Delta Stars", Points: "0", GP: "3", W: "0", D: "0", L: "3", GF: "1", GA: "8", GD: "-7", Pool: "B" },
];

beforeEach(() => {
  tournamentMocks.useTournament.mockReset();
  apiMocks.getStandingsRows.mockReset();
  tournamentMocks.useTournament.mockReturnValue({ activeTournament: { id: "t-1" } });
  apiMocks.getStandingsRows.mockResolvedValue([]);
  setupMatchMedia(false);
  localStorage.clear();
});

// ── Loading / error / empty states ────────────────────────────────────────────

describe("Standings – loading state", () => {
  it("shows loading text while fetching", () => {
    apiMocks.getStandingsRows.mockReturnValue(new Promise(() => {})); // never resolves
    renderStandings(DEFAULT_PROPS);
    expect(screen.getByText(/loading standings/i)).toBeTruthy();
  });
});

describe("Standings – error state", () => {
  it("shows error message when API rejects", async () => {
    apiMocks.getStandingsRows.mockRejectedValue(new Error("Server down"));
    renderStandings(DEFAULT_PROPS);
    expect(await screen.findByText(/Error: Server down/i)).toBeTruthy();
  });
});

describe("Standings – empty state", () => {
  it("shows empty message when API returns no rows", async () => {
    apiMocks.getStandingsRows.mockResolvedValue([]);
    renderStandings(DEFAULT_PROPS);
    expect(
      await screen.findByText(/No standings available yet for this age group/i)
    ).toBeTruthy();
  });

  it("shows empty message and skips API when no tournamentId", async () => {
    tournamentMocks.useTournament.mockReturnValue({ activeTournament: null });
    renderStandings(DEFAULT_PROPS);
    await waitFor(() => expect(apiMocks.getStandingsRows).not.toHaveBeenCalled());
    expect(
      await screen.findByText(/No standings available yet for this age group/i)
    ).toBeTruthy();
  });
});

// ── Data rendering (desktop) ──────────────────────────────────────────────────

describe("Standings – data rendering (desktop)", () => {
  it("renders all team names from API data", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    renderStandings(DEFAULT_PROPS);
    expect(await screen.findByText("Alpha FC")).toBeTruthy();
    expect(screen.getByText("Beta United")).toBeTruthy();
    expect(screen.getByText("Gamma Rovers")).toBeTruthy();
  });

  it("renders heading with age label", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    renderStandings(DEFAULT_PROPS);
    expect(await screen.findByText(/U12 Boys — Standings/i)).toBeTruthy();
  });

  it("renders follow buttons for each team", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    renderStandings(DEFAULT_PROPS);
    await waitFor(() => screen.getByText("Alpha FC"));
    const followBtns = screen.getAllByRole("button", { name: /follow team/i });
    expect(followBtns.length).toBe(SAMPLE_ROWS.length);
  });

  it("toggling a follow button changes its aria-label to Unfollow team", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    renderStandings(DEFAULT_PROPS);
    await waitFor(() => screen.getByText("Alpha FC"));
    const followBtns = screen.getAllByRole("button", { name: /follow team/i });
    fireEvent.click(followBtns[0]);
    expect(
      (await screen.findAllByRole("button", { name: /unfollow team/i })).length
    ).toBeGreaterThan(0);
  });

  it("renders negative GD correctly", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    renderStandings(DEFAULT_PROPS);
    await waitFor(() => screen.getByText("Gamma Rovers"));
    // GD column value -7 should appear
    expect(screen.getByText("-7")).toBeTruthy();
  });

  it("renders rows with pool labels when Pool column is present", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(POOL_ROWS);
    renderStandings({ ...DEFAULT_PROPS, format: "POOL_STAGES", poolsMeta: ["A", "B"] });
    await waitFor(() => screen.getByText("Alpha FC"));
    expect(screen.getByText("Pool A")).toBeTruthy();
    expect(screen.getByText("Pool B")).toBeTruthy();
  });
});

// ── Mobile card layout ─────────────────────────────────────────────────────────

describe("Standings – mobile card layout", () => {
  beforeEach(() => setupMatchMedia(true)); // (max-width: 640px) matches

  it("renders mobile section wrapper for team data", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    const { container } = renderStandings(DEFAULT_PROPS);
    await waitFor(() => screen.getByText("Alpha FC"));
    expect(container.querySelector(".standings-mobile-section")).not.toBeNull();
  });

  it("renders team names in mobile layout", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    renderStandings(DEFAULT_PROPS);
    expect(await screen.findByText("Alpha FC")).toBeTruthy();
    expect(screen.getByText("Beta United")).toBeTruthy();
  });

  it("renders follow buttons in mobile layout", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    renderStandings(DEFAULT_PROPS);
    await waitFor(() => screen.getByText("Alpha FC"));
    expect(screen.getAllByRole("button", { name: /follow team/i }).length).toBeGreaterThan(0);
  });

  it("shows GD pill with positive prefix for positive GD", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    renderStandings(DEFAULT_PROPS);
    await waitFor(() => screen.getByText("Alpha FC"));
    expect(screen.getByText("GD +5")).toBeTruthy();
  });

  it("shows GD pill without prefix for negative GD", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    renderStandings(DEFAULT_PROPS);
    await waitFor(() => screen.getByText("Gamma Rovers"));
    expect(screen.getByText("GD -7")).toBeTruthy();
  });
});

// ── Follow filter: following-empty message ─────────────────────────────────────

describe("Standings – following filter", () => {
  it("shows following-empty message when filter active but no followed teams match", async () => {
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    localStorage.setItem("hj_show_followed_standings_v1", "true");
    renderStandings(DEFAULT_PROPS);
    expect(
      await screen.findByText(/No standings for your followed teams yet/i)
    ).toBeTruthy();
  });
});

// ── All-ages mode ─────────────────────────────────────────────────────────────

describe("Standings – all-ages mode", () => {
  const ALL_AGES_PROPS = {
    ageId: "all",
    ageLabel: "All Ages",
    format: "ROUND_ROBIN",
    poolsMeta: [],
    ageGroups: [
      { id: "U9", label: "U9 Mixed" },
      { id: "U12", label: "U12 Boys" },
    ],
  };

  it("fetches standings for each age group", async () => {
    apiMocks.getStandingsRows
      .mockResolvedValueOnce([
        { Team: "U9 Alpha", Points: "3", GP: "1", W: "1", D: "0", L: "0", GF: "2", GA: "0", GD: "2" },
      ])
      .mockResolvedValueOnce([
        { Team: "U12 Beta", Points: "3", GP: "1", W: "1", D: "0", L: "0", GF: "1", GA: "0", GD: "1" },
      ]);

    renderStandings(ALL_AGES_PROPS, { route: "/all/standings", path: "/:ageId/standings" });

    expect(await screen.findByText("U9 Alpha")).toBeTruthy();
    expect(screen.getByText("U12 Beta")).toBeTruthy();
  });

  it("renders age-labelled section headings for all-ages mode", async () => {
    apiMocks.getStandingsRows
      .mockResolvedValueOnce([
        { Team: "U9 Alpha", Points: "3", GP: "1", W: "1", D: "0", L: "0", GF: "2", GA: "0", GD: "2" },
      ])
      .mockResolvedValueOnce([
        { Team: "U12 Beta", Points: "3", GP: "1", W: "1", D: "0", L: "0", GF: "1", GA: "0", GD: "1" },
      ]);

    renderStandings(ALL_AGES_PROPS, { route: "/all/standings", path: "/:ageId/standings" });

    expect(await screen.findByText(/U9 Mixed — Standings/i)).toBeTruthy();
    expect(screen.getByText(/U12 Boys — Standings/i)).toBeTruthy();
  });

  it("shows empty message when all-ages returns no data", async () => {
    apiMocks.getStandingsRows.mockResolvedValue([]);
    renderStandings(ALL_AGES_PROPS, { route: "/all/standings", path: "/:ageId/standings" });
    // Early empty-state guard always shows "age group" text
    expect(
      await screen.findByText(/No standings available yet for this age group/i)
    ).toBeTruthy();
  });

  it("calls getStandingsRows once per age group", async () => {
    apiMocks.getStandingsRows.mockResolvedValue([]);
    renderStandings(ALL_AGES_PROPS, { route: "/all/standings", path: "/:ageId/standings" });
    await waitFor(() =>
      expect(apiMocks.getStandingsRows).toHaveBeenCalledTimes(2)
    );
    expect(apiMocks.getStandingsRows).toHaveBeenCalledWith("t-1", "U9");
    expect(apiMocks.getStandingsRows).toHaveBeenCalledWith("t-1", "U12");
  });
});

// ── Pool filter (POOL_STAGES) ─────────────────────────────────────────────────

describe("Standings – sortStandings helper (covered via render)", () => {
  it("sorts teams by points descending", async () => {
    // Alpha has 9pts, Beta 6pts, Gamma 0pts — after sort Alpha should be first
    apiMocks.getStandingsRows.mockResolvedValue(SAMPLE_ROWS);
    const { container } = renderStandings(DEFAULT_PROPS);
    await waitFor(() => screen.getByText("Alpha FC"));
    const rows = container.querySelectorAll(".stand-row");
    // First row should contain Alpha FC (highest points)
    expect(rows[0].textContent).toContain("Alpha FC");
  });

  it("sorts teams by GD when points are tied", async () => {
    const tiedRows = [
      { Team: "Same A", Points: "6", GP: "3", W: "2", D: "0", L: "1", GF: "5", GA: "2", GD: "3" },
      { Team: "Same B", Points: "6", GP: "3", W: "2", D: "0", L: "1", GF: "4", GA: "2", GD: "2" },
    ];
    apiMocks.getStandingsRows.mockResolvedValue(tiedRows);
    const { container } = renderStandings(DEFAULT_PROPS);
    await waitFor(() => screen.getByText("Same A"));
    const rows = container.querySelectorAll(".stand-row");
    expect(rows[0].textContent).toContain("Same A");
  });
});
