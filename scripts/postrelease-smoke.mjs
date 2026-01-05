import { parseArgs } from "./_devtools.mjs";
import { deriveBases, fail, runNodeScript } from "./smoke-lib.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawBase = args.base || process.env.PROD_API_BASE || "";

  if (!rawBase) fail("Missing base URL. Set PROD_API_BASE or pass --base.");

  const { rootBase, apiBase } = deriveBases(rawBase);
  const env = { ...process.env, PROD_API_BASE: rootBase };

  const versionResult = await runNodeScript(
    "version",
    ["scripts/version-smoke.mjs", "--base", rootBase],
    env
  );
  if (versionResult.code !== 0) {
    fail("version smoke failed");
  }

  const burstResults = await Promise.all([
    runNodeScript(
      "fixtures",
      ["scripts/fixtures-burst.mjs", "--api-base", apiBase],
      env
    ),
    runNodeScript(
      "standings",
      ["scripts/standings-burst.mjs", "--api-base", apiBase],
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
