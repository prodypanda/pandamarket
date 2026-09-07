# PandaMarket Dashboards: Complete Navigation & Menu Hierarchy Architecture

## 1. Executive Overview

This document specifies the authoritative, ergonomic **Information Architecture (IA)** and **Menu Hierarchy** for both the **Seller Dashboard** and the **Superadmin Dashboard**.

It resolves all routing ambiguities, establishes a strict logical order for sidebar navigation items, defines exact breadcrumb hierarchies, and standardizes badge alerts, icon assignments, and access permissions.

---

## 2. Seller Dashboard Navigation & Menu Hierarchy (`/hub/dashboard/*`)

The Seller navigation is organized into **8 core operational groups**, designed to guide the merchant from daily high-frequency workflows (orders, messages) to medium-frequency tasks (products, inventory) to low-frequency settings (KYC, configuration).

### Summary Table of Groups & Menu Order

| Group # | Group Title | Target Scope | Items Count | Primary Frequency |
|---|---|---|---|---|
| **Group 1** | **Pilotage & Cockpit** | Executive overview, launch guide, sales analytics | 4 items | Daily / Real-time |
| **Group 2** | **Ventes & Opérations** | Orders fulfillment, courier pipeline, buyer chat, driver console | 4 items | Continuous / Real-time |
| **Group 3** | **Catalogue & Stocks** | Products, categories, collections, stock adjustments, media | 4 items | Daily / Weekly |
| **Group 4** | **Clients & Marketing** | Customer directory, PandaAds campaigns, discounts, loyalty | 4 items | Weekly / Periodic |
| **Group 5** | **Boutique en Ligne** | Storefront customizer, themes, pages, navigation, SEO, domains | 8 items | Weekly / Setup |
| **Group 6** | **Finance & Trésorerie** | Wallet, 20-digit RIB payouts, financial reports, payment gateways | 4 items | Daily / Weekly |
| **Group 7** | **Studio IA & Support** | AI copywriting studio, disputes & claims, helpdesk tickets | 4 items | Daily / As needed |
| **Group 8** | **Paramètres & Organisation** | Store profile, KYC legal dossier, API keys, multi-store | 6 items | Setup / Periodic |

---

### Detailed Menu Items & Breadcrumbs for Seller Dashboard

#### Group 1: Pilotage & Cockpit (Executive Overview)
1. **Vue d'ensemble (Cockpit)**
   - **Route**: `/hub/dashboard`
   - **Icon**: `LayoutDashboard`
   - **Badge**: Dynamic status indicator (e.g. `LIVE`, `3 alertes`)
   - **Breadcrumb**: `Accueil > Tableau de bord`
   - **Theme Variants**: Bento Cockpit (default) | Classique E-Commerce | OpenDesign
2. **Guide de Lancement (Onboarding)**
   - **Route**: `/hub/dashboard/onboarding`
   - **Icon**: `CheckCircle2`
   - **Badge**: Completion percentage (e.g. `80%`)
   - **Breadcrumb**: `Accueil > Tableau de bord > Guide de lancement`
3. **Statistiques & Performance (Analytics)**
   - **Route**: `/hub/dashboard/analytics`
   - **Icon**: `BarChart3`
   - **Breadcrumb**: `Accueil > Tableau de bord > Statistiques`
4. **PandaAds (Campagnes & Publicité)**
   - **Route**: `/hub/dashboard/ads` (Alias: `/hub/dashboard/marketing`)
   - **Icon**: `Megaphone`
   - **Breadcrumb**: `Accueil > Tableau de bord > PandaAds`

#### Group 2: Ventes & Opérations (Orders & Logistics)
5. **Commandes & Expéditions (Orders Fulfillment)**
   - **Route**: `/hub/dashboard/orders`
   - **Icon**: `ShoppingCart`
   - **Badge**: Pending orders count (e.g. `12 à traiter`)
   - **Breadcrumb**: `Accueil > Ventes > Commandes`
   - **Sub-filters / Tabs**: En attente | Confirmées (COD) | Expédiées | Livrées | Retours & Refus
