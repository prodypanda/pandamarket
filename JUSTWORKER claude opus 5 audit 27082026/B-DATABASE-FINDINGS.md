# Appendix B · Database Findings

[← Index](./00-README.md) · Prev: [Appendix A](./A-ROUTE-INVENTORY.md) · Next: [Appendix C](./C-ENVIRONMENT-AND-DEPLOYMENT.md)

Full audit of the Supabase PostgreSQL database (126 tables, 101 MB total size).

## 1. Table Counts & RLS Posture
- **Total Tables:** 126
  - 121 `pd_*` tables (RLS enabled, deny-by-default, 0 policies)
  - 5 `admin_note_*` tables (RLS **disabled**, missed by `086_enable_rls_pd_tables.sql`)
- **Total Foreign Keys:** 203
  - 196 indexed
  - **7 unindexed foreign keys:**
    1. `pd_ads_campaign_placement.placement_id`
    2. `pd_ads_coupon_redemption.store_id`
    3. `pd_digital_download.product_id`
    4. `pd_email_template_style.store_id`
    5. `pd_store_delivery_proof.store_id`
    6. `pd_storefront_category.parent_id`
    7. `pd_storefront_customer_session.store_id`

## 2. Table Volume & Bloat
1. `pd_file_blobs`: 547 rows, **34 MB** (Postgres-backed fallback object store)
2. `pd_ads_transaction`: 60,368 rows, **21 MB** (Churned by 5-minute lifecycle sweep)
3. `pd_user_login_event`: 1,107 rows
4. `pd_system_log`: 733 rows (all error level, 173 from JSON equality 500)
5. `pd_user_session`: 1,354 rows (1,281 expired, no retention cleanup)

## 3. Migration Collision Hygiene
12 duplicate prefixes identified in `backend/src/migrations/sql/`:
- `025`, `026`, `027`, `028`, `029`, `032`, `046`, `047`, `066`, `067`, `068`, `069`.
- `047_seed_comprehensive_aliexpress_taxonomy.sql` is a 10-byte placeholder containing only `-- skipped`.
