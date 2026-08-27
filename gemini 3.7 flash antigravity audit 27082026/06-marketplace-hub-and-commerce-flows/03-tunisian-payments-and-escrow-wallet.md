# 03 — Tunisian Payment Gateways & Escrow Wallet Engine

## 1. Supported Payment Gateways

PandaMarket integrates payment methods tailored for the Tunisian market:

| Gateway | Integration Method | Currency & Units | Webhook Signature | Mode |
| :--- | :--- | :--- | :--- | :--- |
| **Flouci** | REST API + Webhooks | TND (Millimes) | HMAC-SHA256 Secret | Escrow or Direct |
| **Konnect** | REST API + Webhooks | TND (1 TND = 1000 Millimes) | HMAC-SHA256 Secret | Escrow or Direct |
| **Mandat Minute** | Manual Postal Receipt Upload | TND | Manual Superadmin Review | Escrow |
| **Cash on Delivery (COD)** | Courier Handshake / OTP | TND | Physical Handover | Escrow |
| **PayPal** | REST API v2 | EUR / USD (with FX Rate) | Webhook Signature API | International |

---

## 2. Escrow vs Direct Payment Modes

```mermaid
graph TD
    subgraph Escrow Mode (Default for Free/Starter/Regular/Agency)
        Buyer1[Buyer Payment] --> PlatformAccount[PandaMarket Central Account]
        PlatformAccount --> CalcComm[Calculate Platform Commission]
        CalcComm --> WalletPending[Credit Seller Wallet pending_balance]
        WalletPending --> Retention[Hold for Retention Period: 3-7 Days]
        Retention --> WalletAvail[Move to available_balance]
        WalletAvail --> Withdrawal[Seller Requests Bank/Postal Withdrawal]
    end

    subgraph Direct Mode (Pro, Golden, Platinum Plans)
        Buyer2[Buyer Payment] --> DecryptCreds[Decrypt Seller's Own Flouci/Konnect API Keys]
        DecryptCreds --> SellerAccount[Direct Settlement to Seller's Bank Account]
    end
```

---

## 3. Financial Mechanics & Precision

- **Tunisian Millimes Precision:** Tunisian Dinar uses 3 decimal places ($1.000\text{ TND} = 1000\text{ Millimes}$).
- **Money Utility:** `toMinorUnits(amount, 'TND')` converts TND to integer millimes to prevent JavaScript IEEE 754 floating-point rounding errors.
- **Payment Idempotency:** `pd_payment_event` enforces `UNIQUE(gateway, gateway_event_id)` to ensure duplicate webhook deliveries are safely ignored.

---

## 4. Payment & Wallet Checklist

- [x] Flouci REST API integration with HMAC verification.
- [x] Konnect REST API integration with millimes unit conversion.
- [x] Mandat Minute manual review queue with receipt photo viewer.
- [x] Escrow wallet balance calculations with `SELECT FOR UPDATE` locking.
- [ ] Add automated Konnect card tokenization for instant auto-refill and subscriptions.
