# 02 — Critical Bugs (P0) — Immediate Blockers

> **Priority Standard:** Every P0 bug in this file directly threatens financial integrity, system compilation, or user session security.
> **Standard Format:** What is Broken ➔ Forensic Code Evidence ➔ Root Cause ➔ Step-by-Step Fix ➔ Verification Test.

---

## [P0-1] Online Payments (Flouci / Konnect / PayPal) Never Credit Vendor Wallets

- **Severity:** `CRITICAL (P0)` — Direct merchant revenue loss.
- **Affected Surface:** Payment webhooks (`/api/pd/payment/webhook/flouci`, `/webhook/konnect`, `/webhook/paypal`), daily payment reconciliation worker (`payment-reconciliation.worker.ts`).
- **Forensic Evidence:**
  - `backend/src/subscribers/order.subscriber.ts:46-53` listens to `PdEvent.PAYMENT_CAPTURED`:
    ```typescript
    eventBus.on(PdEvent.PAYMENT_CAPTURED, async (payload: { order_id: string; gateway: string }) => {
      incrementBusinessMetric('payments_captured', { gateway: payload.gateway });
      await onPaymentCaptured(payload.order_id, payload.gateway);
    });
    ```
  - `onPaymentCaptured` handles:
    1. Digital serial key assignment (`assignSerialLicenseKeys`).
    2. Net vendor credit (`walletService.creditPending`) deducting tier commission.
    3. Merchant socket push (`payment_received`), in-app notification, and email.
    4. Buyer confirmation email and notification.
  - In `backend/src/services/payment.service.ts:940-1016` (`processPaymentWebhook`), when `verifyResult.status === 'captured'`, it executes:
    ```typescript
    await orderService.markPaidInTransaction(client, boundOrderId, opts.gateway, attempt.gateway_reference);
    await adsService.recognizeOrderConversion(boundOrderId);
    ```
    **It never calls `eventBus.emit(PdEvent.PAYMENT_CAPTURED, ...)`!**
  - In `backend/src/services/payment-reconciliation.service.ts:325` (`markCaptured`), the same omission exists.
  - **Database Proof:** Out of all historical rows in `pd_wallet_transaction`, only 1 sale credit exists, and it was generated exclusively by the manual Mandat path (`mandat.service.ts:149`). All credit card and wallet payments produce zero vendor wallet credits.
- **Consequences:** Merchants are never paid for online transactions; platform commissions are lost; digital products never dispatch software license keys; and transactional notifications fail to trigger.

### Step-by-Step Fix:
1. Open `backend/src/services/payment.service.ts`. Ensure `PdEvent` is imported from `../subscribers`.
2. Locate line ~993 immediately after `await adsService.recognizeOrderConversion(boundOrderId);`.
3. Emit the event with the exact snake_case payload expected by `order.subscriber.ts`:
   ```typescript
   await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
     order_id: boundOrderId,
     gateway: opts.gateway,
     amount: verifyResult.amount,
     currency: 'TND',
     source: 'webhook',
   });
   ```
4. Repeat this step in `backend/src/services/payment-reconciliation.service.ts` after line 325.
5. In `backend/src/subscribers/order.subscriber.ts`, add an idempotency guard: query `pd_wallet_transaction` for `order_id = $1 AND type = 'sale'` before executing `walletService.creditPending` to prevent duplicate crediting.

### Verification Test:
- Add a test in `backend/src/__tests__/payment.service.test.ts`: Mock a successful Flouci webhook capture, and assert that `eventBus.emit` is invoked with `PdEvent.PAYMENT_CAPTURED` and that `walletService.creditPending` is called.

---

## [P0-2] Storefront Mandat Receipt Review Bypasses Entire Payment Pipeline via Raw SQL

