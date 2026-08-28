# 01 — Master Action Plan & Consolidated TODO Checklist

This is the comprehensive, phase-by-phase master execution checklist for PandaMarket, combining security fixes, missing feature implementations, and strategic platform enhancements.

---

## 📋 Phase 1: Security Hardening, Reliability & Test Alignment

- [x] **1.1 Cookie Security Synchronization:** Refactor `setAccessCookie` and `setRefreshCookie` across `backend/src/api/auth.route.ts` and `backend/src/api/storefront-auth.route.ts` to check `config.env === 'production'` instead of raw `process.env.PD_NODE_ENV`.
- [x] **1.2 Gateway Stub Hardening:** Add strict live credential checks to `backend/src/plugins/payment/d17.provider.ts` and `backend/src/plugins/payment/sobflous.provider.ts` to prevent accidental auto-captures.
- [x] **1.3 Backend Vitest Mock Alignment:** Update `backend/src/__tests__/checkout-quote.service.test.ts` to export `query` from the `../db/pool` mock.
- [x] **1.4 Status Code Assertion Sync:** Align HTTP 403 status code expectation in `backend/src/__tests__/tenant-isolation.test.ts`.
- [x] **1.5 Edge Middleware Hostname Normalization:** Add `.toLowerCase().trim().replace(/\.+$/, '')` to `storeHost` extraction in `frontend/src/middleware.ts`.

---

## 📋 Phase 2: Seller Experience & Guided Onboarding Wizard

- [x] **2.1 Onboarding Tour UI:** Build an interactive 6-step modal tour component on `/hub/dashboard` (`Store Basics`, `Theme Selection`, `KYC Upload`, `First Product`, `Payment Setup`, `Store Launch`).
- [x] **2.2 Progress Persistence:** Connect step actions to `PATCH /api/pd/auth/onboarding` and store completion state in `pd_user.onboarding_state`.
- [x] **2.3 Header Quick-Resume Widget:** Add a progress bar widget in the Seller Dashboard header with direct links to uncompleted steps.
- [ ] **2.4 Product Import/Export:** Add CSV/Excel bulk product import with column mapping and validation preview.

---

## 📋 Phase 3: Social Media Auto-Posting & Automation Worker

- [x] **3.1 Social Accounts Schema:** Create SQL migration adding `pd_social_account` (storing encrypted OAuth tokens) and `pd_social_post` (scheduling ledger).
- [ ] **3.2 OAuth Handshake Integrations:** Implement OAuth 2.0 connection routes for Facebook Pages, Instagram Business, TikTok, and LinkedIn.
- [x] **3.3 AI Social Post Composer:** Add Gemini-powered social caption generator in the Seller Dashboard with hashtag recommendations in French and Arabic.
- [ ] **3.4 Auto-Publishing Worker:** Create `social-post.worker.ts` with BullMQ to auto-publish new product listings to connected social channels.

---

## 📋 Phase 4: Storefront Analytics & Tracking Taxonomy

- [x] **4.1 Per-Store Analytics Settings:** Add configuration fields in Seller Dashboard Settings (`ga4_measurement_id`, `meta_pixel_id`, `tiktok_pixel_id`, `gtm_container_id`).
- [x] **4.2 Scoped Storefront Script Injection:** Build `StorefrontAnalyticsTracker.tsx` injecting scripts dynamically based on resolved store domain.
- [x] **4.3 Standard E-Commerce Events:** Emit standard events (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`) across theme templates and cart.
- [x] **4.4 Consent Mode v2 Banner:** Add multilingual cookie consent banner supporting Google Consent Mode v2.

---

## 📋 Phase 5: Marketplace Hub Templates & Discovery Expansion

- [x] **5.1 Amazon-Style Department Mega-Menu:** Build multi-level department hover flyout menu listing all 24 parent categories and subcategories.
- [x] **5.2 Top Utility Bar:** Add localized delivery selector, currency/language toggle, and quick orders shortcut.
- [x] **5.3 Recently Viewed Rail:** Build horizontal product carousel synced via client localStorage with standard GA4/Meta view_item events.
- [ ] **5.4 Wholesale B2B Template:** Add volume tier price tables and Request for Quotation (RFQ) modal for wholesale sellers.

---

## 📋 Phase 6: Support SLA Engine, RMA & Return Workflow

- [x] **6.1 Support SLA Breach Engine:** Implement BullMQ cron monitoring ticket response times and auto-escalating overdue tickets to Superadmin.
- [ ] **6.2 Real-time Thread Updates:** Connect Socket.IO gateway to support ticket discussion threads for live updates.
- [ ] **6.3 Customer Return / RMA Flow:** Create buyer return request interface (`pd_order_refund`) with photo upload, seller review, and courier return pickup dispatch.
- [ ] **6.4 Multi-Warehouse Inventory:** Add multi-location stock tracking with low-stock email triggers.

---

## 📋 Phase 7: Cloudflare R2 Migration & Search Optimization

- [ ] **7.1 Cloudflare R2 Provisioning:** Configure R2 production bucket and custom CDN domain `cdn.pandamarket.tn`.
- [ ] **7.2 Zero-Egress Switch:** Set `PD_R2_ACCOUNT_ID`, `PD_R2_ACCESS_KEY_ID`, and `PD_R2_BUCKET` in production environment secrets.
- [ ] **7.3 Meilisearch Index Activation:** Provision Meilisearch instance with Tunisian Derja / French / Arabic synonym dictionaries and vector embeddings.
- [ ] **7.4 COD Fraud Radar Scoring:** Activate phone prefix and address risk scoring with automated SMS/WhatsApp OTP verification.
