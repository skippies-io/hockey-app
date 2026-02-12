import { describe, it, expect } from "vitest";
import { normalizeTeamName, parseFranchiseName } from "./franchise";

describe("franchise helpers", () => {
  it("normalizes team names with dashes and extra whitespace", () => {
    expect(normalizeTeamName("  PP  -  Amber ")).toBe("PP Amber");
    expect(normalizeTeamName("Knights-Orange")).toBe("Knights Orange");
  });

  it("parses known franchise aliases and placeholders", () => {
    const parsed = parseFranchiseName("PP Amber");
    expect(parsed.franchise).toBe("Purple Panthers");
    expect(parsed.placeholder).toBe(false);

    const placeholder = parseFranchiseName("Winner QF1");
    expect(placeholder.placeholder).toBe(true);
  });
});
