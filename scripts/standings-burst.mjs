import { fetchJsonFollow, parseArgs, readDotEnvValue } from "./_devtools.mjs";

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

function ensureValidBase(base) {
  const isInvalid = !base || base.startsWith("/") || !base.startsWith("http");
  if (!isInvalid) return;
  console.error(`Invalid --base value: ${base || "(empty)"}`);
  console.error(
    "PROD_API_BASE likely expanded to empty. Use an absolute http(s) URL."
  );
  console.error(
    'Example:\nexport PROD_API_BASE="https://your-host"\n' +
      'npm run standings:burst -- --base "$PROD_API_BASE/api"'
  );
  process.exit(1);
}

async function fetchStatus(url) {
  try {
    const res = await fetch(url);
    await res.text().catch(() => "");
    return { status: res.status };
  } catch (err) {
    return {
      error: err && err.message ? err.message : String(err),
      name: err && err.name ? err.name : "Error",
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const provider = args.provider || "apps";
  const base = provider === "db" ? getDbBase(args.base) : getAppsBase(args.base);

  ensureValidBase(base);

  const groups = await fetchJsonFollow(`${base}?groups=1`);
  const ages = (groups && groups.groups ? groups.groups : [])
    .map((g) => g && g.id)
    .filter(Boolean);

  if (!ages.length) {
    console.error("No age groups returned from groups endpoint.");
    process.exit(1);
  }

  const requests = ages.map((ageId) => {
    const url = `${base}?sheet=Standings&age=${encodeURIComponent(ageId)}`;
    return fetchStatus(url).then((result) => ({ ageId, result }));
  });

  const results = await Promise.all(requests);
  let okCount = 0;

  for (const { ageId, result } of results) {
    if (result.error) {
      console.log(`${ageId}: error=${result.error} name=${result.name}`);
      continue;
    }
    console.log(`${ageId}: status=${result.status}`);
    if (result.status === 200) okCount += 1;
  }

  console.log(`burst=done ok=${okCount} total=${results.length}`);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
