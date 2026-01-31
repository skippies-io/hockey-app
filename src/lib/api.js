// src/lib/api.js
const PROVIDER = import.meta.env.VITE_PROVIDER || "db";
export const API_BASE =
  PROVIDER === "db" ? import.meta.env.VITE_DB_API_BASE : import.meta.env.VITE_API_BASE;
export const DB_API_BASE = import.meta.env.VITE_DB_API_BASE;
const APP_VER = import.meta.env.VITE_APP_VERSION || "v1";
const MAX_AGE_MS = 60_000; // 60s client-side cache
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const DEFAULT_RETRY = { retries: 2, baseDelayMs: 300 };

function cacheKey(url) { return `hj:cache:${APP_VER}:${url}`; }

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function tournamentsEndpoint() {
  // Prefer an explicit API base (db or apps), otherwise fall back to same-origin.
  const base = API_BASE || import.meta.env.VITE_API_BASE || import.meta.env.VITE_DB_API_BASE;

  // If no env base is configured (common in tests), use same-origin.
  if (!base) return "/api/tournaments";

  // Normalize to origin (strip trailing /api if present)
  const origin = String(base).replace(/\/api\/?$/, "");
  return `${origin}/api/tournaments`;
}

async function fetchWithRetry(url, retryOptions = {}) {
  const { retries, baseDelayMs } = { ...DEFAULT_RETRY, ...retryOptions };
  let attempt = 0;

  while (true) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res;
    } catch (err) {
      const status = err && err.status;
      const isNetworkError = err instanceof TypeError;
      const shouldRetry =
        (status && RETRYABLE_STATUS.has(status)) || isNetworkError;
      if (!shouldRetry || attempt >= retries) throw err;
      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay);
      attempt += 1;
    }
  }
}

async function fetchJSON(url, { revalidate = true, retry } = {}) {
  if (!API_BASE) {
    throw new Error(`Missing API base for provider: ${PROVIDER}`);
  }

  const key = cacheKey(url);
  const cached = sessionStorage.getItem(key);
  if (cached) {
    try {
      const { t, data } = JSON.parse(cached);
      // serve fresh
      if (Date.now() - t < MAX_AGE_MS) return data;

      // stale-while-revalidate (background refresh)
      if (revalidate) {
        void fetch(url)
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(nd => {
            if (nd) sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data: nd }));
          })
          .catch(() => { /* background refresh failed; keep stale */ });
      }
      return data; // stale but immediate
    } catch {
      // Bad JSON in cache → ignore and refetch below
    }
  }

  const res = retry
    ? await fetchWithRetry(url, retry === true ? DEFAULT_RETRY : retry)
    : await fetch(url);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
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

export async function getGroups(tournamentId) {
  const t = tournamentId ? `&tournamentId=${encodeURIComponent(tournamentId)}` : "";
  const url = `${API_BASE}?groups=1${t}`;
  const j = await fetchJSON(url);
  // normalise to {id, label} and sort
  return (j.groups || [])
    .map(g => ({ id: g.id, label: g.label }))
    .sort(sortGroups);
}

export async function getStandingsRows(tournamentId, ageId) {
  const t = tournamentId ? `&tournamentId=${encodeURIComponent(tournamentId)}` : "";
  const url = `${API_BASE}?sheet=Standings&age=${encodeURIComponent(ageId)}${t}`;
  const j = await fetchJSON(url, { retry: true });
  return j.rows || [];
}

export async function getFixturesRows(tournamentId, ageId) {
  const t = tournamentId ? `&tournamentId=${encodeURIComponent(tournamentId)}` : "";
  const url = `${API_BASE}?sheet=Fixtures&age=${encodeURIComponent(ageId)}${t}`;
  const j = await fetchJSON(url, { retry: true });
  return j.rows || [];
}

export async function getFranchises(tournamentId) {
  const t = tournamentId ? `&tournamentId=${encodeURIComponent(tournamentId)}` : "";
  const url = `${API_BASE}?sheet=Franchises${t}`;
  const j = await fetchJSON(url, { retry: true });
  return j.rows || [];
}

export async function getAnnouncements(tournamentId) {
  const t = tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : "";
  // Ensure we hit the API base correctly. If API_BASE has query params (like in legacy), this might fail.
  // Assuming API_BASE is just the origin for DB mode.
  // Ideally, use '/api/announcements' relative if on same domain or construct properly.

  // Reuse fetchJSON logic but we need to construct the URL carefully if API_BASE is strange.
  // For DB mode, API_BASE is usually just the host url.

  // Robust construction:
  let baseUrl = API_BASE || "/api";
  if (baseUrl.includes("?")) baseUrl = baseUrl.split("?")[0];
  // Remove trailing specific path if strictly endpoint based, but API_BASE usually = endpoint for apps script.
  // For DB mode, let's assume relative path /api/announcements is safer if we are proxied.
  // But let's stick to the pattern:

  const url = `${baseUrl.replace(/\/api\/?$/, "")}/api/announcements${t}`;
  try {
    const j = await fetchJSON(url, { revalidate: true });
    return j.data || [];
  } catch (e) {
    console.error("Failed to fetch announcements", e);
    return [];
  }
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
