import { normalizeTeamName } from "../../lib/franchise";

export function computeFormErrors({ tournament, groups, teams, fixtures }) {
  const errors = [];
  if (!tournament.name.trim()) errors.push("Tournament name is required.");
  if (!tournament.season.trim()) errors.push("Tournament season is required.");
  if (!groups.some((g) => g.id && g.label)) {
    errors.push("At least one group is required.");
  }
  const groupIds = new Set(groups.map((g) => g.id).filter(Boolean));
  const invalidTeams = teams.filter((t) => !t.group_id || !groupIds.has(t.group_id));
  if (invalidTeams.length) {
    errors.push("All teams must be assigned to a valid group.");
  }
  const invalidFixtures = fixtures.filter((f) => f.group_id && !groupIds.has(f.group_id));
  if (invalidFixtures.length) {
    errors.push("Fixtures include an unknown group.");
  }
  const teamsMissingPool = teams.filter(
    (t) => t.group_id && !t.is_placeholder && !t.pool
  );
  if (teamsMissingPool.length) {
    errors.push("All non-placeholder teams should have a pool.");
  }
  const fixturesMissingDate = fixtures.filter((f) => f.team1 && f.team2 && !f.date);
  if (fixturesMissingDate.length) {
    errors.push("All fixtures must have a date.");
  }
  const fixturesMissingPool = fixtures.filter((f) => f.team1 && f.team2 && !f.pool);
  if (fixturesMissingPool.length) {
    errors.push("All fixtures must have a pool.");
  }
  const teamNames = new Set();
  const duplicateTeams = [];
  teams.forEach((t) => {
    const key = `${t.group_id || ""}:${normalizeTeamName(t.name).toLowerCase()}`;
    if (!t.name || !t.group_id) return;
    if (teamNames.has(key)) duplicateTeams.push(key);
    teamNames.add(key);
  });
  if (duplicateTeams.length) {
    errors.push("Duplicate team names found within a group.");
  }
  const fixtureKeys = new Set();
  const fixtureDupes = [];
  fixtures.forEach((f) => {
    if (!f.team1 || !f.team2 || !f.group_id || !f.date || !f.pool) return;
    const key = `${f.group_id}:${normalizeTeamName(f.team1)}:${normalizeTeamName(f.team2)}:${f.date}:${f.time || "TBD"}:${f.pool}`;
    if (fixtureKeys.has(key)) fixtureDupes.push(key);
    fixtureKeys.add(key);
  });
  if (fixtureDupes.length) {
    errors.push("Duplicate fixtures found (same teams/date/time/pool).");
  }
  return errors;
}
