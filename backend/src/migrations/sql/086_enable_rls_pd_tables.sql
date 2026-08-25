-- Audit P2-20: enable Row Level Security on every pd_* table.
--
-- Defense-in-depth against Supabase anon/postgrest key exposure: with RLS
-- enabled and NO policies, those roles get deny-by-default on every table.
-- The application connects as the migrations/table OWNER, which bypasses RLS,
-- so app behaviour is unchanged (verified live: public endpoints 200 after
-- enabling on all 121 tables).
--
-- Deliberately NOT using FORCE ROW LEVEL SECURITY — the app must keep its
-- owner-level access; isolation between tenants remains enforced in the
-- service layer (tenant-isolation tests cover this).

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'pd\_%' AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
