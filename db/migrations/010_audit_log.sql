-- Audit logging for admin mutations

CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  actor_email  TEXT        NOT NULL,
  action       TEXT        NOT NULL,

  tournament_id TEXT,
  entity_type  TEXT,
  entity_id    TEXT,

  meta         JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_email ON audit_log (actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_tournament_id ON audit_log (tournament_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
