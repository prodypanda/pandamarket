# Superadmin Section 1: Overview, Analytics & Operational Notes

> **Operational Objective**: High-level platform executive telemetry, GMV metrics, business analytics, and quick admin operational notes.
> **Application Routes**: `/(admin)/analytics`, `/(admin)/dashboard`, `/(admin)/notes`
> **Pages Covered in this Section**: Page 1, Page 2, Page 3

---

## 1. Section Navigation & Menu Placement

| Page # | Menu Label | Sidebar Group | Route Path | Assigned Icon | Breadcrumb Trail |
|---|---|---|---|---|---|
| Page 1 | **Tableau de Bord Exécutif** | `Group 1: Pilotage & Télémétrie` | `/dashboard` | `LayoutDashboard` | `Administration > Pilotage > Tableau de bord` |
| Page 2 | **Statistiques Plateforme** | `Group 1: Pilotage & Télémétrie` | `/platform-analytics` | `LineChart` | `Administration > Pilotage > Statistiques Globales` |
| Page 3 | **Bloc-notes Opérationnels** | `Group 1: Pilotage & Télémétrie` | `/admin-notes` | `StickyNote` | `Administration > Pilotage > Notes & Rappels` |

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

### [Page 1] Superadmin Overview & Executive Telemetry

- **Navigation Placement**: `Group 1: Pilotage & Télémétrie` > **Tableau de Bord Exécutif**
- **Primary Route**: `/dashboard`
- **Breadcrumb Hierarchy**: `Administration > Pilotage > Tableau de bord`
- **Layer 6 Archetype**: `Bento Grid Telemetry Matrix`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Pilotage > Tableau de bord`
2. **Header Bar**: Title `Superadmin Overview & Executive Telemetry` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Bento Grid Telemetry Matrix.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 1. Superadmin Overview & Executive Telemetry
- **Route Path**: `/dashboard`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Global platform heartbeat monitoring, gross merchandise volume tracking, high-priority operational risks, and quick navigational routing.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Vue d'ensemble`
- **Page Heading**: "Bonjour, Admin" (Salutation dynamique selon l'heure: "Good morning / afternoon / evening, Admin")
- **Subtitle / Description**: "Bienvenue sur le centre de contrôle PandaMarket. Voici l'état opérationnel de la place de marché, les signaux de revenus, l'activité des vendeurs et les risques nécessitant votre arbitrage immédiat."
- **Status Badges & Telemetry**:
  - `État du système : Optimal` (Indicateur actif de disponibilité globale de l'infrastructure)
  - `Rôle : Superadmin` (Accès complet avec privilèges d'audit et de modération)

#### B. Key Performance Indicators (KPIs) & Numerical Telemetry
- **Métrique 1 — Total Vendeurs**: `1,420 vendeurs inscrits` (Totalité des boutiques actives, en cours de vérification et souscrites)
- **Métrique 2 — Chiffre d'Affaires Brut (GMV)**: `4,850,210.500 TND` (Volume total d'affaires transacté sur la place de marché en Dinars Tunisiens)
- **Métrique 3 — Commandes Globales**: `38,420 commandes passées` (Volume cumulé des paniers d'achat traités)
- **Métrique 4 — KYC en Attente**: `14 dossiers en attente` (Dossiers marchands nécessitant validation de CIN / Registre de Commerce RNE)
- **Métrique 5 — Mandats en Attente**: `8 reçus postaux à valider` (Paiements d'abonnements ou recharges de solde publicitaire par Mandat Minute à certifier)
- **Métrique 6 — Signalements & Litiges Ouverts**: `5 dossiers actifs` (Réclamations clients ou signalements de contrefaçon en cours)

#### C. Control Bar, Quick Jumps & Navigation Shortcuts
- **Bouton Primaire 1**: `Paramètres de la Plateforme` (Lien direct vers `/settings`)
- **Bouton Primaire 2**: `Aller au Hub Public` (Lien direct vers `/hub`)
- **Boutons de Raccourcis Rapides (Quick Jump)**:
  - `Vendeurs` (Lien vers `/users`)
  - `Boutiques` (Lien vers `/stores`)
  - `Plans d'Abonnement` (Lien vers `/plans`)
  - `Coûts IA` (Lien vers `/ai-costs`)
  - `Journaux Système` (Lien vers `/system-logs`)
  - `Configuration Email SMTP` (Lien vers `/smtp-config`)

#### D. Data Collections & Action Centers
- **Action Center — Tâches Prioritaires Requérant Arbitrage**:
  - **Élément 1 : Vérifications KYC**
    - Titre : "Validation des Boutiques"
    - Sous-titre : "14 dossiers en attente de vérification d'identité"
    - Action : `Traiter les KYC →` (Redirection vers `/kyc`)
  - **Élément 2 : Preuves de Mandats Postaux**
    - Titre : "Validation des Paiements Hors-Ligne"
    - Sous-titre : "8 reçus de mandats en attente d'approbation comptable"
    - Action : `Valider les Mandats →` (Redirection vers `/mandats`)
  - **Élément 3 : Litiges & Signalements Actifs**
    - Titre : "Arbitrage des Réclamations"
    - Sous-titre : "5 dossiers ouverts nécessitant une décision administrative"
    - Action : `Examiner les Litiges →` (Redirection vers `/reports`)

---

### [Page 2] Platform-wide Business & Sales Analytics

- **Navigation Placement**: `Group 1: Pilotage & Télémétrie` > **Statistiques Plateforme**
- **Primary Route**: `/platform-analytics`
- **Breadcrumb Hierarchy**: `Administration > Pilotage > Statistiques Globales`
- **Layer 6 Archetype**: `Multi-Chart Time-Series & Conversion Funnel`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Pilotage > Statistiques Globales`
2. **Header Bar**: Title `Platform-wide Business & Sales Analytics` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Multi-Chart Time-Series & Conversion Funnel.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 2. Platform-wide Business & Sales Analytics
- **Route Path**: `/platform-analytics`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Analyse macro-économique de la marketplace, vélocité des ventes nationales, répartition des commissions prélevées et suivi des volumes d'encaissement par gouvernorat tunisien.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Statistiques > Analyse Globale de la Plateforme`
- **Page Heading**: "Analytique & Performances Globales"
- **Subtitle / Description**: "Supervision macro-économique des transactions, des commissions de la plateforme, du panier moyen national et du volume d'affaires sur l'ensemble des 24 gouvernorats."
- **Badges de Filtrage Temporel**: `7 derniers jours`, `30 derniers jours`, `90 derniers jours`, `Année en cours`

#### B. Key Performance Indicators (KPIs)
- **Métrique 1 — Volume d'Affaires Global (GMV)**: `248,500.000 TND` (Croissance de +14.2% vs période précédente)
- **Métrique 2 — Commissions Plateforme Perçues**: `19,880.000 TND` (Taux de commission moyen effectif : 8.0%)
- **Métrique 3 — Panier Moyen National (AOV)**: `74.500 TND` (+3.100 TND vs période précédente)
- **Métrique 4 — Taux de Conversion Global**: `2.85%` (Visiteurs uniques convertis en acheteurs)
- **Métrique 5 — Volume de Commandes Traitées**: `3,335 commandes`
- **Métrique 6 — Part du Paiement à la Livraison (COD)**: `82.4%` (vs 17.6% par cartes et portefeuilles digitaux Flouci/Konnect)

#### C. Control Bar & Filter Matrix
- **Sélecteur de Période**: Menu déroulant `[7 jours, 30 jours, 90 jours, 365 jours, Personnalisé]`
- **Filtre par Région / Gouvernorat**: Menu déroulant `[Tous les 24 gouvernorats, Grand Tunis, Sahel, Sfax & Sud, Nord & Centre]`
- **Bouton d'Action**: `Exporter le Rapport Analytique (CSV / PDF)`

#### D. Data Collections & Graphiques Sémantiques
- **Graphique 1 — Courbe de Vélocité des Ventes & Commissions**:
  - Séries : Chiffre d'Affaires Total (TND) vs Revenu Net Plateforme (TND)
  - Axe X : Dates chronologiques journalières
  - Axe Y : Montants en Dinars Tunisiens
- **Tableau 2 — Répartition Régionale des Commandes (24 Gouvernorats)**:
  - Colonnes : `[Gouvernorat | Nombre de Commandes | Volume Total (TND) | Panier Moyen | Part COD % | Taux de Livraison Réussie]`
  - Données d'exemple :
    - `Tunis | 1,120 cmd | 86,240.000 TND | 77.000 TND | 79.5% | 94.2%`
    - `Sfax | 540 cmd | 41,580.000 TND | 77.000 TND | 84.1% | 91.8%`
    - `Sousse | 420 cmd | 31,920.000 TND | 76.000 TND | 81.0% | 93.5%`
- **Graphique 3 — Répartition des Moyens de Paiement**:
  - Catégories : Paiement à la livraison (COD), Cartes Bancaires (Gim-Tel), Flouci, Konnect, Mandat Minute

---

### [Page 3] Operational Notes & Sticky Reminders Board

- **Navigation Placement**: `Group 1: Pilotage & Télémétrie` > **Bloc-notes Opérationnels**
- **Primary Route**: `/admin-notes`
- **Breadcrumb Hierarchy**: `Administration > Pilotage > Notes & Rappels`
- **Layer 6 Archetype**: `Kanban Board of Operational Sticky Notes`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Pilotage > Notes & Rappels`
2. **Header Bar**: Title `Operational Notes & Sticky Reminders Board` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Kanban Board of Operational Sticky Notes.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 3. Operational Notes & Sticky Reminders Board
- **Route Path**: `/admin-notes`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Carnet de notes opérationnelles partagé, mémos de modération, suivi des dossiers sensibles et rappels internes entre administrateurs.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Outils Internes > Notes & Rappels`
- **Page Heading**: "Notes Administratives & Rappels Opérationnels"
- **Subtitle / Description**: "Espace collaboratif pour consigner les mémos d'audit, les consignes d'astreinte, les décisions exceptionnelles et les rappels d'arbitrage."

#### B. Control Bar & Filter Matrix
- **Champ de Recherche**: "Rechercher dans les notes et mémos..."
- **Filtre par Statut / Priorité**: `[Toutes les notes, Urgentes, Normales, Résolues / Archivées]`
- **Filtre par Auteur / Administrateur**: `[Tous les administrateurs, Admin Principal, Équipe Modération, Équipe Finance]`
- **Bouton d'Action Primaire**: `+ Rédiger une nouvelle note`

#### C. Data Collections & Grille de Mémos
- **Fiche Mémo (Structure unitaire)**:
  - Titre du mémo : e.g. "Contrôle renforcé des expéditions Aramex pour la boutique Artisanat Sud"
  - Auteur : "Superadmin (Amine B.)"
  - Horodatage : "Il y a 3 heures (06/09/2026 04:30)"
  - Niveau d'urgence : `Priorité Haute`
  - Contenu textuel : "Suite à un taux inhabituel de réclamations de non-réception sur le gouvernorat de Médenine, suspendre les demandes de virement de la boutique jusqu'à validation des bordereaux signés."
  - Tags sémantiques : `#Logistique #Aramex #Arbitrage #Retenue`
  - Boutons d'action unitaire : `Modifier`, `Marquer comme résolu`, `Épingler en haut`, `Supprimer`

#### D. Formulaire de Création / Édition de Note
- **Titre du formulaire**: "Créer une note administrative"
- **Champs**:
  - Titre de la note (Champ texte, obligatoire)
  - Priorité (Menu déroulant : `Basse, Moyenne, Haute, Critique`)
  - Destinataires / Visibilité (Menu déroulant : `Tous les administrateurs, Finance uniquement, Modération uniquement`)
  - Corps de la note (Zone de texte enrichie)
  - Boutons de validation : `Enregistrer la note`, `Annuler`

---

