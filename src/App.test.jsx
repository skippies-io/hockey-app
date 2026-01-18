import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
});
