# Seller Section 3: Orders, Fulfillment, COD & Courier Handshake

> **Operational Objective**: Tunisian courier pipeline with anti-refus COD verification, buyer inquiry chat with 1-click COD validation, and mobile driver delivery handshake console.
> **Application Routes**: `/hub/dashboard/orders`, `/hub/dashboard/returns`, `/hub/dashboard/quotes`, `/hub/dashboard/pos`, `/hub/dashboard/shipping`, `/hub/dashboard/messages`, `/courier`
> **Pages Covered in this Section**: Page 40, Page 41, Page 71

---

## 1. Section Navigation & Menu Placement

| Page # | Menu Label | Sidebar Group | Route Path | Assigned Icon | Breadcrumb Trail |
|---|---|---|---|---|---|
| Page 40 | **Commandes & Expéditions** | `Group 2: Ventes & Opérations` | `/hub/dashboard/orders` | `ShoppingCart` | `Accueil > Ventes > Commandes` |
| Page 41 | **Messagerie & Validation COD** | `Group 2: Ventes & Opérations` | `/hub/dashboard/messages` | `MessageSquare` | `Accueil > Ventes > Messagerie clients` |
| Page 71 | **Console Livreur Mobile** | `Group 2: Ventes & Opérations` | `/courier` | `Smartphone` | `Accueil > Ventes > Console Livreur Mobile` |

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

### [Page 40] Orders Fulfillment, Tunisian Courier Pipeline & Urgent COD Anti-Refus Deck

- **Navigation Placement**: `Group 2: Ventes & Opérations` > **Commandes & Expéditions**
- **Primary Route**: `/hub/dashboard/orders`
- **Breadcrumb Hierarchy**: `Accueil > Ventes > Commandes`
- **Layer 6 Archetype**: `Orders Pipeline with Tunisian Courier Dispatch & Anti-Refus Score`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Ventes > Commandes`
2. **Header Bar**: Title `Orders Fulfillment, Tunisian Courier Pipeline & Urgent COD Anti-Refus Deck` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Orders Pipeline with Tunisian Courier Dispatch & Anti-Refus Score.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 40. Orders Fulfillment, Tunisian Courier Pipeline & Urgent COD Anti-Refus Deck
- **Route Path**: `/hub/dashboard/orders`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Centre névralgique de traitement logistique des commandes de la boutique, pipeline intégré des 4 transporteurs tunisiens majeurs (Aramex, Rapid-Poste, Runex, First Delivery), pupitre prioritaire de sécurisation anti-refus des commandes contre remboursement (COD), impression de bordereaux d'expédition et factures, annulation avec modale dédiée.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Commandes & Expéditions`
- **Page Heading**: "Cockpit Logistique & Gestion des Expéditions"
- **Subtitle / Description**: "Gérez vos commandes, validez les commandes contre remboursement (COD), générez les bordereaux de livraison et suivez vos colis chez vos transporteurs tunisiens."
- **Badges d'État**: `Mode Bento Cockpit Actif`, `SLA Expédition : 98% dans les délais`

#### B. Key Performance Indicators (KPIs)
- **Total Commandes du Mois**: `112 commandes`
- **À Traiter / En Attente de Préparation**: `8 commandes`
- **Commandes COD Urgentes à Confirmer**: `3 commandes`
- **Colis en Cours d'Acheminement (En transit)**: `14 colis`
- **Colis Livrés avec Succès ce Mois**: `90 colis`
- **Montant COD en Cours de Collecte**: `2,120.000 TND`

#### C. Pipeline Transporteurs Tunisiens (Cartes Filtres Interactives)
- **Carte 1 — 🔴 Aramex Tunisie**:
  - Compteur : `12 colis · En transit : 4 · Livrés : 8`
  - Volume COD : `940.000 TND` · SLA : `24-48h National`
  - Clic : Filtre instantanément le flux de commandes sur les colis Aramex
- **Carte 2 — 🟡 Rapid-Poste (La Poste Tunisienne)**:
  - Compteur : `8 colis · En transit : 3 · Livrés : 5`
  - Volume COD : `580.000 TND` · SLA : `24-72h 24 Gouvernorats`
- **Carte 3 — 🚀 Runex Express**:
  - Compteur : `6 colis · En transit : 2 · Livrés : 4`
  - Volume COD : `420.000 TND` · SLA : `24-48h Sfax & Sud`
