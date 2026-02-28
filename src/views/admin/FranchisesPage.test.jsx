import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

globalThis.fetch = vi.fn();
window.confirm = vi.fn(() => true);

describe("FranchisesPage", () => {
  const mockTournaments = [{ id: "t1", name: "Tournament 1" }];
  const mockFranchises = [
    { id: "f1", tournament_id: "t1", name: "Purple Panthers", contact_email: "" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_API_BASE", "http://localhost:8787/api");
    vi.resetModules();
    fetch.mockImplementation((url, options = {}) => {
      const method = options.method || "GET";
      if (typeof url === "string" && url.includes("/tournaments")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockTournaments }) });
      }
      if (typeof url === "string" && url.includes("/admin/franchises") && method === "GET") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockFranchises }) });
      }
      if (typeof url === "string" && url.includes("/admin/franchises") && method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockFranchises[0] }) });
      }
      if (typeof url === "string" && url.includes("/admin/franchises/") && method === "PUT") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockFranchises[0] }) });
      }
      if (typeof url === "string" && url.includes("/admin/franchises/") && method === "DELETE") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, deleted: "f1" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
  });

  async function renderPage() {
    const { default: FranchisesPage } = await import("./FranchisesPage");
    return render(<FranchisesPage />);
  }

  it("renders franchises list", async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText("Purple Panthers")).toBeDefined();
    });
  });

  it("creates a franchise", async () => {
    await renderPage();
    await waitFor(() => screen.getByLabelText(/^name$/i));
    await waitFor(() => {
      expect(screen.getByLabelText("Tournament").value).toBe("t1");
    });

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "New Franchise" } });
    fireEvent.click(screen.getByRole("button", { name: /add franchise/i }));

    await waitFor(() => {
      const calls = fetch.mock.calls.filter((call) => {
        const url = call[0];
        const options = call[1];
        return (
          typeof url === "string" &&
          url.includes("/admin/franchises") &&
          options &&
          options.method === "POST"
        );
      });
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it("edits and deletes a franchise", async () => {
    await renderPage();
    await waitFor(() => screen.getByText("Purple Panthers"));
    await waitFor(() => {
      expect(screen.getByLabelText("Tournament").value).toBe("t1");
    });

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByDisplayValue("Purple Panthers"), {
      target: { value: "Purple Panthers Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/franchises/f1?tournamentId=t1",
        expect.objectContaining({ method: "PUT" })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/franchises/f1?tournamentId=t1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("shows validation error when name missing", async () => {
    await renderPage();
    await waitFor(() => screen.getByRole("button", { name: /add franchise/i }));
    await waitFor(() => {
      expect(screen.getByLabelText("Tournament").value).toBe("t1");
    });

    fireEvent.click(screen.getByRole("button", { name: /add franchise/i }));

    expect(screen.getByText(/franchise name is required/i)).toBeDefined();
  });
});