6. **Messagerie Acheteurs & Négociation (Chat & COD Validation)**
   - **Route**: `/hub/dashboard/messages`
   - **Icon**: `MessageSquare`
   - **Badge**: Unread messages count (e.g. `3`)
   - **Breadcrumb**: `Accueil > Ventes > Messagerie clients`
   - **Action**: 1-Click COD Validation in thread
7. **Transporteurs & Expéditions (Shipping Carriers)**
   - **Route**: `/hub/dashboard/shipping`
   - **Icon**: `Truck`
   - **Breadcrumb**: `Accueil > Ventes > Transporteurs & Tarifs`
8. **Console Livreur Mobile (Courier Delivery Handshake)**
   - **Route**: `/courier`
   - **Icon**: `Smartphone`
   - **Breadcrumb**: `Accueil > Ventes > Console Livreur`

#### Group 3: Catalogue & Stocks (Catalog & Inventory)
9. **Produits & Variantes (Products)**
   - **Route**: `/hub/dashboard/products`
   - **Icon**: `Package`
   - **Quick Action**: `+ Nouveau Produit` (`/hub/dashboard/products/create`)
   - **Breadcrumb**: `Accueil > Catalogue > Produits`
10. **Catégories & Collections (Categories)**
    - **Route**: `/hub/dashboard/categories` (Alias: `/hub/dashboard/collections`)
    - **Icon**: `Tags`
    - **Breadcrumb**: `Accueil > Catalogue > Catégories & Collections`
11. **Gestion des Stocks & Prix Dynamiques (Inventory & Pricing)**
    - **Route**: `/hub/dashboard/inventory`
    - **Icon**: `Boxes`
    - **Badge**: Low stock alerts (e.g. `4 en rupture`)
    - **Breadcrumb**: `Accueil > Catalogue > Stocks & Inventaire`
12. **Médiathèque & Fichiers CDN (Media Vault)**
    - **Route**: `/hub/dashboard/media`
    - **Icon**: `ImageIcon`
    - **Breadcrumb**: `Accueil > Catalogue > Médiathèque`

#### Group 4: Clients & Marketing (CRM & Growth)
13. **Répertoire Clients (Customers)**
    - **Route**: `/hub/dashboard/customers` (Alias: `/hub/dashboard/online-store/customers`)
    - **Icon**: `Users`
    - **Breadcrumb**: `Accueil > Clients & Marketing > Répertoire Clients`
14. **Coupons, Promotions & Flash Sales (Promotions)**
    - **Route**: `/hub/dashboard/promotions`
    - **Icon**: `Percent`
    - **Breadcrumb**: `Accueil > Clients & Marketing > Promotions`
15. **Programme Fidélité & Abonnés (Loyalty & VIP)**
    - **Route**: `/hub/dashboard/loyalty`
    - **Icon**: `Crown`
    - **Breadcrumb**: `Accueil > Clients & Marketing > Abonnés & Fidélité`
16. **Avis Clients & Modération (Reviews)**
    - **Route**: `/hub/dashboard/reviews`
    - **Icon**: `Star`
    - **Breadcrumb**: `Accueil > Clients & Marketing > Avis Clients`

#### Group 5: Boutique en Ligne (Storefront Builder & Customizer)
17. **Vue d'ensemble Boutique (Online Store Overview)**
    - **Route**: `/hub/dashboard/online-store`
    - **Icon**: `Globe`
    - **Breadcrumb**: `Accueil > Boutique en Ligne > Vue d'ensemble`
18. **Galerie de Thèmes (Themes Gallery)**
    - **Route**: `/hub/dashboard/online-store/themes` (Alias: `/hub/dashboard/online-store/theme`)
    - **Icon**: `Palette`
    - **Breadcrumb**: `Accueil > Boutique en Ligne > Galerie de Thèmes`
19. **Personnalisateur Visuel en Direct (Theme Customizer)**
    - **Route**: `/hub/dashboard/online-store/customize`
    - **Icon**: `Sparkles`
    - **Breadcrumb**: `Accueil > Boutique en Ligne > Personnalisation Visuelle`
20. **Bannières & Carrousels d'Accueil (Banners & Hero)**
    - **Route**: `/hub/dashboard/online-store/banners`
    - **Icon**: `Layout`
    - **Breadcrumb**: `Accueil > Boutique en Ligne > Bannières & Carrousels`