- **Severity:** `CRITICAL (P0)` — State corruption and financial pipeline bypass.
- **Affected Surface:** Storefront Mandat review endpoint `POST /api/pd/payment/receipts/:receiptId/review`.
- **Forensic Evidence:**
  - In `backend/src/api/payment.route.ts:506-523`:
    ```typescript
    if (action === 'approve') {
      await dbQuery(
        `UPDATE pd_order SET payment_status = 'captured', status = 'processing', updated_at = NOW() WHERE id = $1`,
        [receipt.order_id],
      );
    } else {
      await dbQuery(
        `UPDATE pd_order SET payment_status = 'failed', updated_at = NOW() WHERE id = $1`,
        [receipt.order_id],
      );
    }
    ```
  - Bypasses `orderService.markPaidInTransaction(...)`, leaving `pd_payment_attempt` unupdated.
  - Emits no `PdEvent.PAYMENT_CAPTURED` event (no wallet credit, no serial keys released).
  - Fails to check whether the order's `payment_gateway === 'manual_mandat'`.
  - On rejection, it permanently marks `payment_status = 'failed'`, locking the buyer out from re-uploading a clearer receipt (violating PRD §F6.3).

### Step-by-Step Fix:
1. Open `backend/src/api/payment.route.ts` at line 466.
2. In a transaction, load the order with `SELECT id, payment_gateway, payment_status, total FROM pd_order WHERE id = $1 FOR UPDATE`.
3. Assert `payment_gateway === PaymentGateway.ManualMandat` and `payment_status === 'pending'`; return `409 Conflict` otherwise.
4. On approval, execute `orderService.markPaidInTransaction(...)`, update receipt status to `'approved'`, and emit `PdEvent.PAYMENT_CAPTURED`.
5. On rejection, set receipt status to `'rejected'`, set order status back to `'payment_required'` (so the customer can re-upload a receipt), and trigger a notification to the buyer.

---

## [P0-3] Cash-on-Delivery (COD) Delivery Capture Never Credits Vendor Wallets

