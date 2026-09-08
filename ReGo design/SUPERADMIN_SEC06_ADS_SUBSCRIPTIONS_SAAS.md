# Superadmin Section 6: Advertising & SaaS Subscriptions

> **Operational Objective**: PandaAds marketplace campaigns, SaaS subscription orders/invoicing, and subscription tier limits/features configuration.
> **Application Routes**: `/(admin)/marketing/ads`, `/(admin)/settings/subscriptions`, `/(admin)/settings/plans`
> **Pages Covered in this Section**: Page 17, Page 18, Page 20

---

## 1. Section Navigation & Menu Placement

| Page # | Menu Label | Sidebar Group | Route Path | Assigned Icon | Breadcrumb Trail |
|---|---|---|---|---|---|
| Page 17 | **Campagnes PandaAds** | `Group 6: Monétisation & Abonnements` | `/ads` | `Megaphone` | `Administration > Monétisation > PandaAds` |
| Page 18 | **Commandes d'Abonnement** | `Group 6: Monétisation & Abonnements` | `/subscription-orders` | `ReceiptText` | `Administration > Monétisation > Commandes d'Abonnement` |
| Page 20 | **Forfaits & Quotas SaaS** | `Group 6: Monétisation & Abonnements` | `/plans` | `Crown` | `Administration > Monétisation > Forfaits & Quotas` |

---

## 2. Standardized 8-Layer Anatomical Layout Order

Every page in this section strictly respects the universal top-to-bottom layout sequence:
1. **Layer 1 (Breadcrumb)**: Clear clickable trail indicating exact location.
2. **Layer 2 (Header Bar)**: Domain icon, page title, status tags, and primary action cluster.
3. **Layer 3 (Operational Alert)**: Conditional alert banner (warnings, critical KYC/stock/COD alerts).
4. **Layer 4 (Telemetry & KPI Strip)**: 3 to 5 standardized cards formatted in `TND 0.000` with comparative deltas.
5. **Layer 5 (Control Toolbar)**: Full-text search, filter pills/dropdowns, date range picker, and batch actions.
6. **Layer 6 (Main Working Area)**: Primary tabular data, interactive bento widgets, or configuration form.
7. **Layer 7 (Inspection Drawer)**: Slide-out panel for fast record inspection without leaving page context.
8. **Layer 8 (Modals & Dialogs)**: Focus-trapped confirmation or creation dialogs.

---

## 3. High-Fidelity Page Specifications & Raw Content

### [Page 17] PandaAds Global Campaign Management & Placement Pricing

- **Navigation Placement**: `Group 6: Monétisation & Abonnements` > **Campagnes PandaAds**
- **Primary Route**: `/ads`
- **Breadcrumb Hierarchy**: `Administration > Monétisation > PandaAds`
- **Layer 6 Archetype**: `Ad Campaign Auction Matrix & Impression Monitors`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Monétisation > PandaAds`
2. **Header Bar**: Title `PandaAds Global Campaign Management & Placement Pricing` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Ad Campaign Auction Matrix & Impression Monitors.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 17. PandaAds Global Campaign Management & Placement Pricing
- **Route Path**: `/ads`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Supervision de la régie publicitaire PandaAds, gestion des tarifs par emplacement (Accueil, Tête de Rayon, Recherche), audit des budgets dépensés et modération des visuels sponsorisés.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Croissance & Monétisation > PandaAds Régie Pub`
- **Page Heading**: "Administration de la Régie Publicitaire PandaAds"
- **Subtitle / Description**: "Contrôlez les campagnes sponsorisées des vendeurs, fixez les prix des enchères CPC/CPM et modérez les créatifs publicitaires."

#### B. Key Performance Indicators (KPIs)
- **Revenu Publicitaire Cumulé**: `48,250.000 TND`
- **Campagnes Actives Simultanées**: `142 campagnes`
- **Impressions Publicitaires Servies (30j)**: `1,850,000 affichages`
- **Taux de Clic Moyen (CTR Global)**: `3.45%`
- **Coût Moyen par Clic (CPC)**: `0.180 TND`

#### C. Control Bar & Action Matrix
- **Filtres de Campagnes**: `[Toutes les campagnes, Actives, En attente de validation créative, Terminées, Suspendues]`
- **Champ de Recherche**: "Rechercher par nom de campagne, boutique ou produit sponsorisé..."
- **Bouton d'Action**: `Paramétrer les Tarifs des Emplacements Publicitaires`

#### D. Data Collection — Tableau des Campagnes Publicitaires
- **En-têtes de colonnes**:
  1. `Campagne & Créatif` (Vignette visuelle, Titre de l'annonce, Produit rattaché)
  2. `Boutique Annonceuse` (Nom du marchand, Solde publicitaire disponible)
  3. `Emplacement` (Bannière Accueil, Produit Sponsorisé en Recherche, Tête de Catégorie)
  4. `Modèle & Budget` (Budget Quotidien TND, Budget Total TND, Dépensé)
  5. `Performance` (Impressions, Clics, CTR %, Ventes générées en TND)
  6. `ROAS Moyen` (Retour sur dépense publicitaire: e.g. `4.8x`)
  7. `Statut` (Badge: En diffusion, En attente d'approbation, Épuisée)
  8. `Actions`
- **Actions par ligne**:
  - `Aperçu du créatif publicitaire`
  - `Approuver la diffusion`
  - `Mettre en pause la campagne`
  - `Rejeter pour non-conformité créative`

---

### [Page 18] SaaS Subscription Orders & Invoicing

- **Navigation Placement**: `Group 6: Monétisation & Abonnements` > **Commandes d'Abonnement**
- **Primary Route**: `/subscription-orders`
- **Breadcrumb Hierarchy**: `Administration > Monétisation > Commandes d'Abonnement`
- **Layer 6 Archetype**: `SaaS Invoicing Order Book with VAT Breakdown`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Monétisation > Commandes d'Abonnement`
2. **Header Bar**: Title `SaaS Subscription Orders & Invoicing` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: SaaS Invoicing Order Book with VAT Breakdown.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 18. SaaS Subscription Orders & Invoicing
- **Route Path**: `/subscription-orders`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Registre des souscriptions aux abonnements SaaS PandaMarket, suivi des factures d'abonnement échues, renouvellements automatiques et archivage fiscal.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Croissance & Monétisation > Commandes d'Abonnement`
- **Page Heading**: "Facturation & Commandes d'Abonnement SaaS"
- **Subtitle / Description**: "Gérez l'ensemble des commandes de forfaits d'abonnement des marchands, suivez les encaissements récurrents et téléchargez les factures fiscales."

#### B. Key Performance Indicators (KPIs)
- **Revenu Récurrent Mensuel (MRR)**: `18,400.000 TND`
- **Revenu Récurrent Annuel (ARR)**: `220,800.000 TND`
- **Abonnements Payants Actifs**: `384 boutiques`
- **Factures Impayées / En Retard**: `12 commandes`

#### C. Control Bar & Filter Matrix
- **Filtre par Statut de Paiement**: `[Tous, Payée, En attente de règlement, Échouée / Rejetée, Remboursée]`
- **Filtre par Formule d'Abonnement**: `[Tous les plans, Starter, Regular, Pro, Agence, Gold, Platinum]`
- **Filtre par Mécanisme de Paiement**: `[Carte Bancaire, Flouci, Mandat Postal, Prélèvement sur Solde Vendeur]`
- **Champ de Recherche**: "Rechercher par numéro de facture, boutique ou email..."
- **Bouton d'Action**: `Exporter le Grand Livre des Abonnements (Excel / CSV)`

#### D. Data Collection — Tableau des Factures d'Abonnement
- **En-têtes de colonnes**:
  1. `N° Facture` (e.g. `INV-SUB-2026-00482`)
  2. `Boutique & Marchand` (Nom de la boutique, Email du gérant)
  3. `Plan & Période` (Plan Pro — Forfait Annuel 2026-2027)
  4. `Montant HT / TVA / TTC` (Montant en TND avec décomposition fiscale 19%)
  5. `Mode de Paiement` (Badge du moyen de règlement)
  6. `Date d'Émission & Échéance` (Dates légales)
  7. `Statut` (Badge: Réglée, En attente, En retard)
  8. `Actions`
