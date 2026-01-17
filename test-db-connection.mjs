import pg from 'pg';
const { Pool } = pg;

// 1. Get the raw URL
let dbUrl = process.env.DATABASE_URL;

console.log("---------------------------------------------------");
console.log("📡  TESTING DATABASE CONNECTION (SSL FIX)");
console.log("---------------------------------------------------");

if (!dbUrl) {
  console.error("❌ ERROR: DATABASE_URL is missing.");
  process.exit(1);
}

// 2. THE FIX: Strip '?sslmode=require' if it exists
// This stops the URL from overriding our manual SSL settings
if (dbUrl.includes('?')) {
  dbUrl = dbUrl.split('?')[0];
  console.log("🔧 FIX: Stripped query params from URL to force local SSL settings.");
}

// Mask password for display
const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
console.log("TARGET: " + maskedUrl);

const pool = new Pool({
  connectionString: dbUrl,
  // 3. Force "Allow Self-Signed" (Critical for local dev)
  ssl: { rejectUnauthorized: false } 
});

async function run() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT version()');
    console.log("✅ SUCCESS: Connected to Supabase!");
    console.log("ℹ️  Version: " + res.rows[0].version);
    client.release();
    pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ FAILURE: " + err.message);
    if (err.message.includes('self-signed')) {
        console.log("💡 HINT: The SSL fix didn't take. Check if strict SSL is enforced on your router/network.");
    }
    pool.end();
    process.exit(1);
  }
}

run();
