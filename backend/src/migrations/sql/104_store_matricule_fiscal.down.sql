-- 104_store_matricule_fiscal.down.sql
DELETE FROM pd_platform_config WHERE key = 'invoice_platform_matricule_fiscal';
ALTER TABLE pd_store DROP COLUMN IF EXISTS matricule_fiscal;
