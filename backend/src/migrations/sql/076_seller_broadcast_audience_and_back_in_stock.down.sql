-- Down Migration 076
DROP TABLE IF EXISTS pd_product_back_in_stock_alert CASCADE;
ALTER TABLE pd_seller_broadcast DROP COLUMN IF EXISTS target_audience;
ALTER TABLE pd_seller_broadcast DROP COLUMN IF EXISTS title;
