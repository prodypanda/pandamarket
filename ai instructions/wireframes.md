# PandaMarket — Wireframes & Pages

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Hub Central (pandamarket.tn)

### 1.1 Homepage

```
┌──────────────────────────────────────────────────────┐
│ [Logo]  [════ Search Bar ════]  [🔔] [Cart] [Login] │  ← Navbar sticky
├──────────────────────────────────────────────────────┤
│                                                      │
│   ╔══════════════════════════════════════════════╗   │
│   ║  HERO BANNER                                 ║   │  ← Gradient bg
│   ║  "La marketplace tunisienne #1"              ║   │
│   ║  [Créer ma boutique]  [Explorer]             ║   │  ← 2 CTA
│   ╚══════════════════════════════════════════════╝   │
│                                                      │
│   ── Catégories Populaires ──────────────────────    │
│   [🖥 Tech] [👗 Mode] [🏠 Maison] [🎮 Gaming] →    │  ← Scroll horizontal
│                                                      │
│   ── Produits Tendance ──────────────────────────    │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│   │ Img │ │ Img │ │ Img │ │ Img │ │ Img │         │  ← Grille 5 colonnes
│   │Title│ │Title│ │Title│ │Title│ │Title│         │
│   │Price│ │Price│ │Price│ │Price│ │Price│         │
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│                                                      │
│   ── Boutiques Vérifiées ────────────────────────    │
│   [Logo+Nom] [Logo+Nom] [Logo+Nom] [Logo+Nom]      │  ← Badges ✓
│                                                      │
│   ── Nouveautés ─────────────────────────────────    │
│   (même grille produits)                             │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Footer: Liens | À propos | CGU | Contact | Réseaux  │
└──────────────────────────────────────────────────────┘
```

### 1.2 Page Recherche / Catégorie

```
┌──────────────────────────────────────────────────────┐
│ Navbar + Search (pré-rempli avec la query)           │
├────────────┬─────────────────────────────────────────┤
│ FILTRES    │  "42 résultats pour «chaussures»"       │
│            │  Tri: [Pertinence ▾]                    │
│ Catégorie  │                                         │
│ ☑ Mode     │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│ ☐ Sport    │  │     │ │     │ │     │ │     │      │
│            │  │ Img │ │ Img │ │ Img │ │ Img │      │
│ Prix       │  │Title│ │Title│ │Title│ │Title│      │
│ [10]—[200] │  │Price│ │Price│ │Price│ │Price│      │
│            │  │Shop │ │Shop │ │Shop │ │Shop │      │
│ Vendeur    │  └─────┘ └─────┘ └─────┘ └─────┘      │
│ ☐ Boutik1  │                                         │
│ ☐ Boutik2  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│            │  │ ... │ │ ... │ │ ... │ │ ... │      │
│ Vérifié    │  └─────┘ └─────┘ └─────┘ └─────┘      │
│ ☑ Oui      │                                         │
│            │  [1] [2] [3] ... [→]  ← Pagination      │
└────────────┴─────────────────────────────────────────┘
```

- Sidebar filtres : collapsible sur mobile (bottom sheet)
- Grille : 4 cols desktop, 3 tablet, 2 mobile

### 1.3 Page Produit

```
┌──────────────────────────────────────────────────────┐
│ Navbar                                               │
├──────────────────────────────────────────────────────┤
│ Breadcrumb: Hub > Catégorie > Produit                │
│                                                      │
│ ┌────────────────┐  Titre du Produit                 │
│ │                │  ★★★★☆ (42 avis)                 │
│ │  IMAGE         │  85.000 TND                       │
│ │  PRINCIPALE    │                                   │
│ │                │  Vendeur: [BoutiqueX ✓] →         │
│ │                │                                   │
│ └────────────────┘  Variantes: [S] [M] [L] [XL]     │
│ [img][img][img][img] Quantité: [-] 1 [+]             │
│   ← thumbnails      Stock: 12 disponibles            │
│                                                      │
│                      [🛒 Ajouter au panier]  ← CTA  │
│                      [♡ Wishlist]                    │
│                                                      │
│ ── Tabs ─────────────────────────────────────────    │
│ [Description] [Caractéristiques] [Avis (42)]         │
│                                                      │
│ Lorem ipsum description détaillée du produit...      │
│                                                      │
│ ── Produits Similaires ──────────────────────────    │
│ (grille 5 produits)                                  │
└──────────────────────────────────────────────────────┘
```

