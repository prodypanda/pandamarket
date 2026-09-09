# Master Implementation TODO Checklist: Multi-Theme Dashboards & ReGo Template

This checklist outlines the complete, step-by-step roadmap for implementing the multi-theme architecture and the incoming ReGo design across all 71 dashboard pages.

> [!IMPORTANT]
> **Implementation Rule**: Do NOT modify frontend code until the new ReGo design files are provided and reviewed. This checklist prepares the exact sequence of execution.

---

## Phase 0: Design Ingestion & Theme Architecture Foundation

- [ ] **0.1. ReGo Project Asset Extraction**
  - [ ] Inspect the incoming ReGo design specifications and export design tokens (colors, typography, radii, shadows, spacing).
  - [ ] Inventory custom icon sets, illustrations, and vector assets.
  - [ ] Audit component primitives (buttons, inputs, select dropdowns, modals, badges, data tables, metric cards).

- [ ] **0.2. Dual Dashboard Theme Engine Setup**
  - [ ] Create DashboardThemeProvider supporting independent scopes for Seller (ento, classique, rego) and Superadmin (mission-control, nterprise, rego).
  - [ ] Implement cookie-based hydration (pm_seller_theme, pm_superadmin_theme) to eliminate SSR Flash of Unstyled Content (FOUC).
  - [ ] Implement LocalStorage fallback and user profile database synchronization.
  - [ ] Configure Tailwind CSS / CSS Variables for dynamic data-seller-theme and data-admin-theme attributes.

- [ ] **0.3. Theme Switcher UI Components**
  - [ ] Build SellerThemeSwitcher header dropdown component for /hub/dashboard.
  - [ ] Build AdminThemeSwitcher header dropdown component for /(admin).
  - [ ] Add visual theme selection cards to /hub/dashboard/settings (Appearance tab).
  - [ ] Add visual theme selection cards to /(admin)/settings (Interface tab).

- [ ] **0.4. Navigation Hierarchy & Layout Standardization**
  - [ ] Implement standardized 8-layer layout wrapper (DashboardPageWrapper) enforcing:
    1. Breadcrumb Navigation Trail (Layer 1)
    2. Page Header Bar (Layer 2)
    3. Critical Operational Alert Banner (Layer 3)
    4. Telemetry & KPI Cards Strip (Layer 4)
    5. Control Bar & Filter Toolbar (Layer 5)
    6. Main Operational Working Area (Layer 6)
    7. Detail Inspection Drawer (Layer 7)
    8. Focus-Trapped Modals & Dialogs (Layer 8)
  - [ ] Align Seller sidebar navigation to the 8 designated operational groups (Pilotage, Ventes, Catalogue, Clients, Boutique, Finance, Studio, Paramètres).
  - [ ] Align Superadmin sidebar navigation to the 8 designated governance groups (Pilotage, Commerces, Conformité, Catalogue, Confiance, Monétisation, Infrastructure, Gouvernance).

---

## Phase 1: Superadmin Dashboard Implementation (Pages 1 to 31)

### Section 1: Overview, Analytics & Operational Notes (SUPERADMIN_SEC01_OVERVIEW_AND_TELEMETRY.md)
- [x] **Page 1: Superadmin Overview & Executive Telemetry** (/dashboard)
  - [x] Breadcrumb: Administration > Pilotage > Tableau de bord
  - [x] Implement GMV, active merchants, total orders, and platform health telemetry cards (TND 0.000).
  - [x] Implement quick shortcut jumps and live microservice status ticker.
  - [x] Render variants across Mission Control, Enterprise Clean, and ReGo.
- [x] **Page 2: Platform-wide Business & Sales Analytics** (/platform-analytics)
  - [x] Breadcrumb: Administration > Pilotage > Statistiques Globales
  - [x] Implement time-series sales velocity, cohort retention, and regional revenue by 24 Governorates.
  - [x] Implement payment gateway volume breakdown (Flouci, Konnect, Postal Mandat, COD).
