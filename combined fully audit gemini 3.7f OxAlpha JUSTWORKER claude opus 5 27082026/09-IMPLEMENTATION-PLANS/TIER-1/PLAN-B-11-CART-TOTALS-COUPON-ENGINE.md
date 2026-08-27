# Engineering Specification: PLAN-B-11
## Centralize Cart Calculations & Coupons to Server-Authoritative Quote Engine

- **Target Bug:** [B-11](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-11-TO-B-16-COMMERCE-GAPS.md#b-11)
- **Severity:** 🟠 P1 (Discrepancies in Cart Totals & Coupon Calculation)
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** CartContext, Hub Cart, Storefront Cart, Checkout Quote Service.

---

### 1. Summary & Business Impact
Cart totals, shipping discounts, and coupon validations are independently implemented across 4 separate locations: `CartContext.tsx`, `hub/cart/page.tsx`, `store/[storeHost]/cart/page.tsx`, and `checkout-quote.service.ts`. 
Hardcoded coupon codes (`CHANCE5DT`, `LIVRAISON_ZERO`, `PANDA10`, `SUPER15`, `FIDELITE5`) and hardcoded shipping (`SHIPPING_PER_VENDOR = 7`) lead to scenarios where the cart page displays one price, but the checkout page displays a different total based on the server quote.

---

### 2. Proposed Changes & Exact Diffs

#### A. Centralize on `POST /api/pd/cart/quote`
Make the existing hook `useCheckoutQuote` authoritative for both cart and checkout:
1. In `CartContext.tsx`: Remove local calculation methods `recalculateDiscounts` and hardcoded `COUPONS` record.
2. When items or coupons change, query `POST /api/pd/cart/quote` to fetch verified line items, discounts, shipping fees, and subtotal.
3. Both Hub Cart and Storefront Cart read totals from the returned quote payload.

---

### 3. Automated Verification Plan
```bash
npm run test -w frontend -- src/__tests__/cart-quote.test.tsx
npm run test -w backend -- src/__tests__/checkout-quote.test.ts
```
