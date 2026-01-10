#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE = `
Usage: node scripts/ingest.mjs [options]

Options:
  --database-url       Postgres connection string (or set DATABASE_URL)
  --tournament-id      Tournament id (default: hj-indoor-allstars-2025)
  --fixtures-sheet-id  Fixtures Google Sheet ID
  --teams-sheet-id     Teams/Standings Google Sheet ID
  --api-base           Apps Script base URL (optional; falls back to CSV)
  --debug-args         Print parsed args and resolved provider choice
  --commit             Write to DB (default: false)
  --report-dir         Output reports directory (default: reports/ingestion)
  --limit-groups       Comma-separated group ids to include (optional)
  --export-dir         Output directory for CSV exports (optional)
`;

const DEFAULTS = {
  tournamentId: "hj-indoor-allstars-2025",
  fixturesSheetId: "1TT9CHE-L_HmrXuuVGGJy1_p4PYkw-IXkhcTt84UdUEU",
  teamsSheetId: "1BFHC_NmY7CIlTvMopE-9BftnSzOA2AJpQ37tqnXZnTs",
  reportDir: "reports/ingestion",
};

function parseArgs(argv) {
  const out = { commit: false };
  const boolKeys = new Set(["commit", "debugArgs", "help"]);
  const normalizeKey = (rawKey) =>
    rawKey.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase());
  const setValue = (rawKey, value) => {
    const key = normalizeKey(rawKey);
    out[key] = value;
    if (key !== rawKey) out[rawKey] = value;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const rawKeyValue = arg.slice(2);
    const eqIndex = rawKeyValue.indexOf("=");
    const rawKey = eqIndex === -1 ? rawKeyValue : rawKeyValue.slice(0, eqIndex);
    const key = normalizeKey(rawKey);
    const hasEquals = eqIndex !== -1;
    const inlineValue = hasEquals ? rawKeyValue.slice(eqIndex + 1) : undefined;

    if (boolKeys.has(key)) {
      if (!hasEquals) {
        setValue(rawKey, true);
      } else if (inlineValue === "false") {
        setValue(rawKey, false);
      } else if (inlineValue === "true") {
        setValue(rawKey, true);
      } else {
        setValue(rawKey, true);
      }
      continue;
    }
    if (hasEquals) {
      setValue(rawKey, inlineValue);
      continue;
    }

    const val = argv[i + 1];
    if (!val || val.startsWith("--")) continue;
    setValue(rawKey, val);
    i += 1;
  }
  return out;
}

function hashString(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slug(input) {
  const base = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const digest = hashString(String(input)).slice(0, 12);
  return base ? `${base}-${digest}` : digest;
}

function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(current);
      current = "";
      continue;
    }
    if (ch === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    current += ch;
  }
  row.push(current);
  rows.push(row);
  return rows;
}

function csvToObjects(text) {
  const rows = parseCsv(text).filter((r) =>
    r.some((c) => String(c).trim() !== "")
  );
  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h || "").trim());
  const data = [];
  for (let i = 1; i < rows.length; i += 1) {
    const obj = {};
    const row = rows[i];
    header.forEach((h, idx) => {
      if (!h) return;
      obj[h] = row[idx] != null ? String(row[idx]).trim() : "";
    });
    data.push(obj);
  }
  return data;
}

function csvEscape(value) {
  const raw = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function writeCsvFile(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function isPlaceholderTeam(name) {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  if (!n) return false;
  if (/^\d+(st|nd|rd|th)\s+place$/.test(n)) return true;
  if (n.startsWith("winner ") || n.startsWith("loser ")) return true;
  if (/^[ab][1-4]$/.test(n)) return true;
  if (n.includes("runner up")) return true;
  return false;
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const cleaned = raw
    .replace(/\s+-\s+.*$/i, "")
    .replace(/^(\d{1,2})(st|nd|rd|th)\b/i, "$1");
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeScore(value) {
  const raw = value == null ? "" : String(value).trim();
  if (raw === "") return "";
  const num = Number(raw);
  if (Number.isNaN(num)) return "";
  return num;
}

function normalizeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function isPgTlsInsecure() {
  const raw = String(process.env.PG_TLS_INSECURE || "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function getSupabaseCaCertPath() {
  const raw = String(process.env.SUPABASE_CA_CERT || "").trim();
  return raw ? raw : "";
}

function reportPath(reportDir, commit) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = commit ? "commit" : "preview";
  return path.join(reportDir, `${stamp}_${suffix}.json`);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchCsv(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function loadFromApi({ apiBase, limitGroups }) {
  const source = "AppsScript";
  const groupJson = await fetchJson(`${apiBase}?groups=1`);
  const groups = (groupJson.groups || []).map((g) => ({
    id: String(g.id || "").trim(),
    label: String(g.label || "").trim(),
  }));
  const filteredGroups = limitGroups?.length
    ? groups.filter((g) => limitGroups.includes(g.id))
    : groups;

  const fixturesByGroup = new Map();
  const standingsByGroup = new Map();

  for (const group of filteredGroups) {
    const fixturesJson = await fetchJson(
      `${apiBase}?sheet=Fixtures&age=${encodeURIComponent(group.id)}`
    );
    const standingsJson = await fetchJson(
      `${apiBase}?sheet=Standings&age=${encodeURIComponent(group.id)}`
    );
    fixturesByGroup.set(group.id, fixturesJson.rows || []);
    standingsByGroup.set(group.id, standingsJson.rows || []);
  }

  return { source, groups: filteredGroups, fixturesByGroup, standingsByGroup };
}

function deriveGroupsFromRows(rows) {
  const seen = new Map();
  for (const row of rows) {
    const id = String(row.ageId || row.Age || row.age || "").trim();
    if (!id) continue;
    if (!seen.has(id)) {
      seen.set(id, { id, label: id });
    }
  }
  return Array.from(seen.values());
}

async function loadFromCsv({ fixturesSheetId, teamsSheetId, limitGroups }) {
  const source = "SheetsCSV";
  const fixturesText = await fetchCsv(fixturesSheetId);
  const standingsText = await fetchCsv(teamsSheetId);

  const fixtureRows = csvToObjects(fixturesText);
  const standingsRows = csvToObjects(standingsText);

  const groups = deriveGroupsFromRows([...fixtureRows, ...standingsRows]);
  const filteredGroups = limitGroups?.length
    ? groups.filter((g) => limitGroups.includes(g.id))
    : groups;
  const allow = new Set(filteredGroups.map((g) => g.id));

  const fixturesByGroup = new Map();
  const standingsByGroup = new Map();

  for (const row of fixtureRows) {
    const ageId = String(row.ageId || row.Age || row.age || "").trim();
    if (!ageId || (allow.size && !allow.has(ageId))) continue;
    if (!fixturesByGroup.has(ageId)) fixturesByGroup.set(ageId, []);
    fixturesByGroup.get(ageId).push(row);
  }

  for (const row of standingsRows) {
    const ageId = String(row.ageId || row.Age || row.age || "").trim();
    if (!ageId || (allow.size && !allow.has(ageId))) continue;
    if (!standingsByGroup.has(ageId)) standingsByGroup.set(ageId, []);
    standingsByGroup.get(ageId).push(row);
  }

  return { source, groups: filteredGroups, fixturesByGroup, standingsByGroup };
}

function validateGroups(groups, errors) {
  for (const g of groups) {
    if (!g.id) errors.push(`Group missing id`);
    if (!g.label) errors.push(`Group ${g.id || "(unknown)"} missing label`);
  }
}

function buildTeams({ tournamentId, standingsByGroup, fixturesByGroup }) {
  const teams = new Map();
  const byGroup = new Map();

  function upsertTeam(groupId, name, isPlaceholder) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    const id = slug(`${tournamentId}:${groupId}:${trimmed}`);
    const key = `${groupId}:${id}`;
    if (!teams.has(key)) {
      teams.set(key, {
        id,
        group_id: groupId,
        name: trimmed,
        is_placeholder: !!isPlaceholder,
      });
      if (!byGroup.has(groupId)) byGroup.set(groupId, []);
      byGroup.get(groupId).push(id);
    }
  }

  for (const [groupId, rows] of standingsByGroup.entries()) {
    for (const row of rows) {
      const teamName = row.Team || row.team || "";
      if (!teamName) continue;
      upsertTeam(groupId, teamName, isPlaceholderTeam(teamName));
    }
  }

  const missingTeams = [];

  for (const [groupId, rows] of fixturesByGroup.entries()) {
    for (const row of rows) {
      const t1 = String(row.Team1 || row.team1 || "").trim();
      const t2 = String(row.Team2 || row.team2 || "").trim();
      if (t1) {
        const id = slug(`${tournamentId}:${groupId}:${t1}`);
        const key = `${groupId}:${id}`;
        if (!teams.has(key)) {
          missingTeams.push({ groupId, team: t1 });
          upsertTeam(groupId, t1, isPlaceholderTeam(t1));
        }
      }
      if (t2) {
        const id = slug(`${tournamentId}:${groupId}:${t2}`);
        const key = `${groupId}:${id}`;
        if (!teams.has(key)) {
          missingTeams.push({ groupId, team: t2 });
          upsertTeam(groupId, t2, isPlaceholderTeam(t2));
        }
      }
    }
  }

  return { teams: Array.from(teams.values()), missingTeams };
}

function buildFixtures({ tournamentId, fixturesByGroup, errors }) {
  const fixtures = [];
  const duplicates = [];
  const seenKeys = new Set();

  for (const [groupId, rows] of fixturesByGroup.entries()) {
    let lastValidDate = "";
    for (const row of rows) {
      const dateRaw = String(row.Date ?? "").trim();
      let date = "";
      if (dateRaw) {
        date = normalizeDate(dateRaw);
        if (!date) {
          continue;
        }
        lastValidDate = date;
      } else if (lastValidDate) {
        date = lastValidDate;
      } else {
        continue;
      }
      const time = String(row.Time ?? "").trim() || "";
      const team1 = String(row.Team1 || "").trim();
      const team2 = String(row.Team2 || "").trim();
      if (!team1 || !team2) {
        // S25 layout can include non-fixture rows with dates but no teams.
        continue;
      }

      const venue = String(row.Venue || "").trim();
      const round = String(row.Round || "").trim();
      const pool = String(row.Pool || "").trim();

      const fixtureKey = `${date}|${time}|${team1}|${team2}|${venue}|${round}|${pool}`;
      const dedupeKey = `${groupId}:${fixtureKey}`;
      if (seenKeys.has(dedupeKey)) {
        duplicates.push({ groupId, fixtureKey });
        continue;
      }
      seenKeys.add(dedupeKey);

      const id = slug(`${tournamentId}:${groupId}:${fixtureKey}`);

      fixtures.push({
        id,
        group_id: groupId,
        date,
        time: time || "",
        venue,
        round,
        pool,
        team1,
        team2,
        fixture_key: fixtureKey,
        score1: normalizeScore(row.Score1),
        score2: normalizeScore(row.Score2),
        status: String(row.Status || "").trim(),
      });
    }
  }

  return { fixtures, duplicates };
}

function buildResults(fixtures) {
  return fixtures.map((fx) => {
    const hasScores = fx.score1 !== "" && fx.score2 !== "";
    const status = hasScores ? "Final" : "";
    return {
      fixture_id: fx.id,
      score1: fx.score1 === "" ? null : fx.score1,
      score2: fx.score2 === "" ? null : fx.score2,
      status,
    };
  });
}

async function writeReport(reportDir, payload) {
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = reportPath(reportDir, payload.meta.commit);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  return outPath;
}

async function upsertAll({
  databaseUrl,
  tournamentId,
  source,
  groups,
  teams,
  fixtures,
  results,
}) {
  const pgTlsInsecure = isPgTlsInsecure();
  const supabaseCaCertPath = getSupabaseCaCertPath();
  const ssl =
    supabaseCaCertPath
      ? {
          ca: fs.readFileSync(supabaseCaCertPath, "utf8"),
          rejectUnauthorized: true,
        }
      : pgTlsInsecure
      ? { rejectUnauthorized: false }
      : undefined;
  const client = new Client({ connectionString: databaseUrl, ssl });
  await client.connect();

  const now = new Date().toISOString();

  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO tournament (id, name, created_at, source, source_row_hash, ingested_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, source = EXCLUDED.source, source_row_hash = EXCLUDED.source_row_hash, ingested_at = EXCLUDED.ingested_at`,
      [tournamentId, tournamentId, now, source, hashString(tournamentId), now]
    );

    for (const g of groups) {
      const rowHash = hashString(stableStringify(g));
      await client.query(
        `INSERT INTO groups (tournament_id, id, label, created_at, source, source_row_hash, ingested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tournament_id, id) DO UPDATE SET label = EXCLUDED.label, source = EXCLUDED.source, source_row_hash = EXCLUDED.source_row_hash, ingested_at = EXCLUDED.ingested_at`,
        [tournamentId, g.id, g.label, now, source, rowHash, now]
      );
    }

    for (const t of teams) {
      const rowHash = hashString(stableStringify(t));
      await client.query(
        `INSERT INTO team (tournament_id, id, group_id, name, is_placeholder, created_at, source, source_row_hash, ingested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (tournament_id, id) DO UPDATE SET name = EXCLUDED.name, is_placeholder = EXCLUDED.is_placeholder, source = EXCLUDED.source, source_row_hash = EXCLUDED.source_row_hash, ingested_at = EXCLUDED.ingested_at`,
        [
          tournamentId,
          t.id,
          t.group_id,
          t.name,
          t.is_placeholder,
          now,
          source,
          rowHash,
          now,
        ]
      );
    }

    for (const f of fixtures) {
      const rowHash = hashString(stableStringify(f));
      const team1Id = slug(`${tournamentId}:${f.group_id}:${f.team1}`);
      const team2Id = slug(`${tournamentId}:${f.group_id}:${f.team2}`);
      await client.query(
        `INSERT INTO fixture (tournament_id, id, group_id, date, time, venue, round, pool, team1_id, team2_id, fixture_key, created_at, source, source_row_hash, ingested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (tournament_id, id) DO UPDATE SET date = EXCLUDED.date, time = EXCLUDED.time, venue = EXCLUDED.venue, round = EXCLUDED.round, pool = EXCLUDED.pool, team1_id = EXCLUDED.team1_id, team2_id = EXCLUDED.team2_id, fixture_key = EXCLUDED.fixture_key, source = EXCLUDED.source, source_row_hash = EXCLUDED.source_row_hash, ingested_at = EXCLUDED.ingested_at`,
        [
          tournamentId,
          f.id,
          f.group_id,
          f.date,
          f.time,
          f.venue,
          f.round,
          f.pool,
          team1Id,
          team2Id,
          f.fixture_key,
          now,
          source,
          rowHash,
          now,
        ]
      );
    }

    for (const r of results) {
      const rowHash = hashString(stableStringify(r));
      await client.query(
        `INSERT INTO result (tournament_id, fixture_id, score1, score2, status, updated_at, source, source_row_hash, ingested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (tournament_id, fixture_id) DO UPDATE SET score1 = EXCLUDED.score1, score2 = EXCLUDED.score2, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at, source = EXCLUDED.source, source_row_hash = EXCLUDED.source_row_hash, ingested_at = EXCLUDED.ingested_at`,
        [
          tournamentId,
          r.fixture_id,
          r.score1,
          r.score2,
          r.status,
          now,
          source,
          rowHash,
          now,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

function exportToCsv({
  exportDir,
  tournamentId,
  source,
  groups,
  teams,
  fixtures,
  results,
}) {
  const now = new Date().toISOString();
  fs.mkdirSync(exportDir, { recursive: true });

  writeCsvFile(
    path.join(exportDir, "tournament.csv"),
    ["id", "name", "created_at", "source", "source_row_hash", "ingested_at"],
    [
      [
        tournamentId,
        tournamentId,
        now,
        source,
        hashString(tournamentId),
        now,
      ],
    ]
  );

  writeCsvFile(
    path.join(exportDir, "groups.csv"),
    [
      "tournament_id",
      "id",
      "label",
      "created_at",
      "source",
      "source_row_hash",
      "ingested_at",
    ],
    groups.map((g) => [
      tournamentId,
      g.id,
      g.label,
      now,
      source,
      hashString(stableStringify(g)),
      now,
    ])
  );

  writeCsvFile(
    path.join(exportDir, "team.csv"),
    [
      "tournament_id",
      "id",
      "group_id",
      "name",
      "is_placeholder",
      "created_at",
      "source",
      "source_row_hash",
      "ingested_at",
    ],
    teams.map((t) => [
      tournamentId,
      t.id,
      t.group_id,
      t.name,
      t.is_placeholder,
      now,
      source,
      hashString(stableStringify(t)),
      now,
    ])
  );

  writeCsvFile(
    path.join(exportDir, "fixture.csv"),
    [
      "tournament_id",
      "id",
      "group_id",
      "date",
      "time",
      "venue",
      "round",
      "pool",
      "team1_id",
      "team2_id",
      "fixture_key",
      "created_at",
      "source",
      "source_row_hash",
      "ingested_at",
    ],
    fixtures.map((f) => [
      tournamentId,
      f.id,
      f.group_id,
      f.date,
      f.time,
      f.venue,
      f.round,
      f.pool,
      slug(`${tournamentId}:${f.group_id}:${f.team1}`),
      slug(`${tournamentId}:${f.group_id}:${f.team2}`),
      f.fixture_key,
      now,
      source,
      hashString(stableStringify(f)),
      now,
    ])
  );

  writeCsvFile(
    path.join(exportDir, "result.csv"),
    [
      "tournament_id",
      "fixture_id",
      "score1",
      "score2",
      "status",
      "updated_at",
      "source",
      "source_row_hash",
      "ingested_at",
    ],
    results.map((r) => [
      tournamentId,
      r.fixture_id,
      r.score1 === null ? "" : r.score1,
      r.score2 === null ? "" : r.score2,
      r.status,
      now,
      source,
      hashString(stableStringify(r)),
      now,
    ])
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const getArg = (primary, secondary) => {
    if (hasOwn(args, primary)) return args[primary];
    if (secondary && hasOwn(args, secondary)) return args[secondary];
    return undefined;
  };

  const tournamentId =
    getArg("tournamentId", "tournament-id") ?? DEFAULTS.tournamentId;
  const fixturesSheetId =
    getArg("fixturesSheetId", "fixtures-sheet-id") ?? DEFAULTS.fixturesSheetId;
  const teamsSheetId =
    getArg("teamsSheetId", "teams-sheet-id") ?? DEFAULTS.teamsSheetId;
  const reportDir = getArg("reportDir", "report-dir") ?? DEFAULTS.reportDir;
  const exportDir = getArg("exportDir", "export-dir");
  const apiBaseArg = getArg("apiBase", "api-base");
  const apiBase =
    apiBaseArg !== undefined ? apiBaseArg : process.env.VITE_API_BASE || "";
  const databaseUrl =
    getArg("databaseUrl", "database-url") || process.env.DATABASE_URL || "";
  const limitGroupsRaw = getArg("limitGroups", "limit-groups");
  const limitGroups = limitGroupsRaw
    ? limitGroupsRaw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  const debugArgs = !!getArg("debugArgs", "debug-args");

  if (debugArgs) {
    const providerChoice = apiBase ? "AppsScript" : "SheetsCSV";
    const supabaseCaCertProvided = !!getSupabaseCaCertPath();
    const pgTlsInsecure = isPgTlsInsecure();
    console.log(
      JSON.stringify(
        {
          args,
          resolved: {
            apiBase: apiBase || null,
            provider: providerChoice,
            pgTlsRejectUnauthorizedDisabled:
              pgTlsInsecure && !supabaseCaCertProvided,
            supabaseCaCertProvided,
            pgTlsInsecure,
          },
        },
        null,
        2
      )
    );
  }

  const meta = {
    commit: !!args.commit,
    tournamentId,
    fixturesSheetId,
    teamsSheetId,
    apiBase: apiBase || null,
    reportDir,
  };

  const report = {
    meta,
    counts: {
      groups: 0,
      teams: 0,
      fixtures: 0,
      results: 0,
    },
    duplicates: [],
    validationErrors: [],
    missingTeams: [],
    perGroup: {},
  };

  let provider;
  let source = "";

  try {
    if (apiBase) {
      provider = await loadFromApi({ apiBase, limitGroups });
    } else {
      provider = await loadFromCsv({
        fixturesSheetId,
        teamsSheetId,
        limitGroups,
      });
    }
    source = provider.source;
  } catch (err) {
    report.validationErrors.push(`Provider error: ${err.message}`);
    const outPath = await writeReport(reportDir, report);
    console.error(`Failed to load provider data. Report written: ${outPath}`);
    process.exit(1);
  }

  validateGroups(provider.groups, report.validationErrors);

  const { teams, missingTeams } = buildTeams({
    tournamentId,
    standingsByGroup: provider.standingsByGroup,
    fixturesByGroup: provider.fixturesByGroup,
  });

  const { fixtures, duplicates } = buildFixtures({
    tournamentId,
    fixturesByGroup: provider.fixturesByGroup,
    errors: report.validationErrors,
  });

  const results = buildResults(fixtures);

  report.counts.groups = provider.groups.length;
  report.counts.teams = teams.length;
  report.counts.fixtures = fixtures.length;
  report.counts.results = results.length;
  report.duplicates = duplicates;
  report.missingTeams = missingTeams;

  const perGroup = {};
  for (const g of provider.groups) {
    const groupFixtures = fixtures.filter((f) => f.group_id === g.id);
    const groupTeams = teams.filter((t) => t.group_id === g.id);
    perGroup[g.id] = {
      fixtures: groupFixtures.length,
      teams: groupTeams.length,
    };
  }
  report.perGroup = perGroup;

  if (report.validationErrors.length) {
    const outPath = await writeReport(reportDir, report);
    console.error(`Validation errors found. Report written: ${outPath}`);
    process.exit(1);
  }

  if (exportDir) {
    exportToCsv({
      exportDir,
      tournamentId,
      source,
      groups: provider.groups,
      teams,
      fixtures,
      results,
    });
  }

  if (args.commit && !exportDir) {
    if (!databaseUrl) {
      report.validationErrors.push("DATABASE_URL is required for --commit");
      const outPath = await writeReport(reportDir, report);
      console.error(`Missing DATABASE_URL. Report written: ${outPath}`);
      process.exit(1);
    }
    await upsertAll({
      databaseUrl,
      tournamentId,
      source,
      groups: provider.groups,
      teams,
      fixtures,
      results,
    });
  }

  const outPath = await writeReport(reportDir, report);
  console.log(`Report written: ${outPath}`);
  console.log(args.commit ? "Commit complete." : "Preview complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
