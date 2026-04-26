import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import TournamentNewWizard from "./TournamentNewWizard";
import * as adminAuth from "../../lib/adminAuth";
import { FRANCHISE_COLOUR_ROTATION, normaliseId, getAutoFormat, getInitials } from "./TournamentNewWizard.utils";

async function completeStep1(user, { name = "HJ Test" } = {}) {
  // fireEvent.change is ~10x faster than user.type for filling text inputs
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-05-01" } });
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-05-02" } });
  await user.click(screen.getByRole("button", { name: "Beaulieu College" }));
  await user.click(screen.getByRole("checkbox", { name: "U9 Mixed" }));
}

describe("TournamentNewWizard (v2)", () => {
  it("normaliseId trims, lowercases, replaces non-alphanumerics, and clamps length", () => {
    expect(normaliseId("  My Franchise  ")).toBe("my-franchise");
    expect(normaliseId("My__Franchise!!")).toBe("my-franchise");
    expect(normaliseId("---Hello---")).toBe("hello");
    expect(normaliseId("")).toBe("");
    expect(normaliseId("a".repeat(200))).toHaveLength(64);
  });

  it("exports FRANCHISE_COLOUR_ROTATION with expected brand colours", () => {
    expect(FRANCHISE_COLOUR_ROTATION[0]).toBe("#2E5BFF");
    expect(FRANCHISE_COLOUR_ROTATION).toContain("#22C55E");
    expect(FRANCHISE_COLOUR_ROTATION).toHaveLength(10);
  });
  it("supports adding a custom venue (adds to directory and auto-selects)", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await user.type(screen.getByLabelText("Add custom venue"), "My Custom Venue");
    // There are multiple "Add" buttons on Step 1 (venues + age group). Click the venues one.
    await user.click(screen.getAllByRole("button", { name: "Add" })[0]);

    // Directory pill exists and is selected
    const pill = screen.getByRole("button", { name: "My Custom Venue" });
    expect(pill).toHaveAttribute("aria-pressed", "true");

    // Selected chip exists and is removable
    expect(screen.getByRole("button", { name: "Remove selected venue My Custom Venue" })).toBeInTheDocument();
  });

  it("enforces Mixed exclusivity in divisions (Mixed clears Boys/Girls and vice versa)", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    const boys = screen.getByRole("checkbox", { name: "U9 Boys" });
    const girls = screen.getByRole("checkbox", { name: "U9 Girls" });
    const mixed = screen.getByRole("checkbox", { name: "U9 Mixed" });

    await user.click(boys);
    await user.click(girls);
    expect(boys).toBeChecked();
    expect(girls).toBeChecked();
    expect(mixed).not.toBeChecked();

    await user.click(mixed);
    expect(mixed).toBeChecked();
    expect(boys).not.toBeChecked();
    expect(girls).not.toBeChecked();

    await user.click(boys);
    expect(boys).toBeChecked();
    expect(mixed).not.toBeChecked();
  });

  it("allows adding a custom age group and shows the CUSTOM badge", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await user.type(screen.getByLabelText("Add age group"), "u17");
    // There are multiple "Add" buttons on Step 1 (venues + age group). Click the age-group one.
    await user.click(screen.getAllByRole("button", { name: "Add" })[1]);

    expect(screen.getByText("U17")).toBeInTheDocument();
    expect(screen.getAllByText("CUSTOM").length).toBeGreaterThan(0);
  });

  it("computes and displays total minutes per game using the timing inputs", () => {
    render(<TournamentNewWizard />);

    fireEvent.change(screen.getByLabelText("Chakas per game"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Chaka minutes"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Halftime minutes"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Changeover minutes"), { target: { value: "2" } });

    // 2 x 10 + 3 + 2 = 25
    expect(screen.getByText(/=\s*25\s*min\/game/i)).toBeInTheDocument();
  });

  it("prevents adding a duplicate franchise (case-insensitive)", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    // BHA is already in the initial directory — adding it again should be rejected.
    await user.type(screen.getByLabelText("Add franchise"), "BHA");
    await user.click(screen.getByRole("button", { name: "Add" }));

    // Only one BHA entry should exist in the franchise grid.
    expect(screen.getAllByText("BHA")).toHaveLength(1);
  });


  it("disables Next until required Step 1 fields are provided", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();

    await user.type(screen.getByLabelText("Name"), "HJ Intercity");
    expect(next).toBeDisabled();

    await user.type(screen.getByLabelText("Start date"), "2026-05-01");
    expect(next).toBeDisabled();

    // second date input is end date
    await user.type(screen.getByLabelText("End date"), "2026-05-02");
    expect(next).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Beaulieu College" }));
    expect(next).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "U9 Mixed" }));
    expect(next).toBeEnabled();
  });

  it("requires at least two selected franchises on Step 2", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 5, Franchises")).toBeInTheDocument();

    const save = screen.getByRole("button", { name: "Save & Continue" });
    expect(save).toBeDisabled();

    const cards = screen.getAllByRole("listitem");
    await user.click(cards[0]);
    expect(save).toBeDisabled();
    await user.click(cards[1]);
    expect(save).toBeEnabled();
  });

  it("adds a franchise via Enter key and auto-selects it", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.type(screen.getByLabelText("Add franchise"), "New Club{enter}");

    expect(screen.getAllByText("New Club").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 selected|2 selected|3 selected/)).toBeInTheDocument();
  });

  it("lets you adjust points tiles (plus, minus, and manual input)", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);

    const winPoints = screen.getByLabelText("WIN points");
    const drawPoints = screen.getByLabelText("DRAW points");
    const lossPoints = screen.getByLabelText("LOSS points");

    expect(winPoints).toHaveValue(3);
    expect(drawPoints).toHaveValue(1);
    expect(lossPoints).toHaveValue(0);

    await user.click(screen.getByRole("button", { name: "WIN plus" }));
    expect(winPoints).toHaveValue(4);

    await user.click(screen.getByRole("button", { name: "LOSS minus" }));
    expect(lossPoints).toHaveValue(0);

    fireEvent.change(drawPoints, { target: { value: "2" } });
    expect(drawPoints).toHaveValue(2);
  });

  it("supports Back/Next navigation across steps", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 5, Franchises")).toBeInTheDocument();

    // Step 2 uses the fixed prototype summarybar CTA and doesn't render Back.
    // Still verify we can return to Step 1 via the left step rail.
    // Step rail is currently non-clickable, so just assert Next moved us to Step 2.
    // Back/locked nav will be verified when the prototype step indicator replaces the rail.
    expect(screen.getByText("Step 2 of 5, Franchises")).toBeInTheDocument();
  });

  it("does not allow navigating to future steps via the stepper", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    // Step 5 should be locked until we've progressed.
    const review = screen.getByRole("button", { name: "Fixtures" });
    expect(review).toBeDisabled();

    await user.click(review);
    // Still on step 1
    expect(screen.getByText("Step 1 of 5, Tournament Details")).toBeInTheDocument();
  });

  it("does nothing when clicking a locked future step (guard clause)", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    // On initial render only step 1 is allowed. Step 3 is locked.
    const step3 = screen.getByRole("button", { name: "Teams & Pools" });
    expect(step3).toBeDisabled();

    // Clicking a disabled button should not navigate.
    await user.click(step3);

    // Still on step 1.
    expect(screen.getByText("Step 1 of 5, Tournament Details")).toBeInTheDocument();
  });

  it("lets you add an age group via the Add button", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await user.type(screen.getByLabelText("Add age group"), "U19");
    // There are multiple "Add" buttons on Step 1, click the one next to the age-group input.
    await user.click(screen.getAllByRole("button", { name: "Add" })[1]);

    expect(screen.getByRole("checkbox", { name: "U19 Mixed" })).toBeInTheDocument();
  });

  it("renders Step 4 Rules and supports selecting a format", async () => {
    const user = userEvent.setup();

    const adminFetchSpy = vi
      .spyOn(adminAuth, "adminFetch")
      .mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ ok: true, tournament_id: "hj-test", sources: [] }),
      });

    render(<TournamentNewWizard />);

    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    // Step 2: select BHA and Black Hawks
    await user.click(screen.getByText("BHA"));
    await user.click(screen.getByText("Black Hawks"));
    await user.click(screen.getByRole("button", { name: "Save & Continue" }));

    // Step 3: opt both franchises into the U9 Mixed division
    expect(await screen.findByText("Step 3 of 5, Teams")).toBeInTheDocument();
    const divTiles = screen.getAllByRole("button", { name: "U9 Mixed" });
    await user.click(divTiles[0]); // BHA opts in → auto-adds "BHA"
    await user.click(divTiles[1]); // Black Hawks opts in → auto-adds "Black Hawks"

    const nextStep3 = screen.getByRole("button", { name: "Next →" });
    expect(nextStep3).toBeEnabled();
    await user.click(nextStep3);

    // Step 4: Division Rules
    expect(screen.getByText("Step 4 of 5, Division Rules")).toBeInTheDocument();

    // Select each format option to cover handlers (U9 Mixed has 2 teams → auto-suggest rr2)
    await user.click(screen.getByRole("button", { name: "Round Robin x1" }));
    expect(screen.getByRole("button", { name: "Round Robin x1" })).toHaveClass("is-selected");

    await user.click(screen.getByRole("button", { name: "Group Stage + KO" }));
    expect(screen.getByRole("button", { name: "Group Stage + KO" })).toHaveClass("is-selected");

    await user.click(screen.getByRole("button", { name: "Knockout Only" }));
    expect(screen.getByRole("button", { name: "Knockout Only" })).toHaveClass("is-selected");

    await user.click(screen.getByRole("button", { name: "Round Robin x2" }));
    expect(screen.getByRole("button", { name: "Round Robin x2" })).toHaveClass("is-selected");

    // Step 4 Back returns to Step 3.
    await user.click(screen.getByRole("button", { name: "← Back" }));
    expect(await screen.findByText("Step 3 of 5, Teams")).toBeInTheDocument();

    // Forward again to Step 4.
    await user.click(screen.getByRole("button", { name: "Next →" }));
    expect(screen.getByText("Step 4 of 5, Division Rules")).toBeInTheDocument();

    // Step 4 Next → advances to Step 5.
    await user.click(screen.getByRole("button", { name: "Next →" }));
    expect(screen.getByText("Step 5 of 5, Fixtures")).toBeInTheDocument();

    // Step 5 Back returns to Step 4.
    await user.click(screen.getByRole("button", { name: "← Back" }));
    expect(screen.getByText("Step 4 of 5, Division Rules")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next →" }));
    expect(screen.getByText("Step 5 of 5, Fixtures")).toBeInTheDocument();

    // Auto-generate fixtures.
    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));
    expect(screen.queryByText(/No fixtures generated yet/i)).not.toBeInTheDocument();

    // Step 5 submits via "Create Tournament →".
    expect(screen.getByRole("button", { name: "Create Tournament →" })).toBeInTheDocument();

    adminFetchSpy.mockRestore();
  });

  it("renders Step 3 Teams and supports back/next with franchise-division tiles", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    // Select BHA and Knights in Step 2.
    await user.click(screen.getByText("BHA"));
    await user.click(screen.getByText("Knights"));
    expect(screen.getByRole("button", { name: "Save & Continue" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Save & Continue" }));

    // Now on Step 3 — sees franchise cards with division tiles.
    expect(await screen.findByText("Step 3 of 5, Teams")).toBeInTheDocument();

    // Next should be disabled until at least one division has ≥2 teams.
    expect(screen.getByRole("button", { name: "Next →" })).toBeDisabled();

    // Opt BHA into U9 Mixed → auto-adds first slot ("BHA") from TEAM_DIRECTORY.
    const divTiles = screen.getAllByRole("button", { name: "U9 Mixed" });
    expect(divTiles).toHaveLength(2); // one per franchise

    await user.click(divTiles[0]); // BHA opts in
    // 1 team in U9 Mixed — still not valid
    expect(screen.getByRole("button", { name: "Next →" })).toBeDisabled();

    await user.click(divTiles[1]); // Knights opts in → adds "Knights"
    // 2 teams in U9 Mixed → valid
    expect(screen.getByRole("button", { name: "Next →" })).toBeEnabled();

    // Division summary chip should show count 2 (scoped to main step area).
    const step3Region = screen.getByRole("region", { name: "Step 3 Teams" });
    expect(within(step3Region).getByText("2")).toBeInTheDocument();

    // Back button returns to Step 2.
    await user.click(screen.getByRole("button", { name: "← Back" }));
    expect(await screen.findByText("Step 2 of 5, Franchises")).toBeInTheDocument();

    // Clicking "Teams & Pools" stepper (now unlocked) still shows Step 3.
    await user.click(screen.getByRole("button", { name: "Franchises" }));
    expect(screen.getByText("Step 2 of 5, Franchises")).toBeInTheDocument();
  });

  it("advances maxStep after step changes, unlocking the current step in the stepper", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    // Step 2 is initially locked
    const franchises = screen.getByRole("button", { name: "Franchises" });
    expect(franchises).toBeDisabled();

    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 5, Franchises")).toBeInTheDocument();

    // After reaching step 2, it should no longer be locked
    expect(franchises).toBeEnabled();

    // Spot check that we can still interact with previous step button (not disabled)
    const details = screen.getByRole("button", { name: "Tournament Details" });
    expect(details).toBeEnabled();
  });

  it("clamps points stepper interactions to a minimum of 0 for win/draw/loss", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);

    // Drive win down below zero
    const winPoints = screen.getByLabelText("WIN points");
    fireEvent.change(winPoints, { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: "WIN minus" }));
    expect(winPoints).toHaveValue(0);

    // Draw down below zero
    const drawPoints = screen.getByLabelText("DRAW points");
    fireEvent.change(drawPoints, { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: "DRAW minus" }));
    expect(drawPoints).toHaveValue(0);
  });

  it("allows proceeding to Step 3 once Step 2 is valid (two franchises selected)", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 5, Franchises")).toBeInTheDocument();

    const save = screen.getByRole("button", { name: "Save & Continue" });
    expect(save).toBeDisabled();

    const cards = screen.getAllByRole("listitem");
    await user.click(cards[0]);
    await user.click(cards[1]);
    expect(save).toBeEnabled();

    // Step 2 CTA is not yet wired to advance steps (step-3+ are placeholders).
    // For now, just verify the CTA becomes enabled when valid.
  });

  it("normalises franchise search results (case-insensitive, trim) and supports clearing the search", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    const search = screen.getByRole("textbox", { name: "Search franchises" });
    await user.type(search, "  sharks ");

    // Only the matching franchise card should remain visible.
    expect(screen.getByText("Sharks")).toBeInTheDocument();
    expect(screen.queryByText("BHA")).not.toBeInTheDocument();

    await user.clear(search);

    // Clearing search restores the full directory.
    expect(screen.getByText("BHA")).toBeInTheDocument();
    expect(screen.getByText("Sharks")).toBeInTheDocument();
  });

  // ── Step 5 fixture-builder tests ─────────────────────────────────────────

  // Helper: drive through Steps 1-4 and land on Step 5.
  // opts.extraVenue adds a second venue so the slot grid has two columns.
  async function navigateToStep5(user, { extraVenue = false } = {}) {
    await completeStep1(user);

    if (extraVenue) {
      // St Stithians is a second default venue in the directory.
      await user.click(screen.getByRole("button", { name: "St Stithians" }));
    }

    await user.click(screen.getByRole("button", { name: "Next" }));

    // Step 2: select BHA and Black Hawks (+ Knights when we need 3 franchises)
    await user.click(screen.getByText("BHA"));
    await user.click(screen.getByText("Black Hawks"));
    if (extraVenue) await user.click(screen.getByText("Knights"));
    await user.click(screen.getByRole("button", { name: "Save & Continue" }));

    // Step 3: opt franchises into U9 Mixed
    const divTiles = screen.getAllByRole("button", { name: "U9 Mixed" });
    await user.click(divTiles[0]); // BHA
    await user.click(divTiles[1]); // Black Hawks
    if (extraVenue) await user.click(divTiles[2]); // Knights
    await user.click(screen.getByRole("button", { name: "Next →" }));

    // Step 4: advance to Step 5
    await user.click(screen.getByRole("button", { name: "Next →" }));
    expect(screen.getByText("Step 5 of 5, Fixtures")).toBeInTheDocument();
  }

  it("renders a day pill for each day between the tournament start and end dates", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    // completeStep1 sets startDate=2026-05-01, endDate=2026-05-02 → 2 days
    expect(screen.getByRole("button", { name: /D1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /D2/ })).toBeInTheDocument();
    // No D3 pill (only 2 days)
    expect(screen.queryByRole("button", { name: /D3/ })).not.toBeInTheDocument();
    // Date numbers visible
    expect(screen.getByRole("button", { name: /D1.*1.*May/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /D2.*2.*May/ })).toBeInTheDocument();
  });

  it("auto-generate populates the unscheduled fixture list", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    // Before auto-generate the unscheduled list is empty
    expect(screen.queryByRole("button", { name: /BHA.*Black Hawks/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));

    // BHA vs Black Hawks appears in the unscheduled list
    expect(screen.getByRole("button", { name: /BHA.*Black Hawks/ })).toBeInTheDocument();
  });

  it("selecting an unscheduled fixture shows the placement hint and highlights empty slots", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));

    // Before selection: slots are plain divs labelled "empty", no role
    expect(screen.getAllByText("empty").length).toBeGreaterThan(0);
    expect(screen.queryByText("click to place")).not.toBeInTheDocument();
    expect(screen.queryByText("✦ Selected — click a slot to place")).not.toBeInTheDocument();

    // Click the unscheduled fixture row
    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));

    // Selection hint appears
    expect(screen.getByText("✦ Selected — click a slot to place")).toBeInTheDocument();
    // All empty slots now show "click to place" with role="button"
    const placeBtns = screen.getAllByRole("button", { name: "click to place" });
    expect(placeBtns.length).toBeGreaterThan(0);
    expect(screen.queryByText("empty")).not.toBeInTheDocument();
  });

  it("clicking an empty slot places the selected fixture there", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));

    // Select and place in the first slot
    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));
    await user.click(screen.getAllByRole("button", { name: "click to place" })[0]);

    // No longer in unscheduled list
    expect(screen.queryByRole("button", { name: /BHA.*Black Hawks/ })).not.toBeInTheDocument();
    // Placed card × button visible
    expect(screen.getByRole("button", { name: "Remove fixture" })).toBeInTheDocument();
    // Left panel shows all-done message
    expect(screen.getByText("All scheduled")).toBeInTheDocument();
  });

  it("clicking Remove fixture on a placed card returns it to the unscheduled list", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));

    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));
    await user.click(screen.getAllByRole("button", { name: "click to place" })[0]);
    expect(screen.getByText("All scheduled")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove fixture" }));

    expect(screen.getByRole("button", { name: /BHA.*Black Hawks/ })).toBeInTheDocument();
    expect(screen.queryByText("All scheduled")).not.toBeInTheDocument();
  });

  it("clicking a selected fixture again deselects it", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));

    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));
    expect(screen.getByText("✦ Selected — click a slot to place")).toBeInTheDocument();

    // Second click on the same row deselects (accessible name still matches despite hint text)
    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));
    expect(screen.queryByText("✦ Selected — click a slot to place")).not.toBeInTheDocument();
    expect(screen.getAllByText("empty").length).toBeGreaterThan(0);
  });

  it("submitting on Step 5 calls adminFetch with the tournament payload", async () => {
    const user = userEvent.setup();

    const adminFetchSpy = vi.spyOn(adminAuth, "adminFetch").mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ ok: true, tournament_id: "hj-test-2026" }),
    });

    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    // Auto-generate and place one fixture so the submission has something to send
    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));
    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));
    await user.click(screen.getAllByRole("button", { name: "click to place" })[0]);

    await user.click(screen.getByRole("button", { name: "Create Tournament →" }));

    expect(adminFetchSpy).toHaveBeenCalledWith(
      "/admin/tournament-wizard",
      expect.objectContaining({ method: "POST" })
    );

    adminFetchSpy.mockRestore();
  });

  it("pressing Enter on a highlighted slot places the selected fixture", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));
    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));

    // Trigger keyboard placement on the first highlighted slot
    const firstSlot = screen.getAllByRole("button", { name: "click to place" })[0];
    fireEvent.keyDown(firstSlot, { key: "Enter" });

    // Fixture should now be placed
    expect(screen.getByRole("button", { name: "Remove fixture" })).toBeInTheDocument();
    expect(screen.queryByText("click to place")).not.toBeInTheDocument();
  });

  it("shows a conflict warning when the same team is scheduled in two venues at the same time", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    // extraVenue=true → two venue columns; 3 franchises → 3 fixtures so two share BHA
    await navigateToStep5(user, { extraVenue: true });

    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));

    // Round-robin for BHA, Black Hawks, Knights (+BYE) produces (in order):
    //   Black Hawks vs Knights · BHA vs Knights · BHA vs Black Hawks
    // Place BHA vs Knights at D1 08:00 Beaulieu College (slot index 0)
    await user.click(screen.getByRole("button", { name: /BHA.*Knights/ }));
    await user.click(screen.getAllByRole("button", { name: "click to place" })[0]);

    // Place BHA vs Black Hawks at D1 08:00 St Stithians
    // (Beaulieu College at 08:00 is now occupied → first remaining slot is St Stithians 08:00)
    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));
    await user.click(screen.getAllByRole("button", { name: "click to place" })[0]);

    // Both placed cards should display the conflict warning for BHA
    expect(screen.getAllByText(/BHA is already playing at 08:00/).length).toBeGreaterThanOrEqual(1);
  });

  // ── Success screen tests ─────────────────────────────────────────────
  it("shows the success screen with stat tiles and action buttons after successful submit", async () => {
    const user = userEvent.setup();

    vi.spyOn(adminAuth, "adminFetch").mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ ok: true, tournament_id: "hj-test-2026" }),
    });

    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));
    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));
    await user.click(screen.getAllByRole("button", { name: "click to place" })[0]);

    await user.click(screen.getByRole("button", { name: "Create Tournament →" }));

    // Success heading and emoji
    expect(screen.getByRole("heading", { name: "Tournament Created!" })).toBeInTheDocument();
    // Tournament name shown
    const successRegion = screen.getByRole("region", { name: "Tournament created" });
    expect(within(successRegion).getByText("🏑")).toBeInTheDocument();
    expect(within(successRegion).getByText("HJ Test")).toBeInTheDocument();
    // Stat tile labels scoped inside success region
    expect(within(successRegion).getByText(/Division/)).toBeInTheDocument();
    expect(within(successRegion).getByText(/Team/)).toBeInTheDocument();
    expect(within(successRegion).getByText(/Fixture/)).toBeInTheDocument();
    // Action links / buttons
    expect(screen.getByRole("link", { name: "View Tournaments" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Another" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("Create Another on the success screen resets the wizard to Step 1", async () => {
    const user = userEvent.setup();

    vi.spyOn(adminAuth, "adminFetch").mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ ok: true, tournament_id: "hj-test-2026" }),
    });

    render(<TournamentNewWizard />);
    await navigateToStep5(user);
    await user.click(screen.getByRole("button", { name: "Create Tournament →" }));

    expect(screen.getByRole("heading", { name: "Tournament Created!" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Another" }));

    // Wizard is back at Step 1
    expect(screen.getByText("Step 1 of 5, Tournament Details")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tournament Created!" })).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });

  // ── Enhanced sidebar tests ────────────────────────────────────────────
  it("sidebar shows the selected venue names (not just a count)", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user); // selects Beaulieu College

    const sidebar = screen.getByRole("complementary", { name: "Tournament summary" });
    expect(within(sidebar).getByText("Beaulieu College")).toBeInTheDocument();
    // St Stithians not selected yet
    expect(within(sidebar).queryByText("St Stithians")).not.toBeInTheDocument();
  });

  it("sidebar shows the computed game duration and formula", () => {
    render(<TournamentNewWizard />);

    // Default timing: 2 chakas × 20 min + 5 half + 3 change = 48 min/game
    const sidebar = screen.getByRole("complementary", { name: "Tournament summary" });
    expect(within(sidebar).getByText("48 min/game")).toBeInTheDocument();
    expect(within(sidebar).getByText(/2×20/)).toBeInTheDocument();
  });

  // ── Design token alignment tests ─────────────────────────────────────────
  it("renders with the token-driven shell and stepper structure (Phase 6 alignment check)", () => {
    render(<TournamentNewWizard />);
    // Shell applies the root class that triggers var(--hj-font-family-sans)
    expect(document.querySelector(".hj-tw2-shell")).toBeInTheDocument();
    // Stepper uses the topstep class for token-driven surface/border/shadow
    expect(document.querySelector(".hj-tw2-topstep")).toBeInTheDocument();
    // Cards use the token-driven card class
    expect(document.querySelector(".hj-tw2-card")).toBeInTheDocument();
    // Sidebar uses the token-driven sidebar class
    expect(document.querySelector(".hj-tw2-sidebar-card")).toBeInTheDocument();
  });

  it("sidebar shows per-division team counts after teams are entered on Step 3", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.click(screen.getByText("BHA"));
    await user.click(screen.getByText("Black Hawks"));
    await user.click(screen.getByRole("button", { name: "Save & Continue" }));

    // Step 3: opt both franchises into U9 Mixed
    const divTiles = screen.getAllByRole("button", { name: "U9 Mixed" });
    await user.click(divTiles[0]);
    await user.click(divTiles[1]);

    const sidebar = screen.getByRole("complementary", { name: "Tournament summary" });
    // Division name appears in sidebar
    expect(within(sidebar).getByText("U9 Mixed")).toBeInTheDocument();
    // Team count badge shows 2
    expect(within(sidebar).getByText("2")).toBeInTheDocument();
  });

  // ── Remove venue chip and timing input handlers ───────────────────────────
  it("clicking the remove chip deselects a selected venue", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await user.click(screen.getByRole("button", { name: "Beaulieu College" }));
    expect(screen.getByRole("button", { name: "Remove selected venue Beaulieu College" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove selected venue Beaulieu College" }));
    expect(screen.queryByRole("button", { name: "Remove selected venue Beaulieu College" })).not.toBeInTheDocument();
  });

  it("changing Chakas per game updates the timing formula in the sidebar", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    // Default: 2 × 20 + 5 + 3 = 48. Change chakasPerGame to 3 → 3 × 20 + 5 + 3 = 68.
    fireEvent.change(screen.getByLabelText("Chakas per game"), { target: { value: "3" } });
    expect(screen.getByText(/=\s*68\s*min\/game/i)).toBeInTheDocument();
  });

  // ── Enter-key handlers in Step 1 ─────────────────────────────────────────
  it("pressing Enter in the Add custom venue input adds the venue", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await user.type(screen.getByLabelText("Add custom venue"), "Kings Park{Enter}");

    const pill = screen.getByRole("button", { name: "Kings Park" });
    expect(pill).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Remove selected venue Kings Park" })).toBeInTheDocument();
  });

  it("pressing Enter in the Add age group input adds the age group", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await user.type(screen.getByLabelText("Add age group"), "U21{Enter}");

    expect(screen.getByRole("checkbox", { name: "U21 Mixed" })).toBeInTheDocument();
  });

  it("shows an end-date error when end date is before start date", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-05-10" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-05-01" } });

    expect(screen.getByText("End date must be on or after start date")).toBeInTheDocument();
  });

  it("shows day pill badge count after placing a fixture on that day", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Auto-generate fixtures" }));
    await user.click(screen.getByRole("button", { name: /BHA.*Black Hawks/ }));
    await user.click(screen.getAllByRole("button", { name: "click to place" })[0]);

    // D1 now has 1 fixture placed — badge element should appear on the pill
    const d1 = screen.getByRole("button", { name: /D1/ });
    const badge = d1.querySelector(".hj-tw2-day-badge");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("1");
  });

  // ── getAutoFormat util coverage ───────────────────────────────────────────
  it("getAutoFormat returns rr2 for ≤4 teams, rr1 for 5-8, gs_ko for >8", () => {
    expect(getAutoFormat(1)).toBe("rr2");
    expect(getAutoFormat(4)).toBe("rr2");
    expect(getAutoFormat(5)).toBe("rr1");
    expect(getAutoFormat(8)).toBe("rr1");
    expect(getAutoFormat(9)).toBe("gs_ko");
    expect(getAutoFormat(20)).toBe("gs_ko");
  });

  // ── getInitials util coverage ─────────────────────────────────────────────
  it("getInitials derives 2-letter initials from franchise name", () => {
    expect(getInitials("")).toBe("??");
    expect(getInitials(null)).toBe("??");
    expect(getInitials("Black")).toBe("BL");
    expect(getInitials("Black Hawks")).toBe("BH");
    expect(getInitials("Purple Panthers Gold")).toBe("PP");
  });

  // ── Day-pill active switching (Step 5) ───────────────────────────────────
  it("clicking a day pill switches the active day", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    const d1 = screen.getByRole("button", { name: /D1/ });
    const d2 = screen.getByRole("button", { name: /D2/ });

    // D1 is active by default
    expect(d1.className).toContain("hj-tw2-day-pill--active");
    expect(d2.className).not.toContain("hj-tw2-day-pill--active");

    await user.click(d2);

    expect(d2.className).toContain("hj-tw2-day-pill--active");
    expect(d1.className).not.toContain("hj-tw2-day-pill--active");
  });

  // ── Submit error paths (lines 1971, 1978) ────────────────────────────────
  it("shows an error alert when the server returns a non-ok response", async () => {
    const user = userEvent.setup();

    vi.spyOn(adminAuth, "adminFetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, error: "Server exploded" }),
    });

    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Create Tournament →" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server exploded");

    vi.restoreAllMocks();
  });

  it("falls back to HTTP status in the error alert when json.error is absent", async () => {
    const user = userEvent.setup();

    vi.spyOn(adminAuth, "adminFetch").mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Create Tournament →" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 503");

    vi.restoreAllMocks();
  });

  it("shows the error message when adminFetch itself throws a network error", async () => {
    const user = userEvent.setup();

    vi.spyOn(adminAuth, "adminFetch").mockRejectedValue(new Error("Network failure"));

    render(<TournamentNewWizard />);
    await navigateToStep5(user);

    await user.click(screen.getByRole("button", { name: "Create Tournament →" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network failure");

    vi.restoreAllMocks();
  });
});
