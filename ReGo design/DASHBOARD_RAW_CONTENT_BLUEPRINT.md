# PandaMarket Dashboard Architecture: Complete Raw Content & Information Architecture Blueprint

> **Notice for ReGo / UI Prototyping & Template Engines**:
> This specification provides the **complete semantic raw content, information architecture, data schema, tables, forms, modals, action triggers, and copy** for both the **Superadmin Dashboard** and the **Seller Dashboard** across the entire PandaMarket platform.
>
> - **Strictly Raw Content Only**: Contains **NO visual styling** (no CSS, no hex colors, no Tailwind utility classes, no font size declarations) and **NO layout positioning** (no grid systems, no flex directions, no margin/padding values, no column spans).
> - **100% Exhaustive & Unabridged**: Covers all **71 pages and operational surfaces** without a single omission.
> - **Tunisian E-Commerce Localization**: Standardized on Dinars Tunisiens (TND, 3 decimal places: `0.000 TND`), 24 Governorates, national carrier matrix (Aramex, Rapid-Poste, Runex, First Delivery), Tunisian banking directory (RIB Modulo 97), and hybrid COD workflows.

---

## 1. Global Platform Constants & Semantic Data Dictionary

### A. Currency & Monetary Conventions
- **Currency Code**: `TND` (Dinar Tunisien)
- **Format**: 3 decimal places (millimes tunisiens), e.g. `128.500 TND`, `0.150 TND`.
- **Payment Modalities**:
  - `COD`: Cash on Delivery (Paiement contre remboursement en espèces à la livraison)
  - `Flouci`: Portefeuille digital tunisien & cartes nationales
  - `Konnect`: Passerelle de paiement en ligne tunisienne
  - `Postal Mandat`: Mandat Minute de La Poste Tunisienne
  - `Bank Transfer`: Virement bancaire interbancaire tunisien (BIAT, BNA, Attijari, STB, Amen Bank)

### B. Territorial Coverage (24 Tunisian Governorates)
1. Tunis, 2. Ariana, 3. Ben Arous, 4. Manouba, 5. Nabeul, 6. Zaghouan, 7. Bizerte, 8. Béja, 9. Jendouba, 10. Le Kef, 11. Siliana, 12. Sousse, 13. Monastir, 14. Mahdia, 15. Sfax, 16. Kairouan, 17. Kasserine, 18. Sidi Bouzid, 19. Gabès, 20. Médenine, 21. Tataouine, 22. Gafsa, 23. Tozeur, 24. Kébili.

### C. Major Carrier Network & SLAs
- **🔴 Aramex Tunisie**: National 24-48h, enlèvement à domicile, traçabilité AWB en temps réel.
- **🟡 Rapid-Poste (La Poste)**: National 24-72h, maillage de tous les bureaux de poste et distribution à domicile.
- **🚀 Runex Express**: Spécialiste Sfax, Sahel et Sud tunisien (24-48h).
- **⚡ First Delivery**: Délais express 12-24h Grand Tunis & principales agglomérations côtières.

---

## 2. PART 1: SUPERADMIN DASHBOARD (PAGES 1 TO 31)


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

### 11. Marketplace Global Products Moderation & Catalog
- **Route Path**: `/products`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Modération globale du catalogue, détection des contrefaçons, vérification des prix, contrôle des catégories et suspension d'articles non conformes.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Catalogue & Contenu > Produits de la Marketplace`
- **Page Heading**: "Modération & Catalogue Produits Global"
- **Subtitle / Description**: "Contrôlez l'ensemble des articles publiés par tous les vendeurs, modérez les fiches sensibles et filtrez par catégorie ou conformité."

#### B. Key Performance Indicators (KPIs)
- **Total Articles Publiés**: `42,850 produits`
- **Articles Mis en Avant (Featured / Boost)**: `1,240 articles`
- **Articles Signalés / En Révision**: `23 produits`
- **Articles Masqués / Suspendus**: `85 produits`

#### C. Control Bar, Search & Filter Matrix
- **Champ de Recherche**: "Rechercher par titre de produit, code SKU, boutique ou code-barres..."
- **Filtre par Catégorie Globale**: Menu déroulant hiérarchique des catégories
- **Filtre par Statut Produit**: `[Tous, Publié / Actif, Brouillon, Rupture de stock, Suspendu pour modération]`
- **Filtre par Fourchette de Prix**: Saisie Prix Min TND — Prix Max TND
- **Filtre par Boutique Vendeuse**: Sélecteur de boutique marchande
- **Boutons d'Action**: `Actions Groupées (Masquer, Réactiver, Exporter la sélection)`

