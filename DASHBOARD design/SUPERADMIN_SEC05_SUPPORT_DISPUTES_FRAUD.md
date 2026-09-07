# Superadmin Section 5: Support, Disputes, Fraud & Tickets

> **Operational Objective**: Unified mediation chat, fraud reports, dispute dossier adjudication, transaction fraud radar, and platform helpdesk support tickets.
> **Application Routes**: `/(admin)/messages`, `/(admin)/moderation/fraud`, `/(admin)/tickets/disputes`, `/(admin)/security/fraud`, `/(admin)/tickets`
> **Pages Covered in this Section**: Page 14, Page 15, Page 16, Page 19, Page 28

---

## 1. Section Navigation & Menu Placement

| Page # | Menu Label | Sidebar Group | Route Path | Assigned Icon | Breadcrumb Trail |
|---|---|---|---|---|---|
| Page 14 | **Chat de Médiation** | `Group 5: Confiance, Litiges & Support` | `/messages` | `MessageSquare` | `Administration > Confiance > Chat de Médiation` |
| Page 15 | **Signalements d'Infractions** | `Group 5: Confiance, Litiges & Support` | `/reports` | `Flag` | `Administration > Confiance > Signalements & Infractions` |
| Page 16 | **Dossiers de Litige** | `Group 5: Confiance, Litiges & Support` | `/(admin)/tickets/disputes` | `Gavel` | `Administration > Confiance > Dossiers de Litige` |
| Page 19 | **Radar Anti-Fraude & RTO** | `Group 5: Confiance, Litiges & Support` | `/fraud-radar` | `ShieldAlert` | `Administration > Confiance > Radar Anti-Fraude` |
| Page 28 | **Tickets Support Desk** | `Group 5: Confiance, Litiges & Support` | `/(admin)/tickets` | `LifeBuoy` | `Administration > Confiance > Tickets Support` |

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

### [Page 14] Superadmin Unified Support Chat & Dispute Mediation

- **Navigation Placement**: `Group 5: Confiance, Litiges & Support` > **Chat de Médiation**
- **Primary Route**: `/messages`
- **Breadcrumb Hierarchy**: `Administration > Confiance > Chat de Médiation`
- **Layer 6 Archetype**: `Three-Way Split-Pane Mediation Console (Thread + Order Context)`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Confiance > Chat de Médiation`
2. **Header Bar**: Title `Superadmin Unified Support Chat & Dispute Mediation` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Three-Way Split-Pane Mediation Console (Thread + Order Context).
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

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

- **Navigation Placement**: `Group 5: Confiance, Litiges & Support` > **Signalements d'Infractions**
- **Primary Route**: `/reports`
- **Breadcrumb Hierarchy**: `Administration > Confiance > Signalements & Infractions`
- **Layer 6 Archetype**: `Incident Queue with Severity Score & Merchant Risk Profile`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Confiance > Signalements & Infractions`
2. **Header Bar**: Title `Fraud Reports & Platform Violations Queue` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Incident Queue with Severity Score & Merchant Risk Profile.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

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

- **Navigation Placement**: `Group 5: Confiance, Litiges & Support` > **Dossiers de Litige**
- **Primary Route**: `/(admin)/tickets/disputes`
- **Breadcrumb Hierarchy**: `Administration > Confiance > Dossiers de Litige`
- **Layer 6 Archetype**: `Evidence Gallery & Legal Verdict Adjudication Panel`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Confiance > Dossiers de Litige`
2. **Header Bar**: Title `Dispute Dossier & Sanction Adjudication` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Evidence Gallery & Legal Verdict Adjudication Panel.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

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

- **Navigation Placement**: `Group 5: Confiance, Litiges & Support` > **Radar Anti-Fraude & RTO**
- **Primary Route**: `/fraud-radar`
- **Breadcrumb Hierarchy**: `Administration > Confiance > Radar Anti-Fraude`
- **Layer 6 Archetype**: `Real-time Heuristic Threat Feed & High-Risk Blacklist`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Confiance > Radar Anti-Fraude`
2. **Header Bar**: Title `Fraud Radar & High-Risk Transaction Engine` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Real-time Heuristic Threat Feed & High-Risk Blacklist.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

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

- **Navigation Placement**: `Group 5: Confiance, Litiges & Support` > **Tickets Support Desk**
- **Primary Route**: `/(admin)/tickets`
- **Breadcrumb Hierarchy**: `Administration > Confiance > Tickets Support`
- **Layer 6 Archetype**: `Helpdesk Triage Board with SLA Countdown Timers`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Confiance > Tickets Support`
2. **Header Bar**: Title `Platform Support Desk & Agent Tickets` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Helpdesk Triage Board with SLA Countdown Timers.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

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

