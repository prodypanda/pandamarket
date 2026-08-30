-- 099_fulfillment_preparing_status.down.sql
--
-- Reverts the 'preparing' fulfillment state. Any fulfillment currently in
-- 'preparing' is moved back to 'pending' so the pre-migration CHECK domain
-- holds (no data loss: preparing and pending are both "awaiting shipment").

DROP INDEX IF EXISTS idx_fulfillment_store_awaiting_shipment;

UPDATE pd_fulfillment SET status = 'pending', updated_at = NOW()
WHERE status = 'preparing';

ALTER TABLE pd_fulfillment DROP CONSTRAINT IF EXISTS pd_fulfillment_status_check;

ALTER TABLE pd_fulfillment
  ADD CONSTRAINT pd_fulfillment_status_check
  CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled'));

COMMENT ON COLUMN pd_fulfillment.status IS
  'pending | shipped | delivered | cancelled';
