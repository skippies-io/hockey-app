import { fetchJsonFollow, parseArgs } from "./_devtools.mjs";
import { resolveApiBase, runSheetBurst } from "./burst-lib.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiBase = resolveApiBase(args, process.env);

  const groups = await fetchJsonFollow(`${apiBase}?groups=1`);
  const ages = (groups && groups.groups ? groups.groups : [])
    .map((g) => g && g.id)
    .filter(Boolean);

  if (!ages.length) {
    console.error("No age groups returned from groups endpoint.");
    process.exit(1);
  }

  const result = await runSheetBurst({
    apiBase,
    sheet: "Standings",
    ages,
  });
  if (result.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
