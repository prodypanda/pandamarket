# 01 — Critical Bugs (P0) — fix before any real money flows

> Every item: **What** → **Evidence** → **Why it happens** → **How to fix (step by step)** → **Test to add**.
> Copy-paste implementation guides for P0-1/2/3 are in [08-IMPLEMENTATION-GUIDES.md](./08-IMPLEMENTATION-GUIDES.md).

---

## [P0-1] Online payments never credit vendor wallets

- **Status:** ☐ open
- **What:** The only place `pd.payment.captured` is emitted — the event that triggers wallet crediting, commission application, serial-license assignment, buyer "Paiement reçu" email and `checkout_payment_completed` analytics — is the Mandat approval path. Card/wallet payments (Flouci/Konnect/PayPal) capture orders but emit nothing.
- **Evidence:**
  - Subscriber that does all the crediting: `backend/src/subscribers/order.subscriber.ts:148-266` (wallet credit at :186), wired to `pd.payment.captured` at :46-53.
  - Sole emitter in codebase: `backend/src/services/mandat.service.ts:149`.
  - Webhook capture path emits nothing after success: `backend/src/services/payment.service.ts:908-1016` (`markPaidInTransaction` at :954, then only `adsService.recognizeOrderConversion` at :992).
  - Reconciliation sweep same omission: `backend/src/services/payment-reconciliation.service.ts:299-353` (`markCaptured`).
  - DB proof (2026-08-26): `pd_wallet_transaction` has 5 rows total; the only `sale` credit came from a Mandat order. Zero credits from online gateways.
- **Consequences for every card payment:** no pending wallet credit → sellers are never paid; commission never applied; digital serial keys never assigned; no confirmation email; analytics funnel broken.

### How to fix — step by step
1. Open `backend/src/services/payment.service.ts`, locate the success branch of `processPaymentWebhook` (`verifyResult.status === 'captured'`, ~line 954).
2. Immediately AFTER the existing transaction that calls `markPaidInTransaction(...)` succeeds, add:
   ```ts
   await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
     orderId: boundOrderId,
     attemptId: attempt.id,
     gateway: providerName,
     amount: verifyResult.amount,
     currency: 'TND',
     source: 'webhook',
   });
   ```
   Use the same payload shape as `mandat.service.ts:149` and import `PdEvent` (do not use raw string `'pd.payment.captured'` — see P2 note on event-name drift).
3. Do the same in `payment-reconciliation.service.ts` → `markCaptured` (~line 299-353) with `source: 'reconciliation'`.
4. **Preferred hardening (optional but recommended):** move the emission *inside* `orderService.markPaidInTransaction` so every future caller inherits it; then remove per-caller emissions to avoid double-fire. If you do this, keep an idempotency guard inside the subscriber (skip if a wallet txn already exists for `order_id`).
5. Check `subscribers/index.ts` registers the order subscriber (it exists — verify no gating skips it when workers run in-process).

### Test to add
- In `src/__tests__/payment.service.test.ts`: after simulating a captured webhook, assert `eventBus.emit` was called with `PdEvent.PAYMENT_CAPTURED` AND that `walletService.credit` was invoked via the subscriber (or spy the subscriber handler). This single test would have caught the bug.

---

## [P0-2] Storefront Mandat receipt review bypasses the payment pipeline

