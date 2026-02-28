import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

globalThis.fetch = vi.fn();
window.confirm = vi.fn(() => true);

describe("GroupsPage", () => {
  const mockGroups = [{ id: "U11B", label: "U11 Boys", format: "Round-robin" }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_API_BASE", "http://localhost:8787/api");
    vi.resetModules();
    fetch.mockImplementation((url, options = {}) => {
      const method = options.method || "GET";
      if (typeof url === "string" && url.includes("/admin/groups") && method === "GET") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockGroups }) });
      }
      if (typeof url === "string" && url.includes("/admin/groups") && method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockGroups[0] }) });
      }
      if (typeof url === "string" && url.includes("/admin/groups/") && method === "PUT") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockGroups[0] }) });
      }
      if (typeof url === "string" && url.includes("/admin/groups/") && method === "DELETE") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, deleted: "U11B" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
  });

  async function renderPage() {
    const { default: GroupsPage } = await import("./GroupsPage");
    return render(<GroupsPage />);
  }

  it("renders group list", async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText("U11 Boys")).toBeDefined();
    });
  });

  it("creates a group", async () => {
    await renderPage();
    await waitFor(() => screen.getByLabelText(/group id/i));

    fireEvent.change(screen.getByLabelText(/group id/i), { target: { value: "U12B" } });
    fireEvent.change(screen.getByLabelText(/^label$/i), { target: { value: "U12 Boys" } });
    fireEvent.click(screen.getByRole("button", { name: /add group/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/groups",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("edits and deletes a group", async () => {
    await renderPage();
    await waitFor(() => screen.getByText("U11 Boys"));

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByDisplayValue("U11 Boys"), { target: { value: "U11 Girls" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/groups/U11B",
        expect.objectContaining({ method: "PUT" })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/groups/U11B",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("shows validation error when required fields missing", async () => {
    await renderPage();
    await waitFor(() => screen.getByRole("button", { name: /add group/i }));

    fireEvent.click(screen.getByRole("button", { name: /add group/i }));

    expect(screen.getByText(/group id and label are required/i)).toBeDefined();
  });
});
