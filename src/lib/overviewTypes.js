export const CARD_TYPES = Object.freeze({
  FIXTURE: "fixture",
  STANDING: "standing",
  ANNOUNCEMENT: "announcement",
  AWARD: "award",
  ALERT: "alert",
});

export const ANNOUNCEMENT_SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
});

export function normalizeOverviewPayload(data = {}) {
  return {
    season: data.season || new Date().getFullYear().toString(),
    availableSeasons: data.availableSeasons || [new Date().getFullYear().toString()],
    generatedAt: data.generatedAt || new Date().toISOString(),
    cards: Array.isArray(data.cards) ? data.cards : [],
    announcements: Array.isArray(data.announcements) ? data.announcements : [],
    freshness: Array.isArray(data.freshness) ? data.freshness : [],
    followPreference: data.followPreference || { teams: [], ageGroups: [], season: data.season },
  };
}

export function groupCardsByType(cards = []) {
  return cards.reduce((acc, card) => {
    const type = card?.type || "unknown";
    if (!acc[type]) acc[type] = [];
    acc[type].push(card);
    return acc;
  }, {});
}

export function computeLastUpdated(freshness = []) {
  if (!freshness.length) return null;
  const timestamps = freshness
    .map(item => Date.parse(item.fetchedAt || item.generatedAt || ""))
    .filter(Boolean);
  if (!timestamps.length) return null;
  const mostRecent = Math.max(...timestamps);
  return new Date(mostRecent).toISOString();
}
