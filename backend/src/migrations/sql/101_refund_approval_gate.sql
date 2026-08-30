-- 101_refund_approval_gate.sql
--
-- Refund approval gate (audit P1-5). Previously any seller could create AND
-- process their own refund with no oversight: wallet debit, restock, and the
-- whole-order -> refunded transition were all seller-triggered.
--
-- Policy (owner decision 2026-08-30):
--  - refunds on orders NOT yet delivered always require superadmin approval;
--  - refunds on delivered orders auto-process only when the toggle
--    refund_auto_process_delivered_enabled is on AND the refund amount is at
--    or below refund_auto_process_delivered_max_tnd (superadmin-editable);
--  - anything above the threshold goes to superadmin review.
--
-- This migration:
--   1. adds 'awaiting_admin' and 'approved' to the refund status domain via
--      a CHECK constraint (previous domain: requested|approved|processed|rejected
--      existed only implicitly in code);
--   2. adds reviewed_by / reviewed_at / decision_metadata columns for the
--      superadmin decision trail;
--   3. the pd_audit_log table already exists (action/resource/metadata) and is
--      used for every decision — no change needed here.

ALTER TABLE pd_store_order_refund
  ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS decision_metadata JSONB;

ALTER TABLE pd_store_order_refund DROP CONSTRAINT IF EXISTS pd_store_order_refund_status_check;

ALTER TABLE pd_store_order_refund
  ADD CONSTRAINT pd_store_order_refund_status_check
  CHECK (status IN ('requested', 'awaiting_admin', 'approved', 'processed', 'rejected'));

COMMENT ON COLUMN pd_store_order_refund.reviewed_by IS
  'Superadmin who approved/rejected the refund when the approval gate required review.';
COMMENT ON COLUMN pd_store_order_refund.decision_metadata IS
  'Gate evaluation context (threshold, delivered state, auto/manual decision) and reviewer notes.';

-- Index for the superadmin review queue.
CREATE INDEX IF NOT EXISTS idx_store_order_refund_awaiting_admin
  ON pd_store_order_refund (created_at DESC)
  WHERE status = 'awaiting_admin';
