# Superadmin Section 6: Advertising & SaaS Subscriptions

> **Operational Objective**: PandaAds marketplace campaigns, SaaS subscription orders/invoicing, and subscription tier limits/features configuration.
> **Application Routes**: `/(admin)/marketing/ads`, `/(admin)/settings/subscriptions`, `/(admin)/settings/plans`
> **Pages Covered in this Section**: Page 17, Page 18, Page 20

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

### [Page 17] PandaAds Global Campaign Management & Placement Pricing

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

