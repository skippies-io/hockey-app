export const FixtureState = {
  LIVE: "LIVE",
  RECENT: "RECENT",
  UPCOMING: "UPCOMING",
  UNKNOWN: "UNKNOWN",
};

export function hasValidScore(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase() === "tbd") return false;

  return /^-?\d+(\.\d+)?$/.test(trimmed);
}

export function classifyFixtureState(fixture) {
  if (!fixture) return FixtureState.UNKNOWN;

  const status = typeof fixture.status === "string" ? fixture.status.trim() : "";
  if (fixture.live === true || status.toLowerCase() === "live") {
    return FixtureState.LIVE;
  }

  if (hasValidScore(fixture.homeScore) || hasValidScore(fixture.awayScore)) {
    return FixtureState.RECENT;
  }

  const dateValue =
    typeof fixture.date === "string" ? fixture.date.trim() : fixture.date;
  if (dateValue) return FixtureState.UPCOMING;

  return FixtureState.UNKNOWN;
}

export function computeResultPill({ fixture, teamKey }) {
  if (!fixture || !teamKey) return null;

  const isHome = fixture.homeTeam === teamKey;
  const isAway = fixture.awayTeam === teamKey;
  if (!isHome && !isAway) return null;

  if (!hasValidScore(fixture.homeScore) || !hasValidScore(fixture.awayScore)) {
    return null;
  }

  const homeScore = Number(fixture.homeScore);
  const awayScore = Number(fixture.awayScore);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;

  const ourScore = isHome ? homeScore : awayScore;
  const oppScore = isHome ? awayScore : homeScore;

  if (ourScore > oppScore) return "W";
  if (ourScore < oppScore) return "L";
  return "D";
}
