# P0-03 · STOREFRONT-TOKEN-BOUNDARY

### P0-3 · Storefront Customer Tokens Cross Tenant Boundary
- **Files:** `backend/src/services/storefront-auth.service.ts:283-312`, `backend/src/utils/jwt.ts`
- **Evidence:** Storefront customers receive JWTs carrying `store_id` that are accepted as vendor user tokens by marketplace `requireAuth`.
- **Root Cause:** No distinguishing `token_type` claim.
- **Fix Guide:** See [Guide B](../../06-IMPLEMENTATION-GUIDES/GUIDE-B-STOREFRONT-TOKEN-ISOLATION.md).
