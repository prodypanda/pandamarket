# 02 · Architecture & Live State

[← Index](./00-README.md) · Next: [03 P0 Bugs](./03-BUGS-P0-CRITICAL.md)

---

## 1. Repository shape

npm workspaces monorepo, Node ≥ 20, TypeScript 5.5.

```
pandamarket/
├── backend/                 Express API + BullMQ workers      287 .ts files
│   ├── src/api/             38 route files + 17 admin sub-routers
│   ├── src/services/        57 services (largest: analytics 4,676 lines)
│   ├── src/workers/         10 BullMQ workers + 9 standalone runners + outbox poller
│   ├── src/queues/          9 BullMQ queues
│   ├── src/subscribers/     9 in-process event subscribers
│   ├── src/middlewares/     auth, CSRF, rate-limit store, maintenance, audit-log
│   ├── src/migrations/sql/  99 up-migrations (70 without .down)
│   ├── src/realtime/        Socket.IO gateway
│   └── src/__tests__/       85 test files
├── frontend/                Next.js 16.2.4 / React 19.2.4      393 .ts/.tsx files
│   ├── src/app/hub/         marketplace hub (16 route groups)
│   ├── src/app/(admin)/     superadmin dashboard (28 pages)
│   ├── src/app/store/[storeHost]/  multi-tenant storefront (26 routes)
│   ├── src/app/(auth)/      login/register/reset (role-scoped)
│   ├── src/app/api/         4 Next route handlers (revalidate ×3, csp-report)
│   ├── src/middleware.ts    host-based tenant routing
│   ├── src/i18n/messages/   en.json / fr.json / ar.json — 3,046 keys each
│   └── e2e/                 15 Playwright specs
├── packages/types/          shared enums + entity interfaces
├── scripts/api-contract-audit.cjs   frontend-calls ↔ backend-routes reconciliation
└── .github/workflows/       ci.yml (blocking) · e2e.yml (advisory)
```

There is **one** Next.js app. It serves the hub, the admin panel and every tenant storefront;
`middleware.ts` decides which by inspecting the `Host` header.

---

## 2. Request routing

```
                     ┌────────────────────────────────────────────┐
   Browser ────────► │  Vercel — frontend/src/middleware.ts       │
                     │  classifyHost(Host)                        │
                     └────────────────┬───────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
  hostType='hub'              hostType='admin'            (anything else)
  garbage.team                admin.garbage.team          <sub>.garbage.team
  www.garbage.team                                        or a custom domain
        │                             │                             │
   rewrite → /hub/*            rewrite → /(admin)/*       rewrite → /store/{host}/*
        │                             │                             │
        └─────────────────────────────┴─────────────────────────────┘
                                      │
                     server components fetch BACKEND_URL/api/pd/*
                                      │
                     ┌────────────────▼───────────────────────────┐
                     │  Render — Express                          │
                     │  Sentry → metrics → helmet → CORS →        │
                     │  parsers → static/blob-restore →           │
                     │  requestId → accessLog → apiRateLimit →    │
                     │  csrf → maintenance → auditLog → /api/pd   │
                     └────────────────┬───────────────────────────┘
                                      │
              ┌───────────────┬───────┴────────┬─────────────────┐
              ▼               ▼                ▼                 ▼
        Supabase PG     Redis/BullMQ      Socket.IO       (S3 / Meili — unset)
        121 tables      9 queues          store:/user:/admin rooms
```

Two facts about this diagram that matter for the findings:

- The middleware makes **two backend fetches per request** (maintenance status + storefront
  status). They are parallelised and cached (30 s TTL, maintenance keyed per client IP because the
  allowlist bypass makes the response IP-dependent). The cache is `clear()`-ed wholesale at 1,000
  entries and any unknown Host is treated as a storefront → [B-84].
