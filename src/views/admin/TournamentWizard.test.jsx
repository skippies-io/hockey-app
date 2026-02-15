import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeFormErrors } from "./tournamentWizardUtils";

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
          json: () => Promise.resolve({ ok: true, data: [{ name: "Venue A" }, { name: "Venue B" }] }),
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

    fireEvent.click(screen.getByRole("button", { name: /Add Team/i }));
    const teamInputs = screen.getAllByPlaceholderText("PP Amber");
    fireEvent.change(teamInputs[1], { target: { value: "Knights Orange" } });
    const groupCombos = screen.getAllByRole("combobox", { name: "Group" });
    fireEvent.change(groupCombos[1], { target: { value: "U11B" } });

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

  it("updates and removes fixtures", async () => {
    await renderWizard();

    const venuesSection = screen
      .getByRole("heading", { name: "Venues" })
      .closest("section");
    if (!venuesSection) throw new Error("Venues section not found");
    const venuesScope = within(venuesSection);
    await waitFor(() => {
      expect(venuesScope.getAllByRole("option", { name: "Venue A" }).length).toBe(1);
    });
    fireEvent.change(venuesScope.getByRole("combobox"), {
      target: { value: "Venue A" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11B"), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Fixtures/i }));
    const fixtureGroupSelects = screen.getAllByLabelText("Group");
    const fixtureDateInputs = screen.getAllByLabelText("Date");
    const fixtureVenueSelects = screen.getAllByLabelText("Venue");
    const fixturePoolInputs = screen.getAllByLabelText("Pool");
    const fixtureTimeInput = screen.getByLabelText("Time (optional)");
    const fixtureGroupSelect = fixtureGroupSelects[fixtureGroupSelects.length - 1];
    const fixtureDateInput = fixtureDateInputs[fixtureDateInputs.length - 1];
    const fixtureVenueSelect = fixtureVenueSelects[fixtureVenueSelects.length - 1];
    const fixturePoolInput = fixturePoolInputs[fixturePoolInputs.length - 1];
    const fixtureRoundInput = screen.getAllByLabelText("Round")[0];
    const team1Input = screen.getAllByLabelText("Team 1")[0];
    const team2Input = screen.getAllByLabelText("Team 2")[0];

    fireEvent.change(fixtureGroupSelect, { target: { value: "U11B" } });
    fireEvent.change(fixtureDateInput, { target: { value: "2026-01-10" } });
    fireEvent.change(fixtureTimeInput, { target: { value: "09:00" } });
    await waitFor(() => {
      expect(
        fixtureVenueSelect.querySelector('option[value="Venue A"]')
      ).not.toBeNull();
    });
    fireEvent.change(fixtureVenueSelect, { target: { value: "Venue A" } });
    fireEvent.change(fixturePoolInput, { target: { value: "A" } });
    fireEvent.change(fixtureRoundInput, { target: { value: "Round 1" } });
    fireEvent.change(team1Input, { target: { value: "PP Amber" } });
    fireEvent.change(team2Input, { target: { value: "Knights" } });

    await waitFor(() => {
      expect(fixtureGroupSelect.value).toBe("U11B");
      expect(fixtureDateInput.value).toBe("2026-01-10");
      expect(fixtureTimeInput.value).toBe("09:00");
      expect(fixtureVenueSelect.value).toBe("Venue A");
      expect(fixturePoolInput.value).toBe("A");
      expect(fixtureRoundInput.value).toBe("Round 1");
      expect(team1Input.value).toBe("PP Amber");
      expect(team2Input.value).toBe("Knights");
    });

    fireEvent.click(screen.getByRole("button", { name: /Remove Fixture/i }));
    await waitFor(() => {
      expect(
        screen.queryAllByRole("button", { name: /Remove Fixture/i }).length
      ).toBe(0);
    });
  });

  it("manages venues, group venues, and time slots", async () => {
    await renderWizard();

    const venuesSection = screen
      .getByRole("heading", { name: "Venues" })
      .closest("section");
    if (!venuesSection) throw new Error("Venues section not found");
    const venuesScope = within(venuesSection);

    await waitFor(() => {
      expect(venuesScope.getAllByRole("option", { name: "Venue A" }).length).toBe(1);
    });

    fireEvent.change(venuesScope.getByRole("combobox"), {
      target: { value: "Venue A" },
    });

    fireEvent.click(venuesScope.getByRole("button", { name: /Add Venue/i }));
    const venueSelects = venuesScope.getAllByRole("combobox");
    fireEvent.change(venueSelects[1], { target: { value: "Venue B" } });

    fireEvent.click(screen.getByRole("button", { name: /Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11B"), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });

    const groupSection = screen
      .getByRole("heading", { name: "Groups" })
      .closest("section");
    if (!groupSection) throw new Error("Groups section not found");
    const groupScope = within(groupSection);
    fireEvent.click(groupScope.getByLabelText("Venue A"));

    fireEvent.click(screen.getByRole("button", { name: /Fixtures/i }));

    const timeSlotsSection = screen
      .getByRole("heading", { name: "Time Slots" })
      .closest("section");
    if (!timeSlotsSection) throw new Error("Time Slots section not found");
    const timeSlotsScope = within(timeSlotsSection);

    fireEvent.click(timeSlotsScope.getByRole("button", { name: /Add Slot/i }));
    const slotDateInputs = timeSlotsScope.getAllByLabelText("Date");
    const slotTimeInputs = timeSlotsScope.getAllByLabelText("Time");
    const slotVenueSelects = timeSlotsScope.getAllByLabelText("Venue");

    fireEvent.change(slotDateInputs[1], { target: { value: "2026-01-12" } });
    fireEvent.change(slotTimeInputs[1], { target: { value: "10:30" } });
    fireEvent.change(slotVenueSelects[1], { target: { value: "Venue A" } });
    fireEvent.change(timeSlotsScope.getAllByLabelText("Label")[1], {
      target: { value: "Court 2" },
    });

    fireEvent.click(timeSlotsScope.getAllByRole("button", { name: /Remove Slot/i })[1]);
    await waitFor(() => {
      expect(timeSlotsScope.getAllByRole("button", { name: /Remove Slot/i }).length)
        .toBe(1);
    });
  });

  it("supports team imports", async () => {
    await renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11B"), {
      target: { value: "U11B" },
    });
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Teams/i }));
    const teamImportInput = screen.getByRole("textbox", { name: /Bulk Import/i });
    fireEvent.change(teamImportInput, {
      target: { value: "U11B, PP Amber\nU11B, Knights Orange" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Import Teams/i }));
    expect(screen.getAllByPlaceholderText("PP Amber").length).toBeGreaterThan(1);
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
        { group_id: "", name: "PP Amber" },
        { group_id: "U11B", name: "PP Amber" },
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
      "All fixtures must have a date.",
      "All fixtures must have a pool.",
    ]));

    const duplicateErrors = computeFormErrors({
      tournament: { id: "hj-test", name: "HJ", season: "2026" },
      groups: [{ id: "U11B", label: "U11 Boys" }],
      teams: [
        { group_id: "U11B", name: "PP Amber" },
        { group_id: "U11B", name: "PP Amber" },
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