21. **Navigation & Menus En-tête/Pied (Menus Builder)**
    - **Route**: `/hub/dashboard/online-store/navigation`
    - **Icon**: `Navigation`
    - **Breadcrumb**: `Accueil > Boutique en Ligne > Menus & Navigation`
22. **Constructeur de Pages Personnalisées (Page Builder)**
    - **Route**: `/hub/dashboard/page-builder` (Alias: `/hub/dashboard/online-store/pages`)
    - **Icon**: `LayoutTemplate`
    - **Breadcrumb**: `Accueil > Boutique en Ligne > Constructeur de Pages`
23. **Noms de Domaine & Certificats SSL (Domains & DNS)**
    - **Route**: `/hub/dashboard/online-store/domains` (Alias: `/hub/dashboard/online-store/preferences`)
    - **Icon**: `Link2`
    - **Breadcrumb**: `Accueil > Boutique en Ligne > Domaines & DNS`
24. **Référencement SEO & Pixels (SEO & Tracking)**
    - **Route**: `/hub/dashboard/online-store/seo` (Alias: `/hub/dashboard/online-store/integrations`)
    - **Icon**: `Search`
    - **Breadcrumb**: `Accueil > Boutique en Ligne > Référencement & Pixels`

#### Group 6: Finance & Trésorerie (Wallet, Payouts & Gateways)
25. **Portefeuille & Virements Bancaires RIB (Wallet & Payouts)**
    - **Route**: `/hub/dashboard/wallet` (Alias: `/hub/dashboard/payouts`)
    - **Icon**: `Wallet`
    - **Badge**: Available balance in TND (e.g. `2,450.000 TND`)
    - **Breadcrumb**: `Accueil > Finance > Portefeuille & Virements`
26. **Rapports Financiers, Factures & TVA (Financial Reports)**
    - **Route**: `/hub/dashboard/financial` (Alias: `/hub/dashboard/reports`)
    - **Icon**: `ReceiptText`
    - **Breadcrumb**: `Accueil > Finance > Rapports Financiers & Déclarations`
27. **Configuration des Passerelles de Paiement (Payment Gateways & COD)**
    - **Route**: `/hub/dashboard/payment-config`
    - **Icon**: `CreditCard`
    - **Breadcrumb**: `Accueil > Finance > Passerelles de Paiement`
28. **Forfait SaaS & Factures d'Abonnement (Billing & Plans)**
    - **Route**: `/hub/dashboard/subscription` (Alias: `/hub/dashboard/billing`)
    - **Icon**: `ShieldCheck`
    - **Breadcrumb**: `Accueil > Finance > Forfait & Abonnement`

#### Group 7: Studio IA & Support (AI, Tickets & Disputes)
29. **Studio IA PandaMarket (AI Merchant Studio)**
    - **Route**: `/hub/dashboard/ai`
    - **Icon**: `Sparkles`
    - **Badge**: `PRO`
    - **Breadcrumb**: `Accueil > Outils & Support > Studio IA`
30. **Litiges & Réclamations Clients (Disputes)**
    - **Route**: `/hub/dashboard/disputes` (Alias: `/hub/dashboard/reports`)
    - **Icon**: `Flag`
    - **Badge**: Open disputes (e.g. `1 actif`)
    - **Breadcrumb**: `Accueil > Outils & Support > Litiges & Réclamations`
31. **Centre d'Aide & Support Vendeur (Helpdesk)**
    - **Route**: `/hub/dashboard/help`
    - **Icon**: `HelpCircle`
    - **Breadcrumb**: `Accueil > Outils & Support > Centre d'Aide`
32. **Centre de Notifications & Alertes (Notifications)**
    - **Route**: `/hub/dashboard/notifications`
    - **Icon**: `Bell`
    - **Breadcrumb**: `Accueil > Outils & Support > Notifications`

#### Group 8: Paramètres & Organisation (Store Identity & Settings)
33. **Paramètres de la Boutique (Store Profile & Settings)**
    - **Route**: `/hub/dashboard/settings`
    - **Icon**: `Settings`
    - **Breadcrumb**: `Accueil > Paramètres > Profil Boutique`
