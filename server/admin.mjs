import { readFileSync, existsSync } from 'node:fs';

// Helper to load env file if process.env.DATABASE_URL is missing
if (!process.env.DATABASE_URL && existsSync('.env.db.local')) {
  const envConfig = readFileSync('.env.db.local', 'utf-8');
  envConfig.split(/\r?\n/).forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const val = valueParts.join('=').trim();
      process.env[key.trim()] = val;
    }
  });
}

export async function handleAdminRequest(req, res, { url, pool, sendJson }) {
  // Simple router for Admin API
  const method = req.method;
  const path = url.pathname.replace("/api/admin", "");

  // CORS headers for admin (if needed specifically, though index.mjs handles it generally, 
  // we might need to ensure OPTIONS passes through or headers conform)
  
  if (path === "/announcements") {
    if (method === "GET") {
      try {
        const result = await pool.query(
          "SELECT * FROM announcements ORDER BY created_at DESC"
        );
        return sendJson(req, res, 200, { ok: true, data: result.rows });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }
    if (method === "POST") {
      try {
        const body = await readBody(req);
        const { title, body: content, severity } = body;
        
        // We need tournament_id. For now, use the env var or default
        const tournamentId = process.env.TOURNAMENT_ID || "hj-indoor-allstars-2025";
        
        const result = await pool.query(
          `INSERT INTO announcements (tournament_id, title, body, severity)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [tournamentId, title, content, severity || 'info']
        );
        return sendJson(req, res, 201, { ok: true, data: result.rows[0] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }
  }

  // Fallback for unknown admin routes
  return sendJson(req, res, 404, { ok: false, error: "Admin route not found" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}
