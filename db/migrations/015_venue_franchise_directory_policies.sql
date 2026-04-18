-- Add permissive RLS policies for venue_directory and franchise_directory.
-- Migration 008 enabled RLS on these tables and revoked all permissions from
-- anon/authenticated, but added no permissive policies. When the production
-- server connects via Supabase's transaction-mode pooler, even the postgres
-- role is subject to RLS, so queries silently return 0 rows.
-- Security is enforced at the application layer (admin JWT in server/admin.mjs).
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'venue_directory' AND policyname = 'allow_all_access'
  ) THEN
    CREATE POLICY "allow_all_access" ON venue_directory
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'franchise_directory' AND policyname = 'allow_all_access'
  ) THEN
    CREATE POLICY "allow_all_access" ON franchise_directory
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
