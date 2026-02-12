import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeFormErrors } from "./TournamentWizard";

globalThis.fetch = vi.fn();

describe("TournamentWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_API_BASE", "http://localhost:8787/api");
    vi.resetModules();
    fetch.mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/admin/venues")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: [{ name: "Venue A" }] }),
        });
      }
      if (typeof url === "string" && url.includes("/admin/tournament-wizard")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, tournament_id: "hj-test-2026" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
  });

  async function renderWizard() {
    const { default: TournamentWizard } = await import("./TournamentWizard");
    return render(<TournamentWizard />);
  }

  it("renders and navigates between steps", async () => {
    await renderWizard();

    expect(screen.getByText("Tournament Setup Wizard")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Groups/i }));
    expect(screen.getByRole("heading", { name: "Groups" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Teams/i }));
    expect(screen.getByRole("heading", { name: "Teams" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Fixtures/i }));
    expect(screen.getByRole("heading", { name: "Fixtures" })).toBeDefined();
  });

  it("submits a tournament when required fields are present", async () => {
    await renderWizard();

    fireEvent.change(screen.getByPlaceholderText("HJ Indoor 2026"), {
      target: { value: "HJ Indoor 2026" },
    });
    fireEvent.change(screen.getByPlaceholderText("2026"), {
      target: { value: "2026" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11B"), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Teams/i }));
    fireEvent.change(screen.getByRole("combobox", { name: "Group" }), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("PP Amber"), {
      target: { value: "PP Amber" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Pool" }), {
      target: { value: "A" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Tournament/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/tournament-wizard",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  it("generates fixtures for a group", async () => {
    await renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11B"), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Teams/i }));
    fireEvent.change(screen.getByRole("combobox", { name: "Group" }), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("PP Amber"), {
      target: { value: "PP Amber" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Pool" }), {
      target: { value: "A" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Team/i }));
    const teamInputs = screen.getAllByPlaceholderText("PP Amber");
    fireEvent.change(teamInputs[1], { target: { value: "Knights Orange" } });
    const groupCombos = screen.getAllByRole("combobox", { name: "Group" });
    fireEvent.change(groupCombos[1], { target: { value: "U11B" } });
    const poolCombos = screen.getAllByRole("combobox", { name: "Pool" });
    fireEvent.change(poolCombos[1], { target: { value: "A" } });

    fireEvent.click(screen.getByRole("button", { name: /Fixtures/i }));
    const fixtureGroupSelects = screen.getAllByRole("combobox", { name: "Group" });
    fireEvent.change(fixtureGroupSelects[0], { target: { value: "U11B" } });
    fireEvent.change(screen.getAllByLabelText("Date")[0], {
      target: { value: "2026-01-08" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Generate Fixtures/i }));
    await waitFor(() => {
      expect(screen.getAllByLabelText("Team 1").length).toBeGreaterThan(0);
    });
  });

  it("supports imports and auto-assigning pools", async () => {
    await renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11B"), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });
    const poolCountInput = screen.getByRole("spinbutton", { name: "Pool Count" });
    fireEvent.change(poolCountInput, { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /Teams/i }));
    fireEvent.change(screen.getByRole("combobox", { name: "Group" }), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("PP Amber"), {
      target: { value: "PP Amber" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Team/i }));
    const teamInputs = screen.getAllByPlaceholderText("PP Amber");
    fireEvent.change(teamInputs[1], { target: { value: "Knights Orange" } });
    const groupCombos = screen.getAllByRole("combobox", { name: "Group" });
    fireEvent.change(groupCombos[1], { target: { value: "U11B" } });

    const autoAssignButtons = screen.getAllByRole("button", { name: /Auto-assign pools/i });
    fireEvent.click(autoAssignButtons[0]);
    const poolCombos = screen.getAllByRole("combobox", { name: "Pool" });
    expect(poolCombos[0].value).toBe("A");
    expect(poolCombos[1].value).toBe("B");

    const franchiseImportInputs = screen.getAllByPlaceholderText(/Purple Panthers/i);
    fireEvent.change(franchiseImportInputs[0], {
      target: { value: "Purple Panthers\nBlue Cranes" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Import Franchises/i }));
    expect(screen.getAllByPlaceholderText("Purple Panthers").length).toBeGreaterThan(1);
  });

  it("shows generator validation errors when required fields are missing", async () => {
    await renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Fixtures/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generate Fixtures/i }));
    expect(screen.getByText(/Generator requires group, date, and pool/i)).toBeDefined();
  });

  it("handles submit failures with an error message", async () => {
    fetch.mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/admin/venues")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: [] }),
        });
      }
      if (typeof url === "string" && url.includes("/admin/tournament-wizard")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ ok: false, error: "Save failed" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    await renderWizard();
    fireEvent.change(screen.getByPlaceholderText("HJ Indoor 2026"), {
      target: { value: "HJ Indoor 2026" },
    });
    fireEvent.change(screen.getByPlaceholderText("2026"), {
      target: { value: "2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11B"), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Teams/i }));
    fireEvent.change(screen.getByRole("combobox", { name: "Group" }), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("PP Amber"), {
      target: { value: "PP Amber" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Pool" }), {
      target: { value: "A" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Tournament/i }));

    await waitFor(() => {
      expect(screen.getByText(/Save failed/i)).toBeDefined();
    });
  });

  it("computes form errors for invalid inputs", () => {
    const errors = computeFormErrors({
      tournament: { id: "", name: "", season: "" },
      groups: [{ id: "", label: "" }],
      teams: [
        { group_id: "", name: "PP Amber", pool: "" },
        { group_id: "U11B", name: "PP Amber", pool: "" },
      ],
      fixtures: [
        { group_id: "U11B", team1: "PP Amber", team2: "PP Amber", date: "", pool: "" },
        { group_id: "U11B", team1: "PP Amber", team2: "PP Amber", date: "2026-01-01", pool: "A" },
        { group_id: "UNKNOWN", team1: "X", team2: "Y", date: "2026-01-01", pool: "A" },
      ],
    });

    expect(errors).toEqual(expect.arrayContaining([
      "Tournament name is required.",
      "Tournament season is required.",
      "At least one group is required.",
      "All teams must be assigned to a valid group.",
      "Fixtures include an unknown group.",
      "All non-placeholder teams should have a pool.",
      "All fixtures must have a date.",
      "All fixtures must have a pool.",
    ]));

    const duplicateErrors = computeFormErrors({
      tournament: { id: "hj-test", name: "HJ", season: "2026" },
      groups: [{ id: "U11B", label: "U11 Boys" }],
      teams: [
        { group_id: "U11B", name: "PP Amber", pool: "A" },
        { group_id: "U11B", name: "PP Amber", pool: "B" },
      ],
      fixtures: [
        { group_id: "U11B", team1: "PP Amber", team2: "Knights", date: "2026-01-01", pool: "A" },
        { group_id: "U11B", team1: "PP Amber", team2: "Knights", date: "2026-01-01", pool: "A" },
      ],
    });

    expect(duplicateErrors).toEqual(expect.arrayContaining([
      "Duplicate team names found within a group.",
      "Duplicate fixtures found (same teams/date/time/pool).",
    ]));
  });
});
