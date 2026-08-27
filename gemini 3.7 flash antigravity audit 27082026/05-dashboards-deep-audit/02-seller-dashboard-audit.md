# 02 — Seller Merchant Dashboard Deep Audit

## 1. Scope & Navigation Topology (`frontend/src/app/hub/dashboard/*`)

The Seller Dashboard is the operational control center for Tunisian merchants:

```
frontend/src/app/hub/dashboard/
├── page.tsx                   # Overview KPI cards, setup progress checklist, sales charts
├── onboarding/                # Guided step-by-step launch wizard
├── products/                  # Product catalog (Physical, Digital, License Key, Service, Bundles)
├── categories/                # Storefront internal category management
├── media/                     # Store asset gallery & image uploader
├── orders/                    # Order processing, fulfillment tracking, PDF invoices, delivery proofs
├── financial/ & wallet/       # Escrow balance, available vs pending funds, payout requests
├── kyc/                       # CIN & Registre de Commerce upload interface
├── settings/                  # Store basics, custom domains, social links, contact info
├── subscription/              # Plan upgrade, feature gating, add-on purchases, invoice history
├── ai/                        # Gemini AI copywriter, product tagger & token usage
├── api-keys/ & webhooks/      # REST API credentials for ERP/POS sync & HMAC webhooks
├── payment-config/            # Direct gateway credentials configuration (Pro+ plans)
├── support/                   # Support tickets & direct communication with marketplace admins
├── messages/                  # Real-time chat with buyers
├── page-builder/ & themes/    # GrapesJS visual editor & theme customization
└── ads/                       # PandaMarket Ads campaign wizard, boost actions & performance
```

---

## 2. Deep Audit of Merchant Workflows

### 2.1 Onboarding & Launch Checklist
- **Current State:** Backend supports `onboarding_state` JSONB. The dashboard calculates launch progress (Branding, Theme, Products, KYC, Published).
- **Missing Work (P1 Priority):** An interactive guided tour modal that walks new sellers through their initial setup step-by-step upon first login.

### 2.2 Order Fulfillment & Delivery Handshake
- **Fulfillment States:** `unfulfilled` ➔ `processing` ➔ `shipped` ➔ `delivered` / `cancelled` / `refunded`.
- **Courier & Proof:** Sellers can enter tracking numbers, generate downloadable PDF invoices, and attach delivery proof photos (`pd_delivery_proof`).

### 2.3 Financial Escrow & Payouts
- **Escrow Mechanics:** Net revenues (gross - commission) are credited to `pd_vendor_wallet` as `balance_pending`.
- **Retention Period:** Funds become `balance_available` after a retention window (default: 3 days for verified sellers, 7 days for new sellers).
- **Payouts:** Sellers can request manual bank/postal withdrawals or configure automatic monthly payout sweeps.

---

## 3. Seller Dashboard Checklist

- [x] Multi-store selector for vendors owning multiple shops.
- [x] Real-time setup readiness progress calculator.
- [x] Full product CRUD with image upload and Sharp compression.
- [x] Escrow wallet balance and payout request workflow.
- [ ] Finalize the full 6-step interactive Onboarding Wizard modal.
- [ ] Add CSV product import/export with column mapping.
