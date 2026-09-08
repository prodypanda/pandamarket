# Seller Section 2: Products, Inventory & Media Library

> **Operational Objective**: Merchant product catalog with variant matrix, store custom categories/collections, and product media image asset library.
> **Application Routes**: `/hub/dashboard/products`, `/hub/dashboard/products/create`, `/hub/dashboard/collections`, `/hub/dashboard/inventory`, `/hub/dashboard/pricing`
> **Pages Covered in this Section**: Page 36, Page 37, Page 39

---

## 1. Section Navigation & Menu Placement

| Page # | Menu Label | Sidebar Group | Route Path | Assigned Icon | Breadcrumb Trail |
|---|---|---|---|---|---|
| Page 36 | **Produits & Variantes** | `Group 3: Catalogue & Stocks` | `/hub/dashboard/products` | `Package` | `Accueil > Catalogue > Produits` |
| Page 37 | **Catégories & Collections** | `Group 3: Catalogue & Stocks` | `/hub/dashboard/categories` | `Tags` | `Accueil > Catalogue > Catégories & Collections` |
| Page 39 | **Médiathèque Marchand** | `Group 3: Catalogue & Stocks` | `/hub/dashboard/media` | `ImageIcon` | `Accueil > Catalogue > Médiathèque` |

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

### [Page 36] Product Catalog, Inventory Adjuster & Variant Matrix

- **Navigation Placement**: `Group 3: Catalogue & Stocks` > **Produits & Variantes**
- **Primary Route**: `/hub/dashboard/products`
- **Breadcrumb Hierarchy**: `Accueil > Catalogue > Produits`
- **Layer 6 Archetype**: `Product Data Table with Inline Variant & Stock Editor`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Catalogue > Produits`
2. **Header Bar**: Title `Product Catalog, Inventory Adjuster & Variant Matrix` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Product Data Table with Inline Variant & Stock Editor.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

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

---

### [Page 37] Store Product Categories & Custom Collections

- **Navigation Placement**: `Group 3: Catalogue & Stocks` > **Catégories & Collections**
- **Primary Route**: `/hub/dashboard/categories`
- **Breadcrumb Hierarchy**: `Accueil > Catalogue > Catégories & Collections`
- **Layer 6 Archetype**: `Collection Card Matrix with Automated Tagging Rules`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Catalogue > Catégories & Collections`
2. **Header Bar**: Title `Store Product Categories & Custom Collections` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Collection Card Matrix with Automated Tagging Rules.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

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

---

### [Page 39] Store Media Library, Product Image Vault & Asset Uploader

- **Navigation Placement**: `Group 3: Catalogue & Stocks` > **Médiathèque Marchand**
- **Primary Route**: `/hub/dashboard/media`
- **Breadcrumb Hierarchy**: `Accueil > Catalogue > Médiathèque`
- **Layer 6 Archetype**: `Multi-Image Drag-and-Drop Vault with Crop Tool`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Catalogue > Médiathèque`
2. **Header Bar**: Title `Store Media Library, Product Image Vault & Asset Uploader` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Multi-Image Drag-and-Drop Vault with Crop Tool.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

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

---