- [x] **Page 3: Operational Notes & Sticky Reminders Board** (/admin-notes)
  - [x] Breadcrumb: Administration > Pilotage > Notes & Rappels
  - [x] Implement color-coded sticky priority notes board with drag-and-drop or pin/archive states.

### Section 2: Merchants, Users & Buyers Management (SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md)
- [x] **Page 4: Stores & Merchant Accounts Management** (/stores)
  - [x] Breadcrumb: Administration > Commerces > Boutiques
  - [x] Implement merchant store table with GMV, store status badges, KYC indicators, and commission tiers.
  - [x] Implement store suspension / reactivation and manual tier upgrade modals.
- [x] **Page 5: Platform Users & Vendors Directory** (/users)
  - [x] Breadcrumb: Administration > Commerces > Utilisateurs & Vendeurs
  - [x] Implement multi-role user directory (Superadmin, Moderator, Support, Vendor, Staff).
  - [x] Implement role permission editor and 2FA enforcement toggles.
- [x] **Page 6: Registered Buyers & Shoppers Directory** (/buyers)
  - [x] Breadcrumb: Administration > Commerces > Acheteurs
  - [x] Implement buyer accounts table with lifetime value, order frequency, and account status.
- [x] **Page 31: Vendors Navigation Shortcut** (/(admin)/vendors)
  - [x] Breadcrumb: Administration > Commerces > Vendeurs (Filtre Direct)
  - [x] Verify instant redirection / alias link to /users?role=vendor.

### Section 3: Finance, Escrow, KYC & Payouts (SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md)
- [x] **Page 7: KYC Merchant Identity Verifications & Document Audit** (/kyc)
  - [x] Breadcrumb: Administration > Conformité > Vérifications KYC
  - [x] Implement document inspection modal (CIN scan, RNE commercial registry, RIB certificate).
  - [x] Implement 1-click Approve / Reject with custom feedback notes.
- [x] **Page 8: Postal Mandats & Offline Payment Proofs Review** (/mandats)
  - [x] Breadcrumb: Administration > Conformité > Mandats Postaux
  - [x] Implement postal receipt viewer and verification queue with transaction matching.
- [x] **Page 9: Seller Wallet Payout Requests & Bank Disbursement** (/withdrawals)
  - [x] Breadcrumb: Administration > Conformité > Virements & Décaissements
  - [x] Implement 20-digit Tunisian RIB Modulo 97 validation ledger.
  - [x] Implement batch bank disbursement export (BIAT, BNA, Attijari, STB, Amen Bank, etc.).
- [x] **Page 10: Buyer Refund Reviews & Escalations** (/refund-review)
  - [x] Breadcrumb: Administration > Conformité > Remboursements & Escrow
  - [x] Implement refund dispute queue, escrow hold releases, and automated credit note issuance.

### Section 4: Catalog, Taxonomy & Media Storage (SUPERADMIN_SEC04_CATALOG_TAXONOMY_MEDIA.md)
- [x] **Page 11: Marketplace Global Products Moderation & Catalog** (/products)
  - [x] Breadcrumb: Administration > Catalogue > Produits Marchands
  - [x] Implement product moderation queue with counterfeit risk flags and merchant attribution.
  - [x] Implement bulk approve / reject / request edit actions.
- [x] **Page 12: Global Category Tree Taxonomy & Commission Rates** (/marketplace-categories)
  - [x] Breadcrumb: Administration > Catalogue > Arborescence Catégories
  - [x] Implement multi-level category tree with per-category marketplace commission overrides.
- [x] **Page 13: Platform Media Storage & CDN File Vault** (/platform-media)
  - [x] Breadcrumb: Administration > Catalogue > Stockage Médias
  - [x] Implement storage quota telemetry, asset browser, and orphaned image cleanup utilities.

