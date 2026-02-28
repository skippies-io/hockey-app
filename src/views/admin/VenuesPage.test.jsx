import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

globalThis.fetch = vi.fn();
window.confirm = vi.fn(() => true);

describe("VenuesPage", () => {
  const mockVenues = [
    {
      id: "v1",
      name: "Beaulieu College",
      address: "Main Rd",
      location_map_url: "https://maps.example.com/venue",
      website_url: "https://www.beaulieu.example.com",
    },
    {
      id: "v2",
      name: "East Arena",
      address: "",
      location_map_url: "",
      website_url: "",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_API_BASE", "http://localhost:8787/api");
    vi.resetModules();
    fetch.mockImplementation((url, options = {}) => {
      const method = options.method || "GET";
      if (typeof url === "string" && url.includes("/admin/venues") && method === "GET") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockVenues }) });
      }
      if (typeof url === "string" && url.includes("/admin/venues") && method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockVenues[0] }) });
      }
      if (typeof url === "string" && url.includes("/admin/venues/") && method === "PUT") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockVenues[0] }) });
      }
      if (typeof url === "string" && url.includes("/admin/venues/") && method === "DELETE") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, deleted: "v1" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
  });

  async function renderPage() {
    const { default: VenuesPage } = await import("./VenuesPage");
    return render(<VenuesPage />);
  }

  it("renders venues from the API", async () => {
    await renderPage();
    expect(screen.getByText(/loading/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Beaulieu College")).toBeDefined();
    });

    expect(screen.getByText("maps.example.com")).toBeDefined();
    expect(screen.getByText("beaulieu.example.com")).toBeDefined();
  });

  it("shows validation error when name missing", async () => {
    await renderPage();
    await waitFor(() => screen.getByRole("button", { name: /add venue/i }));

    fireEvent.click(screen.getByRole("button", { name: /add venue/i }));

    expect(screen.getByText(/venue name is required/i)).toBeDefined();
  });

  it("creates a venue", async () => {
    await renderPage();
    await waitFor(() => screen.getByLabelText(/^name$/i));

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "New Venue" } });
    fireEvent.click(screen.getByRole("button", { name: /add venue/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/venues",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("edits and deletes a venue", async () => {
    await renderPage();
    await waitFor(() => screen.getByText("Beaulieu College"));

    fireEvent.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    fireEvent.change(screen.getAllByDisplayValue("Beaulieu College")[0], {
      target: { value: "Beaulieu Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/venues/v1",
        expect.objectContaining({ method: "PUT" })
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/venues/v1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
