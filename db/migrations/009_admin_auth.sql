-- Admin authentication: magic-link tokens and sessions.
-- Tokens are stored hashed (SHA-256); raw token is never persisted.

CREATE TABLE IF NOT EXISTS admin_magic_token (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT        NOT NULL UNIQUE,
  email       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_session (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT        NOT NULL UNIQUE,
  email       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_magic_token_hash ON admin_magic_token (token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_session_token_hash ON admin_session (token_hash);
