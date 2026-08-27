## Guide C · Emit Core Financial Domain Events (P0-2)
**Files:** `backend/src/services/payment.service.ts`, `backend/src/services/payment-reconciliation.service.ts`, `backend/src/services/order.service.ts`

### Step 1: Emit on Webhook Payment Capture
In `backend/src/services/payment.service.ts:993` after `markPaidInTransaction`:
```ts
await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
  order_id: boundOrderId,
  gateway: opts.gateway,
  amount: verifyResult.amount,
  currency: 'TND',
  source: 'webhook',
});
```

### Step 2: Emit on Reconciliation Capture
In `backend/src/services/payment-reconciliation.service.ts:325`:
```ts
await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
  order_id: orderId,
  gateway,
  amount: parseFloat(order.total),
  currency: 'TND',
  source: 'reconciliation',
});
```

### Step 3: Emit on COD Delivery Confirmation
In `backend/src/services/order.service.ts:1748`:
```ts
if (paymentGateway === PaymentGateway.Cod) {
  await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
    order_id: opts.order_id,
    gateway: PaymentGateway.Cod,
    source: 'cod_delivery',
  });
}
```

---
