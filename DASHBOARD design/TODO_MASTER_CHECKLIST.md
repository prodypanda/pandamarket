# Master Implementation TODO Checklist: Multi-Theme Dashboards & OpenDesign Template

This checklist outlines the complete, step-by-step roadmap for implementing the multi-theme architecture and the incoming OpenDesign design across all 71 dashboard pages.

> [!IMPORTANT]
> **Implementation Rule**: Do NOT modify frontend code until the new OpenDesign design files are provided and reviewed. This checklist prepares the exact sequence of execution.

---

## Phase 0: Design Ingestion & Theme Architecture Foundation

- [ ] **0.1. OpenDesign Project Asset Extraction**
  - [ ] Inspect the incoming OpenDesign design specifications and export design tokens (colors, typography, radii, shadows, spacing).
  - [ ] Inventory custom icon sets, illustrations, and vector assets.
  - [ ] Audit component primitives (buttons, inputs, select dropdowns, modals, badges, data tables, metric cards).

- [ ] **0.2. Dual Dashboard Theme Engine Setup**
  - [ ] Create `DashboardThemeProvider` supporting independent scopes for Seller and Superadmin.
  - [ ] Implement cookie-based hydration to eliminate SSR Flash of Unstyled Content (FOUC).
  - [ ] Implement LocalStorage fallback and user profile database synchronization.
  - [ ] Configure Tailwind CSS / CSS Variables for dynamic `data-seller-theme` and `data-admin-theme` attributes.

- [ ] **0.3. Theme Switcher UI Components**
  - [ ] Build `SellerThemeSwitcher` header dropdown component for `/hub/dashboard`.
  - [ ] Build `AdminThemeSwitcher` header dropdown component for `/(admin)`.
  - [ ] Add visual theme selection cards to `/hub/dashboard/settings` (Appearance tab).
  - [ ] Add visual theme selection cards to `/(admin)/settings` (Interface tab).

---

## Phase 1: Superadmin Dashboard Implementation (Pages 1 to 31)

### Section 1: Overview, Analytics & Operational Notes (`SUPERADMIN_SEC01_OVERVIEW_AND_TELEMETRY.md`)
- [ ] **Page 1: Superadmin Overview & Executive Telemetry**
  - [ ] Implement GMV, active merchants, total orders, and platform health telemetry cards.
  - [ ] Implement quick shortcut jumps and system alert ticker.
  - [ ] Support Mission Control, Enterprise Clean, and OpenDesign theme styles.
- [ ] **Page 2: Platform-wide Business & Sales Analytics**
  - [ ] Implement time-series sales velocity, cohort retention, and regional revenue by 24 Governorates.
  - [ ] Implement payment gateway volume breakdown (Flouci, Konnect, Postal Mandat, COD).
- [ ] **Page 3: Operational Notes & Sticky Reminders Board**
  - [ ] Implement color-coded sticky priority notes board with drag-and-drop or pin/archive states.

### Section 2: Merchants, Users & Buyers Management (`SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md`)
- [ ] **Page 4: Stores & Merchant Accounts Management**
  - [ ] Implement merchant store table with GMV, store status badges, KYC indicators, and commission tiers.
  - [ ] Implement store suspension / reactivation and manual tier upgrade modals.
- [ ] **Page 5: Platform Users & Vendors Directory**
  - [ ] Implement multi-role user directory (Superadmin, Moderator, Support, Vendor, Staff).
  - [ ] Implement role permission editor and 2FA enforcement toggles.
- [ ] **Page 6: Registered Buyers & Shoppers Directory**
  - [ ] Implement buyer accounts table with lifetime value, order frequency, and account status.
- [ ] **Page 31: Vendors Navigation Shortcut**
  - [ ] Verify instant redirection / alias link to vendor directory.

### Section 3: Finance, Escrow, KYC & Payouts (`SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md`)
- [ ] **Page 7: KYC Merchant Identity Verifications & Document Audit**
  - [ ] Implement document inspection modal (CIN scan, RNE commercial registry, RIB certificate).
  - [ ] Implement 1-click Approve / Reject with custom feedback notes.
- [ ] **Page 8: Postal Mandats & Offline Payment Proofs Review**
  - [ ] Implement postal receipt viewer and verification queue with transaction matching.
- [ ] **Page 9: Seller Wallet Payout Requests & Bank Disbursement**
  - [ ] Implement 20-digit Tunisian RIB Modulo 97 validation ledger.
  - [ ] Implement batch bank disbursement export (BIAT, BNA, Attijari, STB, Amen Bank, etc.).
- [ ] **Page 10: Buyer Refund Reviews & Escalations**
  - [ ] Implement refund dispute queue, escrow hold releases, and automated credit note issuance.

