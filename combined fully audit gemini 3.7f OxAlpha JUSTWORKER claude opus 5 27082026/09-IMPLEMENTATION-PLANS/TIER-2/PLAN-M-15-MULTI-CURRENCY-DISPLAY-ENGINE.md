# Engineering Specification: PLAN-M-15
## Multi-Currency Display Engine (TND Base with EUR, USD & SAR Preview)

- **Target PRD Gap:** [M-15](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-15)
- **Severity:** 🟡 PRD Gap / International Buyers & Diaspora
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Currency Service, Product Display, Storefront Header, Exchange Rate Worker.

---

### 1. Summary & Business Impact
Tunisian diaspora in France, Europe, and the Gulf frequently purchase gifts for relatives in Tunisia or buy artisanal products. The platform requires multi-currency display (EUR, USD, SAR) while strictly settling in Tunisian Dinar (TND) at checkout in compliance with Banque Centrale de Tunisie (BCT) exchange regulations.

---

### 2. Implementation Details
1. Daily cron worker fetches official BCT exchange rates from public exchange API.
2. Store rates in Redis with 24-hour TTL: `rates:TND:EUR`, `rates:TND:USD`.
3. Client CurrencyContext allows visitors to toggle preferred display currency.
4. Cart and PDP display estimated conversion: `"45.000 TND (≈ 13.50 €)"`.
5. Payment checkout explicitly locks settlement to TND.

---

### 3. Verification Plan
```bash
npm run test -w frontend -- src/__tests__/currency-converter.test.tsx
```
