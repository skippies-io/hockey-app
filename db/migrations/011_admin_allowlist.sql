-- Admin email allowlist.
-- Replaces the compile-time ADMIN_ALLOWLIST env-var with a DB-managed table
-- so entries can be added/removed at runtime without a redeployment.

CREATE TABLE IF NOT EXISTS admin_allowlist (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email     TEXT        NOT NULL UNIQUE,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note      TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_allowlist_email ON admin_allowlist (email);

-- Seed the initial entry so existing deployments keep working immediately.
INSERT INTO admin_allowlist (email, note)
VALUES ('leroybarnes@me.com', 'Initial test account')
ON CONFLICT (email) DO NOTHING;
