import crypto from "node:crypto";
import { readBodyLimited } from "./security.mjs";

function hashString(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slug(input) {
  const base = String(input || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
  const digest = hashString(String(input)).slice(0, 12);
  return base ? `${base}-${digest}` : digest;
}

function normalizeSpaces(value) {
  return String(value || "").replaceAll(/\s+/g, " ").trim();
}

function normalizeTeamName(value) {
  const raw = normalizeSpaces(value);
  if (!raw) return "";
  return normalizeSpaces(raw.split("-").join(" "));
}

function toTitleCase(value) {
  return normalizeSpaces(value)
    .split(" ")
    .map((word) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseScore(value) {
  if (value === "" || value == null) return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isInteger(n)) return n;
  }
  return NaN;
}

function isValidScore(value) {
  if (value === null) return true;
  return Number.isInteger(value) && value >= 0 && value <= 99;
}

async function writeAuditLog(pool, entry) {
  if (!pool) return;
  if (!entry?.actor_email || !entry?.action) return;

  try {
    await pool.query(
      `INSERT INTO audit_log (actor_email, action, tournament_id, entity_type, entity_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.actor_email,
        entry.action,
        entry.tournament_id || null,
        entry.entity_type || null,
        entry.entity_id || null,
        entry.meta ? JSON.stringify(entry.meta) : null,
      ]
    );
  } catch (e) {
    console.error("Audit log write failed:", e);
  }
}

export async function handleAdminRequest(req, res, { url, pool, sendJson, caches, actorEmail } = {}) {

  const logAudit = (action, data) => writeAuditLog(pool, { actor_email: actorEmail || "unknown", action, ...data });

  // Simple router for Admin API
  const method = req.method;
  const path = url.pathname.replace("/api/admin", "");
  console.log("Admin Request:", method, path); // DEBUG

  if (path === "/tournament-wizard") {
    if (method !== "POST") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }
    try {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const body = await readBody(req);
      if (!body) return sendJson(req, res, 400, { ok: false, error: "Invalid body" });

      const {
        tournament,
        venues = [],
        groups = [],
        groupVenues = [],
        franchises = [],
        teams = [],
        fixtures = [],
        timeSlots = [],
      } = body;

      if (!tournament || !isNonEmptyString(tournament.id) || !isNonEmptyString(tournament.name)) {
        return sendJson(req, res, 400, { ok: false, error: "tournament.id and tournament.name are required" });
      }

      if (!Array.isArray(groups) || groups.length === 0) {
        return sendJson(req, res, 400, { ok: false, error: "At least one group is required" });
      }

      const tournamentId = normalizeSpaces(tournament.id);
      const tournamentName = normalizeSpaces(tournament.name);
      const tournamentSeason = isNonEmptyString(tournament.season)
        ? normalizeSpaces(tournament.season)
        : null;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const existing = await client.query(
          "SELECT 1 FROM tournament WHERE id = $1",
          [tournamentId]
        );
        if (existing.rowCount > 0) {
          await client.query("ROLLBACK");
          return sendJson(req, res, 409, { ok: false, error: "Tournament already exists" });
        }

        await client.query(
          `INSERT INTO tournament (id, name, season)
           VALUES ($1, $2, $3)`,
          [tournamentId, tournamentName, tournamentSeason]
        );

        const venueMap = new Map();
        for (const venue of venues) {
          const name = normalizeSpaces(venue?.name);
          if (!name) continue;
          const id = slug(`${tournamentId}:${name}`);
          venueMap.set(name.toLowerCase(), { id, name });
          await client.query(
            `INSERT INTO venue (tournament_id, id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (tournament_id, id) DO UPDATE SET name = EXCLUDED.name`,
            [tournamentId, id, name]
          );
        }

        const groupIds = new Set();
        for (const group of groups) {
          const groupId = normalizeSpaces(group?.id);
          const label = normalizeSpaces(group?.label);
          if (!groupId || !label) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: "Each group requires id and label" });
          }
          if (groupIds.has(groupId)) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: `Duplicate group id: ${groupId}` });
          }
          groupIds.add(groupId);
          const format = isNonEmptyString(group?.format) ? normalizeSpaces(group.format) : null;
          await client.query(
            `INSERT INTO groups (tournament_id, id, label, format)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (tournament_id, id) DO UPDATE SET label = EXCLUDED.label, format = EXCLUDED.format`,
            [tournamentId, groupId, label, format]
          );
        }

        for (const link of groupVenues) {
          const groupId = normalizeSpaces(link?.group_id);
          const venueName = normalizeSpaces(link?.venue_name);
          if (!groupId || !venueName) continue;
          const venueEntry = venueMap.get(venueName.toLowerCase());
          if (!venueEntry) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: `Unknown venue: ${venueName}` });
          }
          await client.query(
            `INSERT INTO group_venue (tournament_id, group_id, venue_id)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [tournamentId, groupId, venueEntry.id]
          );
        }

        const franchiseMap = new Map();
        for (const franchise of franchises) {
          const nameRaw = normalizeSpaces(franchise?.name);
          if (!nameRaw) continue;
          const name = toTitleCase(nameRaw);
          const id = slug(`${tournamentId}:${name}`);
          franchiseMap.set(name.toLowerCase(), { id, name });
          await client.query(
            `INSERT INTO franchise (
               tournament_id,
               id,
               name,
               logo_url,
               manager_name,
               manager_photo_url,
               description,
               contact_phone,
               location_map_url,
               contact_email
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (tournament_id, id) DO UPDATE SET
               name = EXCLUDED.name,
               logo_url = EXCLUDED.logo_url,
               manager_name = EXCLUDED.manager_name,
               manager_photo_url = EXCLUDED.manager_photo_url,
               description = EXCLUDED.description,
               contact_phone = EXCLUDED.contact_phone,
               location_map_url = EXCLUDED.location_map_url,
               contact_email = EXCLUDED.contact_email`,
            [
              tournamentId,
              id,
              name,
              franchise.logo_url || null,
              franchise.manager_name || null,
              franchise.manager_photo_url || null,
              franchise.description || null,
              franchise.contact_phone || null,
              franchise.location_map_url || null,
              franchise.contact_email || null,
            ]
          );
        }

        const teamMap = new Map();
        const placeholderTeams = new Set();
        for (const team of teams) {
          const groupId = normalizeSpaces(team?.group_id);
          if (!groupId || !groupIds.has(groupId)) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: `Unknown team group: ${groupId || "(missing)"}` });
          }
          const name = normalizeTeamName(team?.name);
          if (!name) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: "Team name is required" });
          }
          const isPlaceholder = !!team?.is_placeholder;
          const franchiseNameRaw = normalizeSpaces(team?.franchise_name);
          let franchiseId = null;
          if (franchiseNameRaw) {
            const franchiseEntry = franchiseMap.get(franchiseNameRaw.toLowerCase());
            if (!franchiseEntry) {
              await client.query("ROLLBACK");
              return sendJson(req, res, 400, { ok: false, error: `Unknown franchise: ${franchiseNameRaw}` });
            }
            franchiseId = franchiseEntry.id;
          }
          const id = slug(`${tournamentId}:${groupId}:${name}`);
          const key = `${groupId}:${name.toLowerCase()}`;
          teamMap.set(key, { id, name, groupId, isPlaceholder });
          if (isPlaceholder) placeholderTeams.add(id);
          await client.query(
            `INSERT INTO team (tournament_id, id, group_id, name, is_placeholder, franchise_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (tournament_id, id) DO UPDATE SET
               name = EXCLUDED.name,
               is_placeholder = EXCLUDED.is_placeholder,
               franchise_id = EXCLUDED.franchise_id`,
            [tournamentId, id, groupId, name, isPlaceholder, franchiseId]
          );
        }

        const fixtureKeySet = new Set();
        for (const fixture of fixtures) {
          const groupId = normalizeSpaces(fixture?.group_id);
          if (!groupId || !groupIds.has(groupId)) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: `Unknown fixture group: ${groupId || "(missing)"}` });
          }
          const date = normalizeSpaces(fixture?.date);
          if (!date) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: "Fixture date is required" });
          }
          const pool = normalizeSpaces(fixture?.pool);
          if (!pool) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: "Fixture pool is required" });
          }
          const time = normalizeSpaces(fixture?.time) || "TBD";
          const venue = normalizeSpaces(fixture?.venue) || "";
          const round = normalizeSpaces(fixture?.round) || "";
          const team1Name = normalizeTeamName(fixture?.team1);
          const team2Name = normalizeTeamName(fixture?.team2);
          if (!team1Name || !team2Name) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: "Fixture team1 and team2 are required" });
          }
          const team1 = teamMap.get(`${groupId}:${team1Name.toLowerCase()}`);
          const team2 = teamMap.get(`${groupId}:${team2Name.toLowerCase()}`);
          if (!team1 || !team2) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: `Fixture teams not found: ${team1Name} vs ${team2Name}` });
          }
          if (placeholderTeams.has(team1.id) || placeholderTeams.has(team2.id)) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: "Fixtures cannot include placeholder teams" });
          }
          const fixtureKey = `${date}|${time}|${team1.name}|${team2.name}|${venue}|${round}|${pool}`;
          const dedupeKey = `${groupId}:${fixtureKey}`;
          if (fixtureKeySet.has(dedupeKey)) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: `Duplicate fixture: ${fixtureKey}` });
          }
          fixtureKeySet.add(dedupeKey);
          const id = slug(`${tournamentId}:${groupId}:${fixtureKey}`);

          await client.query(
            `INSERT INTO fixture (
               tournament_id,
               id,
               group_id,
               date,
               time,
               venue,
               round,
               pool,
               team1_id,
               team2_id,
               fixture_key
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (tournament_id, id) DO UPDATE SET
               date = EXCLUDED.date,
               time = EXCLUDED.time,
               venue = EXCLUDED.venue,
               round = EXCLUDED.round,
               pool = EXCLUDED.pool,
               team1_id = EXCLUDED.team1_id,
               team2_id = EXCLUDED.team2_id,
               fixture_key = EXCLUDED.fixture_key`,
            [
              tournamentId,
              id,
              groupId,
              date,
              time,
              venue,
              round,
              pool,
              team1.id,
              team2.id,
              fixtureKey,
            ]
          );
        }

        for (const slot of timeSlots) {
          const date = normalizeSpaces(slot?.date);
          const time = normalizeSpaces(slot?.time);
          const venueName = normalizeSpaces(slot?.venue);
          const label = normalizeSpaces(slot?.label);
          if (!date || !time || !venueName) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: "Time slots require date, time, and venue" });
          }
          const venueEntry = venueMap.get(venueName.toLowerCase());
          if (!venueEntry) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: `Unknown venue: ${venueName}` });
          }
          const id = slug(`${tournamentId}:${venueEntry.id}:${date}:${time}:${label || ""}`);
          await client.query(
            `INSERT INTO time_slot (tournament_id, id, venue_id, date, time, label)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (tournament_id, id) DO UPDATE SET
               venue_id = EXCLUDED.venue_id,
               date = EXCLUDED.date,
               time = EXCLUDED.time,
               label = EXCLUDED.label`,
            [tournamentId, id, venueEntry.id, date, time, label || null]
          );
        }

        await client.query("COMMIT");

        await logAudit("tournament.create", {
          tournament_id: tournamentId,
          entity_type: "tournament",
          entity_id: tournamentId,
          meta: {
            name: tournamentName,
            groups: Array.isArray(groups) ? groups.length : 0,
            teams: Array.isArray(teams) ? teams.length : 0,
            fixtures: Array.isArray(fixtures) ? fixtures.length : 0,
          },
        });

        return sendJson(req, res, 201, { ok: true, tournament_id: tournamentId });
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Tournament wizard error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to create tournament" });
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("Tournament wizard error:", err);
      return sendJson(req, res, 500, { ok: false, error: "Failed to create tournament" });
    }
  }

  // CORS headers for admin (if needed specifically, though index.mjs handles it generally, 
  // we might need to ensure OPTIONS passes through or headers conform)

  if (path === "/announcements") {
    if (method === "GET") {
      try {
        if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
        const tournamentId = url.searchParams.get("tournamentId");
        const params = [tournamentId ?? null];
        const result = await pool.query(
          `SELECT *
           FROM announcements
           WHERE ($1::text IS NULL OR tournament_id = $1)
           ORDER BY created_at DESC`,
          params
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
        if (!body) return sendJson(req, res, 400, { ok: false, error: "Invalid body" });
        const { title, body: content, severity, tournament_id, is_published } = body;

        if (!title || !content) {
          return sendJson(req, res, 400, { ok: false, error: "Title and Message are required" });
        }

        // Use null for tournament_id if it's "general" or empty
        const safeTournamentId = tournament_id === 'general' || !tournament_id ? null : tournament_id;

        const result = await pool.query(
          `INSERT INTO announcements (tournament_id, title, body, severity, is_published)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [safeTournamentId, title, content, severity || 'info', !!is_published]
        );
        if (result.rows.length === 0) throw new Error("Insert failed to return data");

        await logAudit("announcement.create", {
          tournament_id: safeTournamentId,
          entity_type: "announcement",
          entity_id: String(result.rows[0]?.id ?? ""),
          meta: {
            title,
            severity: severity || "info",
            is_published: !!is_published,
          },
        });

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

  if (path === "/venues") {
    if (method !== "GET") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }
    try {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const result = await pool.query(
        `SELECT DISTINCT name
         FROM venue
         ORDER BY name ASC`
      );
      return sendJson(req, res, 200, { ok: true, data: result.rows });
    } catch (err) {
      console.error("Admin API Error:", err);
      return sendJson(req, res, 500, { ok: false, error: err.message });
    }
  }

  if (path === "/audit-log") {
    if (method !== "GET") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }
    try {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const tournamentId = normalizeSpaces(url.searchParams.get("tournamentId")) || null;
      const limitRaw = normalizeSpaces(url.searchParams.get("limit"));
      const limit = Math.min(Math.max(Number(limitRaw || 50) || 50, 1), 200);

      const result = await pool.query(
        `SELECT id, created_at, actor_email, action, tournament_id, entity_type, entity_id, meta
         FROM audit_log
         WHERE ($1::text IS NULL OR tournament_id = $1)
         ORDER BY created_at DESC
         LIMIT $2`,
        [tournamentId, limit]
      );

      return sendJson(req, res, 200, { ok: true, data: result.rows || [] });
    } catch (err) {
      console.error("Admin audit-log error:", err);
      return sendJson(req, res, 500, { ok: false, error: "Failed to load audit log" });
    }
  }

  if (path === "/fixtures") {
    if (method !== "GET") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }
    try {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const tournamentId = normalizeSpaces(url.searchParams.get("tournamentId"));
      const groupId = normalizeSpaces(url.searchParams.get("groupId"));
      if (!tournamentId) {
        return sendJson(req, res, 400, { ok: false, error: "Missing tournamentId" });
      }
      if (!groupId) {
        return sendJson(req, res, 400, { ok: false, error: "Missing groupId" });
      }

      const result = await pool.query(
        `SELECT
           f.id AS fixture_id,
           f.group_id,
           to_char(f.date, 'YYYY-MM-DD') AS date,
           f.time,
           f.pool,
           f.venue,
           f.round,
           t1.name AS team1,
           t2.name AS team2,
           r.score1,
           r.score2,
           r.updated_at AS result_updated_at
         FROM fixture f
         JOIN team t1
           ON t1.tournament_id = f.tournament_id
          AND t1.id = f.team1_id
         JOIN team t2
           ON t2.tournament_id = f.tournament_id
          AND t2.id = f.team2_id
         LEFT JOIN result r
           ON r.tournament_id = f.tournament_id
          AND r.fixture_id = f.id
         WHERE f.tournament_id = $1
           AND f.group_id = $2
         ORDER BY f.date, f.time, f.fixture_key`,
        [tournamentId, groupId]
      );
      return sendJson(req, res, 200, { ok: true, data: result.rows || [] });
    } catch (err) {
      console.error("Admin fixtures error:", err);
      return sendJson(req, res, 500, { ok: false, error: "Failed to load fixtures" });
    }
  }

  if (path === "/results") {
    if (method !== "PUT" && method !== "POST") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }
    try {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const body = await readBody(req);
      if (!body) return sendJson(req, res, 400, { ok: false, error: "Invalid body" });

      const tournamentId = normalizeSpaces(body.tournament_id || body.tournamentId);
      const fixtureId = normalizeSpaces(body.fixture_id || body.fixtureId);
      const score1 = parseScore(body.score1);
      const score2 = parseScore(body.score2);

      if (!tournamentId) {
        return sendJson(req, res, 400, { ok: false, error: "tournament_id is required" });
      }
      if (!fixtureId) {
        return sendJson(req, res, 400, { ok: false, error: "fixture_id is required" });
      }
      if (!isValidScore(score1) || !isValidScore(score2)) {
        return sendJson(req, res, 400, { ok: false, error: "Scores must be integers between 0 and 99 (or blank to clear)" });
      }

      // Ensure fixture exists for tournament
      const exists = await pool.query(
        `SELECT 1 FROM fixture WHERE tournament_id = $1 AND id = $2`,
        [tournamentId, fixtureId]
      );
      if (!exists || exists.rowCount === 0) {
        return sendJson(req, res, 404, { ok: false, error: "Fixture not found" });
      }

      const upsert = await pool.query(
        `INSERT INTO result (tournament_id, fixture_id, score1, score2, status, updated_at, source)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT (tournament_id, fixture_id)
         DO UPDATE SET
           score1 = EXCLUDED.score1,
           score2 = EXCLUDED.score2,
           status = EXCLUDED.status,
           updated_at = NOW(),
           source = EXCLUDED.source
         RETURNING tournament_id, fixture_id, score1, score2, status, updated_at`,
        [tournamentId, fixtureId, score1, score2, "Final", "admin"]
      );

      // Invalidate caches for fixtures/standings (best-effort)
      try {
        caches?.fixturesCache?.clear?.();
        caches?.standingsCache?.clear?.();
      } catch {
        // ignore cache invalidation failures
      }

      await logAudit("result.upsert", {
        tournament_id: tournamentId,
        entity_type: "result",
        entity_id: fixtureId,
        meta: { score1, score2 },
      });

      return sendJson(req, res, 200, { ok: true, data: upsert.rows?.[0] || null });
    } catch (err) {
      console.error("Admin results error:", err);
      return sendJson(req, res, 500, { ok: false, error: "Failed to save result" });
    }
  }

  // Handle /announcements/:id
  const match = path.match(/^\/announcements\/([^/]+)/);
  if (match) {
    const id = match[1];

    if (method === "PUT") {
      try {
        if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
        const body = await readBody(req);
        if (!body) return sendJson(req, res, 400, { ok: false, error: "Invalid body" });
        const { title, body: content, severity, tournament_id, is_published } = body;

        if (!title || !content) {
          return sendJson(req, res, 400, { ok: false, error: "Title and Message are required" });
        }

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

        if (!result || !result.rows || result.rows.length === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Announcement not found" });
        }

        await logAudit("announcement.update", {
          tournament_id: safeTournamentId,
          entity_type: "announcement",
          entity_id: String(id),
          meta: {
            title,
            severity,
            is_published: !!is_published,
            refresh_date: !!body.refresh_date,
          },
        });

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

        await logAudit("announcement.delete", {
          tournament_id: null,
          entity_type: "announcement",
          entity_id: String(id),
        });

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
  return readBodyLimited(req).then((raw) => {
    try {
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      throw e;
    }
  });
}
