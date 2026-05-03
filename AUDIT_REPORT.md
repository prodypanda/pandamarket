# PandaMarket — Comprehensive Audit Report

> **Date:** 2026-05-04
> **Auditor:** AI Senior Fullstack Architect
> **Scope:** Full code-level audit of all 20 AI instruction documents vs. actual implementation

---

## 1. Overall Completion: ~40%

| Layer | Completion | Production-Ready? |
| :--- | :--- | :--- |
| Infrastructure (Docker, Caddy) | ~90% | ✅ Yes (minor tweaks) |
| Database schema & migrations | ~95% | ✅ Yes (16 core tables + 4 new tables in migration 002) |
| Seed data | 100% | ✅ Yes (comprehensive idempotent seed) |
| Backend services (logic) | ~70% | ⚠️ Payment service is **MOCKED** |
| Backend API routes | ~60% | ⚠️ Missing admin, files, internal, vendor, notifications, credits routes |
| Backend security | ~55% | 🔴 Webhook HMAC missing, CSP missing, CSRF missing |
| Backend workers (BullMQ) | ~80% | ✅ AI/email/payout runners exist |
| Frontend Hub | ~25% | 🔴 Hardcoded data, no auth, no real checkout |
| Frontend Storefront | ~30% | 🔴 Mock data, no real API calls |
| Frontend Dashboard | ~10% | 🔴 Only overview with placeholder data |
| Frontend Admin Panel | 0% | 🔴 **Does not exist** |
| Tests | 0% | 🔴 **Zero test files** |

---

## 2. Completed Features ✅

### Infrastructure
- [x] npm workspaces monorepo (backend, frontend, packages/types)
- [x] docker-compose.yml with Postgres 16, Redis 7.2, Meilisearch 1.8, MinIO
- [x] Caddyfile with wildcard SSL, on-demand TLS, hub/admin/api/search routing
- [x] .editorconfig, .prettierrc, .gitignore, .nvmrc, tsconfig strict mode

### Database
- [x] 16 core tables with `pd_` prefix, all required indexes
- [x] `updated_at` trigger function
- [x] Migration runner (run.ts, rollback.ts)
- [x] Migration 002: `pd_payment_event` (idempotency), `pd_webhook_subscription`, `pd_webhook_delivery`, `pd_audit_log`
- [x] Comprehensive seed.ts (7 plans, 3 themes, admin, 2 vendors, customer, 6 sample products, approved KYC)

### Backend Services (15 services)
- [x] **auth.service.ts** — register, login, refresh token rotation, logout, bcrypt 12 rounds
- [x] **store.service.ts** — CRUD, subdomain/domain uniqueness, resolveByHostname, payment config encryption, markVerified, suspend
- [x] **product.service.ts** — CRUD with quota enforcement, draft/published workflow per is_verified, image management
- [x] **order.service.ts** — checkout with order splitting per store, stock decrement, fulfillment, cancel with restock
- [x] **wallet.service.ts** — FOR UPDATE locks, atomic transactions, roundTnd, retention periods, withdraw, payout mode
- [x] **subscription.service.ts** — quota checks, downgrade blocking, plan rank comparison, cache
- [x] **kyc.service.ts** — submit, re-submit after rejection, approve/reject with store verification
- [x] **mandat.service.ts** — upload proof, re-upload after rejection, approve/reject, event emission
- [x] **notification.service.ts** — DB + WebSocket via socketGateway, list, unread count, mark read
- [x] **report.service.ts** — create with dedup (unique constraint), list, status update
- [x] **search.service.ts** — Meilisearch init, index product, search with filters
- [x] **ai.service.ts** — queue jobs, token check, BullMQ integration, status updates
- [x] **credits.service.ts** — create, consume (atomic with FOR UPDATE), refill, unlimited plan bypass
- [x] **api-key.service.ts** — SHA-256 hash, key shown once, scope assertion, expiry, verify

### Backend Middleware
- [x] JWT auth (access + refresh from header or cookie)
- [x] Role-based access (requireAuth, requireRole, requireAdmin, requireVendor, requireStore)
- [x] API key auth (requireApiKey with scope checking)
- [x] Rate limiting (auth: 10/15m, API: 100/min)
- [x] Zod input validation on all routes
- [x] Request ID + access logging
- [x] Custom PdError hierarchy with HTTP status mapping
- [x] Async handler wrapper

### Backend Utilities
- [x] AES-256-GCM encryption/decryption for vendor payment keys
- [x] SHA-256 hashing for API keys
- [x] Prefixed ID generation (pd_store_xxx, pd_order_xxx)
- [x] JWT sign/verify with proper error handling
- [x] Pino structured logging with PII redaction (passwords, tokens, API keys, auth headers)
- [x] TND money helpers (roundTnd, tndToMillimes, calculateCommission)
- [x] S3 presigned URL generation (upload + download)
- [x] Plan defaults and rank comparison

### Backend Workers
- [x] AI worker (image compression via sharp, SEO via Gemini)
- [x] Email worker (SMTP transport)
- [x] Payout worker (automatic payouts)

### Backend Payment Providers (real implementations)
- [x] Flouci provider (real API calls to developers.flouci.com)
- [x] Konnect provider (real API calls to api.konnect.network)
- [x] Manual Mandat provider
- [x] COD provider
- [x] Provider registry with decryptVendorConfig for direct payment mode

### Frontend
- [x] Next.js middleware for hostname-based routing (hub vs store subdomain)
- [x] 3 theme scaffolds (MinimalTheme, ClassicTheme, ModernTheme)
- [x] Theme registry with colors, typography, layout config
- [x] HubNavbar + SearchBar components
- [x] Hub homepage scaffold (hero, categories, trending)
- [x] Dashboard layout with sidebar
- [x] Checkout page scaffold
- [x] Mandat upload page scaffold

