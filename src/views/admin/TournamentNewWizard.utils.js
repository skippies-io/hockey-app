export const FRANCHISE_COLOUR_ROTATION = [
  "#2E5BFF",
  "#22C55E",
  "#F97316",
  "#A855F7",
  "#EF4444",
  "#06B6D4",
  "#F59E0B",
  "#10B981",
  "#6366F1",
  "#EC4899",
];

export function normaliseId(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

/** Demo franchise directory — keyed by stable id, matches TEAM_DIRECTORY keys. */
export const FRANCHISE_DIRECTORY = [
  { id: "bha", name: "BHA", colour: "#3b82f6", initials: "BH" },
  { id: "blackhawks", name: "Black Hawks", colour: "#1e293b", initials: "BK" },
  { id: "knights", name: "Knights", colour: "#8b5cf6", initials: "KN" },
  { id: "panthers", name: "Purple Panthers", colour: "#7c3aed", initials: "PP" },
  { id: "tigers", name: "Tigers", colour: "#f59e0b", initials: "TG" },
  { id: "stallions", name: "Stallions", colour: "#10b981", initials: "ST" },
  { id: "eagles", name: "Eagles", colour: "#ef4444", initials: "EA" },
  { id: "sharks", name: "Sharks", colour: "#06b6d4", initials: "SH" },
];

/** Team name suggestions per franchise id. New franchises have an empty list. */
export const TEAM_DIRECTORY = {
  bha: ["BHA", "BHA Green", "BHA Black", "BHA White", "BHA Blue"],
  blackhawks: ["Black Hawks", "Black Hawks 1", "Black Hawks 2", "Black Hawks Gold"],
  knights: ["Knights", "Knights Orange", "Knights Blue", "Knights 1"],
  panthers: ["Purple Panthers", "Purple Panthers Amber", "Purple Panthers Gold"],
  tigers: ["Tigers", "Tigers Gold", "Tigers Black"],
  stallions: ["Stallions", "Stallions Green", "Stallions White"],
  eagles: ["Eagles", "Eagles Red", "Eagles Blue"],
  sharks: ["Sharks", "Sharks Cyan", "Sharks White"],
};

/**
 * Auto-suggest format for a given team count.
 * rr2 = Round Robin x1 (≤4 teams)
 * rr1 = Round Robin x2 (5–8 teams)
 * gs_ko = Group Stage + KO (>8 teams)
 */
export function getAutoFormat(teamCount) {
  if (teamCount <= 4) return "rr2";
  if (teamCount <= 8) return "rr1";
  return "gs_ko";
}

/** Derive 2-letter initials from a franchise name. */
export function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generate all round-robin pairings for a list of team IDs.
 * Returns [[teamA, teamB, roundNumber], ...]. BYE slots are dropped.
 */
export function roundRobinPairs(teamIds) {
  const n = teamIds.length;
  if (n < 2) return [];

  const isOdd = n % 2 === 1;
  const ids = isOdd ? [...teamIds, "BYE"] : [...teamIds];
  const m = ids.length;
  const half = m / 2;

  let arr = [...ids];
  const rounds = m - 1;
  const all = [];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[m - 1 - i];
      if (a === "BYE" || b === "BYE") continue;
      all.push([a, b, r + 1]);
    }

    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }

  return all;
}

/**
 * Collect all opted-in team entries for a division from step3Entries.
 * Returns [{ name, franchiseId }].
 */
export function getTeamsForDivision(entries, divKey) {
  const result = [];
  const divEntries = entries[divKey] ?? {};
  for (const [franchiseId, entry] of Object.entries(divEntries)) {
    if (entry.optedIn) {
      for (const slot of entry.slots) {
        if (slot.name.trim()) result.push({ name: slot.name.trim(), franchiseId });
      }
    }
  }
  return result;
}

/**
 * Build round-robin fixtures for all divisions.
 * Skips same-franchise pairings and returns the count of skipped pairs.
 */
export function buildFixturesForStep5({ activeDivisions, step3Entries, step4 }) {
  const allFixtures = [];
  let skippedSameFranchise = 0;

  for (const divKey of activeDivisions) {
    const teams = getTeamsForDivision(step3Entries, divKey);
    if (teams.length < 2) continue;

    const format = step4.formats[divKey] || getAutoFormat(teams.length);
    const poolsA = step4.poolsA?.[divKey] ?? [];
    const poolsB = step4.poolsB?.[divKey] ?? [];

    const isGS = format === "gs_ko" && (poolsA.length >= 2 || poolsB.length >= 2);

    let groups;
    if (isGS) {
      groups = [
        { pool: "A", names: poolsA },
        { pool: "B", names: poolsB },
      ].filter((g) => g.names.length >= 2);
      if (groups.length === 0) groups = [{ pool: null, names: teams.map((t) => t.name) }];
    } else {
      groups = [{ pool: null, names: teams.map((t) => t.name) }];
    }

    const repeats = format === "rr1" ? 2 : 1;

    for (const { pool, names } of groups) {
      const pairings = roundRobinPairs(names);
      for (let rep = 0; rep < repeats; rep++) {
        for (const [a, b, roundNum] of pairings) {
          const teamA = teams.find((t) => t.name === a);
          const teamB = teams.find((t) => t.name === b);
          if (teamA && teamB && teamA.franchiseId === teamB.franchiseId) {
            skippedSameFranchise++;
            continue;
          }
          allFixtures.push({
            group_id: normaliseId(divKey),
            date: "",
            time: "",
            venue: "",
            pool: pool ?? null,
            team1: a,
            team2: b,
            round: `Round ${roundNum}`,
            slotDay: null,
          });
        }
      }
    }
  }

  return { fixtures: allFixtures, skippedSameFranchise };
}
