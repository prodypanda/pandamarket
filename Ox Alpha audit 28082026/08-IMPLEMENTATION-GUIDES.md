# 08 — Implementation Guides (step-by-step)

> Guides for Tier 0/1 items. Code blocks are **sketches** — re-read the target file immediately before editing (parallel agents may have touched it), and adapt names/shapes to the actual code. Every guide ends with a verification step; run backend tests via `npm test -w backend` and typecheck both workspaces before committing.

---

## Guide 1 — [P0-1] Credit wallets on webhook/reconciliation capture

**Files:** `backend/src/services/payment.service.ts` (~908-1016), `backend/src/services/payment-reconciliation.service.ts` (~299-353), `backend/src/subscribers/order.subscriber.ts` (reference).

1. Read `src/subscribers/order.subscriber.ts` and note the exact payload `onPaymentCaptured` expects from `mandat.service.ts:149`.
2. In `payment.service.ts#processPaymentWebhook`, find the success branch (`verifyResult.status === 'captured'`) right after `markPaidInTransaction(...)` resolves.
3. Add, inside the same try-block, after ads conversion call:
   ```ts
   await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
     orderId: boundOrderId,
     attemptId: attempt.id,
     gateway: gatewayName,
     amount: verifyResult.amount,
     currency: 'TND',
     source: 'webhook',
   });
   ```
4. Mirror in `payment-reconciliation.service.ts#markCaptured` with `source: 'reconciliation'`.
5. **Double-fire guard:** in `order.subscriber.ts#onPaymentCaptured`, before crediting, check a wallet txn doesn't already exist for this `order_id` (query `pd_wallet_transaction WHERE order_id=$1 AND type='credit'/'sale'`) — skip if found.
6. **Test:** extend `src/__tests__/payment.service.test.ts`: simulate captured webhook → expect emit called + subscriber handler invoked once; second webhook replay → no double credit.
7. **Verify live (dev):** sandbox Flouci payment → check `pd_wallet_transaction` row appears with future `available_at` per retention.

---

## Guide 2 — [P0-2] Fix storefront receipt review

**File:** `backend/src/api/payment.route.ts` (`POST /payments/receipts/:receiptId/review`, ~466-532).

1. Load order first: `SELECT id, store_id, payment_gateway, payment_status FROM pd_order WHERE id=$1 FOR UPDATE` inside a transaction.
2. Validate: `payment_gateway === 'manual_mandat'` else 422 `{code:'not_manual_mandat'}`; `payment_status === 'pending'` else 409 `{code:'already_processed'}`.
3. Approve branch: replace raw `UPDATE pd_order ...` with:
   ```ts
   await orderService.markPaidInTransaction(orderId, { attemptId: attempt?.id, receiptId }, client);
   // then update receipt status = approved within same tx
   ```
   Emit `PAYMENT_CAPTURED` after commit (`source:'receipt_review'`) — or rely on Guide 1's central emission if you moved it into `markPaidInTransaction`.
4. Reject branch: set receipt `rejected` + reason; set order back to `payment_required` (NOT terminal `failed`); notify buyer with re-upload link (PRD F6.3 6b).
5. Write audit-log rows (admin id, before/after states) for both branches.
6. **Tests:** new `payments.receipt-review.test.ts` — approve happy path (captured + credited once), duplicate approve → 409 no-op, wrong gateway → 422, reject → re-upload allowed then approve works.

---

## Guide 3 — [P0-3] COD delivery credits wallet

**File:** `backend/src/services/order.service.ts` (~1741-1748).

1. Locate delivery-confirmation SQL flipping `payment_status` to `captured` for COD.
2. Refactor: keep the atomic order update, but after commit call the shared capture routine (same as Guide 1 step 3) with `source:'cod_delivery'` — or convert the block to use `markPaidInTransaction` if compatible with its fulfillment CASE logic.
3. Confirm `wallet.service` retention mapping gives COD credits `available_at = delivered_at` (+ any grace) per business-model §3.2; if missing, add gateway→retention entry `cod`.
4. **Test:** COD order lifecycle test asserting credit exists post-delivery with correct availability date.

---

## Guide 4 — ⚡ [P0-4] Install nodemailer

```bash
npm install nodemailer -w backend
node -e "require('nodemailer'); console.log('ok')"   # run inside backend/
```
Add tiny unit test that `SmtpTransport.loadNodemailer()` resolves.

---

## Guide 5 — [P0-5] Enforce webhook HMAC everywhere + real secrets

**Files:** `backend/src/api/payment.route.ts` (:216-218, :247-249), `backend/src/config.ts`.

