# PandaMarket OpenDesign Design & Style Implementation Repository

This directory contains the authoritative visual design system specifications, technical implementation guides, and fully actionable checklists extracted directly from the **OpenDesign Project** (*Pandamarket Dashboard Architecture Complete Raw Content*).

---

## Directory Contents & Architectural Index

### 1. OpenDesign Visual System & Technical Guides
- [`OPENDESIGN_DESIGN_SYSTEM_SPECIFICATIONS.md`](./OPENDESIGN_DESIGN_SYSTEM_SPECIFICATIONS.md): The official visual design system specifications (OKLCH color mixing tokens, 6 regional palettes, typography weights, density engine, and component primitives).
- [`TECHNICAL_IMPLEMENTATION_HOWTO.md`](./TECHNICAL_IMPLEMENTATION_HOWTO.md): Step-by-step technical guide on integrating OpenDesign tokens into Next.js, extending Tailwind CSS, building the theme provider, and creating reusable React primitives.
- [`FULLY_ACTIONABLE_TODO_CHECKLIST.md`](./FULLY_ACTIONABLE_TODO_CHECKLIST.md): Complete, phase-by-phase implementation checklist for engineering teams across all 71 pages.
- [`NAVIGATION_AND_MENU_HIERARCHY.md`](./NAVIGATION_AND_MENU_HIERARCHY.md): Authoritative 8-group sidebar menu hierarchy, routes, icons, and breadcrumb trails for both Seller and Superadmin dashboards.
- [`PAGE_LAYOUT_AND_ORDERING_STANDARDS.md`](./PAGE_LAYOUT_AND_ORDERING_STANDARDS.md): Universal 8-layer anatomical layout sequence (Breadcrumbs -> Header -> Critical Banner -> KPI Strip -> Filter Toolbar -> Working Area -> Drawer -> Modals).
- [`THEME_ARCHITECTURE_AND_SPECS.md`](./THEME_ARCHITECTURE_AND_SPECS.md): Specifications for the switchable theme engine (Bento Cockpit, Classique, OpenDesign, Mission Control, Enterprise Clean).
- [`DASHBOARD_RAW_CONTENT_BLUEPRINT.md`](./DASHBOARD_RAW_CONTENT_BLUEPRINT.md): Unstyled master raw content contract for all 71 pages.

---

### 2. Section Specifications with OpenDesign Style Mapping

#### Superadmin Dashboard (31 Pages Total)
1. [`SUPERADMIN_SEC01_OVERVIEW_AND_TELEMETRY.md`](./SUPERADMIN_SEC01_OVERVIEW_AND_TELEMETRY.md): Pages 1, 2, 3 (Overview, Platform Analytics, Sticky Notes)
2. [`SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md`](./SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md): Pages 4, 5, 6, 31 (Stores, Users & Vendors, Buyers Directory, Vendor Shortcut)
3. [`SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md`](./SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md): Pages 7, 8, 9, 10 (KYC Audits, Postal Mandats, RIB Disbursements, Refunds)
4. [`SUPERADMIN_SEC04_CATALOG_TAXONOMY_MEDIA.md`](./SUPERADMIN_SEC04_CATALOG_TAXONOMY_MEDIA.md): Pages 11, 12, 13 (Products Moderation, Category Tree, Media CDN Vault)
5. [`SUPERADMIN_SEC05_SUPPORT_DISPUTES_FRAUD.md`](./SUPERADMIN_SEC05_SUPPORT_DISPUTES_FRAUD.md): Pages 14, 15, 16, 19, 28 (Mediation Chat, Fraud Radar, Violations, Helpdesk)
6. [`SUPERADMIN_SEC06_ADS_SUBSCRIPTIONS_SAAS.md`](./SUPERADMIN_SEC06_ADS_SUBSCRIPTIONS_SAAS.md): Pages 17, 18, 20 (PandaAds Campaigns, SaaS Invoicing, Plans & Limits)
7. [`SUPERADMIN_SEC07_INFRASTRUCTURE_AUDIT_LOGS.md`](./SUPERADMIN_SEC07_INFRASTRUCTURE_AUDIT_LOGS.md): Pages 21, 22, 23, 24, 25 (AI Costs, Audit Trails, Server Health Logs)
8. [`SUPERADMIN_SEC08_CONFIG_CMS_COMMUNICATIONS.md`](./SUPERADMIN_SEC08_CONFIG_CMS_COMMUNICATIONS.md): Pages 26, 27, 29, 30 (Platform Settings, SMTP Mail, CMS Articles, SEO Editor)

#### Seller Dashboard (40 Pages Total)
1. [`SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md`](./SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md): Pages 32, 33, 34 (Cockpit, Onboarding Guide, Store Analytics)
2. [`SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md`](./SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md): Pages 36, 37, 39 (Products, Categories & Collections, Media Vault)
3. [`SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md`](./SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md): Pages 40, 41, 71 (Orders Fulfillment, Buyer Chat & 1-Click COD, Courier Handshake)
4. [`SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md`](./SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md): Pages 42, 43, 58 (Wallet & 20-digit RIB Payouts, Financial Reports, Store Gateways)
5. [`SELLER_SEC05_ONLINE_STOREFRONT_BUILDER.md`](./SELLER_SEC05_ONLINE_STOREFRONT_BUILDER.md): Pages 44, 45, 46, 47, 48, 49, 50, 51, 52 (Themes, Visual Customizer, Sections, Menus, Pages, Domains, SEO, Carriers)
6. [`SELLER_SEC06_MARKETING_ADS_CRM_LOYALTY.md`](./SELLER_SEC06_MARKETING_ADS_CRM_LOYALTY.md): Pages 35, 38, 53, 69, 70 (PandaAds, VIP Coupons & Loyalty, Customer Directory, Aliases)
7. [`SELLER_SEC07_AI_STUDIO_SUBSCRIPTION_BILLING.md`](./SELLER_SEC07_AI_STUDIO_SUBSCRIPTION_BILLING.md): Pages 54, 55, 56, 57 (AI Studio, Subscription Plans, Billing Methods, SaaS Invoices)
8. [`SELLER_SEC08_DISPUTES_SETTINGS_DEV_ORGANIZATION.md`](./SELLER_SEC08_DISPUTES_SETTINGS_DEV_ORGANIZATION.md): Pages 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 (Disputes, Identity, KYC Portal, REST API, Notifications)

---

## 3. How to Execute Implementation

Follow the step-by-step sequence documented in [`FULLY_ACTIONABLE_TODO_CHECKLIST.md`](./FULLY_ACTIONABLE_TODO_CHECKLIST.md) using the primitives and guidelines in [`TECHNICAL_IMPLEMENTATION_HOWTO.md`](./TECHNICAL_IMPLEMENTATION_HOWTO.md).