### 1.4 Panier & Checkout

```
┌──────────────────────────────────────────────────────┐
│ PANIER (3 articles de 2 vendeurs)                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ── Vendeur A (BoutiqueX ✓) ──────────────────────   │
│ [Img] Produit 1    Qté: [-]1[+]    85.000 TND  [✕] │
│ [Img] Produit 2    Qté: [-]1[+]    45.000 TND  [✕] │
│       Livraison Vendeur A:          7.000 TND       │
│                                                      │
│ ── Vendeur B (ShopY) ────────────────────────────   │
│ [Img] Produit 3    Qté: [-]2[+]    30.000 TND  [✕] │
│       Livraison Vendeur B:          7.000 TND       │
│                                    ─────────────    │
│                         Total:    174.000 TND       │
│                                                      │
│ [Passer la commande →]                               │
├──────────────────────────────────────────────────────┤
│ CHECKOUT (Steps)                                     │
│ [1.Adresse] → [2.Livraison] → [3.Paiement] → [4.✓] │
│                                                      │
│ Step 3 - Mode de paiement:                           │
│ ○ Flouci                                            │
│ ○ Konnect                                           │
│ ○ Mandat Minute (instructions affichées)            │
│ ○ Paiement à la livraison                           │
│                                                      │
│ [Confirmer et payer →]                               │
└──────────────────────────────────────────────────────┘
```

---

## 2. Boutique Vendeur (vendeur.pandamarket.tn)

### 2.1 Storefront Homepage

```
┌──────────────────────────────────────────────────────┐
│ [Store Logo] [Store Name]  [Search]  [Cart] [Login]  │  ← Couleurs du thème
├──────────────────────────────────────────────────────┤
│ [Accueil] [Catalogue] [À propos] [Contact]           │  ← Nav du store
├──────────────────────────────────────────────────────┤
│                                                      │
│   ╔══════════════════════════════════════════════╗   │
│   ║  HERO (image/texte personnalisable)          ║   │
│   ║  "Bienvenue chez [Store Name]"               ║   │
│   ║  [Voir le catalogue]                         ║   │
│   ╚══════════════════════════════════════════════╝   │
│                                                      │
│   ── Produits en vedette ────────────────────────    │
│   (grille produits du vendeur uniquement)             │
│                                                      │
│   ── Nouvelles arrivées ─────────────────────────    │
│   (grille produits)                                  │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Footer store (personnalisable) | "Propulsé par 🐼"   │
└──────────────────────────────────────────────────────┘
```

- Le design suit le `theme_id` choisi par le vendeur
- Les couleurs proviennent de `store.settings`
- Lien "Propulsé par PandaMarket" (sauf plan Platinum/White Label)

---

## 3. Dashboard Vendeur (/dashboard)

### 3.1 Layout Global

```
┌────────────────────────────────────────────────────┐
│ [🐼 PandaMarket]            [🔔 3] [👤 Mon compte]│
├──────────┬─────────────────────────────────────────┤
│ SIDEBAR  │  CONTENU PRINCIPAL                      │
│          │                                         │
│ 📊 Aperçu│                                         │
│ 📦 Produits│                                       │
│ 🛒 Commandes│                                     │
│ 💰 Wallet│                                         │
│ 🤖 Outils IA│                                     │
│ 🎨 Ma Boutique│                                   │
│ 🔑 API Keys│                                      │
│ 📋 Vérification│                                  │
│ ⚙️ Paramètres│                                    │
│          │                                         │
│ ──────── │                                         │
│ Plan:    │                                         │
│ [Starter]│                                         │
│ Upgrade →│                                         │
└──────────┴─────────────────────────────────────────┘
```

