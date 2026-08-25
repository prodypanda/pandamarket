-- Re-disable RLS on all pd_* tables (revert of 086).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'pd\_%' AND rowsecurity = true
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
