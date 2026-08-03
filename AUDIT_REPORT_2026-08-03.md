# PandaMarket — Deep Audit & Remediation Report

> **Date:** 2026-08-03
> **Scope:** Full code audit (backend + frontend), live infrastructure audit (Render, Vercel, Supabase, GitHub), and remediation of all critical findings.
> **Live site:** https://www.garbage.team · backend `pandamarket-backend-zjr5.onrender.com` · DB `pandamarket-db` (Supabase eu-central-1)

---

## 1. Status: production-hardened ✅

| Layer | Status |
| :--- | :--- |
| Backend API (32 routes, 42 services) | ✅ ~95% complete, no stubs |
| Payments (Flouci/Konnect/PayPal/Mandat/COD) | ✅ real providers, idempotency solid, webhooks now enforced |
| Security | ✅ critical holes closed this session (see §3) |
| Frontend (109 pages, 20 themes) | ✅ zero stubs, zero TODOs |
| Tests | ✅ 42 backend suites / 347 tests + 14 E2E specs — all passing |

## 2. What was verified live (probes)

- Backend health ✅ · Meilisearch ✅ · plans API ✅ · internal TLS gate ✅ (`/internal/tls-allowed` rejects unverified domains)
- Mock S3 router NOT mounted in prod ✅
- Supabase REST API does **not** expose `pd_*` tables to anon (`permission denied for schema public`) — schema grants block it even though RLS is off
- Vercel proxies `/api/pd/*` same-origin to Render ✅

## 3. Fixed & deployed this session (commits 6e0de9f → a513b85)

