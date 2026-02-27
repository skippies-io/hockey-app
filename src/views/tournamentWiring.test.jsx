import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import Fixtures from "./Fixtures";
import Standings from "./Standings";
import Franchises from "./Franchises";
import Team from "./Team";
import TeamProfile from "./TeamProfile";

const apiMocks = vi.hoisted(() => ({
  getFixturesRows: vi.fn(),
  getStandingsRows: vi.fn(),
  getFranchises: vi.fn(),
}));

const tournamentMocks = vi.hoisted(() => ({
  useTournament: vi.fn(),
}));

vi.mock("../lib/api", () => apiMocks);
vi.mock("../context/TournamentContext", () => ({
  useTournament: () => tournamentMocks.useTournament(),
}));

function renderWithRouter(ui, { route = "/", path = "*" } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  tournamentMocks.useTournament.mockReset();
  apiMocks.getFixturesRows.mockReset();
  apiMocks.getStandingsRows.mockReset();
  apiMocks.getFranchises.mockReset();

  tournamentMocks.useTournament.mockReturnValue({
    activeTournament: { id: "t-123" },
  });
  apiMocks.getFixturesRows.mockResolvedValue([]);
  apiMocks.getStandingsRows.mockResolvedValue([]);
  apiMocks.getFranchises.mockResolvedValue([]);

  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe("tournament wiring", () => {
  it("Fixtures passes tournamentId", async () => {
    renderWithRouter(
      <Fixtures ageId="U9" ageGroups={[{ id: "U9", label: "U9" }]} />
    );

    await waitFor(() =>
      expect(apiMocks.getFixturesRows).toHaveBeenCalledWith("t-123", "U9")
    );
  });

  it("Standings passes tournamentId", async () => {
    renderWithRouter(
      <Standings
        ageId="U9"
        ageLabel="U9"
        ageGroups={[{ id: "U9", label: "U9" }]}
      />
    );

    await waitFor(() =>
      expect(apiMocks.getStandingsRows).toHaveBeenCalledWith("t-123", "U9")
    );
  });

  it("Franchises passes tournamentId", async () => {
    renderWithRouter(<Franchises />);

    await waitFor(() =>
      expect(apiMocks.getFranchises).toHaveBeenCalledWith("t-123")
    );
  });

  it("Team passes tournamentId", async () => {
    renderWithRouter(<Team ageId="U9" ageLabel="U9" />);

    await waitFor(() =>
      expect(apiMocks.getStandingsRows).toHaveBeenCalledWith("t-123", "U9")
    );
  });

  it("TeamProfile passes tournamentId", async () => {
    renderWithRouter(<TeamProfile />, {
      route: "/U9/teams/Alpha",
      path: "/:ageId/teams/:teamId",
    });

    await waitFor(() =>
      expect(apiMocks.getFixturesRows).toHaveBeenCalledWith("t-123", "U9")
    );
  });

  it("Skips API calls when tournamentId is missing", async () => {
    tournamentMocks.useTournament.mockReturnValue({ activeTournament: null });
    apiMocks.getFixturesRows.mockClear();
    apiMocks.getStandingsRows.mockClear();
    apiMocks.getFranchises.mockClear();

    renderWithRouter(
      <Fixtures ageId="U9" ageGroups={[{ id: "U9", label: "U9" }]} />
    );

    renderWithRouter(
      <Standings
        ageId="U9"
        ageLabel="U9"
        ageGroups={[{ id: "U9", label: "U9" }]}
      />
    );

    renderWithRouter(<Franchises />);
    renderWithRouter(<Team ageId="U9" ageLabel="U9" />);
    renderWithRouter(<TeamProfile />, {
      route: "/U9/teams/Alpha",
      path: "/:ageId/teams/:teamId",
    });

    await waitFor(() => {
      expect(apiMocks.getFixturesRows).not.toHaveBeenCalled();
      expect(apiMocks.getStandingsRows).not.toHaveBeenCalled();
      expect(apiMocks.getFranchises).not.toHaveBeenCalled();
    });
  });

  it("Fixtures shows error state when API fails", async () => {
    apiMocks.getFixturesRows.mockRejectedValueOnce(new Error("Boom"));

    const { findByText } = renderWithRouter(
      <Fixtures ageId="U9" ageGroups={[{ id: "U9", label: "U9" }]} />
    );

    expect(await findByText(/Error:/i)).toBeTruthy();
  });
});
