# Fully Actionable Implementation TODO Checklist: ReGo Dashboard Theme

This checklist details every concrete engineering task required to implement the **ReGo Design System** across the entire PandaMarket platform, preserving all business logic and the raw content contract for **all 71 pages**.

---

## Phase 1: CSS & Design Token Foundation

- [x] **1.1. CSS Variables Injection (`src/styles/globals.css`)**
  - [x] Register `:root[data-theme="rego"]`, `[data-seller-theme="rego"]`, `[data-admin-theme="rego"]` with `--rego-bg`, `--rego-surface`, `--rego-border`, `--rego-accent`.
  - [x] Implement derived OKLCH formulas (`--rego-text`, `--rego-text-muted`, `--rego-surface-subtle`, `--rego-accent-soft`).
  - [x] Register `.dark` overrides for deep-slate high-contrast night mode.
  - [x] Register 6 regional accent classes (`.acc-rouge`, `.acc-ocre`, `.acc-olive`, `.acc-bleu`, `.acc-prune`, `.acc-charbon`).
  - [x] Register typography optical classes (`.ty-fort`, `.ty-clair`).
  - [x] Register density classes (`.den-comp`, `.den-air`).

- [x] **1.2. Tailwind Configuration & Token Mapping (`globals.css`)**
  - [x] Map semantic tokens and OKLCH color rules.
  - [x] Map border-radius tokens and card styling.
  - [x] Map elevation shadows and border definitions.

---

## Phase 2: React Component Primitives Construction

- [x] **2.1. Theme Switching Context & Hydration**
  - [x] Implement `DashboardStyleContext.tsx` with 3 styles (`classic`, `bento`, `rego`) and cookie sync (`pm_seller_theme`).
  - [x] Implement `AdminThemeContext.tsx` with 3 styles (`enterprise`, `command`, `rego`) and cookie sync (`pm_admin_theme`).
  - [x] Add `SellerThemeSwitcherDropdown` in `/hub/dashboard` header with 6 accent colorways.
  - [x] Add `AdminThemeSwitcherDropdown` in `/(admin)` header with 6 accent colorways.
  - [ ] Add interactive theme selector cards in `/hub/dashboard/settings` and `/(admin)/settings`.

- [x] **2.2. Core Visual Primitives**
  - [x] Build `<ReGoCard>` and `<ReGoSplitCard>` (`.cardsplit`).
  - [x] Build `<ReGoKpiHero>` with embedded sparkline support.
  - [x] Build `<ReGoAmtBox>` with millimes integer/decimal styling for Tunisian Dinars (`0.000 TND`).
  - [x] Build `<ReGoStatusChip>` (`.bchip-ok`, `.bchip-warn`, `.bchip-err`).
  - [x] Build `<ReGoDrawer>` slide-out panel with backdrop blur and escape key handling.
  - [x] Build `<ReGoModal>` focus-trapped dialog.
  - [x] Build `<DashboardPageWrapper>` enforcing the universal 8-layer anatomical layout order.

---

## Phase 3: Seller Dashboard ReGo Implementation (Pages 32 to 71)

### Section 1: Cockpit, Onboarding & Analytics (`SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md`)
- [x] **Page 32: Seller Cockpit** (`/hub/dashboard`)
  - [x] Apply ReGo modern layout with modular metrics and active orders feed (`SellerReGoCockpit.tsx`).
  - [x] Urgent COD Anti-Refus deck with 1-click verification (Call, SMS OTP, Confirmation).
  - [x] 4-carrier Tunisian SLA pipeline (Aramex, Rapid-Poste, Runex, First Delivery).
- [ ] **Page 33: Launch Checklist** (`/hub/dashboard/onboarding`)
  - [ ] Apply milestone stepper cards with progress percentage bar.
- [x] **Page 34: Store Analytics** (`/hub/dashboard/analytics`)
  - [x] Apply split-card charts (`AnalyticsReGoCockpit.tsx`), vector SVG trend lines, and top star products.

