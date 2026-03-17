/**
 * Targeted tests for the App component's getGroups effect.
 * Covers lines 502-506 (setGroups success path and catch block).
 */
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Module-level mocks (hoisted by Vitest)                             */
/* ------------------------------------------------------------------ */

vi.mock("./lib/api", () => ({
  API_BASE: "http://localhost:8787/api",
  tournamentsEndpoint: vi.fn(() => null),
  getGroups: vi.fn(() => Promise.resolve([])),
  getAnnouncements: vi.fn(() => Promise.resolve([])),
  getMeta: vi.fn(() =>
    Promise.resolve({ ok: true, last_sync_at: new Date().toISOString() }),
  ),
  getCachedLastSyncAt: vi.fn(() => ""),
  getStandingsRows: vi.fn(() => Promise.resolve([])),
  getFixturesRows: vi.fn(() => Promise.resolve([])),
  getFranchises: vi.fn(() => Promise.resolve([])),
  getAwardsRows: vi.fn(() => Promise.resolve([])),
  getFixturesIcsUrl: vi.fn(() => ""),
  getTournaments: vi.fn(() => Promise.resolve([])),
  refreshAll: vi.fn(),
}));

vi.mock("./context/TournamentContext", () => ({
  TournamentProvider: ({ children }) => children,
  useTournament: vi.fn(() => ({
    activeTournamentId: "tourney-1",
    loading: false,
    activeTournament: null,
    availableTournaments: [],
    setActiveTournamentId: vi.fn(),
  })),
}));

/* ------------------------------------------------------------------ */
/*  Setup window mocks                                                 */
/* ------------------------------------------------------------------ */

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

/* ------------------------------------------------------------------ */
/*  Lazy import after mocks are registered                             */
/* ------------------------------------------------------------------ */

// Dynamic import inside tests to ensure mocks are applied first.
async function renderApp() {
  const { default: App } = await import("./App");
  const { TournamentProvider } = await import("./context/TournamentContext");
  await act(async () => {
    render(
      <BrowserRouter>
        <TournamentProvider>
          <App />
        </TournamentProvider>
      </BrowserRouter>,
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("App groups effect", () => {
  it("calls setGroups when getGroups resolves with data", async () => {
    const { getGroups } = await import("./lib/api");
    vi.mocked(getGroups).mockResolvedValueOnce([
      { id: "U12", label: "U12" },
      { id: "U14", label: "U14" },
    ]);

    window.history.pushState({}, "", "/");
    await renderApp();

    const brand = await screen.findByRole("heading", {
      level: 1,
      name: /Hockey For Juniors/i,
    });
    expect(brand).toBeTruthy();
    expect(getGroups).toHaveBeenCalledWith("tourney-1");
  });

  it("keeps fallback groups and warns when getGroups rejects", async () => {
    const { getGroups } = await import("./lib/api");
    vi.mocked(getGroups).mockRejectedValueOnce(new Error("Network error"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    window.history.pushState({}, "", "/");
    await renderApp();

    const brand = await screen.findByRole("heading", {
      level: 1,
      name: /Hockey For Juniors/i,
    });
    expect(brand).toBeTruthy();
    expect(
      warnSpy.mock.calls.some((args) =>
        String(args[0]).includes("Failed to load groups"),
      ),
    ).toBe(true);

    warnSpy.mockRestore();
  });
});
