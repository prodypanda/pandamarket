# 02 — High-Priority Bugs (P1)

> Ordered roughly by user/money impact. Each: evidence → fix steps. ⚡ = quick win.

---

## [P1-1] Frontend Docker build is broken (standalone output never produced)
- **Status:** ☐ open
- **Evidence:** `frontend/Dockerfile:37` copies `.next/standalone`; `:48` runs `node frontend/server.js`; but `frontend/next.config.ts` never sets `output: 'standalone'`, so the folder is never generated.
- **Fix:** If Docker path matters → add `output: 'standalone'` to `next.config.ts` and verify `docker build` end-to-end. If not needed (Vercel is the deploy target) → delete/retire the Dockerfile to remove a trap. Note `backend/Dockerfile:40` also has invalid syntax (`COPY ... 2>/dev/null || true`) — fix or drop similarly.

## [P1-2] Socket.IO dead for users who log in after page load
- **Status:** ☐ open
- **Evidence:** `frontend/src/context/SocketContext.tsx:43-60` — socket token fetched once on mount; exported `setToken` (:106-112) never called by anyone; no re-fetch on token expiry.
- **Fix steps:**
  1. On login success (and on 401-refresh in `fetchWithCsrf`), call `setToken(await fetch('/api/pd/auth/socket-token'))`.
  2. On socket `connect_error` with auth error → re-fetch token once, then reconnect.
  3. On logout → disconnect + clear token.

## [P1-3] `useSocket.on` silently no-ops when called before connection exists
- **Status:** ☐ open
- **Evidence:** `frontend/src/hooks/useSocket.ts:138-151` reads `socketRef.current` once; if null at call time, returns permanent no-op unsubscribe.
- **Fix:** Buffer subscriptions: keep pending `[event, handler][]` array; flush inside `on('connect')`. Unsubscribe must work pre-connect too.

## [P1-4] Client-side hardcoded coupon engine
- **Status:** ☐ open
- **Evidence:** `frontend/src/context/CartContext.tsx:81-94,181-206` — codes `CHANCE5DT/PANDA10/SUPER15/FIDELITE5/LIVRAISON_ZERO` validated+discounted purely in browser; codes public via settings API (`rewards_widget_prizes_json`). Server quote mitigates final totals, but displayed discounts can diverge from charged totals.
- **Fix:** Move validation+application into checkout-quote service (`pd_coupon` system = MW-13 / prior-audit M6). Client only *displays* server-computed discounts. Keep gamified spin server-side (already fixed there — reuse that prize engine).

## [P1-5] Hardcoded shipping constants in UI
- **Status:** ☐ open
- **Evidence:** `SHIPPING_PER_VENDOR = 7` (`frontend/src/app/store/[storeHost]/cart/page.tsx:20`); combined-shipping savings `(storeCount-1)*3.000` (`CartContext.tsx:72-74`).
- **Fix:** Add buyer-facing `GET /shipping/rates` (public, cached) consumed by cart UIs; delete constants.

## [P1-6] Mandat proof upload accepted for ANY payment gateway
- **Status:** ☐ open
- **Evidence:** `POST /payments/mandat/upload` (`backend/src/api/payment.route.ts:185-208`) checks ownership only; admin approval (`admin/mandats.routes.ts:31-38`) flips any order to captured-without-payment.
- **Fix:** Enforce `order.payment_gateway === 'manual_mandat'` on upload AND on admin approve (defense in depth). Return 422 otherwise.

