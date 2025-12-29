import fs from "node:fs";
import path from "node:path";

const DEFAULT_AGE = "U13B";
const MAX_REDIRECTS = 5;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const arg = raw.slice(2);
    const eqIndex = arg.indexOf("=");
    const key = eqIndex === -1 ? arg : arg.slice(0, eqIndex);
    const inlineValue = eqIndex === -1 ? undefined : arg.slice(eqIndex + 1);
    if (inlineValue !== undefined) {
      out[key] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) continue;
    out[key] = next;
    i += 1;
  }
  return out;
}

function readDotEnvValue(key) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return "";
  const contents = fs.readFileSync(envPath, "utf8");
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const k = trimmed.slice(0, eqIndex).trim();
    if (k !== key) continue;
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return "";
}

async function fetchJsonFollow(url, hops = 0) {
  if (hops > MAX_REDIRECTS) {
    throw new Error(`Too many redirects for ${url}`);
  }
  const res = await fetch(url, { redirect: "manual" });
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const location = res.headers.get("location");
    if (!location) throw new Error(`Redirect with no location for ${url}`);
    const nextUrl = new URL(location, url).toString();
    return fetchJsonFollow(nextUrl, hops + 1);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getAppsBase(baseOverride) {
  if (baseOverride) return baseOverride;
  if (process.env.VITE_API_BASE) return process.env.VITE_API_BASE;
  const fromEnv = readDotEnvValue("VITE_API_BASE");
  return fromEnv || "";
}

function getDbBase(baseOverride) {
  if (baseOverride) return baseOverride;
  if (process.env.VITE_DB_API_BASE) return process.env.VITE_DB_API_BASE;
  return "http://localhost:8787/api";
}

async function smokeApps({ base, age }) {
  assert(base, "Missing Apps Script base URL");

  const ping = await fetchJsonFollow(`${base}?ping=1`);
  assert(ping && ping.ok === true, "Ping did not return ok:true");

  const groups = await fetchJsonFollow(`${base}?groups=1`);
  assert(groups && groups.ok === true, "Groups did not return ok:true");
  assert(Array.isArray(groups.groups), "Groups response missing groups array");

  const fixtures = await fetchJsonFollow(
    `${base}?sheet=Fixtures&age=${encodeURIComponent(age)}`
  );
  assert(fixtures && fixtures.ok === true, "Fixtures did not return ok:true");
  assert(Array.isArray(fixtures.rows), "Fixtures response missing rows array");

  const standings = await fetchJsonFollow(
    `${base}?sheet=Standings&age=${encodeURIComponent(age)}`
  );
  assert(standings && standings.ok === true, "Standings did not return ok:true");
  assert(Array.isArray(standings.rows), "Standings response missing rows array");

  return {
    groupsCount: groups.groups.length,
    fixturesCount: fixtures.rows.length,
    standingsCount: standings.rows.length,
  };
}

function assertFixtureRowShape(row) {
  assert(row && typeof row === "object", "Fixture row missing");
  assert("Date" in row, "Fixture row missing Date");
  assert("Time" in row, "Fixture row missing Time");
  assert("Team1" in row, "Fixture row missing Team1");
  assert("Team2" in row, "Fixture row missing Team2");
}

function assertStandingsRowShape(row) {
  assert(row && typeof row === "object", "Standings row missing");
  assert("Team" in row, "Standings row missing Team");
  const numericKeys = ["Rank", "Points", "GF", "GA", "GD", "GP", "W", "D", "L"];
  for (const key of numericKeys) {
    assert(typeof row[key] === "number", `Standings ${key} is not a number`);
  }
}

async function smokeDb({ base, age }) {
  const groups = await fetchJsonFollow(`${base}?groups=1`);
  assert(groups && Array.isArray(groups.groups), "Groups response missing groups array");
  const groupRow = groups.groups[0];
  if (groupRow) {
    assert(typeof groupRow.id === "string", "Group id is not a string");
    assert(typeof groupRow.label === "string", "Group label is not a string");
  }

  const fixtures = await fetchJsonFollow(
    `${base}?sheet=Fixtures&age=${encodeURIComponent(age)}`
  );
  assert(fixtures && Array.isArray(fixtures.rows), "Fixtures response missing rows array");
  if (fixtures.rows[0]) assertFixtureRowShape(fixtures.rows[0]);

  const standings = await fetchJsonFollow(
    `${base}?sheet=Standings&age=${encodeURIComponent(age)}`
  );
  assert(standings && Array.isArray(standings.rows), "Standings response missing rows array");
  assert(standings.rows[0], "Standings response has no rows to type-check");
  assertStandingsRowShape(standings.rows[0]);

  return {
    groupsCount: groups.groups.length,
    fixturesCount: fixtures.rows.length,
    standingsCount: standings.rows.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const provider = args.provider || "apps";
  const age = args.age || DEFAULT_AGE;
  const base = provider === "db" ? getDbBase(args.base) : getAppsBase(args.base);

  try {
    const start = Date.now();
    const result =
      provider === "db"
        ? await smokeDb({ base, age })
        : await smokeApps({ base, age });
    const elapsed = Date.now() - start;

    console.log(`provider=${provider} base=${base} age=${age}`);
    console.log(
      `groups=${result.groupsCount} fixtures=${result.fixturesCount} standings=${result.standingsCount}`
    );
    console.log(`smoke=ok durationMs=${elapsed}`);
    process.exit(0);
  } catch (err) {
    console.error(`smoke=fail provider=${provider} base=${base} age=${age}`);
    console.error(err && err.message ? err.message : String(err));
    process.exit(1);
  }
}

main();
