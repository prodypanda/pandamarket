# 07 · Enhancements & New Ideas

[← Index](./00-README.md) · Prev: [06 Missing Work](./06-MISSING-WORK.md) · Next: [08 Checklist](./08-TODO-CHECKLIST.md)

**Scope:** Architectural upgrades, Tunisian market adaptations, product opportunities, and platform governance leverage. 35 proposals (E-01 through E-35).

## PART 3 — ENHANCEMENTS, IMPROVEMENTS AND NEW IDEAS

### Architecture and quality

| # | Idea | Why |
| --- | --- | --- |
| E-01 | **Outbox as the only fan-out mechanism.** Delete the in-process `eventBus` for anything with side effects; write to `pd_outbox_event` in the same transaction and let the worker enqueue BullMQ jobs. | Fixes B-02 permanently, survives the worker split, gives ordering + at-least-once + a visible retry/DLQ story. Highest-leverage change in the codebase. |
| E-02 | **Generate a typed API client from `/api/docs.json`** and replace the ~394 hand-written `fetch` call sites. | The contract audit (610 backend routes vs 394 frontend templates, with a 12-entry ignore list) exists precisely because the boundary is untyped. A generated client makes B-12-class bugs (wrong `purpose` enum, missing required field) compile-time errors. |
| E-03 | **Split the three remaining giants**: `analytics.service.ts` (4,676 lines), `hub/dashboard/products/page.tsx` (7,358), `(admin)/settings/page.tsx` (6,245). | The `admin.route.ts` split (E15) and page-builder dedup (E17) both landed cleanly; the same pattern applies. `products/page.tsx` in particular causes B-79's re-render problem. |
| E-04 | **Section-key parity test**: assert `SETTINGS_TAB_KEYS[s] ⊇ PLATFORM_SETTING_SECTION_KEYS[s]` and `defaults ⊆ ⋃sections`. | Would have caught B-15 and B-16 automatically. |
| E-05 | **Route-manifest test** asserting no duplicate `method + path` and no route without a guard on an allowlist. | Would have caught B-06 and the unguarded-mutation surface. |
| E-06 | **Event-wiring test**: every `eventBus.on` key must have ≥1 emitter. | Would have caught B-02. |
| E-07 | **Tenant-isolation invariant suite**: storefront token → socket handshake fails; storefront token → foreign `/files/access` 403; cross-store product in a quote rejected; cross-store order detail 404. | The one class of bug where a silent failure is a data breach. |
| E-08 | **Flip E2E to blocking** and extend from 4 to the full 15 specs; add specs for the flows that are currently broken (onboarding, refund, withdrawal, storefront customer session lifetime). | |
| E-09 | **Burn down the ~430 tracked lint warnings**, starting with `no-explicit-any` (351) in security-relevant files. The ledger in `frontend/eslint.config.mjs` is a good mechanism — use it. | |
| E-10 | **`idle_in_transaction_session_timeout` + `statement_timeout`** on the pool, and a slow-query metric from the counter `pool.ts:52` already computes. | B-24's unbounded `FOR UPDATE` sweep has no escape hatch today. |

### Product and UX

