# Superadmin Section 8: Configuration, CMS & Communications

> **Operational Objective**: Global platform marketplace configuration, SMTP mail dispatch, and legal policy/editorial CMS article management with SEO publishing.
> **Application Routes**: `/(admin)/settings`, `/(admin)/sms-config`, `/(admin)/blog`, `/(admin)/blog/edit`
> **Pages Covered in this Section**: Page 26, Page 27, Page 29, Page 30

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

### [Page 26] Global Platform Configuration & Marketplace Settings

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

---

### [Page 27] SMTP Transactional Mail Server & Test Dispatch

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

---

### [Page 29] CMS Articles, Legal Policies & Blog Posts Directory

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

---

### [Page 30] CMS Article Editor, Markdown Preview & SEO Publishing

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

---

