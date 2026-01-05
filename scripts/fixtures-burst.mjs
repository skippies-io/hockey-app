import { parseArgs } from "./_devtools.mjs";
import { DEFAULT_AGE_IDS, resolveApiBase, runSheetBurst } from "./burst-lib.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiBase = resolveApiBase(args, process.env);
  const result = await runSheetBurst({
    apiBase,
    sheet: "Fixtures",
    ages: DEFAULT_AGE_IDS,
  });
  if (result.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