- **Actions par ligne**:
  - `Télécharger la Facture Fiscale PDF`
  - `Renvoyer le reçu par email`
  - `Marquer manuellement comme payée`
  - `Annuler la commande d'abonnement`

---

### [Page 20] SaaS Subscription Plans, Features & Tier Limits Management

- **Navigation Placement**: `Group 6: Monétisation & Abonnements` > **Forfaits & Quotas SaaS**
- **Primary Route**: `/plans`
- **Breadcrumb Hierarchy**: `Administration > Monétisation > Forfaits & Quotas`
- **Layer 6 Archetype**: `Tier Limits & Feature Matrix Multi-Plan Editor`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Monétisation > Forfaits & Quotas`
2. **Header Bar**: Title `SaaS Subscription Plans, Features & Tier Limits Management` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Tier Limits & Feature Matrix Multi-Plan Editor.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 20. SaaS Subscription Plans, Features & Tier Limits Management
- **Route Path**: `/plans`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Configuration de la grille tarifaire des abonnements marchands (Free, Starter, Pro, Agence, etc.), définition des quotas d'articles, taux de commission et fonctionnalités exclusives.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Croissance & Monétisation > Plans d'Abonnement`
- **Page Heading**: "Configuration des Plans & Quotas SaaS"
- **Subtitle / Description**: "Définissez la grille tarifaire, les fonctionnalités incluses, les limites de stockage, et les quotas de produits pour chaque formule d'abonnement."

