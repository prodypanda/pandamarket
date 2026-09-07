# Superadmin Section 5: Support, Disputes, Fraud & Tickets

> **Operational Objective**: Unified mediation chat, fraud reports, dispute dossier adjudication, transaction fraud radar, and platform helpdesk support tickets.
> **Application Routes**: `/(admin)/messages`, `/(admin)/moderation/fraud`, `/(admin)/tickets/disputes`, `/(admin)/security/fraud`, `/(admin)/tickets`
> **Pages Covered in this Section**: Page 14, Page 15, Page 16, Page 19, Page 28

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

### [Page 14] Superadmin Unified Support Chat & Dispute Mediation

### 14. Superadmin Unified Support Chat & Dispute Mediation
- **Route Path**: `/messages`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Boîte de réception globale d'assistance et de médiation, consultation des échanges entre vendeurs et acheteurs en cas de litige, et réponse directe aux sollicitations institutionnelles.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Catalogue & Contenu > Messagerie Unifiée`
- **Page Heading**: "Centre de Messagerie & Assistance Superadmin"
- **Subtitle / Description**: "Pilotez l'ensemble des conversations d'assistance, arbitrez les fils de discussion litigieux et communiquez avec les marchands."

#### B. Control Bar & Filter Matrix
- **Filtre par Type de Fil**:
  - `Support Vendeurs (Marchands vers Admin)`
  - `Support Acheteurs (Clients vers Admin)`
  - `Médiation Litiges (Acheteur ↔ Vendeur ↔ Admin)`
  - `Fils de discussion Résolus / Archivés`
- **Champ de Recherche**: "Rechercher dans les conversations par nom, email ou numéro de commande..."

#### C. Data Collection — Liste des Conversations & Espace de Chat
- **Panneau de gauche — Liste des fils de discussion**:
  - Fiche de conversation : Nom de l'interlocuteur, Rôle (Vendeur / Acheteur), Extrait du dernier message, Heure, Badge de statut (`Non lu`, `En cours`, `Résolu`), Numéro de commande associée
- **Panneau de droite — Espace de Discussion Actif**:
  - En-tête du fil : Nom, Statut, Commande associée (Montant TND, Statut livraison), Raccourci vers fiche utilisateur
  - Historique chronologique des messages : Bulles horodatées avec nom et rôle de l'émetteur
  - Zone de composition de message : Champ de saisie texte enrichi, Pièces jointes (photos, factures), Réponses pré-enregistrées (Canned responses)
  - Boutons d'action du fil : `Transférer à un collègue`, `Marquer comme résolu`, `Créer un dossier de litige officiel`, `Bloquer l'utilisateur`

---

### [Page 15] Fraud Reports & Platform Violations Queue

### 15. Fraud Reports & Platform Violations Queue
- **Route Path**: `/reports`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: File de traitement des signalements pour contrefaçon, non-livraison, propos diffamatoires, fraude bancaire ou infraction aux conditions générales de vente.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Catalogue & Contenu > Signalements & Litiges`
- **Page Heading**: "Gestion des Signalements & Infractions"
- **Subtitle / Description**: "Traitez les signalements émis par les acheteurs, les marchands ou les algorithmes automatisés de détection des fraudes."
- **Badges de Compteurs**: `5 signalements ouverts nécessitant une décision`

