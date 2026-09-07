# Superadmin Section 3: Finance, Escrow, KYC & Payouts

> **Operational Objective**: Merchant identity KYC verifications, postal mandat reviews, seller wallet payout disbursements (20-digit RIB Modulo 97), and buyer refund escalations.
> **Application Routes**: `/(admin)/kyc`, `/(admin)/payments`, `/(admin)/payouts`, `/(admin)/escrow`
> **Pages Covered in this Section**: Page 7, Page 8, Page 9, Page 10

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

### [Page 7] KYC Merchant Identity Verifications & Document Audit

### 7. KYC Merchant Identity Verifications & Document Audit
- **Route Path**: `/kyc`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Pôle d'audit de conformité juridique et financière, examen des pièces d'identité (CIN / Passeport) des artisans et des extraits de Registre National des Entreprises (RNE) des commerçants tunisiens.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Commerce & Vendeurs > Vérifications KYC`
- **Page Heading**: "Audit & Conformité KYC des Vendeurs"
- **Subtitle / Description**: "Vérifiez les pièces d'identité officielles, les immatriculations au RNE et certifiez les boutiques pour débloquer les virements bancaires."
- **Badges d'Alerte**: `14 dossiers en attente d'arbitrage`, `Téléservice RNE Tunisie Connecté`

#### B. Control Bar & Filter Matrix
- **Sélecteur de Vue par Onglets**:
  - `En attente de révision (14)` (Onglet actif par défaut)
  - `Dossiers Approuvés (842)`
  - `Dossiers Rejetés (32)`
  - `Tous les dossiers`
- **Champ de Recherche**: "Rechercher par nom de boutique, matricule fiscal, ou numéro CIN..."
- **Bouton d'Action**: `Actualiser la file d'attente`

#### C. Data Collection — File d'Audit KYC
- **En-têtes de colonnes**:
  1. `Boutique & Vendeur` (Nom de la boutique, Nom complet du gérant, Email)
  2. `Type de Vendeur Déclaré` (Artisan Particulier / Entreprise SARL-SU)
  3. `Documents Fournis` (Liens sécurisés vers CIN Recto/Verso, Extrait RNE, Attestation de domiciliation bancaire)
  4. `Numéro d'Identification` (Numéro CIN à 8 chiffres ou Matricule Fiscal)
  5. `Date de Dépôt` (Date et heure de soumission du dossier)
  6. `Statut Actuel` (Badge: En attente, Approuvé, Rejeté)
  7. `Décision & Actions`
- **Actions par ligne**:
  - `Examiner les pièces jointes (Aperçu plein écran haute résolution)`
  - `Approuver le KYC (Attribue le badge certifié et active les retraits)`
  - `Rejeter avec motif explicite`
  - `Demander un complément de document`

#### D. Modales & Boîtes de Dialogue
- **Modale de Rejet KYC**:
  - Titre : "Rejeter le dossier KYC de la boutique [Nom]"
  - Motif standardisé (Menu déroulant : `Photo de CIN illisible, Document expiré, Incohérence entre nom du gérant et compte bancaire, Extrait RNE de plus de 3 mois, Pièce non conforme`)
  - Précisions additionnelles (Zone de texte envoyée par email au marchand)
  - Boutons : `Notifier le refus`, `Annuler`

---

### [Page 8] Postal Mandats & Offline Payment Proofs Review

### 8. Postal Mandats & Offline Payment Proofs Review
- **Route Path**: `/mandats`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Validation comptable des reçus de Mandat Minute (La Poste Tunisienne) et virements bancaires transmis par les marchands pour régler leurs abonnements ou recharger leur compte publicitaire PandaAds.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Commerce & Vendeurs > Preuves de Mandats Postaux`
- **Page Heading**: "Validation des Mandats Postaux & Virements"
- **Subtitle / Description**: "Contrôlez les bordereaux de versement de La Poste Tunisienne et validez manuellement les transactions financières hors-ligne."

#### B. Key Performance Indicators (KPIs)
- **Mandats en Attente**: `8 reçus à valider`
- **Montant Total en Attente**: `1,240.000 TND`
- **Mandats Validés ce Mois**: `46 mandats (5,890.000 TND)`
- **Mandats Rejetés**: `3 reçus frauduleux / illisibles`

#### C. Control Bar & Filter Matrix
- **Filtres par Statut**: `[En attente, Validés, Rejetés, Tous]`
- **Champ de Recherche**: "Rechercher par numéro de mandat, boutique ou montant..."
- **Filtre par Objet**: `[Tous, Abonnement SaaS, Recharge PandaAds, Autre]`

#### D. Data Collection — Tableau des Mandats Postaux
- **En-têtes de colonnes**:
  1. `Réf. Transaction` (Identifiant unique du paiement)
  2. `Boutique & Déposant` (Nom commercial, Gérant, Téléphone)
  3. `Objet du Paiement` (Plan Pro Trimestriel, Budget PandaAds 100 TND, etc.)
  4. `Montant Déclaré` (Montant en TND)
  5. `Reçu Scanné` (Vignette miniature avec loupe d'agrandissement pour lire le timbre postal)
  6. `Bureau de Poste Émetteur` (e.g. Bureau de Poste Tunis Thameur, Sousse Médina)
  7. `Date de Versement` (Date du timbre à date postal)
  8. `Actions Comptables`
- **Actions par ligne**:
  - `Consulter le reçu en taille réelle`
  - `Valider l'encaissement (Crédite le compte immédiatement)`
  - `Rejeter le reçu (Demande de nouveau justificatif)`

