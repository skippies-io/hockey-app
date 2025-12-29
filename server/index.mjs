import http from "node:http";
import { Pool } from "pg";

const PORT = Number(process.env.PORT) || 8787;
const API_PATH = "/api";
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || "hj-indoor-allstars-2025";
const DATABASE_URL = process.env.DATABASE_URL || "";
const APPS_SCRIPT_BASE_URL = process.env.APPS_SCRIPT_BASE_URL || "";
const PROVIDER_MODE = process.env.PROVIDER_MODE === "db" ? "db" : "apps";

if (PROVIDER_MODE === "db" && !DATABASE_URL) {
  console.error("Missing DATABASE_URL for DB API server (PROVIDER_MODE=db).");
  process.exit(1);
}

const pool =
  PROVIDER_MODE === "db" ? new Pool({ connectionString: DATABASE_URL }) : null;

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function handleOptions(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end();
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

async function handleGroups(res) {
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
  sendJson(res, 200, { groups: result.rows });
}

async function handleFixtures(res, ageId) {
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
  sendJson(res, 200, { rows: result.rows.map(mapFixtureRow) });
}

async function handleStandings(res, ageId) {
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
  sendJson(res, 200, { rows: result.rows.map(mapStandingsRow) });
}

async function proxyApps(res, targetUrl) {
  if (!APPS_SCRIPT_BASE_URL) {
    sendJson(res, 500, {
      ok: false,
      error: "Missing APPS_SCRIPT_BASE_URL for apps mode",
    });
    return;
  }
  const upstream = await fetch(targetUrl, {
    headers: { Accept: "application/json" },
  });
  try {
    const body = await upstream.json();
    sendJson(res, upstream.status, body);
  } catch {
    const text = await upstream.text().catch(() => "");
    const bodySnippet = text.slice(0, 200);
    sendJson(res, upstream.status, {
      ok: false,
      error: "Upstream non-JSON response",
      status: upstream.status,
      bodySnippet,
    });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      handleOptions(res);
      return;
    }
    if (req.method !== "GET") {
      sendJson(res, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== API_PATH) {
      sendJson(res, 404, { ok: false, error: "Not found" });
      return;
    }

    const params = url.searchParams;
    if (params.get("groups") === "1") {
      if (PROVIDER_MODE === "db") {
        await handleGroups(res);
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?groups=1`;
        await proxyApps(res, targetUrl);
      }
      return;
    }

    const sheet = params.get("sheet");
    if (!sheet) {
      sendJson(res, 400, { ok: false, error: "Missing sheet parameter" });
      return;
    }
    const ageId = params.get("age") || "";
    if (!ageId) {
      sendJson(res, 400, { ok: false, error: "Missing age parameter" });
      return;
    }

    if (sheet === "Fixtures") {
      if (PROVIDER_MODE === "db") {
        await handleFixtures(res, ageId);
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?sheet=Fixtures&age=${encodeURIComponent(ageId)}`;
        await proxyApps(res, targetUrl);
      }
      return;
    }
    if (sheet === "Standings") {
      if (PROVIDER_MODE === "db") {
        await handleStandings(res, ageId);
      } else {
        const targetUrl = `${APPS_SCRIPT_BASE_URL}?sheet=Standings&age=${encodeURIComponent(ageId)}`;
        await proxyApps(res, targetUrl);
      }
      return;
    }

    sendJson(res, 400, { ok: false, error: `Unknown sheet: ${sheet}` });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { ok: false, error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`DB API server listening on http://localhost:${PORT}${API_PATH}`);
});
