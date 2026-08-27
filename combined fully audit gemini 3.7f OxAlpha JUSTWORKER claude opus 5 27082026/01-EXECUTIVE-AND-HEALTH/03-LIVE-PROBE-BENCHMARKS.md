# 10 · Evidence & Reproduction Methodology

[← Index](./00-README.md) · Prev: [09 Guides](./09-IMPLEMENTATION-GUIDES.md) · Next: [11 What is Solid](./11-WHAT-IS-SOLID.md)

This document details the exact commands, live probes, and queries used to verify every finding in this audit.

---

## 1. Live Environment Probes

| Probe Target | Command / URL | Live Output | Verifies Finding |
| --- | --- | --- | --- |
| **Backend Health** | `GET https://pandamarket-backend-fjom.onrender.com/health` | `HTTP 200 {"status":"ok"}` | Web process alive |
| **Backend Readiness** | `GET https://pandamarket-backend-fjom.onrender.com/ready` | `HTTP 503 {"status":"not_ready"}` | Postgres/Redis ok; S3/Meili degraded |
| **Public Metrics** | `GET https://pandamarket-backend-fjom.onrender.com/metrics` | `HTTP 200` (106 KB unauthenticated) | **B-20** |
| **Public TLS Lookup** | `GET /api/pd/internal/tls-allowed?domain=sarra-boutique.garbage.team` | `HTTP 200 {"allowed":true,"store_id":"..."}` | **B-20** |
| **Cross-Sell Bundle 500** | `GET /api/pd/products/by-product/pd_prod_ZuQyAJ6CBfQTW5rZ/bundles` | `HTTP 500 {"error":"could not identify an equality operator for type json"}` | **B-07** |
| **Success Page Fake Order** | `GET https://www.garbage.team/hub/checkout/success?order_id=FAKE123` | `HTTP 200` ("Payment Successful!") | **B-10** |
| **Unverified Storefront** | `GET https://sarra-boutique.garbage.team/products` | `HTTP 200` (Renders empty catalog with full layout) | **B-25** |
| **Backend Type-Check** | `npm run type-check -w backend` | `Exit Code 1` (TS2304 retentionRouter) | **B-00** |

---

## 2. Production Database Query Evidence

All queries executed read-only against the Supabase production PostgreSQL instance:

### 1. Ads Transaction Table Churn (B-24)
```sql
SELECT type, count(*) FROM pd_ads_transaction GROUP BY type;
-- Output:
-- reservation:          30,169
-- reservation_release:  30,168
-- campaign_debit:            27
-- promotional_credit:         3
-- admin_adjustment:           1
-- Total: 60,368 rows (21 MB)
```

### 2. Live System Log Errors (B-07)
```sql
SELECT message, count(*), max(created_at) 
FROM pd_system_log 
GROUP BY message 
ORDER BY count(*) DESC LIMIT 5;
-- Output:
-- could not identify an equality operator for type json: 173 rows (latest: 2026-08-26 17:12)
```

### 3. Stuck AI Jobs (B-37)
```sql
SELECT id, type, status, created_at, started_at FROM pd_ai_jobs WHERE status IN ('queued', 'processing');
-- Output:
-- 10 queued since May 2026
-- 1 processing since Aug 18, 2026
```

### 4. Missing RLS on Admin Notes (B-36)
```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 'admin_note%';
-- Output:
-- admin_note_activity: false
-- admin_note_attachments: false
-- admin_note_checklist_items: false
-- admin_note_folders: false
-- admin_notes: false
```
