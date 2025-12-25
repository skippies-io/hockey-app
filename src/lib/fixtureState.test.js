import { describe, it, expect } from "vitest";
import {
  FixtureState,
  classifyFixtureState,
  computeResultPill,
  hasValidScore,
} from "./fixtureState.js";

describe("hasValidScore", () => {
  it("handles numeric values and strings", () => {
    expect(hasValidScore("0")).toBe(true);
    expect(hasValidScore(0)).toBe(true);
    expect(hasValidScore("1")).toBe(true);
    expect(hasValidScore(1)).toBe(true);
    expect(hasValidScore("")).toBe(false);
    expect(hasValidScore(null)).toBe(false);
    expect(hasValidScore(undefined)).toBe(false);
    expect(hasValidScore("TBD")).toBe(false);
  });
});

describe("classifyFixtureState", () => {
  it("returns LIVE when status is live", () => {
    const fixture = { status: "live" };
    expect(classifyFixtureState(fixture)).toBe(FixtureState.LIVE);
  });

  it("returns LIVE when live flag is true", () => {
    const fixture = { live: true };
    expect(classifyFixtureState(fixture)).toBe(FixtureState.LIVE);
  });

  it("returns RECENT when scores exist", () => {
    const fixture = { homeScore: 2, awayScore: "" };
    expect(classifyFixtureState(fixture)).toBe(FixtureState.RECENT);
  });

  it("returns UPCOMING when date exists", () => {
    const fixture = { date: "2025-01-01" };
    expect(classifyFixtureState(fixture)).toBe(FixtureState.UPCOMING);
  });

  it("returns UNKNOWN when missing data", () => {
    const fixture = {};
    expect(classifyFixtureState(fixture)).toBe(FixtureState.UNKNOWN);
  });
});

describe("computeResultPill", () => {
  it("returns W/D/L from home team perspective", () => {
    const fixture = {
      homeTeam: "A",
      awayTeam: "B",
      homeScore: 3,
      awayScore: 1,
    };
    expect(computeResultPill({ fixture, teamKey: "A" })).toBe("W");

    fixture.homeScore = 2;
    fixture.awayScore = 2;
    expect(computeResultPill({ fixture, teamKey: "A" })).toBe("D");

    fixture.homeScore = 1;
    fixture.awayScore = 3;
    expect(computeResultPill({ fixture, teamKey: "A" })).toBe("L");
  });

  it("returns W/D/L from away team perspective", () => {
    const fixture = {
      homeTeam: "A",
      awayTeam: "B",
      homeScore: 1,
      awayScore: 2,
    };
    expect(computeResultPill({ fixture, teamKey: "B" })).toBe("W");

    fixture.homeScore = 2;
    fixture.awayScore = 2;
    expect(computeResultPill({ fixture, teamKey: "B" })).toBe("D");

    fixture.homeScore = 3;
    fixture.awayScore = 1;
    expect(computeResultPill({ fixture, teamKey: "B" })).toBe("L");
  });

  it("returns null for unknown team or missing scores", () => {
    const fixture = {
      homeTeam: "A",
      awayTeam: "B",
      homeScore: "TBD",
      awayScore: "",
    };
    expect(computeResultPill({ fixture, teamKey: "A" })).toBe(null);
    expect(computeResultPill({ fixture, teamKey: "C" })).toBe(null);
  });
});