- Storefronts are reachable **two ways**: `sub.garbage.team/...` (tenant host) and
  `www.garbage.team/store/sub/...` (hub path). Cookies set on the hub path are shared across all
  tenants → [B-56 note / storefront finding #12].

---

## 3. Backend layering

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes | `api/*.route.ts`, `api/admin/*.routes.ts` | zod validation, guards, HTTP shape |
| Services | `services/*.service.ts` | business logic, SQL, transactions |
| Data | `db/pool.ts` (pg Pool + `transaction()` helper), `db/redis.ts` (single shared ioredis) |
| Events | `events/event-bus.ts` (in-process `EventEmitter`) + `pd_outbox_event` (transactional outbox) |
| Async | `queues/*` (BullMQ) + `workers/*` |
| Realtime | `realtime/socket-gateway.ts` (Socket.IO) |

**Guards** (`middlewares/index.ts`): `requireAuth` (JWT from `Authorization` or `pd_at` cookie),
`optionalAuth`, `requireStorefrontCustomer` (`pd_storefront_at`), `requireRole(...)`,
`requireAdmin`, `requireSuperAdmin` (**used zero times** → [M-07]), `requireVendor`,
`requireStore` (resolves + ownership-checks the selected store), `requireApiKey`.

**Rate limiters:** `apiRateLimit` (100/min, applied globally *before* auth so `req.user` is always
undefined → [B-18/B-44]), `authRateLimit` (10/15 min), `adsEventRateLimit` (60/min),
`adsDeliveryRateLimit` (30/min), `gamifiedSpinRateLimit` (10/h), `uploadRateLimit` (10/5 min).
All Redis-backed via a hand-rolled fail-open store.

---

## 4. Event architecture — as designed vs as wired

**Designed:** two parallel mechanisms.

1. **In-process bus** for notifications, emails, wallet credits, search indexing, webhooks.
2. **Transactional outbox** (`pd_outbox_event`) for storefront cache invalidation + webhook fan-out,
   polled every 3 s by `outbox.worker.ts`.

**As wired:**

| Event | Subscribers | Emitters | State |
| --- | --- | --- | --- |
| `pd.order.placed` | 3 | **0** | ❌ dead |
| `pd.order.fulfilled` | 2 | **0** | ❌ dead |
| `pd.order.cancelled` | 1 | **0** | ❌ dead |
| `pd.order.delivered` | 1 | **0** | ❌ dead |
| `pd.product.created` | 1 | **0** | ❌ dead |
| `pd.verification.approved` | 1 | **0** | ❌ dead |
| `pd.verification.rejected` | 1 | **0** | ❌ dead |
| `pd.payment.captured` | 2 | 1 (`mandat.service.ts:149` only) | ⚠️ partial |
| `pd.product.published` | 1 | 2 | ✅ |
| `pd.stock.low` | 1 | 1 (but triggered by dead `ORDER_PLACED`) | ⚠️ unreachable |
| `pd.ai.job.completed` | 1 | 1 | ✅ |
| `pd.ai.job.failed` | 0 | 1 | ⚠️ orphan emit |
| `pd.wallet.funds_available` | 0 | 1 | ⚠️ orphan emit |
| `pd.wallet.payout_completed` | 1 | 1 | ✅ |

**Outbox:** exactly one producer (`store.service.ts:901`, theme publish). Table has **0 rows,
ever**. So the outbox path is effectively untested in production, and it becomes load-bearing the
moment [B-02] is fixed properly.

→ [B-02](./03-BUGS-P0-CRITICAL.md#b-02), [B-22](./04-BUGS-P1-HIGH.md#b-22), [E-01](./07-ENHANCEMENTS.md#e-01)

---

## 5. Money flow — as designed vs as wired

```
Buyer                                                            Seller
  │                                                                 │
  ├─ POST /cart/quote ──► checkout-quote.service                     │
  │     ▪ server-authoritative totals                               │
  │     ▪ coupon resolution (5 hardcoded literals + broadcasts)      │
  │     ▪ shipping per store + combined rebate                      │
  │     ▪ payment-capability snapshot + version                     │
  │     ▪ persisted as pd_checkout_quote (3 rows live)               │
  │                                                                 │
  ├─ POST /orders ──► orderService.checkout          ✅ SOLID        │
  │     ▪ advisory-lock on idempotency key                          │
  │     ▪ FOR UPDATE products+variants, ascending id                │
  │     ▪ quote.assertMatches (version pinning)                     │
  │     ▪ guarded stock decrement (UPDATE … WHERE qty >= n)         │
  │     ▪ one pd_fulfillment per store   ← order splitting ✅       │
  │     ▪ ✗ never emits ORDER_PLACED                    [B-02]      │
  │                                                                 │
  ├─ POST /payments/init ──► reserve attempt, provider redirect      │
  │                                                                 │
  ├─ gateway webhook ──► processPaymentWebhook        ✅ SOLID        │
  │     ▪ HMAC verified, rawBody preserved                          │
  │     ▪ amount+currency checked in minor units                    │
  │     ▪ merchant-account match                                    │
  │     ▪ attempt + order captured in ONE transaction               │
  │     ▪ idempotent by (gateway, reference) + attempt state         │
  │     ▪ ✗ never emits PAYMENT_CAPTURED                [B-02]      │
  │                                                                 │
  │        ┌── (if it were emitted) ──────────────────────────┐     │
  │        │ order.subscriber.onPaymentCaptured               │     │
  │        │   ▪ per-store subtotal (SHIPPING EXCLUDED)       │     │
  │        │   ▪ commission = subtotal × plan.commission_rate │     │
  │        │   ▪ walletService.creditPending(net, retention)  │──►  ├─ pending_balance
  │        └──────────────────────────────────────────────────┘     │
  │                                                                 │
  │                          payout.worker every 15 min             │
  │                          releaseDueFunds()  pending → balance   ├─ balance
  │                            ✗ then notifies EVERY vendor [B-40]  │
  │                                                                 │
  │                          vendor POST /wallet/me/withdraw        │
  │                            ✗ no idempotency key       [B-18]    ├─ debit
  │                            ✗ no admin approval flow   [M-05]    │
  │                                                                 │
  └─ refund? ──► requestStoreRefund → INSERT row … and nothing else [B-19]
```

DB money columns are correctly `NUMERIC(12,3)` (millimes). Application math is **JS floats**;
`toMinorUnits` returns a bigint but nothing in the commission path uses it → [B-81].

---

## 6. Live production state

### 6.1 HTTP probes

| Endpoint | Result | Note |
| --- | --- | --- |
| `GET /health` | `200 {"status":"ok"}` | |
| `GET /ready` | `200 ready` | postgres 141 ms · redis 44 ms · meilisearch `degraded` · s3 `degraded` |
| `GET /metrics` | `200`, **106 KB, public** | [B-20] |
| `GET /api/pd/marketplace/settings` | `200`, 10,827 B | |
| `GET /api/pd/categories` | `200`, 89,001 B | 80 categories, 12 roots |
| `GET /api/pd/shipping/carriers` | `200`, 4,496 B | |
| `GET /api/pd/subscriptions/plans` | `200`, 3,036 B | |
| `GET /api/pd/themes` | `200`, 7,421 B | |
| `GET /api/pd/search?q=shirt&limit=1` | `200`, 4,969 B | Postgres path |
| `GET /api/pd/products/by-product/…/bundles` | **`500`** | [B-07] |
| `GET /api/pd/internal/tls-allowed?domain=example.com` | `404` (public, reachable) | [B-20] |
| `GET /api/pd/marketplace/cms/pages` | `401` | correctly guarded |
| `POST /api/pd/retention/rewards-lead` | `403` CSRF | [B-00] |
| `GET /socket.io/?EIO=4&transport=polling` | `200`, handshake issued, **no ACAO header** | see 6.4 |

### 6.2 Frontend probes (`www.garbage.team`)

| Path | Result |
| --- | --- |
| `/hub` | `200`, 529,939 B |
| `/hub/products` | `307` → `/hub/search` |
| `/hub/search?q=shirt` | `200`, 26,233 B |
| `/hub/checkout/success?order_id=FAKE123` | **`200`, renders "Payment Successful!"** [B-10] |
| `/hub/pages/about` | `404` (0 platform pages exist) |
| `/robots.txt` | `200`, 216 B |
| `/sitemap.xml` | `200`, 38,482 B |
| `elegance.garbage.team` | `404` (no such store — correct) |
| `atelier-medina.garbage.team/` | `200`, 141,577 B |
| `atelier-medina.garbage.team/products` | `200`, 95,376 B |
| `bbbbbbbb.garbage.team/` | `200`, 29,458 B (store is `maintenance` — renders the maintenance page) |
| `sarra-boutique.garbage.team/` | `200`, 29,571 B (store is `unverified`) |
| `sarra-boutique.garbage.team/products` | **`200`**, 35,515 B, `<title>Produits - Sarra Boutique`, full chrome, no unavailable notice [B-25] |

### 6.3 Database

See [`B-DATABASE-FINDINGS.md`](./B-DATABASE-FINDINGS.md) for the full inventory. Headline numbers:

```
121 pd_* tables · 99 migrations applied (= 99 files on disk) · 101 MB · all have PKs
RLS enabled 121/121 pd_*, 0 policies (deny-by-default for anon/postgrest)
RLS OFF on 5 admin_note* tables (name pattern missed them)              [B-36]
7 unindexed foreign keys remain                                          [B-35]

Largest tables:  pd_file_blobs 45 MB (547 rows, 34 MB of payload)        [M-02]
                 pd_ads_transaction 21 MB (60,368 rows)                  [B-24]
                 pd_audit_log 5.4 MB (3,779 rows)
                 pd_system_log 1.1 MB (733 rows, all level=error)
                 pd_user_login_event 1.0 MB (1,107 rows)
                 pd_ai_jobs 1.0 MB (135 rows)
                 pd_refresh_tokens 736 kB (1,354 rows, 1,281 expired)
```

### 6.4 Deployment configuration

**Render** (`srv-d9qjrth42hec73efhoa0`) — 16 env vars set:

```
✅ PD_NODE_ENV=production   PD_DATABASE_URL   PD_DATABASE_SSL=true
   PD_DATABASE_POOL_SIZE=8  PD_REDIS_URL      PD_JWT_SECRET (35 chars)
   PD_COOKIE_SECRET (38)    PD_ENCRYPTION_KEY (64)   PD_SENTRY_DSN
   PD_METRICS_ENABLED=true  PD_REVALIDATE_SECRET     FRONTEND_URL=https://www.garbage.team
   PD_ALLOW_SANDBOX_PAYMENTS=true
⚠️ PD_SMS_PROVIDER=whatsapp_gateway         ← not a value the code recognises  [B-17]
⚠️ PD_WHATSAPP_GATEWAY_URL / _TOKEN         ← read by ZERO lines of code       [B-17]

❌ NOT SET: PD_HUB_DOMAIN  PD_SMTP_*  PD_MAIL_FROM  PD_S3_*  PD_MEILI_HOST
            PD_ADMIN_CORS  PD_STORE_CORS  PD_GEMINI_API_KEY  PD_BCRYPT_ROUNDS
            PD_RUN_WORKERS_IN_PROCESS  PD_PAYOUTS_AUTO_ENABLED  PD_LOG_LEVEL
            PD_FLOUCI_*  PD_KONNECT_*  PD_PAYPAL_*
```

Consequences of the unset vars, in order of impact:

- **`PD_HUB_DOMAIN` unset** → defaults to `'pandamarket.local'` (`config.ts:81`). Every URL built
  from `config.hubDomain` is wrong in production: password-reset links
  (`auth.service.ts:576`), email-verification links (`:638`), payment success/fail URLs when no
  return origin is supplied (`payment.service.ts:477-480`), subscription magic links
  (`subscription-payment.service.ts:737`), ads refill callbacks (`ads-refill.service.ts:17`),
  and the storefront hostname set the outbox uses for revalidation (`outbox.service.ts:104`).
  `FRONTEND_URL` covers only the outbox revalidation fetch. **This is a P1 finding in its own
  right → [B-93](./04-BUGS-P1-HIGH.md#b-93).**
- `PD_SMTP_*` / `PD_MAIL_FROM` unset → all email inert (fails loudly ✅) → [M-01]
- `PD_S3_*` unset → uploads persisted into Postgres as `bytea` → [M-02]
- `PD_MEILI_HOST` unset → `/ready` reports `degraded`; irrelevant to queries anyway → [B-77]
- `PD_ADMIN_CORS` / `PD_STORE_CORS` unset → defaults to `['http://localhost:3000']`, but the
  regex allowlist for `*.garbage.team` / `*.pandamarket.tn` carries production
- `PD_GEMINI_API_KEY` unset → AI falls back to the DB-configured providers (which is the
  intended design; 33 job failures are provider-side)
- `PD_RUN_WORKERS_IN_PROCESS` unset → defaults `true` → every web instance runs 10 workers +
  outbox poller + 2 timers → [M-11], [B-22], [B-24]

**Vercel** (`prj_f0I1YhUlcTCSY8MZ8KV4M6b5Ob3J`) — 5 env vars, all on production+preview:

```
✅ BACKEND_URL  NEXT_PUBLIC_BACKEND_URL  NEXT_PUBLIC_HUB_URL
   NEXT_PUBLIC_MARKETPLACE_DOMAIN  PD_REVALIDATE_SECRET
```

Note `NEXT_PUBLIC_VERCEL_URL` is referenced at `lib/store-hosts.ts:54` and is not set — harmless
(it is one entry in a fallback chain), but worth knowing.

Socket.IO CORS is `[...config.adminCors, ...config.storeCors]` = `['http://localhost:3000']` in
production, which is why the handshake probe returned no `Access-Control-Allow-Origin` for
`https://www.garbage.team`. The polling handshake still succeeded because Socket.IO's own CORS
handling permits it, but **browser realtime from the production hub is not reliably configured**
→ [B-94](./04-BUGS-P1-HIGH.md#b-94).

---

## 7. Multi-tenancy model

| Surface | Tenant key | Derived from | Verified? |
| --- | --- | --- | --- |
| Storefront page render | `storeHost` route param | `Host` header via middleware rewrite | ✅ server-side |
| Storefront API reads | `store_id` query param | client-supplied, but every query scopes to it | ⚠️ reads only |
| Storefront customer session | `store_id` in JWT | issued at login for that store | ❌ token is indistinguishable from a user token [B-01] |
| Seller dashboard | `req.user.store_id` | `requireStore` — cookie or JWT, **ownership re-checked every request** | ✅ correct |
| Seller API mutations | `req.user!.store_id!` | as above | ✅ correct |
| Admin | none | `requireAdmin` | ⚠️ no Admin/SuperAdmin split [M-07] |

`requireStore` (`middlewares/index.ts:189-253`) is the strongest part of this model: it reads the
`pd_selected_store_id` cookie, re-verifies `owner_id` against the DB, falls back to the JWT claim
(also ownership-checked), then to the oldest owned store, and clears the cookie on mismatch. No
seller route trusts a client-supplied `store_id` — with one dead-code exception at
`seller.route.ts:22-56` → [B-62].

---

## 8. Concept-vs-implementation matrix

Against `ai instructions/spécifications fonctionnelles (PRD).md` and `business-model.md`:

| PRD requirement | Priority | State |
| --- | --- | --- |
| F3.1 Hub + individual storefronts | P0 | ✅ built |
| F3.2 Free subdomain | P0 | ✅ built |
| F3.2 Custom domain | P1 | ⚠️ built but **self-verifiable** [B-03] |
| F3.2 Automatic SSL (Caddy on-demand) | P0 | ⚠️ gate is public + bypassable [B-03], [B-20] |
| F3.3 Theme library | P0 | ✅ 20 frontend themes, DB catalogue, purchases |
| F3.3 Page builder | P1 | ✅ built, gated on plan for writes, **not for reads** [B-57] |
| F4.1 7-tier subscriptions | P0 | ✅ built; prices/limits diverge from the doc [M-16] |
| F4.1 Quota enforcement | P0 | ✅ backend; ❌ UI [B-13], [B-28] |
| F4.2 AI token packs | P1 | ✅ built (wallet purchase path) |
| F5.1 Physical / digital / service / serial / bundle | P0/P1 | ✅ schema + checkout; digital+serial **untested, 0 rows** [M-10] |
| F5.2 CSV/Excel import-export | P0 | ⚠️ export truncates to one page [B-29] |
| F5.2 REST API + API keys | P1 | ✅ built, ungated, one unenforced scope [B-13], [M-14] |
| F5.2 Outgoing webhooks (HMAC) | P1 | ⚠️ fully built, **never fires** [B-02]; 0 subscriptions |
| F5.3 Product approval workflow | P0 | ✅ built (2 products pending live) |
| F6.1 Flouci / Konnect / Mandat / COD | P0 | ✅ all four; sandbox credentials in prod (deliberate) |
| F6.2 Escrow + retention + withdrawal | P0 | ⚠️ escrow ✅; retention flattened to 2 days; **no approval flow** [M-05], [B-18] |
| F6.2 Direct payment (Pro+) | P1 | ✅ gated correctly; PayPal fields silently dropped [B-12/#5] |
| F6.3 Mandat Minute workflow | P0 | ✅ built end-to-end (4 live proofs); **placeholder bank details** [B-15] |
| F7.1 Self-managed + carrier integration | P0/P1 | ✅ 6 Tunisian carriers, quotes, AWB, tracking, webhooks |
| F7.2 Order splitting | P0 | ✅ verified live — 5 of 15 orders span 2 stores |
| F8.1 AI SEO (Gemini) | P1 | ✅ multi-provider with tiered fallback; ungated in UI [B-13] |
| F8.1 Image compression (sharp) | P1 | ✅ built + on-the-fly variants |
| F8.2 Token model | P1 | ✅ built; credits consumed **after** the API call [B-37] |
| F8.3 BullMQ + WebSocket | P1 | ✅ 9 queues, 10 workers; socket rooms unauthorized [B-01] |
| F9.1 KYC (RC + CIN + phone + manual) | P0 | ⚠️ documents ✅, manual approval ✅, **phone never wired** [M-09] |
| F9.2 Fraud reports | P1 | ✅ genuinely well built (best authz in the codebase) |
| 10.3 Encrypted vendor API keys | — | ✅ AES-256-GCM; no key rotation path [B-51] |
| 10.3 Presigned uploads | — | ⚠️ presigned but **unbounded size** [B-52] |
| Business model: White Label (Platinum) | — | ❌ flag exists, read nowhere [M-13] |
| Business model: theme marketplace 30% | — | ❌ not built |

---

## 9. What runs on a schedule

| Job | Mechanism | Interval | Risk |
| --- | --- | --- | --- |
| Outbox poll | `setInterval` in-process | 3 s | non-atomic claim, per-instance duplication [B-22] |
| Ads lifecycle | `setInterval` in-process | 5 min | **no lock, unbounded, 580 junk rows/day** [B-24] |
| Admin-note reminders | `setInterval` + Redis SET-NX | 2 min | fails open on Redis error [B-45 area] |
| Keep-alive self-ping | `setInterval` | 10 min | only when `RENDER_EXTERNAL_URL` set |
| `release_due_funds` | BullMQ repeat | 15 min | notifies **every** vendor [B-40] |
| `auto_payout` | BullMQ repeat | daily 03:00 | disabled (`PD_PAYOUTS_AUTO_ENABLED` unset); no idempotency [B-40] |
| `check_expiry` | BullMQ repeat | daily 02:00 | ✅ |
| `send_warnings` | BullMQ repeat | daily 09:00 | re-sends on retry [B-42] |
| `daily_digest` | BullMQ repeat | daily 19:00 | unbounded N+1, no `jobId` [B-41] |
| Payment reconciliation sweep | BullMQ repeat | 5 min | ✅ |
| Shipment reconciliation sweep | BullMQ repeat | 10 min | ✅ |

The four `setInterval` jobs all duplicate at 2+ instances. Only the reminder sweep has a lock.