- **Carte 4 — ⚡ First Delivery**:
  - Compteur : `4 colis · En transit : 1 · Livrés : 3`
  - Volume COD : `180.000 TND` · SLA : `12-24h Grand Tunis & Sahel`
- **Carte 5 — 📦 Prêt à Expédier / Sans Transporteur**:
  - Compteur : `3 colis à assigner à un transporteur`

#### D. Pupitre Prioritaire : Validation Urgente COD & Anti-Refus
- **Objectif Métier**: Réduire à zéro le taux de retour à l'expéditeur (RTO) des commandes contre remboursement en Tunisie.
- **Fiche Commande Urgente (Structure unitaire)**:
  - Client : `Leila Ben Salem` · Téléphone : `+216 50 333 444` · Ville : `Bizerte Médina`
  - Montant COD à encaisser : `128.000 TND`
  - Score de Risque Anti-Refus : `Risque 85/100 (Client avec 1 précédent de non-réponse)`
  - Tentatives d'appel : `1 tentative effectuée`
  - **Boutons d'Action Rapide en 1-Clic**:
    - `Confirmer la Commande` (Passe la commande en préparation immédiate)
    - `Envoyer SMS OTP` (Déclenche un SMS contenant un code à 4 chiffres sur le mobile du client)
    - `Saisir le Code OTP Reçu` (Champ de vérification instantanée du code client)
    - `Client Injoignable` (Incrémente le compteur de relance et envoie un rappel WhatsApp/SMS)
    - `Refuser / Annuler la Commande` (Libère le stock réservé avec motif)
    - `Appeler le Client (Lien tel:)` (Ouvre l'application téléphone du marchand)

#### E. Data Collection — Flux des Commandes (Tableau & Cartes Bento)
- **En-têtes de colonnes (Vue tableau classique)**:
  1. `N° Commande & Date` (e.g. `#ORD-882194 · 02/09/2026`)
  2. `Client & Téléphone` (Nom, Prénom, Numéro tunisien, Ville de livraison)
  3. `Articles Commandés` (Vignettes des produits, Titre abrégé, Quantités)
  4. `Montant Total` (Montant en TND, Sous-total + Frais de livraison)
  5. `Mode de Paiement & COD` (Badge: COD Confirmé, COD En attente, Carte Bancaire Payée)
  6. `Statut d'Expédition` (À expédier, En préparation, Expédiée, Livrée, Retournée)
  7. `Transporteur & N° Suivi` (Badge transporteur, Lien AWB cliquable)
  8. `Actions Logistiques`
- **Actions par ligne**:
  - `Ouvrir le tiroir de détails de la commande (SellerOrderDrawer)`
  - `Expédier la commande`
  - `Générer & Imprimer le Bordereau d'Expédition (Format A4 / Thermique)`
  - `Imprimer la Facture / Bon de Livraison Marchand`
  - `Annuler la commande / Expédition (Ouvre la modale accessible avec motif)`
- **Filtres de flux**: `[Toutes, À expédier, En transit, Livrées, Urgent COD, Annulées / RTO]`

#### F. Modales & Dialogues
- **Modale d'Annulation de Commande (PromptDialog Accessible)**:
  - Titre : "Annuler l'expédition de la commande #[Numéro]"
  - Message : "Veuillez spécifier le motif d'annulation. Ce motif sera consigné dans l'historique et communiqué au client."
  - Champ de saisie : "Motif de l'annulation (ex: Rupture de stock imprévue, Demande explicite de l'acheteur, Numéro erroné)" avec compteur de caractères
  - Boutons : `Confirmer l'annulation`, `Conserver la commande`
- **Tiroir Latéral de Commande (SellerOrderDrawer)**:
  - Détail des articles du panier, adresse complète de livraison, coordonnées du transporteur, historique des événements de suivi en direct, bouton de ré-attribution de transporteur.

---

### [Page 41] Customer Direct Negotiation, Inquiry Chat & 1-Click COD Validation

- **Navigation Placement**: `Group 2: Ventes & Opérations` > **Messagerie & Validation COD**
- **Primary Route**: `/hub/dashboard/messages`
- **Breadcrumb Hierarchy**: `Accueil > Ventes > Messagerie clients`
- **Layer 6 Archetype**: `Live Negotiation Chat with 1-Click COD Order Validation Button`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Ventes > Messagerie clients`
2. **Header Bar**: Title `Customer Direct Negotiation, Inquiry Chat & 1-Click COD Validation` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Live Negotiation Chat with 1-Click COD Order Validation Button.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 41. Customer Direct Negotiation, Inquiry Chat & 1-Click COD Validation
- **Route Path**: `/hub/dashboard/messages`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Messagerie instantanée dédiée aux marchands PandaMarket, réponses aux questions des acheteurs en temps réel, négociation de prix et validation de commande en 1-clic depuis la discussion.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Messagerie Clients`
- **Page Heading**: "Messagerie Vendeur & Négociations Clients"
- **Subtitle / Description**: "Répondez aux acheteurs intéressés par vos articles, négociez les commandes spéciales et validez les paniers en direct."

#### B. Modules & Interface de Discussion (SellerChatInbox)
- **Volet Gauche — Liste des Fils de Discussion**:
  - Filtrage : `[Toutes les conversations, Messages non lus, En attente d'accord COD, Négociations en cours]`
  - Carte conversation : Nom de l'acheteur, Photo de l'article sur lequel porte la question, Dernier message, Heure, Badge non lu
- **Volet Droit — Fil Actif & Panneau de Commande**:
  - En-tête : Nom du client, Numéro de téléphone certifié, Article concerné (Photo, Prix en TND, Stock disponible)
  - Bouton d'Action 1-Clic : `Valider et Créer une Commande COD Directement Depuis le Chat`
  - Corps de la discussion : Échange de messages textuels, envoi de photos de produits réels, envoi de liens vers des fiches articles
  - Zone de saisie : Champ texte, Émojis, Bouton d'envoi rapide d'une offre personnalisée (Prix remisé négocié)

---

### [Page 71] Courier / Driver Mobile Delivery Handshake Console

- **Navigation Placement**: `Group 2: Ventes & Opérations` > **Console Livreur Mobile**
- **Primary Route**: `/courier`
- **Breadcrumb Hierarchy**: `Accueil > Ventes > Console Livreur Mobile`
- **Layer 6 Archetype**: `Mobile Delivery Route Ledger with Click-to-Call & COD Cash Handshake`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Ventes > Console Livreur Mobile`
2. **Header Bar**: Title `Courier / Driver Mobile Delivery Handshake Console` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Mobile Delivery Route Ledger with Click-to-Call & COD Cash Handshake.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 71. Courier / Driver Mobile Delivery Handshake Console
- **Route Path**: `/courier`
- **Dashboard Realm**: Logistics Operator / Driver Console
- **Operational Objective**: Console mobile ultra-rapide pour les livreurs et chauffeurs de tournée tunisiens : feuille de route de livraison, vérification du montant à encaisser contre remboursement (COD), validation par code OTP de livraison et confirmation de réception.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Plateforme PandaMarket > Console Livreur`
- **Page Heading**: "Tournée de Livraison & Encaissement COD"
- **Subtitle / Description**: "Feuille de route mobile pour les chauffeurs-livreurs : confirmez les réceptions de colis et encaissez les montants COD."
- **Badges**: `Mode Chauffeur Mobile`, `Statut Géolocalisation : Actif`

#### B. Key Performance Indicators (KPIs)
- **Colis à Livrer Aujourd'hui**: `18 colis`
- **Colis Déjà Livrés avec Succès**: `12 colis`
- **Montant COD Total à Encaisser**: `1,450.000 TND`
- **Montant COD Déjà Collecté en Espèces**: `985.000 TND`

#### C. Data Collection — Feuille de Route Chronologique des Colis
- **Carte Colis de Tournée (Structure unitaire)**:
  - N° de Colis & Commande : `#ORD-882194`
  - Destinataire : `Sami Mansour` · Téléphone : `+216 20 112 233`
  - Adresse de livraison : `14 Rue Ibn Khaldoun, Tunis` (Bouton d'itinéraire GPS Google Maps / Waze)
  - Montant COD à encaisser en espèces : `85.500 TND`
  - Statut : `En cours de livraison (Out for delivery)`
  - **Boutons d'Action Rapide**:
    - `Appeler le Destinataire (Lien direct tel:)`
    - `Valider la Livraison & Encaisser le COD (Ouvre la modale OTP de remise en main propre)`
    - `Signaler un Échec de Livraison (Client absent, Adresse introuvable, Refus)`

#### D. Modale de Validation de Livraison par Code OTP
- Titre : "Validation de Remise de Colis #[ORD-882194]"
- Montant encaissé : `85.500 TND`
- Champ de saisie : "Code OTP à 4 chiffres fourni par l'acheteur"
- Boutons : `Confirmer la réception & Marquer comme Livré`, `Annuler`


---

---