### Section 4: Catalog, Taxonomy & Media Storage (`SUPERADMIN_SEC04_CATALOG_TAXONOMY_MEDIA.md`)
- [ ] **Page 11: Marketplace Global Products Moderation & Catalog**
  - [ ] Implement product moderation queue with counterfeit risk flags and merchant attribution.
  - [ ] Implement bulk approve / reject / request edit actions.
- [ ] **Page 12: Global Category Tree Taxonomy & Commission Rates**
  - [ ] Implement multi-level category tree with per-category marketplace commission overrides.
- [ ] **Page 13: Platform Media Storage & CDN File Vault**
  - [ ] Implement storage quota telemetry, asset browser, and orphaned image cleanup utilities.

### Section 5: Support, Disputes, Fraud & Tickets (`SUPERADMIN_SEC05_SUPPORT_DISPUTES_FRAUD.md`)
- [ ] **Page 14: Superadmin Unified Support Chat & Dispute Mediation**
  - [ ] Implement three-party mediation chat (Admin, Seller, Buyer) with order context drawer.
- [ ] **Page 15: Fraud Reports & Platform Violations Queue**
  - [ ] Implement incident reporting queue with severity scoring and seller risk matrix.
- [ ] **Page 16: Dispute Dossier & Sanction Adjudication**
  - [ ] Implement full dispute timeline, evidence gallery, and binding verdict adjudication.
- [ ] **Page 19: Fraud Radar & High-Risk Transaction Engine**
  - [ ] Implement real-time risk heuristics, suspicious IP flagging, and abnormal COD refusal tracking.
- [ ] **Page 28: Platform Support Desk & Agent Tickets**
  - [ ] Implement ticket triage board, SLA timers, priority filters, and agent assignment.

### Section 6: Advertising & SaaS Subscriptions (`SUPERADMIN_SEC06_ADS_SUBSCRIPTIONS_SAAS.md`)
- [ ] **Page 17: PandaAds Global Campaign Management & Placement Pricing**
  - [ ] Implement ad auction rules, banner impression trackers, and CPC/CPM price managers.
- [ ] **Page 18: SaaS Subscription Orders & Invoicing**
  - [ ] Implement subscription billing order book, renewal statuses, and VAT invoice generators.
- [ ] **Page 20: SaaS Subscription Plans, Features & Tier Limits Management**
  - [ ] Implement plan feature matrix editor (Starter, Pro, Enterprise) with product/quota limits.

### Section 7: Telemetry, AI Costs & Audit Trails (`SUPERADMIN_SEC07_INFRASTRUCTURE_AUDIT_LOGS.md`)
- [ ] **Page 21: AI Usage Costs, Quotas & Token Consumption**
  - [ ] Implement model telemetry (Gemini 1.5 Flash, Pro) with token counts, cache hits, and budget limits.
- [ ] **Page 22: Administrator Security Audit Trail**
  - [ ] Implement immutable audit logs for administrative privilege actions and credential changes.
- [ ] **Page 23: Merchant & Vendor Administrative Audit Trail**
  - [ ] Implement merchant store modifications and payout request audit trails.
- [ ] **Page 24: Buyer Account Actions & Order Audit Trail**
  - [ ] Implement buyer order status changes, address updates, and dispute filing history.
- [ ] **Page 25: Server Infrastructure, API Errors & Performance Logs**
  - [ ] Implement real-time health monitors, Redis cache metrics, and error stack trace tailing.

### Section 8: Configuration, CMS & Communications (`SUPERADMIN_SEC08_CONFIG_CMS_COMMUNICATIONS.md`)
- [ ] **Page 26: Global Platform Configuration & Marketplace Settings**
  - [ ] Implement general marketplace settings, default TVA rates (7%, 13%, 19%), and maintenance toggle.
- [ ] **Page 27: SMTP Transactional Mail Server & Test Dispatch**
  - [ ] Implement SMTP credential configuration and real-time email dispatch tester.
- [ ] **Page 29: CMS Articles, Legal Policies & Blog Posts Directory**
  - [ ] Implement CMS content directory with category tags, publication status, and SEO ratings.
- [ ] **Page 30: CMS Article Editor, Markdown Preview & SEO Publishing**
  - [ ] Implement dual-pane markdown editor, image embedder, and OpenGraph social preview.

---

## Phase 2: Seller Dashboard Implementation (Pages 32 to 71)

### Section 1: Cockpit, Onboarding & Store Analytics (`SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md`)
- [ ] **Page 32: Seller Cockpit & Executive Business Summary**
  - [ ] Implement Bento Cockpit theme variant (modular widgets, live order feed, fast action dock).
  - [ ] Implement Classique E-Commerce theme variant (traditional summary, linear tables).
  - [ ] Implement OpenDesign theme variant (refined modernist aesthetic).
