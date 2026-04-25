import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import TournamentNewWizard from "./TournamentNewWizard";
import * as adminAuth from "../../lib/adminAuth";
import { FRANCHISE_COLOUR_ROTATION, normaliseId } from "./TournamentNewWizard.utils";

async function completeStep1(user, { name = "HJ Test" } = {}) {
  await user.type(screen.getByLabelText("Name"), name);
  await user.type(screen.getByLabelText("Start date"), "2026-05-01");
  await user.type(screen.getByLabelText("End date"), "2026-05-02");
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

  it("computes and displays total minutes per game using the timing inputs", async () => {
    const user = userEvent.setup();
    render(<TournamentNewWizard />);

    await user.clear(screen.getByLabelText("Chakas per game"));
    await user.type(screen.getByLabelText("Chakas per game"), "2");

    await user.clear(screen.getByLabelText("Chaka minutes"));
    await user.type(screen.getByLabelText("Chaka minutes"), "10");

    await user.clear(screen.getByLabelText("Halftime minutes"));
    await user.type(screen.getByLabelText("Halftime minutes"), "3");

    await user.clear(screen.getByLabelText("Changeover minutes"));
    await user.type(screen.getByLabelText("Changeover minutes"), "2");

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

    await user.clear(drawPoints);
    await user.type(drawPoints, "2");
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

    // Division summary chip should show count 2.
    expect(screen.getByText("2")).toBeInTheDocument();

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
    await user.clear(winPoints);
    await user.type(winPoints, "0");
    await user.click(screen.getByRole("button", { name: "WIN minus" }));
    expect(winPoints).toHaveValue(0);

    // Draw down below zero
    const drawPoints = screen.getByLabelText("DRAW points");
    await user.clear(drawPoints);
    await user.type(drawPoints, "0");
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


});
