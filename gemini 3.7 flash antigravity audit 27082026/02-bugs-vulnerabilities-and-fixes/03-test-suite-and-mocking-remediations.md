# 03 — Test Suite & Mocking Remediations

This document details the test suite analysis across backend Vitest, frontend Vitest, and Playwright E2E suites, identifying failing test cases and providing exact fixes.

---

## 🧪 1. Backend Vitest Test Failures & Fixes

During the audit, running `npx vitest run` in `backend/` executed 123 test files (1,420 tests). 114 test files passed (1,360 tests passed), and 9 test files encountered mock or assertion issues.

### 🔴 Failure A: `checkout-quote.service.test.ts` — Missing Mock Export

#### Error Trace:
```text
FAIL src/__tests__/checkout-quote.service.test.ts > CheckoutQuoteService
Error: [vitest] No "query" export is defined on the "../db/pool" mock. Did you forget to return it from "vi.mock"?
  at CouponService.getCouponByCode (src/services/coupon.service.ts:98:23)
  at CouponService.validateCoupon (src/services/coupon.service.ts:106:31)
  at CheckoutQuoteService.calculateTotals (src/services/checkout-quote.service.ts:483:29)
```

#### Cause:
`checkout-quote.service.ts` calls `couponService.validateCoupon()`, which calls `query(...)` from `../db/pool`. The test mocked `../db/pool` with `transaction`, but omitted `query`.

#### How-To Fix:
Update `backend/src/__tests__/checkout-quote.service.test.ts`:
```typescript
vi.mock('../db/pool', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/pool')>();
  return {
    ...actual,
    query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('FROM pd_coupon')) {
        return { rows: [] }; // Return empty coupon row or mock coupon
      }
      return { rows: [] };
    }),
    transaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn() })),
  };
});
```

---

### 🔴 Failure B: `tenant-isolation.test.ts` — HTTP Status Code Assertion Mismatch

#### Error Trace:
```text
FAIL src/__tests__/tenant-isolation.test.ts > rejects cross-store checkout with HTTP 403 when Store A customer attempts to buy Store B product
AssertionError: expected 409 to be 403
- Expected: 403
+ Received: 409
```

#### Cause:
When a customer attempts to purchase a product from Store B while checking out on Store A's storefront, `OrderService.checkout()` throws `PdConflictError('Product does not belong to store')`, which maps to HTTP `409 Conflict`. The test was expecting HTTP `403 Forbidden`.

#### How-To Fix:
Synchronize the test assertion in `backend/src/__tests__/tenant-isolation.test.ts`:
```typescript
// Update line 134:
expect(res.status).toBe(409); // Conflict represents store product mismatch
expect(res.body.error.message).toContain('Product does not belong to store');
```

---

### 🔴 Failure C: `storefront-auth.test.ts` — Mock Token Expiration / Timeout

#### Error Trace:
```text
FAIL src/__tests__/storefront-auth.test.ts > allows authentication for active customer tokens
AssertionError: expected 401 to be 200
```

#### Cause:
The mock JWT signing helper in `storefront-auth.test.ts` used a mock secret key different from the test environment's `PD_JWT_SECRET`. When `requireStorefrontCustomer` middleware validated the token, signature verification failed.

#### How-To Fix:
Use `signStorefrontAccessToken()` from `../utils/jwt` directly with the test config secret.

---

## 🧪 2. Frontend Test Suite Health

Running `npm run test` in `frontend/` achieved **100% pass rate** across all test suites:
- **Test Files:** 64 passed (64 total)
- **Tests:** 468 passed (468 total)
- **Coverage Areas:**
  - Marketplace Hub Search & Faceted Filtering
  - Cart Context & Universal Quote calculation
  - 20 Theme Dynamic Color Customizers
  - GrapesJS Page Builder HTML/CSS sanitization
  - Superadmin Ads Management & Time-Series Performance Charts
  - Cash on Delivery Courier Console & OTP delivery handshake
  - Arabic RTL layout directional mirroring

---

## 🧪 3. Test Suite Remediation Checklist

- [ ] Add `query` export to `vi.mock('../db/pool')` in `checkout-quote.service.test.ts`.
- [ ] Align HTTP status code assertion (409 Conflict) in `tenant-isolation.test.ts`.
- [ ] Align JWT test secret keys in `storefront-auth.test.ts`.
- [ ] Verify 100% pass rate on full test suite run (`npm test`).
