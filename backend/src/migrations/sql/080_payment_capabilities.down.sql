DROP INDEX IF EXISTS idx_order_payment_capability_version;

ALTER TABLE pd_order
  DROP COLUMN IF EXISTS payment_capability_version;
