import fs from "node:fs";
import { spawnSync } from "node:child_process";

const ENV_PATH = ".env.db.local";

if (!fs.existsSync(ENV_PATH)) {
  console.error(
    "Missing .env.db.local. Create it with DATABASE_URL and TOURNAMENT_ID."
  );
  process.exit(1);
}

const envLines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
const env = {};

for (const line of envLines) {
  let trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;

  // allow "export KEY=VALUE"
  if (trimmed.startsWith("export ")) trimmed = trimmed.slice("export ".length);

  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;

  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();

  // strip surrounding single/double quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  env[key] = value;
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["run", "test:app:db"], {
  stdio: "inherit",
  env: { ...process.env, ...env },
});

process.exit(result.status ?? 1);