---

## 3. Missing Features (Grouped by Priority)

### 🔴 CRITICAL (Blocks Production)

1. **Payment service is MOCKED** — `payment.service.ts` returns fake URLs (`flouci_${Date.now()}`). Real providers exist in `plugins/payment/` but are NOT wired.
2. **Webhook HMAC verification missing** — Payment webhooks have comments "In production, verify signature here" but NO actual verification.
3. **Payment idempotency not wired** — `pd_payment_event` table exists but service code doesn't INSERT into it before processing.
4. **Admin panel does NOT exist** — No `(admin)` route group. Cannot approve KYCs, mandats, or manage reports.
5. **Admin API routes missing** — No `/api/pd/admin/*` routes.
6. **File presign endpoint missing** — No `/api/pd/files/presign` route (Zod schema exists but route doesn't).
7. **Internal TLS endpoint missing** — `/api/pd/internal/tls-allowed` referenced by Caddyfile doesn't exist.
8. **Frontend uses all mock data** — Hub homepage, storefront, dashboard all use hardcoded arrays.
9. **Auth pages missing** — No login/register UI.
10. **Zero tests** — No `*.test.ts` files exist anywhere.

### 🟠 HIGH (Required for MVP)

1. Forgot/reset password flow
2. Email verification for new vendors
3. Wallet retention release worker (periodic BullMQ job)
4. Subscription expiry watcher (daily job)
5. Notification API routes (service exists, no routes)
6. Vendor API routes with API-key auth (service exists, no routes)
7. Credits API routes (service exists, no routes)
8. Search results page, product detail page, cart page
9. Dashboard wallet, KYC, settings, subscription, AI tools pages
10. Outgoing webhook dispatcher worker
11. Strict CSP headers
12. CSRF protection for cookie-based auth

### 🟡 MEDIUM (Required for v1.0)

1. CSV/Excel import/export for products
2. Digital product download endpoint with license keys
3. Aramex/La Poste shipping integration
4. Page Builder (GrapesJS/Craft.js)
5. Custom domain support in middleware
6. Theme purchase flow
7. Stock-low alert subscriber
8. Login attempt lockout (brute-force protection)
9. Skeleton loaders and micro-animations
10. SEO (sitemap, robots.txt, OG tags)

---

## 4. Security Vulnerabilities

| # | Severity | Issue | Location |
| :--- | :--- | :--- | :--- |
| 1 | 🔴 CRITICAL | Payment webhooks have NO HMAC signature verification | `api/payment.route.ts` |
| 2 | 🔴 CRITICAL | Payment idempotency not enforced at service layer | `services/payment.service.ts` |
| 3 | 🔴 CRITICAL | No strict Content-Security-Policy | `main.ts` (helmet defaults only) |
| 4 | 🔴 CRITICAL | No HSTS preload in backend | `main.ts` |
| 5 | 🟠 HIGH | No CSRF protection for cookie-based auth | `pd_at` cookie set without CSRF token |
| 6 | 🟠 HIGH | No login attempt lockout | `auth.service.ts` |
| 7 | 🟠 HIGH | Tenant isolation not fully audited | All vendor queries need store_id filter verification |
| 8 | ✅ RESOLVED | PII redaction in logs | Logger has Pino redact paths configured |
| 9 | ✅ RESOLVED | Audit log table | `pd_audit_log` created in migration 002 |

---

## 5. Design System Compliance

| Item | Spec | Actual | Status |
| :--- | :--- | :--- | :--- |
| Font | Inter | Geist / Geist_Mono | ❌ Wrong |
| Primary CTA color | Panda Green #16C784 | blue-600 | ❌ Wrong |
| Icons | Lucide (20px, stroke 1.75) | Lucide installed ✅ | ⚠️ Stroke not standardized |
| Design tokens | CSS custom properties | Minimal (only --background, --foreground) | ❌ Missing |
| Dark mode | Full support | Partial (some dark: classes) | ⚠️ Incomplete |
| Skeleton loaders | Required | Not implemented | ❌ Missing |
| Micro-animations | Awwwards-level | Some hover scale present | ⚠️ Minimal |

---

## 6. Testing Gaps

- **Zero test files exist** in the entire project
- vitest is NOT installed (no vitest.config.*)
- No Playwright E2E tests
- No k6 load tests
- Critical untested flows: wallet operations, payment capture, auth, subscription quotas, KYC workflow, mandat workflow, tenant isolation

---

## 7. Recommended Next Steps

### Immediate (Sprint 1 — ~1 week)
1. Wire `payment.service.ts` to real provider registry
2. Add webhook HMAC signature verification
3. Wire payment idempotency (INSERT into `pd_payment_event`)
4. Create `/api/pd/internal/tls-allowed` endpoint
5. Create `/api/pd/files/presign` endpoint
6. Wire wallet retention release as periodic BullMQ job

### Short-term (Sprint 2 — ~1.5 weeks)
1. Create admin API routes and frontend admin panel
2. Write Vitest test suites for critical services
3. Add missing API routes (notifications, credits, vendor)

### Medium-term (Sprint 3 — ~2 weeks)
1. Replace all mock data with real API calls
2. Build missing frontend pages
3. Apply correct design system (Inter font, Panda Green, design tokens)
4. Create auth pages (login/register)

### Pre-launch (Sprint 4-5 — ~2.5 weeks)
1. Security hardening (CSP, HSTS, CSRF, login lockout)
2. Vendor API + outgoing webhooks
3. SEO, skeleton loaders, animations
4. Load tests + final security audit

**Estimated total: ~7 weeks to production-ready MVP.**
