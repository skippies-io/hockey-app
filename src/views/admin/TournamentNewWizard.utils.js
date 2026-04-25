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
