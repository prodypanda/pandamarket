# Fully Actionable Implementation TODO Checklist: ReGo Dashboard Theme

This checklist details every concrete engineering task required to implement the **ReGo Design System** across the entire PandaMarket platform, preserving all business logic and the raw content contract for **all 71 pages**.

---

## Phase 1: CSS & Design Token Foundation

- [ ] **1.1. CSS Variables Injection (`src/styles/globals.css`)**
  - [ ] Register `:root[data-theme="rego"]` with `--bg`, `--surface`, `--fg`, `--border`, `--accent`.
  - [ ] Implement derived OKLCH formulas (`--ink-2`, `--ink-3`, `--accent-soft`, `--accent-deep`, `--line-ink`).
  - [ ] Register `.dark` overrides for deep-slate high-contrast night mode.
  - [ ] Register 5 regional accent classes (`.acc-ocre`, `.acc-olive`, `.acc-bleu`, `.acc-prune`, `.acc-charbon`).
  - [ ] Register typography optical classes (`.ty-fort`, `.ty-clair`).
  - [ ] Register density classes (`.den-comp`, `.den-air`).

- [ ] **1.2. Tailwind Configuration Extension (`tailwind.config.js`)**
  - [ ] Map semantic color utilities (`bg-od-bg`, `text-od-fg`, `border-od-border`, `bg-od-accent`).
  - [ ] Map border-radius token `rounded-od`.
  - [ ] Map elevation shadows `shadow-od-s` and `shadow-od-2`.

---

## Phase 2: React Component Primitives Construction

- [ ] **2.1. Theme Switching Context & Hydration**
  - [ ] Implement `src/contexts/DashboardThemeProvider.tsx` with SSR cookie reading (`pm_seller_theme`, `pm_admin_theme`).
  - [ ] Prevent FOUC via `next/headers` cookie resolution in root layouts.
  - [ ] Add `SellerThemeSwitcher` dropdown in `/hub/dashboard` header.
  - [ ] Add `AdminThemeSwitcher` dropdown in `/(admin)` header.
  - [ ] Add interactive theme selector cards in `/hub/dashboard/settings` and `/(admin)/settings`.

- [ ] **2.2. Core Visual Primitives**
  - [ ] Build `<ReGoCard>` and `<ReGoSplitCard>` (`.cardsplit`).
  - [ ] Build `<ReGoKpiHero>` with embedded sparkline support.
  - [ ] Build `<ReGoAmtBox>` with millimes integer/decimal styling for Tunisian Dinars.
  - [ ] Build `<ReGoStatusChip>` (`.bchip-ok`, `.bchip-warn`, `.bchip-err`).
  - [ ] Build `<ReGoDataTable>` with sticky headers, checkbox selection, and pagination footer.
  - [ ] Build `<ReGoDrawer>` slide-out panel with backdrop blur.
  - [ ] Build `<ReGoModal>` focus-trapped dialog.
  - [ ] Build `<DashboardPageWrapper>` enforcing the universal 8-layer anatomical layout order.

---

## Phase 3: Seller Dashboard ReGo Implementation (Pages 32 to 71)

### Section 1: Cockpit, Onboarding & Analytics (`SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md`)
- [ ] **Page 32: Seller Cockpit** (`/hub/dashboard`)
  - [ ] Apply ReGo bento layout with modular metrics and active orders feed.
- [ ] **Page 33: Launch Checklist** (`/hub/dashboard/onboarding`)
  - [ ] Apply milestone stepper cards with progress percentage bar.
- [ ] **Page 34: Store Analytics** (`/hub/dashboard/analytics`)
  - [ ] Apply split-card charts (`cardsplit`) and 24-Governorate sales velocity map.

### Section 2: Catalog, Inventory & Media (`SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md`)
- [ ] **Page 36: Products & Variants** (`/hub/dashboard/products`)
  - [ ] Apply tabular view with thumbnail previews, SKU chips, and quick stock adjuster.
- [ ] **Page 37: Categories & Collections** (`/hub/dashboard/categories`)
  - [ ] Apply collection cards with automated tag rules.
- [ ] **Page 39: Media Library** (`/hub/dashboard/media`)
  - [ ] Apply multi-file drag-and-drop vault with image cropper.

### Section 3: Orders, Fulfillment & Courier Handshake (`SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md`)
- [ ] **Page 40: Orders Fulfillment & COD Deck** (`/hub/dashboard/orders`)
  - [ ] Apply order status filter pills, Tunisian carrier dispatch triggers, and anti-refus score badges.
- [ ] **Page 41: Buyer Chat & 1-Click COD** (`/hub/dashboard/messages`)
  - [ ] Apply three-pane conversation view with sticky order summary and 1-click COD confirmation button.
- [ ] **Page 71: Courier Mobile Handshake Console** (`/courier`)
  - [ ] Apply high-contrast mobile driver ledger with click-to-call and POD photo signature capture.

### Section 4: Wallet, Payouts & Store Payments (`SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md`)
- [ ] **Page 42: Wallet & RIB Payouts** (`/hub/dashboard/wallet`)
  - [ ] Apply wallet balance telemetry and 20-digit Tunisian RIB Modulo 97 validation form.
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
- [ ] **Pages 1-3: Overview, Platform Analytics, Sticky Notes**
  - [ ] Apply executive telemetry cards, microservice health tickers, and draggable sticky board.

### Section 2: Merchants, Users & Buyers (`SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md`)
- [ ] **Pages 4-6, 31: Stores Overview, Users & Vendors, Buyers Directory, Vendor Shortcut**
  - [ ] Apply multi-role user directory with permission matrix editor and suspension modals.

### Section 3: Finance, Escrow, KYC & Payouts (`SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md`)
- [ ] **Pages 7-10: KYC Verifications, Mandats, RIB Disbursements, Refunds**
  - [ ] Apply document inspection modal (CIN scan, RNE, RIB certificate) with 1-click approval.
  - [ ] Apply batch bank disbursement file generator (BIAT, BNA, Attijari, STB, Amen Bank).

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