### Section 5: Support, Disputes, Fraud & Tickets (SUPERADMIN_SEC05_SUPPORT_DISPUTES_FRAUD.md)
- [x] **Page 14: Superadmin Unified Support Chat & Dispute Mediation** (/messages)
  - [x] Breadcrumb: Administration > Confiance > Chat de Médiation
  - [x] Implement three-party mediation chat (Admin, Seller, Buyer) with order context drawer.
- [x] **Page 15: Fraud Reports & Platform Violations Queue** (/reports)
  - [x] Breadcrumb: Administration > Confiance > Signalements & Infractions
  - [x] Implement incident reporting queue with severity scoring and seller risk matrix.
- [x] **Page 16: Dispute Dossier & Sanction Adjudication** (/(admin)/tickets/disputes)
  - [x] Breadcrumb: Administration > Confiance > Dossiers de Litige
  - [x] Implement full dispute timeline, evidence gallery, and binding verdict adjudication.
- [x] **Page 19: Fraud Radar & High-Risk Transaction Engine** (/fraud-radar)
  - [x] Breadcrumb: Administration > Confiance > Radar Anti-Fraude
  - [x] Implement real-time risk heuristics, suspicious IP flagging, and abnormal COD refusal tracking.
- [x] **Page 28: Platform Support Desk & Agent Tickets** (/(admin)/tickets)
  - [x] Breadcrumb: Administration > Confiance > Tickets Support
  - [x] Implement ticket triage board, SLA timers, priority filters, and agent assignment.

### Section 6: Advertising & SaaS Subscriptions (SUPERADMIN_SEC06_ADS_SUBSCRIPTIONS_SAAS.md)
- [x] **Page 17: PandaAds Global Campaign Management & Placement Pricing** (/ads)
  - [x] Breadcrumb: Administration > Monétisation > PandaAds
  - [x] Implement ad auction rules, banner impression trackers, and CPC/CPM price managers.
- [x] **Page 18: SaaS Subscription Orders & Invoicing** (/subscription-orders)
  - [x] Breadcrumb: Administration > Monétisation > Commandes d'Abonnement
  - [x] Implement subscription billing order book, renewal statuses, and VAT invoice generators.
- [x] **Page 20: SaaS Subscription Plans, Features & Tier Limits Management** (/plans)
  - [x] Breadcrumb: Administration > Monétisation > Forfaits & Quotas
  - [x] Implement plan feature matrix editor (Starter, Pro, Enterprise) with product/quota limits.

### Section 7: Telemetry, AI Costs & Audit Trails (SUPERADMIN_SEC07_INFRASTRUCTURE_AUDIT_LOGS.md)
- [x] **Page 21: AI Usage Costs, Quotas & Token Consumption** (/ai-costs)
  - [x] Breadcrumb: Administration > Infrastructure > Coûts IA
  - [x] Implement model telemetry (Gemini 1.5 Flash, Pro) with token counts, cache hits, and budget limits.
- [x] **Page 22: Administrator Security Audit Trail** (/audit-log)
  - [x] Breadcrumb: Administration > Infrastructure > Audit Administrateur
  - [x] Implement immutable audit logs for administrative privilege actions and credential changes.
- [x] **Page 23: Merchant & Vendor Administrative Audit Trail** (/seller-audit-log)
  - [x] Breadcrumb: Administration > Infrastructure > Audit Vendeurs
  - [x] Implement merchant store modifications and payout request audit trails.
- [x] **Page 24: Buyer Account Actions & Order Audit Trail** (/buyer-audit-log)
  - [x] Breadcrumb: Administration > Infrastructure > Audit Acheteurs
  - [x] Implement buyer order status changes, address updates, and dispute filing history.
- [x] **Page 25: Server Infrastructure, API Errors & Performance Logs** (/system-logs)
  - [x] Breadcrumb: Administration > Infrastructure > Logs Serveur
  - [x] Implement real-time health monitors, Redis cache metrics, and error stack trace tailing.

