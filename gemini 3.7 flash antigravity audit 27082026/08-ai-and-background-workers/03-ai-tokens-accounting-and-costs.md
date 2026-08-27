# 03 — AI Tokens Accounting, Quotas & Cost Telemetry

## 1. AI Quota & Consumption Model

PandaMarket enforces subscription-based AI quotas with pay-as-you-go credit extensions:

| Subscription Plan | Monthly Free AI Actions | Extra Token Cost | Custom API Key Support |
| :--- | :---: | :---: | :---: |
| **Free** | 0 | Token Pack Required | ❌ |
| **Starter** | 20 | Token Pack Required | ❌ |
| **Regular** | 50 | Token Pack Required | ❌ |
| **Agency** | 200 | Token Pack Required | ❌ |
| **Pro** | Unlimited | Included | ✅ (Bring Own Key) |
| **Golden** | Unlimited | Included | ✅ (Bring Own Key) |
| **Platinum** | Unlimited | Included | ✅ (Bring Own Key) |

---

## 2. Token Accounting Architecture (`CreditsService`)

1. **Credit Balances (`pd_vendor_credits`):** Stores token balances per store (`balance_tokens`, `total_purchased`, `total_consumed`).
2. **Quota Check Flow:**
   - Pro/Golden/Platinum tiers bypass token deductions.
   - For other tiers, `creditsService.deductTokens(storeId, cost)` executes an atomic decrement in PostgreSQL. If tokens < cost, throws `PdPlanRequiredError`.
3. **Purchasable Token Packs (`pd_ai_token_pack`):** Sellers can refill tokens via Flouci/Konnect (e.g. 100 Tokens = 10 TND, 500 Tokens = 40 TND).

---

## 3. Superadmin AI Cost Telemetry (`/ai-costs`)

The Superadmin dashboard tracks real-time Gemini API expenditures:
- **Metrics Computed:** Total Input Tokens, Total Output Tokens, Estimated API Cost (USD/TND), Cost per Store, Cost per Action Type (SEO Copy vs Tagging).
- **Margin Analysis:** Compares token pack revenue vs raw Google Gemini API billing costs to ensure positive unit economics.

---

## 4. AI Accounting Checklist

- [x] Unlimited tier bypass logic for Pro, Golden, and Platinum tiers.
- [x] Atomic token deduction with balance enforcement.
- [x] Token pack purchase flow via local payment gateways.
- [x] Superadmin real-time AI cost telemetry view.
- [ ] Add automated low-token email alerts to merchants.