### Section 2: Catalog, Inventory & Media (`SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md`)
- [x] **Page 36: Products & Variants** (`/hub/dashboard/products`)
  - [x] Apply ReGo modern view (`ProductsReGoCockpit.tsx`) with thumbnail previews, low stock alert deck, and 1-click stock adjuster.
- [ ] **Page 37: Categories & Collections** (`/hub/dashboard/categories`)
  - [ ] Apply collection cards with automated tag rules.
- [ ] **Page 39: Media Library** (`/hub/dashboard/media`)
  - [ ] Apply multi-file drag-and-drop vault with image cropper.

### Section 3: Orders, Fulfillment & Courier Handshake (`SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md`)
- [x] **Page 40: Orders Fulfillment & COD Deck** (`/hub/dashboard/orders`)
  - [x] Apply ReGo modern view (`OrdersReGoCockpit.tsx`) with order status filters, COD Anti-Refus radar, and Tunisian carrier SLA dispatch.
- [ ] **Page 41: Buyer Chat & 1-Click COD** (`/hub/dashboard/messages`)
  - [ ] Apply three-pane conversation view with sticky order summary and 1-click COD confirmation button.
- [ ] **Page 71: Courier Mobile Handshake Console** (`/courier`)
  - [ ] Apply high-contrast mobile driver ledger with click-to-call and POD photo signature capture.

### Section 4: Wallet, Payouts & Store Payments (`SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md`)
- [x] **Page 42: Wallet & RIB Payouts** (`/hub/dashboard/wallet`)
  - [x] Apply ReGo modern view (`WalletReGoCockpit.tsx`) with wallet balance telemetry, ledger stream, and 20-digit Tunisian RIB Modulo 97 validation form.
- [ ] **Page 43: Financial Reports** (`/hub/dashboard/financial`)
  - [ ] Apply downloadable tax statement cards and TVA breakdown table.
- [ ] **Page 58: Store Payment Gateways** (`/hub/dashboard/payment-config`)
  - [ ] Apply toggle cards for COD, Flouci, Konnect, and PayPal credentials.

### Section 5: Online Storefront Builder (`SELLER_SEC05_ONLINE_STOREFRONT_BUILDER.md`)
- [ ] **Pages 44-52: Storefront Hub, Themes, CSS Customizer, Banners, Menus, Pages, SEO, Carriers**
  - [ ] Apply split-view visual customizer with responsive preview iframe (Desktop, Tablet, Mobile).
  - [ ] Apply drag-and-drop reordering handles for navigation links and hero slides.

### Section 6: Marketing, Ads, CRM & Loyalty (`SELLER_SEC06_MARKETING_ADS_CRM_LOYALTY.md`)
- [ ] **Pages 35, 38, 53, 69, 70: PandaAds, VIP Coupons, Customers Directory, Aliases**
  - [ ] Apply ad campaign budget calculator with ROAS slider and customer purchase history drawer.

### Section 7: AI Studio, Plans & Billing (`SELLER_SEC07_AI_STUDIO_SUBSCRIPTION_BILLING.md`)
- [ ] **Pages 54-57: AI Studio, Subscription Plans, Billing Methods, SaaS Invoices**
  - [ ] Apply AI prompt builder with tone selector pills and quota meters.

### Section 8: Disputes, Settings & Organization (`SELLER_SEC08_DISPUTES_SETTINGS_DEV_ORGANIZATION.md`)
- [ ] **Pages 59-68: Disputes, Identity, KYC Dossier, API Keys, Webhooks, Multi-Store**
  - [ ] Apply dispute dossier timeline, KYC document inspection viewer, and multi-store switcher.

---

## Phase 4: Superadmin Dashboard ReGo Implementation (Pages 1 to 31)

### Section 1: Overview & Analytics (`SUPERADMIN_SEC01_OVERVIEW_AND_TELEMETRY.md`)
- [x] **Page 1: Superadmin Overview** (`/dashboard`)
  - [x] Apply ReGo modern overview (`AdminReGoOverview.tsx`) with platform GMV, active stores, and escrow balance.
  - [x] KYC pending validation queue with 1-click review drawer.
  - [x] Bank withdrawal queue with 20-digit RIB Modulo-97 verification.
