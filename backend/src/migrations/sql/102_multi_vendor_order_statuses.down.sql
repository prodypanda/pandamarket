-- 102_multi_vendor_order_statuses.down.sql
--
-- Reverts the multi-vendor order status domain. Any order currently in an
-- intermediate state is moved to the nearest pre-migration aggregate so the
-- narrower (implicit) domain holds:
--   partially_shipped   -> fulfilled  (at least one package shipped)
--   partially_delivered -> delivered  (at least one package delivered)

UPDATE pd_order SET status = 'fulfilled', updated_at = NOW()
WHERE status = 'partially_shipped';

UPDATE pd_order SET status = 'delivered', updated_at = NOW()
WHERE status = 'partially_delivered';

ALTER TABLE pd_order DROP CONSTRAINT IF EXISTS pd_order_status_check;

COMMENT ON COLUMN pd_order.status IS NULL;