1. Change both guards from `if (!signatureValid && config.env === 'production')` to `if (!signatureValid && !config.paymentWebhookTestMode)` where `paymentWebhookTestMode = env PD_PAYMENT_WEBHOOK_TEST_MODE === 'true'` (documented dev-only).
2. Add to config: `PD_FLOUCI_WEBHOOK_SECRET`, `PD_KONNECT_WEBHOOK_SECRET` (optional strings).
3. Introduce per-gateway verifier map: `verifiers = { flouci: verifyFlouciSig, konnect: verifyKonnectSig }` using raw body (already captured for HMAC). When dedicated secret present → HMAC with that secret; else fall back to current app-secret/api-key scheme; log which scheme verified.
4. Boot warning when a gateway is enabled without a secret.
5. During MW-2 integration, log one genuine sandbox webhook's headers (temp debug flag), confirm signature scheme, finalize verifier.
6. **Tests:** valid/invalid sig × {production, development} × test-mode flag matrix.

---

## Guide 6 — ⚡ [P0-6] Untrack env-vars.json + rotate

```powershell
git rm --cached env-vars.json
Add-Content .gitignore "`nenv-vars.json"
```
History purge (coordinate with any parallel agents; force-push):
```bash
pip install git-filter-repo
git filter-repo --path env-vars.json --invert-paths
git push github main --force
```
Then rotate (Render dashboard/API): `PD_JWT_SECRET`, `PD_COOKIE_SECRET`, `PD_ENCRYPTION_KEY` (confirm 0 encrypted rows first or plan re-encrypt), Supabase DB password (update `PD_DATABASE_URL` everywhere incl. REMOTE_CREDENTIALS.md), Redis password, WhatsApp token. Add gitleaks workflow:
```yaml
# .github/workflows/security.yml
- uses: gitleaks/gitleaks-action@v2
```

---

## Guide 7 — ⚡ [P0-7] Sanitize AI HTML sinks

1. Locate the project sanitizer: `rg -n "DOMPurify|sanitize" frontend/src/lib frontend/src/components | head` (page-builder uses one).
2. In `hub/dashboard/products/page.tsx:6923`: wrap value → `sanitizeHtml(String(smartFillSuggestions.suggested_description ?? ''))`; prefer plain-text render if formatting unnecessary.
3. Same in `(admin)/ai-costs/AiCostsDashboard.tsx:3080` for `description_html`.
4. Sweep: `rg -n "dangerouslySetInnerHTML" frontend/src/app` — confirm every sink sanitized; fix stragglers.
5. **Tests:** render `<img src=x onerror=alert(1)><script>…</script>` through both components → assert stripped.

---

## Guide 8 — ⚡ [P1-15] CSRF skip-list exact match

**File:** `backend/src/middlewares/csrf.middleware.ts` (:61-70).
Replace each `if (path.includes('/callback'))` style check with:
```ts
const CSRF_EXEMPT_PREFIXES = ['/auth/', '/payments/callback', '/cart/sync', '/shipping/rates'];
const isExempt = CSRF_EXEMPT_PREFIXES.some(p => path === p || path.startsWith(p.endsWith('/') ? p : p + '/') || path.startsWith(p));
```
(Keep semantics identical for legit routes — verify each exempt route still passes by hitting them in dev.) Add regression tests: `/evil/callback` must now require CSRF token.

---

## Guide 9 — [P1-19] Backend URL hygiene

1. Create `frontend/src/lib/backend-base.ts`:
   ```ts
   const explicit = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
   const isProd = process.env.NODE_ENV === 'production';
   export const BACKEND_URL = explicit ?? (isProd ? throw new Error('BACKEND_URL required') : 'http://localhost:9000');
   ```
   (throw via helper function since top-level throw isn't allowed directly.)
2. Update consumers one-by-one (16 files): `lib/api.ts:10`, `next.config.ts:18`, `security-headers.ts:12`, `middleware.ts:201,231`, `app/sitemap.ts`, `robots.ts`, storefront data loaders…
3. Delete `LIVE_BACKEND_URL` constant entirely.
4. ESLint: add rule banning literal `localhost:9000` and `pandamarket-backend-.*\.onrender\.com` in `frontend/src/**` (no-restricted-syntax).
5. Verify: build with env unset locally fails fast; Vercel build green with env set.

---

## Verification ritual (after each guide)

```bash
npm run lint -w backend ; npm run lint -w frontend      # 0 errors expected
npx tsc --noEmit -p backend/tsconfig.json               # exit 0
npx tsc --noEmit -p frontend/tsconfig.json              # exit 0
npm test -w backend                                     # suites pass
curl https://pandamarket-backend-fjom.onrender.com/health   # ok after deploy
```
Commit message convention follows repo history: `fix(payments): credit vendor wallets on webhook capture (P0-1)` etc. Then tick the item in [07-MASTER-TODO-CHECKLIST.md](./07-MASTER-TODO-CHECKLIST.md) with the commit hash.