### Section 8: Configuration, CMS & Communications (SUPERADMIN_SEC08_CONFIG_CMS_COMMUNICATIONS.md)
- [x] **Page 26: Global Platform Configuration & Marketplace Settings** (/settings)
  - [x] Breadcrumb: Administration > Gouvernance > Configuration Générale
  - [x] Implement general marketplace settings, default TVA rates (7%, 13%, 19%), and maintenance switch.
- [x] **Page 27: SMTP Transactional Mail Server & Test Dispatch** (/(admin)/sms-config)
  - [x] Breadcrumb: Administration > Gouvernance > Serveur Mail SMTP
  - [x] Implement SMTP credential configuration and real-time email dispatch tester.
- [x] **Page 29: CMS Articles, Legal Policies & Blog Posts Directory** (/(admin)/blog)
  - [x] Breadcrumb: Administration > Gouvernance > Articles CMS & Politiques
  - [x] Implement CMS content directory with category tags, publication status, and SEO ratings.
- [x] **Page 30: CMS Article Editor, Markdown Preview & SEO Publishing** (/(admin)/blog/edit)
  - [x] Breadcrumb: Administration > Gouvernance > Éditeur d'Article
  - [x] Implement dual-pane markdown editor, image embedder, and OpenGraph social preview.

---

## Phase 2: Seller Dashboard Implementation (Pages 32 to 71)

### Section 1: Cockpit, Onboarding & Store Analytics (SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md)
- [x] **Page 32: Seller Cockpit & Executive Business Summary** (/hub/dashboard)
  - [x] Breadcrumb: Accueil > Tableau de bord
  - [x] Implement Bento Cockpit theme variant (modular widgets, live order feed, fast action dock).
  - [x] Implement Classique E-Commerce theme variant (traditional summary, linear tables).
  - [x] Implement ReGo theme variant (refined modernist aesthetic).
- [x] **Page 33: Store Launch Checklist & Step-by-Step Onboarding Guide** (/hub/dashboard/onboarding)
  - [x] Breadcrumb: Accueil > Tableau de bord > Guide de lancement
  - [x] Implement progress bar, completed milestone badges, and dismissal persistence.
- [x] **Page 34: Store Analytics, Traffic, Conversion & Sales Velocity** (/hub/dashboard/analytics)
  - [x] Breadcrumb: Accueil > Tableau de bord > Statistiques
  - [x] Implement revenue trends, top performing products, traffic referral sources, and conversion funnel.

### Section 2: Products, Inventory & Media Library (SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md)
- [x] **Page 36: Product Catalog, Inventory Adjuster & Variant Matrix** (/hub/dashboard/products)
  - [x] Breadcrumb: Accueil > Catalogue > Produits
  - [x] Implement product table with thumbnail, SKU, stock level badges, price in TND 0.000, and actions.
  - [x] Implement quick inline stock adjuster and multi-variant creator (size, color, material).
- [x] **Page 37: Store Product Categories & Custom Collections** (/hub/dashboard/categories)
  - [x] Breadcrumb: Accueil > Catalogue > Catégories & Collections
  - [x] Implement custom collections manager with automatic product tagging rules.
- [x] **Page 39: Store Media Library, Product Image Vault & Asset Uploader** (/hub/dashboard/media)
  - [x] Breadcrumb: Accueil > Catalogue > Médiathèque
  - [x] Implement multi-file drag & drop uploader, image cropper, and CDN URL copy utility.

### Section 3: Orders, Fulfillment, COD & Courier Handshake (SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md)
- [x] **Page 40: Orders Fulfillment, Tunisian Courier Pipeline & Urgent COD Anti-Refus Deck** (/hub/dashboard/orders)
  - [x] Breadcrumb: Accueil > Ventes > Commandes
  - [x] Implement order status tabs (En attente, Confirmée, Expédiée, Livrée, Retournée/Refusée).
  - [x] Implement Tunisian carrier dispatch generator (Aramex, Rapid-Poste, Runex, First Delivery).
  - [x] Implement urgent COD anti-refus score deck with buyer confirmation triggers.
