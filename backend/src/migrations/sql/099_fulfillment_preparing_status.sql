-- 099_fulfillment_preparing_status.sql
--
-- Adds the 'preparing' state to the fulfillment lifecycle so sellers can
-- record "package is being prepared" before shipping. Previously the seller
-- dashboard displayed a "Préparation" timeline step that no code could ever
-- set (OrderStatus.Processing was dead state and pd_fulfillment.status only
-- allowed pending|shipped|delivered|cancelled).
--
-- pd_fulfillment.status is a VARCHAR(20) with no CHECK constraint, so no
-- column change is required. This migration:
--   1. documents the extended domain on the column comment;
--   2. adds a CHECK constraint (hygiene) covering the full valid domain;
--   3. adds a partial index for the seller "to prepare / to ship" queues.
--
-- Lifecycle: pending -> preparing -> shipped -> delivered
--                    \-> cancelled (from pending or preparing)
--            shipped -> cancelled (RTO / carrier return)

COMMENT ON COLUMN pd_fulfillment.status IS
  'pending | preparing | shipped | delivered | cancelled';

ALTER TABLE pd_fulfillment DROP CONSTRAINT IF EXISTS pd_fulfillment_status_check;

ALTER TABLE pd_fulfillment
  ADD CONSTRAINT pd_fulfillment_status_check
  CHECK (status IN ('pending', 'preparing', 'shipped', 'delivered', 'cancelled'));

-- Seller dashboard "à expédier" queue reads pending + preparing together.
CREATE INDEX IF NOT EXISTS idx_fulfillment_store_awaiting_shipment
  ON pd_fulfillment (store_id, status)
  WHERE status IN ('pending', 'preparing');