- [ ] **Page 33: Store Launch Checklist & Step-by-Step Onboarding Guide**
  - [ ] Implement progress bar, completed milestone badges, and dismissal persistence.
- [ ] **Page 34: Store Analytics, Traffic, Conversion & Sales Velocity**
  - [ ] Implement revenue trends, top performing products, traffic referral sources, and conversion funnel.

### Section 2: Products, Inventory & Media Library (`SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md`)
- [ ] **Page 36: Product Catalog, Inventory Adjuster & Variant Matrix**
  - [ ] Implement product table with thumbnail, SKU, stock level badges, price, and actions.
  - [ ] Implement quick inline stock adjuster and multi-variant creator (size, color, material).
- [ ] **Page 37: Store Product Categories & Custom Collections**
  - [ ] Implement custom collections manager with automatic product tagging rules.
- [ ] **Page 39: Store Media Library, Product Image Vault & Asset Uploader**
  - [ ] Implement multi-file drag & drop uploader, image cropper, and CDN URL copy utility.

### Section 3: Orders, Fulfillment, COD & Courier Handshake (`SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md`)
- [ ] **Page 40: Orders Fulfillment, Tunisian Courier Pipeline & Urgent COD Anti-Refus Deck**
  - [ ] Implement order status tabs (En attente, Confirmée, Expédiée, Livrée, Retournée/Refusée).
  - [ ] Implement Tunisian carrier dispatch generator (Aramex, Rapid-Poste, Runex, First Delivery).
  - [ ] Implement urgent COD anti-refus score deck with buyer confirmation triggers.
- [ ] **Page 41: Customer Direct Negotiation, Inquiry Chat & 1-Click COD Validation**
  - [ ] Implement real-time buyer negotiation chat with live order summary panel.
  - [ ] Implement 1-click COD order confirmation button directly in conversation view.
- [ ] **Page 71: Courier / Driver Mobile Delivery Handshake Console**
  - [ ] Implement driver mobile interface with click-to-call, GPS coordinates, and cash collection ledger.
  - [ ] Implement digital proof of delivery (POD signature / photo upload).

### Section 4: Wallet, Payouts & Store Payments (`SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md`)
- [ ] **Page 42: Seller Wallet, Balances & Tunisian 20-digit RIB Modulo 97 Payout Launcher**
  - [ ] Implement available balance, escrow pending balance, and payout history.
  - [ ] Implement withdrawal request modal with real-time 20-digit Tunisian RIB Modulo 97 checksum.
- [ ] **Page 43: Financial Reports, Invoicing & Tax Declarations**
  - [ ] Implement downloadable accounting summaries, monthly fee statements, and TVA breakdown.
- [ ] **Page 58: Merchant Store Payment Methods Setup (Flouci, Konnect, PayPal, COD)**
  - [ ] Implement payment method toggle cards (COD, Flouci merchant credentials, Konnect API keys).

### Section 5: Online Storefront, Themes & Page Builder (`SELLER_SEC05_ONLINE_STOREFRONT_BUILDER.md`)
- [ ] **Page 44: Online Storefront Hub & Domain Health Monitor**
  - [ ] Implement storefront status dashboard, SSL certificate indicator, and preview frame.
- [ ] **Page 45: Storefront Themes Gallery & Viewport Previews**
  - [ ] Implement theme gallery with desktop, tablet, and mobile device viewport switchers.
- [ ] **Page 46: Visual Theme Customizer, Brand Colors & Real-Time CSS Preview**
  - [ ] Implement color picker, font family selector, border radius presets, and live preview iframe.
- [ ] **Page 47: Homepage Sections Customizer (Hero, Banners, Grids)**
  - [ ] Implement drag-and-drop homepage block reordering, hero slide manager, and product carousels.
- [ ] **Page 48: Navigation Menus Builder (Header & Footer)**
  - [ ] Implement nested menu link editor with drag handles and target link selector.
- [ ] **Page 49: Drag & Drop Custom Landing Page Builder**
  - [ ] Implement custom content page editor (About Us, Contact, Privacy, Terms) with rich text.
- [ ] **Page 50: Custom Domains, SSL & DNS Records Configuration**
  - [ ] Implement custom domain input, CNAME/A record verification checker, and automatic SSL badge.
- [ ] **Page 51: Storefront SEO Metadata, Google Search Preview & OpenGraph**
  - [ ] Implement title, meta description, Google snippet simulator, and social share preview.
- [ ] **Page 52: Tunisian Carriers Rate Simulator & Marketing Tracking Pixels**
  - [ ] Implement regional shipping rate matrix across 24 Governorates and pixel integration inputs (Meta, TikTok, GA4).

