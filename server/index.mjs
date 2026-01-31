import http from "node:http";
import crypto from "node:crypto";
import { Pool } from "pg";

import { handleAdminRequest } from "./admin.mjs";

const PORT = Number(process.env.PORT) || 8787;
const API_PATH = "/api";
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || "hj-indoor-allstars-2025";
let DATABASE_URL = process.env.DATABASE_URL || "";

// Fix: Strip ?sslmode=require if present to force local SSL settings
if (DATABASE_URL.includes("?")) {
  DATABASE_URL = DATABASE_URL.split("?")[0];
}

const APPS_SCRIPT_BASE_URL = process.env.APPS_SCRIPT_BASE_URL || "";
const PROVIDER_MODE = process.env.PROVIDER_MODE === "apps" ? "apps" : "db";
const tlsInsecureFlag = (process.env.PG_TLS_INSECURE || "").toLowerCase();
const BUILD_SHA = process.env.GIT_SHA || process.env.BUILD_SHA || "unknown";
const FIXTURES_CACHE_TTL_MS = 60_000;
const STANDINGS_CACHE_TTL_MS = 60_000;
export const fixturesCache = new Map();
export const standingsCache = new Map();

if (PROVIDER_MODE === "db" && !DATABASE_URL && !process.env.VITEST) {
  console.error("Missing DATABASE_URL for DB API server (PROVIDER_MODE=db).");
  process.exit(1);
}

const databaseHost = (() => {
  if (!DATABASE_URL) return "missing";
  try {
    const url = new URL(DATABASE_URL);
    return url.host || "unknown";
  } catch {
    return "invalid";
  }
})();

console.log(
  [
    "Hockey API server starting",
    `provider: ${PROVIDER_MODE}`,
    `database host: ${databaseHost}`,
    `tournament: ${TOURNAMENT_ID}`,
  ].join("\n")
);

// SSL Fix: For local dev with Supabase/Postgres, often we need rejectUnauthorized: false
// The user explicitly requested this fix.
const ssl =
  PROVIDER_MODE === "db"
    ? { rejectUnauthorized: false }
    : false;

export const pool =
  PROVIDER_MODE === "db"
    ? new Pool({
      connectionString: DATABASE_URL,
      ssl,
    })
    : null;

export function getClientIp(req) {
  const raw = req.headers["x-forwarded-for"];
  const forwarded = Array.isArray(raw) ? raw[0] : raw;
  const first = forwarded ? String(forwarded).split(",")[0].trim() : "";
  const addr = first || req.socket?.remoteAddress || "unknown";
  return addr.startsWith("::ffff:") ? addr.slice("::ffff:".length) : addr;
}

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 120;
export const rateLimitStore = new Map();

export function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    const windowStart = now;
    rateLimitStore.set(ip, { windowStart, count: 1 });
    const resetAtSeconds = Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS) / 1000);
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, RATE_LIMIT_MAX - 1),
      resetAtSeconds,
    };
  }
  entry.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  const resetAtSeconds = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS) / 1000);
  if (entry.count <= RATE_LIMIT_MAX) {
    return { allowed: true, retryAfterSeconds: 0, remaining, resetAtSeconds };
  }
  const resetMs = entry.windowStart + RATE_LIMIT_WINDOW_MS - now;
  return {
    allowed: false,
    retryAfterSeconds: Math.max(0, Math.ceil(resetMs / 1000)),
    remaining: 0,
    resetAtSeconds,
  };
}

export function setCacheHeaders(res, { maxAge, swr, noStore } = {}) {
  if (noStore) {
    res.setHeader("Cache-Control", "no-store");
    return;
  }
  res.setHeader(
    "Cache-Control",
    `public, max-age=${maxAge}, stale-while-revalidate=${swr}`
  );
}

export function sendJson(req, res, status, payload, { cache, head = false } = {}) {
  const body = JSON.stringify(payload);
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (cache) {
    setCacheHeaders(res, cache);
    const etag = `"${crypto.createHash("sha256").update(body).digest("hex")}"`;
    res.setHeader("ETag", etag);
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }
  }

  res.writeHead(status);
  if (head) {
    res.end();
    return;
  }
  res.end(body);
}

