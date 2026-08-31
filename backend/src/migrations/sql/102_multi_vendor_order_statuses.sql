-- 102_multi_vendor_order_statuses.sql
--
-- Multi-vendor order progress states (audit "Audit Approfondi & Solution
-- Architecturale Gestion des Commandes Multi-Vendeurs", corrected).
--
-- Problem being solved: on a multi-store order, while one vendor ships or
-- delivers, the master order stays 'pending' (buyer sees no progress) — and
-- a delivered+shipped mix incorrectly jumps straight to 'delivered'. The
-- order aggregate gains two intermediate states:
--   partially_shipped    — at least one package shipped, others awaiting
--   partially_delivered  — at least one package delivered, others in transit
--
-- NOTE: pd_order.status had NO CHECK constraint before this migration
-- (001_initial_schema.sql declares it as a plain VARCHAR(30)); this migration
-- ADDS one covering the full domain, both for hygiene and to make invalid
-- values fail loudly at write time.
-- The migration number in the source audit (086) was already taken; the next
-- free number is 102.

ALTER TABLE pd_order DROP CONSTRAINT IF EXISTS pd_order_status_check;

ALTER TABLE pd_order
  ADD CONSTRAINT pd_order_status_check
  CHECK (status IN (
    'payment_required',
    'pending',
    'processing',
    'partially_shipped',
    'fulfilled',
    'partially_delivered',
    'delivered',
    'cancelled',
    'refunded'
  ));

COMMENT ON COLUMN pd_order.status IS
  'payment_required | pending | processing | partially_shipped | fulfilled | partially_delivered | delivered | cancelled | refunded';
