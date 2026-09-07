# Seller Section 4: Wallet, Payouts & Store Payments

> **Operational Objective**: Merchant wallet with 20-digit RIB Modulo 97 bank payout launcher, financial accounting reports, and payment gateway setup (Flouci, Konnect, COD).
> **Application Routes**: `/hub/dashboard/payouts`, `/hub/dashboard/reports`, `/hub/dashboard/payment-config`
> **Pages Covered in this Section**: Page 42, Page 43, Page 58

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

### [Page 42] Seller Wallet, Balances & Tunisian 20-digit RIB Modulo 97 Payout Launcher

### 42. Seller Wallet, Balances & Tunisian 20-digit RIB Modulo 97 Payout Launcher
- **Route Path**: `/hub/dashboard/wallet`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Gestion financière du portefeuille marchand, suivi du solde disponible immédiatement virable vs fonds COD en transit, contrôle de clé RIB tunisien en temps réel (Modulo 97) avec reconnaissance de 23 banques nationales, et historique des décaissements.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Portefeuille Marchand`
- **Page Heading**: "Portefeuille & Virements Bancaires"
- **Subtitle / Description**: "Gérez vos revenus, suivez l'encaissement de vos commandes contre remboursement et demandez vos virements vers votre compte bancaire tunisien."
- **Badges**: `Validation Bancaire Modulo 97 Active`, `Devise : Dinars Tunisiens (TND)`

#### B. Key Performance Indicators (KPIs)
- **Solde Disponible Immédiatement Virable**: `1,840.500 TND` (Fonds validés et sécurisés sur votre compte marchand)
- **Fonds en Attente de Liquidation (COD en Transit)**: `2,120.000 TND` (En cours de recouvrement chez Aramex, Rapid-Poste, Runex)
- **Total Cumulé des Gains Décaissés**: `28,450.000 TND` (Virements reçus depuis l'ouverture de la boutique)
- **Délai Moyen de Réception sur Compte**: `24 à 48 heures ouvrées`

#### C. Guichet de Demande de Virement (Formulaire avec Validation RIB Modulo 97)
- **Montant du Retrait**:
  - Champ de saisie numérique en Dinars Tunisiens (e.g. `500.000 TND`)
  - Boutons de pré-remplissage rapide : `[100 TND, 250 TND, 500 TND, Tout retirer (1,840.500 TND)]`
  - Seuil minimum de virement : `50.000 TND`
- **Coordonnées Bancaires Tunisiennes (Relevé d'Identité Bancaire — RIB)**:
  - Champ de saisie du RIB : 20 chiffres normalisés (`BB SSS CCCCCCCCCCCC KK`)
  - Validation algorithmique instantanée : Contrôle de la clé de contrôle à 2 chiffres via l'algorithme Modulo 97 (`97 - ((prefix * 100) % 97)`)
  - Identification automatique de la banque émettrice : Affiche instantanément le logo et le nom de l'établissement parmi les 23 banques tunisiennes reconnues (e.g. `Banque Internationale Arabe de Tunisie — BIAT (Code 08)`, `Attijari Bank (Code 04)`, `Banque Nationale Agricole — BNA (Code 03)`, `Société Tunisienne de Banque — STB (Code 10)`, `Amen Bank (Code 07)`, `La Poste Tunisienne (Code 17)`)
  - Statut de validation en direct : Indicateur vert si le RIB est valide, message d'erreur explicite si la clé est incorrecte ou si le format comporte moins de 20 chiffres
- **Nom du Titulaire du Compte**: Champ texte (Doit correspondre au nom figurant sur le dossier KYC)
- **Récapitulatif & Déductions Fiscales**:
  - Montant brut demandé : `500.000 TND`
  - Retenue à la source fiscale légale (si applicable) : `0.000 TND`
  - Frais de virement interbancaire : `0.000 TND (Pris en charge par PandaMarket)`
  - Montant net viré sur votre compte : `500.000 TND`
- **Bouton d'Action**: `Demander le virement immédiat` (Désactivé si le RIB est invalide ou si le solde est insuffisant)

#### D. Data Collection — Historique des Transactions & Virements
- **En-têtes de colonnes**:
  1. `Réf. Transaction` (ID Virement ou ID Encaissement)
  2. `Date & Heure` (Date de l'opération)
  3. `Type d'Opération` (Virement bancaire sortant, Encaissement commande #ORD, Prélèvement abonnement, Frais pub)
  4. `Banque & RIB Destinataire` (Nom de la banque, RIB masqué `****4821`)
  5. `Montant Débit / Crédit` (Montant en TND avec signe `+` ou `-`)
  6. `Statut` (Badge: Exécuté / Virement reçu, En cours de traitement bancaire, Rejeté)
  7. `Justificatif` (Bouton de téléchargement de l'avis d'ordre de virement PDF)

---

### [Page 43] Financial Reports, Invoicing & Tax Declarations

