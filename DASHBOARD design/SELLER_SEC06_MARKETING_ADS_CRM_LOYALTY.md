# Seller Section 6: Marketing, Advertising, CRM & Loyalty

> **Operational Objective**: PandaAds ad campaign manager with ROAS calculations, VIP followers coupons, loyalty rewards, customer directory, and growth redirect aliases.
> **Application Routes**: `/hub/dashboard/marketing`, `/hub/dashboard/promotions`, `/hub/dashboard/customers`, `/dashboard/loyalty`, `/dashboard/subscribers`
> **Pages Covered in this Section**: Page 35, Page 38, Page 53, Page 69, Page 70

---

## Section Architectural & Theme Selection Notes

1. **Multi-Theme Adaptability**:
   - This section's data and forms must render across all enabled themes without hardcoded inline CSS.
   - Elements should leverage semantic tokens (e.g., surface, border, text-primary, accent) defined by the active theme.

2. **Strict Raw Content Separation**:
   - All headings, inputs, tables, action buttons, and modal dialogs documented below represent the semantic contract.
   - When applying the new OpenDesign design, match every data field and action item without dropping operational capabilities.

3. **Tunisian Commerce Specifics**:
   - Currency formatting: `0.000 TND` (3 decimal places / millimes).
   - Banking: 20-digit RIB with Modulo 97 verification.
   - Geographic Coverage: 24 Tunisian Governorates across national hubs.
   - COD Verification: Cash on Delivery verification with SMS OTP and RTO risk scores.

---

## Raw Content Specifications by Page

### [Page 35] PandaAds Center: Campaign Creator, Budgeting & ROAS vs Net Margin

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

### 69. Growth Loyalty Alias (Direct Redirect to Seller Loyalty)
- **Route Path**: `/dashboard/loyalty`
- **Dashboard Realm**: Superadmin / Growth Alias
- **Operational Objective**: Alias de redirection directe vers `/hub/dashboard/loyalty`.

#### A. Traitement & Redirection
- Redirection automatique côté serveur vers l'espace de gestion de la fidélité vendeur (`/hub/dashboard/loyalty`).

---

### [Page 70] Growth Subscribers Alias (Direct Redirect to Seller Loyalty)

### 70. Growth Subscribers Alias (Direct Redirect to Seller Loyalty)
- **Route Path**: `/dashboard/subscribers`
- **Dashboard Realm**: Superadmin / Growth Alias
- **Operational Objective**: Alias de redirection directe vers `/hub/dashboard/loyalty`.

#### A. Traitement & Redirection
- Redirection automatique côté serveur vers l'espace de gestion des abonnés (`/hub/dashboard/loyalty`).

---