### 3.2 Aperçu (Dashboard Home)

```
┌─────────────────────────────────────────────────┐
│ Bonjour, [Nom] 👋                               │
│                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│ │Ventes    │ │Commandes │ │Produits  │ │Wallet││
│ │1,250 TND │ │12 ce mois│ │35/50     │ │430TND││
│ │↑ 12%     │ │↑ 3       │ │utilisés  │ │dispo ││
│ └──────────┘ └──────────┘ └──────────┘ └──────┘│
│                                                  │
│ ── Graphique Ventes (30 jours) ──────────────   │
│ [═══════ Line Chart ═══════════════]            │
│                                                  │
│ ── Commandes Récentes ───────────────────────   │
│ #PD-001 | Client A | 85 TND | En cours     [→] │
│ #PD-002 | Client B | 45 TND | Expédié      [→] │
│ #PD-003 | Client C | 30 TND | En attente   [→] │
└─────────────────────────────────────────────────┘
```

### 3.3 Page Produits

```
┌─────────────────────────────────────────────────┐
│ Produits (35/50)              [+ Ajouter] [Import]│
│                                                  │
│ [Search...] [Catégorie ▾] [Statut ▾]            │
│                                                  │
│ ┌────┬────────────┬──────┬────────┬──────┬─────┐│
│ │ ✓  │ Produit    │ Prix │ Stock  │Statut│ Act ││
│ ├────┼────────────┼──────┼────────┼──────┼─────┤│
│ │ ☐  │[img] Nom 1 │85TND │ 12     │🟢 Pub│ ⋮  ││
│ │ ☐  │[img] Nom 2 │45TND │ 0      │🔴 Rup│ ⋮  ││
│ │ ☐  │[img] Nom 3 │30TND │ 5      │🟡 Dra│ ⋮  ││
│ └────┴────────────┴──────┴────────┴──────┴─────┘│
│                                                  │
│ Affichage 1-20 sur 35  [←] [1] [2] [→]         │
└─────────────────────────────────────────────────┘
```

### 3.4 Page Wallet

```
┌─────────────────────────────────────────────────┐
│ Mon Wallet                                       │
│                                                  │
│ ┌────────────────┐  ┌────────────────┐          │
│ │ Disponible     │  │ En attente     │          │
│ │ 430.500 TND    │  │ 85.000 TND     │          │
│ │ [Retirer →]    │  │ Libéré dans 5j │          │
│ └────────────────┘  └────────────────┘          │
│                                                  │
│ Mode de versement: [Automatique ▾]               │
│                                                  │
│ ── Historique ───────────────────────────────    │
│ 02/05 │ Vente #PD-001     │ +85.000  │ Pending  │
│ 01/05 │ Commission -15%   │ -12.750  │ Déduit   │
│ 28/04 │ Retrait           │ -200.000 │ Effectué │
│ 25/04 │ Vente #PD-098     │ +45.000  │ Dispo    │
└─────────────────────────────────────────────────┘
```

### 3.5 Page Outils IA

```
┌─────────────────────────────────────────────────┐
│ Outils IA                    Tokens: 🪙 42/100  │
│                              [Acheter des tokens]│
│                                                  │
│ ┌─────────────────────┐ ┌─────────────────────┐ │
│ │ 🖼️ Compression       │ │ ✍️ SEO Automatique   │ │
│ │ Image               │ │                     │ │
│ │ Optimisez vos       │ │ Générez titres et   │ │
│ │ photos produit      │ │ descriptions SEO    │ │
│ │                     │ │                     │ │
│ │ [Compresser →]      │ │ [Générer →]         │ │
│ │ 1 token / image     │ │ 2 tokens / produit  │ │
│ └─────────────────────┘ └─────────────────────┘ │
│                                                  │
│ ── Historique des Jobs ──────────────────────    │
│ 02/05 │ Compression │ image.jpg │ ✅ -65%  │ 1🪙│
│ 01/05 │ SEO         │ Produit X │ ✅ Fait  │ 2🪙│
│ 01/05 │ Compression │ photo.png │ ⏳ En cours   │
└─────────────────────────────────────────────────┘
```

