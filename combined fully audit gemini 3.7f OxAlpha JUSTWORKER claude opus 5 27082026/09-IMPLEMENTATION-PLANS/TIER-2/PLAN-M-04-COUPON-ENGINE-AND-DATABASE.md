# Engineering Specification: PLAN-M-04
## Real Dynamic Coupon Engine (`pd_coupon`), Usage Limits & Admin Creator

- **Target PRD Gap:** [M-04](../../04-MISSING-WORK-PRD/M-01-TO-M-06-CORE-COMMERCE.md#m-04)
- **Severity:** 🟡 PRD Gap / Core Marketing Engine
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** Database Schema, Coupon Service, Cart & Checkout Quote, Admin & Seller UI.

---

### 1. Summary & Business Impact
Coupons are currently hardcoded in `CartContext.tsx` and `checkout-quote.service.ts`. Merchants cannot create promotional campaigns, set maximum usage counts, restrict coupons to specific stores or categories, or enforce expiration dates. This plan implements the `pd_coupon` schema, redemption tracker table, and seller/admin management interfaces.

---

### 2. Database Schema
```sql
CREATE TABLE IF NOT EXISTS pd_coupon (
  id TEXT PRIMARY KEY,
  store_id TEXT REFERENCES pd_store(id) ON DELETE CASCADE, -- NULL = platform-wide
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value NUMERIC(10, 3) NOT NULL,
  min_order_amount NUMERIC(10, 3) DEFAULT 0,
  max_discount_amount NUMERIC(10, 3),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pd_coupon_redemption (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES pd_coupon(id),
  order_id TEXT NOT NULL REFERENCES pd_order(id),
  user_id TEXT REFERENCES pd_user(id),
  discount_applied NUMERIC(10, 3) NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/coupon-service.test.ts
```
