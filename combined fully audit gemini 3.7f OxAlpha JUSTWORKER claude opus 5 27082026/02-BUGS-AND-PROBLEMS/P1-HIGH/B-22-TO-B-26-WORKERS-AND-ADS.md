# B-22 to B-26 · Outbox, Ads Engine & Storefront Sessions
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