### 3.6 Page Vérification KYC

```
┌─────────────────────────────────────────────────┐
│ Vérification de Compte                           │
│                                                  │
│ Statut: 🟡 En attente de vérification           │
│                                                  │
│ Pour publier vos produits instantanément,        │
│ complétez votre vérification:                    │
│                                                  │
│ ☑ 1. Registre de Commerce                       │
│      [📄 RC_document.pdf]  ✅ Uploadé            │
│                                                  │
│ ☑ 2. Carte d'Identité Nationale                 │
│      [📄 CIN_recto.jpg]   ✅ Uploadé            │
│                                                  │
│ ☐ 3. Vérification Téléphonique                  │
│      Notre équipe vous contactera sous 48h       │
│      Tél: [+216 XX XXX XXX]                     │
│                                                  │
│ [Soumettre pour vérification]                    │
└─────────────────────────────────────────────────┘
```

---

## 4. Panel Admin (admin.pandamarket.tn)

### 4.1 Dashboard Admin

```
┌─────────────────────────────────────────────────┐
│ 🐼 Admin PandaMarket                            │
├──────────┬──────────────────────────────────────┤
│ SIDEBAR  │                                      │
│          │ ┌────────┐ ┌────────┐ ┌────────┐    │
│ 📊 Dashboard│ │Vendeurs│ │GMV     │ │Commandes│   │
│ ✅ KYC    │ │142     │ │45K TND │ │328     │   │
│ 💳 Mandats│ │↑8 new  │ │↑12%    │ │↑15 today│  │
│ 📦 Produits│ └────────┘ └────────┘ └────────┘   │
│ 🚨 Reports│                                     │
│ 💰 Finances│── Actions Urgentes ─────────────   │
│ 📋 Plans  │ 🔴 3 KYC en attente          [→]   │
│ 🎨 Thèmes│ 🔴 5 Mandats à valider       [→]   │
│ ⚙️ Config │ 🟡 2 Produits à approuver    [→]   │
│          │ 🟡 1 Signalement ouvert       [→]   │
│          │                                      │
│          │ ── Graphique (30j) ───────────────   │
│          │ [══ Revenue + Inscriptions Chart ══] │
└──────────┴──────────────────────────────────────┘
```

### 4.2 File KYC

```
┌─────────────────────────────────────────────────┐
│ Vérifications KYC (3 en attente)                 │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ BoutiqueX — Soumis il y a 2h             │   │
│ │ Vendeur: Ahmed Ben Ali | +216 98 765 432 │   │
│ │                                           │   │
│ │ RC: [📄 Voir]  CIN: [📄 Voir]            │   │
│ │ Tél vérifié: ☐                           │   │
│ │                                           │   │
│ │ [✅ Approuver]  [❌ Rejeter]  [📞 Appeler]│   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ ShopY — Soumis il y a 1j                 │   │
│ │ ...                                       │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 4.3 File Mandats Minute

```
┌─────────────────────────────────────────────────┐
│ Mandats à Valider (5 en attente)                 │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ Commande #PD-001 | Client: Sami          │   │
│ │ Montant attendu: 85.000 TND              │   │
│ │                                           │   │
│ │ ┌──────────────┐                          │   │
│ │ │ 📷 Photo du  │  Uploadé: il y a 3h     │   │
│ │ │    reçu      │  Par: Acheteur           │   │
│ │ │   (cliquer   │                          │   │
│ │ │    zoom)     │                          │   │
│ │ └──────────────┘                          │   │
│ │                                           │   │
│ │ [✅ Approuver]  [❌ Rejeter: _______ ]    │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 5. Pages Auth

