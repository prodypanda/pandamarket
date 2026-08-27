# Engineering Specification: PLAN-T4-02
## Cash on Delivery (COD) Driver & Courier Mobile Console (`/courier`)

- **Target Task:** [T4-02](../../00-MASTER-CHECKLIST/TIER-4-GROWTH-ROADMAP.md)
- **Severity:** 💡 Operations & Fraud Elimination
- **Estimated Effort:** 🏗 6 hours
- **Impacted Systems:** Courier PWA Surface, Order Service, OTP Verification.

---

### 1. Summary & Business Impact
Cash on Delivery drivers in Tunisia handle cash, handwritten notes, and phone calls. Discrepancies between cash collected and orders delivered cause financial reconciliation friction. This plan builds a dedicated mobile PWA route (`/courier`) where delivery drivers view daily route manifests, scan package QR codes, confirm deliveries via a 4-digit SMS OTP from the customer, and reconcile cash collected at the end of the shift.

---

### 2. Implementation Details
1. Dedicated lightweight PWA route: `frontend/src/app/courier/page.tsx`.
2. Camera-based barcode / QR code package scanner using `html5-qrcode`.
3. Delivery handshake: Driver requests delivery OTP; customer provides 4-digit code displayed on their SMS; driver submits code to mark order delivered.
4. Cash tally sheet displaying total dinars collected for the day.

---

### 3. Verification Plan
```bash
npm run test -w frontend -- src/__tests__/courier-console.test.tsx
```
