# Superadmin Section 2: Merchants, Users & Buyers Management

> **Operational Objective**: Merchant accounts directory, internal platform users, registered buyers, and vendor management shortcuts.
> **Application Routes**: `/(admin)/sellers`, `/(admin)/users`, `/(admin)/customers`, `/(admin)/vendors`
> **Pages Covered in this Section**: Page 4, Page 5, Page 6, Page 31

---

## 1. Section Navigation & Menu Placement

| Page # | Menu Label | Sidebar Group | Route Path | Assigned Icon | Breadcrumb Trail |
|---|---|---|---|---|---|
| Page 4 | **Répertoire des Boutiques** | `Group 2: Commerces & Utilisateurs` | `/stores` | `Store` | `Administration > Commerces > Boutiques` |
| Page 5 | **Utilisateurs & Vendeurs** | `Group 2: Commerces & Utilisateurs` | `/users` | `Users` | `Administration > Commerces > Utilisateurs & Vendeurs` |
| Page 6 | **Répertoire des Acheteurs** | `Group 2: Commerces & Utilisateurs` | `/buyers` | `UserCheck` | `Administration > Commerces > Acheteurs` |
| Page 31 | **Accès Rapide Vendeurs (Alias)** | `Group 2: Commerces & Utilisateurs` | `/(admin)/vendors` | `ExternalLink` | `Administration > Commerces > Vendeurs (Filtre Direct)` |

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

### [Page 4] Stores & Merchant Accounts Management

- **Navigation Placement**: `Group 2: Commerces & Utilisateurs` > **Répertoire des Boutiques**
- **Primary Route**: `/stores`
- **Breadcrumb Hierarchy**: `Administration > Commerces > Boutiques`
- **Layer 6 Archetype**: `Data Table with Store Verification & GMV Filters`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Commerces > Boutiques`
2. **Header Bar**: Title `Stores & Merchant Accounts Management` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Data Table with Store Verification & GMV Filters.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 4. Stores & Merchant Accounts Management
- **Route Path**: `/stores`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Annuaire complet de supervision des boutiques créées, état de vérification légale, abonnements en cours, activation, suspension et gestion des demandes de changement de statut juridique.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Commerce & Vendeurs > Boutiques`
- **Page Heading**: "Gestion des Boutiques Marchandes"
- **Subtitle / Description**: "Supervisez le parc complet des boutiques de la place de marché, contrôlez les sous-domaines, vérifiez les abonnements et administrez les droits de vente."

#### B. Key Performance Indicators (KPIs)
- **Total Boutiques**: `1,420`
- **Boutiques Vérifiées (Badge Officiel)**: `842`
- **Non Vérifiées / En cours**: `498`
- **En Mode Maintenance**: `45`
- **Boutiques Suspendues**: `35`
- **Demandes de Changement de Statut Vendeur**: `12 en attente`
- **Dossiers KYC en attente**: `14`

#### C. Control Bar, Search & Filter Matrix
- **Champ de Recherche**: "Rechercher par nom de boutique, sous-domaine, email ou propriétaire..."
- **Filtre par Statut de Boutique**: `[Tous les statuts, Active / Vérifiée, Non vérifiée, En maintenance, Suspendue]`
- **Filtre par Type de Vendeur**: `[Tous, Artisan Indépendant, Commerçant Enregistré (RNE), Marque / Entreprise]`
- **Case à cocher d'alerte**: `Afficher uniquement les demandes de changement de statut juridique en attente`
- **Bouton de Bascule d'Affichage**: `Mode Compact (Table dense) / Mode Détaillé (Cartes enrichies)`