34. **Dossier de Vérification KYC (KYC Verification Dossier)**
    - **Route**: `/hub/dashboard/kyc`
    - **Icon**: `Shield`
    - **Badge**: Status badge (`Vérifié` / `En attente` / `Requis`)
    - **Breadcrumb**: `Accueil > Paramètres > Vérification KYC`
35. **Sécurité, 2FA & Sessions Actives (Security)**
    - **Route**: `/hub/dashboard/security`
    - **Icon**: `Lock`
    - **Breadcrumb**: `Accueil > Paramètres > Sécurité`
36. **Équipe & Permissions Collaborateurs (Staff & Roles)**
    - **Route**: `/hub/dashboard/staff`
    - **Icon**: `UserCheck`
    - **Breadcrumb**: `Accueil > Paramètres > Équipe`
37. **Clés API REST & Webhooks (Developer Tools)**
    - **Route**: `/hub/dashboard/api-keys` (Webhooks: `/hub/dashboard/webhooks`)
    - **Icon**: `Code2`
    - **Breadcrumb**: `Accueil > Paramètres > Développeurs & Webhooks`
38. **Sélecteur Multi-Boutiques (Store Switcher / Create Store)**
    - **Route**: `/hub/dashboard/select-store` (Create: `/hub/dashboard/create-store`)
    - **Icon**: `Store`
    - **Breadcrumb**: `Accueil > Paramètres > Mes Boutiques`

---

## 3. Superadmin Dashboard Navigation & Menu Hierarchy (`/(admin)/*`)

The Superadmin navigation is organized into **8 governance groups**, structured for platform integrity, security, financial clearing, and regulatory compliance.

### Summary Table of Groups & Menu Order

| Group # | Group Title | Operational Scope | Items Count | Role Access |
|---|---|---|---|---|
| **Group 1** | **Pilotage & Télémétrie** | Executive telemetry, business intelligence, operational board | 3 items | Superadmin, Admin, Analyst |
| **Group 2** | **Commerces & Utilisateurs** | Merchants directory, platform users, buyers registry | 4 items | Superadmin, Admin, Support |
| **Group 3** | **Conformité & Finance** | KYC audits, postal mandats, seller disbursements, refunds | 4 items | Superadmin, Compliance, Finance |
| **Group 4** | **Catalogue & Modération** | Marketplace products, categories tree, CDN file storage | 3 items | Superadmin, Content Moderator |
| **Group 5** | **Confiance, Litiges & Support** | Tripartite mediation chat, fraud radar, tickets, violations | 5 items | Superadmin, Risk, Support |
| **Group 6** | **Monétisation & Abonnements** | PandaAds campaigns, subscription orders, SaaS tier plans | 3 items | Superadmin, Monetization Lead |
| **Group 7** | **Infrastructure & Audit** | AI costs, security audit logs, server performance logs | 5 items | Superadmin, DevOps Engineer |
| **Group 8** | **Gouvernance & Configuration** | Global settings, SMTP mail, CMS policies & blog editor | 4 items | Superadmin |

---

### Detailed Menu Items & Breadcrumbs for Superadmin Dashboard

#### Group 1: Pilotage & Télémétrie (Executive Telemetry)
1. **Tableau de Bord Exécutif (Overview)**
   - **Route**: `/dashboard` (Alias: `/(admin)/dashboard`)
   - **Icon**: `LayoutDashboard`
   - **Badge**: System status pulse (`OK` / `Incident`)
   - **Breadcrumb**: `Administration > Pilotage > Tableau de bord`
   - **Theme Variants**: Mission Control (default dark) | Enterprise Clean | OpenDesign
2. **Statistiques & Intelligence Plateforme (Platform Analytics)**
   - **Route**: `/platform-analytics` (Alias: `/(admin)/analytics`)
   - **Icon**: `LineChart`
   - **Breadcrumb**: `Administration > Pilotage > Statistiques Globales`
3. **Bloc-notes & Rappels Opérationnels (Notes & Reminders)**
   - **Route**: `/admin-notes` (Alias: `/(admin)/notes`)
   - **Icon**: `StickyNote`
   - **Breadcrumb**: `Administration > Pilotage > Notes & Rappels`

