# 01 · Executive Summary

**Audit date:** 2026-08-27 · **Commit:** `703a14c` · [← Index](./00-README.md)

---

## Verdict

PandaMarket's commerce core is credible and in places genuinely well engineered. The defects are
not spread evenly — they cluster in five identifiable places, which makes them tractable rather
than overwhelming.

### What is genuinely good

| Area | Evidence |
| --- | --- |
| Checkout | `order.service.ts:374-878` — advisory-lock idempotency, deterministic `FOR UPDATE` ordering to avoid deadlocks, quote-version + payment-capability pinning, guarded atomic stock decrements, `FOR UPDATE SKIP LOCKED` license claiming, `ON CONFLICT` replay path |
| Payment capture | `payment.service.ts:908-1015` — amount + currency verified in minor units against a locked expectation, merchant-account match check, attempt+order captured in one transaction, duplicate/failed states recorded distinctly |
| Report authorization | `report.service.ts:510-703` — messages **and** attachments filtered by audience visibility, 404 not 403, both-party order validation. This is the reference model for the whole codebase |
| Crypto discipline | Every HMAC comparison uses `timingSafeEqual` with a length pre-check; all single-use tokens are `randomBytes(32)`+ stored as SHA-256 digests |
| Config fail-fast | `config.ts:197-238` refuses production boot on dev-default JWT/cookie/encryption secrets **and** on public sandbox payment credentials |
| Migration runner | `pg_advisory_lock` around the whole run; concurrent boots queue instead of half-migrating |
| i18n catalogues | EN/FR/AR at **3,046 keys each**, zero missing, zero orphaned, zero empty, with a parity regression test |
| Type safety | `tsc --noEmit` clean on the frontend; 421/422 unit tests passing |

Full list: [`11-WHAT-IS-SOLID.md`](./11-WHAT-IS-SOLID.md).

### Where the problems are

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CLUSTER 1 — EVENT FAN-OUT                                    SILENTLY DEAD    │
│ 7 core domain events subscribed, never emitted. No order-confirmation email,  │
│ no vendor new-order notification, no KYC result, no outgoing webhook for any  │
│ order event — ever, in production. Confirmed in code AND in live data.  [B-02]│
├──────────────────────────────────────────────────────────────────────────────┤
│ CLUSTER 2 — IDENTITY & TENANCY                            BOUNDARY OPEN       │
│ Storefront customer tokens are marketplace user tokens carrying the VENDOR's  │
│ store_id. Grants entry to the vendor's socket room and chat attachments.[B-01]│
│ Plus: a seller can self-verify any custom domain and get a TLS cert.   [B-03] │
├──────────────────────────────────────────────────────────────────────────────┤
│ CLUSTER 3 — MONEY, HALF-BUILT                             FINANCIALLY UNSAFE  │
│ Refunds recorded, never executed [B-19]. No withdrawal approval flow, no      │
│ payout idempotency [B-18]. Ads auto-refill credits balance with no payment    │
│ [B-04]. Commission corrupts at ≤1% [B-14]. 60,337 junk ledger rows [B-24].    │
├──────────────────────────────────────────────────────────────────────────────┤
│ CLUSTER 4 — GATES WITHOUT DOORS                              UX / TRUST       │
│ Backend enforces plan limits at 20+ call sites. The UI reflects almost none   │
│ of them, so users click buttons that always 403 [B-13]. Three onboarding      │
│ steps cannot be completed at all [B-12]. 13 admin settings inputs are never   │
│ submitted [B-16]. 4 config keys have no UI and serve placeholder bank         │
│ details to real buyers [B-15].                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ CLUSTER 5 — INFRASTRUCTURE UNSET                          SILENT DEGRADATION  │
│ SMTP unset → all email inert (fails loudly ✅). S3 unset → 34 MB of images in │
│ Postgres. SMS set to a provider value the code does not recognise → OTPs      │
│ written to the log and never sent, no error raised [B-17]. Meilisearch unset  │
│ — and the query path never calls it anyway [B-77].                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

