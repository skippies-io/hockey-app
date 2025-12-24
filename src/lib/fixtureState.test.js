import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FixtureState,
  classifyFixtureState,
  computeResultPill,
  hasValidScore,
} from "./fixtureState.js";

test("hasValidScore handles numeric values and strings", () => {
  assert.equal(hasValidScore("0"), true);
  assert.equal(hasValidScore(0), true);
  assert.equal(hasValidScore("1"), true);
  assert.equal(hasValidScore(1), true);
  assert.equal(hasValidScore(""), false);
  assert.equal(hasValidScore(null), false);
  assert.equal(hasValidScore(undefined), false);
  assert.equal(hasValidScore("TBD"), false);
});

test("classifyFixtureState returns LIVE when status is live", () => {
  const fixture = { status: "live" };
  assert.equal(classifyFixtureState(fixture), FixtureState.LIVE);
});

test("classifyFixtureState returns LIVE when live flag is true", () => {
  const fixture = { live: true };
  assert.equal(classifyFixtureState(fixture), FixtureState.LIVE);
});

test("classifyFixtureState returns RECENT when scores exist", () => {
  const fixture = { homeScore: 2, awayScore: "" };
  assert.equal(classifyFixtureState(fixture), FixtureState.RECENT);
});

test("classifyFixtureState returns UPCOMING when date exists", () => {
  const fixture = { date: "2025-01-01" };
  assert.equal(classifyFixtureState(fixture), FixtureState.UPCOMING);
});

test("classifyFixtureState returns UNKNOWN when missing data", () => {
  const fixture = {};
  assert.equal(classifyFixtureState(fixture), FixtureState.UNKNOWN);
});

test("computeResultPill returns W/D/L from home team perspective", () => {
  const fixture = {
    homeTeam: "A",
    awayTeam: "B",
    homeScore: 3,
    awayScore: 1,
  };
  assert.equal(computeResultPill({ fixture, teamKey: "A" }), "W");

  fixture.homeScore = 2;
  fixture.awayScore = 2;
  assert.equal(computeResultPill({ fixture, teamKey: "A" }), "D");

  fixture.homeScore = 1;
  fixture.awayScore = 3;
  assert.equal(computeResultPill({ fixture, teamKey: "A" }), "L");
});

test("computeResultPill returns W/D/L from away team perspective", () => {
  const fixture = {
    homeTeam: "A",
    awayTeam: "B",
    homeScore: 1,
    awayScore: 2,
  };
  assert.equal(computeResultPill({ fixture, teamKey: "B" }), "W");

  fixture.homeScore = 2;
  fixture.awayScore = 2;
  assert.equal(computeResultPill({ fixture, teamKey: "B" }), "D");

  fixture.homeScore = 3;
  fixture.awayScore = 1;
  assert.equal(computeResultPill({ fixture, teamKey: "B" }), "L");
});

test("computeResultPill returns null for unknown team or missing scores", () => {
  const fixture = {
    homeTeam: "A",
    awayTeam: "B",
    homeScore: "TBD",
    awayScore: "",
  };
  assert.equal(computeResultPill({ fixture, teamKey: "A" }), null);
  assert.equal(computeResultPill({ fixture, teamKey: "C" }), null);
});
