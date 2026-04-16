import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeFormErrors } from "./tournamentWizardUtils";

globalThis.fetch = vi.fn();

describe("TournamentWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_API_BASE", "http://localhost:8787/api");
    vi.resetModules();
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem("hj_admin_session_token", "sess");
    localStorage.setItem("hj_admin_session_expires_at", "2099-01-01T00:00:00.000Z");
    fetch.mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/admin/venues")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: [{ name: "Venue A" }] }),
        });
      }
      if (typeof url === "string" && url.includes("/admin/franchises")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: [{ id: "f1", name: "Gryphons" }] }),
        });
      }
      if (typeof url === "string" && url.includes("/admin/divisions")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: ["U11 Boys", "U11 Girls", "U13 Boys"] }),
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
    let result;
    await act(async () => {
      result = render(<MemoryRouter><TournamentWizard /></MemoryRouter>);
    });
    return result;
  }

  it("renders and navigates between steps", async () => {
    await renderWizard();

    expect(screen.getByText("Tournament Setup Wizard")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /^2\s*Groups & Pools/i }));
    expect(screen.getByRole("heading", { name: "Groups" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /^3\s*Teams & Fixtures/i }));
    expect(screen.getByRole("heading", { name: "Teams" })).toBeDefined();
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

    fireEvent.click(screen.getByRole("button", { name: /^2\s*Groups & Pools/i }));
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^3\s*Teams & Fixtures/i }));

    const teamsSection = screen.getByRole("heading", { name: "Teams" }).closest("section");
    if (!teamsSection) throw new Error("Teams section not found");
    const teamsScope = within(teamsSection);

    fireEvent.change(teamsScope.getByRole("combobox", { name: "Team Group" }), {
      target: { value: "U11B" },
    });
    fireEvent.change(teamsScope.getByPlaceholderText("PP Amber"), {
      target: { value: "PP Amber" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Review →$/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Confirm & Create/i })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Create/i }));

    await waitFor(() => {
      const call = fetch.mock.calls.find(
        ([url, options]) =>
          url === "http://localhost:8787/api/admin/tournament-wizard" &&
          options?.method === "POST"
      );
      expect(call).toBeDefined();
      const [, options] = call;
      expect(options.headers.get("Content-Type")).toBe("application/json");
      expect(options.headers.get("Authorization")).toBe("Bearer sess");
    });
  });

  it("generates fixtures for a group", async () => {
    await renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /^2\s*Groups & Pools/i }));
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^3\s*Teams & Fixtures/i }));

    const teamsSection = screen.getByRole("heading", { name: "Teams" }).closest("section");
    if (!teamsSection) throw new Error("Teams section not found");
    const teamsScope = within(teamsSection);

    fireEvent.change(teamsScope.getByRole("combobox", { name: "Team Group" }), {
      target: { value: "U11B" },
    });
    fireEvent.change(teamsScope.getByPlaceholderText("PP Amber"), {
      target: { value: "PP Amber" },
    });

    fireEvent.click(teamsScope.getByRole("button", { name: /Add Team/i }));
    const teamInputs = teamsScope.getAllByPlaceholderText("PP Amber");
    fireEvent.change(teamInputs[1], { target: { value: "Knights Orange" } });

    const teamGroupCombos = teamsScope.getAllByRole("combobox", { name: "Team Group" });
    fireEvent.change(teamGroupCombos[1], { target: { value: "U11B" } });

    const fixturesSection = screen.getByRole("heading", { name: "Fixtures" }).closest("section");
    if (!fixturesSection) throw new Error("Fixtures section not found");
    const fixturesScope = within(fixturesSection);

    fireEvent.change(fixturesScope.getByRole("combobox", { name: "Generator Group" }), {
      target: { value: "U11B" },
    });
    fireEvent.change(fixturesScope.getAllByLabelText("Date")[0], {
      target: { value: "2026-01-08" },
    });

    fireEvent.click(fixturesScope.getByRole("button", { name: /Generate Fixtures/i }));
    await waitFor(() => {
      expect(fixturesScope.getAllByLabelText("Team 1").length).toBeGreaterThan(0);
    });
  });

  it("updates and removes fixtures", async () => {
    await renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /^2\s*Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^3\s*Teams & Fixtures/i }));

    const fixturesSection = screen.getByRole("heading", { name: "Fixtures" }).closest("section");
    if (!fixturesSection) throw new Error("Fixtures section not found");
    const fixturesScope = within(fixturesSection);

    const fixtureGroupSelects = fixturesScope.getAllByLabelText("Fixture Group");
    const fixtureDateInputs = fixturesScope.getAllByLabelText("Date");
    const fixtureVenueSelects = fixturesScope.getAllByLabelText("Venue");
    const fixturePoolInputs = fixturesScope.getAllByLabelText("Pool");
    const fixtureTimeInput = fixturesScope.getByLabelText("Time (optional)");
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

  it("allows selecting group venues via checkboxes", async () => {
    await renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /^2\s*Groups & Pools/i }));

    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });

    const groupSection = screen.getByRole("heading", { name: "Groups" }).closest("section");
    if (!groupSection) throw new Error("Groups section not found");
    const groupScope = within(groupSection);

    await waitFor(() => {
      expect(groupScope.getByRole("checkbox", { name: "Venue A" })).toBeDefined();
    });

    const venueACheckbox = groupScope.getByRole("checkbox", { name: "Venue A" });
    expect(venueACheckbox.checked).toBe(false);
    fireEvent.click(venueACheckbox);
    expect(venueACheckbox.checked).toBe(true);
    fireEvent.click(venueACheckbox);
    expect(venueACheckbox.checked).toBe(false);
  });

  it("supports auto-assigning pools from the fixture generator", async () => {
    await renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /^2\s*Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });
    const poolCountInput = screen.getByRole("spinbutton", { name: /Number of Pools/i });
    fireEvent.change(poolCountInput, { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /^3\s*Teams & Fixtures/i }));

    const teamsSection = screen.getByRole("heading", { name: "Teams" }).closest("section");
    if (!teamsSection) throw new Error("Teams section not found");
    const teamsScope = within(teamsSection);

    fireEvent.change(teamsScope.getByRole("combobox", { name: "Team Group" }), {
      target: { value: "U11B" },
    });
    fireEvent.change(teamsScope.getByPlaceholderText("PP Amber"), {
      target: { value: "PP Amber" },
    });

    fireEvent.click(teamsScope.getByRole("button", { name: /Add Team/i }));
    const teamInputs = teamsScope.getAllByPlaceholderText("PP Amber");
    fireEvent.change(teamInputs[1], { target: { value: "Knights Orange" } });

    const groupCombos = teamsScope.getAllByRole("combobox", { name: "Team Group" });
    fireEvent.change(groupCombos[1], { target: { value: "U11B" } });

    // Auto-assign is now in the fixture generator section after selecting a group
    const fixturesSection = screen.getByRole("heading", { name: "Fixtures" }).closest("section");
    if (!fixturesSection) throw new Error("Fixtures section not found");
    const fixturesScope = within(fixturesSection);

    fireEvent.change(fixturesScope.getByRole("combobox", { name: "Generator Group" }), {
      target: { value: "U11B" },
    });

    const autoAssignBtn = fixturesScope.getByRole("button", { name: /Assign teams to pools/i });
    expect(autoAssignBtn).toBeDefined();
    fireEvent.click(autoAssignBtn);
    // Pool assignment is now internal state used by the fixture generator — no UI pool fields on teams
  });

  it("shows generator validation errors when required fields are missing", async () => {
    await renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /^3\s*Teams & Fixtures/i }));

    const fixturesSection = screen.getByRole("heading", { name: "Fixtures" }).closest("section");
    if (!fixturesSection) throw new Error("Fixtures section not found");
    const fixturesScope = within(fixturesSection);

    fireEvent.click(fixturesScope.getByRole("button", { name: /Generate Fixtures/i }));
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
    fireEvent.click(screen.getByRole("button", { name: /^2\s*Groups/i }));
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), {
      target: { value: "U11 Boys" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^3\s*Teams & Fixtures/i }));

    const teamsSection = screen.getByRole("heading", { name: "Teams" }).closest("section");
    if (!teamsSection) throw new Error("Teams section not found");
    const teamsScope = within(teamsSection);

    fireEvent.change(teamsScope.getByRole("combobox", { name: "Team Group" }), {
      target: { value: "U11B" },
    });
    fireEvent.change(teamsScope.getByPlaceholderText("PP Amber"), {
      target: { value: "PP Amber" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Review →$/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Confirm & Create/i })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Create/i }));

    await waitFor(() => {
      expect(screen.getByText(/Save failed/i)).toBeDefined();
    });
  });

  it("populates franchise dropdown from API", async () => {
    fetch.mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/admin/venues")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: [] }),
        });
      }
      if (typeof url === "string" && url.includes("/admin/franchises")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ ok: true, data: [{ id: "f1", name: "Gryphons" }, { id: "f2", name: "Dragons" }] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    await renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /^3\s*Teams & Fixtures/i }));

    await waitFor(() => {
      const franchiseSelect = screen.getByRole("combobox", { name: /franchise/i });
      const options = Array.from(franchiseSelect.querySelectorAll("option")).map((o) => o.value);
      expect(options).toContain("Gryphons");
      expect(options).toContain("Dragons");
    });
  });

  it("populates franchise dropdown from API (single franchise)", async () => {
    fetch.mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/admin/venues")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: [] }),
        });
      }
      if (typeof url === "string" && url.includes("/admin/franchises")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: [{ id: "f1", name: "Gryphons" }] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    await renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /^3\s*Teams & Fixtures/i }));

    await waitFor(() => {
      const franchiseSelect = screen.getByRole("combobox", { name: /franchise/i });
      const options = Array.from(franchiseSelect.querySelectorAll("option")).map((o) => o.value);
      expect(options).toContain("Gryphons");
    });
  });

  it("falls back gracefully when franchise API call fails", async () => {
    fetch.mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/admin/venues")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: [] }),
        });
      }
      if (typeof url === "string" && url.includes("/admin/franchises")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    // Should render without throwing even if franchise fetch fails
    await renderWizard();
    expect(screen.getByText("Tournament Setup Wizard")).toBeDefined();
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
    expect(errors).not.toContain("All non-placeholder teams should have a pool.");

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

  it("handleNext blocks step 0 → 1 when required fields are missing, then advances when filled", async () => {
    await renderWizard();

    // Click Next without any fields filled — expect validation error
    fireEvent.click(screen.getByRole("button", { name: /Next: Groups/i }));
    expect(screen.getByText("Please fill in all required fields before continuing.")).toBeDefined();

    // Fill required fields (no Tournament ID needed — auto-generated)
    fireEvent.change(screen.getByPlaceholderText("HJ Indoor 2026"), { target: { value: "HJ Test" } });
    fireEvent.change(screen.getByPlaceholderText("2026"), { target: { value: "2026" } });

    // Now Next should advance to step 1
    fireEvent.click(screen.getByRole("button", { name: /Next: Groups/i }));
    expect(screen.getByRole("heading", { name: "Groups" })).toBeDefined();
  });

  it("shows a preview of the auto-generated tournament ID from name and season", async () => {
    await renderWizard();

    fireEvent.change(screen.getByPlaceholderText("HJ Indoor 2026"), { target: { value: "HJ Test" } });
    fireEvent.change(screen.getByPlaceholderText("2026"), { target: { value: "2026" } });

    // The ID preview text should appear
    await waitFor(() => {
      expect(screen.getByText(/hj-test-2026/i)).toBeDefined();
    });

    // Next should still advance to step 1
    fireEvent.click(screen.getByRole("button", { name: /Next: Groups/i }));
    expect(screen.getByRole("heading", { name: "Groups" })).toBeDefined();
  });

  it("shows inline error on blur for empty required step-0 fields and clears when filled", async () => {
    await renderWizard();

    const nameInput = screen.getByPlaceholderText("HJ Indoor 2026");
    const seasonInput = screen.getByPlaceholderText("2026");

    // No error before blur
    expect(screen.queryByText("Required")).toBeNull();

    // Blur name empty → error appears
    fireEvent.blur(nameInput);
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);

    // Type a value → error clears for that field
    fireEvent.change(nameInput, { target: { value: "HJ Test" } });
    // name is now filled; season is still empty but not yet blurred so only
    // one field should be invalid — or possibly none if the single "Required"
    // was for name and it cleared
    fireEvent.blur(seasonInput);
    fireEvent.change(seasonInput, { target: { value: "2026" } });

    // Both filled → no Required errors remain
    await waitFor(() => expect(screen.queryByText("Required")).toBeNull());
  });

  it("handleNext blocks step 1 → 2 when no valid group exists, then advances when group is filled", async () => {
    await renderWizard();

    // Jump to step 1 via header tab
    fireEvent.click(screen.getByRole("button", { name: /^2\s*Groups & Pools/i }));

    // Click Next with the default empty group — expect validation error
    fireEvent.click(screen.getByRole("button", { name: /Next: Teams/i }));
    expect(screen.getByText("Add at least one division before continuing.")).toBeDefined();

    // Fill in the division label (Group ID is auto-generated)
    fireEvent.change(screen.getByPlaceholderText("U11 Boys"), { target: { value: "U11 Boys" } });

    // Now Next should advance to step 2
    fireEvent.click(screen.getByRole("button", { name: /Next: Teams/i }));
    expect(screen.getByRole("heading", { name: "Teams" })).toBeDefined();
  });
});
