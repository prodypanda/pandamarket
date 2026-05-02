# PandaMarket — Task List

## Phase 1 : Core Backend
- [x] Initialiser le backend (Services, DB, Migrations, Workers, Validators)
- [x] Implémenter les logiques métiers (Store, Wallet, Subscription, KYC, Mandat, etc.)
- [ ] Créer l'entrypoint `src/main.ts` et configurer l'application Express
- [ ] Créer les contrôleurs / routes API (`src/api`)
- [ ] Tests unitaires du core backend

## Phase 2 : Multi-Tenant Frontend
- [ ] Créer le projet Next.js (App Router)
- [ ] Implémenter le Middleware de détection hostname (hub vs boutique)
- [ ] Implémenter le système de thèmes
- [ ] Créer 3 thèmes de base (Minimal, Classic, Modern)
- [ ] Dashboard vendeur : Produits, Commandes, Paramètres, Wallet, KYC, IA
- [ ] Configurer Caddy wildcard SSL + sous-domaines dynamiques
- [ ] Support domaines personnalisés
- [ ] Intégrer GrapesJS/Craft.js (Page Builder)
- [ ] Personnalisation (couleurs, logo, favicon)

## Phase 3 : Marketplace Hub & Search
- [ ] Installer et configurer Meilisearch
- [ ] Sync automatique : `published` → index Meilisearch
- [ ] Page d'accueil Hub (hero, catégories, tendances)
- [ ] Recherche instantanée (search-as-you-type)
- [ ] Filtres avancés (catégorie, vendeur, prix)
- [ ] Panier multi-vendeurs + page checkout
- [ ] SEO (meta tags, sitemap, Open Graph)
- [ ] Responsive design mobile-first

## Phase 4 : Paiements Locaux & Shipping
- [ ] Plugin/Service pour Flouci
- [ ] Plugin/Service pour Konnect
- [ ] PaymentProvider manual_mandat + interface upload preuve
- [ ] Interface admin : file de validation Mandat Minute
- [ ] Paiement à la Livraison (COD)
- [ ] Logique Escrow : wallet vendeur + rétention + retrait
- [ ] Logique Paiement Direct (clés API vendeur, plans Pro+)
- [ ] Order Splitting : fulfillments séparés par vendeur
- [ ] Intégration API Aramex + La Poste TN

## Phase 5 : IA & Workers
- [ ] Configurer BullMQ avec workers dédiés
- [ ] Worker : compression d'image via `sharp`
- [ ] Worker : AI SEO via Gemini Pro API
- [ ] Système de tokens (décrément, blocage, achat de packs)
- [ ] Notifications temps réel (WebSocket)
- [ ] Dashboard vendeur : section IA + historique

## Phase 6 : API, Sync & Polish
- [ ] Gestion clés API vendeur (génération/révocation)
- [ ] Import/Export CSV + Excel (stocks)
- [ ] Webhooks sortants (`order.placed`, `stock.updated`)
- [ ] Produits numériques : téléchargements temporaires + clés de licence
- [ ] Documentation API publique (Swagger)
- [ ] Audit de sécurité + tests de charge
- [ ] Polish UI + correction bugs
- [ ] Préparation déploiement production
