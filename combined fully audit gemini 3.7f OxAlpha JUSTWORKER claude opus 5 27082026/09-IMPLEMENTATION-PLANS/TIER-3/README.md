# 09 · Tier 3 Implementation Plans (Full Engineering Specifications)

> **Standard:** Production-grade engineering specifications including architectural root cause, exact line-by-line diffs, concurrency & security considerations, automated tests, manual cURL/probe verifications, and rollback procedures.
> **Scope:** 6 High-Leverage Architecture Debt & Scalability Tasks (Month 1).

---

## 📋 Implementation Plans Index (T3-01 through T3-06)

| Plan | Target Architectural Area | Primary Technologies | Effort |
|---|---|---|---|
| [**PLAN-T3-01**](./PLAN-T3-01-DOUBLE-ENTRY-LEDGER.md) | Double-Entry Financial General Ledger | PostgreSQL (`pd_ledger_entry`), Zero-Sum Check, Shadow Writes | 🏗 6 h |
| [**PLAN-T3-02**](./PLAN-T3-02-DATABASE-INDEXING-NORMALIZATION.md) | Database Indexing & Unindexed Foreign Keys | PostgreSQL B-Tree, Composite Indexes, EXPLAIN ANALYZE | 🛠 3 h |
| [**PLAN-T3-03**](./PLAN-T3-03-ROW-LEVEL-SECURITY-HARDENING.md) | Row-Level Security (RLS) Hardening | PostgreSQL RLS Policies, Tenant Isolation, Service Role | 🛠 4 h |
| [**PLAN-T3-04**](./PLAN-T3-04-FRONTEND-MONOLITH-DECOMPOSITION.md) | Frontend Monolith Decomposition (7k & 6.2k lines) | React 19, Modular Component Tree, Sub-State Management | 🏗 8 h |
| [**PLAN-T3-05**](./PLAN-T3-05-STORAGE-MIGRATION-PIPELINE.md) | Database Bytea Blob to Cloudflare R2 Migration | Node.js ETL Worker, Stream Pipeline, Checksum Verification | 🛠 4 h |
| [**PLAN-T3-06**](./PLAN-T3-06-CRYPTOGRAPHY-SESSION-HARDENING.md) | Cryptography & Session Hardening (AAD Binding) | Node.js Crypto, AES-256-GCM, Secure Cookies, CSRF Guard | 🛠 3 h |
