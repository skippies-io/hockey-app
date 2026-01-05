import { parseArgs } from "./_devtools.mjs";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function printResult(label, data) {
  const parts = [label];
  if (data.status !== undefined) parts.push(`status=${data.status}`);
  if (data.ok !== undefined) parts.push(`ok=${data.ok}`);
  if (data.sha !== undefined) parts.push(`sha=${data.sha}`);
  if (data.error) parts.push(`error=${data.error}`);
  console.log(parts.join(" "));
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  let body;
  try {
    body = await res.json();
  } catch (err) {
    const error = err && err.message ? err.message : String(err);
    return { status: res.status, error };
  }
  return { status: res.status, body };
}

async function fetchStatus(url, options) {
  try {
    const res = await fetch(url, options);
    return { status: res.status };
  } catch (err) {
    const error = err && err.message ? err.message : String(err);
    return { error };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.base || process.env.PROD_API_BASE || "";

  if (!base) fail("Missing base URL. Set PROD_API_BASE or pass --base.");

  const versionUrl = `${base.replace(/\/$/, "")}/version`;

  const getRes = await fetchJson(versionUrl);
  if (getRes.error) {
    printResult("GET", getRes);
    fail("GET /version did not return valid JSON");
  }
  printResult("GET", {
    status: getRes.status,
    ok: getRes.body && getRes.body.ok,
    sha: getRes.body && getRes.body.sha,
  });
  if (getRes.status !== 200) fail("GET /version did not return 200");
  if (!getRes.body || getRes.body.ok !== true) {
    fail("GET /version missing ok:true");
  }
  if (!getRes.body.sha || getRes.body.sha === "unknown") {
    fail("GET /version sha is missing or unknown");
  }

  const headRes = await fetchStatus(versionUrl, { method: "HEAD" });
  printResult("HEAD", headRes);
  if (headRes.error) fail(`HEAD /version failed: ${headRes.error}`);
  if (headRes.status !== 200) fail("HEAD /version did not return 200");

  const optionsRes = await fetchStatus(versionUrl, { method: "OPTIONS" });
  printResult("OPTIONS", optionsRes);
  if (optionsRes.error) fail(`OPTIONS /version failed: ${optionsRes.error}`);
  if (optionsRes.status !== 204) fail("OPTIONS /version did not return 204");

  console.log("PASS: /version smoke checks ok");
}

main().catch((err) => {
  fail(err && err.message ? err.message : String(err));
});
