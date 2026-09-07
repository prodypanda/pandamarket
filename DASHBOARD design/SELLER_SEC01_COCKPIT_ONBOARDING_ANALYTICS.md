# Seller Section 1: Cockpit, Onboarding & Store Analytics

> **Operational Objective**: Executive store cockpit (switchable Bento Cockpit and Classique), step-by-step onboarding guide, and real-time sales/traffic analytics.
> **Application Routes**: `/hub/dashboard`, `/hub/dashboard/onboarding`, `/hub/dashboard/analytics`
> **Pages Covered in this Section**: Page 32, Page 33, Page 34

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

### [Page 32] Seller Cockpit & Executive Business Summary (Bento & Classic)

### 32. Seller Cockpit & Executive Business Summary (Bento & Classic)
- **Route Path**: `/hub/dashboard`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Pilotage opérationnel quotidien de la boutique marchande, indicateurs clés de performance des ventes, raccourcis vers les commandes urgentes à valider, et bascule de style entre vue dense (Classique) et vue modulaire visuelle (Bento Cockpit).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Vue d'ensemble`
- **Page Heading**: "Cockpit Marchand & Pilotage des Ventes"
- **Subtitle / Description**: "Supervisez vos ventes en temps réel, traitez vos commandes en attente d'expédition, surveillez votre trésorerie disponible et optimisez votre visibilité."
- **Badges d'État & Contexte**:
  - `Boutique : [Nom de la Boutique]`
  - `Plan Actuel : [Pro / Gratuit / Starter]`
  - `Statut KYC : [Vérifié (Badge officiel) / En cours / Non soumis]`
  - `Commutateur de Style : [Mode Classique (Grille Dense) | Mode Bento Cockpit (Cartes Modulaires)]`
- **Barre d'Avancement de Lancement de la Boutique**:
  - Libellé : "Configuration de votre boutique : 4/5 étapes complétées (80%)"
  - Raccourci : `Reprendre le guide de lancement →`