- **Severity:** `CRITICAL (P0)` — COD merchants are never credited.
- **Affected Surface:** Order fulfillment delivery confirmation `order.service.ts:1742-1748`.
- **Forensic Evidence:**
  ```typescript
  if (rows[0].active === '0' && rows[0].delivered !== '0') {
    await c.query(
      `UPDATE pd_order SET status = 'delivered',
         payment_status=CASE WHEN payment_gateway=$2 THEN 'captured' ELSE payment_status END,
         updated_at=NOW() WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
      [opts.order_id, PaymentGateway.Cod],
    );
  }
  ```
  - The payment status is set to `'captured'` via raw SQL, but no event is emitted and `walletService.creditPending` is never invoked.

### Step-by-Step Fix:
1. Open `backend/src/services/order.service.ts` at line 1748.
2. Immediately following the query:
   ```typescript
   await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
     order_id: opts.order_id,
     gateway: PaymentGateway.Cod,
   });
   ```
3. Verify in `backend/src/subscribers/order.subscriber.ts` that `gatewayToRetentionKey('cod')` maps to `'payout_retention_days_cod'` so retention is calculated from delivery date.

---

## [P0-4] Active Backend TypeScript Compile Failure: Unimported `retentionRouter` in `main.ts`

- **Severity:** `CRITICAL (P0)` — Prevents backend build and deployment.
- **Affected Surface:** `backend/src/main.ts:345` and `backend/src/api/retention.route.ts`.
- **Forensic Evidence:**
  - Running `npm run type-check -w backend` fails with:
    ```
    src/api/retention.route.ts(12,24): error TS6133: 'validate' is declared but its value is never read.
    src/api/retention.route.ts(17,7): error TS6133: 'rewardsLeadSchema' is declared but its value is never read.
    src/main.ts(345,31): error TS2304: Cannot find name 'retentionRouter'.
    ```
  - `retentionRouter` was mounted at `apiRouter.use('/retention', retentionRouter);` in `main.ts:345`, but the import statement was omitted at the top of the file.
  - In `retention.route.ts`, the Zod validator was declared but not applied to `router.post('/rewards-lead', ...)`.

### Step-by-Step Fix:
1. In `backend/src/main.ts`, add line ~58:
   ```typescript
   import retentionRouter from './api/retention.route';
   ```
2. In `backend/src/api/retention.route.ts`, apply `validate(rewardsLeadSchema)` to the route handler:
   ```typescript
   router.post(
     '/rewards-lead',
     validate(rewardsLeadSchema),
     asyncHandler(async (req: Request, res: Response) => {
       const result = await cartService.recordGamifiedLead({
         store_id: req.body.store_id,
         phone: req.body.phone,
         email: req.body.email,
         game_type: req.body.game_type,
         device_fingerprint: req.body.device_fingerprint,
       });
       res.status(201).json({ data: result });
     }),
   );
   ```

---

## [P0-5] Missing `nodemailer` Dependency in Production Backend

- **Severity:** `CRITICAL (P0)` — Transactional email worker crashes in production.
- **Affected Surface:** `backend/src/workers/email.worker.ts:396-404` and `backend/package.json`.
- **Forensic Evidence:**
  - `backend/package.json` includes `@types/nodemailer` under `devDependencies`, but `nodemailer` is completely absent from `dependencies`.
  - In `backend/src/workers/email.worker.ts:399-404`:
    ```typescript
    this.nodemailer = (await import('nodemailer')) as typeof import('nodemailer');
    // ... catches error and throws new Error('nodemailer_missing');
    ```
  - In production, BullMQ email jobs fail when attempting to send password resets, OTPs, or order confirmations via SMTP.

### Step-by-Step Fix:
1. Run:
   ```bash
   npm install nodemailer -w backend
   ```
2. Verify module resolution:
   ```bash
   node -e "require('nodemailer'); console.log('OK')"
   ```

---

## [P0-6] Webhook HMAC Signature Verification Skipped Outside Production

- **Severity:** `CRITICAL (P0)` — Payment spoofing vulnerability.
- **Affected Surface:** `backend/src/api/payment.route.ts:216-218` (Flouci) and `247-249` (Konnect).
- **Forensic Evidence:**
  ```typescript
  const signatureValid = verifyFlouciSignature(req);
  if (!signatureValid && config.env === 'production') {
    res.status(401).json({ error: { message: 'Invalid signature' } });
    return;
  }
  ```
  - In non-production environments (or production if `NODE_ENV` is unset or misconfigured), unverified webhooks are accepted, capturing orders with fake payloads.

### Step-by-Step Fix:
1. Enforce signature validation unconditionally, allowing a bypass only when an explicit debug flag is set:
   ```typescript
   const allowBypass = config.env !== 'production' && process.env.PD_PAYMENT_WEBHOOK_TEST_MODE === 'true';
   if (!signatureValid && !allowBypass) {
     res.status(401).json({ error: { message: 'Invalid webhook signature' } });
     return;
   }
   ```
2. Configure dedicated webhook secrets: `PD_FLOUCI_WEBHOOK_SECRET` and `PD_KONNECT_WEBHOOK_SECRET`.

---

## [P0-7] Two Stored XSS Sinks in AI Output Rendering (`dangerouslySetInnerHTML`)

- **Severity:** `CRITICAL (P0)` — Cross-Site Scripting in merchant and admin panels.
- **Affected Surface:**
  1. `frontend/src/app/hub/dashboard/products/page.tsx:6923`:
     ```tsx
     <div dangerouslySetInnerHTML={{ __html: smartFillSuggestions.suggested_description }} />
     ```
  2. `frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx:3080`:
     ```tsx
     <div dangerouslySetInnerHTML={{ __html: (selectedJob.output as any).description_html }} />
     ```
- **Forensic Evidence:** Both components render AI-generated HTML directly from the API response without DOMPurify sanitization. Prompt injection into product descriptions or categories allows an attacker to execute arbitrary scripts in seller and admin browsers.

### Step-by-Step Fix:
1. Import DOMPurify:
   ```typescript
   import DOMPurify from 'dompurify';
   ```
2. Wrap both sinks:
   ```tsx
   dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(smartFillSuggestions.suggested_description) }}
   ```
3. Deploy a standardized `<SafeAiHtml content={...} />` component across the application.

---

## [P0-8] Git-Tracked Production Credentials in `env-vars.json`

- **Severity:** `CRITICAL (P0)` — Credential exposure.
- **Affected Surface:** Root repository file `c:\tek\pandamarket\env-vars.json`.
- **Forensic Evidence:** The file is tracked in git and contains live production secrets (`PD_JWT_SECRET`, `PD_COOKIE_SECRET`, `PD_ENCRYPTION_KEY`, Supabase DB passwords, Redis credentials, and WhatsApp tokens).

### Step-by-Step Fix:
1. Untrack the file:
   ```bash
   git rm --cached env-vars.json
   ```
2. Add `env-vars.json` to `.gitignore`.
3. Pre-production: rotate all exposed secrets in Supabase, Render, Redis, and Vercel.
