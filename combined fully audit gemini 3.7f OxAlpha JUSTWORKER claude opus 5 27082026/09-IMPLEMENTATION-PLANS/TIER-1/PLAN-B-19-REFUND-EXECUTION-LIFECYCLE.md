# Engineering Specification: PLAN-B-19
## Implement Automated Refund Execution State Machine & Wallet Reversals

- **Target Bug:** [B-19](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-17-TO-B-21-SECURITY-INFRA.md#b-19)
- **Severity:** 🟠 P1 (Unexecuted Refunds / Incomplete Financial State Machine)
- **Estimated Effort:** 🏗 4 hours
- **Impacted Systems:** Order Service, Payment Service, Vendor Wallet, Webhook Dispatcher.

---

### 1. Summary & Business Impact
In `backend/src/services/order.service.ts:1831-1912`, `requestStoreRefund` records a refund row in `pd_store_order_refund` with `status = 'requested'`. No automated or admin mechanism exists to execute the refund against Flouci or Konnect, debit the vendor's wallet balance, reverse platform commissions, or restore stock.

---

### 2. Proposed Changes & Exact Diffs

#### Implement `executeRefundInTransaction` in `order.service.ts`
1. Transition state from `requested` → `processing` → `completed`.
2. Call payment gateway refund API (Konnect / Flouci).
3. Debit merchant's `pd_vendor_wallet` (pending funds if not yet released, otherwise available balance).
4. Reverse platform commission proportionally.
5. Emit `PdEvent.ORDER_REFUNDED` to trigger notifications.

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/order-refunds.test.ts
```
