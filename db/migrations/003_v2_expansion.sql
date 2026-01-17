-- V2 Expansion: Announcements and Tech Desk fields
BEGIN;

-- 1. Create Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tournament_id TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'alert'
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit fields
  source TEXT DEFAULT 'admin',
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by tournament
CREATE INDEX IF NOT EXISTS idx_announcements_tournament
  ON announcements (tournament_id);

-- 2. Tech Desk Enhancements (Result Table)
-- We extend the 'result' table to support detailed match reporting

ALTER TABLE result
  ADD COLUMN IF NOT EXISTS goal_scorers JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_signed_off BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS coach_signature JSONB, -- { "name": "...", "time": "..." }
  ADD COLUMN IF NOT EXISTS match_events JSONB DEFAULT '[]'::jsonb; -- Cards, timeouts, etc.

-- 3. RLS Security (Lockdown pattern from 002)

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Revoke all by default (following Option B pattern)
REVOKE ALL ON TABLE announcements FROM anon, authenticated;

-- Grant READ to anon/authenticated for valid tournaments (Assuming we eventually add a policy)
-- For now, we stick to the lockdown pattern (no policies = no access via PostgREST/Supabase client unless defined)
-- Admin usage will likely bypass RLS (service role) or we will add specific Admin Policies later.

COMMIT;
