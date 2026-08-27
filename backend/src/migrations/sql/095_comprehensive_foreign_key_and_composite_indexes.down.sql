-- 095_comprehensive_foreign_key_and_composite_indexes.down.sql

DROP INDEX IF EXISTS idx_pd_order_item_order_id;
DROP INDEX IF EXISTS idx_pd_order_item_store_id;
DROP INDEX IF EXISTS idx_pd_product_image_product_id;
DROP INDEX IF EXISTS idx_pd_store_domain_store_id;
DROP INDEX IF EXISTS idx_pd_wallet_tx_store_id;
DROP INDEX IF EXISTS idx_pd_product_store_status;
DROP INDEX IF EXISTS idx_pd_order_customer_created;
DROP INDEX IF EXISTS idx_pd_cart_active_updated;
