ALTER TABLE pd_reports
  DROP CONSTRAINT IF EXISTS pd_reports_reporter_id_store_id_order_id_key;

ALTER TABLE pd_reports
  DROP CONSTRAINT IF EXISTS pd_reports_status_check;

ALTER TABLE pd_reports
  ADD CONSTRAINT pd_reports_status_check
  CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_active_buyer_seller_unique
  ON pd_reports (reporter_id, store_id, (COALESCE(order_id, '')))
  WHERE source = 'buyer'
    AND target_type = 'seller'
    AND status IN ('open', 'investigating');