- [x] **Page 41: Customer Direct Negotiation, Inquiry Chat & 1-Click COD Validation** (/hub/dashboard/messages)
  - [x] Breadcrumb: Accueil > Ventes > Messagerie clients
  - [x] Implement real-time buyer negotiation chat with live order summary panel.
  - [x] Implement 1-click COD order confirmation button directly in conversation view.
- [x] **Page 71: Courier / Driver Mobile Delivery Handshake Console** (/courier)
  - [x] Breadcrumb: Accueil > Ventes > Console Livreur Mobile
  - [x] Implement driver mobile interface with click-to-call, GPS coordinates, and cash collection ledger.
  - [x] Implement digital proof of delivery (POD signature / photo upload).

### Section 4: Wallet, Payouts & Store Payments (SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md)
- [x] **Page 42: Seller Wallet, Balances & Tunisian 20-digit RIB Modulo 97 Payout Launcher** (/hub/dashboard/wallet)
  - [x] Breadcrumb: Accueil > Finance > Portefeuille & Virements
  - [x] Implement available balance, escrow pending balance, and payout history.
  - [x] Implement withdrawal request modal with real-time 20-digit Tunisian RIB Modulo 97 checksum.
- [x] **Page 43: Financial Reports, Invoicing & Tax Declarations** (/hub/dashboard/financial)
  - [x] Breadcrumb: Accueil > Finance > Rapports Financiers & Déclarations
  - [x] Implement downloadable accounting summaries, monthly fee statements, and TVA breakdown.
- [x] **Page 58: Merchant Store Payment Methods Setup (Flouci, Konnect, PayPal, COD)** (/hub/dashboard/payment-config)
  - [x] Breadcrumb: Accueil > Finance > Passerelles de Paiement
  - [x] Implement payment method toggle cards (COD, Flouci merchant credentials, Konnect API keys).

### Section 5: Online Storefront, Themes & Page Builder (SELLER_SEC05_ONLINE_STOREFRONT_BUILDER.md)
- [x] **Page 44: Online Storefront Hub & Domain Health Monitor** (/hub/dashboard/online-store)
  - [x] Breadcrumb: Accueil > Boutique en Ligne > Vue d'ensemble
  - [x] Implement storefront status dashboard, SSL certificate indicator, and preview frame.
- [x] **Page 45: Storefront Themes Gallery & Viewport Previews** (/hub/dashboard/online-store/themes)
  - [x] Breadcrumb: Accueil > Boutique en Ligne > Galerie de Thèmes
  - [x] Implement theme gallery with desktop, tablet, and mobile device viewport switchers.
- [x] **Page 46: Visual Theme Customizer, Brand Colors & Real-Time CSS Preview** (/hub/dashboard/online-store/customize)
  - [x] Breadcrumb: Accueil > Boutique en Ligne > Personnalisation Visuelle
  - [x] Implement color picker, font family selector, border radius presets, and live preview iframe.
- [x] **Page 47: Homepage Sections Customizer (Hero, Banners, Grids)** (/hub/dashboard/online-store/banners)
  - [x] Breadcrumb: Accueil > Boutique en Ligne > Bannières & Carrousels
  - [x] Implement drag-and-drop homepage block reordering, hero slide manager, and product carousels.
- [x] **Page 48: Navigation Menus Builder (Header & Footer)** (/hub/dashboard/online-store/navigation)
  - [x] Breadcrumb: Accueil > Boutique en Ligne > Menus & Navigation
  - [x] Implement nested menu link editor with drag handles and target link selector.
- [x] **Page 49: Drag & Drop Custom Landing Page Builder** (/hub/dashboard/page-builder)
  - [x] Breadcrumb: Accueil > Boutique en Ligne > Constructeur de Pages
  - [x] Implement custom content page editor (About Us, Contact, Privacy, Terms) with rich text.
