import http from "node:http";
import { Pool } from "pg";

const PORT = Number(process.env.PORT) || 8787;
const API_PATH = "/api";
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || "hj-indoor-allstars-2025";
const DATABASE_URL = process.env.DATABASE_URL || "";
// node-postgres does not accept libpq query params like ?sslmode=require.
const DATABASE_URL_PG = DATABASE_URL.split("?")[0];
const APPS_SCRIPT_BASE_URL = process.env.APPS_SCRIPT_BASE_URL || "";
const PROVIDER_MODE = process.env.PROVIDER_MODE === "db" ? "db" : "apps";
const tlsInsecureFlag = (process.env.PG_TLS_INSECURE || "").toLowerCase();
const FIXTURES_CACHE_TTL_MS = 60_000;
const STANDINGS_CACHE_TTL_MS = 60_000;
const fixturesCache = new Map();
const standingsCache = new Map();

if (PROVIDER_MODE === "db" && !DATABASE_URL) {
  console.error("Missing DATABASE_URL for DB API server (PROVIDER_MODE=db).");
  process.exit(1);
}

const ssl =
  PROVIDER_MODE === "db"
    ? { rejectUnauthorized: !["1", "true", "yes"].includes(tlsInsecureFlag) }
    : false;

const pool =
  PROVIDER_MODE === "db"
    ? new Pool({
        connectionString: DATABASE_URL_PG,
        ssl,
      })
    : null;

function sendJson(res, status, payload, { head = false } = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
  });
  if (head) {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
}

// Allow GitHub Pages + local dev to access the API in browsers.
function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowlist = new Set([
    "https://skippies-io.github.io",
    "http://localhost:5173",
  ]);
  if (!origin || !allowlist.has(origin)) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
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

function getFixturesCacheKey(sheet, ageId) {
  return `${sheet}:${ageId}:${PROVIDER_MODE}`;
}

function getCachedFixtures(cacheKey) {
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

function getStandingsCacheKey(sheet, ageId) {
  return `${sheet}:${ageId}:${PROVIDER_MODE}`;
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

async function getGroupsPayload() {
  if (!pool) {
    throw new Error("DB provider disabled");
  }
  const result = await pool.query(
    `SELECT id, label
     FROM groups
     WHERE tournament_id = $1
     ORDER BY id`,
    [TOURNAMENT_ID]
  );
  return { groups: result.rows };
}

async function getFixturesPayload(ageId) {
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
    [TOURNAMENT_ID, ageId]
  );
  return { rows: result.rows.map(mapFixtureRow) };
}

async function getStandingsPayload(ageId) {
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
    [TOURNAMENT_ID, ageId]
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

const server = http.createServer(async (req, res) => {
  try {
    const isHead = req.method === "HEAD";
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/health") {
      if (req.method !== "GET" && !isHead) {
        sendJson(res, 405, { ok: false, error: "Method not allowed" });
        return;
      }
      sendJson(res, 200, { ok: true, service: "hj-api" }, { head: isHead });
      return;
    }
    if (url.pathname === "/version") {
      applyCors(req, res);
      if (req.method !== "GET") {
        sendJson(res, 405, { ok: false, error: "Method not allowed" });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        sha: process.env.BUILD_SHA || "unknown",
        provider: PROVIDER_MODE,
      });
      return;
    }
    if (url.pathname !== API_PATH) {
      sendJson(res, 404, { ok: false, error: "Not found" });
      return;
    }

    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== "GET" && !isHead) {
      sendJson(res, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    const params = url.searchParams;
    if (params.get("groups") === "1") {
      if (PROVIDER_MODE === "db") {
        const payload = await getGroupsPayload();
        sendJson(res, 200, payload, { head: isHead });
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?groups=1`;
        const { status, body } = await fetchAppsJson(targetUrl);
        sendJson(res, status, body, { head: isHead });
      }
      return;
    }

    const sheet = params.get("sheet");
    if (!sheet) {
      sendJson(
        res,
        400,
        { ok: false, error: "Missing sheet parameter" },
        { head: isHead }
      );
      return;
    }
    const ageId = params.get("age") || "";
    if (!ageId) {
      sendJson(
        res,
        400,
        { ok: false, error: "Missing age parameter" },
        { head: isHead }
      );
      return;
    }

    if (sheet === "Fixtures") {
      const cacheKey = getFixturesCacheKey(sheet, ageId);
      const cached = getCachedFixtures(cacheKey);
      if (cached) {
        sendJson(res, 200, cached, { head: isHead });
        return;
      }
      if (PROVIDER_MODE === "db") {
        const payload = await getFixturesPayload(ageId);
        setCachedFixtures(cacheKey, payload);
        sendJson(res, 200, payload, { head: isHead });
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?sheet=Fixtures&age=${encodeURIComponent(ageId)}`;
        const { status, body } = await fetchAppsJson(targetUrl);
        if (status === 200 && !(body && body.ok === false)) {
          setCachedFixtures(cacheKey, body);
        }
        sendJson(res, status, body, { head: isHead });
      }
      return;
    }
    if (sheet === "Standings") {
      const cacheKey = getStandingsCacheKey(sheet, ageId);
      const cached = getCachedStandings(cacheKey);
      if (cached) {
        sendJson(res, 200, cached, { head: isHead });
        return;
      }
      if (PROVIDER_MODE === "db") {
        const payload = await getStandingsPayload(ageId);
        setCachedStandings(cacheKey, payload);
        sendJson(res, 200, payload, { head: isHead });
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?sheet=Standings&age=${encodeURIComponent(ageId)}`;
        const { status, body } = await fetchAppsJson(targetUrl);
        if (status === 200 && !(body && body.ok === false)) {
          setCachedStandings(cacheKey, body);
        }
        sendJson(res, status, body, { head: isHead });
      }
      return;
    }

    sendJson(
      res,
      400,
      { ok: false, error: `Unknown sheet: ${sheet}` },
      { head: isHead }
    );
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { ok: false, error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`DB API server listening on http://localhost:${PORT}${API_PATH}`);
});
