## Guide B · Separate Storefront Customer Tokens from Marketplace Users (P0-3)
**Files:** `backend/src/utils/jwt.ts`, `backend/src/middlewares/index.ts`, `backend/src/gateways/socket.gateway.ts`

### Step 1: Add Token Type Claim to Storefront Customer JWTs
In `backend/src/utils/jwt.ts`:
```ts
export function signStorefrontCustomerToken(customer: StorefrontCustomerPayload): string {
  return jwt.sign(
    {
      ...customer,
      token_type: 'storefront_customer',
    },
    config.jwtSecret,
    { expiresIn: '15m' }
  );
}
```

### Step 2: Reject Storefront Tokens in Marketplace `requireAuth`
In `backend/src/middlewares/index.ts:83`:
```ts
if ((req.user as any)?.token_type === 'storefront_customer') {
  throw new PdAuthenticationError(PdErrorCode.AUTH_UNAUTHORIZED, 'Invalid token context');
}
```
And in `requireStorefrontCustomer`:
```ts
if ((req.storefrontCustomer as any)?.token_type !== 'storefront_customer') {
  throw new PdAuthenticationError(PdErrorCode.AUTH_UNAUTHORIZED, 'Invalid storefront token');
}
```

### Step 3: Assert Store Ownership in Socket Gateway
In `backend/src/gateways/socket.gateway.ts`:
```ts
const { rows } = await query('SELECT id FROM pd_store WHERE id = $1 AND owner_id = $2', [
  storeId,
  user.id,
]);
if (!rows[0]) {
  throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'User does not own store');
}
```

---
