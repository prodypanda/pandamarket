# Superadmin Section 4: Catalog, Taxonomy & Media Storage

> **Operational Objective**: Marketplace product catalog moderation, 24-governorate category taxonomy tree with commission rates, and platform media storage CDN vault.
> **Application Routes**: `/(admin)/products`, `/(admin)/moderation`, `/(admin)/categories`, `/(admin)/collections`, `/(admin)/system/storage`
> **Pages Covered in this Section**: Page 11, Page 12, Page 13

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

### [Page 11] Marketplace Global Products Moderation & Catalog

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

---

### [Page 12] Global Category Tree Taxonomy & Commission Rates

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

---

### [Page 13] Platform Media Storage & CDN File Vault

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

---

