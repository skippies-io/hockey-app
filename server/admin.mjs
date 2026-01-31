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
  console.log("Admin Request:", method, path); // DEBUG

  // CORS headers for admin (if needed specifically, though index.mjs handles it generally, 
  // we might need to ensure OPTIONS passes through or headers conform)

  if (path === "/announcements") {
    if (method === "GET") {
      try {
        if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
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
        if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
        const body = await readBody(req);
        const { title, body: content, severity, tournament_id, is_published } = body;

        // Use null for tournament_id if it's "general" or empty
        const safeTournamentId = tournament_id === 'general' || !tournament_id ? null : tournament_id;

        const result = await pool.query(
          `INSERT INTO announcements (tournament_id, title, body, severity, is_published)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [safeTournamentId, title, content, severity || 'info', !!is_published]
        );
        return sendJson(req, res, 201, { ok: true, data: result.rows[0] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }

    // PUT /api/admin/announcements/:id - We handle ID extraction manually since path is just /announcements
    // Wait, the routing in index.mjs strips /api/admin, so path is /announcements. 
    // We need to handle /announcements/:id logic.
  }

  // Handle /announcements/:id
  if (path.startsWith("/announcements/")) {
    const id = path.split("/")[2];

    if (method === "PUT") {
      try {
        if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
        const body = await readBody(req);
        const { title, body: content, severity, tournament_id, is_published } = body;
        const safeTournamentId = tournament_id === 'general' || !tournament_id ? null : tournament_id;

        // Logic: Update fields. If is_published is explicitly true, we effectively "republish".
        // To support "fresh date" on publish/republish, we can optionally update created_at.
        // For now, let's update created_at ONLY if we are transitioning to published or if user requested it?
        // User request: "Published date will be new."
        // Let's ALWAYS update created_at to NOW() if is_published is true.
        // Actually, if I just edit a typo, I don't want to change the date.
        // Let's assume the Frontend will pass a flag or we check the previous state (expensive).
        // Simpler: The frontend can send a "refresh_date": true flag if it wants to bump the date.

        let query = `UPDATE announcements SET title = $1, body = $2, severity = $3, tournament_id = $4, is_published = $5`;
        const params = [title, content, severity, safeTournamentId, !!is_published];

        if (body.refresh_date) {
          query += `, created_at = NOW()`;
        }

        query += ` WHERE id = $6 RETURNING *`;
        params.push(id);

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Announcement not found" });
        }
        return sendJson(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        console.error("Admin PUT Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }

    if (method === "DELETE") {
      try {
        if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
        const result = await pool.query("DELETE FROM announcements WHERE id = $1 RETURNING id", [id]);
        if (result.rowCount === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Not found" });
        }
        return sendJson(req, res, 200, { ok: true, deleted: id });
      } catch (err) {
        console.error("Admin DELETE Error:", err);
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
