-- Digest share tokens.
-- Allows admin users to generate tokenised, read-only share links for a
-- tournament/age-group digest (standings + fixtures snapshot).
-- Expiry: 14 days from creation (FR-005).

CREATE TABLE IF NOT EXISTS digest_share (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    TEXT        NOT NULL UNIQUE,  -- SHA256(raw_token) — raw token never stored
  tournament_id TEXT        NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  age_id        TEXT,                         -- NULL means all age groups
  label         TEXT,                         -- optional human-readable description
  created_by    TEXT        NOT NULL,         -- admin email
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  revoked_at    TIMESTAMPTZ                   -- NULL = active
);

CREATE INDEX IF NOT EXISTS idx_digest_share_token_hash ON digest_share (token_hash);
CREATE INDEX IF NOT EXISTS idx_digest_share_tournament  ON digest_share (tournament_id);

ALTER TABLE digest_share ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE digest_share FROM anon, authenticated;