#### B. Control Bar & Action Triggers
- **Bouton Primaire**: `+ Créer un Nouveau Plan d'Abonnement`
- **Bouton Secondaire**: `Enregistrer les Modifications de Grille`

#### C. Data Collection — Matrice des Plans Actuels
- **Plan 1 : Free / Gratuit**
  - Prix : `0 TND / mois`
  - Commission plateforme : `10% sur les ventes`
  - Quota de produits : `Max 15 articles`
  - Fonctionnalités : Sous-domaine pandamarket.tn, Support standard, Thème basique
- **Plan 2 : Starter**
  - Prix : `29.000 TND / mois` (ou `290.000 TND / an`)
  - Commission plateforme : `8% sur les ventes`
  - Quota de produits : `Max 50 articles`
  - Fonctionnalités : Domaine personnalisé inclus, Accès PandaAds, Support prioritaire
- **Plan 3 : Pro / Vendeur Pro**
  - Prix : `69.000 TND / mois` (ou `690.000 TND / an`)
  - Commission plateforme : `5% sur les ventes`
  - Quota de produits : `Catalogue Illimité`
  - Fonctionnalités : Thèmes premium, Assistant IA illimité, Outil de négociation COD automatique, Clés d'API & Webhooks
- **Plan 4 : Agence / Entreprise**
  - Prix : `149.000 TND / mois` (ou `1,490.000 TND / an`)
  - Commission plateforme : `3% sur les ventes`
  - Quota de produits : `Catalogue Illimité + Multi-boutiques (Jusqu'à 5 stores)`
  - Fonctionnalités : Gestionnaire de compte dédié, Accompagnement logistique, Rapports comptables automatisés

#### D. Formulaire d'Édition d'un Plan
- **Champs**:
  - Identifiant unique du plan (`plan_id`: free, starter, pro, etc.)
  - Nom public affiché (Français, Arabe, Anglais)
  - Description marketing du forfait
  - Tarif Mensuel (TND) et Tarif Annuel avec remise (TND)
  - Taux de commission par défaut (%)
  - Limite de produits autorisés (Nombre ou case `Illimité`)
  - Quota de jetons IA par mois (Tokens)
  - Matrice des permissions (Cases à cocher: Domaines personnalisés, Accès API, Messagerie directe, Export comptable, Thèmes custom)
  - Boutons : `Enregistrer le plan`, `Archiver le plan`

---

