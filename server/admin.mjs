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

function slugSimple(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
}

function slugForTournament(name, season) {
  const base = [name, season].filter(Boolean).join(" ");
  const s = slugSimple(base);
  if (!s) return "";
  return s.startsWith("hj-") ? s : `hj-${s}`;
}

function abbreviateGroup(label) {
  const parts = String(label || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  return parts[0] + parts.slice(1).map((p) => p[0].toUpperCase()).join("");
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

function requireGetWithDb(method, pool, req, res, sendJson) {
  if (method !== "GET") {
    sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    return false;
  }
  if (!pool) {
    sendJson(req, res, 501, { ok: false, error: "DB not configured" });
    return false;
  }
  return true;
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

export async function handleAdminRequest(req, res, { url, pool, sendJson, caches } = {}) {
  const logAudit = (action, data) => writeAuditLog(pool, { actor_email: caches?.actorEmail || "unknown", action, ...data });

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

      if (!tournament || !isNonEmptyString(tournament.name)) {
        return sendJson(req, res, 400, { ok: false, error: "tournament.name is required" });
      }

      if (!Array.isArray(groups) || groups.length === 0) {
        return sendJson(req, res, 400, { ok: false, error: "At least one group is required" });
      }

      const tournamentName = normalizeSpaces(tournament.name);
      const tournamentSeason = isNonEmptyString(tournament.season)
        ? normalizeSpaces(tournament.season)
        : null;
      const rawId = isNonEmptyString(tournament.id)
        ? normalizeSpaces(tournament.id)
        : slugForTournament(tournamentName, tournamentSeason);
      const tournamentId = rawId;

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
          `INSERT INTO tournament (id, name, season, source)
           VALUES ($1, $2, $3, 'App')`,
          [tournamentId, tournamentName, tournamentSeason]
        );

        // venueMap: populated on-demand from venue_directory as groupVenues are processed.
        // Explicit `venues` array in the payload is still supported for backwards compat.
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
          const label = normalizeSpaces(group?.label);
          if (!label) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: "Each group requires a label (Division/Age)" });
          }
          const rawGroupId = isNonEmptyString(group?.id)
            ? normalizeSpaces(group.id)
            : abbreviateGroup(label);
          const groupId = rawGroupId || slugSimple(label);
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

          // Resolve venue from the in-memory map first (already created this request),
          // then fall back to venue_directory (global registry), auto-creating the
          // tournament-scoped venue record if found — same pattern as franchise resolution.
          let venueEntry = venueMap.get(venueName.toLowerCase());
          if (!venueEntry) {
            const dirRow = await client.query(
              `SELECT id, name FROM venue_directory WHERE LOWER(name) = LOWER($1) LIMIT 1`,
              [venueName]
            );
            if (!dirRow.rows.length) {
              // Venue not in directory — skip silently rather than failing the whole transaction.
              // The venue name is still stored as free text on each fixture.
              continue;
            }
            const dir = dirRow.rows[0];
            const vId = slug(`${tournamentId}:${dir.name}`);
            venueEntry = { id: vId, name: dir.name };
            venueMap.set(venueName.toLowerCase(), venueEntry);
            await client.query(
              `INSERT INTO venue (tournament_id, id, name)
               VALUES ($1, $2, $3)
               ON CONFLICT (tournament_id, id) DO UPDATE SET name = EXCLUDED.name`,
              [tournamentId, vId, dir.name]
            );
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
            let franchiseEntry = franchiseMap.get(franchiseNameRaw.toLowerCase());
            if (!franchiseEntry) {
              // Resolve from franchise_directory (global) and create tournament-scoped entry
              const dirRow = await client.query(
                `SELECT id, name, logo_url, manager_name, manager_photo_url, description,
                        contact_phone, location_map_url, contact_email
                 FROM franchise_directory WHERE LOWER(name) = LOWER($1) LIMIT 1`,
                [franchiseNameRaw]
              );
              if (!dirRow.rows.length) {
                await client.query("ROLLBACK");
                return sendJson(req, res, 400, { ok: false, error: `Unknown franchise: ${franchiseNameRaw}` });
              }
              const dir = dirRow.rows[0];
              const fName = toTitleCase(dir.name);
              const fId = slug(`${tournamentId}:${fName}`);
              franchiseEntry = { id: fId, name: fName };
              franchiseMap.set(franchiseNameRaw.toLowerCase(), franchiseEntry);
              await client.query(
                `INSERT INTO franchise (tournament_id, id, name, logo_url, manager_name,
                   manager_photo_url, description, contact_phone, location_map_url, contact_email)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 ON CONFLICT (tournament_id, id) DO UPDATE SET
                   name = EXCLUDED.name, logo_url = EXCLUDED.logo_url,
                   manager_name = EXCLUDED.manager_name, manager_photo_url = EXCLUDED.manager_photo_url,
                   description = EXCLUDED.description, contact_phone = EXCLUDED.contact_phone,
                   location_map_url = EXCLUDED.location_map_url, contact_email = EXCLUDED.contact_email`,
                [tournamentId, fId, fName, dir.logo_url, dir.manager_name,
                 dir.manager_photo_url, dir.description, dir.contact_phone,
                 dir.location_map_url, dir.contact_email]
              );
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

  if (path === "/divisions") {
    if (method !== "GET") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }
    try {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const result = await pool.query(
        `SELECT DISTINCT label FROM groups ORDER BY label`
      );
      return sendJson(req, res, 200, { ok: true, data: result.rows.map((r) => r.label) });
    } catch (err) {
      console.error("Admin API Error:", err);
      return sendJson(req, res, 500, { ok: false, error: err.message });
    }
  }

  // GET /admin/franchise-teams?franchise=<name>
  // Returns distinct team names previously used by this franchise across all tournaments.
  // Used by the wizard to suggest team names after a franchise is selected.
  if (path === "/franchise-teams") {
    if (method !== "GET") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }
    try {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const franchiseName = url.searchParams.get("franchise");
      if (!franchiseName?.trim()) {
        return sendJson(req, res, 400, { ok: false, error: "franchise query param is required" });
      }
      const result = await pool.query(
        `SELECT DISTINCT t.name
         FROM team t
         JOIN franchise f ON f.tournament_id = t.tournament_id AND f.id = t.franchise_id
         JOIN franchise_directory fd ON LOWER(fd.name) = LOWER(f.name)
         WHERE LOWER(fd.name) = LOWER($1)
           AND t.is_placeholder = false
         ORDER BY t.name`,
        [franchiseName.trim()]
      );
      return sendJson(req, res, 200, { ok: true, data: result.rows.map((r) => r.name) });
    } catch (err) {
      console.error("Admin API Error:", err);
      return sendJson(req, res, 500, { ok: false, error: err.message });
    }
  }

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

  // Venues (global directory)
  // - GET    /api/admin/venues
  // - POST   /api/admin/venues
  // - GET    /api/admin/venues/:id
  // - PATCH  /api/admin/venues/:id
  // - DELETE /api/admin/venues/:id
  if (path === "/venues" || path.startsWith("/venues/")) {
    if (!pool) {
      return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
    }

    const venueId = path.startsWith("/venues/") ? decodeURIComponent(path.split("/")[2] || "") : "";

    if (method === "GET" && !venueId) {
      try {
        const result = await pool.query(
          `SELECT id, name, address AS location, location_map_url, website_url, created_at, updated_at
           FROM venue_directory
           ORDER BY name ASC`
        );
        return sendJson(req, res, 200, { ok: true, data: result.rows || [] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to load venues" });
      }
    }

    if (method === "GET" && venueId) {
      try {
        const result = await pool.query(
          `SELECT id, name, address AS location, location_map_url, website_url, created_at, updated_at
           FROM venue_directory
           WHERE id = $1`,
          [venueId]
        );
        if (!result.rows?.length) {
          return sendJson(req, res, 404, { ok: false, error: "Venue not found" });
        }
        return sendJson(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to load venue" });
      }
    }

    if (method === "POST" && !venueId) {
      try {
        const body = await readBody(req);
        if (!body) return sendJson(req, res, 400, { ok: false, error: "Invalid body" });

        const name = toTitleCase(normalizeSpaces(body.name));
        if (!name) return sendJson(req, res, 400, { ok: false, error: "name is required" });

        const result = await pool.query(
          `INSERT INTO venue_directory (name, address, location_map_url, website_url)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, address AS location, location_map_url, website_url, created_at, updated_at`,
          [
            name,
            body.location ? normalizeSpaces(body.location) : null,
            body.location_map_url ? body.location_map_url.trim() : null,
            body.website_url ? body.website_url.trim() : null,
          ]
        );

        await logAudit("venue.create", {
          entity_type: "venue_directory",
          entity_id: String(result.rows[0]?.id ?? ""),
          meta: { name },
        });

        return sendJson(req, res, 201, { ok: true, data: result.rows[0] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }

    if (method === "PATCH" && venueId) {
      try {
        const body = await readBody(req);
        if (!body) return sendJson(req, res, 400, { ok: false, error: "Invalid body" });

        const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

        // Build dynamic update set
        const set = [];
        const values = [];
        let idx = 1;

        if (body.name) {
          set.push(`name = $${idx++}`);
          values.push(toTitleCase(normalizeSpaces(body.name)));
        }
        if (has("location")) {
          set.push(`address = $${idx++}`);
          values.push(body.location ? normalizeSpaces(body.location) : null);
        }
        if (has("location_map_url")) {
          set.push(`location_map_url = $${idx++}`);
          values.push(body.location_map_url ? body.location_map_url.trim() : null);
        }
        if (has("website_url")) {
          set.push(`website_url = $${idx++}`);
          values.push(body.website_url ? body.website_url.trim() : null);
        }

        if (set.length === 0) {
          return sendJson(req, res, 400, { ok: false, error: "No fields to update" });
        }

        values.push(venueId);
        const result = await pool.query(
          `UPDATE venue_directory
           SET ${set.join(", ")}
           WHERE id = $${idx}
           RETURNING id, name, address AS location, location_map_url, website_url, created_at, updated_at`,
          values
        );

        if (!result.rowCount) {
          return sendJson(req, res, 404, { ok: false, error: "Venue not found" });
        }

        await logAudit("venue.update", {
          entity_type: "venue_directory",
          entity_id: String(venueId),
          meta: { fields: Object.keys(body || {}) },
        });

        return sendJson(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }

    if (method === "DELETE" && venueId) {
      try {
        const result = await pool.query(
          `DELETE FROM venue_directory
           WHERE id = $1
           RETURNING id, name`,
          [venueId]
        );

        if (!result.rowCount) {
          return sendJson(req, res, 404, { ok: false, error: "Venue not found" });
        }

        await logAudit("venue.delete", {
          entity_type: "venue_directory",
          entity_id: String(venueId),
          meta: { name: result.rows[0]?.name || "" },
        });

        return sendJson(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  if (path === "/franchises") {
    if (!pool) {
      return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
    }

    if (method === "GET") {
      try {
        const result = await pool.query(
          `SELECT id, name, logo_url, manager_name, manager_photo_url, description,
                  contact_phone, location_map_url, contact_email, created_at, updated_at
           FROM franchise_directory
           ORDER BY name ASC`
        );
        return sendJson(req, res, 200, { ok: true, data: result.rows || [] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to load franchises" });
      }
    }

    if (method === "POST") {
      try {
        const body = await readBody(req);
        if (!body) return sendJson(req, res, 400, { ok: false, error: "Invalid body" });
        const name = toTitleCase(normalizeSpaces(body.name));
        if (!name) return sendJson(req, res, 400, { ok: false, error: "name is required" });

        const result = await pool.query(
          `INSERT INTO franchise_directory (
             name, logo_url, manager_name, manager_photo_url, description,
             contact_phone, location_map_url, contact_email
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, name, logo_url, manager_name, manager_photo_url, description,
                     contact_phone, location_map_url, contact_email, created_at, updated_at`,
          [
            name,
            body.logo_url || null,
            body.manager_name || null,
            body.manager_photo_url || null,
            body.description || null,
            body.contact_phone || null,
            body.location_map_url || null,
            body.contact_email || null,
          ]
        );

        logAudit("franchise_directory.create", { entity_type: "franchise_directory", entity_id: result.rows[0].id, meta: { name } });
        return sendJson(req, res, 201, { ok: true, data: result.rows[0] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }

    if (method !== "POST" && method !== "GET") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }
  }

  if (path.startsWith("/franchises/") && path !== "/franchises/import") {
    if (!pool) {
      return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
    }

    const id = normalizeSpaces(path.replace("/franchises/", ""));
    if (!id) return sendJson(req, res, 400, { ok: false, error: "Missing id" });

    if (method === "PATCH") {
      try {
        const body = await readBody(req);
        if (!body) return sendJson(req, res, 400, { ok: false, error: "Invalid body" });

        const patch = {
          name: body.name != null ? toTitleCase(normalizeSpaces(body.name)) : null,
          logo_url: body.logo_url != null ? body.logo_url : null,
          manager_name: body.manager_name != null ? body.manager_name : null,
          manager_photo_url: body.manager_photo_url != null ? body.manager_photo_url : null,
          description: body.description != null ? body.description : null,
          contact_phone: body.contact_phone != null ? body.contact_phone : null,
          location_map_url: body.location_map_url != null ? body.location_map_url : null,
          contact_email: body.contact_email != null ? body.contact_email : null,
        };

        const name = patch.name;
        if (body.name != null && !name) {
          return sendJson(req, res, 400, { ok: false, error: "name is required" });
        }

        const result = await pool.query(
          `UPDATE franchise_directory
              SET name = COALESCE($2, name),
                  logo_url = COALESCE($3, logo_url),
                  manager_name = COALESCE($4, manager_name),
                  manager_photo_url = COALESCE($5, manager_photo_url),
                  description = COALESCE($6, description),
                  contact_phone = COALESCE($7, contact_phone),
                  location_map_url = COALESCE($8, location_map_url),
                  contact_email = COALESCE($9, contact_email)
            WHERE id = $1
        RETURNING id, name, logo_url, manager_name, manager_photo_url, description,
                  contact_phone, location_map_url, contact_email, created_at, updated_at`,
          [
            id,
            patch.name,
            patch.logo_url,
            patch.manager_name,
            patch.manager_photo_url,
            patch.description,
            patch.contact_phone,
            patch.location_map_url,
            patch.contact_email,
          ]
        );

        if (result.rowCount === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Franchise not found" });
        }

        logAudit("franchise_directory.update", { entity_type: "franchise_directory", entity_id: id, meta: { name: result.rows[0].name } });
        return sendJson(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }

    if (method === "DELETE") {
      try {
        const existing = await pool.query(
          `SELECT id, name FROM franchise_directory WHERE id = $1`,
          [id]
        );
        if (existing.rowCount === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Franchise not found" });
        }

        await pool.query(`DELETE FROM franchise_directory WHERE id = $1`, [id]);
        logAudit("franchise_directory.delete", { entity_type: "franchise_directory", entity_id: id, meta: { name: existing.rows[0].name } });
        return sendJson(req, res, 200, { ok: true });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  if (path === "/franchises/import") {
    if (!pool) {
      return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
    }

    if (method !== "POST") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }

    try {
      const body = await readBody(req);
      if (!body) return sendJson(req, res, 400, { ok: false, error: "Invalid body" });

      const raw = normalizeSpaces(body.names || body.text || body.csv || "");
      if (!raw) return sendJson(req, res, 400, { ok: false, error: "No names provided" });

      const lines = String(body.names || body.text || body.csv || "")
        .split(/\r?\n/)
        .map((line) => line.split(",")[0])
        .map((line) => toTitleCase(normalizeSpaces(line)))
        .filter(Boolean);

      const unique = Array.from(new Set(lines));
      if (unique.length === 0) return sendJson(req, res, 400, { ok: false, error: "No valid names provided" });

      const inserted = [];
      for (const name of unique) {
        const result = await pool.query(
          `INSERT INTO franchise_directory (name)
           VALUES ($1)
           ON CONFLICT (name) DO NOTHING
           RETURNING id, name, created_at, updated_at`,
          [name]
        );
        if (result.rowCount > 0) inserted.push(result.rows[0]);
      }

      logAudit("franchise_directory.import", { entity_type: "franchise_directory", meta: { inserted: inserted.length, attempted: unique.length } });
      return sendJson(req, res, 201, { ok: true, data: inserted });
    } catch (err) {
      console.error("Admin API Error:", err);
      return sendJson(req, res, 500, { ok: false, error: err.message });
    }
  }

  if (path === "/audit-log") {
    if (!requireGetWithDb(method, pool, req, res, sendJson)) return;
    try {
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
    if (!requireGetWithDb(method, pool, req, res, sendJson)) return;
    try {
      const tournamentId = normalizeSpaces(url.searchParams.get("tournamentId"));
      const fixtureId = normalizeSpaces(url.searchParams.get("fixtureId"));
      const groupId = normalizeSpaces(url.searchParams.get("groupId"));
      if (!tournamentId) {
        return sendJson(req, res, 400, { ok: false, error: "Missing tournamentId" });
      }

      // Single-fixture lookup (used by Tech Desk)
      if (fixtureId) {
        const row = await pool.query(
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
             r.status AS result_status,
             r.alert_message,
             COALESCE(r.match_events, '[]'::jsonb) AS match_events,
             COALESCE(r.is_signed_off, false) AS is_signed_off,
             r.coach_signature,
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
             AND f.id = $2`,
          [tournamentId, fixtureId]
        );
        if (!row || row.rowCount === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Fixture not found" });
        }
        return sendJson(req, res, 200, { ok: true, data: row.rows[0] });
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
           r.status AS result_status,
           r.alert_message,
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
      const matchEvents = Array.isArray(body.match_events) ? body.match_events : undefined;
      const isSignedOff = body.is_signed_off === true;
      const coachSignature = body.coach_signature && typeof body.coach_signature === 'object'
        ? body.coach_signature : undefined;

      const VALID_STATUSES = new Set(["Final", "Postponed", "Cancelled", "Delayed", "TBC", "Live", ""]);
      const alertStatus = body.alert_status != null ? normalizeSpaces(String(body.alert_status)) : null;
      const alertMessage = body.alert_message != null ? normalizeSpaces(String(body.alert_message)).slice(0, 280) : null;
      if (alertStatus !== null && !VALID_STATUSES.has(alertStatus)) {
        return sendJson(req, res, 400, { ok: false, error: `Invalid alert_status. Must be one of: ${[...VALID_STATUSES].filter(Boolean).join(", ")}` });
      }

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

      // Derive final status: alert_status wins if provided, else "Final" if scores present
      const resolvedStatus = alertStatus !== null && alertStatus !== ""
        ? alertStatus
        : (score1 !== null || score2 !== null ? "Final" : "");

      const upsert = await pool.query(
        `INSERT INTO result (tournament_id, fixture_id, score1, score2, status, alert_message, updated_at, source,
           match_events, is_signed_off, coach_signature)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10)
         ON CONFLICT (tournament_id, fixture_id)
         DO UPDATE SET
           score1 = EXCLUDED.score1,
           score2 = EXCLUDED.score2,
           status = EXCLUDED.status,
           alert_message = EXCLUDED.alert_message,
           updated_at = NOW(),
           source = EXCLUDED.source,
           match_events = COALESCE(EXCLUDED.match_events, result.match_events),
           is_signed_off = CASE WHEN EXCLUDED.is_signed_off THEN true ELSE result.is_signed_off END,
           coach_signature = COALESCE(EXCLUDED.coach_signature, result.coach_signature)
         RETURNING tournament_id, fixture_id, score1, score2, status, alert_message, updated_at,
           match_events, is_signed_off, coach_signature`,
        [
          tournamentId, fixtureId, score1, score2, resolvedStatus || null, alertMessage,
          "admin",
          matchEvents ? JSON.stringify(matchEvents) : null,
          isSignedOff,
          coachSignature ? JSON.stringify(coachSignature) : null,
        ]
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
        meta: { score1, score2, alert_status: resolvedStatus, is_signed_off: isSignedOff },
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

  if (path === "/allowlist") {
    if (method === "GET") {
      if (!requireGetWithDb(method, pool, req, res, sendJson)) return;
      try {
        const result = await pool.query(
          `SELECT email, note, added_at FROM admin_allowlist ORDER BY added_at ASC`
        );
        return sendJson(req, res, 200, { ok: true, data: result.rows });
      } catch (err) {
        console.error("Admin allowlist GET error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to load allowlist" });
      }
    }
    if (method === "POST") {
      try {
        if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
        const body = await readBody(req);
        const email = normalizeSpaces(body?.email).toLowerCase();
        if (!email) return sendJson(req, res, 400, { ok: false, error: "email is required" });
        const note = normalizeSpaces(body?.note) || null;
        await pool.query(
          `INSERT INTO admin_allowlist (email, note) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET note = EXCLUDED.note`,
          [email, note]
        );
        return sendJson(req, res, 201, { ok: true, email });
      } catch (err) {
        console.error("Admin allowlist POST error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to update allowlist" });
      }
    }
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  const allowlistMatch = path.match(/^\/allowlist\/([^/]+)$/);
  if (allowlistMatch) {
    if (method !== "DELETE") {
      return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
    }
    try {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const email = decodeURIComponent(allowlistMatch[1]).toLowerCase();
      const result = await pool.query(
        `DELETE FROM admin_allowlist WHERE email = $1 RETURNING email`,
        [email]
      );
      if (result.rowCount === 0) {
        return sendJson(req, res, 404, { ok: false, error: "Email not found in allowlist" });
      }
      return sendJson(req, res, 200, { ok: true, deleted: email });
    } catch (err) {
      console.error("Admin allowlist DELETE error:", err);
      return sendJson(req, res, 500, { ok: false, error: "Failed to update allowlist" });
    }
  }

  // ── Digest share links ───────────────────────────────────────────────────

  if (path === "/digests") {
    if (method === "POST") {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      let body;
      try { body = await readBody(req); } catch { return sendJson(req, res, 400, { ok: false, error: "Invalid JSON" }); }

      const { tournament_id, age_id, label } = body || {};
      if (!isNonEmptyString(tournament_id)) {
        return sendJson(req, res, 400, { ok: false, error: "tournament_id is required" });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashString(rawToken);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      try {
        await pool.query(
          `INSERT INTO digest_share (token_hash, tournament_id, age_id, label, created_by, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            tokenHash,
            tournament_id,
            age_id || null,
            label ? normalizeSpaces(label) : null,
            caches?.actorEmail || "unknown",
            expiresAt.toISOString(),
          ]
        );
      } catch (err) {
        console.error("digest_share INSERT error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to create share link" });
      }

      await logAudit("digest_share.create", {
        tournament_id,
        entity_type: "digest_share",
        meta: { age_id: age_id || null, label: label || null },
      });

      return sendJson(req, res, 201, {
        ok: true,
        token: rawToken,
        expires_at: expiresAt.toISOString(),
      });
    }

    if (method === "GET") {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const tournamentId = url.searchParams.get("tournamentId");
      const qParams = tournamentId ? [tournamentId] : [];
      const whereClause = tournamentId
        ? "WHERE tournament_id = $1 ORDER BY created_at DESC"
        : "ORDER BY created_at DESC";
      try {
        const result = await pool.query(
          `SELECT id, tournament_id, age_id, label, created_by, created_at, expires_at, revoked_at
           FROM digest_share ${whereClause}`,
          qParams
        );
        return sendJson(req, res, 200, { ok: true, data: result.rows });
      } catch (err) {
        console.error("digest_share GET error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to list share links" });
      }
    }

    if (method === "DELETE") {
      if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
      const id = url.searchParams.get("id");
      if (!isNonEmptyString(id)) return sendJson(req, res, 400, { ok: false, error: "id is required" });
      try {
        await pool.query(
          `UPDATE digest_share SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
          [id]
        );
        return sendJson(req, res, 200, { ok: true });
      } catch (err) {
        console.error("digest_share DELETE error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to revoke share link" });
      }
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  // Teams (read-only view of tournament teams)
  // - GET /api/admin/teams?tournamentId=X
  if (path === "/teams") {
    if (!pool) {
      return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
    }

    if (method === "GET") {
      const tournamentId = url.searchParams.get("tournamentId");
      if (!tournamentId) {
        return sendJson(req, res, 400, { ok: false, error: "tournamentId is required" });
      }
      try {
        const result = await pool.query(
          `SELECT t.id, t.name,
                  g.label AS group_label, g.id AS group_id,
                  f.name AS franchise_name
           FROM team t
           JOIN groups g ON g.id = t.group_id AND g.tournament_id = t.tournament_id
           LEFT JOIN franchise f ON f.id = t.franchise_id AND f.tournament_id = t.tournament_id
           WHERE t.tournament_id = $1
             AND t.is_placeholder = false
           ORDER BY g.label ASC, t.name ASC`,
          [tournamentId]
        );
        return sendJson(req, res, 200, { ok: true, data: result.rows || [] });
      } catch (err) {
        console.error("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to load teams" });
      }
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
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
