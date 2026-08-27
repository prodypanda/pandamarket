# Engineering Specification: PLAN-T4-03
## Tunisian Mobile Payment Gateways Expansion (Poste Tunisienne D17 & Sobflous)

- **Target Task:** [T4-03](../../00-MASTER-CHECKLIST/TIER-4-GROWTH-ROADMAP.md)
- **Severity:** 💡 Payment Adoption & Conversion Rate
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** Payment Service, Checkout Surface, Webhook Router.

---

### 1. Summary & Business Impact
Expanding beyond Flouci and Konnect to include La Poste Tunisienne's **D17** (the most widely held digital card/wallet in Tunisia) and **Sobflous** unlocks millions of banked Tunisian students, postal account holders, and mobile users who do not possess international credit cards.

---

### 2. Implementation Details
1. Implement `D17PaymentAdapter` calling Poste Tunisienne API.
2. Implement `SobflousPaymentAdapter` for micro-payments and mobile recharge cards.
3. Add D17 and Sobflous payment badges and selection options on checkout pages.
4. Handle payment callback webhooks with signature verification.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/tunisian-payments.test.ts
```
