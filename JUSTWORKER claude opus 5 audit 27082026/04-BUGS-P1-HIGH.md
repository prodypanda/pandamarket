# 04 · Bugs — P1 High

[← Index](./00-README.md) · Prev: [03 P0 Critical](./03-BUGS-P0-CRITICAL.md) · Next: [05 P2 Medium](./05-BUGS-P2-MEDIUM.md)

**Definition of P1:** A core flow is broken, a promised feature is silently dead, or users see wrong data. 28 findings (B-06 through B-33).

| # | Finding | Where | Effort |
| --- | --- | --- | --- |
| [B-06](#b-06) | Suspending a buyer doesn't revoke their sessions (duplicate route shadowing) | `reports.routes.ts` vs `vendors.routes.ts` | ⚡ 15 min |
| [B-07](#b-07) | `SELECT DISTINCT` over a `json` column — live 500 on the bundle cross-sell widget | `product.service.ts:2276-2287` | ⚡ 15 min |
| [B-08](#b-08) | JSON-LD injection on the hub homepage | `hub/page.tsx:333-375` | ⚡ 30 min |
| [B-09](#b-09) | Transient backend failures become permanent 404s | `hub/products`, `pages`, `category` | ~2 h |
| [B-10](#b-10) | Checkout success page asserts payment success from a query parameter | `hub/checkout/success/page.tsx` | ⚡ 30 min |
| [B-11](#b-11) | Cart totals and the coupon catalogue are implemented four times | `CartContext`, cart pages, backend | ~3 h |
| [B-12](#b-12) | Seller onboarding: three of seven steps cannot be completed | `onboarding/page.tsx` | ~2 h |
| [B-13](#b-13) | Feature gating exists in the backend but not in the UI | `products`, `themes`, `domains`, `api-keys` | ~3 h |
| [B-14](#b-14) | Commission rate is corrupted for any value ≤ 1 % | `admin/stats.routes.ts:104-161` | ⚡ 30 min |
| [B-15](#b-15) | Buyers and sellers are shown placeholder bank details | `platform-config.service.ts` | ⚡ 30 min |
| [B-16](#b-16) | Thirteen image-size settings render inputs that are never submitted | `admin/settings/page.tsx:5703` | ⚡ 30 min |
| [B-17](#b-17) | Phone/SMS verification is inert, and the OTP is written to the log | `sms.service.ts`, Render env | ~2 h |
| [B-18](#b-18) | Withdrawals: a read-only ledger presented as an approval queue, and no payout idempotency | `withdrawals`, `wallet.service.ts` | ~3 h |
| [B-19](#b-19) | Refunds are recorded but never executed | `order.service.ts:1831-1912` | ~4 h |
| [B-20](#b-20) | Public unauthenticated `/metrics` and `/internal/tls-allowed` | `main.ts:149`, `internal.route.ts` | ⚡ 45 min |
| [B-21](#b-21) | Sentry ships request bodies; Postgres TLS is unvalidated | `sentry.ts`, `pool.ts:18` | ~1 h |
| [B-22](#b-22) | Outbox worker: non-atomic claim, per-instance duplication, no lease recovery | `outbox.worker.ts:33-67` | ~3 h |
| [B-23](#b-23) | Ads: click-fraud controls are client-optional and the IP detector self-destructs | `ads.service.ts:644-720` | ~3 h |
| [B-24](#b-24) | The ads lifecycle sweep has written 60,337 pointless ledger rows (21 MB) | `ads.service.ts:773-825` | ~2 h |
| [B-25](#b-25) | Storefront catalog pages have no public-store gate | `store/[storeHost]/products` | ⚡ 30 min |
| [B-26](#b-26) | Storefront customers are logged out every 15 minutes | `api.ts:107-113`, storefront auth | ~2 h |
| [B-27](#b-27) | Page-builder HTML is sanitized only by regex on the server-rendered path | `SafePageRenderer.tsx:111` | ~1 h |
| [B-28](#b-28) | Product image writes swallow quota errors and report success | `products/page.tsx:2543` | ⚡ 45 min |
| [B-29](#b-29) | Product filters, exports and dashboard charts operate on one page of data | `products`, `orders`, `analytics` | ~3 h |
| [B-30](#b-30) | `/me/media` is unpaginated and re-decodes every image on every request | `store.route.ts:579-760` | ~2 h |
| [B-31](#b-31) | RTL is structurally broken in the seller dashboard, and two large pages are untranslated | `hub/dashboard/layout.tsx` | ~4 h |
| [B-32](#b-32) | Simulated numbers presented as analytics | `IntelligenceTab.tsx`, `analytics.service` | ~3 h |
| [B-33](#b-33) | Migration hygiene: 12 duplicate prefixes, one placeholder, 70 missing rollbacks | `migrations/sql/` | ~2 h |

---

#### B-06 · Suspending a buyer doesn't revoke their sessions (duplicate route shadowing)
**Severity:** P1, security-relevant · **Files:** `backend/src/api/admin/reports.routes.ts:185, 208` and `backend/src/api/admin/vendors.routes.ts:164, 187`

`PUT /admin/buyers/:id/suspend` and `/reactivate` are each declared **twice**. `admin.route.ts` mounts `reportsRoutes` at line 40 and `vendorsRoutes` at line 42, so Express always resolves to the reports version — which does **not** call `authService.logout()`, while the vendors version does (`vendors.routes.ts:177`).

The Buyers Directory (`(admin)/buyers/page.tsx:169`) therefore suspends an account whose access token keeps working until it expires.

**How to fix**
1. Delete the duplicate pair from `reports.routes.ts:183-225`; keep the `vendors.routes.ts` version.
2. Add a startup route-manifest assertion that fails on duplicate `method + path` registrations (the E15 split verified 225/225 route *count* parity, which is exactly the check that misses shadowing).

---

### Tier 1 — high

---

#### B-07 · `SELECT DISTINCT` over a `json` column — live 500 on the bundle cross-sell widget
**Severity:** P1, live · **File:** `backend/src/services/product.service.ts:2276-2287`

```sql
SELECT DISTINCT p.id, ..., p.tags, p.attributes, p.metadata, ...,
       COALESCE(img.images, '[]'::json) AS images
```
Postgres cannot compare `json` for equality. Live probe:
```
GET /api/pd/products/by-product/pd_prod_ZuQyAJ6CBfQTW5rZ/bundles?store_id=... → 500
```
`pd_system_log` has **173 occurrences** of `could not identify an equality operator for type json`, 21 in the last 72 h, most recent 2026-08-26 17:12. Consumer: `components/product/BundleCrossPromotionWidget.tsx:47`.

**How to fix:** drop `DISTINCT` and de-duplicate with `GROUP BY p.id` (the LATERAL join is already 1:1), or cast the aggregate to `jsonb`. Add a smoke test that hits this route for a product that participates in a bundle.

---

#### B-08 · JSON-LD injection on the hub homepage
**Severity:** P1 · **File:** `frontend/src/app/hub/page.tsx:333-375`

Both schemas are injected via `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`. `JSON.stringify` does not escape `<`, `>`, or `/`, so a vendor-controlled `product.title` (fed from `/marketplace/feed` at `:353-358`) containing `</script><script>…` breaks out and executes. `marketplace_name`/`tagline` in the organization schema have the same path, and `marketplace_primary_color` is interpolated raw into a `<style>` block at `:371-375`.

**How to fix:** one shared `<JsonLd data={...}/>` component that does `JSON.stringify(d).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')`, and validate the colour setting server-side against `/^#[0-9a-fA-F]{3,8}$/`.

---

#### B-09 · Transient backend failures become permanent 404s
**Severity:** P1 (SEO + UX) · **Files:** `frontend/src/app/hub/products/[id]/page.tsx:107-109, 224`; `hub/pages/[slug]/page.tsx:28-30, 79-82`; `hub/category/[slug]/page.tsx:189-193, 258-286`

The fetch `catch` returns `null`, then the page calls `notFound()`. A backend timeout renders a 404 that crawlers de-index. The category route is worse: a null result renders a styled "Catégorie introuvable" page with **HTTP 200** and no `robots: {index:false}`, and `generateMetadata` builds the title from the slug (`:201-202`) so a nonexistent category still emits an indexable, plausible page.

**How to fix:** return a discriminated result (`{status:'ok'|'missing'|'error'}`); `throw` on `error` so `error.tsx` renders a 500 with retry; `notFound()` only when upstream actually returned 404; add `robots:{index:false}` on the not-found metadata branch.

---

#### B-10 · Checkout success page asserts payment success from a query parameter
**Severity:** P1 · **File:** `frontend/src/app/hub/checkout/success/page.tsx:15, 26-48`

Reads `order_id` from the query string and unconditionally renders **"Payment Successful!"**. Live probe: `https://www.garbage.team/hub/checkout/success?order_id=FAKE123` → **200**, renders success. A redirect back from Flouci/Konnect after a *failed* or *pending* payment lands here and tells the buyer they paid. `orderId` is not null-checked. The "View Order Status" button (`:46-48`) is a `<button>` with **no `onClick`** — a dead primary CTA.

Note this is not hypothetical given the data: 12 of 15 live orders are `payment_required`/`pending`.

**How to fix:** fetch the order and branch on `payment_status` (`captured` / `pending` / `failed`), each with distinct copy; make the CTA a `<Link href="/hub/orders">`; add `robots:{index:false}`; wire the strings through i18n.

---

#### B-11 · Cart totals and the coupon catalogue are implemented four times
**Severity:** P1 · **Files:** `frontend/src/contexts/CartContext.tsx:65-97, 181-206`; `frontend/src/app/hub/cart/page.tsx:35, 91-93`; `frontend/src/app/store/[storeHost]/cart/page.tsx:20, 93`; `backend/src/services/cart.service.ts:104-165`; `backend/src/services/checkout-quote.service.ts:473-543`

The same five hardcoded literals (`CHANCE5DT`, `LIVRAISON_ZERO`, `PANDA10`, `SUPER15` with its 80 DT threshold, `FIDELITE5`) plus the combined-shipping rebate `(storeCount-1) * 3.000` and a hardcoded `SHIPPING_PER_VENDOR = 7` are duplicated across the client context, the hub cart page, the storefront cart page, and two backend services. Checkout uses the authoritative quote; the cart pages do not. They will disagree for any store not on 7 TND flat shipping.

The authoritative implementation already exists (`POST /api/pd/cart/quote`, `useCheckoutQuote`).

**How to fix**
1. Drive the cart summary from `POST /api/pd/cart/quote` (address omitted) via the same hook; delete `recalculateDiscounts`, the local coupon table, and `SHIPPING_PER_VENDOR` from both cart pages and `CartContext`.
2. Make `applyCoupon` a thin server call returning the server's discount and message.
3. Delete the coupon block from `cart.service.ts:113-165` — `checkout-quote.service.ts` is the single source of truth.
4. Then replace the literals with a real `pd_coupon` table (see M-04).

---

#### B-12 · Seller onboarding: three of seven steps cannot be completed
**Severity:** P1 · **File:** `frontend/src/app/hub/dashboard/onboarding/page.tsx`

| Step | Defect |
| --- | --- |
| Branding (logo) | `:881, 923` call `handleFileUpload(file, 'store_logo')`; `presignUploadSchema.purpose` (`backend/src/validators/index.ts:337-350`) is a closed enum with no `store_logo` → **every logo upload 400s** and shows "Failed to upload logo image". |
| Payments & Shipping | `:439-443` PUTs `/stores/me/shipping` with `{ shipping_flat_fee }`; `updateShippingSchema` (`store.route.ts:98-100`) is `z.object({ shipping_mode: z.nativeEnum(ShippingMode) })` — `shipping_mode` is **required** and `shipping_flat_fee` is stripped. Step 6 can never complete. |
| Publish Storefront | `:648, 1302-1309` compare `store?.status === 'published'`. `StoreStatus` (`packages/types/src/enums.ts:20-25`) is `unverified \| verified \| suspended \| maintenance`. The button always reads "🔴 Offline / Private" and always sends `enabled:false`, so a live store can never be taken offline from the wizard. |

Plus: **KYC is marked complete on submission, not approval** (`:335-343, 362-366` write `completed:true` when status is `pending`), and `layout.tsx:220` treats that flag as proof of verification while the same page's checklist (`:498`) requires `approved` — three different truths for one step. And steps are freely skippable (`:718-743` sets `currentStep` with no guard), so a seller can jump to step 7 and hit Publish with nothing configured.

**How to fix**
1. Logo: use `purpose: 'store_asset'` with `folder: 'branding'` (already supported at `files.route.ts:152-166`).
2. Shipping: save the flat fee via `PUT /me/settings` `{ settings: { shipping_flat_fee } }`; send `shipping_mode` only when the seller changes mode.
3. Publish: compare against `'verified'`, and derive the label from the response.
4. KYC: persist `completed` only on `approved`; store `submitted_at` in metadata for wizard resume.
5. Gate step navigation on `getResumeStep`.
6. Extract one shared `computeLaunchProgress(store, onboardingState)` helper — there are currently three formulas (`layout.tsx:241`, `dashboard/page.tsx:293-324`, `onboarding/page.tsx:502`) producing different percentages on the same screen.

---

#### B-13 · Feature gating exists in the backend but not in the UI
**Severity:** P1 · Free/Starter users get raw 403s on buttons the UI happily renders.

| Feature | Backend gate | UI gate |
| --- | --- | --- |
| AI SEO / compression | `ai.route.ts:403-418` `assertAiFeature`, applied at 10 call sites | **none** in `ai/AiToolsStudio.tsx`; **none** on the 8 AI buttons in `products/page.tsx` (`:2840, 1254, 1304, 1462, 1507, 1549, 1602, 1670, 2196`) |
| Custom domain | `domain-verification.service.ts:45` on `POST /me/domains` | `online-store/domains/page.tsx:44` uses the **ungated** `PUT /me/domain` — gate bypassed entirely (see B-03) |
| Premium themes | `store.service.ts:782-796` 403 "Theme purchase required" | `online-store/themes/page.tsx:75` renders all themes clickable with no lock (the settings Theme tab does it correctly at `settings/page.tsx:1404-1452`) |
| API keys / webhooks | **none** — `vendor.route.ts:174, 194, 235` only `requireAuth + requireStore`, and `PLAN_DEFAULTS` has no `has_api_access` flag | none — buttons always shown, docs say Agency+ |
| Direct payment | `payment-config/page.tsx:139-159` wall ✅ | correct, but `dashboard/page.tsx:318-323` adds a launch-readiness step pointing at it, so non-Pro sellers are stuck at 80% forever |

**How to fix:** fetch `/api/pd/subscriptions/current` once in `hub/dashboard/layout.tsx`, put `limits` in context, and lock/badge each surface the way `page-builder/page.tsx:540-564` already does (that one is the reference implementation). Decide the API-keys policy: either add `has_api_access` to `pd_subscription_limits` + `PLAN_DEFAULTS` and assert it, or correct the doc.

---

#### B-14 · Commission rate is corrupted for any value ≤ 1 %
**Severity:** P1, financial · **File:** `backend/src/api/admin/stats.routes.ts:104-107, 158-161`

```ts
const commissionRate = Number(req.body.commission_rate) > 1
  ? Number(req.body.commission_rate) / 100
  : Number(req.body.commission_rate);
```
The UI sends percent (`plans/page.tsx:641`, a `%` field, min 0 max 100). `15` → `0.15` ✅. `1` → stored `1` = **100 %**. `0.5` → stored `0.5` = **50 %**. The read path confirms the ambiguity: `normalizePlan` (`plans/page.tsx:137`) does `commission <= 1 ? commission * 100 : commission`.

**How to fix:** make the wire format explicitly percent; divide by 100 unconditionally on write, multiply by 100 unconditionally on read; add a boundary test at 0 / 0.5 / 1 / 1.5 / 15 / 100.

---

#### B-15 · Buyers and sellers are shown placeholder bank details
**Severity:** P1, customer-facing · **Verified by diffing defaults against section keys**

Four config keys belong to **no settings section**, so no admin screen can save them, and they are frozen at their development defaults:

| Key | Frozen value | Served to users by |
| --- | --- | --- |
| `mandat_bank_name` | `'STB (Société Tunisienne de Banque)'` | `subscription.route.ts:54`, `ads.route.ts:104` |
| `mandat_bank_rib` | `'10 000 0000000000000 00'` | `subscription.route.ts:55`, `ads.route.ts:105`, `subscription-payment.service.ts:1075` |
| `mandat_bank_iban` | `'TN59 1000 0000 0000 0000 0000'` | `subscription.route.ts:56`, `ads.route.ts:106` |
| `mandat_recipient_phone` | `'+216 71 000 000'` | `subscription.route.ts:57`, `ads.route.ts:107` |

These are the payment instructions shown to anyone paying by Mandat Minute. (`ads_prohibited_terms` is also orphaned but harmless.)

**How to fix:** add the four keys to the `finance` section in `PLATFORM_SETTING_SECTION_KEYS`, add them to `financeSettingsSchema`, and render them in `(admin)/settings/page.tsx` next to the existing `mandat_recipient_*` fields (~`:5624`).

---

#### B-16 · Thirteen image-size settings render inputs that are never submitted
**Severity:** P1 · **Verified by comparing the two key lists**

`(admin)/settings/page.tsx:5703-5754` renders 13 controls for `image_size_{thumbnail,small,medium,large}_{w,h,crop}` and `image_quality_webp`. The backend `operations` section accepts all 13. The frontend `SETTINGS_TAB_KEYS.operations` array contains **none** of them (I diffed both: backend 36 keys, frontend 23, the 13 missing are exactly the image keys). `handleSave` builds its payload via `pickChangedSettings(..., SETTINGS_TAB_KEYS[section])` (`:2585`), so edits are dropped and the Save button never even enables. The page then tells the operator the changes "only affect future uploads" — implying they were saved.

**How to fix:** add the 13 keys to `SETTINGS_TAB_KEYS.operations`, and to `NUMBER_SETTING_KEYS`/`TEXT_SETTING_KEYS` so `buildSettingsPayload` normalises them. Add a test asserting `SETTINGS_TAB_KEYS[s] ⊇ backend section keys[s]` for every section — this is a whole class of dead-control bugs.

---

#### B-17 · Phone/SMS verification is inert, and the OTP is written to the log
**Severity:** P1 · **Verified against live Render env**

Render has `PD_SMS_PROVIDER = whatsapp_gateway`, plus `PD_WHATSAPP_GATEWAY_URL` and `PD_WHATSAPP_GATEWAY_TOKEN`. But:
- `backend/src/services/sms.service.ts:73` — `type SmsProvider = 'twilio' | 'infobip' | 'console'`. `whatsapp_gateway` is not a member, so `configuredSmsProvider` (`:75-79`) falls through to `config.sms.provider`, which is the raw string, which hits `default:` in `dispatchSms` (`:194-199`).
- That branch does `logger.info({ to, message }, '[SMS DEV] Would send SMS')` and `return false`. The OTP and the phone number go into the production log stream. Nothing is sent, and no error is raised.
- I grepped the entire repo: **`PD_WHATSAPP_GATEWAY_URL` and `PD_WHATSAPP_GATEWAY_TOKEN` are read by zero lines of code.**

Compare `email.worker.ts:618-644`, which correctly refuses to report success for an undelivered production email. SMS needs the same honesty.

**How to fix**
1. Implement the `whatsapp_gateway` provider in `sms.service.ts` (POST to `PD_WHATSAPP_GATEWAY_URL` with the bearer token), add it to the `SmsProvider` union and to `config.sms`, and add the two env vars to `config.ts`.
2. Remove `message` from the console-branch log; log only a masked recipient.
3. Throw in production when the provider resolves to `console`.
4. Wire the seller KYC phone step to `/verification/phone/send-otp` + `/verify-otp` (`verification.route.ts:51-81`) — those endpoints exist and are currently unreachable from any UI (`kyc/page.tsx:378-391` only collects the number).

---

#### B-18 · Withdrawals: a read-only ledger presented as an approval queue, and no payout idempotency
**Severity:** P1, financial · **Files:** `frontend/src/app/(admin)/withdrawals/page.tsx`, `backend/src/api/admin/withdrawals.routes.ts`, `backend/src/services/wallet.service.ts:187-240`

The page is titled "Withdrawal Queue" with a `{total} withdrawals` badge, but renders only historical `pd_wallet_transaction` rows of `type='payout'` and has no approve/reject/pay control. The backend exposes only `GET /withdrawals`, `POST /wallets/release-due`, `POST /wallets/sync-retention` — **there is no admin payout approval endpoint anywhere**. Payouts happen only via vendor self-service (`wallet.route.ts:49`) or the BullMQ worker behind `PD_PAYOUTS_AUTO_ENABLED` (unset on Render).

`walletService.withdraw` takes `FOR UPDATE` on the wallet and re-checks balance, so concurrent double-submit cannot overdraw — but a **retried HTTP request produces two legitimate debits**. There is no idempotency key and no unique constraint on `pd_wallet_transaction` for payouts. Contrast the ads ledger, which does this correctly.

Live DB shows the ledger is currently consistent (`balance 4875.000` == `sum(amount) 4875.000` for the one funded wallet), and 4 payouts totalling 680 TND were all vendor-initiated. But one of them has `description: 'pk_350'` — a debug string in a financial record.

Also: `POST /admin/wallets/sync-retention` (`withdrawals.routes.ts:93-110`) runs `UPDATE pd_vendor_wallet SET retention_days = $1 WHERE retention_days <> $1` across **every wallet**, with no zod, no confirmation, no dry run, and no UI (grep for `sync-retention` in `frontend/src` → nothing). Live data shows it has run: 6 of 7 wallets sit at `retention_days = 2`, contradicting the documented 7/14 day policy (business-model §3.2).

**How to fix**
1. Rename the page "Payout Ledger" until an approval flow exists.
2. Add `idempotency_key` to the withdraw payload and a unique index on `pd_wallet_transaction(idempotency_key) WHERE idempotency_key IS NOT NULL`.
3. Give `sync-retention` a `requireSuperAdmin` guard, a `{ confirm: 'SYNC RETENTION', dry_run?: boolean }` body, and a response listing affected wallet IDs.
4. Build the real request→approve→pay state machine (M-05).

---

#### B-19 · Refunds are recorded but never executed
**Severity:** P1, financial · **File:** `backend/src/services/order.service.ts:1831-1912`

`requestStoreRefund` validates the amount against the remaining refundable total and inserts a `pd_store_order_refund` row with `status='requested'`. That is all it does. Grepping the codebase: no gateway refund call, no wallet debit, no commission reversal, no inventory restore, no admin approval endpoint. `pd_store_order_refund` is read by three analytics queries and nothing else.

**How to fix:** design the refund lifecycle explicitly — `requested → approved → processing → processed|failed`; on approval call the provider's refund API, debit `pd_vendor_wallet` (pending first, then available, with a negative ledger row), reverse the proportional commission, optionally restock, and emit `ORDER_REFUNDED` for webhooks. Idempotency key per refund row.

---

#### B-20 · Public unauthenticated `/metrics` and `/internal/tls-allowed`
**Severity:** P1 · **Verified live**

- `GET https://pandamarket-backend-fjom.onrender.com/metrics` → **200, 106 KB**. Mounted at `main.ts:149`, before rate limiting and any auth. Exposes the full route inventory, per-route latency and error distributions, and business counters (registrations, orders, payments by gateway).
- `GET /api/pd/internal/tls-allowed?domain=…` → 404 for an unregistered domain, 200 + `store_id` for a registered one. Documented "not exposed to the public" (`internal.route.ts:2`) but mounted on the public `apiRouter` (`main.ts:323`) with no auth. Domain enumeration oracle + 2 DB queries per request.

Additionally `utils/metrics.ts:49-94`: `normaliseRoute` doesn't collapse slugs, hostnames, or arbitrary 404 paths, and each new `{method, route, status}` triple is appended to an **array searched with `Array.find` + `JSON.stringify` on every request**. A crawler inflates heap and per-request CPU without bound.

**How to fix:** bind `/metrics` to a private port or gate it behind a bearer token / IP allowlist; add an internal-secret header (`timingSafeEqual`) to `internal.route.ts` and drop `store_id` from the response; switch the metrics registry to a `Map` and hard-cap distinct label sets.

---

#### B-21 · Sentry ships request bodies; Postgres TLS is unvalidated
**Severity:** P1 · **Files:** `backend/src/utils/sentry.ts:56-63`, `backend/src/db/pool.ts:18`

- `beforeSend` deletes three headers and returns. The v7 `Handlers.requestHandler` attaches request context including body, query and cookies. A 500 on `/auth/login`, `/auth/reset-password`, or the SMTP-config endpoint ships the plaintext password/token/API key to Sentry. `sendDefaultPii: false` does not cover payloads. `PD_SENTRY_DSN` is set on Render, so this is live.
- `pool.ts:18` sets `ssl: { rejectUnauthorized: false }` in production. The Supabase connection is MITM-able by anyone on the network path.

**How to fix:** `Handlers.requestHandler({ request: ['method','url','query_string'] })`, and in `beforeSend` delete `event.request.data` / `event.request.cookies` (or run them through `redactBody` from `audit-log.middleware.ts`, which is already good). For the DB, ship the Supabase CA and set `rejectUnauthorized: true`.

Also `sentry.ts:47-55`: `ignoreErrors: ['PdValidationError', …]` matches against message/type, not exception class name, so those entries never match — 4xx filtering happens accidentally in `middlewares/index.ts:398-410`.

---

#### B-22 · Outbox worker: non-atomic claim, per-instance duplication, no lease recovery
**Severity:** P1 (latent — 0 rows in prod today) · **File:** `backend/src/workers/outbox.worker.ts:33-67, 137-155`

- The claim is `SELECT … WHERE status='pending'` (no `FOR UPDATE SKIP LOCKED`) followed by `UPDATE … SET status='processing'` (no `AND status='pending'` guard). N instances all "claim" the same row; `isProcessing` is process-local. Every event would be processed N times.
- A process dying between claim and completion leaves the row `processing` **forever** — the poller only selects `pending`. No lease, no reaper.
- `revalidateStorefrontHosts` (`:137-155`) never checks `res.ok` and logs failures at `debug`, then marks the event `completed`. A 401 from `/api/storefront/revalidate` leaves storefronts serving stale content while the outbox reports success.
- `failed` is terminal with no DLQ, alert, or admin surface.
- `outbox.service.ts:84-89` assigns revisions via `SELECT COALESCE(MAX(revision),0)+1` outside any lock — concurrent publishes collide, so the ordering guarantee is nominal.

Only one caller enqueues anything (`store.service.ts:901`), which is why the table is empty. It becomes load-bearing the moment B-02 is fixed properly.

**How to fix**
```sql
UPDATE pd_outbox_event SET status='processing', attempts=attempts+1, claimed_at=NOW()
WHERE id = ANY (SELECT id FROM pd_outbox_event
                WHERE status='pending' AND next_attempt_at <= NOW()
                ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED)
RETURNING *;
```
Add `claimed_at`, requeue `processing` rows older than the lease, throw on non-2xx revalidation, parameterise the backoff interval (`:122` string-interpolates it), add a `pd_outbox_dead_letter` view + alert on `failed > 0` and pending-age.

---

#### B-23 · Ads: click-fraud controls are client-optional and the IP detector self-destructs
**Severity:** P1 · **File:** `backend/src/services/ads.service.ts:644-720`, `backend/src/api/ads.route.ts:26-39`

- **Frequency cap and session dedupe are inside `if (input.sessionHash)`** (`:674-686`), and `session_hash` is an *optional request field*. Omit it and every POST with a fresh `event_key` is charged.
- **`event_key` is supplied by the client** (`ads.route.ts:26`) and is the sole idempotency anchor (`:665`, charge key `event:${eventKey}` at `:719`). An attacker can pre-claim keys to suppress a competitor's accounting, or mint fresh ones to force charges.
- **`ipHash` derives from `req.ip`**, which behind Render's proxy with `trust proxy: 1` resolves to an internal `10.x` hop — the codebase documents this exact behaviour at `middlewares/index.ts:309-313`. So the 6-clicks/minute detector (`:651-663`) measures **platform-wide** click volume, trips almost immediately, and inserts that single shared hash into `pd_ads_blocked_ip` — after which `:648` blocks **all ad events for every visitor, permanently**, with no expiry.
- **Zero-cost campaigns deliver forever**: `bid_amount: z.number().min(0)` allows 0, and CPM cost is `roundTnd(bid/1000)` = `0.000` for any bid under 0.0005; with cost 0 the charge block is skipped, `spent_amount` never grows, and the campaign never exhausts.
- **Self-click detection depends on the advertiser being logged in** (`viewerStoreId` from `optionalAuth`).

**How to fix:** derive the session identifier server-side (bind it into the delivery token at `:640`) and apply the cap unconditionally; derive `event_key` as `HMAC(delivery_token_id, session, event_type, time_bucket)`; use the validated client-IP resolution from `clientBucketKey`; make blocklist entries time-bounded with an alert; enforce `bid_amount >= ads_min_bid` and accumulate sub-millime spend instead of rounding to zero.

---

#### B-24 · The ads lifecycle sweep has written 60,337 pointless ledger rows (21 MB)
**Severity:** P1 (cost + latency) · **File:** `backend/src/services/ads.service.ts:773-825`, `backend/src/main.ts:468-484` · **Verified in production**

```
pd_ads_transaction: 60,368 rows, 21 MB
  reservation:          30,169
  reservation_release:  30,168
  campaign_debit:            27   ← the only real economic activity
  promotional_credit:         3
  admin_adjustment:           1
net effect of all reservation churn: -7.038 TND
~580 rows/day, every day, forever
```

`setInterval` every 5 minutes in **every** web instance, no advisory lock. One transaction does `SELECT … FROM pd_ads_campaign WHERE reserved_amount > 0 FOR UPDATE` with **no LIMIT**, releases every campaign's funds, then re-reserves them — writing two ledger rows per campaign per cycle. Reserved funds transiently drop to zero, and `deliver` requires `reserved_amount > 0` (`:625`), so **delivery stalls during every sweep**. No `statement_timeout`, no `idle_in_transaction_session_timeout` (`db/pool.ts`).

`pd_ads_transaction` is now the second-largest table in a 101 MB database, behind only `pd_file_blobs`.

**How to fix:** move it to a BullMQ repeatable job with a stable `jobId` (matching the payout/subscription pattern), wrap in `pg_advisory_xact_lock`, batch with `LIMIT … FOR UPDATE SKIP LOCKED`, and **reconcile reservations incrementally** — only write a ledger row when the reserved amount actually changes. Then archive/purge the historical churn.

---

#### B-25 · Storefront catalog pages have no public-store gate
**Severity:** P1 · **Verified live** · **File:** `frontend/src/app/store/[storeHost]/products/page.tsx:172-177`

Only `status === 'suspended'` is rejected. The homepage (`page.tsx:315-347`), `pages/[slug]` (`:263-264`), cart and checkout all use the correct `isPublicStore()` check.

Live probe: `https://sarra-boutique.garbage.team/products` → **200**, `<title>Produits - Sarra Boutique | PandaMarket</title>`, full branding/header/footer/theme, no "unavailable" copy. That store is `status='unverified', is_verified=false`. Products come back empty (the API enforces verification) so it renders as a legitimate-looking empty shop.

Separately, `middleware.ts:351` skips the storefront-status fetch whenever `pb_preview` is present, so `?pb_preview=x` escapes the maintenance rewrite; the homepage catches the invalid token but `products/page.tsx` doesn't.

**How to fix:** reuse `isPublicStore(store)` in `products/page.tsx` and `products/[...segments]/page.tsx`, rendering `StorefrontMaintenancePage`/`notFound()` like the homepage; only skip the middleware status fetch when the preview token actually verifies.

---

#### B-26 · Storefront customers are logged out every 15 minutes
**Severity:** P1 · **Files:** `frontend/src/lib/api.ts:107-113`, `backend/src/api/storefront-auth.route.ts:144-157`

`fetchWithCsrf` retries 401s against `/api/pd/auth/refresh` (the **hub** endpoint). A storefront customer holds `pd_storefront_rt`, not `pd_rt`. Grepping `frontend/src` for `/storefront/auth/refresh`: **zero hits**. Every storefront customer is bounced to login 15 minutes after signing in, despite a valid 30-day refresh cookie.

Related storefront-auth defects:
- `storefront-auth.route.ts:74` returns the raw `verify_token` in the register response, and `StorefrontAuthPage.tsx:96-102` immediately self-verifies with it — **email ownership is never proven**.
- `login` (`storefront-auth.service.ts:222-260`) never checks `email_verified`, and has **no lockout or attempt tracking** (unlike `auth.service.ts:219-276`).
- Access tokens carry no `session_id`, so `resetPassword`/`revokeSession` revoke the refresh row while the 15-minute access token keeps working.
- `StorefrontAuthPage.tsx:25` accepts `//evil.example` as a `next` target (open redirect). `StorefrontRecoveryPage.tsx:23-26` already has the correct check.

**How to fix:** add scope detection to `fetchWithCsrf` (URL prefix `/api/pd/storefront/`) and refresh against the storefront endpoint; stop returning `verify_token`; enforce `email_verified` at login or at order creation; add `session_id` to storefront tokens and verify the session row in `requireStorefrontCustomer` (it already hits the DB); reuse `normalizeNext`.

---

#### B-27 · Page-builder HTML is sanitized only by regex on the server-rendered path
**Severity:** P1 · **Files:** `frontend/src/components/page-builder/SafePageRenderer.tsx:111-122, 372-387, 457`, `backend/src/services/page-builder.service.ts:166-187`

SSR markup uses `sanitizeHtmlInitial` (a chain of regexes); DOMPurify only runs in `useEffect` after hydration (`:410`). `isUnsafeUrl` strips whitespace and control characters but **does not decode HTML entities**, so `href="&#106;avascript:alert(1)"` survives the backend write path (identical logic) and the SSR path. The browser decodes it; a click before hydration executes.

**How to fix:** use `isomorphic-dompurify` on both sides with the same allow-list as `PURIFY_CONFIG`, and decode entities before URL-scheme checks. Then render the already-sanitized string.

---

#### B-28 · Product image writes swallow quota errors and report success
**Severity:** P1 · **File:** `frontend/src/app/hub/dashboard/products/page.tsx:2543-2583, 2717-2730`

`saveProductImage`, `saveGalleryImages` and `deleteRemovedGalleryImages` all `await fetchWithCsrf(...)` and **never check `res.ok`**. `POST /me/products/:id/images` enforces `assertCanAddImage` (`store.route.ts:544-554`), so a Free seller (`max_images_per_product: 2`) uploading 6 gallery images sees "Produit mis à jour avec succès" while images 3–6 are silently dropped.

**How to fix:** check each response, aggregate failures, surface the quota error, and pre-check `limits.max_images_per_product` in the gallery picker.

---

#### B-29 · Product filters, exports and dashboard charts operate on one page of data
**Severity:** P1 (wrong numbers shown to sellers)

| Location | Defect |
| --- | --- |
| `products/page.tsx:900-950, 1040-1052` | `type` and `category` filters applied **client-side** to the 20 rows the server returned; the pagination footer keeps reporting the unfiltered total (`:3310`). CSV "export all" (`:2256`) exports the current page. |
| `orders/page.tsx:1871-1874` | Order export hardcodes `limit:'100'` regardless of `meta.total` — silently truncates. |
| `financial/page.tsx:270-279, 218-233` | 90-day revenue bars derived client-side from `limit=100` orders while the KPI row uses the server `meta.summary` — two inconsistent numbers on one screen. |
| `dashboard/page.tsx:209, 139-158` | Pulls `limit=200` orders to rebuild a 30-day chart that `/api/pd/analytics/store?period=30` already returns. |
| `online-store/customers/page.tsx:28` | No `page` param → backend caps at 50; client-side search over those 50; no way to reach customer 51. |
| `wallet/page.tsx:413` | Disables "Next" on `transactions.length < 20`, ignoring the `meta` the endpoint returns. |

**How to fix:** push `type` and `category_id` into `productService.listByStore` (`product.service.ts:1397-1420`); add server-side export endpoints that stream the full filtered set; drive all charts from the analytics service; paginate customers and wallet transactions off `meta`.

---

#### B-30 · `/me/media` is unpaginated and re-decodes every image on every request
**Severity:** P1 · **File:** `backend/src/api/store.route.ts:579-760` (and the admin twin at `admin/smtp-config.routes.ts:114-203`)

`media/page.tsx:157-181` sends `limit=150`; the backend **ignores `limit` and `page` entirely**, selects every blob row **including `b.data`**, then runs `await sharp(row.data).metadata()` **inside the row loop** (`:672-680`), then unions product images and sorts in JS. Live DB: 547 blobs, 34 MB. At a few thousand assets this times out.

**How to fix:** paginate server-side; persist `width`/`height` at upload time (`image-variant.service.ts` already decodes then) instead of on read; never select `data` for a listing.

---

#### B-31 · RTL is structurally broken in the seller dashboard, and two large pages are untranslated
**Severity:** P1 · i18n catalogues are **perfect** — I verified EN/FR/AR at 3,046 keys each, zero missing, zero orphaned, zero empty values. The gap is entirely unwired UI.

- `hub/dashboard/layout.tsx:463` pins the sidebar `fixed … border-r` and the content `md:ml-64` (`:553`), mobile drawer `inset-y-0 left-0` (`:508`) — no `rtl:` variants, no logical properties. `LocaleContext.tsx:70` sets `dir='rtl'` for Arabic, so the sidebar sits left and overlaps a left-margined main area.
- `app/layout.tsx:142` hardcodes `<html lang="fr">` with no `dir`; direction is patched at runtime, so Arabic users get an LTR first paint plus layout shift.
- `products/page.tsx`: 15 `t()` calls against ~401 lines of hardcoded French.
- `onboarding/page.tsx`: `t` imported for `locale` only; every label, step name, coachmark and error is hardcoded English. `dashboardPages.onboarding` exists in the catalogues with 10 generic keys.
- 19 of 34 admin pages have no `t()` at all (`withdrawals`, `kyc`, `mandats`, `plans`, `dashboard`, `ads`, `ai-costs`, `marketplace-categories`, `platform-media`, all three audit-log pages, `smtp-config`, `cms`, `admin/support`); five more import `useLocale` for `dir` only.
- `fraud-radar/page.tsx` mixes French and English and hardcodes `.garbage.team` (`:265`).

**How to fix:** convert the dashboard shell to logical utilities (`ms-64`, `me-*`, `start-0`, `border-s`); resolve locale server-side and set `lang`/`dir` on `<html>` in the root layout; add the missing keys and wire them. Add an ESLint rule banning bare Latin/Arabic string literals in JSX text position for `app/**` to stop the bleed.

---

#### B-32 · Simulated numbers presented as analytics
**Severity:** P1 (operator trust) · **Files:**
- `frontend/src/components/admin/platform-analytics/IntelligenceTab.tsx:99-101` hardcodes `baselineMonthlyGmv = 145000`, `baselineMonthlySubRev = 18500`, `baselineTakeRate = 8.5` — the entire "What-If Revenue Simulator" is fiction unrelated to tenant data.
- `analytics.service.ts:4230-4240` — cohort retention is `Math.max(15, 100*0.75^idx)`, revenue `retained*45`, orders `retained*1.5`. Pure formula, labelled as cohort analysis.
- `admin/subscription-lifecycle.routes.ts:369-386` ships a 16-item `MOCK_CATALOG` of Tunisian products used whenever the DB returns < 6 rows (`:418, 446`).
- `admin/subscription-orders.routes.ts:617-624` hardcodes `systemSpeed = 98` and floors radar metrics with `Math.max(score, 10|20|15)` so the radar never shows a genuinely low value.
- `IntelligenceTab.tsx:156` alerts "Report generated and dispatched!" while `analytics.service.ts` returns `email_sent: false`.
- `online-store/integrations/page.tsx:485-513` **fabricates a three-event shipment timeline** ("Hub Tunis-Carthage", …) with `new Date()` offsets when the tracking API fails, and shows it as real tracking.
- `subscription/payment-method/page.tsx:34-47` is a `setTimeout(1200)` that collects a full PAN/expiry/CVV into React state, discards it, and reports success.
- `AiCostsDashboard.tsx:1018-1044` "Sandbox Test" is a hardcoded 900 ms `setTimeout` returning canned JSON.
- `fraud-radar/page.tsx:107` copies a "Magic Link" to the clipboard; `subscription-payment.service.ts:734-740` generates the token, logs it, and **never persists it** — grep for `magic_token` returns only those 3 lines.

**How to fix:** source the simulator baseline from `getGlobalOverview`; compute cohorts from real order/user data or remove the tab; gate `MOCK_CATALOG` behind an explicit `?demo=true`; remove the `Math.max` floors; branch on `email_sent`; show "tracking unavailable"; delete the fake card form and the magic-link button (or implement them).

---

#### B-33 · Migration hygiene: 12 duplicate prefixes, one placeholder, 70 missing rollbacks
**Severity:** P1 · **Verified on disk and against `pd_migrations` (99 applied = 99 files)**

```
025 025_pandamarket_ads.sql        | 025_store_order_notes.sql
026 026_ads_refill_intents.sql     | 026_page_builder_seo_navigation.sql
027 027_ads_conversion_recognition | 027_page_builder_draft_publish
028 028_ads_platform_config        | 028_page_builder_versions
029 029_ads_promotional_coupons    | 029_audit_log_action_text
032 032_ai_provider_configuration  | 032_platform_page_builder
046 046_ai_purposes_and_prompts | 046_complete_subcategory… | 046_seed_multilingual…
047 047_seed_comprehensive_aliexpress_taxonomy.sql (10 bytes: "-- skipped") | 047_update_category_classification_prompt
066 066_checkout_idempotency… | 066_store_menus_and_footers
067 067_create_storefront_customer_sessions… | 067_theme_referential_integrity
068 068_create_store_domains… | 068_storefront_digital_downloads
069 069_create_outbox_table | 069_storefront_mandat_receipts
```

`migrations/run.ts:79-105` warns but deliberately does not abort (correct choice for existing collisions). On a **fresh** database, alphabetical order decides, and `046_ai_purposes_and_prompts.sql` creating `pd_ai_prompt_templates` is exactly the table that 8 failed AI jobs report as missing (`relation "pd_ai_prompt_templates" does not exist`) — evidence the ordering has already bitten. 70 of 99 migrations have no `.down.sql`.

**How to fix:** renumber the 12 collisions with timestamp prefixes (the convention is already documented in `migrations/README.md`) and record the rename in `pd_migrations` in the same transaction; resolve or delete `047_seed_comprehensive_aliexpress_taxonomy.sql`; make the preflight **fail** on *new* collisions by pinning a baseline list of known-legacy duplicates; backfill `.down.sql` for at least the structural migrations.

