# Engineering Specification: PLAN-M-18
## Automated Abandoned Cart Recovery Sequences via Email & WhatsApp

- **Target PRD Gap:** [M-18](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-18)
- **Severity:** 🟡 PRD Gap / Revenue Optimization Engine
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Cart Service, BullMQ Cron Worker, Notification Service.

---

### 1. Summary & Business Impact
Up to 70% of shoppers add products to their cart but abandon before payment. An automated recovery sequence sending a gentle reminder after 2 hours (and an optional 5% discount coupon after 24 hours) typically recovers 15–20% of lost revenue.

---

### 2. Implementation Details
1. BullMQ repeatable job runs every 30 minutes: `abandoned-cart-detector`.
2. Query `pd_cart` where `updated_at < NOW() - INTERVAL '2 hours'`, `status = 'active'`, and customer email or phone is recorded.
3. Sequence 1 (2 hours): Friendly reminder email with saved cart restoration link (`/cart?restore=<cart_token>`).
4. Sequence 2 (24 hours): WhatsApp message offering a limited-time incentive coupon.
5. Record dispatches in `pd_cart_recovery_log` to prevent duplicate messaging.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/cart-recovery.test.ts
```
