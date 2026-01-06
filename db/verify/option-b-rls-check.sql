-- Option B verification (run as a privileged role in SQL editor).
-- Expect permission errors when switching to anon/authenticated roles.
-- Service-role access cannot be tested here; confirm via Node API or service-role key.

-- Ensure roles exist in your environment before running SET ROLE.
SET ROLE anon;
SELECT 1 FROM public.tournament LIMIT 1;
SELECT 1 FROM public.groups LIMIT 1;
SELECT 1 FROM public.team LIMIT 1;
SELECT 1 FROM public.fixture LIMIT 1;
SELECT 1 FROM public.result LIMIT 1;

RESET ROLE;
SET ROLE authenticated;
SELECT 1 FROM public.tournament LIMIT 1;
SELECT 1 FROM public.groups LIMIT 1;
SELECT 1 FROM public.team LIMIT 1;
SELECT 1 FROM public.fixture LIMIT 1;
SELECT 1 FROM public.result LIMIT 1;

-- Expected: permission denied for both roles on all tables above.
