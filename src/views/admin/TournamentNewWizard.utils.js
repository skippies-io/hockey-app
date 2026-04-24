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