Plus one immediate blocker outside all five clusters: **the backend does not compile** in your
current working tree ([B-00](./03-BUGS-P0-CRITICAL.md#b-00)).

---

## The six P0s

| # | Finding | Why it is P0 | Effort |
| --- | --- | --- | --- |
| [B-00](./03-BUGS-P0-CRITICAL.md#b-00) | `retentionRouter` mounted but never imported — `tsc` fails | Blocks CI and the Render deploy | ⚡ 5 min |
| [B-01](./03-BUGS-P0-CRITICAL.md#b-01) | Storefront tokens = marketplace tokens with the vendor's `store_id` | Storefront customer can join the vendor's socket room and read chat attachments across buyers | ~3 h |
| [B-02](./03-BUGS-P0-CRITICAL.md#b-02) | 7 domain events never emitted | Entire notification / email / webhook layer has never fired | ~4 h |
| [B-03](./03-BUGS-P0-CRITICAL.md#b-03) | Seller can self-verify any custom domain, then obtain TLS for it | Domain hijack + cert-issuance abuse | ~2 h |
| [B-04](./03-BUGS-P0-CRITICAL.md#b-04) | Ads auto-refill credits balance with no payment | Money creation (currently blocked only by an unrelated CHECK constraint, which instead breaks ad charging) | ⚡ 30 min |
| [B-05](./03-BUGS-P0-CRITICAL.md#b-05) | `PUT /admin/settings` bypasses the SuperAdmin finance/security guard | Any admin rotates live PayPal secrets and commission rate | ~1 h |

---

## Highest-impact non-P0 items

| Item | Why it matters | Effort |
| --- | --- | --- |
| [B-07](./04-BUGS-P1-HIGH.md#b-07) `SELECT DISTINCT` over `json` | **Live 500** on the bundle cross-sell widget. 173 occurrences in `pd_system_log`, 21 in the last 72 h | ⚡ 10 min |
| [B-10](./04-BUGS-P1-HIGH.md#b-10) Success page asserts payment success from a query param | `?order_id=FAKE123` → 200 "Payment Successful!". A failed-payment redirect tells the buyer they paid. 12 of 15 live orders are unpaid | ⚡ 45 min |
| [B-12](./04-BUGS-P1-HIGH.md#b-12) Onboarding: 3 of 7 steps impossible | Logo upload 400s on an enum mismatch; shipping step rejects its own payload; publish toggle compares a status that does not exist | ⚡⚡⚡ ~2 h |
| [B-15](./04-BUGS-P1-HIGH.md#b-15) 4 orphaned config keys | Buyers paying by Mandat Minute are shown **placeholder bank details** (`RIB 10 000 0000000000000 00`) | ⚡ 30 min |
| [B-16](./04-BUGS-P1-HIGH.md#b-16) 13 settings inputs never submitted | Operator edits image sizes, Save never enables, page implies success | ⚡ 20 min |
| [B-24](./04-BUGS-P1-HIGH.md#b-24) Ads lifecycle sweep | **60,337 pointless ledger rows, 21 MB**, ~580/day forever; stalls ad delivery on every cycle | ~3 h |
| [B-17](./04-BUGS-P1-HIGH.md#b-17) SMS provider mismatch | `PD_SMS_PROVIDER=whatsapp_gateway` is not in the code's union → OTP logged in plaintext, never sent, no error. The two WhatsApp env vars you set are read by **zero lines of code** | ~2 h |
| [B-11](./04-BUGS-P1-HIGH.md#b-11) Cart totals implemented 4× | Client, hub cart, storefront cart and two backend services each compute shipping and coupons independently. Cart and checkout will disagree | ~3 h |

---

## Live system snapshot (probed 2026-08-26/27)

| Check | Result |
| --- | --- |
| `GET /health` | `200 {"status":"ok"}` |
| `GET /ready` | `200 ready` — postgres **141 ms**, redis 44 ms, meilisearch `degraded`, s3 `degraded` |
| `GET /metrics` | **`200`, 106 KB, unauthenticated, public** ❌ [B-20] |
| `GET /api/pd/internal/tls-allowed?domain=…` | Reachable publicly, returns `store_id` ❌ [B-20] |
| `GET /api/pd/products/by-product/…/bundles` | **`500`** ❌ [B-07] |
| `GET /api/pd/marketplace/settings` | `200`, 10.8 KB ✅ |
| `GET /api/pd/search?q=shirt` | `200`, 5 KB ✅ (Postgres path — Meili never consulted) |
| `https://www.garbage.team/hub` | `200`, 530 KB ✅ |
| `/hub/products` | `307` → `/hub/search` ✅ |
| `/hub/pages/about` | **`404`** — 0 platform CMS pages exist |
| `/hub/checkout/success?order_id=FAKE123` | **`200`, renders "Payment Successful!"** ❌ [B-10] |
| `https://sarra-boutique.garbage.team/products` | **`200`** on an `unverified` store, full chrome ❌ [B-25] |
| `robots.txt` / `sitemap.xml` | `200` ✅ |

## Production database snapshot

```
121 pd_* tables · 99 migrations applied · 101 MB total · all tables have a PK ✅
RLS: 121/121 pd_* tables enabled with 0 policies (deny-by-default) ✅
     …but 5 admin_note* tables have RLS OFF (pattern missed them) ❌ [B-36]
Unindexed FKs: 7 remaining ❌ [B-35]  (prior audit claimed 203/203 — predicate was wrong)

13 users · 7 stores · 132 products (124 published) · 15 orders · 32 order items
Orders: 12 payment_required/pending · 2 fulfilled-but-UNPAID · 1 delivered/captured
5 of 15 orders span 2 stores (order splitting is exercised)

pd_outbox_event ............. 0 rows, ever          ← [B-22] latent, [B-02] root cause
pd_webhook_subscription ..... 0 rows                ← consequence of [B-02]
pd_notifications ............ 11 rows total, 0 of type order_placed / new_order
pd_support_ticket ........... 0 · pd_seller_broadcast 0 · pd_license_key 0
pd_platform_page ............ 0                     ← [M-12]
pd_gamified_lead ............ 0 (purged in prior audit)

pd_file_blobs ............... 547 rows / 34 MB      ← largest table [M-02]
pd_ads_transaction .......... 60,368 rows / 21 MB   ← 2nd largest
  reservation .............. 30,169  ┐
  reservation_release ...... 30,168  ├ 60,337 rows of pure churn, net effect −7.038 TND
  campaign_debit ...........     27  ┘ ← the only real economic activity   [B-24]
pd_audit_log ................ 3,779 rows / 5.4 MB   ← no retention job [M-17]
pd_refresh_tokens ........... 1,354 (1,281 expired) ← no retention job
pd_system_log ............... 733 rows, ALL level=error
pd_ai_jobs .................. 91 completed / 33 failed / 10 queued since May / 1 stuck [B-37]
```

**Top production errors** (`pd_system_log`):

| Count | Message | Finding |
| --- | --- | --- |
| 332 | `relation "pd_platform_page" does not exist` | fixed since (table now exists) |
| **173** | `could not identify an equality operator for type json` | **[B-07] — still occurring** |
| 139 | `column s.slug does not exist` | resolved |
| 23 | `column parent.name_fr does not exist` | resolved |
| 8 | `relation "pd_ai_prompt_templates" does not exist` | migration-ordering fallout [B-33] |
| 8 | `Unsupported state or unable to authenticate data` | AES key mismatch [B-51] |

---

## Build & test health

| Gate | Result |
| --- | --- |
| `tsc --noEmit -w backend` | **3 errors** ❌ [B-00] |
| `tsc -p frontend/tsconfig.json --noEmit` | **clean** ✅ |
| `vitest run` (frontend) | **421 passed / 1 failed** ❌ [B-90] |
| Backend tests | 85 test files (not executed — needs local Postgres+Redis, see [12](./12-VERIFICATION-GAPS.md)) |
| `node scripts/api-contract-audit.cjs` | **passes** ✅ (610 backend routes vs 394 frontend templates, 12-entry ignore list) |
| CI `.github/workflows/ci.yml` | Blocking on lint + type-check + frontend unit tests ✅ |
| CI `.github/workflows/e2e.yml` | `continue-on-error: true`, runs 4 of 15 specs ⚠️ |

---

## Recommended sequence

**Today.** [B-00] make it compile. Then the four other ⚡ P0-adjacent items: [B-90] failing test,
[B-06] duplicate route shadowing, [B-07] the live 500, [B-20] close `/metrics`.

**This week.** The remaining P0s — [B-01] token identity, [B-03] domain verification, [B-04] ads
auto-refill, [B-05] settings ACL. Then [B-02] event fan-out, because it silently disables the
largest amount of product surface. Then the ⚡ P1 cluster: [B-08] JSON-LD escaping, [B-10] success
page, [B-12a/b/c] onboarding, [B-15] mandat bank keys, [B-16] image settings, [B-14] commission
rounding.

**This month.** [B-22] outbox atomicity (do this **before** the worker split), [B-24] ads sweep,
[B-11] single source of truth for cart totals, [B-13] UI feature gating, [B-17] + [M-01] make email
and SMS actually deliver, [B-29] server-side filters and exports, [B-31] RTL and the two
untranslated pages, [M-04] real coupon system, [M-05] withdrawal approval, [M-06] refund execution.

**Backlog.** [E-01] make the outbox the only fan-out mechanism, then [M-11] split workers.
[M-02] migrate blobs to R2. [E-02] generate a typed API client. [E-03] split the three remaining
giant files.

Full ordered list with acceptance criteria: [`08-TODO-CHECKLIST.md`](./08-TODO-CHECKLIST.md).

---

## Two structural observations

**1. The in-process event bus is load-bearing and about to break.**
`eventBus` is a plain Node `EventEmitter`. Subscribers are registered in every instance
(`registerAllSubscribers()` in `main.ts:535`), and workers currently run in-process
(`PD_RUN_WORKERS_IN_PROCESS` defaults `true` and is unset on Render), so it *appears* to work. Two
things follow: (a) the seven missing emitters [B-02] are invisible because nothing else uses the
bus enough to notice, and (b) the moment workers move to their own service [M-11], every
cross-instance side effect silently disappears. The fix for both is the same — route domain events
through `pd_outbox_event` and let the outbox worker enqueue BullMQ jobs [E-01]. Do that *before*
the worker split, not after.

**2. Every "dead control" bug shares one root cause: two lists that must agree, and nothing checks.**
[B-15] (4 config keys in defaults but no section), [B-16] (13 keys in the backend section but not
the frontend tab list), [B-12a] (a `purpose` string not in the backend enum), [B-12b] (a field name
the schema strips), [B-74] (`email_transport` omitted so the backend defaults it and clobbers
Brevo) — all five are the same shape. Three cheap parity tests ([E-04], [E-05], [E-06]) would have
caught all of them plus [B-02] and [B-06]. That is the highest-value testing investment available.
