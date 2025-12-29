import { readEnvFile, spawnNpmSync } from "./_devtools.mjs";

const ENV_PATH = ".env.db.local";

const env = readEnvFile(ENV_PATH);
if (!env) {
  console.error("Missing .env.db.local. Create it with DATABASE_URL and TOURNAMENT_ID.");
  process.exit(1);
}

const result = spawnNpmSync(["run", "test:app:db"], {
  stdio: "inherit",
  env: { ...process.env, ...env },
});

process.exit(result.status ?? 1);
