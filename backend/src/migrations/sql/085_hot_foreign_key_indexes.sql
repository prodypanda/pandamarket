-- Audit P2-19 / E12: index the hot-path foreign keys.
--
-- These 22 indexes were already created on live databases via
-- CREATE INDEX CONCURRENTLY (one-off maintenance — the migration runner wraps
-- files in a transaction, which forbids CONCURRENTLY). This idempotent
-- migration mirrors them so fresh environments get identical indexing.
--
-- Postgres does not auto-index the referencing side of an FK; every join and
-- WHERE fk = $1 on these columns was a sequential scan.

CREATE INDEX IF NOT EXISTS idx_pd_order_item_product_id ON pd_order_item (product_id);
CREATE INDEX IF NOT EXISTS idx_pd_order_item_variant_id ON pd_order_item (variant_id);
CREATE INDEX IF NOT EXISTS idx_pd_checkout_quote_store_id ON pd_checkout_quote (store_id);
CREATE INDEX IF NOT EXISTS idx_pd_storefront_customer_token_store_id ON pd_storefront_customer_token (store_id);
CREATE INDEX IF NOT EXISTS idx_pd_storefront_customer_token_customer_id ON pd_storefront_customer_token (customer_id);
CREATE INDEX IF NOT EXISTS idx_pd_chat_conversation_seller_id ON pd_chat_conversation (seller_id);
CREATE INDEX IF NOT EXISTS idx_pd_chat_participant_store_id ON pd_chat_participant (store_id);
CREATE INDEX IF NOT EXISTS idx_pd_license_key_store_id ON pd_license_key (store_id);
CREATE INDEX IF NOT EXISTS idx_pd_shipment_fulfillment_id ON pd_shipment (fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_pd_wallet_transaction_order_id ON pd_wallet_transaction (order_id);
CREATE INDEX IF NOT EXISTS idx_pd_review_order_id ON pd_review (order_id);
CREATE INDEX IF NOT EXISTS idx_pd_reports_order_id ON pd_reports (order_id);
CREATE INDEX IF NOT EXISTS idx_pd_download_audit_log_order_id ON pd_download_audit_log (order_id);
CREATE INDEX IF NOT EXISTS idx_pd_download_audit_log_download_id ON pd_download_audit_log (download_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_event_creative_id ON pd_ads_event (creative_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_event_placement_id ON pd_ads_event (placement_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_creative_campaign_id ON pd_ads_creative (campaign_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_campaign_account_id ON pd_ads_campaign (account_id);
CREATE INDEX IF NOT EXISTS idx_pd_ai_jobs_user_id ON pd_ai_jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_pd_file_asset_owner_user_id ON pd_file_asset (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pd_mandat_proofs_uploader_user_id ON pd_mandat_proofs (uploader_user_id);
CREATE INDEX IF NOT EXISTS idx_pd_payment_receipt_customer_id ON pd_payment_receipt (customer_id);