- [x] **Page 50: Custom Domains, SSL & DNS Records Configuration** (/hub/dashboard/online-store/domains)
  - [x] Breadcrumb: Accueil > Boutique en Ligne > Domaines & DNS
  - [x] Implement custom domain input, CNAME/A record verification checker, and automatic SSL badge.
- [x] **Page 51: Storefront SEO Metadata, Google Search Preview & OpenGraph** (/hub/dashboard/online-store/seo)
  - [x] Breadcrumb: Accueil > Boutique en Ligne > Référencement & Pixels
  - [x] Implement title, meta description, Google snippet simulator, and social share preview.
- [x] **Page 52: Tunisian Carriers Rate Simulator & Marketing Tracking Pixels** (/hub/dashboard/online-store/integrations)
  - [x] Breadcrumb: Accueil > Boutique en Ligne > Logistique & Intégrations
  - [x] Implement regional shipping rate matrix across 24 Governorates and pixel integration inputs (Meta, TikTok, GA4).

### Section 6: Marketing, Advertising, CRM & Loyalty (SELLER_SEC06_MARKETING_ADS_CRM_LOYALTY.md)
- [x] **Page 35: PandaAds Center: Campaign Creator, Budgeting & ROAS vs Net Margin** (/hub/dashboard/ads)
  - [x] Breadcrumb: Accueil > Clients & Marketing > PandaAds
  - [x] Implement ad campaign wizard, daily budget setter, and live ROAS vs net profit calculator.
- [x] **Page 38: Followers, VIP Subscribers, Private Discount Coupons & Loyalty Points** (/hub/dashboard/loyalty)
  - [x] Breadcrumb: Accueil > Clients & Marketing > Abonnés & Fidélité
  - [x] Implement voucher generator (percentage vs fixed TND discount), minimum purchase limit, and loyalty rules.
- [x] **Page 53: Store Customers Directory & Purchasing History** (/hub/dashboard/customers)
  - [x] Breadcrumb: Accueil > Clients & Marketing > Répertoire Clients
  - [x] Implement customer roster, purchase frequency, order history drawer, and VIP status tags.
- [x] **Page 69 & 70: Growth Loyalty & Subscribers Aliases** (/dashboard/loyalty, /dashboard/subscribers)
  - [x] Ensure seamless redirection to unified loyalty and marketing settings.

### Section 7: AI Studio, Plans & SaaS Billing (SELLER_SEC07_AI_STUDIO_SUBSCRIPTION_BILLING.md)
- [ ] **Page 54: AI Tools Studio (Copywriting, Titles, SEO & Support)** (/hub/dashboard/ai)
  - [ ] Breadcrumb: Accueil > Outils & Support > Studio IA
  - [ ] Implement AI product description generator, tone selector (Professional, Casual, Luxury), and image enhancer.
- [ ] **Page 55: Subscription Plans, Feature Limits, Meter & Upgrade** (/hub/dashboard/subscription)
  - [ ] Breadcrumb: Accueil > Finance > Forfait & Abonnement
  - [ ] Implement current plan quota bars (Products used, Storage used, AI tokens) and upgrade modal.
- [ ] **Page 56: Recurring Billing Payment Method Setup** (/hub/dashboard/billing)
  - [ ] Breadcrumb: Accueil > Finance > Forfait & Facturation
  - [ ] Implement recurring credit card / bank mandate setup form.
- [ ] **Page 57: Platform SaaS Invoices & Postal Mandat Receipt Upload** (/hub/dashboard/my-subscription-orders)
  - [ ] Breadcrumb: Accueil > Finance > Factures d'Abonnement
  - [ ] Implement invoice list, PDF download, and offline postal mandat receipt attachment.

