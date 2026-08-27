# 04 — Security, Authentication & Role-Based Access Control (RBAC)

## 1. Authentication Architecture & Token Lifecycles

PandaMarket enforces strict, defense-in-depth authentication mechanisms separating platform users from tenant-scoped storefront customers:

```mermaid
graph LR
    subgraph Platform Auth (Hub / Seller / Admin)
        UserCredentials[User Email & Password] --> AuthService[AuthService.login()]
        AuthService --> JWT1[JWT Access Token pd_at - 15 min]
        AuthService --> Refresh1[Refresh Token pd_rt - 7 days]
    end

    subgraph Storefront Customer Auth (Scoped to Store)
        CustomerCredentials[Customer Email & Password] --> StoreAuthService[StorefrontAuthService.login()]
        StoreAuthService --> JWT2[Store Customer Token pd_st_at - 15 min]
        StoreAuthService --> Refresh2[Store Refresh Token pd_st_rt - 7 days]
    end
```

### 1.1 Dual Token Boundary
- **Platform Tokens (`pd_at` / `pd_rt`):** Issued to Superadmins, Vendors, and Central Marketplace Buyers. Valid across `pandamarket.tn` and `admin.pandamarket.tn`.
- **Storefront Tokens (`pd_st_at` / `pd_st_rt`):** Issued to individual store shoppers. Cryptographically bound to `store_id`. A session on `boutique1.garbage.team` cannot access or impersonate customer data on `boutique2.garbage.team`.

### 1.2 Two-Factor Authentication (2FA) & Account Lockout
- **TOTP 2FA Support:** `pd_user.two_factor_enabled` with challenge token exchange. Mandatory for Superadmin roles.
- **Account Lockout:** Redis-backed brute-force protection (locks account for 15 minutes after 5 consecutive failed attempts).
- **Refresh Token Rotation:** Every `/refresh` call invalidates the prior refresh token hash in `pd_user` and issues a fresh pair.

---

## 2. Role-Based Access Control (RBAC) Matrix

| User Role | Hub Discovery | Buyer Account | Storefront Customization | Seller Dashboard | Ads Manager | Superadmin Panel | KYC Review | System Logs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Anonymous** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Customer** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Store Customer** | ❌ (Store only) | ✅ (Store only) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Vendor** | ✅ | ✅ | ✅ (Own Store) | ✅ (Own Store) | ✅ (Own Store) | ❌ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SuperAdmin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Cryptographic Security Standards

1. **Password Hashing:** `bcryptjs` with salt rounds = 12.
2. **Secrets & API Keys Encryption:** `AES-256-GCM` with initialization vector (IV) and authentication tag (AAD) validation.
3. **Webhook Verification:** `HMAC-SHA256` computed over raw incoming byte buffers.
4. **Idempotency Fingerprinting:** `SHA-256` hashing over order bindings, quote versions, and payment amounts.

---

## 4. Security Audit Checklist

- [x] Strict tenant isolation on all database mutations (`WHERE store_id = $x AND owner_id = $y`).
- [x] Zero plaintext storage of payment credentials or third-party API keys.
- [x] Refresh token rotation and instant revocation on logout.
- [x] Brute-force rate limiting on `/login` and `/register`.
- [ ] Add WebAuthn / Passkey support for Superadmin biometric login.
