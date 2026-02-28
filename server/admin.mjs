import crypto from "node:crypto";

const IS_TEST = process.env.VITEST || process.env.NODE_ENV === "test";
const logAdminError = (...args) => {
  if (!IS_TEST) console.error(...args);
};

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

function requirePool(pool, req, res, sendJson) {
  if (!pool) {
    sendJson(req, res, 501, { ok: false, error: "DB not configured" });
    return false;
  }
  return true;
}

async function requireBody(req, res, sendJson) {
  const body = await readBody(req);
  if (!body) {
    sendJson(req, res, 400, { ok: false, error: "Invalid body" });
    return null;
  }
  return body;
}

async function handleAdminDb(req, res, sendJson, action, onError) {
  try {
    return await action();
  } catch (err) {
    if (onError) {
      const handled = onError(err);
      if (handled) return handled;
    }
    logAdminError("Admin API Error:", err);
    return sendJson(req, res, 500, { ok: false, error: err.message });
  }
}

function buildUpdateQuery({ table, data, where, returning, extraSet }) {
  const entries = Object.entries(data);
  const assignments = entries.map(([key], idx) => `${key} = $${idx + 1}`);
  if (extraSet) assignments.push(extraSet);
  const values = entries.map(([, value]) => value);
  const whereOffset = values.length;
  const whereClause = where.columns
    .map((col, idx) => `${col} = $${whereOffset + idx + 1}`)
    .join(" AND ");
  return {
    sql: `UPDATE ${table} SET ${assignments.join(", ")} WHERE ${whereClause} RETURNING ${returning}`,
    values: [...values, ...where.values],
  };
}

function buildDeleteQuery({ table, where, returning = "id" }) {
  const whereClause = where.columns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(" AND ");
  return {
    sql: `DELETE FROM ${table} WHERE ${whereClause} RETURNING ${returning}`,
    values: where.values,
  };
}

