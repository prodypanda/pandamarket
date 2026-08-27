# Engineering Specification: PLAN-M-06
## Automated Payment Gateway Refund Processor & Commission Reversal

- **Target PRD Gap:** [M-06](../../04-MISSING-WORK-PRD/M-01-TO-M-06-CORE-COMMERCE.md#m-06)
- **Severity:** 🟡 PRD Gap / Consumer Protection & Accounting
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** Order Service, Payment Gateway Adapters, Wallet Ledger.

---

### 1. Summary & Business Impact
When a customer or seller initiates a refund, `pd_store_order_refund` records the request, but no code executes the refund against Konnect/Flouci, reverses the seller's wallet credit, or adjusts inventory. This plan implements the full refund execution lifecycle.

---

### 2. Refund Lifecycle Flow
1. Admin or Seller approves refund.
2. If paid by online card: Call `paymentService.refundGatewayTransaction(order.payment_gateway, order.payment_reference, amount)`.
3. If paid by COD or Mandat: Record customer bank refund note.
4. Debit vendor `pd_vendor_wallet` by net refund amount.
5. Re-credit platform commission to platform balance.
6. Return inventory count for order items: `UPDATE pd_product SET stock_quantity = stock_quantity + $1`.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/refund-pipeline.test.ts
```
