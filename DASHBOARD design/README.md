# PandaMarket DASHBOARD Design Repository

This directory serves as the authoritative blueprint, section-by-section breakdown, and implementation plan for the **PandaMarket Superadmin and Seller Dashboards**.

It is specifically structured to support **multi-theme selection** (allowing Sellers and Superadmins to choose their visual style) and to seamlessly integrate the incoming **OpenDesign design template**.

---

## Directory Contents & Index

### Core Architecture & Master Files
- [`DASHBOARD_RAW_CONTENT_BLUEPRINT.md`](./DASHBOARD_RAW_CONTENT_BLUEPRINT.md): The complete, unstyled, raw content blueprint for all 71 pages across the marketplace.
- [`THEME_ARCHITECTURE_AND_SPECS.md`](./THEME_ARCHITECTURE_AND_SPECS.md): Specifications for the dual-dashboard theme switching system (Bento Cockpit, Classique, OpenDesign, Command Center, Enterprise Clean).
- [`TODO_MASTER_CHECKLIST.md`](./TODO_MASTER_CHECKLIST.md): Master implementation checklist covering all phases, themes, and 71 pages.

### Superadmin Dashboard Sections (Pages 1 to 31)
1. [`SUPERADMIN_SEC01_OVERVIEW_AND_TELEMETRY.md`](./SUPERADMIN_SEC01_OVERVIEW_AND_TELEMETRY.md): Pages 1, 2, 3 (Overview, Business Analytics, Operational Notes)
2. [`SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md`](./SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md): Pages 4, 5, 6, 31 (Sellers, Platform Users, Shoppers Directory, Vendor Shortcut)
3. [`SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md`](./SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md): Pages 7, 8, 9, 10 (KYC Verifications, Postal Mandats, Seller Payouts, Buyer Refunds)
4. [`SUPERADMIN_SEC04_CATALOG_TAXONOMY_MEDIA.md`](./SUPERADMIN_SEC04_CATALOG_TAXONOMY_MEDIA.md): Pages 11, 12, 13 (Products Moderation, Category Hierarchy, Media Vault)
5. [`SUPERADMIN_SEC05_SUPPORT_DISPUTES_FRAUD.md`](./SUPERADMIN_SEC05_SUPPORT_DISPUTES_FRAUD.md): Pages 14, 15, 16, 19, 28 (Mediation Chat, Fraud Reports, Dispute Dossiers, Fraud Radar, Helpdesk Tickets)
6. [`SUPERADMIN_SEC06_ADS_SUBSCRIPTIONS_SAAS.md`](./SUPERADMIN_SEC06_ADS_SUBSCRIPTIONS_SAAS.md): Pages 17, 18, 20 (PandaAds Campaigns, SaaS Invoicing, Plan Features)
7. [`SUPERADMIN_SEC07_INFRASTRUCTURE_AUDIT_LOGS.md`](./SUPERADMIN_SEC07_INFRASTRUCTURE_AUDIT_LOGS.md): Pages 21, 22, 23, 24, 25 (AI Token Telemetry, Audit Trails, Server Health Logs)
8. [`SUPERADMIN_SEC08_CONFIG_CMS_COMMUNICATIONS.md`](./SUPERADMIN_SEC08_CONFIG_CMS_COMMUNICATIONS.md): Pages 26, 27, 29, 30 (Platform Config, SMTP Mail, CMS Articles, SEO Editor)

### Seller Dashboard Sections (Pages 32 to 71)
1. [`SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md`](./SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md): Pages 32, 33, 34 (Cockpit, Store Onboarding, Real-time Analytics)
2. [`SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md`](./SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md): Pages 36, 37, 39 (Products Catalog, Store Collections, Media Asset Vault)
3. [`SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md`](./SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md): Pages 40, 41, 71 (Orders Fulfillment & Courier Pipeline, Buyer Chat & 1-Click COD, Mobile Courier Handshake)
4. [`SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md`](./SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md): Pages 42, 43, 58 (Wallet & 20-digit RIB Payouts, Financial Reports, Store Payment Methods)
5. [`SELLER_SEC05_ONLINE_STOREFRONT_BUILDER.md`](./SELLER_SEC05_ONLINE_STOREFRONT_BUILDER.md): Pages 44, 45, 46, 47, 48, 49, 50, 51, 52 (Storefront Hub, Themes Gallery, CSS Customizer, Sections, Navigation, Pages, Domains, SEO, Carrier Calculator)
6. [`SELLER_SEC06_MARKETING_ADS_CRM_LOYALTY.md`](./SELLER_SEC06_MARKETING_ADS_CRM_LOYALTY.md): Pages 35, 38, 53, 69, 70 (PandaAds Campaigns, VIP Coupons & Loyalty, Customer Directory, Aliases)
7. [`SELLER_SEC07_AI_STUDIO_SUBSCRIPTION_BILLING.md`](./SELLER_SEC07_AI_STUDIO_SUBSCRIPTION_BILLING.md): Pages 54, 55, 56, 57 (AI Merchant Studio, Subscription Plans, Recurring Payment, Invoices)
8. [`SELLER_SEC08_DISPUTES_SETTINGS_DEV_ORGANIZATION.md`](./SELLER_SEC08_DISPUTES_SETTINGS_DEV_ORGANIZATION.md): Pages 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 (Disputes, Identity Settings, KYC Portal, REST API, Webhooks, Notifications, Helpdesk, Multi-Store Switcher)

---

## How to Proceed When OpenDesign Design Is Provided

1. **Provide the OpenDesign files / project link**.
2. **Review design tokens & theme variant name**.
3. **Follow the sequence in [`TODO_MASTER_CHECKLIST.md`](./TODO_MASTER_CHECKLIST.md)** to implement each section systematically.
