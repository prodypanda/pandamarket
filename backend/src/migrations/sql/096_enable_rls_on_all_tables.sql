-- 096_enable_rls_on_all_tables.sql

-- Enable RLS on sensitive admin, ledger, and metadata tables
DO $$ 
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'pd_admin_notes',
    'pd_admin_note_tags',
    'pd_order_admin_notes',
    'pd_store_admin_notes',
    'pd_user_admin_notes',
    'pd_admin_capability',
    'pd_ledger_entry',
    'pd_serial_key',
    'pd_outbox_dlq',
    'pd_coupon',
    'pd_coupon_redemption',
    'pd_cart_recovery_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
      
      -- Drop existing policy if present and create fresh service role policy
      EXECUTE format('DROP POLICY IF EXISTS %I_service_role_policy ON %I;', tbl, tbl);
      EXECUTE format('CREATE POLICY %I_service_role_policy ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END IF;
  END LOOP;
END $$;