#### D. Data Collection — Tableau de Modération des Produits
- **En-têtes de colonnes**:
  1. `Article & Vignette` (Photo produit, Titre complet, SKU, Variantes)
  2. `Boutique` (Nom du vendeur, Lien boutique)
  3. `Catégorie` (Arborescence de catégorie)
  4. `Prix & Stock` (Prix régulier TND, Prix promo TND, Quantité en stock disponible)
  5. `Visibilité & Statut` (Badge: En ligne, Épuisé, Modéré)
  6. `Signalements` (Compteur d'alertes clients)
  7. `Date d'Ajout` (Date de création de la fiche)
  8. `Actions`
- **Actions par ligne**:
  - `Voir la fiche sur la marketplace`
  - `Éditer / Corriger la catégorie`
  - `Suspendre le produit (Masque immédiatement de la recherche)`
  - `Mettre en avant sur la page d'accueil`
  - `Supprimer définitivement`

### 12. Global Category Tree Taxonomy & Commission Rates
- **Route Path**: `/marketplace-categories`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Administration de l'arborescence taxonomique complète de la marketplace, définition des taux de commission spécifiques par rayon et gestion des icônes/bannières.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Catalogue & Contenu > Catégories de la Marketplace`
- **Page Heading**: "Taxonomie des Catégories & Commissions"
- **Subtitle / Description**: "Structurez l'arbre des rayons de la place de marché, définissez les commissions par catégorie et configurez les visuels de navigation."

#### B. Control Bar & Action Triggers
- **Champ de Recherche**: "Filtrer l'arborescence des catégories..."
- **Bouton Primaire**: `+ Ajouter une Catégorie Racine`
- **Bouton Secondaire**: `Réorganiser l'Ordre d'Affichage (Glisser-Déposer)`

#### C. Data Collection — Arborescence des Catégories
- **Élément de Catégorie (Structure unitaire)**:
  - Icône et nom : e.g. "Mode & Maroquinerie Artisanale"
  - Slug d'URL : `mode-maroquinerie`
  - Taux de Commission appliqué : `8.0%`
  - Nombre de Sous-catégories rattachées : `6 sous-catégories`
  - Nombre d'Articles actifs : `4,210 produits`
  - État de Visibilité : `Affiché dans le MegaMenu et sur l'Accueil`
  - Boutons d'action : `+ Sous-catégorie`, `Éditer`, `Modifier Commission`, `Désactiver`, `Supprimer`

#### D. Formulaire de Création / Modification de Catégorie
- **Titre**: "Paramétrer une Catégorie"
- **Champs**:
  - Nom de la catégorie (Français, Arabe, Anglais)
  - Slug d'URL canonique (généré automatiquement ou personnalisé)
  - Catégorie parente (Menu déroulant : Aucune / Racine ou liste des catégories existantes)
  - Taux de Commission Plateforme personnalisé (Champ pourcentage : e.g. `7.5%`)
  - Description SEO & Méta-description
  - Icône de la catégorie (Sélecteur d'icône vectorielle)
  - Image bannière pour page rayon (Téléversement d'image)
  - Options de visibilité (Cases à cocher : `Afficher dans la barre de navigation`, `Mettre en vedette sur l'accueil`, `Autoriser les filtres par attributs`)
  - Boutons : `Enregistrer la catégorie`, `Annuler`

### 13. Platform Media Storage & CDN File Vault
- **Route Path**: `/platform-media`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Supervision du stockage cloud global, quota de bande passante CDN, audit des fichiers orphelins et gestion des bannières officielles de la plateforme.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Catalogue & Contenu > Médiathèque Plateforme`
- **Page Heading**: "Stockage Média & Gestionnaire CDN"
- **Subtitle / Description**: "Visualisez l'ensemble des fichiers téléversés sur le CDN de la plateforme, surveillez l'espace disque consommé et optimisez le cache."

#### B. Key Performance Indicators (KPIs)
- **Espace Disque Utilisé**: `184.5 GB / 500 GB (36.9%)`
- **Total Fichiers Hébergés**: `94,210 images & documents`
- **Bande Passante Mensuelle CDN**: `1.42 TB transférés`
- **Images Optimisées WebP / AVIF**: `99.2% converties`

#### C. Control Bar, Search & Filter Matrix
- **Champ de Recherche**: "Rechercher un fichier par nom, format ou URL..."
- **Filtre par Type de Fichier**: `[Tous, Images (JPG/PNG/WebP), Documents PDF, Bannières Marketplace, Logos Boutiques]`
- **Filtre par Date de Téléversement**: `[Tous les mois, Ce mois-ci, Dernier trimestre]`
- **Bouton d'Action**: `+ Téléverser un média système`, `Nettoyer les fichiers orphelins`

#### D. Data Collection — Grille / Tableau des Fichiers
- **En-têtes de colonnes (Vue tableau)**:
  1. `Aperçu` (Vignette miniature)
  2. `Nom du Fichier & Extension` (e.g. `banner-aid-el-fitr-2026.webp`)
  3. `Poids & Dimensions` (e.g. `245 KB — 1920x600 px`)
  4. `Propriétaire / Origine` (Système Marketplace ou ID Boutique)
  5. `Date de Création` (Horodatage de téléversement)
  6. `URL Publique CDN` (Bouton de copie rapide)
  7. `Actions` (`Télécharger`, `Remplacer`, `Purger du CDN`, `Supprimer`)

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

### 17. PandaAds Global Campaign Management & Placement Pricing
- **Route Path**: `/ads`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Supervision de la régie publicitaire PandaAds, gestion des tarifs par emplacement (Accueil, Tête de Rayon, Recherche), audit des budgets dépensés et modération des visuels sponsorisés.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Croissance & Monétisation > PandaAds Régie Pub`
- **Page Heading**: "Administration de la Régie Publicitaire PandaAds"
- **Subtitle / Description**: "Contrôlez les campagnes sponsorisées des vendeurs, fixez les prix des enchères CPC/CPM et modérez les créatifs publicitaires."

#### B. Key Performance Indicators (KPIs)
- **Revenu Publicitaire Cumulé**: `48,250.000 TND`
- **Campagnes Actives Simultanées**: `142 campagnes`
- **Impressions Publicitaires Servies (30j)**: `1,850,000 affichages`
- **Taux de Clic Moyen (CTR Global)**: `3.45%`
- **Coût Moyen par Clic (CPC)**: `0.180 TND`

#### C. Control Bar & Action Matrix
- **Filtres de Campagnes**: `[Toutes les campagnes, Actives, En attente de validation créative, Terminées, Suspendues]`
- **Champ de Recherche**: "Rechercher par nom de campagne, boutique ou produit sponsorisé..."
- **Bouton d'Action**: `Paramétrer les Tarifs des Emplacements Publicitaires`

#### D. Data Collection — Tableau des Campagnes Publicitaires
- **En-têtes de colonnes**:
  1. `Campagne & Créatif` (Vignette visuelle, Titre de l'annonce, Produit rattaché)
  2. `Boutique Annonceuse` (Nom du marchand, Solde publicitaire disponible)
  3. `Emplacement` (Bannière Accueil, Produit Sponsorisé en Recherche, Tête de Catégorie)
  4. `Modèle & Budget` (Budget Quotidien TND, Budget Total TND, Dépensé)
  5. `Performance` (Impressions, Clics, CTR %, Ventes générées en TND)
  6. `ROAS Moyen` (Retour sur dépense publicitaire: e.g. `4.8x`)
  7. `Statut` (Badge: En diffusion, En attente d'approbation, Épuisée)
  8. `Actions`
- **Actions par ligne**:
  - `Aperçu du créatif publicitaire`
  - `Approuver la diffusion`
  - `Mettre en pause la campagne`
  - `Rejeter pour non-conformité créative`

### 18. SaaS Subscription Orders & Invoicing
- **Route Path**: `/subscription-orders`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Registre des souscriptions aux abonnements SaaS PandaMarket, suivi des factures d'abonnement échues, renouvellements automatiques et archivage fiscal.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Croissance & Monétisation > Commandes d'Abonnement`
- **Page Heading**: "Facturation & Commandes d'Abonnement SaaS"
- **Subtitle / Description**: "Gérez l'ensemble des commandes de forfaits d'abonnement des marchands, suivez les encaissements récurrents et téléchargez les factures fiscales."

#### B. Key Performance Indicators (KPIs)
- **Revenu Récurrent Mensuel (MRR)**: `18,400.000 TND`
- **Revenu Récurrent Annuel (ARR)**: `220,800.000 TND`
- **Abonnements Payants Actifs**: `384 boutiques`
- **Factures Impayées / En Retard**: `12 commandes`

#### C. Control Bar & Filter Matrix
- **Filtre par Statut de Paiement**: `[Tous, Payée, En attente de règlement, Échouée / Rejetée, Remboursée]`
- **Filtre par Formule d'Abonnement**: `[Tous les plans, Starter, Regular, Pro, Agence, Gold, Platinum]`
- **Filtre par Mécanisme de Paiement**: `[Carte Bancaire, Flouci, Mandat Postal, Prélèvement sur Solde Vendeur]`
- **Champ de Recherche**: "Rechercher par numéro de facture, boutique ou email..."
- **Bouton d'Action**: `Exporter le Grand Livre des Abonnements (Excel / CSV)`

#### D. Data Collection — Tableau des Factures d'Abonnement
- **En-têtes de colonnes**:
  1. `N° Facture` (e.g. `INV-SUB-2026-00482`)
  2. `Boutique & Marchand` (Nom de la boutique, Email du gérant)
  3. `Plan & Période` (Plan Pro — Forfait Annuel 2026-2027)
  4. `Montant HT / TVA / TTC` (Montant en TND avec décomposition fiscale 19%)
  5. `Mode de Paiement` (Badge du moyen de règlement)
  6. `Date d'Émission & Échéance` (Dates légales)
  7. `Statut` (Badge: Réglée, En attente, En retard)
  8. `Actions`
- **Actions par ligne**:
  - `Télécharger la Facture Fiscale PDF`
  - `Renvoyer le reçu par email`
  - `Marquer manuellement comme payée`
  - `Annuler la commande d'abonnement`

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

### 20. SaaS Subscription Plans, Features & Tier Limits Management
- **Route Path**: `/plans`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Configuration de la grille tarifaire des abonnements marchands (Free, Starter, Pro, Agence, etc.), définition des quotas d'articles, taux de commission et fonctionnalités exclusives.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Croissance & Monétisation > Plans d'Abonnement`
- **Page Heading**: "Configuration des Plans & Quotas SaaS"
- **Subtitle / Description**: "Définissez la grille tarifaire, les fonctionnalités incluses, les limites de stockage, et les quotas de produits pour chaque formule d'abonnement."

#### B. Control Bar & Action Triggers
- **Bouton Primaire**: `+ Créer un Nouveau Plan d'Abonnement`
- **Bouton Secondaire**: `Enregistrer les Modifications de Grille`

#### C. Data Collection — Matrice des Plans Actuels
- **Plan 1 : Free / Gratuit**
  - Prix : `0 TND / mois`
  - Commission plateforme : `10% sur les ventes`
  - Quota de produits : `Max 15 articles`
  - Fonctionnalités : Sous-domaine pandamarket.tn, Support standard, Thème basique
- **Plan 2 : Starter**
  - Prix : `29.000 TND / mois` (ou `290.000 TND / an`)
  - Commission plateforme : `8% sur les ventes`
  - Quota de produits : `Max 50 articles`
  - Fonctionnalités : Domaine personnalisé inclus, Accès PandaAds, Support prioritaire
- **Plan 3 : Pro / Vendeur Pro**
  - Prix : `69.000 TND / mois` (ou `690.000 TND / an`)
  - Commission plateforme : `5% sur les ventes`
  - Quota de produits : `Catalogue Illimité`
  - Fonctionnalités : Thèmes premium, Assistant IA illimité, Outil de négociation COD automatique, Clés d'API & Webhooks
- **Plan 4 : Agence / Entreprise**
  - Prix : `149.000 TND / mois` (ou `1,490.000 TND / an`)
  - Commission plateforme : `3% sur les ventes`
  - Quota de produits : `Catalogue Illimité + Multi-boutiques (Jusqu'à 5 stores)`
  - Fonctionnalités : Gestionnaire de compte dédié, Accompagnement logistique, Rapports comptables automatisés

#### D. Formulaire d'Édition d'un Plan
- **Champs**:
  - Identifiant unique du plan (`plan_id`: free, starter, pro, etc.)
  - Nom public affiché (Français, Arabe, Anglais)
  - Description marketing du forfait
  - Tarif Mensuel (TND) et Tarif Annuel avec remise (TND)
  - Taux de commission par défaut (%)
  - Limite de produits autorisés (Nombre ou case `Illimité`)
  - Quota de jetons IA par mois (Tokens)
  - Matrice des permissions (Cases à cocher: Domaines personnalisés, Accès API, Messagerie directe, Export comptable, Thèmes custom)
  - Boutons : `Enregistrer le plan`, `Archiver le plan`

### 21. AI Usage Costs, Quotas & Token Consumption
- **Route Path**: `/ai-costs`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Tableau de bord de supervision des dépenses d'intelligence artificielle (Gemini API, génération de descriptions, retouche photo), audit de consommation des jetons par boutique et limitation des quotas.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Croissance & Monétisation > Coûts & Quotas IA`
- **Page Heading**: "Supervision des Dépenses & Consommation IA"
- **Subtitle / Description**: "Analysez l'utilisation des modèles d'intelligence artificielle par les marchands, suivez les coûts en temps réel et contrôlez les quotas d'appels API."

#### B. Key Performance Indicators (KPIs)
- **Jetons Consommés ce Mois**: `48,520,000 Tokens`
- **Coût Estimé Plateforme (USD / TND)**: `$84.20 (~265.000 TND)`
- **Nombre Total de Requêtes IA Exécutées**: `14,210 générations`
- **Boutique la Plus Consommatrice**: `Artisanat & Décoration Tunis (1.2M tokens)`
- **Taux d'Erreurs / Échecs d'Appel**: `0.12%`

#### C. Control Bar, Search & Filter Matrix
- **Sélecteur de Modèle d'IA**: `[Tous les modèles, Gemini 1.5 Flash, Gemini 1.5 Pro, Text Embeddings]`
- **Sélecteur de Type de Tâche**: `[Tous, Génération de fiche produit, Optimisation SEO, Traduction bilingue, Retouche d'image]`
- **Champ de Recherche**: "Rechercher par boutique, nom d'utilisateur ou ID de tâche..."
- **Bouton d'Action**: `Paramétrer les Quotas Quotidiens d'IA`

#### D. Data Collection — Tableau du Journal des Jobs IA
- **En-têtes de colonnes**:
  1. `ID Tâche` (Identifiant BullMQ)
  2. `Boutique & Demandeur` (Nom de la boutique, Email du gérant)
  3. `Type de Génération` (Description produit, Mots-clés SEO, Traduction arabe)
  4. `Modèle Employé` (e.g. `gemini-1.5-flash`)
  5. `Jetons Utilisés (Prompt / Output)` (e.g. `1,240 / 480 tokens`)
  6. `Durée d'Exécution` (e.g. `1.2s`)
  7. `Statut` (Badge: Complété, Échoué, En file d'attente)
  8. `Horodatage` (Date et seconde précise)
  9. `Actions` (`Inspecter le prompt et la réponse`, `Relancer le job`)

### 22. Administrator Security Audit Trail
- **Route Path**: `/audit-log`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Registre immuable d'audit de sécurité des actions administrateurs (modifications de configuration, approbations de KYC, sanctions, ajustements de solde) pour conformité et traçabilité interne.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Système & Journaux > Journal d'Audit Administrateurs`
- **Page Heading**: "Journal d'Audit des Administrateurs"
- **Subtitle / Description**: "Traçabilité intégrale et inaltérable de chaque action, modification de politique et intervention administrative effectuée sur la plateforme."

#### B. Control Bar, Search & Filter Matrix
- **Champ de Recherche**: "Filtrer les actions par mot-clé, cible ou adresse IP..."
- **Filtre par Type d'Action**: `[Toutes les actions, Connexion / Déconnexion, Approbation KYC, Modification Paramètres, Suspension Boutique, Déblocage Paiement]`
- **Filtre par Administrateur**: Sélecteur des comptes administrateurs
- **Bouton d'Action**: `Exporter le Registre d'Audit (CSV Signé)`

#### C. Data Collection — Tableau des Événements d'Audit Admin
- **En-têtes de colonnes**:
  1. `Horodatage` (Date, heure, minute, seconde précise UTC+1)
  2. `Administrateur` (Nom, Email, Rôle de sécurité)
  3. `Catégorie d'Action` (Sécurité, Finance, Modération, Configuration)
  4. `Événement Réalisé` (Description claire: e.g. "Approbation du KYC boutique #842")
  5. `Entité Cible` (ID et type de l'objet modifié)
  6. `Adresse IP & Machine` (IP source, User-Agent)
  7. `Détails & Diff` (Bouton pour inspecter les valeurs Avant / Après au format JSON)
- **Pagination**: "Affichage de 1 à 25 sur 8,420 événements | Navigation chronologique"

### 23. Merchant & Vendor Administrative Audit Trail
- **Route Path**: `/seller-audit-log`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Suivi des actions des vendeurs dans leurs espaces respectifs (création de produits, modifications de prix massives, ajouts de transporteurs, changements de RIB).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Système & Journaux > Journal des Vendeurs`
- **Page Heading**: "Journal d'Activité des Vendeurs"
- **Subtitle / Description**: "Consultez l'historique des opérations sensibles réalisées par les marchands au sein de leurs tableaux de bord respectifs."

#### B. Control Bar & Filter Matrix
- **Champ de Recherche**: "Rechercher par boutique, action ou identifiant..."
- **Filtre par Type d'Opération**: `[Toutes, Mise à jour de RIB bancaire, Changement de prix massif, Suppression de produits, Export de base clients, Modification DNS]`
- **Filtre par Période**: Sélecteur de date

#### C. Data Collection — Tableau d'Activité Marchande
- **En-têtes de colonnes**:
  1. `Date & Heure` (Horodatage précis)
  2. `Boutique Vendeuse` (Nom, ID Store)
  3. `Utilisateur Responsable` (Nom et rôle dans la boutique: Propriétaire / Collaborateur)
  4. `Action Opérée` (e.g. "Mise à jour du compte bancaire pour virement")
  5. `Gravité / Sensibilité` (Badge: Standard, Sensible, Critique)
  6. `Adresse IP` (IP de connexion du marchand)
  7. `Actions` (`Inspecter les détails`)

### 24. Buyer Account Actions & Order Audit Trail
- **Route Path**: `/buyer-audit-log`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Traçabilité des actions des acheteurs, connexions, réinitialisations de mot de passe, annulations de commande et changements d'adresses de livraison.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Système & Journaux > Journal des Acheteurs`
- **Page Heading**: "Journal d'Activité des Acheteurs"
- **Subtitle / Description**: "Surveillez les comportements des clients, les tentatives d'authentification et les modifications d'adresses."

#### B. Control Bar & Filter Matrix
- **Champ de Recherche**: "Rechercher par nom d'acheteur, email ou numéro de commande..."
- **Filtre par Action**: `[Connexion réussie, Échec de mot de passe, Commande passée, Commande annulée, Avis déposé]`

#### C. Data Collection — Tableau d'Activité Acheteur
- **En-têtes de colonnes**:
  1. `Date & Heure`
  2. `Acheteur` (Nom, Email)
  3. `Événement` (e.g. "Annulation de la commande #ORD-882194 avant expédition")
  4. `Adresse IP & Géolocalisation`
  5. `Détails`

### 25. Server Infrastructure, API Errors & Performance Logs
- **Route Path**: `/system-logs`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Supervision technique des journaux d'erreurs du serveur (Node.js / Next.js / Express / PostgreSQL), monitoring des exceptions non interceptées, latences de base de données et état de la mémoire.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Système & Journaux > Journaux Système`
- **Page Heading**: "Journaux Système & Erreurs Serveur"
- **Subtitle / Description**: "Console d'inspection technique des flux de logs de production, exceptions applicatives, erreurs 500 et alertes de performance."
- **Badges d'État**: `Node Runtime : Healthy`, `Base de Données PostgreSQL : Connectée (Latence 2ms)`, `Redis Cache : Actif`

#### B. Control Bar & Filter Matrix
- **Filtre par Niveau de Log**: `[Tous, ERROR (Erreurs critiques), WARN (Avertissements), INFO, DEBUG]`
- **Filtre par Service**: `[Tous les services, API Auth, Passerelles de Paiement, Moteur de Recherche, File BullMQ]`
- **Champ de Recherche**: "Filtrer dans la trace de pile (Stacktrace) ou message d'erreur..."
- **Boutons d'Action**: `Actualiser le flux en direct`, `Purger les anciens logs`, `Télécharger le fichier de log brut (.log)`

#### C. Data Collection — Console des Logs Système
- **En-têtes de colonnes**:
  1. `Niveau` (Badge: ERROR, WARN, INFO)
  2. `Horodatage` (Heure:Minute:Seconde:Milliseconde)
  3. `Service Source` (e.g. `PaymentsController`, `CarrierWebhookDispatcher`)
  4. `Message d'Erreur` (Extrait clair du message)
  5. `Route / Endpoint Concerne` (e.g. `POST /api/pd/orders/checkout`)
  6. `Code Statut HTTP` (e.g. `500 Internal Server Error`)
  7. `Actions` (`Déplier la trace complète d'erreur (Stacktrace)`)

### 26. Global Platform Configuration & Marketplace Settings
- **Route Path**: `/settings`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Moteur de configuration central de la place de marché PandaMarket : identité commerciale, logos clair/sombre, coordonnées légales, politique fiscale tunisienne, paramètres d'affichage de la page d'accueil, mégamenu, réseaux sociaux et sécurité.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Paramètres de la Plateforme`
- **Page Heading**: "Paramètres Globaux de la Marketplace"
- **Subtitle / Description**: "Configurez l'identité légale de PandaMarket, les visuels de marque, les bannières d'accueil, le mégamenu, les réseaux sociaux et les intégrations globales."

#### B. Navigation par Onglets Sémantiques
- Onglet 1 : `Identité & Marque (Brand)`
- Onglet 2 : `Page d'Accueil & Mégamenu (Homepage & Hub)`
- Onglet 3 : `Bannières & Hero Carousel`
- Onglet 4 : `Cartes Produits & Recherche (Catalog Engine)`
- Onglet 5 : `Réseaux Sociaux & Liens Légaux`
- Onglet 6 : `Télémétrie & Outils d'Analyse (GA4, GTM, Pixels)`
- Onglet 7 : `Politique Financière & Commissions`
- Onglet 8 : `Sécurité & Accès Plateforme`

#### C. Spécification Détaillée des Formulaires (Par Onglet)

##### Onglet 1 : Identité & Marque
- Nom commercial de la marketplace (Champ texte : `PandaMarket`)
- Pays d'immatriculation (Menu déroulant : `Tunisie`)
- Horaires d'ouverture / Service client (Champ texte : `Lundi - Samedi : 08:30 - 18:30`)
- Téléversement du Logo Principal (Fichier image)
- Téléversement du Logo pour Thème Clair (Fichier image)
- Téléversement du Logo pour Thème Sombre (Fichier image)
- Favicon du site (Fichier .ico / .png)

##### Onglet 2 : Page d'Accueil & Mégamenu
- Disposition générale de la page d'accueil (Sélecteur : `Défaut du thème, Classique e-commerce, Deal du moment, Grille premium, Style Alibaba, Style Amazon`)
- Style de défilement / pagination des produits (Sélecteur : `Défilement infini, Bouton Charger plus, Pagination numérotée`)
- Style d'affichage du Mégamenu (Sélecteur : `Standard simple, Visuel riche, Ultra-riche avec visuels de marques, Ultra-riche multi-niveaux`)
- Chargement différé du mégamenu (Interrupteur Oui/Non)
- Style de la page catégorie rayon (Sélecteur : `Version 1 Classique, Version 2 Vitrine Moderne`)

##### Onglet 3 : Bannières & Hero Carousel
- Titre principal de la bannière héro (Champ texte)
- Sous-titre promotionnel de la bannière héro (Champ texte)
- Libellé du bouton d'action CTA (Champ texte : `Découvrir les offres`)
- URL de destination du CTA (Champ URL : `/hub/category/promotions`)
- Image de la bannière héro (Téléversement d'image ou URL)
- Affichage de la barre latérale des catégories à côté du carousel (Interrupteur Oui/Non)
- Affichage du rail latéral des vendeurs certifiés (Interrupteur Oui/Non)
- Lecture automatique du carousel (Interrupteur Oui/Non, Intervalle en secondes)

##### Onglet 4 : Cartes Produits & Recherche
- Afficher les étoiles d'avis clients sur les vignettes de produit (Interrupteur Oui/Non)
- Afficher le bouton d'ajout rapide au panier (Sélecteur : `Masqué, Icône seule, Bouton compact, Bouton complet avec quantité`)
- Afficher le nom de la boutique vendeuse sur la vignette (Interrupteur Oui/Non)
- Afficher le badge officiel "Boutique Vérifiée" (Interrupteur Oui/Non)
- Nombre de colonnes de la grille de recherche (Menu déroulant : `3, 4, 5 colonnes`)
- Nombre de produits par page de recherche (Menu déroulant : `12, 24, 48 articles`)
- Activer les emplacements de produits sponsorisés PandaAds dans les résultats de recherche (Interrupteur Oui/Non)
- Nombre d'articles sponsorisés injectés par page (Menu déroulant : `2, 4, 6 slots`)

##### Onglet 5 : Réseaux Sociaux & Liens Légaux
- URLs officielles : Facebook, Instagram, X (Twitter), TikTok, YouTube, LinkedIn, WhatsApp Support, Telegram, Pinterest, Snapchat
- URLs des pages légales : Conditions Générales d'Utilisation (CGU), Politique de Confidentialité (RGPD/INPDP), Politique de Remboursement, Politique de Cookies, Centre d'Aide, Formulaire de Contact

##### Onglet 6 : Télémétrie & Outils d'Analyse
- Intégration Google Analytics 4 (Interrupteur Oui/Non, Identifiant de mesure `G-XXXXXXXXXX`)
- Intégration Google Tag Manager (Interrupteur Oui/Non, Identifiant de conteneur `GTM-XXXXXXX`)
- Intégration Méta Pixel Facebook global (Identifiant Pixel)
- Intégration TikTok Pixel global (Identifiant Pixel)

##### Onglet 7 : Politique Financière & Commissions
- Taux de commission plateforme par défaut (Champ pourcentage : e.g. `8.0%`)
- Seuil minimum de demande de virement vendeur (Champ montant : e.g. `50.000 TND`)
- Fréquence des virements programmés (Sélecteur : `À la demande, Hebdomadaire (Chaque Lundi), Bimensuel (Le 1er et le 15)`)

#### D. Boutons d'Action Globaux
- `Enregistrer l'ensemble des paramètres de la plateforme` (Bouton persistant de validation)
- `Réinitialiser aux valeurs d'usine`

### 27. SMTP Transactional Mail Server & Test Dispatch
- **Route Path**: `/smtp-config`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Configuration des serveurs de messagerie transactionnelle (envoi des confirmations de commande, notifications de livraison, alertes de connexion, réinitialisation de mot de passe) et simulateur de test d'envoi.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Paramètres > Configuration Serveur SMTP`
- **Page Heading**: "Serveur de Messagerie Transactionnelle (SMTP)"
- **Subtitle / Description**: "Configurez les paramètres d'envoi des emails système, testez la délivrabilité et supervisez le statut de connexion SMTP."
- **Badges d'État**: `État de Connexion : Connecté`, `Chiffrement : TLS Actif`

#### B. Formulaire de Configuration du Serveur SMTP
- Nom d'hôte du serveur SMTP (Champ texte : e.g. `smtp.mailgun.org` ou `mail.pandamarket.tn`)
- Port du serveur SMTP (Menu déroulant / Champ numérique : `587 (TLS standard)`, `465 (SSL)`, `25`)
- Protocole de sécurité (Sélecteur : `STARTTLS, SSL/TLS, Aucun`)
- Nom d'utilisateur SMTP / Identifiant d'authentification (Champ texte)
- Mot de passe SMTP (Champ mot de passe avec bouton œil pour afficher/masquer)
- Nom de l'expéditeur officiel (Champ texte : `PandaMarket Tunisie`)
- Adresse email de l'expéditeur officiel (Champ email : `notifications@pandamarket.tn`)
- Adresse email de réponse (Reply-To) (Champ email : `support@pandamarket.tn`)
- Boutons : `Enregistrer la configuration SMTP`, `Rétablir les valeurs par défaut`

#### C. Outil de Test & Diagnostic de Délivrabilité en Direct
- Champ de saisie : "Adresse email de destination du test" (e.g. `admin@prodypanda.com`)
- Sélecteur de gabarit d'email à tester : `[Notification de commande passée, Réinitialisation de mot de passe, Notification de virement exécuté]`
- Bouton d'Action : `Envoyer un email de test immédiat`
- Console de retour en direct : Affiche le log de négociation SMTP (Handshake, Code de retour `250 OK`, Durée de transmission en millisecondes)

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

### 29. CMS Articles, Legal Policies & Blog Posts Directory
- **Route Path**: `/cms`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Gestionnaire de contenu éditorial, publication des politiques légales, articles de blog, guides vendeurs et actualités de la marketplace.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Contenu CMS > Articles & Politiques`
- **Page Heading**: "Gestionnaire de Contenu CMS"
- **Subtitle / Description**: "Rédigez, mettez à jour et publiez les pages d'information, les chartes légales, les guides pratiques et les annonces officielles."

#### B. Control Bar & Action Triggers
- **Champ de Recherche**: "Rechercher un article par titre, slug ou catégorie..."
- **Filtre par Catégorie CMS**: `[Tous, Politiques Légales (CGU/Confidentialité), Guides Vendeurs, Blog & Actualités, FAQ]`
- **Filtre par Statut de Publication**: `[Tous, Publié, Brouillon, Archivé]`
- **Bouton Primaire**: `+ Rédiger un Nouvel Article`

#### C. Data Collection — Tableau des Articles CMS
- **En-têtes de colonnes**:
  1. `Titre de l'Article` (Titre public, Slug d'URL: e.g. `/hub/pages/cgu`)
  2. `Catégorie` (Badge thématique)
  3. `Langues Disponibles` (Drapeaux / Badges: FR, AR, EN)
  4. `Auteur` (Nom du rédacteur administrateur)
  5. `Dernière Modification` (Horodatage de la révision)
  6. `Statut` (Badge: Publié en ligne, Brouillon)
  7. `Actions` (`Éditer le contenu`, `Prévisualiser la page publique`, `Archiver`, `Supprimer`)

### 30. CMS Article Editor, Markdown Preview & SEO Publishing
- **Route Path**: `/cms/[id]`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Éditeur de contenu riche Markdown et WYSIWYG pour rédiger les textes légaux et pages informatives, configuration des métadonnées de référencement (SEO).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Contenu CMS > Éditer l'Article #[id]`
- **Page Heading**: "Édition de Contenu : [Titre de l'Article]"
- **Subtitle / Description**: "Modifiez le corps de l'article, personnalisez le balisage sémantique et réglez les paramètres de publication."

#### B. Formulaire d'Édition de l'Article CMS
- Titre principal de l'article (Champ texte dans chaque langue: FR, AR, EN)
- Slug d'URL canonique (e.g. `conditions-generales-de-vente`)
- Catégorie de classement (Menu déroulant : Mentions Légales, Guide Marchand, etc.)
- Zone de Rédaction du Contenu (Éditeur bi-mode : Saisie texte / Markdown enrichi + Volet de prévisualisation en direct avec rendu typographique)
- Paramètres de Référencement (SEO) :
  - Balise Titre SEO (`<title>`)
  - Balise Méta-Description
  - Image de partage sur les réseaux sociaux (OpenGraph Image)
  - Balise Canonique personnalisée
- État de publication (Menu déroulant : `Brouillon privé, Publié publiquement, Protégé par mot de passe`)
- Boutons d'Action : `Enregistrer les modifications`, `Prévisualiser dans un nouvel onglet`, `Revenir à la liste`

### 31. Vendors Navigation Shortcut (Direct Alias to Users)
- **Route Path**: `/vendors`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Raccourci d'accès direct redirigeant vers l'annuaire des utilisateurs et marchands (`/users`), garantissant la compatibilité des signets et liens profonds.

#### A. Header & Traitement
- **Comportement**: Redirection automatique côté serveur vers `/users` avec filtre pré-sélectionné `role=vendor`.


---

## 3. PART 2: SELLER DASHBOARD & MERCHANT COCKPIT (PAGES 32 TO 71)


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

### 35. PandaAds Center: Campaign Creator, Budgeting & ROAS vs Net Margin
- **Route Path**: `/hub/dashboard/ads`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Gestion des campagnes publicitaires sponsorisées pour booster les produits sur la marketplace, calcul de la Marge Nette Marchand à côté du ROAS, assistant de création de campagne en 4 étapes et prévisualisation créative responsive.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Centre Publicitaire PandaAds`
- **Page Heading**: "Centre Publicitaire PandaAds"
- **Subtitle / Description**: "Boostez la visibilité de vos produits phares sur les emplacements stratégiques de PandaMarket et maximisez votre retour sur investissement net."
- **Badges**: `Sponsorisation Vendeur`, `Budget Publicitaire Disponible`

#### B. Key Performance Indicators (KPIs)
- **Solde Publicitaire Disponible**: `85.000 TND`
- **Fonds Publicitaires Réservés (Campagnes en cours)**: `40.000 TND`
- **Dépenses Publicitaires Cumulées**: `640.000 TND`
- **Campagnes Actives Simultanément**: `3 campagnes en diffusion`
- **Retour sur Investissement Publicitaire (ROAS Global)**: `4.85x`
- **Marge Nette Marchand Estimée**: `~64.2%` (Marge réelle après coût publicitaire déduit)
- **Alerte Solde Bas (Si < 5 TND)**: "Solde publicitaire bas : Rechargez votre compte pour éviter l'interruption de vos diffusions."

#### C. Control Bar, Filters & Action Matrix
- **Filtres Temporels**: `[Aujourd'hui, 7 jours, 30 jours, 90 jours]`
- **Champ de Recherche**: "Rechercher une campagne ou un article sponsorisé..."
- **Bouton Primaire 1**: `+ Créer une Nouvelle Campagne (Wizard)`
- **Bouton Primaire 2**: `Recharger mon Solde Publicitaire (Mandat / Carte / Solde Portefeuille)`

#### D. Data Collection — Tableau des Campagnes Publicitaires du Vendeur
- **En-têtes de colonnes**:
  1. `Campagne & Produit` (Vignette de l'article, Nom de la campagne)
  2. `Emplacement` (Bannière Accueil, Produit Sponsorisé en Recherche, Tête de Catégorie)
  3. `Budget Quotidien / Total` (e.g. `10.000 TND / jour · Total 50.000 TND`)
  4. `Dépensé` (Montant consommé à ce jour)
  5. `Portée & Engagement` (Impressions délivrées, Clics, Taux de clic CTR %)
  6. `Ventes Induites & Revenu` (Nombre de commandes générées, Chiffre d'affaires en TND)
  7. `ROAS & Marge Nette` (e.g. `ROAS 5.2x · Marge Nette Estimée 68%`)
  8. `Statut` (Badge: En diffusion, En pause, Épuisée, En attente)
  9. `Actions` (`Mettre en pause / Réactiver`, `Ajuster le budget`, `Prévisualiser l'annonce`, `Supprimer`)

#### E. Assistant de Création de Campagne (AdsCampaignWizard)
- **Étape 1 : Sélection du Produit à Promouvoir**
  - Choix de l'article dans le catalogue du marchand (Recherche par titre ou sélection rapide des meilleures ventes)
- **Étape 2 : Choix de l'Emplacement Publicitaire**
  - Options : `Résultats de Recherche Sponsorisés (CPC moyen 0.150 TND)`, `Bannière Carrousel Accueil (CPM)`, `Tête de Rayon Catégorie (CPC moyen 0.120 TND)`
- **Étape 3 : Budget & Calendrier**
  - Budget quotidien (Montant en TND : minimum 5 TND/jour)
  - Date de début et date de fin (ou diffusion continue)
  - Enchère au clic maximale (Auto-optimisée ou manuelle)
- **Étape 4 : Prévisualisation Créative & Validation (AdsCreativePreview)**
  - Aperçu instantané du badge "Sponsorisé" sur la vignette du produit
  - Récapitulatif du budget et projection des clics estimés
  - Boutons : `Lancer la campagne publicitaire`, `Enregistrer comme brouillon`, `Annuler`

### 36. Product Catalog, Inventory Adjuster & Variant Matrix
- **Route Path**: `/hub/dashboard/products`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Gestion complète du catalogue d'articles, création et modification de produits, matrice des déclinaisons (tailles, pointures, coloris), ajustement de stock en 1-clic et suppression sécurisée sans boîtes de dialogue natives.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Catalogue Produits`
- **Page Heading**: "Catalogue Produits & Gestion des Stocks"
- **Subtitle / Description**: "Gérez l'ensemble de vos références, ajustez vos prix et niveaux de stock en temps réel et suivez les alertes de réapprovisionnement."
- **Badges**: `Mode Bento Disponible`, `Boutique Active`

#### B. Key Performance Indicators (KPIs)
- **Total Produits au Catalogue**: `148 références`
- **Articles Actifs en Ligne**: `132 produits`
- **Articles en Rupture de Stock**: `5 références`
- **Articles sous le Seuil d'Alerte**: `11 références`
- **Valeur Totale du Stock Marchand**: `38,420.000 TND`

#### C. Control Bar, Search & Filter Matrix
- **Champ de Recherche**: "Rechercher un produit par titre, référence SKU, code-barres..."
- **Filtre par Catégorie de la Boutique**: Menu déroulant des catégories du vendeur
- **Filtre par État de Stock**: `[Tous les stocks, En stock (>10), Stock faible (<5), En rupture (0)]`
- **Filtre par Statut de Publication**: `[Tous les statuts, Publié en ligne, Brouillon masqué, Archivé]`
- **Bouton Primaire**: `+ Nouveau Produit`
- **Bouton Secondaire**: `Actions Groupées (Modifier prix, Changer statut, Exporter CSV)`
- **Bouton Rapide de Sponsoring**: `Booster un produit avec 10 TND (Raccourci 1-clic)`

#### D. Data Collection — Tableau Principal des Produits
- **En-têtes de colonnes**:
  1. `Produit & Image` (Vignette photo principale, Titre, Référence SKU, Variantes)
  2. `Catégorie` (Nom de la catégorie rattachée)
  3. `Prix Public (TND)` (Prix régulier et prix promotionnel barré)
  4. `Niveau de Stock` (Quantité numérique avec badge: Vert si >10, Jaune si 1-5, Rouge si 0)
  5. `Ventes Réalisées` (Nombre d'unités vendues à ce jour)
  6. `Visibilité` (Interrupteur Actif / Masqué en direct)
  7. `Actions`
- **Actions par ligne**:
  - `Éditer la fiche produit complète`
  - `Ajuster le stock en 1-clic (Ouvre la modale d'ajustement rapide)`
  - `Booster avec PandaAds (Pré-sélectionne l'article)`
  - `Dupliquer le produit`
  - `Supprimer le produit (Ouvre la modale ConfirmDialog accessible)`
- **Pagination**: "Affichage de 1 à 15 sur 148 produits | Pages: 1, 2, 3 ... 10"

#### E. Formulaire d'Ajout / Édition de Produit (Tiroir / Page Dédiée)
- **Section 1 : Informations Générales**
  - Titre du produit (Champ texte, multi-langues FR/AR)
  - Description détaillée (Éditeur de texte enrichi avec mise en forme, puces, caractéristiques)
  - Catégorie de la marketplace (Menu déroulant de taxonomie)
  - Catégorie interne de la boutique
- **Section 2 : Médias & Visuels**
  - Galerie de photos (Zone de glisser-déposer pour images haute définition, réorganisation de la photo principale, recadrage automatique)
- **Section 3 : Tarification & Fiscalité**
  - Prix de vente régulier (TND, format 3 décimales : e.g. `85.000 TND`)
  - Prix promotionnel barré (TND, optionnel : e.g. `69.000 TND`)
  - Coût d'achat / Prix de revient (TND, privé au marchand, pour calcul automatique de marge)
- **Section 4 : Gestion des Stocks & Références**
  - Code SKU unique
  - Code-barres / EAN (optionnel)
  - Quantité en stock disponible (Champ entier)
  - Seuil d'alerte de stock critique (e.g. `5 unités`)
  - Continuer à vendre en cas de rupture de stock (Case à cocher Oui/Non)
- **Section 5 : Matrice des Variantes & Déclinaisons**
  - Options de déclinaison : Taille (S, M, L, XL), Pointure (38, 39, 40, 41, 42), Couleur, Matière
  - Tableau des combinaisons : Stock et surcoût de prix par variante
- **Section 6 : Expédition & Poids**
  - Poids estimé de l'article en kilogrammes (pour calcul automatique des tarifs transporteurs)
  - Dimensions du colis (Longueur, Largeur, Hauteur en cm)
- **Boutons d'Action**: `Publier le produit en ligne`, `Enregistrer comme brouillon`, `Annuler`

#### F. Modales Spécifiques
- **Modale d'Ajustement Rapide de Stock**:
  - Titre : "Mise à jour rapide du stock : [Titre du Produit]"
  - Stock actuel : `8 unités`
  - Nouveau stock disponible (Champ numérique avec boutons `+` et `-`)
  - Motif de l'ajustement : `[Nouvel arrivage fournisseur, Inventaire de régularisation, Retour client, Produit endommagé]`
  - Boutons : `Valider le nouveau stock`, `Annuler`
- **Modale de Confirmation de Suppression (ConfirmDialog)**:
  - Titre : "Supprimer définitivement le produit ?"
  - Message : "Êtes-vous certain de vouloir supprimer [Titre du Produit] ? Cette action est irréversible et retirera immédiatement l'article de tous les paniers en cours."
  - Boutons : `Confirmer la suppression (Action destructive)`, `Conserver le produit`

### 37. Store Product Categories & Custom Collections
- **Route Path**: `/hub/dashboard/categories`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Organisation du catalogue propre à la boutique en collections personnalisées, rayons thématiques et vitrines saisonnières.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Catégories de la Boutique`
- **Page Heading**: "Catégories & Collections de la Boutique"
- **Subtitle / Description**: "Structurez l'arborescence interne de votre boutique pour faciliter la navigation de vos acheteurs."

#### B. Control Bar & Action Triggers
- **Champ de Recherche**: "Rechercher une catégorie..."
- **Bouton Primaire**: `+ Créer une Nouvelle Catégorie`

#### C. Data Collection — Tableau des Catégories de la Boutique
- **En-têtes de colonnes**:
  1. `Nom de la Catégorie` (Nom, Vignette visuelle, Slug d'accès vitrine)
  2. `Catégorie Parente` (Rayon racine ou sous-catégorie)
  3. `Nombre de Produits Rattachés` (Compteur d'articles)
  4. `Affichage dans le Menu` (Badge: Présent dans le menu de navigation)
  5. `Ordre d'Affichage` (Numéro de classement)
  6. `Actions` (`Éditer`, `Ajouter des produits`, `Supprimer`)

### 38. Followers, VIP Subscribers, Private Discount Coupons & Loyalty Points
- **Route Path**: `/hub/dashboard/loyalty` (Accessible aussi via `/dashboard/loyalty`)
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Programme de fidélité et marketing direct, gestion des abonnés à la boutique, diffusion de coupons de réduction privés par notification/email et barème de points de fidélité.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Abonnés & Fidélité`
- **Page Heading**: "Abonnés, Coupons Privés & Fidélité"
- **Subtitle / Description**: "Fidélisez vos acheteurs, envoyez des codes promotionnels exclusifs à vos abonnés et analysez la provenance de votre audience tunisienne."

#### B. Key Performance Indicators (KPIs)
- **Total Abonnés à la Boutique**: `1,280 abonnés`
- **Nouveaux Abonnés ce Mois**: `+142 abonnés`
- **Coupons Promotionnels Actifs**: `3 codes en cours`
- **Chiffre d'Affaires Généré par les Codes Promo**: `3,420.000 TND`

#### C. Modules & Sections de Contenu
- **Section 1 : Diffusion Privée de Coupons (Campagne Flash)**:
  - Formulaire de création de coupon :
    - Code promotionnel (e.g. `FIDELITE10` ou `AID2026`)
    - Type de remise : `[Pourcentage (e.g. 10%), Montant Fixe (e.g. 15 TND), Livraison Gratuite]`
    - Montant minimum de commande (e.g. `50.000 TND`)
    - Date d'expiration
    - Destinataires : `[Tous les abonnés, Clients ayant commandé plus de 2 fois, Nouveaux abonnés de la semaine]`
    - Bouton : `Diffuser le coupon aux abonnés par notification`
- **Section 2 : Tableau des Codes Promotionnels Actifs**:
  - Colonnes : `[Code | Type de Remise | Utilisations / Limite | Chiffre d'Affaires Généré | Expiration | Statut | Actions]`
- **Section 3 : Répartition Géographique des Abonnés (Carte / Tableau des Gouvernorats)**:
  - Classement des gouvernorats des abonnés : Tunis (35%), Sfax (20%), Sousse (15%), Nabeul (12%), Bizerte (8%), Autres (10%)

### 39. Store Media Library, Product Image Vault & Asset Uploader
- **Route Path**: `/hub/dashboard/media`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Médiathèque dédiée du vendeur, téléversement de photos de produits en haute définition, bannières publicitaires et logos, organisation par dossiers et compression automatique.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Médiathèque`
- **Page Heading**: "Médiathèque de la Boutique"
- **Subtitle / Description**: "Stockez, classez et réutilisez l'ensemble de vos photos de produits, bannières promotionnelles et logos."
- **Indicateur de Quota de Stockage**: `145 MB utilisés sur 2,000 MB (7.2%)`

#### B. Control Bar & Action Triggers
- **Champ de Recherche**: "Rechercher un média par nom..."
- **Filtres**: `[Toutes les images, Photos de produits, Bannières de boutique, Logos]`
- **Bouton Primaire**: `+ Téléverser des Fichiers (Glisser-Déposer multiple)`
- **Bouton Secondaire**: `Nouveau Dossier`

#### C. Data Collection — Grille Visuelle des Médias
- **Élément Média (Structure unitaire)**:
  - Vignette miniature carrée
  - Nom du fichier : `robe-soie-face.webp`
  - Dimensions et poids : `1200x1200 px · 185 KB`
  - Date d'ajout : `02/09/2026`
  - Boutons d'action : `Copier l'URL publique`, `Associer à un produit`, `Télécharger`, `Supprimer`

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

### 44. Online Storefront Hub & Domain Health Monitor
- **Route Path**: `/hub/dashboard/online-store`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Tableau de bord de pilotage de la vitrine en ligne, état du nom de domaine et du certificat SSL, thème actif et accès rapide aux outils de personnalisation visuelle.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Boutique en Ligne`
- **Page Heading**: "Boutique en Ligne & Vitrine Publique"
- **Subtitle / Description**: "Supervisez votre présence sur le web, personnalisez le design de votre boutique et vérifiez l'état technique de votre vitrine."
- **Badges**: `Boutique En Ligne`, `Certificat SSL HTTPS Actif`

#### B. Modules de Pilotage de la Vitrine
- **Module 1 — Carte d'Identité de la Vitrine Publique**:
  - Adresse officielle : `https://ma-boutique.pandamarket.tn` (Lien d'ouverture directe)
  - Domaine personnalisé : `https://www.maboutique.tn` (Statut : `Connecté & Sécurisé`)
  - Bouton : `Tester la vitrine sur mobile`
- **Module 2 — Thème Actif & Personnalisation**:
  - Thème actuellement déployé : `Artisanat Prestige v2.4`
  - Dernière modification : `01/09/2026 par le gérant`
  - Boutons d'action : `Personnaliser le thème`, `Changer de thème dans la galerie`
- **Module 3 — Raccourcis de Gestion de la Vitrine**:
  - `Constructeur de Pages (Landing Pages)` (Lien vers `/page-builder`)
  - `Menus & Navigation` (Lien vers `/navigation`)
  - `Domaines & DNS` (Lien vers `/domains`)
  - `Référencement SEO & Méta-tags` (Lien vers `/seo`)
  - `Intégrations Transporteurs & Pixels` (Lien vers `/integrations`)

### 45. Storefront Themes Gallery & Viewport Previews
- **Route Path**: `/hub/dashboard/online-store/themes`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Galerie des thèmes graphiques disponibles pour la boutique marchande, prévisualisation responsive multi-appareils (Desktop, Tablette, Mobile) et activation en 1-clic.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Boutique en Ligne > Thèmes`
- **Page Heading**: "Galerie des Thèmes de Boutique"
- **Subtitle / Description**: "Choisissez l'apparence idéale pour votre boutique parmi nos thèmes conçus pour le commerce en ligne tunisien et prévisualisez le rendu sur tous les écrans."

#### B. Thème Actuel Déployé (En-tête de page)
- Nom du thème : `Artisanat Prestige (Thème Actif)`
- Prévisualisation interactive en direct avec sélecteur d'appareil :
  - Bouton `Ordinateur de Bureau (Desktop)`
  - Bouton `Tablette (Portrait/Paysage)`
  - Bouton `Smartphone (Mobile)`
- Boutons d'action : `Personnaliser ce thème`, `Publier une mise à jour`

#### C. Galerie des Autres Thèmes Disponibles
- **Thème 1 : Modern Minimalist (Spécial Mode & Bijouterie)**:
  - Caractéristiques : Grille épurée, focus sur la photographie produit, typographie moderne
  - Boutons : `Prévisualiser avec mes produits`, `Activer ce thème`
- **Thème 2 : Souk Traditionnel (Spécial Produits du Terroir & Décoration)**:
  - Caractéristiques : Tons chauds terracotta, mise en avant des origines régionales tunisiennes, avis clients en vedette
  - Boutons : `Prévisualiser`, `Activer ce thème`
- **Thème 3 : Tech & High-Tech Store (Spécial Électronique & Accessoires)**:
  - Caractéristiques : Grille dense avec filtres par attributs techniques, comparateur de fiches
  - Boutons : `Prévisualiser`, `Activer ce thème`

### 46. Visual Theme Customizer, Brand Colors & Real-Time CSS Preview
- **Route Path**: `/hub/dashboard/themes/customize` (accessible aussi via `/online-store/themes/customize`)
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Studio de personnalisation graphique en temps réel, réglage des couleurs de marque, typographies, styles de boutons et aperçu immédiat de la boutique sans rechargement de page.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Boutique en Ligne > Thèmes > Personnaliser`
- **Page Heading**: "Studio de Personnalisation Visuelle du Thème"
- **Subtitle / Description**: "Ajustez vos couleurs de marque, vos polices et les arrondis de boutons avec prévisualisation en direct."
- **Boutons d'En-tête**: `Enregistrer les modifications`, `Réinitialiser aux couleurs d'origine`, `Quitter le studio`

#### B. Volet Latéral des Réglages Graphiques (Onglets de configuration)
- **Onglet 1 : Palettes de Couleurs & Préréglages**:
  - Préréglages en 1-clic : `Rouge PandaMarket`, `Bleu Sidi Bou Saïd`, `Vert Olive Sahel`, `Terracotta Médina`, `Noir & Or Luxe`
  - Couleur Primaire de Marque (Pipette de couleur / Code hexadécimal)
  - Couleur Secondaire d'Accent
  - Couleur d'Arrière-plan de la Boutique (Clair / Blanc pur / Ivoire doux)
  - Couleur du Texte Principal
- **Onglet 2 : Typographie & Polices**:
  - Police des Titres (Menu déroulant : Inter, Montserrat, Playfair Display, Cairo pour l'arabe)
  - Police du Corps de Texte (Menu déroulant : Inter, Open Sans, Tajawal)
- **Onglet 3 : Boutons & Éléments Graphiques**:
  - Rayon de courbure des boutons : `[Angles droits (0px), Légèrement arrondis (8px), Arrondis modernes (16px), Pilule complète (999px)]`
  - Style de badge promotionnel : `[Ruban diagonal, Pastille discrète, Bulle en relief]`
- **Onglet 4 : En-tête & Pied de Page (Header & Footer)**:
  - Hauteur du logo de la boutique
  - Affichage de la barre de recherche centrale
  - Affichage du sélecteur de langue (Français / Arabe)
  - Liens vers les réseaux sociaux dans le pied de page

#### C. Volet Principal : Cadre de Prévisualisation en Direct (Live Canvas)
- Rendu fidèle de la page d'accueil de la boutique avec application instantanée des styles sélectionnés
- Commutateur de viewport : `Desktop / Tablette / Mobile`

### 47. Homepage Sections Customizer (Hero, Banners, Grids)
- **Route Path**: `/hub/dashboard/online-store/customize`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Agencement des sections de la page d'accueil de la boutique marchande (Bannière Héro, Grille de produits vedettes, Grille de collections, Avis clients, Bannière promotionnelle).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Boutique en Ligne > Agencement des Sections`
- **Page Heading**: "Personnalisation des Sections de la Page d'Accueil"
- **Subtitle / Description**: "Ajoutez, supprimez et réorganisez les blocs de contenu qui composent la vitrine d'accueil de votre boutique."

#### B. Liste Ordonnée des Blocs de Contenu (Glisser-Déposer)
- **Bloc 1 : Barre d'Annonce Supérieure (Promo Bar)**:
  - Texte affiché : "Livraison offerte sur toute la Tunisie dès 80 TND d'achat !"
  - Bouton d'activation : `Activé / Masqué`
- **Bloc 2 : Grande Bannière Héro (Hero Slider / Banner)**:
  - Titre : "Nouvelle Collection Artisanale d'Automne"
  - Image de fond, Bouton d'action et lien de destination
- **Bloc 3 : Grille des Catégories en Vedette**:
  - Sélection des 4 rayons phares affichés sur l'accueil
- **Bloc 4 : Produits Populaires (Grille 8 articles)**:
  - Titre : "Nos Meilleures Ventes"
  - Source des produits : `Automatique (Plus vendus) ou Sélection manuelle`
- **Bloc 5 : Témoignages & Avis Clients**:
  - Titre : "Ce que disent nos clients"
  - Affichage des 3 derniers avis 5 étoiles vérifiés
- **Bouton d'Ajout de Bloc**: `+ Ajouter une nouvelle section (Bannière vidéo, Texte libre, FAQ, Grille Instagram)`
- **Bouton d'Enregistrement**: `Enregistrer et publier l'agencement`

### 48. Navigation Menus Builder (Header & Footer)
- **Route Path**: `/hub/dashboard/online-store/navigation`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Gestion des menus de navigation de la boutique (Menu principal supérieur, menu du pied de page, liens rapides et arborescence hiérarchique des sous-menus).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Boutique en Ligne > Menus & Navigation`
- **Page Heading**: "Gestion des Menus de Navigation"
- **Subtitle / Description**: "Configurez les liens et menus déroulants qui orientent vos visiteurs vers vos rayons et pages clés."

#### B. Menus Disponibles à la Configuration
- **Menu 1 : Menu Principal (Header Navigation)**:
  - Liens actuels :
    - `Accueil` (Lien vers `/`)
    - `Nouveautés` (Lien vers la collection Nouveautés)
    - `Artisanat & Décoration` (Menu déroulant : Céramique, Tissage, Bois d'olivier)
    - `Mode Traditionnelle` (Menu déroulant : Robes, Jebbas, Accessoires)
    - `Promotions` (Lien vers `/category/promotions`)
    - `Contactez-nous` (Lien vers la page de contact)
  - Actions : `+ Ajouter un élément de menu`, `Réorganiser l'ordre (Glisser-Déposer)`, `Modifier le lien`, `Supprimer`
- **Menu 2 : Menu du Pied de Page (Footer Navigation)**:
  - Colonne 1 : À propos de notre atelier, Histoire de la marque
  - Colonne 2 : Guide des tailles, Modalités de livraison par gouvernorat
  - Colonne 3 : Politique de retour & échange sous 10 jours, Contact & SAV
  - Actions : `+ Ajouter un lien de pied de page`

### 49. Drag & Drop Custom Landing Page Builder
- **Route Path**: `/hub/dashboard/page-builder`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Constructeur visuel de pages d'atterrissage sur-mesure (landing pages promotionnelles, page Histoire de l'artisan, page Événement saisonnier) sans nécessiter de code.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Boutique en Ligne > Constructeur de Pages`
- **Page Heading**: "Constructeur de Pages Sur-Mesure"
- **Subtitle / Description**: "Créez des pages d'atterrissage uniques pour vos lancements de produits ou vos opérations promotionnelles."

#### B. Control Bar & Action Triggers
- **Champ de Recherche**: "Rechercher une page créée..."
- **Bouton Primaire**: `+ Créer une Nouvelle Page Personnalisée`

#### C. Data Collection — Tableau des Pages Créées
- **En-têtes de colonnes**:
  1. `Titre de la Page` (e.g. `Notre Savoir-Faire Artisanal`, `Vente Flash Aïd 2026`)
  2. `URL d'Accès` (e.g. `boutique.pandamarket.tn/pages/notre-histoire`)
  3. `Nombre de Blocs` (e.g. `6 blocs de contenu`)
  4. `Date de Dernière Modification`
  5. `Statut` (Badge: Publiée en ligne / Brouillon privé)
  6. `Actions` (`Ouvrir l'éditeur visuel de blocs`, `Prévisualiser`, `Supprimer sans dialogue natif`)

#### D. Palette des Composants du Constructeur de Pages
- Blocs disponibles à l'insertion :
  - `Bloc Titre & Paragraphe Typographique`
  - `Bloc Image Pleine Largeur & Légende`
  - `Bloc Colonnes de Texte & Icônes (Avantages / Garanties)`
  - `Bloc Grille de Sélection de Produits Ciblés`
  - `Bloc Bouton d'Appel à l'Action (CTA)`
  - `Bloc Formulaire de Contact ou d'Inscription Newsletter`

### 50. Custom Domains, SSL & DNS Records Configuration
- **Route Path**: `/hub/dashboard/online-store/domains`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Configuration de noms de domaine personnalisés (.tn, .com, etc.), vérification en direct de la propagation DNS, boutons de copie en 1-clic pour les enregistrements CNAME et type A, et génération de certificats SSL Let's Encrypt automatiques.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Boutique en Ligne > Domaines & DNS`
- **Page Heading**: "Nom de Domaine & Configuration DNS"
- **Subtitle / Description**: "Associez votre propre nom de domaine personnalisé (ex: votre-boutique.tn) à votre vitrine PandaMarket pour renforcer votre notoriété de marque."

#### B. Sous-domaine Officiel Fourni par Défaut
- URL permanente : `https://[votre-boutique].pandamarket.tn`
- Statut : `Actif & Toujours accessible (Certificat SSL Wildcard sécurisé)`

#### C. Domaine Personnalisé Configuré
- Nom de domaine saisi : `www.artisanat-tunisie.tn`
- Statut de connexion : `Connecté & Sécurisé (Certificat SSL Actif)`
- Date de validation DNS : `28/08/2026`

#### D. Guide de Configuration DNS avec Boutons de Copie en 1-Clic
- **Enregistrement 1 (Type CNAME)**:
  - Type : `CNAME`
  - Hôte / Nom : `www`
  - Valeur / Cible : `cname.pandamarket.tn`
  - Bouton d'action : `Copier la valeur (Pastille visuelle "Copié !" avec confirmation)`
- **Enregistrement 2 (Type A pour domaine racine)**:
  - Type : `A`
  - Hôte / Nom : `@`
  - Valeur / Adresse IP : `159.65.120.45`
  - Bouton d'action : `Copier l'IP`
- **Outil de Diagnostic Externe**:
  - Lien direct : `Vérifier la propagation DNS en temps réel sur DNSChecker.org →`

#### E. Formulaire d'Ajout d'un Nouveau Domaine
- Champ de saisie : "Saisissez votre nom de domaine (ex: ma-marque.tn)"
- Bouton : `Associer ce domaine & Lancer la vérification SSL`

### 51. Storefront SEO Metadata, Google Search Preview & OpenGraph
- **Route Path**: `/hub/dashboard/online-store/seo`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Optimisation du référencement naturel de la boutique sur les moteurs de recherche (Google, Bing) et personnalisation des visuels de partage sur les réseaux sociaux (Facebook, Instagram, WhatsApp).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Boutique en Ligne > Référencement SEO`
- **Page Heading**: "Référencement Naturel (SEO) & Méta-Données"
- **Subtitle / Description**: "Optimisez la visibilité de votre boutique sur Google et contrôlez l'apparence de vos liens partagés sur les réseaux sociaux."

#### B. Formulaire de Configuration SEO
- **Titre de la Page d'Accueil (`<title>`)**:
  - Champ texte avec compteur de caractères recommandés (e.g. `Artisanat Traditionnel Tunisien | Maroquinerie & Poterie — Ma Boutique` — 65/70 caractères)
- **Méta-Description de la Boutique**:
  - Zone de texte avec compteur de caractères recommandés (e.g. `Découvrez notre collection exclusive d'objets artisanaux faits main en Tunisie. Céramique de Nabeul, cuir véritable et livraison rapide dans les 24 gouvernorats.` — 155/160 caractères)
- **Mots-clés Principaux (Keywords)**:
  - Saisie de tags (e.g. `artisanat tunisien, poterie nabeul, maroquinerie cuir tunisie, cadeaux traditionnels`)
- **Image de Partage Réseaux Sociaux (OpenGraph / Twitter Card)**:
  - Téléversement d'une image au format 1200x630 px affichée lors du partage de l'URL sur WhatsApp ou Facebook
- **Bouton d'Action**: `Enregistrer les paramètres SEO`

#### C. Prévisualisation en Temps Réel
- **Aperçu dans les Résultats de Recherche Google (Google SERP Preview)**:
  - Affiche l'URL verte, le titre cliquable en bleu et la méta-description en gris
- **Aperçu de la Carte de Partage Social (WhatsApp / Facebook Card)**:
  - Affiche la miniature photo, le titre du site et le nom de domaine

### 52. Tunisian Carriers Rate Simulator & Marketing Tracking Pixels
- **Route Path**: `/hub/dashboard/online-store/integrations`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Simulateur comparatif multi-transporteurs couvrant les 24 gouvernorats tunisiens (Aramex, Rapid-Poste, Runex, First Delivery), délais d'acheminement, gestion des grilles tarifaires de livraison et injection des pixels publicitaires (Meta Pixel, TikTok Pixel, Google Analytics).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Boutique en Ligne > Logistique & Intégrations`
- **Page Heading**: "Transporteurs Tunisiens & Pixels Marketing"
- **Subtitle / Description**: "Simulez vos frais d'expédition sur les 24 gouvernorats, configurez vos transporteurs partenaires et injectez vos pixels publicitaires de conversion."

#### B. Simulateur Multi-Transporteurs des 24 Gouvernorats Tunisiens
- **Champs de la Simulation**:
  - Sélecteur de Gouvernorat de Destination : `[Tunis, Ariana, Ben Arous, Manouba, Nabeul, Zaghouan, Bizerte, Béja, Jendouba, Le Kef, Siliana, Sousse, Monastir, Mahdia, Sfax, Kairouan, Kasserine, Sidi Bouzid, Gabès, Médenine, Tataouine, Gafsa, Tozeur, Kébili]`
  - Poids estimé du colis : `[0.5 kg, 1 kg, 2 kg, 5 kg, 10 kg]`
  - Mode de règlement de la commande : `[Paiement à la Livraison (COD), Paiement en Ligne Déjà Réglé]`
- **Matrice Comparative des Offres Transporteurs en Temps Réel**:
  - **Aramex Tunisie** : Tarif estimé `7.500 TND` · Délai : `24-48h` · Couverture : `Nationale (24 Gouv)` · Retrait à domicile inclus
  - **Rapid-Poste (La Poste Tunisienne)** : Tarif estimé `6.500 TND` · Délai : `24-72h` · Couverture : `Exhaustive (Bureaux de poste & Domicile)`
  - **Runex Express** : Tarif estimé `7.000 TND` · Délai : `24-48h` · Couverture : `Spécialiste Sfax, Sahel et Sud`
  - **First Delivery** : Tarif estimé `8.000 TND` · Délai : `12-24h` · Couverture : `Grand Tunis & Villes Côtières`

#### C. Intégrations Marketing & Pixels Publicitaires
- **Formulaire Méta Pixel (Facebook & Instagram)**:
  - Identifiant Pixel (Champ texte : e.g. `123456789012345`)
  - Événements tracés automatiquement : `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase (avec montant TND)`
- **Formulaire TikTok Pixel**:
  - Identifiant TikTok Pixel (Champ texte)
- **Formulaire Google Analytics 4 (GA4)**:
  - Identifiant de mesure `G-XXXXXXXXXX`
- **Bouton d'Action**: `Enregistrer les identifiants de suivi`

### 53. Store Customers Directory & Purchasing History
- **Route Path**: `/hub/dashboard/online-store/customers`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Fichier clients de la boutique, historique individuel des commandes passées, coordonnées téléphoniques et géographiques de livraison, segmentation des clients fidèles.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Clients`
- **Page Heading**: "Répertoire des Clients de la Boutique"
- **Subtitle / Description**: "Consultez la liste de vos acheteurs, leur historique d'achat et leurs coordonnées pour un service client d'excellence."

#### B. Key Performance Indicators (KPIs)
- **Total Clients de la Boutique**: `342 acheteurs uniques`
- **Clients Ayant Réitéré un Achat**: `85 clients fidèles`
- **Dépense Moyenne par Client**: `124.000 TND`

#### C. Control Bar, Search & Filter Matrix
- **Champ de Recherche**: "Rechercher un client par nom, email, téléphone ou ville..."
- **Filtre par Nombre de Commandes**: `[Tous, 1 commande, 2 à 5 commandes, Clients VIP (>5 commandes)]`
- **Bouton d'Action**: `Exporter la Base Clients (CSV)`

#### D. Data Collection — Tableau des Clients
- **En-têtes de colonnes**:
  1. `Client` (Nom, Prénom, Email)
  2. `Téléphone` (Numéro tunisien pour confirmation WhatsApp / appel)
  3. `Localisation` (Gouvernorat et ville de livraison)
  4. `Total Commandes` (Nombre d'achats finalisés)
  5. `Dépenses Totales (TND)` (Chiffre d'affaires cumulé généré)
  6. `Dernière Commande` (Date du dernier achat)
  7. `Actions` (`Consulter la fiche client détaillée`, `Historique des commandes`)

### 54. AI Tools Studio (Copywriting, Titles, SEO & Support)
- **Route Path**: `/hub/dashboard/ai`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Studio d'intelligence artificielle assistant le marchand : générateur automatique de descriptions de produits attractives, optimiseur de titres pour le référencement, traducteur bilingue français/arabe et générateur de réponses aux avis clients.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Studio d'Outils IA`
- **Page Heading**: "Studio d'Intelligence Artificielle Marchande"
- **Subtitle / Description**: "Accélérez la rédaction de vos fiches produits, optimisez vos titres pour la recherche et générez des arguments de vente percutants."
- **Badges**: `Propulsé par Gemini AI`, `Quota Inclus dans votre Formule`

#### B. Modules & Outils Disponibles dans le Studio
- **Outil 1 : Générateur de Fiche Produit Express**:
  - Champs d'entrée :
    - Nom de base du produit (e.g. "Sac en cuir véritable marron fait main")
    - Mots-clés clés / Matières (e.g. "cuir de chèvre, tannage végétal, artisane de Kairouan, fermeture laiton")
    - Ton rédactionnel : `[Élégant & Haut de gamme, Authentique & Artisanal, Moderne & Décontracté, Vendeur & Promotionnel]`
    - Longueur désirée : `[Synthétique (1 paragraphe), Détaillée avec caractéristiques, Format Bullet-points]`
  - Bouton : `Générer la description produit en 1-clic`
  - Résultat : Texte rédigé prêt à copier ou à insérer directement dans la fiche produit
- **Outil 2 : Optimiseur de Titre & Mots-Clés SEO**:
  - Suggère 5 variantes de titres percutants optimisés pour apparaître en tête des recherches Google et de la marketplace
- **Outil 3 : Traducteur Bilingue Marchand (Français ↔ Arabe)**:
  - Traduction fidèle et adaptée au dialecte commercial tunisien
- **Outil 4 : Rédacteur de Réponses aux Avis Clients**:
  - Génère une réponse chaleureuse et professionnelle pour remercier un acheteur ou traiter une remarque constructive

### 55. Subscription Plans, Feature Limits, Meter & Upgrade
- **Route Path**: `/hub/dashboard/subscription`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Suivi du plan d'abonnement SaaS de la boutique, consommation des quotas (articles publiés, jetons IA, bande passante), date d'échéance et portail de mise à niveau / surclassement.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Mon Abonnement SaaS`
- **Page Heading**: "Formule d'Abonnement & Quotas de la Boutique"
- **Subtitle / Description**: "Consultez votre formule actuelle, surveillez vos quotas d'utilisation et surclassez votre boutique pour débloquer des fonctionnalités premium."

#### B. Récapitulatif du Plan Actuel
- Nom de la formule active : `Plan Vendeur Pro`
- Tarif : `69.000 TND / mois`
- Date de renouvellement : `28/09/2026 (Renouvellement automatique actif)`
- Taux de commission préférentiel appliqué : `5.0% sur les ventes` (au lieu de 10% sur le plan gratuit)
- Jauges de consommation des quotas :
  - Produits publiés : `148 articles (Catalogue Illimité autorisé)`
  - Jetons IA du mois : `124,000 / 500,000 tokens consommés (24.8%)`
  - Stockage média : `145 MB / 5,000 MB (2.9%)`

#### C. Grille Comparative des Formules de Surclassement
- Tableau comparatif des 4 formules : `Free (Gratuit)`, `Starter (29 TND/m)`, `Pro (69 TND/m)`, `Agence (149 TND/m)`
- Matrice des fonctionnalités détaillées (Domaines personnalisés, Taux de commission, Assistant IA, Accès aux clés d'API, Support prioritaire)
- Boutons d'Action : `Choisir ce plan (Mise à niveau immédiate)`, `Changer pour la facturation annuelle (-20% de réduction)`

### 56. Recurring Billing Payment Method Setup
- **Route Path**: `/hub/dashboard/subscription/payment-method`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Enregistrement et mise à jour du moyen de paiement récurrent pour le renouvellement du forfait d'abonnement de la boutique.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Mon Abonnement > Moyen de Paiement`
- **Page Heading**: "Moyen de Paiement pour l'Abonnement"
- **Subtitle / Description**: "Définissez comment vous réglez vos échéances d'abonnement PandaMarket."

#### B. Options de Règlement Proposées
- **Option 1 : Carte Bancaire Tunisienne (Gim-Tel / CIB)**
  - Formulaire sécurisé : Numéro de carte (16 chiffres), Date d'expiration (MM/AA), Code cryptogramme CVV (3 chiffres)
- **Option 2 : Portefeuille Digital Flouci**
  - Connexion via QR Code ou numéro mobile rattaché au compte Flouci
- **Option 3 : Prélèvement Automatique sur le Solde Vendeur**
  - Case à cocher : "Prélever automatiquement mes échéances d'abonnement sur mes gains de ventes disponibles dans mon portefeuille marchand"
- **Option 4 : Règlement par Mandat Minute Postal**
  - Consignes de versement au guichet postal et bouton d'envoi du reçu
- **Bouton d'Action**: `Enregistrer le moyen de paiement`

### 57. Platform SaaS Invoices & Postal Mandat Receipt Upload
- **Route Path**: `/hub/dashboard/my-subscription-orders`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Historique des factures de forfaits émises par PandaMarket au marchand, téléchargement des reçus fiscaux et interface de téléversement des talons de mandat postal.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Mon Abonnement > Factures & Mandats`
- **Page Heading**: "Historique de Facturation & Preuves de Mandat"
- **Subtitle / Description**: "Téléchargez vos factures d'abonnement et soumettez vos preuves de versement postal pour validation rapide."

#### B. Formulaire de Dépôt de Preuve de Mandat Postal
- Numéro de commande d'abonnement rattachée (Menu déroulant des factures en attente)
- Numéro d'opération du mandat postal (Champ texte)
- Bureau de poste de dépôt (Champ texte : e.g. "Bureau de Poste Sousse Corniche")
- Montant versé en Dinars Tunisiens (e.g. `207.000 TND pour 3 mois de Pro`)
- Téléversement de la photo nette du reçu postal timbré (Fichier image JPG/PNG)
- Bouton : `Transmettre le reçu à la comptabilité PandaMarket`

#### C. Data Collection — Tableau des Factures d'Abonnement
- **En-têtes de colonnes**:
  1. `Réf. Facture` (e.g. `INV-2026-0941`)
  2. `Formule & Période` (Plan Pro — Trimestre T3 2026)
  3. `Montant Payé (TND)` (Montant TTC avec TVA 19%)
  4. `Mode de Règlement` (Carte Bancaire, Mandat Minute, Solde Vendeur)
  5. `Date de Règlement`
  6. `Statut` (Badge: Payée / Validée, En attente de contrôle, Rejetée)
  7. `Actions` (`Télécharger la Facture PDF Fiscale`, `Renvoyer par email`)

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

### 59. Customer Disputes, Infringement Claims & Resolution Cases
- **Route Path**: `/hub/dashboard/reports`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Registre des réclamations clients, contestations de livraison ou signalements concernant la boutique marchande, suivi des délais de réponse et préservation du score de conformité.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Signalements & Litiges Clients`
- **Page Heading**: "Gestion des Litiges & Réclamations Clients"
- **Subtitle / Description**: "Traitez les réclamations de vos acheteurs, fournissez vos justificatifs de livraison et trouvez des résolutions amiables."

#### B. Key Performance Indicators (KPIs)
- **Litiges en Cours**: `1 dossier nécessitant une réponse`
- **Taux de Résolution Amiable**: `92.4%`
- **Délai Moyen de Réponse Marchand**: `6 heures`

#### C. Data Collection — Tableau des Réclamations
- **En-têtes de colonnes**:
  1. `Réf. Litige` (e.g. `CASE-2026-031`)
  2. `Commande Concernee` (Numéro de commande, Date de livraison)
  3. `Acheteur Plaignant` (Nom complet du client)
  4. `Motif Déclaré` (Non-réception de colis, Article cassé, Article différent de la photo)
  5. `Date Limite de Réponse` (Délai de 48h accordé au vendeur avant arbitrage admin)
  6. `Statut` (Badge: Réponse attendue du vendeur, En cours d'analyse, Résolu)
  7. `Actions` (`Ouvrir le dossier d'arbitrage`, `Proposer un échange ou remboursement`)

### 60. Dispute Dossier View, Proof Upload & Resolution Response Submission
- **Route Path**: `/hub/dashboard/reports/[id]`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Dossier d'arbitrage d'un litige client spécifique : consultation des photos déposées par l'acheteur, téléversement du bordereau d'expédition signé par le transporteur et soumission de la proposition de résolution.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Litiges > Dossier #[id]`
- **Page Heading**: "Arbitrage Litige Commande #[Numéro]"
- **Subtitle / Description**: "Examinez les faits reprochés par le client et apportez vos justificatifs contradictoires."

#### B. Contenu du Dossier de Litige
- **Détails de la Réclamation**: Description rédigée par l'acheteur, photos du colis ou du produit endommagé jointes par l'acheteur
- **Formulaire de Réponse du Marchand**:
  - Téléversement du bordereau de livraison signé avec tampon du transporteur (Aramex / La Poste)
  - Explications factuelles du vendeur (Zone de texte)
  - Proposition de règlement amiable : `[Renvoyer un article neuf sans frais, Rembourser intégralement, Rembourser partiellement à hauteur de 50%, Contester la réclamation (Preuve de livraison irréfutable)]`
  - Bouton : `Transmettre la réponse officielle à l'administration et au client`

### 61. Store Identity, Business Profile & Operational Settings
- **Route Path**: `/hub/dashboard/settings`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Paramètres complets d'identité de la boutique : raison sociale, logo, bannière, coordonnées physiques en Tunisie, horaires d'ouverture, politique de retour personnalisée et sous-domaine.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Paramètres de la Boutique`
- **Page Heading**: "Paramètres Généraux de la Boutique"
- **Subtitle / Description**: "Mettez à jour les informations légales, les visuels de marque et les coordonnées de contact de votre boutique."

#### B. Formulaire des Paramètres Marchand

##### Section 1 : Identité & Image de Marque
- Nom public de la boutique (Champ texte : e.g. `Atelier Artisanal de Carthage`)
- Sous-domaine réservé (Champ texte : `atelier-carthage.pandamarket.tn`)
- Slogan / Accroche courte (Champ texte : `Créations authentiques en céramique et mosaïque tunisienne`)
- Description de l'histoire de la boutique (Zone de texte enrichie)
- Téléversement du Logo Officiel (Image carrée recommandée 512x512 px)
- Téléversement de la Bannière de Vitrine (Image panoramique recommandée 1920x600 px)

##### Section 2 : Coordonnées de Contact & Localisation
- Adresse email de contact public de la boutique
- Numéro de téléphone / WhatsApp professionnel tunisien (`+216 XX XXX XXX`)
- Adresse physique de l'atelier / magasin
- Ville et Gouvernorat tunisien (Menu déroulant des 24 gouvernorats)
- Code postal tunisien (Champ 4 chiffres)
- Coordonnées GPS / Lien Google Maps (optionnel)

##### Section 3 : Politiques Commerciales & Horaires
- Horaires d'ouverture / Service client (e.g. `Du Lundi au Vendredi de 9h à 18h, Samedi de 9h à 14h`)
- Délai moyen de préparation des commandes (Menu déroulant : `Expédié sous 24h, 1 à 2 jours ouvrés, Sur-mesure (3-5 jours)`)
- Politique de retour & échange de la boutique (Zone de texte : e.g. "Échange possible sous 10 jours ouvrables en emballage d'origine")

##### Section 4 : Sécurité & Collaborateurs
- Activation de la double authentification 2FA pour la connexion au tableau de bord
- Bouton : `Enregistrer l'ensemble des paramètres de la boutique`

### 62. Merchant KYC Verification Portal & Documents Upload
- **Route Path**: `/hub/dashboard/kyc`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Espace de certification légale du marchand, téléversement sécurisé de la Carte d'Identité Nationale (CIN) ou de l'extrait RNE tunisien, et suivi du statut de validation pour débloquer les paiements.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Vérification KYC`
- **Page Heading**: "Vérification d'Identité Marchande (KYC)"
- **Subtitle / Description**: "Conformément à la réglementation bancaire tunisienne, certifiez votre identité ou votre immatriculation d'entreprise pour activer vos virements."
- **Statut Actuel de Vérification**: `Badge Vert : Boutique Certifiée & Vérifiée` (ou `Badge Jaune : En cours d'analyse sous 24h` / `Non Soumis`)

#### B. Formulaire de Dépôt des Documents Légaux
- **Type d'Activité Déclarée**: `[Artisan Particulier / Créateur Indépendant | Commerçant Enregistré (Personne Physique) | Société (SARL / SU / SA)]`
- **Pour les Artisans & Particuliers**:
  - Numéro de Carte d'Identité Nationale (CIN tunisienne à 8 chiffres)
  - Téléversement CIN Recto (Photo nette et lisible)
  - Téléversement CIN Verso
  - Date de délivrance de la CIN
- **Pour les Sociétés & Entreprises**:
  - Matricule Fiscal Tunisien (Format `0000000X/A/M/000`)
  - Numéro de Registre National des Entreprises (Extrait RNE datant de moins de 3 mois)
  - Téléversement du document RNE officiel (Fichier PDF)
  - Nom légal du gérant ou mandataire social
- **Relevé d'Identité Bancaire (RIB)**:
  - Fichier de Relevé de Compte ou Attestation de Domiciliation Bancaire portant le cachet de la banque
- **Bouton d'Action**: `Transmettre mon dossier pour certification officielle`

### 63. Developer REST API Credentials & Permission Scopes
- **Route Path**: `/hub/dashboard/api-keys`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Génération de clés d'API REST sécurisées pour connecter la boutique aux logiciels de caisse (ERP, Odoo), gestionnaires de stocks externes ou applications mobiles.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Développeurs > Clés d'API`
- **Page Heading**: "Clés d'API REST & Accès Développeur"
- **Subtitle / Description**: "Générez des identifiants sécurisés pour synchroniser vos commandes et votre catalogue avec vos outils externes."

#### B. Formulaire de Création d'une Clé d'API
- Nom de l'application / Description de la clé (e.g. "Synchronisation Caisse Magasin Tunis")
- Permissions accordées (Cases à cocher : `Lecture du catalogue`, `Mise à jour des stocks`, `Lecture des commandes`, `Modification du statut d'expédition`, `Accès aux fiches clients`)
- Date d'expiration (Menu déroulant : `30 jours, 90 jours, 1 an, Jamais`)
- Bouton : `Générer la clé d'API`

#### C. Data Collection — Tableau des Clés d'API Actives
- **En-têtes de colonnes**:
  1. `Nom de la Clé` (Description)
  2. `Préfixe Public` (e.g. `pk_live_84f9...`)
  3. `Permissions (Scopes)` (Badges des droits accordés)
  4. `Dernière Utilisation` (Date et adresse IP de l'appel)
  5. `Date de Création & Expiration`
  6. `Actions` (`Régénérer`, `Révoquer / Supprimer définitivement`)

### 64. Real-time Webhook Subscriptions & Delivery Logs
- **Route Path**: `/hub/dashboard/webhooks`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Enregistrement d'URLs de webhooks pour recevoir des notifications HTTPS en temps réel lors de nouveaux événements (nouvelle commande passée, paiement confirmé, colis livré, stock épuisé).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Développeurs > Webhooks`
- **Page Heading**: "Abonnements Webhooks en Temps Réel"
- **Subtitle / Description**: "Recevez automatiquement les notifications de nouvelles commandes sur votre serveur externe via requêtes HTTPS sécurisées."

#### B. Formulaire d'Enregistrement de Webhook
- URL de votre serveur d'écoute (Champ HTTPS obligatoire : e.g. `https://mon-serveur.tn/webhooks/pandamarket`)
- Clé secrète de signature HMAC (Générée automatiquement pour authentifier les requêtes)
- Événements déclencheurs (Cases à cocher : `order.created`, `order.paid`, `order.fulfilled`, `product.stock_low`, `customer.registered`)
- Bouton : `Enregistrer le Webhook & Envoyer un Événement Ping de Test`

#### C. Data Collection — Journal des Déclarations & Tentatives d'Envoi
- **En-têtes de colonnes**:
  1. `Événement` (e.g. `order.created #ORD-882194`)
  2. `Horodatage` (Date et seconde de déclenchement)
  3. `URL Cible` (Endpoint destinataire)
  4. `Statut HTTP` (Badge Vert `200 OK` ou Rouge `500 Server Error`)
  5. `Durée de Réponse` (e.g. `124 ms`)
  6. `Actions` (`Inspecter la charge utile JSON (Payload)`, `Ré-émettre la requête`)

### 65. Store Notification Center & Channel Alert Preferences
- **Route Path**: `/hub/dashboard/notifications`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Centre de notifications de la boutique, alertes de commandes passées, messages clients, validations de paiements et paramétrage des canaux (Email, SMS, WhatsApp).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Notifications`
- **Page Heading**: "Centre de Notifications & Alertes"
- **Subtitle / Description**: "Consultez le fil de vos alertes récentes et personnalisez les canaux de notification pour ne manquer aucune vente."

#### B. Préférences des Canaux de Notification (Formulaire de réglages)
- Notification par Email (Cases à cocher : Nouvelle commande reçue, Message client, Virement bancaire validé, Stock critique)
- Notification par SMS / WhatsApp sur numéro tunisien (Cases à cocher pour les alertes urgentes de commandes COD)
- Notification sonore sur le tableau de bord (Interrupteur Oui/Non lors de l'arrivée d'une nouvelle commande)
- Bouton : `Enregistrer mes préférences d'alerte`

#### C. Data Collection — Flux Chronologique des Notifications
- **Fiche Notification (Structure unitaire)**:
  - Icône selon typologie (Panier pour commande, Cloche pour virement, Triangle pour alerte de stock)
  - Titre de l'alerte : e.g. "Nouvelle commande #ORD-882195 reçue !"
  - Corps du message : "Fatma Ben Ali a commandé 2 articles pour un total de 140.000 TND (Paiement COD à Ariana)."
  - Heure relative : "Il y a 12 minutes"
  - État : `Non lu (Point indicateur)` ou `Lu`
  - Bouton d'action direct : `Traiter la commande →`
- Bouton global : `Marquer toutes les notifications comme lues`

### 66. Merchant Support Desk & Help Ticket Submission
- **Route Path**: `/hub/dashboard/support`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Guichet d'assistance dédié aux marchands PandaMarket, base de connaissances des vendeurs, foire aux questions (FAQ logistique/paiement) et ouverture de tickets de support.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Assistance & Support`
- **Page Heading**: "Centre d'Assistance & Support Vendeur"
- **Subtitle / Description**: "Trouvez des réponses rapides à vos questions logistiques, financières ou techniques et contactez l'équipe support PandaMarket."

#### B. Foire Aux Questions Rapide (FAQ Vendeurs)
- Accordeon 1 : "Comment fonctionnent les délais de virement vers ma banque tunisienne ?"
- Accordeon 2 : "Que faire si un client refuse son colis contre remboursement (COD) ?"
- Accordeon 3 : "Comment imprimer mes bordereaux d'expédition au format thermique ?"
- Accordeon 4 : "Comment connecter mon domaine personnalisé .tn ?"

#### C. Formulaire d'Ouverture d'un Ticket de Support
- Objet de la demande (Champ texte : e.g. "Question sur le virement du 02 Septembre")
- Catégorie de la requête : `[Paiements & Retraits de solde, Transporteurs & Logistique, Problème technique sur la vitrine, Abonnements & Factures, Autre]`
- Niveau d'urgence : `[Normale, Urgente (Bloque les ventes)]`
- Description détaillée du problème rencontré (Zone de texte)
- Pièces jointes / Captures d'écran (Téléversement de fichiers)
- Bouton : `Transmettre le ticket à l'assistance vendeur`

#### D. Historique de Vos Tickets Ouverts
- Tableau des tickets soumis avec référence, sujet, date, statut (`En cours de traitement par l'équipe support`, `Résolu`) et lien de conversation.

### 67. Create New Secondary Store Wizard
- **Route Path**: `/hub/dashboard/create-store`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Assistant de création d'une nouvelle boutique (pour les marchands disposant d'un compte multi-boutiques ou lançant une seconde marque spécialisée).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Créer une Boutique`
- **Page Heading**: "Création d'une Nouvelle Boutique"
- **Subtitle / Description**: "Lancez une nouvelle marque ou un second point de vente en ligne rattaché à votre compte marchand."

#### B. Formulaire de Création de Boutique
- Nom commercial de la nouvelle boutique (Champ texte : e.g. "Bijoux Berbères du Sud")
- Sous-domaine souhaité (Champ texte avec vérification de disponibilité en temps réel : `https://[votre-choix].pandamarket.tn`)
- Catégorie d'activité principale (Menu déroulant : Artisanat, Mode, Terroir, Décoration, etc.)
- Devise par défaut de la boutique : `Dinar Tunisien (TND)`
- Description succincte de l'offre
- Boutons d'action : `Créer ma boutique maintenant & Accéder au tableau de bord`, `Annuler`

### 68. Multi-Store Switcher & Organization Selector
- **Route Path**: `/hub/dashboard/select-store`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Sélecteur d'organisation et de boutique pour les marchands ou agences gérant plusieurs enseignes depuis un compte unique.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Mes Boutiques`
- **Page Heading**: "Sélectionnez Votre Boutique"
- **Subtitle / Description**: "Choisissez la boutique que vous souhaitez administrer parmi vos points de vente actifs."

#### B. Grille des Boutiques Rattachées au Compte
- **Carte Boutique (Structure unitaire)**:
  - Logo de la boutique
  - Nom commercial : `Atelier Artisanal de Carthage`
  - URL : `atelier-carthage.pandamarket.tn`
  - Formule souscrite : `Plan Pro`
  - Statistiques rapides : `148 produits · 12 commandes ce mois`
  - Statut : `Boutique Active (Badge vérifié)`
  - Bouton d'action : `Gérer cette boutique → (Bascule immédiate de contexte)`
- **Carte de Création**:
  - Icône `+`
  - Libellé : "Créer une boutique supplémentaire"
  - Bouton : `Lancer l'assistant de création`

### 69. Growth Loyalty Alias (Direct Redirect to Seller Loyalty)
- **Route Path**: `/dashboard/loyalty`
- **Dashboard Realm**: Superadmin / Growth Alias
- **Operational Objective**: Alias de redirection directe vers `/hub/dashboard/loyalty`.

#### A. Traitement & Redirection
- Redirection automatique côté serveur vers l'espace de gestion de la fidélité vendeur (`/hub/dashboard/loyalty`).

### 70. Growth Subscribers Alias (Direct Redirect to Seller Loyalty)
- **Route Path**: `/dashboard/subscribers`
- **Dashboard Realm**: Superadmin / Growth Alias
- **Operational Objective**: Alias de redirection directe vers `/hub/dashboard/loyalty`.

#### A. Traitement & Redirection
- Redirection automatique côté serveur vers l'espace de gestion des abonnés (`/hub/dashboard/loyalty`).

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

## 4. Verification & Structural Integrity Summary

| Category | Pages Itemized | Status |
|---|---|---|
| **Superadmin Core Management** | 31 Pages (1 to 31) | 100% Fully Documented |
| **Seller Cockpit & Store Operations** | 38 Pages (32 to 68, 71) | 100% Fully Documented |
| **Growth & Shortcut Aliases** | 2 Aliases (69, 70) | 100% Fully Documented |
| **Total Operational Surfaces** | **71 Pages** | **Zero Missing Pages** |

All components are stripped of design styles, colors, and layout positions, providing the pure semantic raw content blueprint ready for injection into ReGo, design tokens engines, and UI prototyping systems.