---

### [Page 9] Seller Wallet Payout Requests & Bank Disbursement

### 9. Seller Wallet Payout Requests & Bank Disbursement
- **Route Path**: `/withdrawals`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Traitement des demandes de retrait des vendeurs, exécution des virements interbancaires tunisiens vers les comptes BIAT, BNA, Attijari, STB, Amen Bank, et génération des fichiers d'ordre de virement.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Commerce & Vendeurs > Demandes de Virement`
- **Page Heading**: "Gestion des Décaissements & Virements Vendeurs"
- **Subtitle / Description**: "Validez les demandes de transfert de fonds vers les RIB bancaires et postaux tunisiens certifiés des marchands."

#### B. Key Performance Indicators (KPIs)
- **Demandes en Attente de Virement**: `18 demandes`
- **Volume Total à Décaisser**: `14,680.000 TND`
- **Délai Moyen de Traitement**: `24 à 48 heures ouvrables`
- **Banques de Destination Principales**: `BIAT (35%), Attijari Bank (25%), BNA (20%), La Poste (20%)`

#### C. Control Bar & Filter Matrix
- **Filtre de Traitement**: `[Toutes les demandes, En attente, Approuvées en cours de virement, Payées / Exécutées, Rejetées]`
- **Filtre par Établissement Bancaire**: `[Toutes les banques, BIAT, Attijari, BNA, STB, Amen Bank, BT, Poste Tunisienne]`
- **Bouton d'Action Primaire**: `Générer le Fichier d'Ordre de Virement Groupé (Format BCT / CSV)`

#### D. Data Collection — Tableau des Demandes de Retrait
- **En-têtes de colonnes**:
  1. `ID Retrait` (Identifiant unique du décaissement)
  2. `Boutique` (Nom de la boutique marchande, Badge KYC vérifié)
  3. `Montant Demandé` (Montant brut en TND)
  4. `Retenue à la Source / Frais` (Montant retenu selon législation fiscale)
  5. `Montant Net à Virer` (Montant net viré sur le compte)
  6. `Coordonnées Bancaires (RIB)` (Numéro de compte formaté 20 chiffres avec nom et code banque)
  7. `Date de la Demande` (Horodatage de la soumission)
  8. `Statut` (Badge: En attente, Traitement bancaire, Exécuté)
  9. `Actions`
- **Actions par ligne**:
  - `Copier le RIB vérifié (20 chiffres Modulo 97)`
  - `Marquer comme Payé (Saisie de la référence de transaction interbancaire)`
  - `Rejeter la demande (Avec motif de non-conformité bancaire)`

---

### [Page 10] Buyer Refund Reviews & Escalations

### 10. Buyer Refund Reviews & Escalations
- **Route Path**: `/refund-review`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Arbitrage des demandes de remboursement des acheteurs contestées par les vendeurs ou non résolues à l'amiable, protection des fonds séquestrés.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Commerce & Vendeurs > Examen des Remboursements`
- **Page Heading**: "Pôle d'Arbitrage des Remboursements"
- **Subtitle / Description**: "Examinez les litiges de retour produit, les colis non conformes ou endommagés et ordonnez les remboursements acheteurs équitables."

#### B. Key Performance Indicators (KPIs)
- **Dossiers de Remboursement Ouverts**: `7 cas en délibération`
- **Montant Total Contesté**: `642.000 TND`
- **Délai d'Arbitrage Moyen**: `48h`
- **Résolutions en Faveur Acheteur / Vendeur**: `58% Acheteur / 42% Vendeur`

#### C. Control Bar & Filter Matrix
- **Filtres par Statut**: `[En examen, Résolus en faveur acheteur, Résolus en faveur vendeur, Rejetés]`
- **Champ de Recherche**: "Rechercher par numéro de commande, acheteur ou boutique..."

#### D. Data Collection — Tableau des Litiges Remboursement
- **En-têtes de colonnes**:
  1. `Réf. Litige` (ID Dossier)
  2. `Commande & Date` (Numéro de commande, Date de livraison initiale)
  3. `Boutique Vendeuse` (Nom de la boutique, Badge conformité)
  4. `Acheteur Réclamant` (Nom complet, Téléphone, Email)
  5. `Motif Déclaré` (Produit défectueux, Non conforme à la description, Colis manquant, Droit de rétractation 10 jours)
  6. `Montant Réclamé` (Valeur en Dinars Tunisiens)
  7. `Preuves Fournies` (Photos du colis, Constat de livraison transporteur)
  8. `Décision Administrative`
- **Actions par ligne**:
  - `Ouvrir le dossier complet`
  - `Valider le remboursement acheteur (Débit du solde vendeur)`
  - `Rejeter la demande (Maintien des fonds au vendeur)`
  - `Demander une expertise transporteur`

---

