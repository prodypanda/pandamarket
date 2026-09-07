# Superadmin Section 1: Overview, Analytics & Operational Notes

> **Operational Objective**: High-level platform executive telemetry, GMV metrics, business analytics, and quick admin operational notes.
> **Application Routes**: `/(admin)/analytics`, `/(admin)/dashboard`, `/(admin)/overview`
> **Pages Covered in this Section**: Page 1, Page 2, Page 3

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

### [Page 1] Superadmin Overview & Executive Telemetry

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

