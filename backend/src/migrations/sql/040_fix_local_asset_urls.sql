-- Data fix: the production database was restored from a local development
-- dump, so many asset URLs (product images, store logos, marketplace assets,
-- page-builder content, ...) still point at the local MinIO container
-- (http://localhost:9100/... or http://127.0.0.1:9100/...).
--
-- This migration rewrites those absolute local URLs into relative paths
-- (/pd-product-images/..., /pd-themes/...) which work in every environment,
-- because the frontend proxies these paths to the backend static routes.
--
-- It scans every text/varchar/json/jsonb column in the public schema so no
-- table storing asset URLs is missed.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.is_generated = 'NEVER'
      AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')
  LOOP
    IF r.data_type IN ('json', 'jsonb') THEN
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(replace(%I::text, ''http://localhost:9100/'', ''/''), ''http://127.0.0.1:9100/'', ''/'')::%s WHERE %I::text LIKE ''%%localhost:9100%%'' OR %I::text LIKE ''%%127.0.0.1:9100%%''',
        r.table_name, r.column_name, r.column_name, r.data_type, r.column_name, r.column_name
      );
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(replace(%I, ''http://localhost:9100/'', ''/''), ''http://127.0.0.1:9100/'', ''/'') WHERE %I LIKE ''%%localhost:9100%%'' OR %I LIKE ''%%127.0.0.1:9100%%''',
        r.table_name, r.column_name, r.column_name, r.column_name, r.column_name
      );
    END IF;
  END LOOP;
END $$;