### Section 6: Marketing, Advertising, CRM & Loyalty (`SELLER_SEC06_MARKETING_ADS_CRM_LOYALTY.md`)
- [ ] **Page 35: PandaAds Center: Campaign Creator, Budgeting & ROAS vs Net Margin**
  - [ ] Implement ad campaign wizard, daily budget setter, and live ROAS vs net profit calculator.
- [ ] **Page 38: Followers, VIP Subscribers, Private Discount Coupons & Loyalty Points**
  - [ ] Implement voucher generator (percentage vs fixed TND discount), minimum purchase limit, and loyalty rules.
- [ ] **Page 53: Store Customers Directory & Purchasing History**
  - [ ] Implement customer roster, purchase frequency, order history drawer, and VIP status tags.
- [ ] **Page 69 & 70: Growth Loyalty & Subscribers Aliases**
  - [ ] Ensure seamless redirection to unified loyalty and marketing settings.

### Section 7: AI Studio, Plans & SaaS Billing (`SELLER_SEC07_AI_STUDIO_SUBSCRIPTION_BILLING.md`)
- [ ] **Page 54: AI Tools Studio (Copywriting, Titles, SEO & Support)**
  - [ ] Implement AI product description generator, tone selector (Professional, Casual, Luxury), and image enhancer.
- [ ] **Page 55: Subscription Plans, Feature Limits, Meter & Upgrade**
  - [ ] Implement current plan quota bars (Products used, Storage used, AI tokens) and upgrade modal.
- [ ] **Page 56: Recurring Billing Payment Method Setup**
  - [ ] Implement recurring credit card / bank mandate setup form.
- [ ] **Page 57: Platform SaaS Invoices & Postal Mandat Receipt Upload**
  - [ ] Implement invoice list, PDF download, and offline postal mandat receipt attachment.

### Section 8: Disputes, Settings, KYC & Developer APIs (`SELLER_SEC08_DISPUTES_SETTINGS_DEV_ORGANIZATION.md`)
- [ ] **Page 59: Customer Disputes, Infringement Claims & Resolution Cases**
  - [ ] Implement dispute claim list, resolution deadlines, and claim response triggers.
- [ ] **Page 60: Dispute Dossier View, Proof Upload & Resolution Response Submission**
  - [ ] Implement dispute evidence file uploader (shipping receipt, photos) and merchant defense statement.
- [ ] **Page 61: Store Identity, Business Profile & Operational Settings**
  - [ ] Implement store identity form (logo, legal name, matricule fiscal, contact information, hours).
- [ ] **Page 62: Merchant KYC Verification Portal & Documents Upload**
  - [ ] Implement merchant KYC upload dossier (CIN front/back, RNE document, bank RIB certificate).
- [ ] **Page 63: Developer REST API Credentials & Permission Scopes**
  - [ ] Implement API key generator with secret masking, copy button, and webhook permission checkboxes.
- [ ] **Page 64: Real-time Webhook Subscriptions & Delivery Logs**
  - [ ] Implement webhook endpoint manager and delivery attempt log inspector.
- [ ] **Page 65: Store Notification Center & Channel Alert Preferences**
  - [ ] Implement notification switchboard (Order created, Low stock, Payout transferred) across Email, SMS, Web.
- [ ] **Page 66: Merchant Support Desk & Help Ticket Submission**
  - [ ] Implement ticket creator with issue category, screenshot attachment, and conversation history.
- [ ] **Page 67: Create New Secondary Store Wizard**
  - [ ] Implement secondary store creation modal with business sector picker and store handle.
- [ ] **Page 68: Multi-Store Switcher & Organization Selector**
  - [ ] Implement multi-store dropdown in top navigation for merchants managing multiple storefronts.

---

## Phase 3: Quality Assurance, Localization & Verification

- [ ] **3.1. Currency & Numeric Formatting**
  - [ ] Verify 3-decimal millime precision (`TND 0.000`) across all price tags, totals, and inputs.
- [ ] **3.2. Territorial & Carrier Verification**
  - [ ] Verify presence and correct spelling of all 24 Tunisian Governorates in all dropdowns and rate matrices.
  - [ ] Verify carrier options: Aramex Express, Rapid-Poste, Runex, First Delivery.
- [ ] **3.3. Banking & RIB Validation**
  - [ ] Verify 20-digit length and Modulo 97 checksum validator on all bank payout forms.
- [ ] **3.4. Multi-Theme Switching Stress Test**
  - [ ] Verify zero visual regression when switching between Bento, Classique, and OpenDesign on Seller Dashboard.
  - [ ] Verify zero visual regression when switching between Command Center, Enterprise Clean, and OpenDesign on Superadmin Dashboard.
  - [ ] Verify persistent storage in cookies, LocalStorage, and backend user preferences.
