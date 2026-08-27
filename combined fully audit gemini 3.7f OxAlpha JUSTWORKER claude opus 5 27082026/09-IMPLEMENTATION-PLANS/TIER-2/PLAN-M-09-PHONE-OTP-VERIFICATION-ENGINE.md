# Engineering Specification: PLAN-M-09
## Customer Phone Number OTP Verification Engine for Fast Checkout

- **Target PRD Gap:** [M-09](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-09)
- **Severity:** 🟡 PRD Gap / Fraud Prevention & Checkout Friction
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Phone Verification Service, Storefront Checkout, Redis Rate Limiter.

---

### 1. Summary & Business Impact
In Tunisia, COD return rates reach 20–30% due to fake phone numbers or duplicate orders. Requiring a 4-digit OTP via WhatsApp/SMS during guest checkout validates that the buyer is genuine, cutting fake COD orders by over 80%.

---

### 2. Implementation Details
1. Generate 4-digit cryptographically random OTP: `crypto.randomInt(1000, 9999)`.
2. Store hashed code in Redis with 5-minute TTL: `SETEX phone_otp:<normalized_phone> 300 <hash>`.
3. Rate limit to maximum 3 requests per phone per hour.
4. Dispatch OTP via `smsService.sendOtp(phone, code)` (using Evolution API WhatsApp gateway).
5. Endpoint `POST /api/pd/auth/verify-phone-otp` validates code and returns verified token.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/phone-otp.test.ts
```
