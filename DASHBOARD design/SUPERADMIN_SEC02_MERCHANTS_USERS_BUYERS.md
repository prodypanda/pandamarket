# Superadmin Section 2: Merchants, Users & Buyers Management

> **Operational Objective**: Merchant accounts directory, internal platform users, registered buyers, and vendor management shortcuts.
> **Application Routes**: `/(admin)/sellers`, `/(admin)/users`, `/(admin)/customers`, `/(admin)/vendors`
> **Pages Covered in this Section**: Page 4, Page 5, Page 6, Page 31

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

### [Page 4] Stores & Merchant Accounts Management

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

### 31. Vendors Navigation Shortcut (Direct Alias to Users)
- **Route Path**: `/vendors`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Raccourci d'accès direct redirigeant vers l'annuaire des utilisateurs et marchands (`/users`), garantissant la compatibilité des signets et liens profonds.

#### A. Header & Traitement
- **Comportement**: Redirection automatique côté serveur vers `/users` avec filtre pré-sélectionné `role=vendor`.


---

## 3. PART 2: SELLER DASHBOARD & MERCHANT COCKPIT (PAGES 32 TO 71)

---

