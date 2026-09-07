# PandaMarket DASHBOARD Design Repository

This directory serves as the authoritative blueprint, information architecture, navigation standard, and implementation plan for the **PandaMarket Superadmin and Seller Dashboards**.

It is specifically engineered to:
1. Support **multi-theme selection** (allowing Sellers to choose between **Bento Cockpit**, **Classique**, and **OpenDesign**, and Superadmins to choose between **Mission Control**, **Enterprise Clean**, and **OpenDesign**).
2. Establish a unified, standardized **8-layer layout order** for all pages.
3. Organize all **71 pages** into strictly categorized **sidebar menu groups** with unambiguous breadcrumbs, icons, and badges.
4. Seamlessly ingest and apply the incoming **OpenDesign design template**.

---

## Directory Contents & Architectural Index

### Core Architecture & Standard Documents
- [DASHBOARD_RAW_CONTENT_BLUEPRINT.md](./DASHBOARD_RAW_CONTENT_BLUEPRINT.md): The master unstyled raw content blueprint for all 71 pages across the entire platform.
- [NAVIGATION_AND_MENU_HIERARCHY.md](./NAVIGATION_AND_MENU_HIERARCHY.md): The authoritative navigation hierarchy, sidebar menu groups (8 for Seller, 8 for Superadmin), routing paths, badges, and breadcrumb trails.
- [PAGE_LAYOUT_AND_ORDERING_STANDARDS.md](./PAGE_LAYOUT_AND_ORDERING_STANDARDS.md): Universal 8-layer anatomical layout hierarchy (Breadcrumbs -> Header -> Critical Banner -> KPI Strip -> Filter Toolbar -> Main Working Area -> Inspection Drawer -> Modals).
- [THEME_ARCHITECTURE_AND_SPECS.md](./THEME_ARCHITECTURE_AND_SPECS.md): Specifications for the dual-dashboard theme switching system (Bento Cockpit, Classique, OpenDesign, Mission Control, Enterprise Clean) and state persistence.
- [TODO_MASTER_CHECKLIST.md](./TODO_MASTER_CHECKLIST.md): Exhaustive implementation checklist covering all phases, themes, and 71 pages.

---

### Superadmin Dashboard Sections (31 Pages Total)
| Section File | Title / Operational Domain | Covered Pages | Sidebar Group |
|---|---|---|---|
| [SUPERADMIN_SEC01_OVERVIEW_AND_TELEMETRY.md](./SUPERADMIN_SEC01_OVERVIEW_AND_TELEMETRY.md) | Overview, Business Analytics & Sticky Notes | Pages 1, 2, 3 | Group 1: Pilotage & Télémétrie |
| [SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md](./SUPERADMIN_SEC02_MERCHANTS_USERS_BUYERS.md) | Merchants Directory, Users & Shoppers | Pages 4, 5, 6, 31 | Group 2: Commerces & Utilisateurs |
| [SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md](./SUPERADMIN_SEC03_FINANCE_ESCROW_PAYOUTS.md) | KYC Audits, Mandats, RIB Payouts & Refunds | Pages 7, 8, 9, 10 | Group 3: Conformité & Finance |
| [SUPERADMIN_SEC04_CATALOG_TAXONOMY_MEDIA.md](./SUPERADMIN_SEC04_CATALOG_TAXONOMY_MEDIA.md) | Products Catalog, Category Tree & Media CDN | Pages 11, 12, 13 | Group 4: Catalogue & Modération |
| [SUPERADMIN_SEC05_SUPPORT_DISPUTES_FRAUD.md](./SUPERADMIN_SEC05_SUPPORT_DISPUTES_FRAUD.md) | Mediation Chat, Fraud Radar & Helpdesk | Pages 14, 15, 16, 19, 28 | Group 5: Confiance, Litiges & Support |
| [SUPERADMIN_SEC06_ADS_SUBSCRIPTIONS_SAAS.md](./SUPERADMIN_SEC06_ADS_SUBSCRIPTIONS_SAAS.md) | PandaAds Campaigns, SaaS Invoicing & Plans | Pages 17, 18, 20 | Group 6: Monétisation & Abonnements |
| [SUPERADMIN_SEC07_INFRASTRUCTURE_AUDIT_LOGS.md](./SUPERADMIN_SEC07_INFRASTRUCTURE_AUDIT_LOGS.md) | AI Token Telemetry, Audit Trails & Server Logs | Pages 21, 22, 23, 24, 25 | Group 7: Infrastructure & Audit |
| [SUPERADMIN_SEC08_CONFIG_CMS_COMMUNICATIONS.md](./SUPERADMIN_SEC08_CONFIG_CMS_COMMUNICATIONS.md) | Platform Config, SMTP Mail & CMS SEO Editor | Pages 26, 27, 29, 30 | Group 8: Gouvernance & Configuration |

