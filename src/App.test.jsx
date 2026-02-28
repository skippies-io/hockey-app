import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { TournamentProvider } from "./context/TournamentContext";

/* -----------------------------
   Global mocks
------------------------------ */

globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  }),
);

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
Object.defineProperty(window, "localStorage", { value: localStorageMock });

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

/* -----------------------------
   Helper
------------------------------ */

function renderApp() {
  return render(
    <BrowserRouter>
      <TournamentProvider>
        <App />
      </TournamentProvider>
    </BrowserRouter>,
  );
}

/* -----------------------------
   Tests
------------------------------ */

describe("App Smoke Test", () => {
  let consoleLogSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("renders without crashing", async () => {
    renderApp();

    const brand = await screen.findByRole("heading", {
      level: 1,
      name: /Hockey For Juniors/i,
    });
    expect(brand).toBeTruthy();
  });

  it("renders franchises route", async () => {
    window.history.pushState({}, "Franchises", "/franchises");

    renderApp();

    const heading = await screen.findByText(/Franchise Directory/i);
    expect(heading).toBeTruthy();
  });

  it("renders fixtures route", async () => {
    window.history.pushState({}, "Fixtures", "/U12/fixtures");

    renderApp();

    // Should render the Fixtures component, check for some text it contains
    const heading = await screen.findByText(/Fixtures/i);
    expect(heading).toBeTruthy();
  });

  it("renders standings route", async () => {
    window.history.pushState({}, "Standings", "/U12/standings");

    renderApp();

    const heading = await screen.findByText(/Standings/i);
    expect(heading).toBeTruthy();
  });

  it("renders teams route", async () => {
    window.history.pushState({}, "Teams", "/U12/teams");

    renderApp();

    const heading = await screen.findByText(/Teams/i);
    expect(heading).toBeTruthy();
  });});