#### Group 2: Commerces & Utilisateurs (Stores & User Directory)
4. **Répertoire des Boutiques Vendeurs (Stores Overview)**
   - **Route**: `/stores` (Alias: `/(admin)/sellers`)
   - **Icon**: `Store`
   - **Badge**: Pending store activations count
   - **Breadcrumb**: `Administration > Commerces > Boutiques`
5. **Utilisateurs & Vendeurs de la Plateforme (Users & Vendors)**
   - **Route**: `/users` (Alias: `/(admin)/users`)
   - **Icon**: `Users`
   - **Breadcrumb**: `Administration > Commerces > Utilisateurs & Vendeurs`
6. **Répertoire des Acheteurs (Buyers Directory)**
   - **Route**: `/buyers` (Alias: `/(admin)/customers`)
   - **Icon**: `UserCheck`
   - **Breadcrumb**: `Administration > Commerces > Acheteurs`
7. **Raccourci Accès Vendeurs (Vendors Quick Access)**
   - **Route**: `/(admin)/vendors` (Direct alias to `/users?role=vendor`)
   - **Icon**: `ExternalLink`
   - **Breadcrumb**: `Administration > Commerces > Vendeurs (Filtre)`

#### Group 3: Conformité & Finance (KYC, Escrow & Settlements)
8. **Audits & Vérifications KYC (KYC Verifications)**
   - **Route**: `/kyc` (Alias: `/(admin)/kyc`)
   - **Icon**: `ShieldCheck`
   - **Badge**: Pending document reviews count (e.g. `7 en attente`)
   - **Breadcrumb**: `Administration > Conformité > Vérifications KYC`
9. **Validation des Mandats Postaux (Postal Mandats Review)**
   - **Route**: `/mandats` (Alias: `/(admin)/payments`)
   - **Icon**: `Receipt`
   - **Badge**: Unverified postal receipts count
   - **Breadcrumb**: `Administration > Conformité > Mandats Postaux`
10. **Demandes de Virement RIB Vendeurs (Seller Payouts & Disbursements)**
    - **Route**: `/withdrawals` (Alias: `/(admin)/payouts`)
    - **Icon**: `Wallet`
    - **Badge**: Total pending disbursement in TND (e.g. `14,890.000 TND`)
    - **Breadcrumb**: `Administration > Conformité > Virements & Décaissements`
11. **Examen des Remboursements & Escrow (Refund Review & Escrow Vault)**
    - **Route**: `/refund-review` (Alias: `/(admin)/escrow`)
    - **Icon**: `RotateCcw`
    - **Breadcrumb**: `Administration > Conformité > Remboursements & Escrow`

#### Group 4: Catalogue & Modération (Marketplace Products & Categories)
12. **Modération des Produits Marchands (Marketplace Products)**
    - **Route**: `/products` (Alias: `/(admin)/products`)
    - **Icon**: `Package`
    - **Badge**: Flagged items count
    - **Breadcrumb**: `Administration > Catalogue > Produits Marchands`
13. **Arborescence Catégories & Commissions (Category Tree & Commissions)**
    - **Route**: `/marketplace-categories` (Alias: `/(admin)/categories`)
    - **Icon**: `Tags`
    - **Breadcrumb**: `Administration > Catalogue > Arborescence Catégories`
14. **Coffre-fort Médias CDN Plateforme (Platform Media Vault)**
    - **Route**: `/platform-media` (Alias: `/(admin)/media`)
    - **Icon**: `FolderOpen`
    - **Breadcrumb**: `Administration > Catalogue > Stockage Médias`

#### Group 5: Confiance, Litiges & Support (Trust, Disputes & Helpdesk)
15. **Messagerie Unifiée & Médiation Litiges (Mediation Chat)**
    - **Route**: `/messages` (Alias: `/(admin)/messages`)
    - **Icon**: `MessageSquare`
    - **Badge**: Unresolved mediation requests
    - **Breadcrumb**: `Administration > Confiance > Chat de Médiation`
16. **Radar Anti-Fraude & RTO (Fraud Radar & High Risk Orders)**
    - **Route**: `/fraud-radar` (Alias: `/(admin)/security/fraud`)
    - **Icon**: `ShieldAlert`
    - **Breadcrumb**: `Administration > Confiance > Radar Anti-Fraude`
