# Engineering Specification: PLAN-T3-02
## Resolve 7 Unindexed Foreign Keys & High-Frequency Composite Indexes

- **Target Task:** [T3-02](../../00-MASTER-CHECKLIST/TIER-3-ARCHITECTURE-DEBT.md)
- **Severity:** 🟢 Performance Optimization / Database Latency
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** PostgreSQL Database Schema, Supabase Query Performance.

---

### 1. Summary & Business Impact
Live database analysis identified 7 foreign key constraints without supporting indexes, causing sequential table scans during cascading deletes or joins. Furthermore, composite indexes on high-frequency order and product queries are missing.

---

### 2. Migration Script
```sql
-- Unindexed Foreign Keys:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_order_item_order_id ON pd_order_item(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_order_item_product_id ON pd_order_item(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_order_item_store_id ON pd_order_item(store_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_product_image_product_id ON pd_product_image(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_store_domain_store_id ON pd_store_domain(store_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_wallet_tx_store_id ON pd_wallet_transaction(store_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_wallet_tx_order_id ON pd_wallet_transaction(order_id);

-- High-Frequency Composite Indexes:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_product_store_status ON pd_product(store_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_order_user_created ON pd_order(user_id, created_at DESC);
```

---

### 3. Verification Plan
Run `EXPLAIN ANALYZE` on high-volume queries to confirm index scans.
