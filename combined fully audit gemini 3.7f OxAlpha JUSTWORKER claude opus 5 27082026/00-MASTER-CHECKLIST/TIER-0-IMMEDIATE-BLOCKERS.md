# Tier 0 · Immediate Financial & Build Blockers (Days 1–2)

> **Execution Standard:** Mark items `[x]` with commit hash. ⚡ = <1 hour. 🛠 = 1–3 hours.

- [ ] **[P0-1]** ⚡ **Fix Backend Compilation:** Add `import retentionRouter from './api/retention.route';` in `backend/src/main.ts:58` and apply `validate(rewardsLeadSchema)` in `backend/src/api/retention.route.ts:32`. Verify with `npm run type-check -w backend`.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-A-BUILD-AND-REWARDS.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-A-BUILD-AND-REWARDS.md)
- [ ] **[P0-2]** 🛠 **Credit Wallets on Payment Capture:** Emit `PdEvent.PAYMENT_CAPTURED` in `payment.service.ts:993` and `payment-reconciliation.service.ts:325`. Add idempotency check in `order.subscriber.ts`.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-C-EVENT-BUS-WIRING.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-C-EVENT-BUS-WIRING.md)
- [ ] **[P0-3]** 🛠 **Separate Storefront Customer Tokens:** Add `token_type: 'storefront_customer'` claim; reject in `requireAuth`; verify store ownership in `socket.gateway.ts`.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-B-STOREFRONT-TOKEN-ISOLATION.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-B-STOREFRONT-TOKEN-ISOLATION.md)
- [ ] **[P0-4]** 🛠 **Fix Custom Domain & TLS Verification:** Delete mock token bypass in `domain-verification.service.ts`, assert verified `pd_store_domain` row, and enforce plan limits.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-D-DOMAIN-TLS-VERIFICATION.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-D-DOMAIN-TLS-VERIFICATION.md)
- [ ] **[P0-5]** ⚡ **Prevent Ads Balance Minting:** Remove balance mutation from `checkAndTriggerAutoRefill` in `ads.service.ts:512`; reject `auto_refill_enabled: true` in Zod schema.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-E-ADS-BALANCE-PROTECTION.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-E-ADS-BALANCE-PROTECTION.md)
- [ ] **[P0-6]** 🛠 **Enforce SuperAdmin Settings Guard:** Move section ACL into `platformConfigService.updateSettings`; delete flat `PUT /admin/settings`.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-F-SETTINGS-SECURITY-GUARD.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-F-SETTINGS-SECURITY-GUARD.md)
- [ ] **[P0-7]** 🛠 **Fix Mandat Receipt Review:** Replace raw SQL update in `payment.route.ts:466` with `orderService.markPaidInTransaction`, verify gateway, allow re-upload on reject, and emit `PAYMENT_CAPTURED`.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-G-MANDAT-RECEIPT-REVIEW.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-G-MANDAT-RECEIPT-REVIEW.md)
- [ ] **[P0-8]** ⚡ **Install `nodemailer` Dependency:** Run `npm install nodemailer -w backend`.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md)
- [ ] **[P0-9]** ⚡ **Enforce Webhook HMAC Unconditionally:** Remove `config.env === 'production'` guard in `payment.route.ts:216,247`. Add dedicated webhook secrets.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md)
- [ ] **[P0-10]** ⚡ **Sanitize AI HTML XSS Sinks:** Wrap `smartFillSuggestions` in `dashboard/products/page.tsx:6923` and `selectedJob.output` in `AiCostsDashboard.tsx:3080` with `DOMPurify.sanitize`.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md)
- [ ] **[P0-11]** ⚡ **Untrack Secret File:** Run `git rm --cached env-vars.json` and add to `.gitignore`.
  - *Guide:* [`../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md`](../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md)
