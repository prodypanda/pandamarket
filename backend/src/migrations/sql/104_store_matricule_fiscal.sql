-- 104_store_matricule_fiscal.sql
--
-- Adds legal Matricule Fiscal column to pd_store and sets default platform fallback matricule fiscal.
-- Required for official Tunisian sales invoices (Facture de Vente).
--

ALTER TABLE pd_store
  ADD COLUMN IF NOT EXISTS matricule_fiscal VARCHAR(64);

COMMENT ON COLUMN pd_store.matricule_fiscal IS
  'Official Tunisian tax identification number (Matricule Fiscal), e.g. 0001234/A/M/000';

INSERT INTO pd_platform_config (key, value)
VALUES ('invoice_platform_matricule_fiscal', '0001234/A/M/000')
ON CONFLICT (key) DO NOTHING;
