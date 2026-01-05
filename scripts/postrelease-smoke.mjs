import { parseArgs } from "./_devtools.mjs";
import { spawn } from "node:child_process";

function runNodeScript(label, args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env,
    });
    child.on("close", (code) => resolve({ label, code }));
  });
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.base || process.env.PROD_API_BASE || "";

  if (!base) fail("Missing base URL. Set PROD_API_BASE or pass --base.");

  const env = { ...process.env, PROD_API_BASE: base };

  const versionResult = await runNodeScript(
    "version",
    ["scripts/version-smoke.mjs", "--base", base],
    env
  );
  if (versionResult.code !== 0) {
    fail("version smoke failed");
  }

  const burstResults = await Promise.all([
    runNodeScript(
      "fixtures",
      ["scripts/fixtures-burst.mjs", "--base", base],
      env
    ),
    runNodeScript(
      "standings",
      ["scripts/standings-burst.mjs", "--base", base],
      env
    ),
  ]);

  const failed = burstResults.filter((result) => result.code !== 0);
  if (failed.length) {
    const names = failed.map((result) => result.label).join(", ");
    fail(`burst checks failed: ${names}`);
  }

  console.log("PASS: post-release smoke checks ok");
}

main().catch((err) => {
  fail(err && err.message ? err.message : String(err));
});
