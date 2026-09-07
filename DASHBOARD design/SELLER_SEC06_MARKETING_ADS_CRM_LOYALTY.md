# Seller Section 6: Marketing, Advertising, CRM & Loyalty

> **Operational Objective**: PandaAds ad campaign manager with ROAS calculations, VIP followers coupons, loyalty rewards, customer directory, and growth redirect aliases.
> **Application Routes**: `/hub/dashboard/marketing`, `/hub/dashboard/promotions`, `/hub/dashboard/customers`, `/dashboard/loyalty`, `/dashboard/subscribers`
> **Pages Covered in this Section**: Page 35, Page 38, Page 53, Page 69, Page 70

---

## 1. Section Navigation & Menu Placement

| Page # | Menu Label | Sidebar Group | Route Path | Assigned Icon | Breadcrumb Trail |
|---|---|---|---|---|---|
| Page 35 | **PandaAds Marchand** | `Group 4: Clients & Marketing` | `/hub/dashboard/ads` | `Megaphone` | `Accueil > Clients & Marketing > PandaAds` |
| Page 38 | **Coupons & Programme VIP** | `Group 4: Clients & Marketing` | `/hub/dashboard/loyalty` | `Crown` | `Accueil > Clients & Marketing > Abonnés & Fidélité` |
| Page 53 | **Répertoire Clients** | `Group 4: Clients & Marketing` | `/hub/dashboard/customers` | `Users` | `Accueil > Clients & Marketing > Répertoire Clients` |
| Page 69 | **Alias Programme Fidélité** | `Group 4: Clients & Marketing` | `/dashboard/loyalty` | `Crown` | `Accueil > Clients & Marketing > Fidélité (Alias)` |
| Page 70 | **Alias Abonnés Newsletter** | `Group 4: Clients & Marketing` | `/dashboard/subscribers` | `Users` | `Accueil > Clients & Marketing > Abonnés (Alias)` |

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

### [Page 35] PandaAds Center: Campaign Creator, Budgeting & ROAS vs Net Margin

- **Navigation Placement**: `Group 4: Clients & Marketing` > **PandaAds Marchand**
- **Primary Route**: `/hub/dashboard/ads`
- **Breadcrumb Hierarchy**: `Accueil > Clients & Marketing > PandaAds`
- **Layer 6 Archetype**: `Ad Campaign Budgeting Wizard & ROAS vs Margin Calculator`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Clients & Marketing > PandaAds`
2. **Header Bar**: Title `PandaAds Center: Campaign Creator, Budgeting & ROAS vs Net Margin` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Ad Campaign Budgeting Wizard & ROAS vs Margin Calculator.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 35. PandaAds Center: Campaign Creator, Budgeting & ROAS vs Net Margin
- **Route Path**: `/hub/dashboard/ads`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Gestion des campagnes publicitaires sponsorisées pour booster les produits sur la marketplace, calcul de la Marge Nette Marchand à côté du ROAS, assistant de création de campagne en 4 étapes et prévisualisation créative responsive.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Centre Publicitaire PandaAds`
- **Page Heading**: "Centre Publicitaire PandaAds"
- **Subtitle / Description**: "Boostez la visibilité de vos produits phares sur les emplacements stratégiques de PandaMarket et maximisez votre retour sur investissement net."
- **Badges**: `Sponsorisation Vendeur`, `Budget Publicitaire Disponible`

#### B. Key Performance Indicators (KPIs)
- **Solde Publicitaire Disponible**: `85.000 TND`
- **Fonds Publicitaires Réservés (Campagnes en cours)**: `40.000 TND`
- **Dépenses Publicitaires Cumulées**: `640.000 TND`
- **Campagnes Actives Simultanément**: `3 campagnes en diffusion`
- **Retour sur Investissement Publicitaire (ROAS Global)**: `4.85x`
- **Marge Nette Marchand Estimée**: `~64.2%` (Marge réelle après coût publicitaire déduit)
- **Alerte Solde Bas (Si < 5 TND)**: "Solde publicitaire bas : Rechargez votre compte pour éviter l'interruption de vos diffusions."

#### C. Control Bar, Filters & Action Matrix
- **Filtres Temporels**: `[Aujourd'hui, 7 jours, 30 jours, 90 jours]`
- **Champ de Recherche**: "Rechercher une campagne ou un article sponsorisé..."
- **Bouton Primaire 1**: `+ Créer une Nouvelle Campagne (Wizard)`
- **Bouton Primaire 2**: `Recharger mon Solde Publicitaire (Mandat / Carte / Solde Portefeuille)`