---

### Seller Dashboard Sections (40 Pages Total)
| Section File | Title / Operational Domain | Covered Pages | Sidebar Group |
|---|---|---|---|
| [SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md](./SELLER_SEC01_COCKPIT_ONBOARDING_ANALYTICS.md) | Cockpit, Store Launch Guide & Analytics | Pages 32, 33, 34 | Group 1: Pilotage & Cockpit |
| [SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md](./SELLER_SEC02_CATALOG_INVENTORY_COLLECTIONS.md) | Products, Categories, Stock & Media Vault | Pages 36, 37, 39 | Group 3: Catalogue & Stocks |
| [SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md](./SELLER_SEC03_ORDERS_FULFILLMENT_NEGOTIATION.md) | Orders, Courier Dispatch, COD Chat & Mobile Courier | Pages 40, 41, 71 | Group 2: Ventes & Opérations |
| [SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md](./SELLER_SEC04_WALLET_PAYOUTS_FINANCES.md) | Wallet & 20-digit RIB Payouts, Reports & Payments | Pages 42, 43, 58 | Group 6: Finance & Trésorerie |
| [SELLER_SEC05_ONLINE_STOREFRONT_BUILDER.md](./SELLER_SEC05_ONLINE_STOREFRONT_BUILDER.md) | Themes Gallery, Customizer, Sections, Menus, SEO, Domains | Pages 44, 45, 46, 47, 48, 49, 50, 51, 52 | Group 5: Boutique en Ligne |
| [SELLER_SEC06_MARKETING_ADS_CRM_LOYALTY.md](./SELLER_SEC06_MARKETING_ADS_CRM_LOYALTY.md) | PandaAds Ads, VIP Coupons, Loyalty & Customer Registry | Pages 35, 38, 53, 69, 70 | Group 4: Clients & Marketing |
| [SELLER_SEC07_AI_STUDIO_SUBSCRIPTION_BILLING.md](./SELLER_SEC07_AI_STUDIO_SUBSCRIPTION_BILLING.md) | AI Merchant Studio, SaaS Plans & Invoices | Pages 54, 55, 56, 57 | Group 7: Studio IA & Support |
| [SELLER_SEC08_DISPUTES_SETTINGS_DEV_ORGANIZATION.md](./SELLER_SEC08_DISPUTES_SETTINGS_DEV_ORGANIZATION.md) | Disputes, Identity, KYC Portal, REST API, Notifications | Pages 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | Group 8: Paramètres & Organisation |

---

## 3. Universal 8-Layer Anatomical Layout

Every page in both dashboards strictly follows this vertical element order:
`
1. [Layer 1] Breadcrumbs Navigation Trail (e.g. Accueil > Ventes > Commandes)
2. [Layer 2] Page Title Bar (Icon + Title + Status Tag + Action Buttons)
3. [Layer 3] Critical Operational Alert (KYC verification, COD anti-refus, low stock)
4. [Layer 4] Telemetry & KPI Cards Strip (3 to 5 metrics with delta comparison)
5. [Layer 5] Control Bar & Filter Toolbar (Search, filter tabs, dates, batch actions)
6. [Layer 6] Main Operational Working Area (Data table, bento grid, or visual editor)
7. [Layer 7] Detail Inspection Drawer (Slide-out panel for fast record drilldown)
8. [Layer 8] Focus-Trapped Modals & Dialogs (Creation, confirmations, exports)
`

---

## 4. Next Steps for OpenDesign Implementation

1. When the OpenDesign template is delivered, extract the visual tokens (typography, color palettes, border radii, shadows).
2. Register the OpenDesign variant in the DashboardThemeProvider.
3. Follow the sequence defined in [TODO_MASTER_CHECKLIST.md](./TODO_MASTER_CHECKLIST.md) to implement each page according to the enriched section specifications.