#### B. Control Bar & Filter Matrix
- **Sélecteur d'Onglets**: `[Tous les signalements, En attente (Ouverts), En cours d'enquête, Sanction appliquées, Classés sans suite]`
- **Filtre par Typologie d'Infraction**: `[Contrefaçon / Violation IP, Escroquerie / Non-envoi de commande, Produit interdit / Dangereux, Fraude au paiement COD, Harcèlement / Insultes]`
- **Champ de Recherche**: "Rechercher par ID signalement, nom de boutique ou plaignant..."

#### C. Data Collection — Tableau des Signalements
- **En-têtes de colonnes**:
  1. `Réf. Dossier` (ID Signalement: e.g. `REP-2026-084`)
  2. `Type d'Infraction` (Badge coloré selon gravité)
  3. `Cible Signalée` (Nom de la boutique ou du produit incriminé)
  4. `Plaignant` (Nom de l'utilisateur, Date de soumission)
  5. `Gravité Déclarée` (Faible, Moyenne, Haute, Critique)
  6. `Statut` (Badge: Ouvert, En cours, Sanctionné, Rejeté)
  7. `Date de Signalement` (Date et heure)
  8. `Actions`
- **Actions par ligne**:
  - `Ouvrir le dossier d'enquête complet` (Lien vers `/reports/[id]`)
  - `Suspendre temporairement l'article / boutique`
  - `Rejeter le signalement comme infondé`

---

### [Page 16] Dispute Dossier & Sanction Adjudication

### 16. Dispute Dossier & Sanction Adjudication
- **Route Path**: `/reports/[id]`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Dossier d'investigation unitaire d'un signalement, audition des parties, consultation des pièces à conviction, historique des sanctions et prise de décision administrative.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Signalements > Dossier #[id]`
- **Page Heading**: "Dossier d'Enquête Litige #[ID]"
- **Subtitle / Description**: "Examen contradictoire des déclarations, des pièces justificatives et prononcé des sanctions disciplinaires."
- **Badges d'État**: `Statut : En cours d'instruction`, `Priorité : Haute`

#### B. Structure de Contenu du Dossier
- **Section 1 — Récapitulatif du Signalement**:
  - Plaignant : Identité, Coordonnées, Historique de crédibilité
  - Cible signalée : Nom de la boutique, Ancienneté, Taux de réclamations
  - Motif de l'infraction et description détaillée des faits
  - Date et heure du dépôt
- **Section 2 — Pièces Justificatives Déposées**:
  - Galerie de preuves : Captures d'écran, factures d'achat, photos comparatives de contrefaçon, échanges de messages
- **Section 3 — Réponse de la Boutique Signalée**:
  - Mémoire en défense du vendeur, justifications fournies, certificat d'authenticité le cas échéant
- **Section 4 — Décision & Sanctions Administratives (Formulaire d'arbitrage)**:
  - Choix du verdict : `[Signalement Non Fondé (Classement sans suite), Avertissement Formel, Suppression du Produit, Suspension Temporaire (7 jours), Bannissement Définitif de la Boutique]`
  - Décision sur les fonds séquestrés : `[Rembourser le plaignant, Débloquer les fonds au vendeur, Maintien du séquestre]`
  - Motivation écrite de la décision (Notification officielle transmise aux deux parties)
  - Boutons d'action : `Appliquer le verdict & Clôturer le dossier`, `Demander des preuves complémentaires`

---

### [Page 19] Fraud Radar & High-Risk Transaction Engine

### 19. Fraud Radar & High-Risk Transaction Engine
- **Route Path**: `/fraud-radar`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Moteur de détection algorithmique des fraudes, blocage d'adresses IP suspectes, analyse des taux de refus COD par numéro de téléphone et prévention des rétrofacturations.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Croissance & Monétisation > Radar Anti-Fraude`
- **Page Heading**: "Radar Anti-Fraude & Rétrofacturations"
- **Subtitle / Description**: "Surveillez les comportements d'achat malveillants, analysez les scores de risque des commandes et gérez la liste noire de la plateforme."

#### B. Key Performance Indicators (KPIs)
- **Transactions à Risque Élevé Détectées**: `18 cette semaine`
- **Taux de Fraude Prévenue**: `99.1%`
- **Adresses IP Bloquées**: `48 adresses`
- **Numéros de Téléphone Bannis pour Refus Répétés**: `112 numéros`

#### C. Control Bar & Action Matrix
- **Filtre de Gravité du Score de Risque**: `[Tous, Risque Critique (>80/100), Risque Modéré (50-80), Transactions Sûres (<50)]`
- **Champ de Recherche**: "Rechercher par adresse IP, numéro de téléphone suspect ou ID de commande..."
- **Bouton Primaire**: `+ Ajouter une IP ou un Numéro à la Liste Noire`

#### D. Data Collection — Tableau des Alertes de Risque
- **En-têtes de colonnes**:
  1. `Réf. Commande` (ID Transaction liée)
  2. `Score de Risque` (Jauge chiffrée de 0 à 100 avec indicateur de sévérité)
  3. `Indicateurs d'Alerte` (Multiples tentatives d'achat en 5 min, IP étrangère pour livraison locale, Numéro déjà signalé)
  4. `Acheteur & Coordonnées` (Nom déclaré, Téléphone, Adresse IP, Empreinte d'appareil)
  5. `Boutique Ciblée` (Nom de la boutique vendeuse)
  6. `Montant du Panier` (Valeur en Dinars Tunisiens)
  7. `Décision Système` (Bloqué automatiquement, Mis en attente de révision, Autorisé sous réserve)
  8. `Actions`
- **Actions par ligne**:
  - `Inspecter l'empreinte de sécurité détaillée`
  - `Bloquer l'adresse IP définitivement`
  - `Bannir le numéro de téléphone`
  - `Lever l'alerte (Faux positif)`

---

### [Page 28] Platform Support Desk & Agent Tickets

### 28. Platform Support Desk & Agent Tickets
- **Route Path**: `/admin/support`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Guichet d'assistance technique interne, suivi des demandes des administrateurs et coordination des interventions techniques de maintenance.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Support Interne`
- **Page Heading**: "Centre d'Assistance & Tickets Plateforme"
- **Subtitle / Description**: "Gestion des incidents techniques, demandes de maintenance et requêtes de niveau 2."

#### B. Key Performance Indicators (KPIs)
- **Tickets Ouverts**: `3 tickets en cours`
- **Temps Moyen de Prise en Charge**: `15 minutes`
- **Incidents Techniques Résolus (30j)**: `24 incidents`

#### C. Data Collection — Tableau des Tickets de Support
- **En-têtes de colonnes**:
  1. `Réf. Ticket` (ID Ticket)
  2. `Sujet & Description` (Titre de l'incident, Catégorie: Passerelle de paiement, Base de données, CDN, Bugs UI)
  3. `Priorité` (Faible, Normale, Haute, Bloquante)
  4. `Demandeur` (Nom de l'administrateur ou agent support)
  5. `Assigné à` (Ingénieur infrastructure ou développeur responsable)
  6. `Statut` (Badge: Nouveau, En cours de traitement, Résolu, Fermé)
  7. `Actions` (`Voir le ticket`, `Répondre`, `Clôturer`)

---