| # | Idea |
| --- | --- |
| E-11 | **Order detail as a real route** (`/hub/dashboard/orders/[id]`) with a shareable URL, deep-linkable from notifications, emails and the overview. Fixes M-08 and makes the 4,214-line list page tractable. |
| E-12 | **A single "Store Health" panel** replacing the three divergent launch-progress calculations: branding, theme, first product, KYC, payments, shipping, publish — each with the exact blocking reason and a direct link. Derived from one shared helper. |
| E-13 | **Vendor-facing quota dashboard**: products used / limit, images per product, AI tokens, page-builder pages, with an inline upgrade CTA. Every one of those limits is enforced server-side and invisible client-side today (B-13, B-28). |
| E-14 | **Buyer order timeline** — placed → paid → packed → shipped → delivered, with per-vendor sub-timelines for split orders (5 of 15 live orders span 2 stores). The data exists in `pd_fulfillment`; nothing renders it. |
| E-15 | **Abandoned-cart recovery.** `pd_cart` has 81 rows, an `is_abandoned` column, and `customer_email`/`customer_phone` — and 0 rows marked abandoned. A sweep + one email (or WhatsApp, given B-17's gateway) is the cheapest revenue in the codebase. |
| E-16 | **Back-in-stock notifications** — `back-in-stock.service.ts` and the subscribe/unsubscribe routes exist; the status getter is on the contract-audit ignore list and the UI is partial. Finish it. |
| E-17 | **Seller payout statement PDF** per period (gross, commission, refunds, net, withdrawals) — required for Tunisian bookkeeping and currently impossible to produce. |
| E-18 | **Buyer-facing invoice PDF** with the platform's and vendor's tax identity. Legally expected for physical goods in TN. |
| E-19 | **Storefront theme preview from the gallery** without applying — the preview token infrastructure (`signThemePreviewToken`, `/store/[host]/preview`) already exists; the gallery doesn't use it. |
| E-20 | **Coupon builder UI** for sellers (once M-04 lands) with usage analytics — redemptions, revenue attributed, average order value uplift. |
| E-21 | **WhatsApp as a first-class channel.** You already provisioned an Evolution API gateway (`PD_WHATSAPP_GATEWAY_URL`) that no code reads. In Tunisia WhatsApp beats SMS and email for order updates, OTP and abandoned carts. Implement it as a notification transport alongside email, not just for SMS.
| E-22 | **Product import from a WhatsApp/text dump** — `ai.route.ts:939` already contains a prompt designed for exactly this ("message WhatsApp de fournisseur"). Surface it as a first-class bulk-import flow; it's a genuine differentiator for the target market. |
| E-23 | **Category-aware AI tagging quality loop**: 124 of 132 products are AI-tagged, and 33 AI jobs failed with provider errors. Add a per-purpose success-rate dashboard and automatic provider demotion on sustained failure (the multi-tier fallback exists; the feedback loop doesn't). |
| E-24 | **Seller trust score surfaced to buyers** — `seller-trust.service.ts` computes one; the storefront and hub don't show it. Verified badge + fulfilment speed + response time is what makes a marketplace feel safe. |
| E-25 | **Guest checkout with post-purchase account claim.** Currently `orderService.checkout` requires either `customer_id` or `storefront_customer_id` (`order.service.ts:675-677`). For the Tunisian market, forcing registration before purchase costs conversions. |
| E-26 | **COD confirmation via OTP before dispatch** — `getOrCreateCodVerification`, `sendCodOtp`, `verifyCodOtp` and a risk scorer (`order.service.ts:2145-2334`) all exist and are well built. Wire them into the seller's dispatch flow as a gate. 6 of 15 live orders are COD; COD fraud is the #1 margin killer in TN e-commerce. |
| E-27 | **Multi-vendor shipping consolidation display** — the rebate logic exists in four places (B-11); show the buyer *why* shipping dropped, per vendor. Converts a hidden discount into a visible reason to add another vendor's item. |

### Platform and governance

| # | Idea |
| --- | --- |
| E-28 | **Settings provenance metadata** — for each of the 260 config keys record section, type, validation, default, and *which code paths read it*. Generate it from source. B-15's four orphaned keys were invisible for months. |
| E-29 | **Config change history** (`pd_platform_config_history`: key, old value, new value, actor, at) written in the same transaction as the update. Today a finance-setting change records only a key list. |
| E-30 | **Audit read access to sensitive resources** — KYC document views, buyer PII lists, security-activity dumps. `audit-log.middleware.ts:82` skips all GETs, so an admin browsing identity documents leaves no trace. |
| E-31 | **Impersonation with a full audit trail** instead of the current "log in as admin and poke the DB" pattern implied by the raw-SQL admin mutations (B-59, and the 10 `UPDATE pd_user` sites that bypass any service layer). |
| E-32 | **Fraud radar on real signals** — the page exists but the magic-link is dead and the radar floors its own metrics (B-32). Feed it the signals you actually have: COD risk scores, `pd_ads_blocked_ip`, refund rate, chargeback proxies, login-event anomalies from the 1,107 rows in `pd_user_login_event`. |
| E-33 | **Per-plan feature matrix as data, not code** — drive the UI gating, the pricing page, and the backend asserts from `pd_subscription_limits` alone. Right now `PLAN_DEFAULTS` (code), the DB, and `business-model.md` disagree (M-16), and the UI hardcodes its own assumptions. |
| E-34 | **Status page / uptime surface** for sellers, fed by `/ready`. Cheap trust signal, and it makes the "meilisearch/s3 degraded" state honest rather than hidden. |
| E-35 | **Cost dashboard**: DB size (101 MB, 45 % of it blobs and ads churn), Redis usage, AI spend per provider (`ai-costs` has the data), Render/Vercel bandwidth. You're about to have three cost curves that grow independently. |

---
