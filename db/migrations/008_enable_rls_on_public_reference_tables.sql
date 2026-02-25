-- Security hardening: ensure RLS is enabled on additional public tables flagged by Supabase linter.
BEGIN;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'fixture_date_fix_backup_allstars',
    'venue_directory',
    'franchise',
    'time_slot',
    'venue',
    'group_venue',
    'group_directory'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = table_name
        AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    END IF;
  END LOOP;
END $$;

COMMIT;