### 43. Financial Reports, Invoicing & Tax Declarations
- **Route Path**: `/hub/dashboard/financial`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: États financiers périodiques de la boutique, récapitulatifs de TVA et de retenue à la source conformes à la réglementation tunisienne, téléchargement des bordereaux comptables pour l'expert-comptable du marchand.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Rapports Financiers & Fiscalité`
- **Page Heading**: "Rapports Financiers & Déclarations Fiscales"
- **Subtitle / Description**: "Consultez le grand livre de vos ventes, téléchargez vos états récapitulatifs mensuels et facilitez vos déclarations fiscales tunisiennes."

#### B. Key Performance Indicators (KPIs)
- **Chiffre d'Affaires Net Encaissé**: `24,180.000 TND`
- **Commissions Marketplace Facturées**: `1,934.400 TND`
- **TVA Collectée**: `3,868.800 TND` (à reverser selon régime d'assujettissement)
- **Retenues à la Source Opérées**: `0.000 TND`

#### C. Control Bar & Export Matrix
- **Sélecteur d'Exercice Fiscal & Mois**: `[Année 2026, Année 2025] · [Janvier à Décembre]`
- **Bouton d'Action Primaire**: `Télécharger le Bordereau Récapitulatif Mensuel (PDF / Excel)`
- **Bouton d'Action Secondaire**: `Exporter le Grand Livre des Ventes (CSV)`

#### D. Data Collection — Tableau Récapitulatif des Périodes Comptables
- **En-têtes de colonnes**:
  1. `Période Fiscale` (e.g. `Août 2026`, `Juillet 2026`)
  2. `Commandes Livrées` (Volume d'actes de vente finalisés)
  3. `Volume Brut des Ventes (TND)` (Chiffre d'affaires brut TTC)
  4. `Commissions Déduites (TND)` (Part prélevée par la plateforme)
  5. `Frais de Livraison Facturés (TND)` (Montant reversé aux transporteurs)
  6. `Revenu Net Vendeur (TND)` (Bénéfice net transféré au portefeuille)
  7. `Facture de Commission Plateforme` (Lien de téléchargement PDF légal)

---

### [Page 58] Merchant Store Payment Methods Setup (Flouci, Konnect, PayPal, COD)

### 58. Merchant Store Payment Methods Setup (Flouci, Konnect, PayPal, COD)
- **Route Path**: `/hub/dashboard/payment-config`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Configuration des passerelles d'encaissement directes de la boutique : activation du Paiement à la Livraison (Cash on Delivery), passerelles de paiement en ligne tunisiennes (Flouci, Konnect) et internationales (PayPal), gestion des clés API et modes Sandbox / Production.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Configuration > Passerelles de Paiement`
- **Page Heading**: "Configuration des Moyens de Paiement de la Boutique"
- **Subtitle / Description**: "Choisissez comment vos acheteurs peuvent régler leurs commandes sur votre boutique en ligne et renseignez vos clés de paiement direct."
- **Badges**: `Encaissement Sécurisé`, `Mode Sandbox & Live Pris en Charge`

#### B. Configuration des Passerelles de Paiement Détaillées

##### 1. Paiement à la Livraison (Cash on Delivery — COD)
- Interrupteur d'activation globale : `Activé sur la boutique (Recommandé en Tunisie)`
- Frais supplémentaires éventuels pour paiement COD (Champ montant : e.g. `0.000 TND` pour gratuit)
- Message d'instructions affiché à l'acheteur lors du passage de commande : "Vous réglerez le montant exact au livreur lors de la réception de votre colis. Merci de préparer l'appoint."
- Option de confirmation obligatoire : "Exiger la confirmation par SMS OTP ou appel téléphonique avant expédition" (Case à cocher)

##### 2. Passerelle Flouci Tunisie (Paiement Mobile & Carte Bancaire)
- Interrupteur d'activation : `Activé / Désactivé`
- Mode d'exécution : `[Environnement Test (Sandbox) | Environnement Réel (Production)]`
- Clé d'API Publique Flouci (`App Public Token`) : Champ texte avec bouton masquer/afficher
- Clé d'API Secrète Flouci (`App Secret Key`) : Champ mot de passe sécurisé
- Bouton de test : `Vérifier la connexion avec l'API Flouci`

##### 3. Passerelle Konnect Tunisie (Cartes Nationales & Internationales)
- Interrupteur d'activation : `Activé / Désactivé`
- Mode d'exécution : `[Sandbox | Live]`
- Identifiant de Portefeuille Konnect (`Wallet ID`)
- Clé d'API Konnect (`API Key`)

##### 4. Passerelle PayPal (Paiements Internationaux en Devises)
- Interrupteur d'activation : `Activé (Idéal pour vendre aux Tunisiens résidant à l'étranger)`
- Mode d'exécution : `[Sandbox | Live]`
- Identifiant Client PayPal (`Client ID`)
- Clé Secrète PayPal (`Client Secret`)
- Devise de conversion par défaut : `[EUR (€), USD ($), TND converti]`

#### C. Boutons d'Action
- `Enregistrer l'ensemble des passerelles de paiement`
- `Tester tous les modes de paiement`

---

