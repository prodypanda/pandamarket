# Tier 3 · Architecture Refactoring & Quality Debt (Month 1)

- [ ] **[E-01]** 🏗 Implement Outbox pattern as single domain event fan-out mechanism.
- [ ] **[E-02]** 🛠 Generate typed API client from `/api/docs.json` and replace raw fetch.
- [ ] **[E-03]** 🏗 Split monolithic files: `products/page.tsx`, `settings/page.tsx`, `analytics.service.ts`.
- [ ] **[M-02]** 🏗 Execute object storage migration from Postgres blobs to Cloudflare R2.
- [ ] **[M-03]** 🏗 Complete Meilisearch provisioning and catalog synchronization.
- [ ] **[M-11]** 🏗 Split BullMQ background workers into separate Render background worker service.
- [ ] **[M-16]** 🛠 Reconcile plan catalogue defaults between code, DB, and business model.
- [ ] **[M-17]** 🛠 Implement data retention and cleanup cron jobs.
- [ ] **[B-35]** ⚡ Add indexes for the 7 unindexed foreign keys.
- [ ] **[B-36]** ⚡ Enable RLS on the 5 `admin_note*` tables.
