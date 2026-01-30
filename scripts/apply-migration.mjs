import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load Env
if (!process.env.DATABASE_URL && existsSync(resolve(__dirname, '../.env.db.local'))) {
  const envConfig = readFileSync(resolve(__dirname, '../.env.db.local'), 'utf-8');
  envConfig.split(/\r?\n/).forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const val = valueParts.join('=').trim();
      process.env[key.trim()] = val;
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: node apply-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

const sql = readFileSync(migrationFile, 'utf-8');

console.log(`Applying migration: ${migrationFile}...`);

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Local dev usually needs this
});

async function run() {
  try {
    await client.connect();
    await client.query(sql);
    console.log("Migration applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
