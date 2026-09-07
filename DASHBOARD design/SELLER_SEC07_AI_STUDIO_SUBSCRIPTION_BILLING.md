# Seller Section 7: AI Studio, Plans & SaaS Billing

> **Operational Objective**: Merchant AI copywriting studio, SaaS subscription tier management, recurring payment methods, and platform SaaS invoices.
> **Application Routes**: `/hub/dashboard/ai`, `/hub/dashboard/subscriptions`, `/hub/dashboard/billing`, `/hub/dashboard/billing/invoices`
> **Pages Covered in this Section**: Page 54, Page 55, Page 56, Page 57

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

### [Page 54] AI Tools Studio (Copywriting, Titles, SEO & Support)

### 54. AI Tools Studio (Copywriting, Titles, SEO & Support)
- **Route Path**: `/hub/dashboard/ai`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Studio d'intelligence artificielle assistant le marchand : générateur automatique de descriptions de produits attractives, optimiseur de titres pour le référencement, traducteur bilingue français/arabe et générateur de réponses aux avis clients.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Studio d'Outils IA`
- **Page Heading**: "Studio d'Intelligence Artificielle Marchande"
- **Subtitle / Description**: "Accélérez la rédaction de vos fiches produits, optimisez vos titres pour la recherche et générez des arguments de vente percutants."
- **Badges**: `Propulsé par Gemini AI`, `Quota Inclus dans votre Formule`

#### B. Modules & Outils Disponibles dans le Studio
- **Outil 1 : Générateur de Fiche Produit Express**:
  - Champs d'entrée :
    - Nom de base du produit (e.g. "Sac en cuir véritable marron fait main")
    - Mots-clés clés / Matières (e.g. "cuir de chèvre, tannage végétal, artisane de Kairouan, fermeture laiton")
    - Ton rédactionnel : `[Élégant & Haut de gamme, Authentique & Artisanal, Moderne & Décontracté, Vendeur & Promotionnel]`
    - Longueur désirée : `[Synthétique (1 paragraphe), Détaillée avec caractéristiques, Format Bullet-points]`
  - Bouton : `Générer la description produit en 1-clic`
  - Résultat : Texte rédigé prêt à copier ou à insérer directement dans la fiche produit
- **Outil 2 : Optimiseur de Titre & Mots-Clés SEO**:
  - Suggère 5 variantes de titres percutants optimisés pour apparaître en tête des recherches Google et de la marketplace
- **Outil 3 : Traducteur Bilingue Marchand (Français ↔ Arabe)**:
  - Traduction fidèle et adaptée au dialecte commercial tunisien
- **Outil 4 : Rédacteur de Réponses aux Avis Clients**:
  - Génère une réponse chaleureuse et professionnelle pour remercier un acheteur ou traiter une remarque constructive

---

### [Page 55] Subscription Plans, Feature Limits, Meter & Upgrade

### 55. Subscription Plans, Feature Limits, Meter & Upgrade
- **Route Path**: `/hub/dashboard/subscription`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Suivi du plan d'abonnement SaaS de la boutique, consommation des quotas (articles publiés, jetons IA, bande passante), date d'échéance et portail de mise à niveau / surclassement.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Mon Abonnement SaaS`
- **Page Heading**: "Formule d'Abonnement & Quotas de la Boutique"
- **Subtitle / Description**: "Consultez votre formule actuelle, surveillez vos quotas d'utilisation et surclassez votre boutique pour débloquer des fonctionnalités premium."

#### B. Récapitulatif du Plan Actuel
- Nom de la formule active : `Plan Vendeur Pro`
- Tarif : `69.000 TND / mois`
- Date de renouvellement : `28/09/2026 (Renouvellement automatique actif)`
- Taux de commission préférentiel appliqué : `5.0% sur les ventes` (au lieu de 10% sur le plan gratuit)
- Jauges de consommation des quotas :
  - Produits publiés : `148 articles (Catalogue Illimité autorisé)`
  - Jetons IA du mois : `124,000 / 500,000 tokens consommés (24.8%)`
  - Stockage média : `145 MB / 5,000 MB (2.9%)`

