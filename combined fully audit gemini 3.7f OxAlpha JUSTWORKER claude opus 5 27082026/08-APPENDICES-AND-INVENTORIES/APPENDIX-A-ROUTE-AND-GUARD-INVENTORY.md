# Appendix A · Route & Guard Inventory

[← Index](./00-README.md) · Next: [Appendix B](./B-DATABASE-FINDINGS.md)

Inventory of mutating endpoints, route guards, CSRF status, and rate limiters across the Express backend.

## 1. Summary of Mutating Routes (225 Routes)
- **Protected by `requireAuth`:** 192 routes
- **Protected by `requireAdmin` / `requireSuperAdmin`:** 58 routes
- **Protected by `requireStore`:** 64 routes
- **Public Mutating Endpoints (Intended):**
  - `POST /api/pd/auth/login`
  - `POST /api/pd/auth/register`
  - `POST /api/pd/storefront/auth/register`
  - `POST /api/pd/storefront/auth/login`
  - `POST /api/pd/cart/sync` (exempt from CSRF)
  - `POST /api/pd/payment/webhook/*` (exempt from CSRF, HMAC signature verified)
- **Suspect / Unguarded Mutating Routes:**
  - `POST /shipping/smart-quotes` (No auth, no CSRF)
  - `POST /shipping/rates` (No auth, no CSRF)
  - `POST /page-builder/event` (No auth, unthrottled analytics ingest)

## 2. CSRF Skip-List Analysis
In `middlewares/csrf.middleware.ts`:
- Uses substring match `req.path.includes('/callback')`, `req.path.includes('/cart/sync')`.
- Risk: Any future route containing `/callback` silently bypasses CSRF checks.
- Recommendation: Strict prefix matching.