export async function handleAdminRequest(req, res, { url, pool, sendJson }) {
  // Simple router for Admin API
  const method = req.method;
  const path = url.pathname.replace("/api/admin", "");
  if (!IS_TEST) {
    console.log("Admin Request:", method, path); // DEBUG
  }

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

        const venueNames = venues
          .map((venue) => normalizeSpaces(venue?.name))
          .filter(Boolean);
        const venueDirectoryMap = new Map();
        if (venueNames.length) {
          const directoryResult = await client.query(
            `SELECT name, address, location_map_url
             FROM venue_directory
             WHERE name = ANY($1)`,
            [venueNames]
          );
          for (const row of directoryResult.rows) {
            const key = normalizeSpaces(row.name).toLowerCase();
            venueDirectoryMap.set(key, row);
          }
        }

        const venueMap = new Map();
        for (const venue of venues) {
          const name = normalizeSpaces(venue?.name);
          if (!name) continue;
          const directoryEntry = venueDirectoryMap.get(name.toLowerCase());
          if (!directoryEntry) {
            await client.query("ROLLBACK");
            return sendJson(req, res, 400, { ok: false, error: `Unknown venue: ${name}` });
          }
          const id = slug(`${tournamentId}:${name}`);
          venueMap.set(name.toLowerCase(), { id, name });
          await client.query(
            `INSERT INTO venue (tournament_id, id, name, address, location_map_url, website_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (tournament_id, id) DO UPDATE SET
               name = EXCLUDED.name,
               address = EXCLUDED.address,
               location_map_url = EXCLUDED.location_map_url,
               website_url = EXCLUDED.website_url`,
            [
              tournamentId,
              id,
              name,
              directoryEntry.address || null,
              directoryEntry.location_map_url || null,
              directoryEntry.website_url || null,
            ]
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
        return sendJson(req, res, 201, { ok: true, tournament_id: tournamentId });
      } catch (err) {
        await client.query("ROLLBACK");
        logAdminError("Tournament wizard error:", err);
        return sendJson(req, res, 500, { ok: false, error: "Failed to create tournament" });
      } finally {
        client.release();
      }
    } catch (err) {
      logAdminError("Tournament wizard error:", err);
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
        logAdminError("Admin API Error:", err);
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
        return sendJson(req, res, 201, { ok: true, data: result.rows[0] });
      } catch (err) {
        logAdminError("Admin API Error:", err);
        return sendJson(req, res, 500, { ok: false, error: err.message });
      }
    }

    // PUT /api/admin/announcements/:id - We handle ID extraction manually since path is just /announcements
    // Wait, the routing in index.mjs strips /api/admin, so path is /announcements. 
    // We need to handle /announcements/:id logic.
  }

  if (path === "/venues") {
    if (method === "GET") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        const result = await pool.query(
          `SELECT
             vd.id,
             vd.name,
             vd.address,
             vd.location_map_url,
             vd.website_url
           FROM venue_directory vd
           ORDER BY vd.name ASC`
        );
        return sendJson(req, res, 200, { ok: true, data: result.rows });
      });
    }

    if (method === "POST") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        const body = await requireBody(req, res, sendJson);
        if (!body) return null;
        const name = normalizeSpaces(body?.name);
        const address = normalizeSpaces(body?.address) || null;
        const locationMapUrl = normalizeSpaces(body?.location_map_url) || null;
        const websiteUrl = normalizeSpaces(body?.website_url) || null;
        if (!name) {
          return sendJson(req, res, 400, { ok: false, error: "Venue name is required" });
        }
        const id = slug(name);
        const result = await pool.query(
          `INSERT INTO venue_directory (id, name, address, location_map_url, website_url)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (name) DO NOTHING
           RETURNING id, name, address, location_map_url, website_url`,
          [id, name, address, locationMapUrl, websiteUrl]
        );
        if (result.rowCount === 0) {
          return sendJson(req, res, 409, { ok: false, error: "Venue already exists" });
        }
        return sendJson(req, res, 201, { ok: true, data: result.rows[0] });
      });
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  if (path === "/groups") {
    if (method === "GET") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        const result = await pool.query(
          `SELECT id, label, format
           FROM group_directory
           ORDER BY id ASC`
        );
        return sendJson(req, res, 200, { ok: true, data: result.rows });
      });
    }

    if (method === "POST") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        const body = await requireBody(req, res, sendJson);
        if (!body) return null;
        const id = normalizeSpaces(body?.id);
        const label = normalizeSpaces(body?.label);
        const format = normalizeSpaces(body?.format) || null;
        if (!id || !label) {
          return sendJson(req, res, 400, { ok: false, error: "Group id and label are required" });
        }
        const result = await pool.query(
          `INSERT INTO group_directory (id, label, format)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO NOTHING
           RETURNING id, label, format`,
          [id, label, format]
        );
        if (result.rowCount === 0) {
          return sendJson(req, res, 409, { ok: false, error: "Group already exists" });
        }
        return sendJson(req, res, 201, { ok: true, data: result.rows[0] });
      });
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  if (path === "/franchises") {
    if (method === "GET") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        const tournamentId = url.searchParams.get("tournamentId");
        const result = await pool.query(
          `SELECT
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
           FROM franchise
           WHERE ($1::text IS NULL OR tournament_id = $1)
           ORDER BY tournament_id ASC, name ASC`,
          [tournamentId ?? null]
        );
        return sendJson(req, res, 200, { ok: true, data: result.rows });
      });
    }

    if (method === "POST") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        const body = await requireBody(req, res, sendJson);
        if (!body) return null;
        const tournamentId = normalizeSpaces(body?.tournament_id);
        const nameRaw = normalizeSpaces(body?.name);
        if (!tournamentId || !nameRaw) {
          return sendJson(req, res, 400, { ok: false, error: "tournament_id and name are required" });
        }
        const name = toTitleCase(nameRaw);
        const id = slug(`${tournamentId}:${name}`);
        const result = await pool.query(
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
           ON CONFLICT (tournament_id, name) DO NOTHING
           RETURNING
             tournament_id,
             id,
             name,
             logo_url,
             manager_name,
             manager_photo_url,
             description,
             contact_phone,
             location_map_url,
             contact_email`,
          [
            tournamentId,
            id,
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
        if (result.rowCount === 0) {
          return sendJson(req, res, 409, { ok: false, error: "Franchise already exists" });
        }
        return sendJson(req, res, 201, { ok: true, data: result.rows[0] });
      });
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  const franchiseMatch = path.match(/^\/franchises\/([^/]+)/);
  if (franchiseMatch) {
    const id = franchiseMatch[1];
    const tournamentId = url.searchParams.get("tournamentId");

    if (method === "PUT") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        if (!tournamentId) {
          return sendJson(req, res, 400, { ok: false, error: "tournamentId is required" });
        }
        const body = await requireBody(req, res, sendJson);
        if (!body) return null;
        const nameRaw = normalizeSpaces(body?.name);
        if (!nameRaw) {
          return sendJson(req, res, 400, { ok: false, error: "name is required" });
        }
        const name = toTitleCase(nameRaw);
        const update = buildUpdateQuery({
          table: "franchise",
          data: {
            name,
            logo_url: body.logo_url || null,
            manager_name: body.manager_name || null,
            manager_photo_url: body.manager_photo_url || null,
            description: body.description || null,
            contact_phone: body.contact_phone || null,
            location_map_url: body.location_map_url || null,
            contact_email: body.contact_email || null,
          },
          where: { columns: ["tournament_id", "id"], values: [tournamentId, id] },
          returning: "tournament_id, id, name, logo_url, manager_name, manager_photo_url, description, contact_phone, location_map_url, contact_email",
        });
        const result = await pool.query(update.sql, update.values);
        if (result.rowCount === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Franchise not found" });
        }
        return sendJson(req, res, 200, { ok: true, data: result.rows[0] });
      });
    }

    if (method === "DELETE") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        if (!tournamentId) {
          return sendJson(req, res, 400, { ok: false, error: "tournamentId is required" });
        }
        const del = buildDeleteQuery({
          table: "franchise",
          where: { columns: ["tournament_id", "id"], values: [tournamentId, id] },
        });
        const result = await pool.query(del.sql, del.values);
        if (result.rowCount === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Franchise not found" });
        }
        return sendJson(req, res, 200, { ok: true, deleted: id });
      });
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  const groupMatch = path.match(/^\/groups\/([^/]+)/);
  if (groupMatch) {
    const id = groupMatch[1];

    if (method === "PUT") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        const body = await requireBody(req, res, sendJson);
        if (!body) return null;
        const label = normalizeSpaces(body?.label);
        const format = normalizeSpaces(body?.format) || null;
        if (!label) {
          return sendJson(req, res, 400, { ok: false, error: "Group label is required" });
        }
        const update = buildUpdateQuery({
          table: "group_directory",
          data: { label, format },
          where: { columns: ["id"], values: [id] },
          returning: "id, label, format",
          extraSet: "updated_at = NOW()",
        });
        const result = await pool.query(update.sql, update.values);
        if (result.rowCount === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Group not found" });
        }
        return sendJson(req, res, 200, { ok: true, data: result.rows[0] });
      });
    }

    if (method === "DELETE") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        const del = buildDeleteQuery({
          table: "group_directory",
          where: { columns: ["id"], values: [id] },
        });
        const result = await pool.query(del.sql, del.values);
        if (result.rowCount === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Group not found" });
        }
        return sendJson(req, res, 200, { ok: true, deleted: id });
      });
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  const venueMatch = path.match(/^\/venues\/([^/]+)/);
  if (venueMatch) {
    const id = venueMatch[1];

    if (method === "PUT") {
      return handleAdminDb(
        req,
        res,
        sendJson,
        async () => {
          if (!requirePool(pool, req, res, sendJson)) return null;
          const body = await requireBody(req, res, sendJson);
          if (!body) return null;
          const name = normalizeSpaces(body?.name);
          const address = normalizeSpaces(body?.address) || null;
          const locationMapUrl = normalizeSpaces(body?.location_map_url) || null;
          const websiteUrl = normalizeSpaces(body?.website_url) || null;
          if (!name) {
            return sendJson(req, res, 400, { ok: false, error: "Venue name is required" });
          }
          const update = buildUpdateQuery({
            table: "venue_directory",
            data: {
              name,
              address,
              location_map_url: locationMapUrl,
              website_url: websiteUrl,
            },
            where: { columns: ["id"], values: [id] },
            returning: "id, name, address, location_map_url, website_url",
            extraSet: "updated_at = NOW()",
          });
          const result = await pool.query(update.sql, update.values);
          if (result.rowCount === 0) {
            return sendJson(req, res, 404, { ok: false, error: "Venue not found" });
          }
          return sendJson(req, res, 200, { ok: true, data: result.rows[0] });
        },
        (err) => {
          if (String(err?.message || "").includes("unique")) {
            return sendJson(req, res, 409, { ok: false, error: "Venue name already exists" });
          }
          return null;
        }
      );
    }

    if (method === "DELETE") {
      return handleAdminDb(req, res, sendJson, async () => {
        if (!requirePool(pool, req, res, sendJson)) return null;
        const del = buildDeleteQuery({
          table: "venue_directory",
          where: { columns: ["id"], values: [id] },
        });
        const result = await pool.query(del.sql, del.values);
        if (result.rowCount === 0) {
          return sendJson(req, res, 404, { ok: false, error: "Venue not found" });
        }
        return sendJson(req, res, 200, { ok: true, deleted: id });
      });
    }

    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
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
        return sendJson(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        logAdminError("Admin PUT Error:", err);
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
        logAdminError("Admin DELETE Error:", err);
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
