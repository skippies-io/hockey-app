import crypto from "node:crypto";

// Magic link TTL (default 15 min) and session TTL (default 8 h) are configurable.
const MAGIC_TTL_MINUTES = Number(process.env.MAGIC_LINK_TTL_MINUTES) || 15;
const SESSION_TTL_HOURS = Number(process.env.ADMIN_SESSION_TTL_HOURS) || 8;

// Allowlist is a comma-separated list of lower-cased emails.
// The env var overrides the default; add emails with ADMIN_ALLOWLIST="a@b.com,c@d.com".
const ALLOWLIST_RAW = process.env.ADMIN_ALLOWLIST || "leroybarnes@me.com";
export const ADMIN_ALLOWLIST = ALLOWLIST_RAW
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email) {
  return ADMIN_ALLOWLIST.includes(String(email || "").trim().toLowerCase());
}

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Insert a new single-use magic link token into the DB.
 * Returns { token, expiresAt } where token is the raw (unhashed) value.
 */
export async function issueMagicToken(pool, email) {
  const token = generateToken();
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_TTL_MINUTES * 60 * 1000);
  await pool.query(
    `INSERT INTO admin_magic_token (token_hash, email, expires_at)
     VALUES ($1, $2, $3)`,
    [hash, email.trim().toLowerCase(), expiresAt.toISOString()]
  );
  return { token, expiresAt };
}

/**
 * Atomically mark the token as used and return the associated email.
 * Returns null if the token is invalid, expired, or already used.
 */
export async function verifyMagicToken(pool, token) {
  if (!token) return null;
  const hash = hashToken(token);
  const result = await pool.query(
    `UPDATE admin_magic_token
     SET used_at = NOW()
     WHERE token_hash = $1
       AND expires_at > NOW()
       AND used_at IS NULL
     RETURNING email`,
    [hash]
  );
  return result.rows.length > 0 ? result.rows[0].email : null;
}

/**
 * Create a session for an authenticated admin.
 * Returns { token, expiresAt } where token is the raw session token.
 */
export async function issueSession(pool, email) {
  const token = generateToken();
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO admin_session (token_hash, email, expires_at)
     VALUES ($1, $2, $3)`,
    [hash, email, expiresAt.toISOString()]
  );
  return { token, expiresAt };
}

/**
 * Verify a session Bearer token.
 * Returns the admin email if valid and not expired, otherwise null.
 */
export async function verifySession(pool, token) {
  if (!pool || !token) return null;
  const hash = hashToken(token);
  const result = await pool.query(
    `SELECT email FROM admin_session
     WHERE token_hash = $1
       AND expires_at > NOW()`,
    [hash]
  );
  return result.rows.length > 0 ? result.rows[0].email : null;
}
