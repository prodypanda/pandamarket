-- Migration 064: Analytics Performance Indexes
-- Composite indexes for order, user, store, product, ticket, document, report, and event tables

CREATE INDEX IF NOT EXISTS idx_pd_order_created_at ON pd_order(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_order_payment_status_created_at ON pd_order(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_order_status_created_at ON pd_order(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pd_user_role_created_at ON pd_user(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_store_status_created_at ON pd_store(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_product_store_created_at ON pd_product(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pd_wallet_trans_type_created_at ON pd_wallet_transaction(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_reports_status_created_at ON pd_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_support_ticket_status_created_at ON pd_support_ticket(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_verification_docs_status_created_at ON pd_verification_documents(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pd_mae_event_created_at ON pd_marketplace_analytics_event(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_mae_store_created_at ON pd_marketplace_analytics_event(store_id, created_at DESC);