#### D. Data Collection — Tableau des Campagnes Publicitaires du Vendeur
- **En-têtes de colonnes**:
  1. `Campagne & Produit` (Vignette de l'article, Nom de la campagne)
  2. `Emplacement` (Bannière Accueil, Produit Sponsorisé en Recherche, Tête de Catégorie)
  3. `Budget Quotidien / Total` (e.g. `10.000 TND / jour · Total 50.000 TND`)
  4. `Dépensé` (Montant consommé à ce jour)
  5. `Portée & Engagement` (Impressions délivrées, Clics, Taux de clic CTR %)
  6. `Ventes Induites & Revenu` (Nombre de commandes générées, Chiffre d'affaires en TND)
  7. `ROAS & Marge Nette` (e.g. `ROAS 5.2x · Marge Nette Estimée 68%`)
  8. `Statut` (Badge: En diffusion, En pause, Épuisée, En attente)
  9. `Actions` (`Mettre en pause / Réactiver`, `Ajuster le budget`, `Prévisualiser l'annonce`, `Supprimer`)

#### E. Assistant de Création de Campagne (AdsCampaignWizard)
- **Étape 1 : Sélection du Produit à Promouvoir**
  - Choix de l'article dans le catalogue du marchand (Recherche par titre ou sélection rapide des meilleures ventes)
- **Étape 2 : Choix de l'Emplacement Publicitaire**
  - Options : `Résultats de Recherche Sponsorisés (CPC moyen 0.150 TND)`, `Bannière Carrousel Accueil (CPM)`, `Tête de Rayon Catégorie (CPC moyen 0.120 TND)`
- **Étape 3 : Budget & Calendrier**
  - Budget quotidien (Montant en TND : minimum 5 TND/jour)
  - Date de début et date de fin (ou diffusion continue)
  - Enchère au clic maximale (Auto-optimisée ou manuelle)
- **Étape 4 : Prévisualisation Créative & Validation (AdsCreativePreview)**
  - Aperçu instantané du badge "Sponsorisé" sur la vignette du produit
  - Récapitulatif du budget et projection des clics estimés
  - Boutons : `Lancer la campagne publicitaire`, `Enregistrer comme brouillon`, `Annuler`

---

### [Page 38] Followers, VIP Subscribers, Private Discount Coupons & Loyalty Points

- **Navigation Placement**: `Group 4: Clients & Marketing` > **Coupons & Programme VIP**
- **Primary Route**: `/hub/dashboard/loyalty`
- **Breadcrumb Hierarchy**: `Accueil > Clients & Marketing > Abonnés & Fidélité`
- **Layer 6 Archetype**: `Loyalty Points Rule Builder & VIP Coupon Generator`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Clients & Marketing > Abonnés & Fidélité`
2. **Header Bar**: Title `Followers, VIP Subscribers, Private Discount Coupons & Loyalty Points` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Loyalty Points Rule Builder & VIP Coupon Generator.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 38. Followers, VIP Subscribers, Private Discount Coupons & Loyalty Points
- **Route Path**: `/hub/dashboard/loyalty` (Accessible aussi via `/dashboard/loyalty`)
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Programme de fidélité et marketing direct, gestion des abonnés à la boutique, diffusion de coupons de réduction privés par notification/email et barème de points de fidélité.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Abonnés & Fidélité`
- **Page Heading**: "Abonnés, Coupons Privés & Fidélité"
- **Subtitle / Description**: "Fidélisez vos acheteurs, envoyez des codes promotionnels exclusifs à vos abonnés et analysez la provenance de votre audience tunisienne."

#### B. Key Performance Indicators (KPIs)
- **Total Abonnés à la Boutique**: `1,280 abonnés`
- **Nouveaux Abonnés ce Mois**: `+142 abonnés`
- **Coupons Promotionnels Actifs**: `3 codes en cours`
- **Chiffre d'Affaires Généré par les Codes Promo**: `3,420.000 TND`

#### C. Modules & Sections de Contenu
- **Section 1 : Diffusion Privée de Coupons (Campagne Flash)**:
  - Formulaire de création de coupon :
    - Code promotionnel (e.g. `FIDELITE10` ou `AID2026`)
    - Type de remise : `[Pourcentage (e.g. 10%), Montant Fixe (e.g. 15 TND), Livraison Gratuite]`
    - Montant minimum de commande (e.g. `50.000 TND`)
    - Date d'expiration
    - Destinataires : `[Tous les abonnés, Clients ayant commandé plus de 2 fois, Nouveaux abonnés de la semaine]`
    - Bouton : `Diffuser le coupon aux abonnés par notification`
- **Section 2 : Tableau des Codes Promotionnels Actifs**:
  - Colonnes : `[Code | Type de Remise | Utilisations / Limite | Chiffre d'Affaires Généré | Expiration | Statut | Actions]`
- **Section 3 : Répartition Géographique des Abonnés (Carte / Tableau des Gouvernorats)**:
  - Classement des gouvernorats des abonnés : Tunis (35%), Sfax (20%), Sousse (15%), Nabeul (12%), Bizerte (8%), Autres (10%)

---

### [Page 53] Store Customers Directory & Purchasing History

- **Navigation Placement**: `Group 4: Clients & Marketing` > **Répertoire Clients**
- **Primary Route**: `/hub/dashboard/customers`
- **Breadcrumb Hierarchy**: `Accueil > Clients & Marketing > Répertoire Clients`
- **Layer 6 Archetype**: `Customer Registry with Spend Statistics & Order Drawer`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Clients & Marketing > Répertoire Clients`
2. **Header Bar**: Title `Store Customers Directory & Purchasing History` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Customer Registry with Spend Statistics & Order Drawer.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 53. Store Customers Directory & Purchasing History
- **Route Path**: `/hub/dashboard/online-store/customers`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Fichier clients de la boutique, historique individuel des commandes passées, coordonnées téléphoniques et géographiques de livraison, segmentation des clients fidèles.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Clients`
- **Page Heading**: "Répertoire des Clients de la Boutique"
- **Subtitle / Description**: "Consultez la liste de vos acheteurs, leur historique d'achat et leurs coordonnées pour un service client d'excellence."

#### B. Key Performance Indicators (KPIs)
- **Total Clients de la Boutique**: `342 acheteurs uniques`
- **Clients Ayant Réitéré un Achat**: `85 clients fidèles`
- **Dépense Moyenne par Client**: `124.000 TND`

#### C. Control Bar, Search & Filter Matrix
- **Champ de Recherche**: "Rechercher un client par nom, email, téléphone ou ville..."
- **Filtre par Nombre de Commandes**: `[Tous, 1 commande, 2 à 5 commandes, Clients VIP (>5 commandes)]`
- **Bouton d'Action**: `Exporter la Base Clients (CSV)`

#### D. Data Collection — Tableau des Clients
- **En-têtes de colonnes**:
  1. `Client` (Nom, Prénom, Email)
  2. `Téléphone` (Numéro tunisien pour confirmation WhatsApp / appel)
  3. `Localisation` (Gouvernorat et ville de livraison)
  4. `Total Commandes` (Nombre d'achats finalisés)
  5. `Dépenses Totales (TND)` (Chiffre d'affaires cumulé généré)
  6. `Dernière Commande` (Date du dernier achat)
  7. `Actions` (`Consulter la fiche client détaillée`, `Historique des commandes`)

---

### [Page 69] Growth Loyalty Alias (Direct Redirect to Seller Loyalty)

- **Navigation Placement**: `Group 4: Clients & Marketing` > **Alias Programme Fidélité**
- **Primary Route**: `/dashboard/loyalty`
- **Breadcrumb Hierarchy**: `Accueil > Clients & Marketing > Fidélité (Alias)`
- **Layer 6 Archetype**: `Automatic Redirect to /hub/dashboard/loyalty`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Clients & Marketing > Fidélité (Alias)`
2. **Header Bar**: Title `Growth Loyalty Alias (Direct Redirect to Seller Loyalty)` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Automatic Redirect to /hub/dashboard/loyalty.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 69. Growth Loyalty Alias (Direct Redirect to Seller Loyalty)
- **Route Path**: `/dashboard/loyalty`
- **Dashboard Realm**: Superadmin / Growth Alias
- **Operational Objective**: Alias de redirection directe vers `/hub/dashboard/loyalty`.

#### A. Traitement & Redirection
- Redirection automatique côté serveur vers l'espace de gestion de la fidélité vendeur (`/hub/dashboard/loyalty`).

---

### [Page 70] Growth Subscribers Alias (Direct Redirect to Seller Loyalty)

- **Navigation Placement**: `Group 4: Clients & Marketing` > **Alias Abonnés Newsletter**
- **Primary Route**: `/dashboard/subscribers`
- **Breadcrumb Hierarchy**: `Accueil > Clients & Marketing > Abonnés (Alias)`
- **Layer 6 Archetype**: `Automatic Redirect to /hub/dashboard/loyalty`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Clients & Marketing > Abonnés (Alias)`
2. **Header Bar**: Title `Growth Subscribers Alias (Direct Redirect to Seller Loyalty)` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Automatic Redirect to /hub/dashboard/loyalty.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 70. Growth Subscribers Alias (Direct Redirect to Seller Loyalty)
- **Route Path**: `/dashboard/subscribers`
- **Dashboard Realm**: Superadmin / Growth Alias
- **Operational Objective**: Alias de redirection directe vers `/hub/dashboard/loyalty`.

#### A. Traitement & Redirection
- Redirection automatique côté serveur vers l'espace de gestion des abonnés (`/hub/dashboard/loyalty`).

---

