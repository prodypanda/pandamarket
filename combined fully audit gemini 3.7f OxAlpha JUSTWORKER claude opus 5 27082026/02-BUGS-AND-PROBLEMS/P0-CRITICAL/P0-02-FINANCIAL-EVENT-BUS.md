# P0-02 · FINANCIAL-EVENT-BUS

### P0-2 · Financial Event Bus Disconnect (Vendor Wallets Starved)
- **Files:** `backend/src/services/payment.service.ts:993`, `payment-reconciliation.service.ts:325`, `order.service.ts:1748`
- **Evidence:** `PdEvent.PAYMENT_CAPTURED` is subscribed by `order.subscriber.ts` to credit vendor wallets, but never emitted on Flouci/Konnect webhooks or COD delivery.
- **Root Cause:** Missing event bus calls after `markPaidInTransaction`.
- **Fix Guide:** See [Guide C](../../06-IMPLEMENTATION-GUIDES/GUIDE-C-EVENT-BUS-WIRING.md).
