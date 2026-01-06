-- Option B: lock down public access (anon/authenticated) to base tables.
BEGIN;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('tournament', 'groups', 'team', 'fixture', 'result')
      AND policyname ILIKE '%public read%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.tournament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.tournament FROM anon, authenticated;
REVOKE ALL ON TABLE public.groups FROM anon, authenticated;
REVOKE ALL ON TABLE public.team FROM anon, authenticated;
REVOKE ALL ON TABLE public.fixture FROM anon, authenticated;
REVOKE ALL ON TABLE public.result FROM anon, authenticated;
REVOKE ALL ON TABLE public.schema_migrations FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'v1_standings' AND c.relkind = 'v'
  ) THEN
    EXECUTE 'ALTER VIEW public.v1_standings SET (security_invoker = true)';
  END IF;
END $$;

COMMIT;