17. **Signalements d'Infractions & Dossiers (Violations & Disputes)**
    - **Route**: `/reports` (Alias: `/(admin)/tickets/disputes`)
    - **Icon**: `Flag`
    - **Breadcrumb**: `Administration > Confiance > Signalements & Litiges`
18. **Centre d'Assistance & Tickets Support (Support Desk)**
    - **Route**: `/(admin)/tickets`
    - **Icon**: `LifeBuoy`
    - **Breadcrumb**: `Administration > Confiance > Tickets Support`

#### Group 6: Monétisation & Abonnements (PandaAds & SaaS Plans)
19. **Gestion des Campagnes PandaAds (PandaAds Center)**
    - **Route**: `/ads` (Alias: `/(admin)/marketing/ads`)
    - **Icon**: `Megaphone`
    - **Breadcrumb**: `Administration > Monétisation > PandaAds`
20. **Commandes d'Abonnement SaaS (Subscription Orders)**
    - **Route**: `/subscription-orders` (Alias: `/(admin)/settings/subscriptions`)
    - **Icon**: `ReceiptText`
    - **Breadcrumb**: `Administration > Monétisation > Commandes d'Abonnement`
21. **Gestion des Forfaits & Quotas SaaS (Plans & Feature Limits)**
    - **Route**: `/plans` (Alias: `/(admin)/settings/plans`)
    - **Icon**: `Crown`
    - **Breadcrumb**: `Administration > Monétisation > Forfaits & Quotas`

#### Group 7: Infrastructure & Audit (Telemetry, AI Costs & Logs)
22. **Coûts d'Utilisation IA & Quotas Tokens (AI Usage Costs)**
    - **Route**: `/ai-costs` (Alias: `/(admin)/ai-costs`)
    - **Icon**: `Sparkles`
    - **Badge**: Real-time monthly spend in USD/TND
    - **Breadcrumb**: `Administration > Infrastructure > Coûts IA`
23. **Journal d'Audit Administrateur (Admin Audit Trail)**
    - **Route**: `/audit-log` (Alias: `/(admin)/audit/admin`)
    - **Icon**: `Activity`
    - **Breadcrumb**: `Administration > Infrastructure > Audit Administrateur`
24. **Journal d'Audit Vendeurs (Seller Audit Trail)**
    - **Route**: `/seller-audit-log` (Alias: `/(admin)/audit/merchants`)
    - **Icon**: `FileText`
    - **Breadcrumb**: `Administration > Infrastructure > Audit Vendeurs`
25. **Journal d'Audit Acheteurs (Buyer Audit Trail)**
    - **Route**: `/buyer-audit-log` (Alias: `/(admin)/audit/buyers`)
    - **Icon**: `FileSearch`
    - **Breadcrumb**: `Administration > Infrastructure > Audit Acheteurs`
26. **Logs Serveur & Santé Microservices (System Logs & Health)**
    - **Route**: `/system-logs` (Alias: `/(admin)/system`)
    - **Icon**: `Server`
    - **Breadcrumb**: `Administration > Infrastructure > Logs Serveur`

#### Group 8: Gouvernance & Configuration (Settings, SMTP & CMS)
27. **Configuration Générale de la Plateforme (Platform Settings)**
    - **Route**: `/settings` (Alias: `/(admin)/settings`)
    - **Icon**: `Settings`
    - **Breadcrumb**: `Administration > Gouvernance > Configuration Générale`
28. **Serveur Mail Transactionnel SMTP (SMTP Config & Test Dispatch)**
    - **Route**: `/(admin)/sms-config` (SMTP tab)
    - **Icon**: `Mail`
    - **Breadcrumb**: `Administration > Gouvernance > Serveur Mail SMTP`
29. **Articles CMS & Politiques Légales (CMS Articles & Policies)**
    - **Route**: `/(admin)/blog`
    - **Icon**: `BookOpen`
    - **Breadcrumb**: `Administration > Gouvernance > Articles CMS & Politiques`
30. **Éditeur Markdown & Référencement SEO (CMS Editor)**
    - **Route**: `/(admin)/blog/edit`
    - **Icon**: `Edit3`
    - **Breadcrumb**: `Administration > Gouvernance > Éditeur d'Article`
