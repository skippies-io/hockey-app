import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const migrationsDir = path.resolve("db/migrations");
const databaseUrl = process.env.DATABASE_URL || "";

function listMigrationsOnDisk() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

async function listAppliedMigrations() {
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL.");
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query(
      "SELECT filename FROM schema_migrations ORDER BY filename"
    );
    return result.rows.map((row) => row.filename);
  } finally {
    await client.end();
  }
}

async function main() {
  const diskMigrations = listMigrationsOnDisk();
  console.log("Migrations on disk:");
  if (!diskMigrations.length) {
    console.log("(none)");
  } else {
    diskMigrations.forEach((name) => console.log(`- ${name}`));
  }

  try {
    const applied = await listAppliedMigrations();
    console.log("Applied migrations:");
    if (!applied.length) {
      console.log("(none)");
    } else {
      applied.forEach((name) => console.log(`- ${name}`));
    }
  } catch (err) {
    console.error(
      `Could not read schema_migrations: ${err && err.message ? err.message : err}`
    );
    process.exit(1);
  }
}

main();
