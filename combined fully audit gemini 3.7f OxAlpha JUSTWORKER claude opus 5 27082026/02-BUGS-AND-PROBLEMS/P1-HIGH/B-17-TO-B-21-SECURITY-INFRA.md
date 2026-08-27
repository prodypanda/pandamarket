# B-17 to B-21 · Security, Infrastructure & Financial Integrity
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