### 5.1 Login / Register

```
┌──────────────────────────────────────┐
│         [🐼 PandaMarket]             │
│                                      │
│   ╔══════════════════════════════╗   │
│   ║  Connexion                   ║   │
│   ║                              ║   │
│   ║  Email:    [____________]    ║   │
│   ║  Mot de passe: [________]   ║   │
│   ║                              ║   │
│   ║  [Se connecter]              ║   │  ← Panda Green CTA
│   ║                              ║   │
│   ║  Mot de passe oublié ?       ║   │
│   ║  ─────── ou ───────          ║   │
│   ║  Pas de compte ?             ║   │
│   ║  [Créer ma boutique →]       ║   │
│   ╚══════════════════════════════╝   │
│                                      │
│   Background: Gradient Panda Black   │
└──────────────────────────────────────┘
```

### 5.2 Inscription Vendeur (Multi-step)

```
Step 1: Infos personnelles   → Email, nom, mot de passe
Step 2: Ma boutique          → Nom boutique, catégorie, sous-domaine
Step 3: Choisir mon plan     → Grille des 7 plans avec comparaison
Step 4: Confirmation         → Récapitulatif + lien vers dashboard
```

---

## 6. Pages Spéciales

### 6.1 Upload Mandat (Client)

```
┌──────────────────────────────────────┐
│ Commande #PD-001 — Paiement Mandat  │
│                                      │
│ Montant à envoyer: 85.000 TND       │
│                                      │
│ Instructions:                        │
│ ┌──────────────────────────────────┐ │
│ │ Destinataire: PandaMarket SARL  │ │
│ │ CIN: XXXXXXXX                   │ │
│ │ Ville: Tunis                    │ │
│ │ Référence: PD-ORDER-001        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Uploadez votre preuve de reçu:       │
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│   📷 Glissez votre photo ici        │
│      ou [Parcourir]                  │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                      │
│ [Envoyer la preuve]                  │
└──────────────────────────────────────┘
```

### 6.2 Page Plans / Pricing

```
┌──────────────────────────────────────────────────────┐
│ Choisissez votre plan                                │
│                                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌══════┐ ┌──────┐       │
│ │Free  │ │Start │ │Regul │ ║ PRO  ║ │Plati │       │
│ │      │ │      │ │      │ ║ Pop! ║ │      │       │
│ │0 TND │ │300/an│ │600/an│ ║2400/a║ │9600/a│       │
│ │      │ │      │ │      │ ║      ║ │      │       │
│ │10prod│ │50prod│ │100   │ ║Illim ║ │Illim │       │
│ │15%   │ │0%    │ │0%    │ ║0%    ║ │0% WL │       │
│ │      │ │      │ │      │ ║      ║ │      │       │
│ │[Choi]│ │[Choi]│ │[Choi]│ ║[Choi]║ │[Choi]│       │
│ └──────┘ └──────┘ └──────┘ └══════┘ └──────┘       │
│                                                      │
│ [Voir la comparaison détaillée ↓]                    │
│ (Tableau complet des features par plan)              │
└──────────────────────────────────────────────────────┘
```

---

## 7. Responsive Notes

| Page | Mobile Adaptation |
| :--- | :--- |
| Hub Homepage | Hero empilé, grille 2 cols, catégories scroll horizontal |
| Recherche | Filtres dans bottom sheet (bouton "Filtrer"), grille 2 cols |
| Produit | Image pleine largeur, infos en dessous, tabs accordéon |
| Panier | Cartes empilées, total sticky en bas |
| Dashboard Vendeur | Sidebar → hamburger menu, stats empilées |
| Admin Panel | Sidebar → hamburger, cartes KYC/mandat pleine largeur |
| Checkout | Steps verticaux, un step visible à la fois |
