# 01 — Executive Summary & System Health Snapshot

> **Audit Context:** PandaMarket is a hybrid e-commerce platform blending a multi-tenant storefront engine with a central discovery marketplace tailored specifically for the Tunisian e-commerce ecosystem.

---

## 1. System Topology & Service Snapshot

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

## 2. Live Runtime Verification & Probes (August 26, 2026)

| Probe Target | Endpoint / Command | Live Result | Diagnosis & Risk |
|---|---|---|---|
| **Backend Health** | `GET /health` | `HTTP 200 {"status":"ok"}` | Process is alive and responding on Render. |
| **Backend Readiness** | `GET /ready` | `HTTP 503 {"status":"not_ready"}` | `postgres`: ok (1023ms), `redis`: ok (45ms), `meilisearch`: degraded, `s3`: degraded. |
| **Backend Typecheck** | `npm run type-check -w backend` | **`Exit Code 1 (FAILED)`** | **Breaking:** `TS2304: Cannot find name 'retentionRouter'` in `src/main.ts:345` + `TS6133` unused schema in `retention.route.ts`. |
| **Frontend Typecheck** | `npx tsc -p frontend/tsconfig.json --noEmit` | **`Exit Code 0 (CLEAN)`** | Zero TypeScript compilation errors in Next.js frontend workspace. |
| **Frontend Production** | `https://www.garbage.team` | `HTTP 200 OK` | Main hub portal serves HTML correctly. |
| **Storefront Tenancy** | `https://prodypanda.garbage.team` | `HTTP 200 OK` | Tenant host correctly classified and resolved. |
| **Database Schema** | Supabase PostgreSQL | `126 tables` | 100% foreign key index coverage; RLS active on all tables. |
| **Wallet Activity** | `SELECT COUNT(*) FROM pd_wallet_transaction` | `5 rows total` | Only 1 sale credit ever recorded (via Mandat path). Confirms P0-1: card payments emit no wallet credits. |

---

## 3. High-Level Findings Synthesis

### A. What is Exceptional (Do Not Break)
1. **Defensive Database Layer:** Every single foreign key across all 126 tables is indexed. Row-Level Security (RLS) is enabled on all tables. All database interactions utilize raw parameterized SQL with `FOR UPDATE` transaction locks on financial and stock mutations. No ORM overhead or SQL injection risks exist.
2. **Authentication & Session Hardening:** No raw JWTs in `localStorage`. Access tokens (`pd_at`, 15-min TTL) and refresh tokens (`pd_rt`, 7-day TTL) are stored exclusively in secure, `httpOnly`, `sameSite: 'lax'` cookies with rotating token families and server-side revocation tracking.
3. **Checkout Authoritative Quoting:** Checkout totals, wholesale tiered discounts, and shipping logic are enforced server-side via `checkout-quote.service.ts` with cryptographic version hashes (`quote_version`), mitigating client-side tampering.
4. **Admin Domain Modularity:** The Superadmin monolithic router has been split into 17 modular domain routers (`backend/src/api/admin/*.routes.ts`), fully protected by global `requireAuth` and `requireAdmin` middleware.

---

### B. Core Vulnerabilities & Gaps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MAJOR PLATFORM CLUSTERS                            │
├─────────────────────────┬───────────────────────────────────────────────────┤
│ 1. Financial Pipeline   │ Online payments, storefront receipts, and COD     │
│    (Critical Defect)    │ captures never emit wallet credits or assign      │
│                         │ serial keys to buyers.                            │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 2. Realtime & Auth UX   │ Socket.IO tokens never fetch post-login; pre-     │
│    (High Defect)        │ connection event listeners are dropped; guest     │
│                         │ checkout is blocked on mandatory login.           │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 3. Storage & Search     │ Meilisearch and S3 currently run on PostgreSQL    │
│    (Infrastructure)     │ fallbacks (PG trigram search + DB bytea blobs).   │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 4. Code Monoliths       │ products/page.tsx (7.8K lines) and settings/      │
│    (Maintainability)    │ page.tsx (6.2K lines) create severe client lag.   │
└─────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 4. Financial Pipeline Architecture Flaw

The most urgent risk to the business is the disconnection between order capture and the vendor wallet pipeline:

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

Fixing this pipeline (detailed in [02-BUGS-CRITICAL-P0.md](./02-BUGS-CRITICAL-P0.md) and [08-IMPLEMENTATION-GUIDES.md](./08-IMPLEMENTATION-GUIDES.md)) is the prerequisite before launching any commercial marketing campaigns or onboarding real paying merchants.
