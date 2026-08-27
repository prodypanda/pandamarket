# Engineering Specification: PLAN-M-10
## Digital Products License Key Pool & Automated Delivery Engine

- **Target PRD Gap:** [M-10](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-10)
- **Severity:** 🟡 PRD Gap / Digital Commerce
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Digital Product Service, Order Subscriber, Customer Library.

---

### 1. Summary & Business Impact
Sellers selling digital items (software licenses, gaming codes, gift cards) need an automated inventory pool that assigns a unique license key upon successful payment capture and reveals it securely in the customer's order dashboard.

---

### 2. Implementation Details
1. Table: `pd_serial_key (id, product_id, key_ciphertext, is_assigned, order_id, assigned_at)`.
2. Encrypt license keys at rest using AES-256-GCM with `PD_ENCRYPTION_KEY`.
3. In `order.subscriber.ts` (`onPaymentCaptured`), assign unallocated keys matching digital line items.
4. Render license key in customer order history and include in payment receipt email.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/digital-keys.test.ts
```
