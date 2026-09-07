# Seller Section 5: Online Storefront, Themes & Page Builder

> **Operational Objective**: Storefront domain health, visual theme customizer with real-time preview, homepage builder, navigation menus, landing pages, SEO, custom domains, and carrier rate calculator.
> **Application Routes**: `/hub/dashboard/online-store`, `/hub/dashboard/online-store/theme`, `/hub/dashboard/online-store/banners`, `/hub/dashboard/online-store/navigation`, `/hub/dashboard/online-store/pages`, `/hub/dashboard/online-store/preferences`, `/hub/dashboard/online-store/seo`, `/hub/dashboard/online-store/integrations`
> **Pages Covered in this Section**: Page 44, Page 45, Page 46, Page 47, Page 48, Page 49, Page 50, Page 51, Page 52

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

### [Page 44] Online Storefront Hub & Domain Health Monitor

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

---

### [Page 45] Storefront Themes Gallery & Viewport Previews

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

---

### [Page 46] Visual Theme Customizer, Brand Colors & Real-Time CSS Preview

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

---

### [Page 47] Homepage Sections Customizer (Hero, Banners, Grids)

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

---

### [Page 48] Navigation Menus Builder (Header & Footer)

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

---

### [Page 49] Drag & Drop Custom Landing Page Builder

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

---

### [Page 50] Custom Domains, SSL & DNS Records Configuration

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

---

### [Page 51] Storefront SEO Metadata, Google Search Preview & OpenGraph

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

---

### [Page 52] Tunisian Carriers Rate Simulator & Marketing Tracking Pixels

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

---