- [ ] **Pages 2-3: Platform Analytics, Sticky Notes**
  - [ ] Apply executive telemetry cards, microservice health tickers, and draggable sticky board.

### Section 2: Merchants, Users & Buyers (`SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md`)
- [x] **Pages 4-6, 31: Stores Overview, Users & Vendors, Buyers Directory, Vendor Shortcut**
  - [x] Apply store directory with domain tracking, subscription plans, captured GMV, and suspension modal (`AdminReGoStores.tsx`).
  - [x] Apply multi-role vendor account directory with store count telemetry, 2FA status, and password reset (`AdminReGoUsers.tsx`).
  - [x] Apply buyer accounts directory with order volume, spent TND, and inspection drawer (`AdminReGoBuyers.tsx`).

### Section 3: Finance, Escrow, KYC & Payouts (`SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md`)
- [x] **Pages 7-10: KYC Verifications, Mandats, RIB Disbursements, Refunds**
  - [x] Apply document inspection modal/drawer (CIN scan, RNE, phone OTP) with 1-click approval (`AdminReGoKyc.tsx`).
  - [x] Apply real bank disbursement and withdrawal queue manager (`AdminReGoWithdrawals.tsx`) with zero mock data.
  - [x] Apply Mandat Minute postal verification queue (`AdminReGoMandats.tsx`) with receipt preview and 1-click approval.
  - [x] Apply refund arbitration queue (`AdminReGoRefundReview.tsx`) with reason badges, drawer inspection, and 1-click decision gate.

### Section 4: Catalog, Taxonomy & Media (`SUPERADMIN_SEC04_CATALOG_TAXONOMY_MEDIA.md`)
- [ ] **Pages 11-13: Products Moderation, Category Hierarchy, Media CDN Vault**
  - [ ] Apply AI counterfeit risk score flags and multi-level category commission tree.

### Section 5: Support, Disputes, Fraud & Tickets (`SUPERADMIN_SEC05_SUPPORT_DISPUTES_FRAUD.md`)
- [ ] **Pages 14-16, 19, 28: Mediation Chat, Fraud Radar, Violations, Helpdesk**
  - [ ] Apply three-way mediation console and fraud heuristic threat feed.

### Section 6: Ads & Subscriptions (`SUPERADMIN_SEC06_ADS_SUBSCRIPTIONS_SAAS.md`)
- [ ] **Pages 17, 18, 20: PandaAds Global, SaaS Orders, Plans & Feature Limits**
  - [ ] Apply ad auction pricing rules and multi-plan tier limit editor.

### Section 7: Telemetry, AI Costs & Audit (`SUPERADMIN_SEC07_INFRASTRUCTURE_AUDIT_LOGS.md`)
- [ ] **Pages 21-25: AI Token Telemetry, Admin/Seller/Buyer Audits, System Health Logs**
  - [ ] Apply Gemini token quota gauges and immutable security event logs.

### Section 8: Configuration, CMS & Communications (`SUPERADMIN_SEC08_CONFIG_CMS_COMMUNICATIONS.md`)
- [ ] **Pages 26, 27, 29, 30: Platform Settings, SMTP Mail Dispatch, CMS Editor**
  - [ ] Apply dual-pane markdown editor with live Google SERP preview.

---

## Phase 5: Verification, Tunisian Localization & Quality Assurance

- [ ] **5.1. Millimes Currency Formatting**: Confirm `0.000 TND` formatting across all price tags and ledgers.
- [ ] **5.2. 24 Governorates Coverage**: Confirm all 24 Tunisian Governorates are present in all dropdowns and rate simulators.
- [ ] **5.3. 20-Digit RIB Validation**: Confirm Modulo 97 checksum validator is active on all payout forms.
- [ ] **5.4. COD Anti-Refus Verification**: Confirm SMS OTP and anti-refus score badges are functional.
- [ ] **5.5. Multi-Theme Switching Stress Test**: Switch dynamically between Bento, Classique, and ReGo with zero visual breakdown.
