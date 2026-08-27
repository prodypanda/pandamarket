# 01 — Executive Summary & Live Health Snapshot

> **Context:** PandaMarket is a dual-engine e-commerce platform designed for the Tunisian market, pairing a multi-tenant SaaS storefront engine (*Shopify model*) with a central marketplace discovery hub (*Amazon/AliExpress model*).

---

## 1. System Topology & Architecture

```
                            ┌──────────────────────────────────────────┐
                            │          Edge Proxy / Reverse DNS         │
                            │   Cloudflare + Vercel / Caddy (SSL)      │
                            └────────────────────┬─────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
    ┌───────────────────────────────┐                           ┌───────────────────────────────┐
    │       Vercel Frontend         │                           │        Render Backend         │
    │      Next.js 16 (Node 20)     │                           │     Express + TypeScript      │
    │  • www.garbage.team (Hub)     │ ─── /api/pd/* (proxied) ──▶  • pandamarket-backend        │
    │  • *.garbage.team (Storefront)│                           │  • srv-d9qjrth42hec73efhoa0   │
    │  • admin.garbage.team (Admin) │                           │  • Port 9000 / Health check   │
    └───────────────────────────────┘                           └──────────────┬────────────────┘
                                                                               │
         ┌──────────────────────────────┬──────────────────────────────────────┼───────────────────────┐
         ▼                              ▼                                      ▼                       ▼
┌─────────────────┐            ┌─────────────────┐                   ┌──────────────────┐    ┌──────────────────┐
│   PostgreSQL    │            │     Redis 7     │                   │   Object Store   │    │   Meilisearch    │
│  Supabase Pooler│            │ BullMQ Queues + │                   │  MinIO (Local) / │    │   Port 7700      │
│  AWS eu-central │            │ Sessions Cache  │                   │  R2/S3 (Remote)  │    │  (PG Fallback)   │
│   (126 Tables)  │            │  (Upstash/io)   │                   │ (Postgres-blob)  │    │                  │
└─────────────────┘            └─────────────────┘                   └──────────────────┘    └──────────────────┘
```

---

## 2. Live Runtime Verification Baseline (August 26, 2026)

| Probe Target | Endpoint / Command | Live Result | Diagnosis & Risk |
|---|---|---|---|
| **Backend Health** | `GET /health` | `HTTP 200 {"status":"ok"}` | Web process is alive and handling requests on Render. |
| **Backend Readiness** | `GET /ready` | `HTTP 503 {"status":"not_ready"}` | `postgres`: ok (~149ms–1023ms), `redis`: ok (45ms), `meilisearch`: degraded, `s3`: degraded. |
| **Backend Typecheck** | `npm run type-check -w backend` | **`Exit Code 1 (FAILED)`** | **Active Blocker:** `TS2304: Cannot find name 'retentionRouter'` in `src/main.ts:345` + `TS6133` unused declarations in `retention.route.ts`. |
| **Frontend Typecheck** | `npx tsc -p frontend/tsconfig.json --noEmit` | **`Exit Code 0 (CLEAN)`** | Zero TypeScript compilation errors across Next.js frontend workspace. |
| **Frontend Production** | `https://www.garbage.team` | `HTTP 200 OK` | Main marketplace hub portal is live. |
| **Storefront Host** | `https://prodypanda.garbage.team` | `HTTP 200 OK` | Multi-tenant host resolution correctly classifies and serves storefronts. |
| **Database Schema** | Supabase PostgreSQL | `126 tables` | 100% foreign key index coverage; RLS active on all tables. |
| **Wallet Activity** | `SELECT COUNT(*) FROM pd_wallet_transaction` | `5 rows total` | Only 1 sale credit ever recorded (via Mandat path). Proves P0-1: card payments emit no wallet credits. |
| **Render Service Plan**| Render API | `Free tier` | Subject to 15-minute cold sleep without inbound traffic. |
| **Payment Credentials**| Render Env | `Sandbox / Mock` | Real Flouci/Konnect API keys not yet populated in production env. |
| **SMTP Transport** | Render Env | `Absent` | SMTP host/credentials not configured; fallback to mock console mailer. |

---

## 3. High-Level Findings Synthesis

### A. Architectural Strengths
1. **Defensive Database Modeling:** 126 PostgreSQL tables with 100% foreign key indexing and Row-Level Security (RLS) enabled. All mutations use raw parameterized SQL with `FOR UPDATE` transaction locks on financial and stock operations. Zero SQL injection vectors detected.
2. **Hardened Session Security:** Authentication utilizes HTTP-only, `sameSite: 'lax'` JWT cookies (`pd_at` 15 min / `pd_rt` 7 days) with rotating refresh token families, SHA-256 token hashing, and server-side revocation tracking.
3. **Cryptographic Checkout Quotes:** Checkout totals, tiered wholesale discounts, and shipping rules are calculated server-side in `checkout-quote.service.ts` with cryptographic version hashes (`quote_version`), completely preventing client-side price tampering.
4. **Admin Domain Modularity:** The Superadmin monolithic router has been divided into 17 modular domain routers (`backend/src/api/admin/*.routes.ts`), guarded by global `requireAuth` and `requireAdmin` middlewares.

---

### B. Core Vulnerability Clusters

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MAJOR PLATFORM DISCONNECTS                         │
├─────────────────────────┬───────────────────────────────────────────────────┤
│ 1. Financial Pipeline   │ Online payments, storefront receipts, and COD     │
│    (Critical Defect)    │ captures never emit wallet credits or assign      │
│                         │ serial keys to buyers.                            │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 2. Realtime & Auth UX   │ Socket.IO tokens never fetch post-login; pre-     │
│    (High Defect)        │ connection event listeners are dropped; guest     │
│                         │ checkout is blocked by mandatory login redirects. │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 3. Storage & Search     │ Meilisearch and S3 currently run on PostgreSQL    │
│    (Infrastructure)     │ fallbacks (PG trigram search + DB bytea blobs).   │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 4. Code Monoliths       │ products/page.tsx (7.8K lines) and settings/      │
│    (Maintainability)    │ page.tsx (6.2K lines) create severe client lag.   │
└─────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 4. The Broken Financial Pipeline (Why Merchants Don't Get Paid)

```
[Customer Checkout] ──▶ [Gateway Webhook / COD Delivery]
                                   │
                                   ▼
                    [pd_order.payment_status = 'captured']
                                   │
                 ❌ MISSING EVENT: PdEvent.PAYMENT_CAPTURED
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
[pd_vendor_wallet (No Credit)]              [pd_license_key (Never Assigned)]
[Platform Commission (Lost)]                [Seller Email / SMS (Never Sent)]
```

Fixing this pipeline (detailed in [02-BUGS-CRITICAL-P0.md](./02-BUGS-CRITICAL-P0.md) and [07-IMPLEMENTATION-GUIDES.md](./07-IMPLEMENTATION-GUIDES.md)) is the single highest business priority before enabling live payment credentials.