// Allow GitHub Pages + local dev to access the API in browsers.
export function applyCors(req, res) {
  const requestOrigin = req.headers.origin || "";
  if (!requestOrigin) return;

  // Sonar taint analysis may treat Origin as user-controlled even after allowlisting.
  // Map to explicit literals so we never reflect header content into the response.
  let allowedOrigin = "";
  switch (requestOrigin) {
    case "https://skippies-io.github.io":
      allowedOrigin = "https://skippies-io.github.io";
      break;
    case "http://localhost:5173":
      allowedOrigin = "http://localhost:5173";
      break;
    default:
      return;
  }

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function mapFixtureRow(row) {
  const score1 = row.score1 == null ? "" : row.score1;
  const score2 = row.score2 == null ? "" : row.score2;
  const hasScores = row.score1 != null && row.score2 != null;
  return {
    Date: row.date,
    Time: row.time || "",
    Team1: row.team1,
    Team2: row.team2,
    Score1: score1,
    Score2: score2,
    Pool: row.pool || "",
    Venue: row.venue || "",
    Round: row.round || "",
    Status: hasScores ? "Final" : "",
    Age: row.age,
    ageId: row.age,
  };
}

function mapStandingsRow(row) {
  // Coerce numeric fields to match specs/contracts/Standings_ReadModel_Contract.md.
  const toNumber = (value) => (value == null ? 0 : Number(value));
  return {
    Team: row.team,
    Rank: toNumber(row.rank),
    Points: toNumber(row.points),
    GF: toNumber(row.gf),
    GA: toNumber(row.ga),
    GD: toNumber(row.gd),
    GP: toNumber(row.gp),
    W: toNumber(row.w),
    D: toNumber(row.d),
    L: toNumber(row.l),
    Pool: row.pool || "",
    Age: row.age,
    ageId: row.age,
  };
}

export function getFixturesCacheKey(sheet, ageId, tournamentId) {
  return `${sheet}:${ageId}:${PROVIDER_MODE}:${tournamentId}`;
}

export function getCachedFixtures(cacheKey) {
  const cached = fixturesCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    fixturesCache.delete(cacheKey);
    return null;
  }
  return cached.payload;
}

function setCachedFixtures(cacheKey, payload) {
  fixturesCache.set(cacheKey, {
    expiresAt: Date.now() + FIXTURES_CACHE_TTL_MS,
    payload,
  });
}

export function getStandingsCacheKey(sheet, ageId, tournamentId) {
  return `${sheet}:${ageId}:${PROVIDER_MODE}:${tournamentId}`;
}

function getCachedStandings(cacheKey) {
  const cached = standingsCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    standingsCache.delete(cacheKey);
    return null;
  }
  return cached.payload;
}

function setCachedStandings(cacheKey, payload) {
  standingsCache.set(cacheKey, {
    expiresAt: Date.now() + STANDINGS_CACHE_TTL_MS,
    payload,
  });
}

async function getGroupsPayload(tournamentId) {
  if (!pool) {
    throw new Error("DB provider disabled");
  }
  const result = await pool.query(
    `SELECT id, label
     FROM groups
     WHERE tournament_id = $1
     ORDER BY id`,
    [tournamentId]
  );
  return { groups: result.rows };
}

async function getFixturesPayload(ageId, tournamentId) {
  if (!pool) {
    throw new Error("DB provider disabled");
  }
  const result = await pool.query(
    `SELECT
       to_char(f.date, 'YYYY-MM-DD') AS date,
       f.time AS time,
       t1.name AS team1,
       t2.name AS team2,
       r.score1 AS score1,
       r.score2 AS score2,
       f.pool AS pool,
       f.venue AS venue,
       f.round AS round,
       f.group_id AS age
     FROM fixture f
     JOIN team t1
       ON t1.tournament_id = f.tournament_id
      AND t1.id = f.team1_id
     JOIN team t2
       ON t2.tournament_id = f.tournament_id
      AND t2.id = f.team2_id
     LEFT JOIN result r
       ON r.tournament_id = f.tournament_id
      AND r.fixture_id = f.id
     WHERE f.tournament_id = $1
       AND f.group_id = $2
     ORDER BY f.date, f.time, f.fixture_key`,
    [tournamentId, ageId]
  );
  return { rows: result.rows.map(mapFixtureRow) };
}