#### D. Data Collection — Tableau Principal des Boutiques
- **Nom du tableau**: "Répertoire Global des Boutiques Vendeurs"
- **En-têtes de colonnes**:
  1. `Boutique & Sous-domaine` (Nom commercial, URL `boutique.pandamarket.tn`, domaine personnalisé si configuré)
  2. `Propriétaire` (Nom du marchand, email de contact, téléphone tunisien)
  3. `Type de Vendeur` (Badge: Artisan / Commerçant / Société)
  4. `Plan d'Abonnement` (Badge: Gratuit, Starter, Regular, Pro, Agence, Gold, Platinum)
  5. `Statut & Vérification` (Badge: Vérifié, En attente, Suspendu)
  6. `Catalogue & Ventes` (Nombre de produits publiés, Nombre total de commandes, CA cumulé TND)
  7. `Date de Création` (Date d'inscription sur la plateforme)
  8. `Actions`
- **Actions par ligne**:
  - `Inspecter la boutique` (Lien direct vers la vitrine publique)
  - `Éditer les paramètres de la boutique`
  - `Attribuer / Forcer un plan d'abonnement`
  - `Changer le statut juridique (Approuver/Rejeter la demande)`
  - `Suspendre la boutique`
  - `Débloquer / Réactiver`
- **Pagination**: "Affichage de 1 à 12 sur 1,420 boutiques | Pages: 1, 2, 3 ... 119 | Boutons Précédent, Suivant"

#### E. Modales & Boîtes de Dialogue
- **Modale de Suspension de Boutique**:
  - Titre : "Suspendre la boutique [Nom]"
  - Avertissement : "Cette action désactivera immédiatement la vitrine publique et masquera tous les articles de la recherche."
  - Motif de suspension (Zone de texte obligatoire : e.g. Contrefaçon, Fraude bancaire, Non-respect des délais d'expédition)
  - Boutons : `Confirmer la suspension`, `Annuler`
- **Modale de Modification d'Abonnement**:
  - Titre : "Modifier le plan d'abonnement de la boutique [Nom]"
  - Sélecteur de plan : `[Free, Starter, Regular, Pro, Agency, Gold, Platinum]`
  - Type de facturation : `[Commission uniquement, Forfait mensuel, Forfait annuel]`
  - Date d'expiration de l'accès (Sélecteur de date)
  - Boutons : `Appliquer le surclassement`, `Annuler`

---

### [Page 5] Platform Users & Vendors Directory

- **Navigation Placement**: `Group 2: Commerces & Utilisateurs` > **Utilisateurs & Vendeurs**
- **Primary Route**: `/users`
- **Breadcrumb Hierarchy**: `Administration > Commerces > Utilisateurs & Vendeurs`
- **Layer 6 Archetype**: `Data Table with Role Permission Matrix`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Commerces > Utilisateurs & Vendeurs`
2. **Header Bar**: Title `Platform Users & Vendors Directory` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Data Table with Role Permission Matrix.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 5. Platform Users & Vendors Directory
- **Route Path**: `/users`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Annuaire centralisé de tous les comptes utilisateurs enregistrés sur PandaMarket (Vendeurs, Administrateurs, Modérateurs, Acheteurs rattachés), gestion des rôles de sécurité, statut d'activité et verrouillage.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Commerce & Vendeurs > Utilisateurs`
- **Page Heading**: "Annuaire des Utilisateurs & Vendeurs"
- **Subtitle / Description**: "Consultez, filtrez et administrez les profils utilisateurs enregistrés sur la plateforme PandaMarket."

#### B. Control Bar, Search & Filter Matrix
- **Champ de Recherche**: "Rechercher par nom, prénom, email, téléphone ou rôle..."
- **Filtre par Rôle**: `[Tous les rôles, Vendeur (Vendor), Superadmin, Administrateur, Modérateur Support]`
- **Filtre par Statut du Compte**: `[Tous, Actif, Verrouillé / Suspendu, En attente de vérification d'email]`
- **Filtre 2FA (Double Authentification)**: `[Tous, 2FA Activée, 2FA Désactivée]`
- **Bouton d'Action Primaire**: `+ Créer un compte administrateur`

#### C. Data Collection — Tableau des Utilisateurs
- **En-têtes de colonnes**:
  1. `Utilisateur` (Avatar/Initiales, Prénom, Nom, Date d'inscription)
  2. `Email & Contact` (Adresse email, Statut vérifié, Téléphone)
  3. `Rôle Système` (Badge: Superadmin, Admin, Vendor)
  4. `Boutique Associée` (Nom de la boutique ou mention "Aucune")
  5. `Dernière Connexion` (Horodatage précis et adresse IP)
  6. `Sécurité` (Badge 2FA active/inactive)
  7. `Statut` (Badge: Actif, Inactif, Suspendu)
  8. `Actions`
- **Actions par ligne**:
  - `Éditer le profil`
  - `Réinitialiser le mot de passe (Lien par email)`
  - `Promouvoir / Rétrograder le rôle`
  - `Suspendre le compte`
  - `Supprimer le compte`
- **Pagination**: "Page 1 sur 85 | 15 utilisateurs par page"

---

### [Page 6] Registered Buyers & Shoppers Directory

- **Navigation Placement**: `Group 2: Commerces & Utilisateurs` > **Répertoire des Acheteurs**
- **Primary Route**: `/buyers`
- **Breadcrumb Hierarchy**: `Administration > Commerces > Acheteurs`
- **Layer 6 Archetype**: `Data Table with Customer Lifetime Value & Order History`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Commerces > Acheteurs`
2. **Header Bar**: Title `Registered Buyers & Shoppers Directory` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Data Table with Customer Lifetime Value & Order History.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 6. Registered Buyers & Shoppers Directory
- **Route Path**: `/buyers`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Gestion des profils acheteurs, analyse de la valeur vie client (LTV), détection des acheteurs à taux de refus COD anormal et historique d'achats.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Commerce & Vendeurs > Répertoire des Acheteurs`
- **Page Heading**: "Annuaire des Acheteurs & Clients"
- **Subtitle / Description**: "Supervisez la base d'acheteurs de la marketplace, leur historique d'achat, leur taux de refus à la livraison et leur fidélité."

#### B. Key Performance Indicators (KPIs)
- **Total Acheteurs Enregistrés**: `18,920`
- **Acheteurs Actifs (30 derniers jours)**: `4,320`
- **Panier Moyen par Client**: `68.200 TND`
- **Clients à Risque COD Élevé (Refus répétés)**: `128`

#### C. Control Bar & Filter Matrix
- **Champ de Recherche**: "Rechercher un acheteur par nom, email, téléphone ou ville..."
- **Filtre par Gouvernorat**: `[Tous les 24 gouvernorats, Tunis, Sfax, Sousse, etc.]`
- **Filtre par Comportement d'Achat**: `[Tous, Acheteurs réguliers (>3 commandes), Nouveaux acheteurs, Taux de refus COD >20%]`
- **Bouton d'Action**: `Exporter la liste (CSV)`

#### D. Data Collection — Tableau des Acheteurs
- **En-têtes de colonnes**:
  1. `Client` (Nom, Prénom, Email, Date d'inscription)
  2. `Téléphone & Ville` (Numéro tunisien certifié, Gouvernorat principal de livraison)
  3. `Total Commandes` (Nombre de commandes passées avec succès)
  4. `Dépenses Cumulées` (Montant total en Dinars Tunisiens)
  5. `Taux de Succès COD` (Pourcentage de colis contre remboursement réceptionnés sans refus)
  6. `Dernière Commande` (Date de la dernière transaction)
  7. `Statut` (Badge: Fiable, Surveillé, Bloqué COD)
  8. `Actions`
- **Actions par ligne**:
  - `Voir la fiche client détaillée`
  - `Historique des commandes`
  - `Restreindre au paiement en ligne uniquement (Désactiver COD)`

---

### [Page 31] Vendors Navigation Shortcut (Direct Alias to Users)

- **Navigation Placement**: `Group 2: Commerces & Utilisateurs` > **Accès Rapide Vendeurs (Alias)**
- **Primary Route**: `/(admin)/vendors`
- **Breadcrumb Hierarchy**: `Administration > Commerces > Vendeurs (Filtre Direct)`
- **Layer 6 Archetype**: `Direct Redirection Handler to /users?role=vendor`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Administration > Commerces > Vendeurs (Filtre Direct)`
2. **Header Bar**: Title `Vendors Navigation Shortcut (Direct Alias to Users)` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Direct Redirection Handler to /users?role=vendor.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 31. Vendors Navigation Shortcut (Direct Alias to Users)
- **Route Path**: `/vendors`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Raccourci d'accès direct redirigeant vers l'annuaire des utilisateurs et marchands (`/users`), garantissant la compatibilité des signets et liens profonds.

#### A. Header & Traitement
- **Comportement**: Redirection automatique côté serveur vers `/users` avec filtre pré-sélectionné `role=vendor`.


---

## 3. PART 2: SELLER DASHBOARD & MERCHANT COCKPIT (PAGES 32 TO 71)

---