#### B. Key Performance Indicators (KPIs) & Numerical Telemetry
- **Métrique 1 — Chiffre d'Affaires du Mois (TND)**: `8,450.000 TND` (Croissance de +18.5% vs mois précédent)
- **Métrique 2 — Commandes Traitées ce Mois**: `112 commandes`
- **Métrique 3 — Solde Disponible Virable**: `1,840.500 TND` (Fonds collectés prêts pour virement bancaire)
- **Métrique 4 — Fonds COD en Transit (Transporteurs)**: `2,120.000 TND` (Colis livrés ou en cours chez Aramex, Rapid-Poste, Runex)
- **Métrique 5 — Panier Moyen Boutique (AOV)**: `75.450 TND`
- **Métrique 6 — Taux de Livraison Réussie**: `94.6%` (Pourcentage de commandes réceptionnées sans retour à l'expéditeur)

#### C. Control Bar & Action Triggers
- **Bouton Primaire 1**: `+ Ajouter un Produit` (Lien direct vers le formulaire produit)
- **Bouton Primaire 2**: `Voir ma Boutique en Ligne` (Ouvre `boutique.pandamarket.tn` dans un nouvel onglet)
- **Bouton Secondaire 1**: `Demander un Virement` (Déclencheur direct du guichet de retrait)
- **Bouton Secondaire 2**: `Booster les Ventes avec PandaAds` (Raccourci création campagne)

#### D. Structure Modulaire Bento Cockpit (Composants de la Vue Bento)
- **Carte Bento 1 — Alertes Logistiques & Expéditions Urgentes**:
  - Titre : "Commandes Nécessitant une Action Immédiate"
  - Compteur : `4 commandes en attente de préparation`
  - Détail : 2 commandes contre remboursement (COD) à risque moyen nécessitant confirmation téléphonique avant expédition.
  - Action directe : `Consulter la file d'expédition →`
- **Carte Bento 2 — Arène de Vélocité des Ventes**:
  - Graphique temporel des 30 derniers jours (Courbe des ventes en TND et histogramme du nombre de commandes par jour)
  - Jour le plus rentable de la semaine : "Samedi (Pic à 1,420.000 TND)"
- **Carte Bento 3 — Jauge de Trésorerie & Solde Virable**:
  - Anneau circulaire : Solde virable (1,840.500 TND) vs Fonds en cours (2,120.000 TND)
  - Coordonnées bancaires enregistrées : `BIAT — RIB terminé par ****4821`
  - Action : `Initier un virement bancaire`
- **Carte Bento 4 — Alertes Stocks & Ruptures Imminentes**:
  - Liste des 3 articles ayant franchi le seuil d'alerte :
    - `Article A : 2 unités restantes`
    - `Article B : 1 unité restante`
    - `Article C : En rupture de stock (0)`
  - Action unitaire : `Réapprovisionner en 1-clic`
- **Carte Bento 5 — Performance PandaAds & Marge Nette**:
  - Dépenses publicitaires ce mois : `120.000 TND`
  - ROAS moyen : `4.6x`
  - Marge nette marchand estimée : `~65.8%`
  - Action : `Gérer les campagnes`
- **Carte Bento 6 — Derniers Avis Clients & Satisfaction**:
  - Note moyenne de la boutique : `4.8 / 5.0 étoiles` (sur 184 avis)
  - Dernier commentaire reçu : "Produit artisanal de très grande qualité, expédition soignée reçue en 24h à Nabeul."

---

### [Page 33] Store Launch Checklist & Step-by-Step Onboarding Guide

### 33. Store Launch Checklist & Step-by-Step Onboarding Guide
- **Route Path**: `/hub/dashboard/onboarding`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Guide interactif étape par étape accompagnant le nouveau marchand de la création initiale jusqu'à la première commande réussie.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Guide de Lancement`
- **Page Heading**: "Guide de Lancement de Votre Boutique"
- **Subtitle / Description**: "Complétez les 5 étapes fondamentales pour certifier votre boutique, attirer vos premiers clients tunisiens et encaisser vos revenus."
- **Indicateur de Progression Global**: `4 étapes sur 5 validées — Progression : 80%`

#### B. Étapes d'Onboarding Détaillées
- **Étape 1 : Identité & Paramètres de Base (Statut : Validé)**
  - Titre : "Donnez une identité à votre vitrine"
  - Description : Nom commercial de la boutique, sous-domaine `votre-nom.pandamarket.tn`, logo officiel et description de l'activité.
  - Action : `Modifier les paramètres`
- **Étape 2 : Ajout du Premier Produit (Statut : Validé)**
  - Titre : "Publiez vos premiers articles au catalogue"
  - Description : Titre descriptif, photos haute définition, variantes de taille/couleur, prix en TND et stock disponible.
  - Action : `Ajouter d'autres produits`
- **Étape 3 : Personnalisation de la Vitrine & Thème (Statut : Validé)**
  - Titre : "Choisissez et adaptez votre thème visuel"
  - Description : Sélection du thème responsive, personnalisation de la palette de couleurs, et disposition de la bannière d'accueil.
  - Action : `Personnaliser le thème`
- **Étape 4 : Configuration des Passerelles de Paiement & Expédition (Statut : Validé)**
  - Titre : "Activez l'encaissement et les transporteurs"
  - Description : Activation du paiement à la livraison (COD), paramétrage des passerelles en ligne (Flouci, Konnect), et sélection des gouvernorats de livraison.
  - Action : `Gérer les paiements`
- **Étape 5 : Vérification d'Identité KYC & RIB de Virement (Statut : Action Requise)**
  - Titre : "Transmettez votre pièce d'identité et votre RIB"
  - Description : Téléversement de votre CIN ou Registre National des Entreprises (RNE) et saisie de votre RIB tunisien sur 20 chiffres pour débloquer les virements.
  - Action : `Compléter la vérification d'identité (Dernière étape) →`

---

### [Page 34] Store Analytics, Traffic, Conversion & Sales Velocity

### 34. Store Analytics, Traffic, Conversion & Sales Velocity
- **Route Path**: `/hub/dashboard/analytics`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Rapports statistiques approfondis de la boutique marchande, volume d'affaires, panier moyen, réachat, cadran des ventes par jour et classement des articles phares.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Statistiques de Vente`
- **Page Heading**: "Cockpit Analytics & Rentabilité"
- **Subtitle / Description**: "Supervisez vos flux de revenus, la vélocité de vos produits et vos performances publicitaires en temps réel."
- **Badge d'Affichage**: `Bento Matrix Analytics`

#### B. Key Performance Indicators (KPIs)
- **Chiffre d'Affaires de la Période**: `8,450.000 TND` (+18.5% vs période précédente)
- **Volume de Commandes**: `112 commandes`
- **Panier Moyen Boutique (AOV)**: `75.450 TND`
- **Taux de Réachat (Clients Fidèles)**: `24.8%` (Pourcentage de clients ayant passé plus d'une commande)
- **Taux de Conversion des Visites**: `3.15%`

#### C. Control Bar & Filter Matrix
- **Sélecteur de Période**: `[7 jours, 30 jours, 90 jours]` (Boutons segmentés)
- **Bouton d'Action**: `Actualiser les données`

#### D. Modules & Graphiques Sémantiques
- **Module 1 — Arène de Vélocité du Chiffre d'Affaires (Graphique SVG Interactif)**:
  - Courbe chronologique des revenus journaliers (TND) avec pic de vente identifié
  - Triplet de micro-KPIs intégrés : Panier Moyen (75.450 TND), Nombre de Commandes (112), Part des Clients Fidèles (24.8%)
- **Module 2 — Marge Nette & Rendement Publicitaire (PandaAds Pulse)**:
  - Marge Marchand Nette Estimée : `~68.4%` (calculée après déduction des commissions de la marketplace et frais publicitaires)
  - ROAS Moyen Recommandé : `4.2x`
  - Bouton : `Ouvrir PandaAds Center`
- **Module 3 — Cadran des Ventes par Jour de la Semaine**:
  - Histogramme des 7 jours (Dimanche à Samedi)
  - Meilleur jour identifié : "Meilleur : Samedi (Pic de 1,420.000 TND pour 19 commandes)"
- **Module 4 — Entonnoir des Statuts de Commandes**:
  - Livrées : `94 commandes (84%)`
  - En traitement : `10 commandes (9%)`
  - En attente : `5 commandes (4%)`
  - Annulées / Refusées : `3 commandes (3%)`
- **Module 5 — Articles Leaders (Top Produits Générateurs de Revenus)**:
  - Liste ordonnée des 5 meilleurs articles :
    - 1. Robe Traditionnelle Brodée Soie — 42 vendus — 3,360.000 TND
    - 2. Service de Table en Céramique de Nabeul — 28 vendus — 1,960.000 TND
    - 3. Sac Cuir Artisanal Tunisien — 24 vendus — 1,680.000 TND
    - 4. Huile d'Olive Vierge Extra Bio 1L — 50 vendus — 1,250.000 TND
    - 5. Coffret Coffrets Pâtisserie Tunisienne — 15 vendus — 200.000 TND
  - Lien : `Voir tout le catalogue produits →`

---