### Section 8: Disputes, Settings, KYC & Developer APIs (SELLER_SEC08_DISPUTES_SETTINGS_DEV_ORGANIZATION.md)
- [ ] **Page 59: Customer Disputes, Infringement Claims & Resolution Cases** (/hub/dashboard/disputes)
  - [ ] Breadcrumb: Accueil > Outils & Support > Litiges & Réclamations
  - [ ] Implement dispute claim list, resolution deadlines, and claim response triggers.
- [ ] **Page 60: Dispute Dossier View, Proof Upload & Resolution Response Submission** (/hub/dashboard/disputes/[id])
  - [ ] Breadcrumb: Accueil > Outils & Support > Dossier Litige
  - [ ] Implement dispute evidence file uploader (shipping receipt, photos) and merchant defense statement.
- [ ] **Page 61: Store Identity, Business Profile & Operational Settings** (/hub/dashboard/settings)
  - [ ] Breadcrumb: Accueil > Paramètres > Profil Boutique
  - [ ] Implement store identity form (logo, legal name, matricule fiscal, contact information, hours).
- [ ] **Page 62: Merchant KYC Verification Portal & Documents Upload** (/hub/dashboard/kyc)
  - [ ] Breadcrumb: Accueil > Paramètres > Vérification KYC
  - [ ] Implement merchant KYC upload dossier (CIN front/back, RNE document, bank RIB certificate).
- [ ] **Page 63: Developer REST API Credentials & Permission Scopes** (/hub/dashboard/api-keys)
  - [ ] Breadcrumb: Accueil > Paramètres > Clés d'API
  - [ ] Implement API key generator with secret masking, copy button, and webhook permission checkboxes.
- [ ] **Page 64: Real-time Webhook Subscriptions & Delivery Logs** (/hub/dashboard/webhooks)
  - [ ] Breadcrumb: Accueil > Paramètres > Webhooks
  - [ ] Implement webhook endpoint manager and delivery attempt log inspector.
- [ ] **Page 65: Store Notification Center & Channel Alert Preferences** (/hub/dashboard/notifications)
  - [ ] Breadcrumb: Accueil > Outils & Support > Notifications
  - [ ] Implement notification switchboard (Order created, Low stock, Payout transferred) across Email, SMS, Web.
- [ ] **Page 66: Merchant Support Desk & Help Ticket Submission** (/hub/dashboard/help)
  - [ ] Breadcrumb: Accueil > Outils & Support > Centre d'Aide
  - [ ] Implement ticket creator with issue category, screenshot attachment, and conversation history.
- [ ] **Page 67: Create New Secondary Store Wizard** (/hub/dashboard/create-store)
  - [ ] Breadcrumb: Accueil > Paramètres > Nouvelle Boutique
  - [ ] Implement secondary store creation modal with business sector picker and store handle.
- [ ] **Page 68: Multi-Store Switcher & Organization Selector** (/hub/dashboard/select-store)
  - [ ] Breadcrumb: Accueil > Paramètres > Mes Boutiques
  - [ ] Implement multi-store dropdown in top navigation for merchants managing multiple storefronts.

---

## Phase 3: Quality Assurance, Localization & Verification

- [ ] **3.1. Currency & Numeric Formatting**
  - [ ] Verify 3-decimal millime precision (TND 0.000) across all price tags, totals, and inputs.
- [ ] **3.2. Territorial & Carrier Verification**
  - [ ] Verify presence and correct spelling of all 24 Tunisian Governorates in all dropdowns and rate matrices.
  - [ ] Verify carrier options: Aramex Express, Rapid-Poste, Runex, First Delivery.
- [ ] **3.3. Banking & RIB Validation**
  - [ ] Verify 20-digit length and Modulo 97 checksum validator on all bank payout forms.
- [ ] **3.4. Multi-Theme Switching Stress Test**
  - [ ] Verify zero visual regression when switching between Bento, Classique, and ReGo on Seller Dashboard.
  - [ ] Verify zero visual regression when switching between Command Center, Enterprise Clean, and ReGo on Superadmin Dashboard.
  - [ ] Verify persistent storage in cookies, LocalStorage, and backend user preferences.
