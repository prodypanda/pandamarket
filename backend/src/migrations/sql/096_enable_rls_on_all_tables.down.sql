-- 096_enable_rls_on_all_tables.down.sql

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
      EXECUTE format('DROP POLICY IF EXISTS %I_service_role_policy ON %I;', tbl, tbl);
      EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', tbl);
    END IF;
  END LOOP;
END $$;
