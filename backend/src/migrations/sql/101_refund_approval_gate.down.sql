-- 101_refund_approval_gate.down.sql

DROP INDEX IF EXISTS idx_store_order_refund_awaiting_admin;

-- Move gate statuses back to the pre-gate domain so the CHECK holds.
UPDATE pd_store_order_refund
SET status = 'requested', updated_at = NOW()
WHERE status IN ('awaiting_admin', 'approved');

ALTER TABLE pd_store_order_refund DROP CONSTRAINT IF EXISTS pd_store_order_refund_status_check;

ALTER TABLE pd_store_order_refund
  ADD CONSTRAINT pd_store_order_refund_status_check
  CHECK (status IN ('requested', 'approved', 'processed', 'rejected'));

ALTER TABLE pd_store_order_refund
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS decision_metadata;