## [P1-7] AI product-tagging jobs leak tokens & stick in `processing`
- **Status:** ☐ open
- **Evidence:** `backend/src/workers/ai.worker.ts:223-228` returns early for `product_tagging` before credits consume / job completion; `aiProductTaggerService.tagProduct()` (`ai-product-tagger.service.ts:173-242`) never updates its `pd_ai_jobs` row.
- **Fix:** Pass `job_id` through the tagger; call `creditsService.consume` + `aiService.markCompleted` on success / `markFailed` on error. Add a sweeper cron that fails jobs stuck in `processing` > 30min (refund nothing if tokens weren't reserved — see P1-8). Related decision from prior audit M12: wire or delete `ai-tagger.worker.ts`.

## [P1-8] AI credits consumed AFTER generation completes
- **Status:** ☐ open
- **Evidence:** consume happens post-generation (`ai.worker.ts:242-245`); balance asserted only at queue time (`ai.service.ts:86-87,202-203`) → crash between generation and consume = free usage; concurrent jobs can drive balance negative.
- **Fix:** Reserve pattern: `creditsService.reserve(amount)` before dispatch (atomic decrement + `reserved` ledger row), convert to `consume` on success, `release/refund` on failure. Update pricing table reads accordingly.

## [P1-9] Wallet `retention_days` clobbered globally per credit
- **Status:** ☐ open
- **Evidence:** `backend/src/services/wallet.service.ts:112-118` overwrites wallet default retention with each transaction's method-specific value.
- **Fix:** Store per-txn retention on the transaction metadata only; leave wallet default untouched; compute availability per txn.

## [P1-10] KYC phone OTP not bound to the submitted number
- **Status:** ☐ open
- **Evidence:** `verification.route.ts:63-81` verifies an OTP for any phone then marks KYC record phone-verified.
- **Fix:** Verify against `verification_documents.submission.phone_number` (or store's pending phone); reject mismatch with 400.

## [P1-11] Subscription expiry warnings spam daily
- **Status:** ☐ open
- **Evidence:** `subscription.worker.ts:107-155` recurring `send_warnings` has no dedup.
- **Fix:** Track `last_warning_sent_at` (+ threshold bucket) on `pd_store_subscription`; notify once per threshold (7d/3d/1d).

## [P1-12] `requireStore` silent first-store fallback for multi-store vendors
- **Status:** ☐ open
- **Evidence:** `backend/src/middlewares/index.ts:234-249` picks owner's first-created store when cookie/JWT lack store id.
- **Fix:** When vendor owns >1 store and none explicitly selected → 409 with "select_store" code; frontend prompts picker. Keep fallback single-store behavior.

## [P1-13] Session revocation lag up to 15 min
- **Status:** ☐ open
- **Evidence:** access tokens not checked against `pd_user_session` per request (only refresh flow validates, `auth.service.ts:329-351`).
- **Fix (pragmatic):** add Redis session-version check (cheap GET) on sensitive routes only (password change, 2FA change, payout/withdraw, admin); full middleware check optional after perf testing.

## [P1-14] Rate-limit buckets keyed by spoofable headers
- **Status:** ☐ open
- **Evidence:** `clientBucketKey` prefers `cf-connecting-ip`/`x-real-ip`/first XFF entry (`middlewares/index.ts:314-326`); attacker-supplied XFF rotates buckets unless edge strips them.
- **Fix:** Document + enforce proxy contract: Vercel/Render edge must overwrite (not append) these headers. Add boot-time assertion of `trust proxy` hops vs deployment topology (carried note from prior audit P2-22).

## [P1-15] CSRF skip-list too broad (substring match)
- **Status:** ☐ open
- **Evidence:** `csrf.middleware.ts:61-70`: any path containing `/callback`, `/cart/sync`, `/shipping/rates` bypasses CSRF — e.g. `/anything/callback`.
- **Fix:** Replace `path.includes(...)` with exact route-prefix list matched from the start (`path === x || path.startsWith(x + '/')`).

## [P1-16] DB TLS without certificate validation
- **Status:** ☐ open
- **Evidence:** `db/pool.ts:18` `ssl: { rejectUnauthorized: false }`.
- **Fix:** Download Supabase CA cert, set `ssl: { ca: fs.readFileSync(...) }` via env `PD_DATABASE_CA_CERT` (or use `rejectUnauthorized:true` if pooler serves valid chain). Test against pooler host.

## [P1-17] Plaintext fallback returns ciphertext as the AI provider key
- **Status:** ☐ open
- **Evidence:** `ai-config.service.ts:71-87`: AES-GCM decrypt failure + string ≥8 chars → returned as-is ("plaintext legacy" path).
- **Fix:** Remove fallback: throw `key_decrypt_failed`, surface in admin AI-config UI as "re-enter key". One-time migration: mark un-decryptable rows `needs_reinput`.

## [P1-18] SEO `metadataBase` / canonical falls back to `garbage.team` on misconfig
- **Status:** ☐ open
- **Evidence:** `frontend/src/app/layout.tsx:69` ← `marketplace-settings.ts:159-175`; also `getMarketplaceDomain()` fallback `garbage.team` (`store-hosts.ts:150-165`).
- **Fix:** In production builds, throw during `next build` (or render explicit error page) when base URL env unset; dev keeps fallback.

## [P1-19] Hardcoded prod backend URL + 48× `localhost:9000` fallbacks
- **Status:** ☐ open
- **Evidence:** `LIVE_BACKEND_URL = 'https://pandamarket-backend-fjom.onrender.com'` (`frontend/src/lib/api.ts:10`; also `next.config.ts:18`, `security-headers.ts:12`); 48 occurrences across 16 files incl. `middleware.ts:201,231`, `app/sitemap.ts:32,61,114,138`.
- **Why it's dangerous:** any env misconfiguration silently targets production API (writes included).
- **Fix:** Create `frontend/src/lib/backend-base.ts` exporting one `BACKEND_URL` resolved from env with dev-only localhost default and prod throw-if-missing; refactor all 16 files onto it. Add ESLint rule banning `localhost:9000` literals (prior-audit E4 spirit).

## [P1-20] Revalidate APIs: seller can flush ISR for any store/host; non-constant-time secret compare
- **Status:** ☐ open (follow-up already flagged in STATUS.md)
- **Evidence:** `frontend/src/api/storefront/revalidate/route.ts:36-72`.
- **Fix:** Resolve host→store via backend and assert caller owns it (session) OR machine-secret path scoped to allowed hosts; use `crypto.timingSafeEqual`.

## [P1-21] Duplicate migration prefixes break fresh-database ordering
- **Status:** ☐ open
- **Evidence:** prefixes duplicated for 025, 026, 027, 028, 032, 046(×4), 066–069 in `backend/src/migrations/sql/`; runner only warns (`migrations/run.ts:79-102`). Placeholder `047_seed_comprehensive_aliexpress_taxonomy.sql` is 10 bytes (`-- skipped`).
- **Fix:** Adopt timestamp prefixes for all new migrations (repo convention started in commit `e534fc5`); backfill-rename duplicates in one PR renaming files only (ledger stores names — verify `pd_migrations` rows match old names; if so insert aliasing rows rather than renaming applied files). Delete placeholder 047.

---

## Quick-reference table

| ID | Area | Effort | Risk removed |
|----|------|--------|--------------|
| P1-19 ⚡ | config hygiene | 2h | accidental prod writes |
| P1-15 ⚡ | security | 30m | CSRF bypass variants |
| P1-17 ⚡ | security | 30m | key corruption masking |
| P1-6 | payments integrity | 1h | capture-without-payment |
| P1-7/P1-8 | AI billing | 3h | token leakage |
| P1-2/P1-3 | realtime UX | 2h | dead notifications |
| P1-4/P1-5 | checkout trust | 4h | display≠charged totals |
| P1-9..P1-13 | correctness | 1h each | money/KYC/spam |
| P1-16 | transport security | 1h | MITM |
| P1-18 | SEO | 1h | wrong canonical domain |
| P1-20 | cache abuse | 1h | ISR purge DoS |
| P1-21 | migrations | 2h | fresh-install ordering |
| P1-1 | devops | 1h | broken docker path |
| P1-14 | rate-limit integrity | 1h | limiter evasion |
