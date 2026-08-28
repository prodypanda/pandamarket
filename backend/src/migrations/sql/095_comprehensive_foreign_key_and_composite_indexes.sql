-- 095_comprehensive_foreign_key_and_composite_indexes.sql
--
-- NOTE (deploy-pipeline fix): two statements were removed because they
-- referenced columns that do not exist on any environment and made every
-- production deploy fail at boot (migration runner exits in production):
--   * idx_pd_wallet_tx_store_id ON pd_wallet_transaction(store_id)
--     -> pd_wallet_transaction has no store_id column (see 001_initial_schema).
--   * idx_pd_cart_active_updated ON pd_cart(status, updated_at)
--     -> pd_cart has no status column; its real abandonment index
--        idx_pd_cart_abandoned(is_abandoned, updated_at) is created by
--        094b_create_pd_cart_and_gamified_lead_tables.sql.

-- Unindexed Foreign Keys
CREATE INDEX IF NOT EXISTS idx_pd_order_item_order_id ON pd_order_item(order_id);
CREATE INDEX IF NOT EXISTS idx_pd_order_item_store_id ON pd_order_item(store_id);
CREATE INDEX IF NOT EXISTS idx_pd_product_image_product_id ON pd_product_image(product_id);
CREATE INDEX IF NOT EXISTS idx_pd_store_domain_store_id ON pd_store_domain(store_id);

-- High-Frequency Composite Indexes for Latency Optimization
CREATE INDEX IF NOT EXISTS idx_pd_product_store_status ON pd_product(store_id, status);
CREATE INDEX IF NOT EXISTS idx_pd_order_customer_created ON pd_order(customer_id, created_at DESC);
