import { parseArgs } from "./_devtools.mjs";

const AGE_IDS = [
  "U11B",
  "U11G",
  "U13B",
  "U13G",
  "U14B",
  "U14G",
  "U16B",
  "U16G",
  "U18G",
];

function normalizeApiBase(raw) {
  const base = String(raw || "").trim();
  if (!base) return "";
  if (base.endsWith("/api")) return base;
  if (base.endsWith("/")) return `${base}api`;
  return `${base}/api`;
}

async function fetchStatus(url) {
  try {
    const res = await fetch(url);
    await res.text().catch(() => "");
    return { status: res.status };
  } catch (err) {
    return { error: err && err.message ? err.message : String(err) };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawBase = args["api-base"] || process.env.PROD_API_BASE || "";
  const apiBase = normalizeApiBase(rawBase);

  if (!apiBase) {
    console.error("Missing API base URL. Provide --api-base or set PROD_API_BASE.");
    process.exit(1);
  }

  const requests = AGE_IDS.map((ageId) => {
    const url = `${apiBase}?sheet=Fixtures&age=${encodeURIComponent(ageId)}`;
    return fetchStatus(url).then((result) => ({ ageId, result }));
  });

  const results = await Promise.all(requests);
  let okCount = 0;
  let failCount = 0;

  for (const { ageId, result } of results) {
    if (result.error) {
      console.log(`${ageId}: error=${result.error}`);
      failCount += 1;
      continue;
    }
    console.log(`${ageId}: status=${result.status}`);
    if (result.status === 200) {
      okCount += 1;
    } else {
      failCount += 1;
    }
  }

  console.log(`burst=done ok=${okCount} failed=${failCount} total=${results.length}`);
  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
