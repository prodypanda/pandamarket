-- 094_create_pd_ledger_entry_table.sql

DO $$ BEGIN
  CREATE TYPE ledger_account_type AS ENUM (
    'customer_funds_receivable',
    'vendor_payable',
    'platform_revenue',
    'bank_cash_clearing'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS pd_ledger_entry (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  account_type ledger_account_type NOT NULL,
  entity_id TEXT,
  entry_direction VARCHAR(10) NOT NULL CHECK (entry_direction IN ('debit', 'credit')),
  amount NUMERIC(12, 3) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  description TEXT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON pd_ledger_entry(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entity ON pd_ledger_entry(entity_id, account_type);
