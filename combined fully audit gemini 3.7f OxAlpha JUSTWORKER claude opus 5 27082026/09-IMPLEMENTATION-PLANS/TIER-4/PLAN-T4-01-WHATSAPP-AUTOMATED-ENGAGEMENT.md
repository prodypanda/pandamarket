# Engineering Specification: PLAN-T4-01
## WhatsApp Automated Order Tracking & Interactive Support Widget

- **Target Task:** [T4-01](../../00-MASTER-CHECKLIST/TIER-4-GROWTH-ROADMAP.md)
- **Severity:** 💡 Growth & Tunisian Market Feature
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** Notification Service, WhatsApp Gateway Adapter, Storefront Widget.

---

### 1. Summary & Business Impact
In Tunisia, WhatsApp is the dominant communication channel with near-100% open rates compared to <20% for email. Automating order confirmation messages, shipment tracking links, and delivery notifications via WhatsApp slashes unanswered delivery calls and builds immediate buyer trust.

---

### 2. Implementation Details
1. **Evolution API Integration:** Connects to `PD_WHATSAPP_GATEWAY_URL` with `PD_WHATSAPP_GATEWAY_TOKEN`.
2. **Automated Order Milestones:**
   - On Order Placed: Sends confirmation message with item summary and total.
   - On Order Shipped: Sends carrier tracking code and estimated delivery day.
   - On Out for Delivery: Sends delivery courier contact number.
3. **Storefront Interactive Widget:** Floating WhatsApp button pre-filling the seller's verified business number with the current product URL.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/whatsapp-notifications.test.ts
```
