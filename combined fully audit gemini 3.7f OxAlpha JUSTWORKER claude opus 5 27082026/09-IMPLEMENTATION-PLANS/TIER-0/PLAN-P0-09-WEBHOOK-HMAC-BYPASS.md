# Engineering Specification: PLAN-P0-09
## Enforce Webhook HMAC Signatures Unconditionally Across All Environments

- **Target Bug:** [P0-9](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-09-WEBHOOK-HMAC-BYPASS.md)
- **Severity:** 🔴 P0 (Payment Forgery / Unsigned Webhook Acceptance)
- **Estimated Effort:** ⚡ 30 minutes
- **Impacted Systems:** Payment Webhook Handler, Flouci & Konnect Adapters, Security Posture.

---

### 1. Summary & Business Impact
In `backend/src/api/payment.route.ts:216,247`, webhook HMAC signature verification is wrapped in:
`if (config.env === 'production') { ... }`
In development, testing, and staging environments, any external actor can post fake webhook payloads to mark orders as paid without an authentic signature. If staging shares a database or if production runs with a non-standard `config.env` string, unsigned webhooks are executed.

---

### 2. Root Cause & Blast Radius
- **Root Cause:** Environment-dependent security guard bypassing cryptographic signature checks.
- **Blast Radius:** Forged payment confirmations, order fraud, and unauthorized inventory release.

---

### 3. Proposed Changes & Exact Diffs

#### Modify `backend/src/api/payment.route.ts`
```diff
--- a/backend/src/api/payment.route.ts
+++ b/backend/src/api/payment.route.ts
@@ -213,9 +213,7 @@ router.post(
   '/webhook/flouci',
   asyncHandler(async (req: Request, res: Response) => {
-    if (config.env === 'production') {
       verifyFlouciSignature(req);
-    }
     await paymentService.processPaymentWebhook({ gateway: 'flouci', payload: req.body });
     res.status(200).json({ received: true });
   })
 );
@@ -244,9 +244,7 @@ router.post(
   '/webhook/konnect',
   asyncHandler(async (req: Request, res: Response) => {
-    if (config.env === 'production') {
       verifyKonnectSignature(req);
-    }
     await paymentService.processPaymentWebhook({ gateway: 'konnect', payload: req.body });
     res.status(200).json({ received: true });
   })
 );
```

---

### 4. Concurrency, Security & Edge Cases
- **Development Testing:** For local development and CI tests, configure dedicated sandbox webhook secrets rather than disabling the check in application logic.

---

### 5. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/payment-webhooks.test.ts
```

---

### 6. Manual Verification Procedure
Attempt to post an unsigned webhook payload:
```bash
curl -i -X POST http://localhost:9000/api/pd/payment/webhook/konnect \
  -H "Content-Type: application/json" \
  -d '{"payment_id":"fake_123","status":"completed"}'
```
*Expected Output:* `HTTP 401 Unauthorized` (`INVALID_SIGNATURE: Missing or invalid webhook signature`).

---

### 7. Rollback Strategy
Revert commit on failure:
```bash
git checkout HEAD -- backend/src/api/payment.route.ts
```
