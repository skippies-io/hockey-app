import {
  assert,
  fetchJsonFollow,
  parseArgs,
  readDotEnvValue,
} from "./_devtools.mjs";

const DEFAULT_AGE = "U13B";

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