async function getFixturesAllPayload(tournamentId) {
  if (!pool) {
    throw new Error("DB provider disabled");
  }
  const result = await pool.query(
    `SELECT
       to_char(f.date, 'YYYY-MM-DD') AS date,
       f.time AS time,
       t1.name AS team1,
       t2.name AS team2,
       r.score1 AS score1,
       r.score2 AS score2,
       f.pool AS pool,
       f.venue AS venue,
       f.round AS round,
       f.group_id AS age
     FROM fixture f
     JOIN team t1
       ON t1.tournament_id = f.tournament_id
      AND t1.id = f.team1_id
     JOIN team t2
       ON t2.tournament_id = f.tournament_id
      AND t2.id = f.team2_id
     LEFT JOIN result r
       ON r.tournament_id = f.tournament_id
      AND r.fixture_id = f.id
     WHERE f.tournament_id = $1
     ORDER BY f.date, f.time, f.fixture_key`,
    [tournamentId]
  );
  return { rows: result.rows.map(mapFixtureRow) };
}

async function getStandingsPayload(ageId, tournamentId) {
  if (!pool) {
    throw new Error("DB provider disabled");
  }
  const result = await pool.query(
    `SELECT
       "Team" AS team,
       "Rank" AS rank,
       "Points" AS points,
       "GF" AS gf,
       "GA" AS ga,
       "GD" AS gd,
       "GP" AS gp,
       "W" AS w,
       "D" AS d,
       "L" AS l,
       "Pool" AS pool,
       "Age" AS age
     FROM v1_standings
     WHERE tournament_id = $1
       AND "Age" = $2
     ORDER BY "Pool", "Rank", "Team"`,
    [tournamentId, ageId]
  );
  return { rows: result.rows.map(mapStandingsRow) };
}

async function getStandingsAllPayload(tournamentId) {
  if (!pool) {
    throw new Error("DB provider disabled");
  }
  const result = await pool.query(
    `SELECT
       "Team" AS team,
       "Rank" AS rank,
       "Points" AS points,
       "GF" AS gf,
       "GA" AS ga,
       "GD" AS gd,
       "GP" AS gp,
       "W" AS w,
       "D" AS d,
       "L" AS l,
       "Pool" AS pool,
       "Age" AS age
     FROM v1_standings
     WHERE tournament_id = $1
     ORDER BY "Pool", "Rank", "Team"`,
    [tournamentId]
  );
  return { rows: result.rows.map(mapStandingsRow) };
}

async function fetchAppsJson(targetUrl) {
  if (!APPS_SCRIPT_BASE_URL) {
    return {
      status: 500,
      body: { ok: false, error: "Missing APPS_SCRIPT_BASE_URL for apps mode" },
    };
  }

  const upstream = await fetch(targetUrl, {
    headers: { Accept: "application/json" },
  });
  try {
    const body = await upstream.json();
    return { status: upstream.status, body };
  } catch {
    const text = await upstream.text().catch(() => "");
    const bodySnippet = text.slice(0, 200);
    return {
      status: upstream.status,
      body: {
        ok: false,
        error: "Upstream non-JSON response",
        status: upstream.status,
        bodySnippet,
      },
    };
  }
}

