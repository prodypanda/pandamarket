-- Audit P2-19 / E12 (part 2): index the remaining cold-path foreign keys.
--
-- Companion to 085_hot_foreign_key_indexes.sql. Together they bring every
-- pd_* foreign key to 100% indexed (203/203, verified via pg_constraint/
-- pg_index discovery). Created live via CREATE INDEX CONCURRENTLY; mirrored
-- here idempotently for fresh environments.

CREATE INDEX IF NOT EXISTS idx_pd_admin_analytics_report_schedule_admin_user_id ON pd_admin_analytics_report_schedule (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_conversion_event_id ON pd_ads_conversion (event_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_coupon_created_by ON pd_ads_coupon (created_by);
CREATE INDEX IF NOT EXISTS idx_pd_ads_coupon_redemption_transaction_id ON pd_ads_coupon_redemption (transaction_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_creative_product_id ON pd_ads_creative (product_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_refill_intent_account_id ON pd_ads_refill_intent (account_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_refill_intent_reviewed_by ON pd_ads_refill_intent (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_pd_ads_refill_intent_created_by ON pd_ads_refill_intent (created_by);
CREATE INDEX IF NOT EXISTS idx_pd_ads_review_campaign_id ON pd_ads_review (campaign_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_review_reviewer_user_id ON pd_ads_review (reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_pd_ads_transaction_campaign_id ON pd_ads_transaction (campaign_id);
CREATE INDEX IF NOT EXISTS idx_pd_ai_purpose_routing_fallback_provider_config_id_2 ON pd_ai_purpose_routing (fallback_provider_config_id_2);
CREATE INDEX IF NOT EXISTS idx_pd_ai_purpose_routing_fallback_provider_config_id_1 ON pd_ai_purpose_routing (fallback_provider_config_id_1);
CREATE INDEX IF NOT EXISTS idx_pd_ai_token_purchase_pack_id ON pd_ai_token_purchase (pack_id);
CREATE INDEX IF NOT EXISTS idx_pd_ai_token_purchase_wallet_transaction_id ON pd_ai_token_purchase (wallet_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pd_mandat_proofs_reviewed_by ON pd_mandat_proofs (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_pd_mandat_proofs_uploader_storefront_customer_id ON pd_mandat_proofs (uploader_storefront_customer_id);
CREATE INDEX IF NOT EXISTS idx_pd_platform_config_updated_by ON pd_platform_config (updated_by);
CREATE INDEX IF NOT EXISTS idx_pd_platform_page_version_created_by ON pd_platform_page_version (created_by);
CREATE INDEX IF NOT EXISTS idx_pd_report_attachments_uploaded_by ON pd_report_attachments (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_pd_report_events_actor_id ON pd_report_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_pd_report_messages_author_id ON pd_report_messages (author_id);
CREATE INDEX IF NOT EXISTS idx_pd_reports_resolved_by ON pd_reports (resolved_by);
CREATE INDEX IF NOT EXISTS idx_pd_store_subscription_plan ON pd_store (subscription_plan);
CREATE INDEX IF NOT EXISTS idx_pd_store_theme_id ON pd_store (theme_id);
CREATE INDEX IF NOT EXISTS idx_pd_store_delivery_proof_captured_by ON pd_store_delivery_proof (captured_by);
CREATE INDEX IF NOT EXISTS idx_pd_store_order_note_created_by ON pd_store_order_note (created_by);
CREATE INDEX IF NOT EXISTS idx_pd_store_order_note_updated_by ON pd_store_order_note (updated_by);
CREATE INDEX IF NOT EXISTS idx_pd_store_order_refund_requested_by ON pd_store_order_refund (requested_by);
CREATE INDEX IF NOT EXISTS idx_pd_store_page_version_created_by ON pd_store_page_version (created_by);
CREATE INDEX IF NOT EXISTS idx_pd_subscription_adjustment_created_by ON pd_subscription_adjustment (created_by);
CREATE INDEX IF NOT EXISTS idx_pd_subscription_intent_target_plan ON pd_subscription_intent (target_plan);
CREATE INDEX IF NOT EXISTS idx_pd_subscription_intent_user_id ON pd_subscription_intent (user_id);
CREATE INDEX IF NOT EXISTS idx_pd_subscription_intent_reviewed_by ON pd_subscription_intent (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_pd_support_ticket_attachment_uploaded_by ON pd_support_ticket_attachment (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_pd_system_log_user_id ON pd_system_log (user_id);
CREATE INDEX IF NOT EXISTS idx_pd_verification_documents_reviewed_by ON pd_verification_documents (reviewed_by);