- **Status:** ☐ open
- **What:** `POST /payments/receipts/:receiptId/review` marks the order captured with **raw SQL**, bypassing every invariant.
- **Evidence:** `backend/src/api/payment.route.ts:466-532`:
  ```ts
  await dbQuery(`UPDATE pd_order SET payment_status = 'captured', status = 'processing' ... WHERE id = $1`, [receipt.order_id]);
  ```
  - Skips `orderService.markPaidInTransaction` (which contains fulfillment-status CASE logic at `order.service.ts:2100-2108`), skips `pd_payment_attempt` update, emits no event → no wallet credit (same class as P0-1).
  - No re-check that `payment_gateway === 'manual_mandat'` on review (upload checks it, review doesn't).
  - No state check → double-approve just re-runs.
  - Rejection sets `payment_status='failed'` permanently (:516-521) — PRD F6.3 requires a re-upload path after rejection.

### How to fix — step by step
1. In the approve branch of `payment.route.ts` (~466-500): first load the order and assert `payment_gateway === 'manual_mandat'` and `payment_status === 'pending'`; return `409` otherwise.
2. Replace the raw UPDATE with a call to `orderService.markPaidInTransaction(orderId, { attemptId, receiptId })` inside a transaction, then update the receipt row status within the same transaction.
3. Emit `eventBus.emit(PdEvent.PAYMENT_CAPTURED, {...})` after commit (or inherit it if you moved emission into `markPaidInTransaction` per P0-1 step 4).
4. Change rejection semantics: set order back to `payment_required`, set receipt status `rejected` with reason; keep the order re-reviewable so the buyer can re-upload (PRD F6.3 step 6b).
5. Add audit-log entry with admin id, timestamps, previous/new states (PRD requires history with horodatage + identity).

### Test to add
- New suite `payments.receipt-review.test.ts`: approve → order captured + wallet credited once; second approve → 409/no-op; approve on a Flouci-gateway order → 409; reject → re-upload allowed.

---

## [P0-3] COD orders never credit vendor wallets

- **Status:** ☐ open
- **What:** Cash-on-delivery is "captured" at delivery time via raw SQL; no `markPaid`, no event → COD sellers' wallets are never credited.
- **Evidence:** `CodProvider.verify()` always returns `{status:'pending'}` (`backend/src/plugins/payment/cod.provider.ts:25-28`); delivery capture at `backend/src/services/order.service.ts:1741-1748`:
  ```ts
  UPDATE pd_order SET status='delivered', payment_status=CASE WHEN payment_gateway=$2 THEN 'captured' ... END
  ```

### How to fix — step by step
1. Locate the delivery-confirmation branch in `order.service.ts` (~1741).
2. When the CASE flips payment_status to `captured`, route through `markPaidInTransaction` instead of raw SQL (keep atomicity: wrap both order update and any fulfillment updates in the existing transaction helper).
3. Emit `PAYMENT_CAPTURED` (source: `'cod_delivery'`) — or inherit via P0-1 step 4.
4. Set the wallet credit's `available_at` per business rule "COD: after delivery confirmation" (retention table in `ai instructions/business-model.md §3.2`) — verify `wallet.service.ts` retention mapping handles gateway `cod`.

### Test to add
- Order flow test: create COD order → mark delivered → assert wallet credit row exists with correct `available_at` and commission applied.

---

## [P0-4] ⚡ `nodemailer` missing from dependencies → production email structurally broken

- **Status:** ☐ open
- **What:** SMTP transport dynamically imports `nodemailer` and throws `nodemailer_missing` when absent; worker fails jobs hard in production. Only Brevo HTTP API would work — and SMTP creds aren't configured anyway (see MW-1).
- **Evidence:** absent from `backend/package.json` dependencies (only `@types/nodemailer` in devDeps); `backend/src/workers/email.worker.ts:396-404` (throw), :618-632 (fail-closed).

### How to fix
1. `npm install nodemailer -w backend`
2. Sanity check: `node -e "require('nodemailer')"` from `backend/`.
3. Optional test: unit-test `SmtpTransport.loadNodemailer()` returns a transport factory.

---

## [P0-5] Webhook signature verification disabled outside production

- **Status:** ☐ open
- **What:** Flouci/Konnect webhooks only reject invalid HMAC when `config.env === 'production'`. Staging/preview/misconfigured deployments accept forged confirmations → free order capture.
- **Evidence:** `backend/src/api/payment.route.ts:216-218` and :247-249:
  ```ts
  if (!signatureValid && config.env === 'production') { ...401... }
  ```
  Compounding factor: there are no dedicated webhook-secret configs (`config.ts:129-139`). Konnect HMAC is keyed by the API key (:87), Flouci by app secret (:59) — if providers actually sign differently, genuine prod webhooks 401 and payments silently rely on the reconciliation sweep.

### How to fix — step by step
1. Flip the condition: reject invalid signatures in **all** envs. Allow an explicit test-mode only behind `PD_PAYMENT_WEBHOOK_TEST_MODE=true` (never default).
2. Add config entries `PD_FLOUCI_WEBHOOK_SECRET`, `PD_KONNECT_WEBHOOK_SECRET`; implement per-provider verification strategy objects (strategy keyed by gateway) instead of inline header logic.
3. While integrating real credentials (MW-2), capture one genuine webhook from each provider's sandbox and log its headers/body shape to confirm the signing scheme before locking the strategy.
4. Add a `/ready` subcheck or boot warning when a gateway is enabled but its webhook secret is unset.

### Test to add
- Webhook tests: valid sig → 200; invalid sig → 401 **regardless of env**; test-mode flag respected only when explicitly set.

---

## [P0-6] ⚡ Secrets committed to git: `env-vars.json`

- **Status:** ☐ open
- **What:** Root file `env-vars.json` is tracked by git and contains live values: WhatsApp gateway token, `PD_ENCRYPTION_KEY`, `PD_COOKIE_SECRET`, `PD_JWT_SECRET`, `PD_REDIS_URL`, `PD_DATABASE_URL` (Supabase password). `.gitignore` covers `REMOTE_CREDENTIALS.md` only (line 86).
- **Risk:** anyone with repo access (or a future leak of the repo) gets full platform access.

### How to fix — step by step
1. `git rm --cached env-vars.json`
2. Add to `.gitignore`: `env-vars.json`
3. Purge history (contains secrets today):
   ```bash
   # using git filter-repo (recommended)
   pip install git-filter-repo
   git filter-repo --path env-vars.json --invert-paths
   git push github main --force
   ```
   Coordinate with any parallel agents before force-pushing.
4. Rotate everything that was in the file (owner already plans rotation pre-production): JWT secret, cookie secret, encryption key (verify zero encrypted rows depend on old key or plan re-encryption), DB password, Redis password, WhatsApp token. See [05-SECURITY-HARDENING.md](./05-SECURITY-HARDENING.md) rotation section.
5. Sweep for other tracked secret-bearing files: `git ls-files | grep -iE "env|secret|cred"` — currently clean apart from this one.

---

## [P0-7] XSS: unsanitized AI HTML rendered with `dangerouslySetInnerHTML`

- **Status:** ☐ open
- **What:** Two sinks render AI-generated HTML without DOMPurify. A malicious/poisoned model output executes JS in seller/admin sessions.
- **Evidence:**
  - `frontend/src/app/hub/dashboard/products/page.tsx:6923` → `smartFillSuggestions.suggested_description`
  - `frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx:3080` → `(selectedJob.output as any).description_html`
  - Contrast (correct pattern): page-builder renderer, notes markdown, product descriptions all sanitize via DOMPurify helpers.

### How to fix — step by step
1. Import the existing sanitizer used elsewhere (search for `dompurify` / `sanitizeHtml` usage in `frontend/src/lib` or components) into both files.
2. Wrap the sink value: `dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(x ?? '')) }}`.
3. Prefer plain-text rendering where formatting isn't required (products smart-fill preview can be text).
4. Grep for remaining unsanitized sinks: `rg -n "dangerouslySetInnerHTML" frontend/src` and verify each passes through the sanitizer.

### Test to add
- Component test rendering `<script>`-laden AI output through both components → assert script tag stripped.

---

## Progress tracker (P0)

| ID | Summary | Status |
|----|---------|--------|
| P0-1 | Wallet credit event on webhook/reconciliation capture | ☐ |
| P0-2 | Receipt review routed through pipeline | ☐ |
| P0-3 | COD delivery wallet credit | ☐ |
| P0-4 | nodemailer installed | ☐ |
| P0-5 | HMAC enforced in all envs + webhook secrets | ☐ |
| P0-6 | env-vars.json untracked + rotated | ☐ |
| P0-7 | XSS sinks sanitized | ☐ |