export const requestHandler = async (req, res) => {
  try {
    const isHead = req.method === "HEAD";
    const url = new URL(req.url, `http://${req.headers.host}`);
    console.log("Incoming Request:", req.method, url.pathname); // DEBUG
    const isOptions = req.method === "OPTIONS";
    const isHealth = url.pathname === "/health";

    if (!isOptions && !isHealth) {
      const ip = getClientIp(req);
      const limit = checkRateLimit(ip);
      res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
      res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
      res.setHeader("X-RateLimit-Reset", String(limit.resetAtSeconds));
      if (!limit.allowed) {
        res.setHeader("Retry-After", String(limit.retryAfterSeconds));
        sendJson(req, res, 429, { ok: false, error: "rate_limited" });
        return;
      }
    }
    if (url.pathname === "/health") {
      if (req.method !== "GET" && !isHead) {
        sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
        return;
      }
      sendJson(
        req,
        res,
        200,
        { ok: true, service: "hj-api" },
        { head: isHead, cache: { noStore: true } }
      );
      return;
    }
    if (url.pathname === "/version") {
      applyCors(req, res);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method !== "GET" && !isHead) {
        sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
        return;
      }
      sendJson(
        req,
        res,
        200,
        {
          ok: true,
          sha: BUILD_SHA,
          provider: PROVIDER_MODE,
        },
        { head: isHead, cache: { maxAge: 60, swr: 300 } }
      );
      return;
    }
    // Admin Routes
    if (url.pathname.startsWith("/api/admin")) {
      await handleAdminRequest(req, res, { url, pool, sendJson });
      return;
    }

    // Public Announcements (New)
    if (url.pathname === "/api/announcements") {
      applyCors(req, res);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method !== "GET" && !isHead) {
        sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
        return;
      }

      const tournamentId = url.searchParams.get("tournamentId"); // Optional

      if (PROVIDER_MODE === "db") {
        try {
          if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
          const result = await pool.query(
            `SELECT * FROM announcements 
             WHERE is_published = true 
               AND (tournament_id IS NULL OR tournament_id = $1)
             ORDER BY created_at DESC`,
            [tournamentId]
          );
          sendJson(req, res, 200, { ok: true, data: result.rows }, { head: isHead, cache: { maxAge: 60, swr: 300 } });
        } catch (e) {
          console.error(e);
          sendJson(req, res, 500, { ok: false, error: "DB Error" });
        }
      } else {
        sendJson(req, res, 501, { ok: false, error: "Not implemented for Apps Script provider" });
      }
      return;
    }


    // Tournaments List (New)
    if (url.pathname === "/api/tournaments") {
      applyCors(req, res);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method !== "GET" && !isHead) {
        sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
        return;
      }

      if (PROVIDER_MODE === "db") {
        try {
          if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
          // Fetch from the actual tournament table now that we know it exists
          const result = await pool.query(
            `SELECT id, name FROM tournament ORDER BY created_at DESC`
          );
          sendJson(req, res, 200, { ok: true, data: result.rows }, { head: isHead, cache: { maxAge: 300, swr: 3600 } });
        } catch (e) {
          console.error(e);
          sendJson(req, res, 500, { ok: false, error: "DB Error" });
        }
      } else {
        // Apps Script mode fallback (not implemented for multi-tournament yet)
        sendJson(req, res, 501, { ok: false, error: "Not implemented for Apps Script provider" });
      }
      return;
    }

    if (url.pathname !== API_PATH) {
      sendJson(req, res, 404, { ok: false, error: "Not found" });
      return;
    }

    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== "GET" && !isHead) {
      sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    const params = url.searchParams;
    const reqTournamentId = params.get("tournamentId") || TOURNAMENT_ID;

    if (params.get("groups") === "1") {
      if (PROVIDER_MODE === "db") {
        const payload = await getGroupsPayload(reqTournamentId);
        sendJson(req, res, 200, payload, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?groups=1`; // Legacy fallback ignores tournamentId
        const { status, body } = await fetchAppsJson(targetUrl);
        sendJson(req, res, status, body, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      }
      return;
    }

    const sheet = params.get("sheet");
    if (!sheet) {
      sendJson(
        req,
        res,
        400,
        { ok: false, error: "Missing sheet parameter" },
        { head: isHead }
      );
      return;
    }
    const ageId = params.get("age") || "";

    if (sheet === "Fixtures") {
      if (!ageId) {
        sendJson(
          req,
          res,
          400,
          { ok: false, error: "Missing age parameter" },
          { head: isHead }
        );
        return;
      }
      // Include tournamentID in cache key
      const cacheKey = getFixturesCacheKey(sheet, ageId, reqTournamentId);
      const cached = getCachedFixtures(cacheKey);
      if (cached) {
        sendJson(req, res, 200, cached, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
        return;
      }
      if (PROVIDER_MODE === "db") {
        const payload = await getFixturesPayload(ageId, reqTournamentId);
        setCachedFixtures(cacheKey, payload);
        sendJson(req, res, 200, payload, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?sheet=Fixtures&age=${encodeURIComponent(ageId)}`;
        const { status, body } = await fetchAppsJson(targetUrl);
        if (status === 200 && !(body && body.ok === false)) {
          setCachedFixtures(cacheKey, body);
        }
        sendJson(req, res, status, body, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      }
      return;
    }
    if (sheet === "Standings") {
      if (!ageId) {
        sendJson(
          req,
          res,
          400,
          { ok: false, error: "Missing age parameter" },
          { head: isHead }
        );
        return;
      }
      const cacheKey = getStandingsCacheKey(sheet, ageId, reqTournamentId);
      const cached = getCachedStandings(cacheKey);
      if (cached) {
        sendJson(req, res, 200, cached, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
        return;
      }
      if (PROVIDER_MODE === "db") {
        const payload = await getStandingsPayload(ageId, reqTournamentId);
        setCachedStandings(cacheKey, payload);
        sendJson(req, res, 200, payload, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?sheet=Standings&age=${encodeURIComponent(ageId)}`;
        const { status, body } = await fetchAppsJson(targetUrl);
        if (status === 200 && !(body && body.ok === false)) {
          setCachedStandings(cacheKey, body);
        }
        sendJson(req, res, status, body, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      }
      return;
    }
    if (sheet === "Fixtures_All") {
      const cacheKey = getFixturesCacheKey(sheet, "all", reqTournamentId);
      const cached = getCachedFixtures(cacheKey);
      if (cached) {
        sendJson(req, res, 200, cached, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
        return;
      }
      if (PROVIDER_MODE === "db") {
        const payload = await getFixturesAllPayload(reqTournamentId);
        setCachedFixtures(cacheKey, payload);
        sendJson(req, res, 200, payload, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?sheet=Fixtures_All`;
        const { status, body } = await fetchAppsJson(targetUrl);
        if (status === 200 && !(body && body.ok === false)) {
          setCachedFixtures(cacheKey, body);
        }
        sendJson(req, res, status, body, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      }
      return;
    }
    if (sheet === "Standings_All") {
      const cacheKey = getStandingsCacheKey(sheet, "all", reqTournamentId);
      const cached = getCachedStandings(cacheKey);
      if (cached) {
        sendJson(req, res, 200, cached, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
        return;
      }
      if (PROVIDER_MODE === "db") {
        const payload = await getStandingsAllPayload(reqTournamentId);
        setCachedStandings(cacheKey, payload);
        sendJson(req, res, 200, payload, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?sheet=Standings_All`;
        const { status, body } = await fetchAppsJson(targetUrl);
        if (status === 200 && !(body && body.ok === false)) {
          setCachedStandings(cacheKey, body);
        }
        sendJson(req, res, status, body, {
          head: isHead,
          cache: { maxAge: 30, swr: 300 },
        });
      }
      return;
    }

    sendJson(
      req,
      res,
      400,
      { ok: false, error: `Unknown sheet: ${sheet}` },
      { head: isHead }
    );
  } catch (err) {
    console.error(err);
    sendJson(req, res, 500, { ok: false, error: "Server error" });
  }
};

export const server = http.createServer(requestHandler);

if (!process.env.VITEST) {
  server.listen(PORT, () => {
    console.log(`DB API server listening on http://localhost:${PORT}${API_PATH}`);
  });
}
