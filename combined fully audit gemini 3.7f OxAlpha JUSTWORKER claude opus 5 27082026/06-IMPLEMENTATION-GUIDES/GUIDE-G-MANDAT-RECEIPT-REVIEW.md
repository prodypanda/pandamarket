## Guide G · Fix Mandat Receipt Review via `markPaidInTransaction` (P0-7)
**Files:** `backend/src/api/payment.route.ts:466-532`

Replace raw SQL update with:
```ts
await orderService.markPaidInTransaction(client, receipt.order_id, {
  gateway: 'manual_mandat',
  reference: receipt.id,
  source: 'receipt_review',
});
await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
  order_id: receipt.order_id,
  gateway: 'manual_mandat',
  amount: receipt.amount,
  currency: 'TND',
  source: 'mandat_review',
});
```

---
