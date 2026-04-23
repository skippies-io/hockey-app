import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import TournamentNewWizard from "./TournamentNewWizard";

describe("TournamentNewWizard (v2)", () => {
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
});