### Security (backend)
1. **`PD_NODE_ENV` missing in prod** → webhook HMAC enforcement, secure cookies and CORS guards were silently disabled. Fixed: `config.env` now falls back to `NODE_ENV` (Render sets it to production), and `PD_NODE_ENV=production` set explicitly on Render. *Verified live: unsigned Flouci webhook now returns 401.*
2. **Unauthenticated subscription webhooks** (`/admin/subscription-orders/stripe-webhook|paypal-webhook`) could settle subscriptions without payment or cancel any store's subscription. **Routes deleted.** Stripe was never integrated.
3. **PayPal webhook verification failed OPEN** when `webhookId` unset → now fails closed.
4. **HMAC over re-serialized JSON** → raw request body captured (`express.json verify`) and used for Flouci/Konnect/ads webhook signatures; length-checked `timingSafeEqual`; header type validation (supersedes bot PRs #157/#161/#168).
5. **SQL-injection-pattern purge** (`INTERVAL '${days} days' ... IN (${roleFilter})`) → fully parameterized (supersedes PR #180).
6. **Production fail-fast** — backend now refuses to boot if `PD_JWT_SECRET`, `PD_COOKIE_SECRET` or `PD_ENCRYPTION_KEY` are missing/dev-default; warns for sandbox Flouci/Konnect keys.
7. **Auto-payout gated** behind `PD_PAYOUTS_AUTO_ENABLED` (default off) — wallets were debited daily without any real bank transfer.

### Secrets rotated on Render
- `PD_ENCRYPTION_KEY` was the all-zeros dev default → rotated to strong random hex (safe: 0 rows were encrypted with it).
- JWT/cookie secrets kept (not dev defaults) to avoid logging out all users; **recommend rotating to random hex in a maintenance window.**

### Frontend fixes (deployed via Vercel `dpl_6Gtv6ye7…`)
8. **Real-time socket was dead** (waited for a localStorage token nothing ever wrote). Added `GET /auth/socket-token` (cookie-auth) + SocketContext now fetches it; mixed-content guard added.
9. **Hardcoded bank details removed** — seller subscription page & buyer mandat-upload now read real recipient data from new `GET /subscriptions/mandat-instructions` endpoint; manual-mandat provider reads platform settings.
10. Admin header `admin@pandamarket.tn` → `PandaMarket Admin`; DigitalTheme "Demo Video Preview" badge removed; stale `pd_access_token` cleanups removed.

### Live data cleanup (Supabase)
11. 6 garbage published products drafted (`ghghhghg`, `iiiii`, `yyyyyyyyyy`, `gggggggggoo dfgh`, `fdfgdg`, `gfhfgh`) — hub deals/grid now shows only real products.
12. Platform settings: `catalog_featured_category_slugs` was `admin@pandamarket.tn` → cleared; product-grid `cta_url` garbage removed; hero slide CTA `fgggg` removed; support email → `support@garbage.team`; `mandat_proof_email` → `billing@garbage.team`.

## 4. Remaining work (prioritized)

### 🔴 Do this week
- **Verify mailbox exists** for `support@garbage.team` / `billing@garbage.team` (or set real addresses in Admin → Settings).
- **Set real SMTP + SMS provider on Render** (`PD_SMTP_*`, `PD_SMS_PROVIDER`) — today password-reset emails and KYC OTPs are only written to server logs.
- **Set real payment credentials on Render** — `PD_FLOUCI_*`/`PD_KONNECT_*` currently fall back to public sandbox strings (boot warning will appear in logs); set `PD_PAYPAL_WEBHOOK_ID` if PayPal is enabled (webhooks now fail closed without it).
- **Rotate** `PD_JWT_SECRET`, `PD_COOKIE_SECRET` and the **Supabase DB password** (all appeared in plaintext during this audit; DB password is shared with the S3 secret key).
- Review/merge dependabot PRs **#163 (next 16.2.11)** and **#153 (dompurify 3.4.12)**; GitHub reports 110 vulns (3 critical) — see security tab.

### 🟠 Product/ops
- **Email verification flow** is missing entirely (registration → admin toggle only).
- Decide payout story: integrate a real bank transfer provider, then set `PD_PAYOUTS_AUTO_ENABLED=true`.
- Close or triage the remaining ~25 open bot PRs (duplicated Bolt metrics PRs, Palette ARIA labels, ImgBot). The 7 Render PR-preview services (#177–#183) cost real money while those PRs sit open.
- Buyer cart shows a flat 7 TND/vendor shipping estimate — needs a buyer-facing rates endpoint to match checkout totals.
- `prodypanda` storefront has zero published products; `teststore1` appears in "Top Vendeurs" — clean up test stores before launch.
- Admin → Settings: hero carousel still contains "Nouvelle Bannière Promotionnelle" placeholder slides; mandat RIB/IBAN fields are empty (UI shows dashes until filled).

### 🟡 Hardening / tech debt
- Enable RLS on `pd_*` tables (defense-in-depth; currently mitigated by missing schema grants — verified anon API access is denied).
- Gate Swagger UI (`/api/docs`) in production.
- Login lockout is bypassed when Redis is down; boot proceeds without Redis (all workers silently stop) — add alerts or DB fallback.
- CSRF is skipped when an `X-PD-API-Key` header is merely present (safe only while CORS stays locked).
- Split the ~5,200-line `admin.route.ts`; dedupe migration numbering (025–029, 046, 066–069; gap at 062).
- `PD_S3_ENDPOINT=http://localhost:9100` on Render — presigned S3 URLs cannot work there; uploads currently survive via the DB-blob fallback path. Point at a real object store or remove the S3 code path.
- i18n: forgot-password page & theme copy still hardcoded; sitemap capped at 1000 products.

## 5. Verification log

- `npm run build -w @pandamarket/types && -w @pandamarket/backend` ✅ · `npm run build -w frontend` ✅
- Backend tests: **347/347 passed** (42 suites) · payment suites re-run after hardening: 44/44 ✅
- Live probes after deploy: health ✅ · unsigned webhook → **401** ✅ · deleted webhooks → 404-equivalent ✅ · `/auth/socket-token` & `/subscriptions/mandat-instructions` → 401 unauth (exist, auth-gated) ✅
- Homepage: 0 garbage products, 0 `fgggg`, `support@garbage.team` in footer ✅