#### C. Grille Comparative des Formules de Surclassement
- Tableau comparatif des 4 formules : `Free (Gratuit)`, `Starter (29 TND/m)`, `Pro (69 TND/m)`, `Agence (149 TND/m)`
- Matrice des fonctionnalités détaillées (Domaines personnalisés, Taux de commission, Assistant IA, Accès aux clés d'API, Support prioritaire)
- Boutons d'Action : `Choisir ce plan (Mise à niveau immédiate)`, `Changer pour la facturation annuelle (-20% de réduction)`

---

### [Page 56] Recurring Billing Payment Method Setup

### 56. Recurring Billing Payment Method Setup
- **Route Path**: `/hub/dashboard/subscription/payment-method`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Enregistrement et mise à jour du moyen de paiement récurrent pour le renouvellement du forfait d'abonnement de la boutique.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Mon Abonnement > Moyen de Paiement`
- **Page Heading**: "Moyen de Paiement pour l'Abonnement"
- **Subtitle / Description**: "Définissez comment vous réglez vos échéances d'abonnement PandaMarket."

#### B. Options de Règlement Proposées
- **Option 1 : Carte Bancaire Tunisienne (Gim-Tel / CIB)**
  - Formulaire sécurisé : Numéro de carte (16 chiffres), Date d'expiration (MM/AA), Code cryptogramme CVV (3 chiffres)
- **Option 2 : Portefeuille Digital Flouci**
  - Connexion via QR Code ou numéro mobile rattaché au compte Flouci
- **Option 3 : Prélèvement Automatique sur le Solde Vendeur**
  - Case à cocher : "Prélever automatiquement mes échéances d'abonnement sur mes gains de ventes disponibles dans mon portefeuille marchand"
- **Option 4 : Règlement par Mandat Minute Postal**
  - Consignes de versement au guichet postal et bouton d'envoi du reçu
- **Bouton d'Action**: `Enregistrer le moyen de paiement`

---

### [Page 57] Platform SaaS Invoices & Postal Mandat Receipt Upload

### 57. Platform SaaS Invoices & Postal Mandat Receipt Upload
- **Route Path**: `/hub/dashboard/my-subscription-orders`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Historique des factures de forfaits émises par PandaMarket au marchand, téléchargement des reçus fiscaux et interface de téléversement des talons de mandat postal.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Mon Abonnement > Factures & Mandats`
- **Page Heading**: "Historique de Facturation & Preuves de Mandat"
- **Subtitle / Description**: "Téléchargez vos factures d'abonnement et soumettez vos preuves de versement postal pour validation rapide."

#### B. Formulaire de Dépôt de Preuve de Mandat Postal
- Numéro de commande d'abonnement rattachée (Menu déroulant des factures en attente)
- Numéro d'opération du mandat postal (Champ texte)
- Bureau de poste de dépôt (Champ texte : e.g. "Bureau de Poste Sousse Corniche")
- Montant versé en Dinars Tunisiens (e.g. `207.000 TND pour 3 mois de Pro`)
- Téléversement de la photo nette du reçu postal timbré (Fichier image JPG/PNG)
- Bouton : `Transmettre le reçu à la comptabilité PandaMarket`

#### C. Data Collection — Tableau des Factures d'Abonnement
- **En-têtes de colonnes**:
  1. `Réf. Facture` (e.g. `INV-2026-0941`)
  2. `Formule & Période` (Plan Pro — Trimestre T3 2026)
  3. `Montant Payé (TND)` (Montant TTC avec TVA 19%)
  4. `Mode de Règlement` (Carte Bancaire, Mandat Minute, Solde Vendeur)
  5. `Date de Règlement`
  6. `Statut` (Badge: Payée / Validée, En attente de contrôle, Rejetée)
  7. `Actions` (`Télécharger la Facture PDF Fiscale`, `Renvoyer par email`)

---

