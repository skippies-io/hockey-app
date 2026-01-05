export const DEFAULT_AGE_IDS = [
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

export function normalizeApiBase(raw) {
  const base = String(raw || "").trim().replace(/\/$/, "");
  if (!base) return "";
  if (base.endsWith("/api")) return base;
  return `${base}/api`;
}

export function resolveApiBase(args, env) {
  const rawBase = args["api-base"] || env.PROD_API_BASE || "";
  const apiBase = normalizeApiBase(rawBase);
  if (!apiBase) {
    throw new Error("Missing API base URL. Provide --api-base or set PROD_API_BASE.");
  }
  return apiBase;
}

export async function fetchStatus(url) {
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

export async function runSheetBurst({ apiBase, sheet, ages }) {
  const requests = ages.map((ageId) => {
    const url = `${apiBase}?sheet=${sheet}&age=${encodeURIComponent(ageId)}`;
    return fetchStatus(url).then((result) => ({ ageId, result }));
  });

  const results = await Promise.all(requests);
  let okCount = 0;
  let failCount = 0;

  for (const { ageId, result } of results) {
    if (result.error) {
      console.log(`${ageId}: error=${result.error} name=${result.name}`);
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
  return { ok: okCount, failed: failCount, total: results.length };
}
