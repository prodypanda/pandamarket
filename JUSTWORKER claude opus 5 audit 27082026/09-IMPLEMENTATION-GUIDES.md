# 09 · Step-by-Step Implementation Guides

[← Index](./00-README.md) · Prev: [08 Checklist](./08-TODO-CHECKLIST.md) · Next: [10 Evidence](./10-EVIDENCE-AND-METHOD.md)

This document contains exact, diff-level implementation blueprints for the critical P0 findings (B-00 through B-07).

---

## Guide A · Fix Backend Compilation & Rewards Lead Validation (B-00)
**Finding:** [B-00](./03-BUGS-P0-CRITICAL.md#b-00) · **Effort:** ⚡ 5 min

### 1. In `backend/src/main.ts`
Add the import in the route block (~line 58):
```ts
import retentionRouter from './api/retention.route';
```

### 2. In `backend/src/api/retention.route.ts`
Apply the Zod validator to `router.post('/rewards-lead')`:
```ts
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

### 3. In `frontend/src/components/retention/GamifiedRewardsWidget.tsx`
Switch the submit fetch to `fetchWithCsrf` so the CSRF token and credentials are sent:
```ts
import { fetchWithCsrf } from '@/lib/api';
// line ~334:
const res = await fetchWithCsrf('/api/pd/retention/rewards-lead', {
  method: 'POST',
  body: JSON.stringify({ ... }),
});
```

### Verification
```bash
npm run type-check -w backend
```
Expected output: Exit code 0 (clean).

---

## Guide B · Separate Storefront Customer Tokens from Marketplace Users (B-01)
**Finding:** [B-01](./03-BUGS-P0-CRITICAL.md#b-01) · **Effort:** ~3 h

### 1. In `backend/src/utils/jwt.ts`
Add a `token_type` claim:
```ts
export function signStorefrontCustomerToken(customer: StorefrontCustomerPayload): string {
  return jwt.sign(
    {
      ...customer,
      token_type: 'storefront_customer',
    },
    config.jwtSecret,
    { expiresIn: '15m' }
  );
}
```

### 2. In `backend/src/middlewares/index.ts`
In `requireAuth`:
```ts
if ((req.user as any)?.token_type === 'storefront_customer') {
  throw new PdAuthenticationError(PdErrorCode.AUTH_UNAUTHORIZED, 'Invalid token context');
}
```
In `requireStorefrontCustomer`:
```ts
if ((req.storefrontCustomer as any)?.token_type !== 'storefront_customer') {
  throw new PdAuthenticationError(PdErrorCode.AUTH_UNAUTHORIZED, 'Invalid storefront token');
}
```

### 3. In `backend/src/gateways/socket.gateway.ts`
Never blindly trust `socket.data.user.store_id`. Query `pd_store` to assert store ownership:
```ts
const { rows } = await query('SELECT id FROM pd_store WHERE id = $1 AND owner_id = $2', [
  storeId,
  user.id,
]);
if (!rows[0]) {
  throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'User does not own store');
}
```

---

## Guide C · Emit the Seven Core Domain Events (B-02)
**Finding:** [B-02](./03-BUGS-P0-CRITICAL.md#b-02) · **Effort:** ~4 h

### 1. In `backend/src/services/payment.service.ts`
In `processPaymentWebhook` after `markPaidInTransaction` (~line 992):
```ts
await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
  order_id: boundOrderId,
  gateway: opts.gateway,
  amount: verifyResult.amount,
  currency: 'TND',
  source: 'webhook',
});
```
And in `backend/src/services/payment-reconciliation.service.ts` at line 325:
```ts
await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
  order_id: orderId,
  gateway,
  amount: parseFloat(order.total),
  currency: 'TND',
  source: 'reconciliation',
});
```

### 2. In `backend/src/services/order.service.ts`
In `checkout` (~line 850):
```ts
await eventBus.emit(PdEvent.ORDER_PLACED, {
  order_id: orderId,
  customer_id: opts.customer_id,
  total: quote.total,
});
```
In `confirmStoreFulfillmentDelivery` (~line 1748):
```ts
await eventBus.emit(PdEvent.ORDER_DELIVERED, {
  order_id: opts.order_id,
  store_id: opts.store_id,
});
if (paymentGateway === PaymentGateway.Cod) {
  await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
    order_id: opts.order_id,
    gateway: PaymentGateway.Cod,
    source: 'cod_delivery',
  });
}
```

---

## Guide D · Custom Domain Verification & TLS Hijack Fix (B-03)
**Finding:** [B-03](./03-BUGS-P0-CRITICAL.md#b-03) · **Effort:** ~2 h

1. In `backend/src/api/store.route.ts`: Delete the `mock_token` branch; do not return raw verification token in API response.
2. In `backend/src/services/domain-verification.service.ts`: Delete the `startsWith('pd-verify-')` clause that blindly marks domains verified without DNS resolution.
3. In `PUT /me/domain`: Assert that a verified row in `pd_store_domain` exists for that domain and that the store's plan includes `has_custom_domain`.
4. Drop the legacy fallback in `isDomainTlsAllowed` that allowed unverified domains.

---

## Guide E · Ads Auto-Refill Balance Minting Fix (B-04)
**Finding:** [B-04](./03-BUGS-P0-CRITICAL.md#b-04) · **Effort:** ⚡ 30 min

In `backend/src/services/ads.service.ts`:
1. In `checkAndTriggerAutoRefill`, remove the direct `UPDATE pd_ads_account SET balance = balance + $1` statement.
2. Reject `auto_refill_enabled = true` in the validation schema until an automated card capture gateway is configured.

---

## Guide F · Secure `PUT /admin/settings` Route (B-05)
**Finding:** [B-05](./03-BUGS-P0-CRITICAL.md#b-05) · **Effort:** ~1 h

1. In `backend/src/services/platform-config.service.ts`, move section ACL validation into `updateSettings` so it cannot be bypassed.
2. In `backend/src/api/admin/settings.routes.ts`, delete the flat `PUT /admin/settings` endpoint and require all updates to pass through `PUT /admin/settings/:section`.
3. Require `requireSuperAdmin` for `finance` and `security` sections.

---

## Guide G · Shadow Route Fix & JSON Equality 500 Fix (B-06 & B-07)
**Findings:** [B-06](./04-BUGS-P1-HIGH.md#b-06) and [B-07](./04-BUGS-P1-HIGH.md#b-07) · **Effort:** ⚡ 30 min

1. In `backend/src/api/admin/reports.routes.ts:183-225`, delete the duplicate `PUT /buyers/:id/suspend` and `PUT /buyers/:id/reactivate` routes that shadow the real ones in `vendors.routes.ts`.
2. In `backend/src/services/product.service.ts:2276-2287` (`getBundlesContainingProduct`), remove `SELECT DISTINCT` over the `json` column aggregate and replace with `GROUP BY p.id`.
