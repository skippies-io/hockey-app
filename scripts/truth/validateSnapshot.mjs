import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error(`❌ Snapshot validation failed: ${message}`);
  process.exit(1);
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function requireString(obj, key, ctx) {
  if (!isObject(obj) || typeof obj[key] !== "string" || obj[key].trim() === "") {
    fail(`${ctx}.${key} must be a non-empty string`);
  }
}

function requireArray(obj, key, ctx) {
  if (!isObject(obj) || !Array.isArray(obj[key])) {
    fail(`${ctx}.${key} must be an array`);
  }
}

function uniqueIds(arr, idKey, ctx) {
  const seen = new Set();
  for (const item of arr) {
    if (!isObject(item)) fail(`${ctx} items must be objects`);
    requireString(item, idKey, ctx);
    const id = item[idKey];
    if (seen.has(id)) fail(`${ctx} contains duplicate ${idKey}: ${id}`);
    seen.add(id);
  }
  return seen;
}

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`Invalid JSON in ${filePath}: ${e.message}`);
  }
}

function listJsonFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsonFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }
  return files;
}

function validateSnapshot(snapshot, filePath) {
  if (!isObject(snapshot)) fail(`Snapshot must be a JSON object (${filePath})`);

  // Required top-level fields
  requireString(snapshot, "snapshot_id", "snapshot");
  requireString(snapshot, "schema_version", "snapshot");
  requireString(snapshot, "created_at", "snapshot");
  requireString(snapshot, "state", "snapshot");

  const allowedStates = new Set(["DRAFT", "PUBLISHED", "LOCKED"]);
  if (!allowedStates.has(snapshot.state)) {
    fail(`snapshot.state must be one of DRAFT|PUBLISHED|LOCKED (got "${snapshot.state}")`);
  }

  if (!isObject(snapshot.source)) fail("snapshot.source must be an object");
  requireString(snapshot.source, "system", "snapshot.source");

  if (!isObject(snapshot.tournament)) fail("snapshot.tournament must be an object");
  requireString(snapshot.tournament, "id", "snapshot.tournament");
  requireString(snapshot.tournament, "name", "snapshot.tournament");
  requireString(snapshot.tournament, "season", "snapshot.tournament");

  if (!isObject(snapshot.structure)) fail("snapshot.structure must be an object");
  requireArray(snapshot.structure, "divisions", "snapshot.structure");
  requireArray(snapshot.structure, "pools", "snapshot.structure");
  requireArray(snapshot.structure, "pool_memberships", "snapshot.structure");

  requireArray(snapshot, "teams", "snapshot");
  requireArray(snapshot, "fixtures", "snapshot");

  // Build lookups
  const divisionIds = uniqueIds(snapshot.structure.divisions, "id", "divisions");
  const poolIds = uniqueIds(snapshot.structure.pools, "id", "pools");
  const teamIds = uniqueIds(snapshot.teams, "id", "teams");
  const fixtureIds = uniqueIds(snapshot.fixtures, "id", "fixtures");

  // Validate divisions/pools relationships
  for (const pool of snapshot.structure.pools) {
    requireString(pool, "division_id", "pools");
    if (!divisionIds.has(pool.division_id)) {
      fail(`pools.division_id references unknown division: ${pool.division_id}`);
    }
    requireString(pool, "name", "pools");
  }

  // Validate teams
  for (const team of snapshot.teams) {
    requireString(team, "name", "teams");
    requireString(team, "division_id", "teams");
    if (!divisionIds.has(team.division_id)) {
      fail(`teams.division_id references unknown division: ${team.division_id}`);
    }
  }

  // Validate pool memberships
  for (const pm of snapshot.structure.pool_memberships) {
    requireString(pm, "pool_id", "pool_memberships");
    requireString(pm, "team_id", "pool_memberships");
    if (!poolIds.has(pm.pool_id)) fail(`pool_memberships.pool_id references unknown pool: ${pm.pool_id}`);
    if (!teamIds.has(pm.team_id)) fail(`pool_memberships.team_id references unknown team: ${pm.team_id}`);
  }

  // Validate fixtures
  for (const fx of snapshot.fixtures) {
    requireString(fx, "division_id", "fixtures");
    if (!divisionIds.has(fx.division_id)) fail(`fixtures.division_id references unknown division: ${fx.division_id}`);

    if (fx.pool_id !== undefined && fx.pool_id !== null) {
      if (typeof fx.pool_id !== "string" || fx.pool_id.trim() === "") fail("fixtures.pool_id must be a non-empty string when present");
      if (!poolIds.has(fx.pool_id)) fail(`fixtures.pool_id references unknown pool: ${fx.pool_id}`);
    }

    requireString(fx, "home_team_id", "fixtures");
    requireString(fx, "away_team_id", "fixtures");
    requireString(fx, "scheduled_at", "fixtures");

    if (!teamIds.has(fx.home_team_id)) fail(`fixtures.home_team_id references unknown team: ${fx.home_team_id}`);
    if (!teamIds.has(fx.away_team_id)) fail(`fixtures.away_team_id references unknown team: ${fx.away_team_id}`);
    if (fx.home_team_id === fx.away_team_id) fail(`fixtures has same home/away team: ${fx.id}`);

    // Optional: ensure fixture teams belong to the same division as fixture.division_id
    const home = snapshot.teams.find((t) => t.id === fx.home_team_id);
    const away = snapshot.teams.find((t) => t.id === fx.away_team_id);
    if (home && home.division_id !== fx.division_id) fail(`fixture ${fx.id}: home team division_id mismatch`);
    if (away && away.division_id !== fx.division_id) fail(`fixture ${fx.id}: away team division_id mismatch`);
  }

  // Results (optional): basic checks + reference existing fixtures
  if (snapshot.results !== undefined) {
    if (!Array.isArray(snapshot.results)) fail("snapshot.results must be an array when present");
    for (const r of snapshot.results) {
      if (!isObject(r)) fail("results items must be objects");
      requireString(r, "fixture_id", "results");
      if (!fixtureIds.has(r.fixture_id)) fail(`results.fixture_id references unknown fixture: ${r.fixture_id}`);
      requireString(r, "status", "results");
      requireString(r, "recorded_at", "results");
      // scores may be null for pending, but if present must be numbers
      for (const k of ["home_score", "away_score"]) {
        if (r[k] !== undefined && r[k] !== null && typeof r[k] !== "number") {
          fail(`results.${k} must be a number|null when present`);
        }
      }
    }
  }

  // Standings (optional): we only enforce "no guessing" structurally for now
  // (Computed verification comes later when we implement standings computation).
  if (snapshot.standings !== undefined && !Array.isArray(snapshot.standings)) {
    fail("snapshot.standings must be an array when present");
  }

  console.log(`✅ Snapshot valid: ${filePath}`);
}

function main() {
  const target = process.argv[2];
  if (!target) {
    fail("Usage: node scripts/truth/validateSnapshot.mjs <snapshot.json | directory>");
  }

  const resolved = path.resolve(process.cwd(), target);
  if (!fs.existsSync(resolved)) fail(`Path does not exist: ${resolved}`);

  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    const files = listJsonFiles(resolved);

    if (files.length === 0) fail(`No .json files found in directory: ${resolved}`);

    for (const file of files) {
      const snap = loadJson(file);
      validateSnapshot(snap, file);
    }
    return;
  }

  const snap = loadJson(resolved);
  validateSnapshot(snap, resolved);
}

main();
