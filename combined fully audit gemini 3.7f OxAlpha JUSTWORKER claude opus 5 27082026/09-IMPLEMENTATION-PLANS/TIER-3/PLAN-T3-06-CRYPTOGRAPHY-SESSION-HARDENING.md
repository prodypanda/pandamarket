# Engineering Specification: PLAN-T3-06
## Cryptographic Authentication Data (AAD) Binding & Session Hardening

- **Target Task:** [T3-06](../../00-MASTER-CHECKLIST/TIER-3-ARCHITECTURE-DEBT.md)
- **Severity:** 🟢 Defense-in-Depth Cryptographic Security
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Crypto Utility, Cookie Security, CSRF Tokens.

---

### 1. Summary & Business Impact
Encrypted fields (e.g. payment credentials, API tokens) use AES-256-GCM but omit Additional Authenticated Data (AAD). An attacker with database access could transpose a ciphertext block from one merchant's record into another. Binding the merchant's `store_id` as AAD prevents cross-record transposition attacks.

---

### 2. Implementation Details
1. Update `encrypt(text, aad?: string)` and `decrypt(ciphertext, aad?: string)`:
```ts
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
if (aad) cipher.setAAD(Buffer.from(aad));
```
2. Enforce `SameSite=Lax`, `Secure`, `HttpOnly` on all auth cookies.
3. Bind CSRF tokens cryptographically to the user session ID.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/crypto.test.ts
```
