// src/lib/api.js
export const API_BASE = import.meta.env.VITE_API_BASE;
const APP_VER  = import.meta.env.VITE_APP_VERSION || "v1";
const MAX_AGE_MS = 60_000; // 60s client-side cache

function cacheKey(url) { return `hj:cache:${APP_VER}:${url}`; }

async function fetchJSON(url, { revalidate = true } = {}) {
  if (!API_BASE) throw new Error("Missing VITE_API_BASE");

  const key = cacheKey(url);
  const cached = sessionStorage.getItem(key);
  if (cached) {
    try {
      const { t, data } = JSON.parse(cached);
      // serve fresh
      if (Date.now() - t < MAX_AGE_MS) return data;

      // stale-while-revalidate (background refresh)
      if (revalidate) {
        fetch(url)
          .then(r => r.json())
          .then(nd => sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data: nd })))
          .catch(() => { /* background refresh failed; keep stale */ });
      }
      return data; // stale but immediate
    } catch {
      // Bad JSON in cache → ignore and refetch below
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.ok === false) throw new Error(data.error || "API error");
  sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
  return data;
}

// put these near the top (or anywhere above getGroups)
const DIVISION_ORDER = { B: 0, G: 1, M: 2, X: 3 }; // tweak if you want Girls-first etc.

function sortGroups(a, b) {
  // sort by age number first (U9, U11, U13, …)
  const numA = parseInt((a.id || "").match(/^U(\d+)/i)?.[1] || "0", 10);
  const numB = parseInt((b.id || "").match(/^U(\d+)/i)?.[1] || "0", 10);
  if (numA !== numB) return numA - numB;

  // then by division letter at the end of the id: B | G | M (fallback X)
  const divA = (a.id || "").slice(-1).toUpperCase();
  const divB = (b.id || "").slice(-1).toUpperCase();
  return (DIVISION_ORDER[divA] ?? 99) - (DIVISION_ORDER[divB] ?? 99);
}


/* ---------- Public API ---------- */

export async function getGroups() {
  const url = `${API_BASE}?groups=1`;
  const j = await fetchJSON(url);
  // normalise to {id, label} and sort
  return (j.groups || [])
    .map(g => ({ id: g.id, label: g.label }))
    .sort(sortGroups);
}

function matchesTournament(row, slug) {
  if (!slug) return true;
  const candidate = (
    row?.TournamentSlug ||
    row?.tournamentSlug ||
    row?.Tournament ||
    row?.tournament
  );
  if (!candidate) return false;
  return String(candidate).toLowerCase() === String(slug).toLowerCase();
}

export async function getStandingsRows(ageId, { tournamentSlug } = {}) {
  const url = `${API_BASE}?sheet=Standings&age=${encodeURIComponent(ageId)}`;
  const j = await fetchJSON(url);
  const rows = j.rows || [];
  if (!tournamentSlug) return rows;
  const filtered = rows.filter(r => matchesTournament(r, tournamentSlug));
  return filtered.length ? filtered : rows; // fall back if sheet missing slug data
}

export async function getFixturesRows(ageId, { tournamentSlug } = {}) {
  const url = `${API_BASE}?sheet=Fixtures&age=${encodeURIComponent(ageId)}`;
  const j = await fetchJSON(url);
  const rows = j.rows || [];
  if (!tournamentSlug) return rows;
  const filtered = rows.filter(r =>
    matchesTournament(r, tournamentSlug)
  );
  return filtered.length ? filtered : rows;
}

const DEFAULT_SEASON = new Date().getFullYear().toString();

function buildParams(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, value);
  });
  return search.toString();
}

export async function getOverview({ season = DEFAULT_SEASON, userKey } = {}) {
  const qs = buildParams({ overview: "1", season, userKey });
  const url = `${API_BASE}?${qs}`;
  try {
    const data = await fetchJSON(url, { revalidate: true });
    return data;
  } catch (err) {
    console.warn("[api] getOverview failed, returning fallback payload", err);
    return {
      season,
      generatedAt: new Date().toISOString(),
      cards: [],
      announcements: [],
      followPreference: { teams: [], ageGroups: [], season },
      freshness: [],
      availableSeasons: [season],
    };
  }
}

async function postJSON(searchParams, payload) {
  if (!API_BASE) throw new Error("Missing VITE_API_BASE");
  const res = await fetch(`${API_BASE}?${searchParams}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json().catch(() => ({}));
  if (json && json.ok === false) throw new Error(json.error || "API error");
  return json;
}

export async function createDigest({ title, selectedTeams, selectedAgeGroups, ownerUserKey, expiresAt }) {
  const params = buildParams({ digests: "1" });
  const body = {
    title: title || "My Digest",
    selectedTeams: selectedTeams || [],
    selectedAgeGroups: selectedAgeGroups || [],
    ownerUserKey,
    expiresAt,
  };
  return postJSON(params, body);
}

export async function getDigest(token) {
  if (!token) throw new Error("Missing digest token");
  const qs = buildParams({ digest: token });
  const url = `${API_BASE}?${qs}`;
  const data = await fetchJSON(url, { revalidate: false });
  return data;
}

export async function flagFixtureAlert({ fixtureId, alertType, message, flaggedBy, season = DEFAULT_SEASON }) {
  if (!fixtureId || !alertType) {
    throw new Error("fixtureId and alertType are required");
  }
  const params = buildParams({ alerts: "1" });
  return postJSON(params, {
    fixtureId,
    alertType,
    message,
    flaggedBy,
    season,
  });
}

export async function getTournaments({ season = DEFAULT_SEASON } = {}) {
  const qs = buildParams({ tournaments: "1", season });
  const url = `${API_BASE}?${qs}`;
  const data = await fetchJSON(url, { revalidate: true });
  return data;
}

export async function getTournamentDetail(slug) {
  if (!slug) throw new Error("Missing tournament slug");
  const qs = buildParams({ tournament: slug });
  const url = `${API_BASE}?${qs}`;
  const data = await fetchJSON(url, { revalidate: true });
  return data;
}

// Legacy helper (kept for any old imports)
export async function getSheet(sheetName) {
  const url = `${API_BASE}?sheet=${encodeURIComponent(sheetName)}`;
  const j = await fetchJSON(url);
  return j.rows || [];
}

// Manual cache clear (useful after deploy or for a “Refresh data” button)
export function refreshAll() {
  const prefix = `hj:cache:${APP_VER}:`;
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith(prefix)) sessionStorage.removeItem(k);
  }
}

/* ---------- Feedback sender ---------- */

export async function sendFeedback({ name, email, message, route, ageId }) {
  const ua = navigator.userAgent || "";
  const form = new URLSearchParams();
  form.set("name", name || "");
  form.set("email", email || "");
  form.set("message", message || "");
  form.set("route", route || "");
  form.set("ageId", ageId || "");
  form.set("ua", ua);

  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: form.toString(),
  }).catch(() => null); // network fail → handled below

  if (!res) throw new Error("Network error");
  const json = await res.json().catch(() => ({}));
  if (!json || json.ok !== true) {
    throw new Error(json && json.error ? json.error : "Failed to send feedback");
  }
  return true;
}
