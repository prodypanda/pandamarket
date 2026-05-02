# PandaMarket — Glossaire

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## Termes Métier

| Terme | Définition | Alias à Éviter |
| :--- | :--- | :--- |
| **Hub** | Le portail central PandaMarket qui agrège tous les produits de tous les vendeurs (type Amazon) | Marketplace, Catalogue global |
| **Store** | La boutique individuelle d'un vendeur avec son propre sous-domaine/domaine | Boutique, Shop, Storefront |
| **Vendor** | Un utilisateur qui vend des produits/services sur la plateforme | Seller, Marchant, Merchant |
| **Customer** | Un utilisateur qui achète des produits sur le Hub ou une boutique | Acheteur, Buyer, Client |
| **Super Admin** | L'administrateur de la plateforme PandaMarket (pas un vendeur) | Admin, Platform Admin |
| **Plan** | Le niveau d'abonnement d'un vendeur (Free, Starter...Platinum) | Subscription, Tier, Niveau |
| **Commission** | Le pourcentage prélevé par PandaMarket sur chaque vente (plan Free) | Frais, Fee, Take rate |
| **Wallet** | Le portefeuille virtuel du vendeur contenant ses revenus | Balance, Solde, Account |
| **Payout** | Le versement des fonds du wallet vers le compte réel du vendeur | Retrait, Withdrawal, Virement |
| **Retention** | La période d'attente avant que les fonds deviennent disponibles | Holding, Freeze, Lock |
| **Escrow** | Mode où PandaMarket collecte l'argent puis reverse au vendeur | Mode préconfiguré, Agrégé |
| **Direct Payment** | Mode où l'argent va directement sur le compte du vendeur (Pro+) | Paiement direct, Pass-through |
| **KYC** | Know Your Customer — processus de vérification d'identité du vendeur | Vérification, Identity check |
| **Verified Vendor** | Vendeur ayant passé le KYC avec succès | Vendeur vérifié, Approved vendor |
| **Order Splitting** | Séparation d'une commande multi-vendeurs en fulfillments distincts | Split, Séparation |
| **Fulfillment** | L'expédition et la livraison d'une partie de la commande | Livraison, Shipment |
| **Mandat Minute** | Mode de paiement hors-ligne tunisien (preuve uploadée manuellement) | Mandat, Manual payment |
| **COD** | Cash On Delivery — Paiement à la livraison | Paiement à la livraison |
| **Token (IA)** | Crédit consommé pour chaque action IA (compression, SEO) | Jeton, Credit |
| **Theme** | Template de design pour la boutique d'un vendeur | Template, Thème, Skin |
| **Page Builder** | Éditeur visuel Drag & Drop pour personnaliser les pages | Builder, Editor |
| **Report** | Signalement de fraude par un client contre un vendeur | Signalement, Flag, Complaint |
| **Add-on** | Option payante achetable séparément (tokens IA, thèmes premium) | Option, Extra, Module |
| **White Label** | Suppression du branding PandaMarket sur la boutique (Platinum) | Marque blanche |

---

## Termes Techniques

| Terme | Définition |
| :--- | :--- |
| **MedusaJS** | Framework backend e-commerce headless open-source (Node.js) |
| **Headless** | Architecture où le backend (API) est découplé du frontend |
| **Multi-Tenant** | Architecture où une seule instance sert plusieurs boutiques isolées |
| **Middleware** | Fonction interceptant les requêtes HTTP (ici : détection hostname) |
| **Presigned URL** | URL temporaire signée permettant un upload/download sécurisé vers S3 |
| **BullMQ** | Système de files d'attente (queues) basé sur Redis pour Node.js |
| **Worker** | Processus Node.js dédié au traitement des jobs en arrière-plan |
| **Subscriber** | Handler MedusaJS qui écoute les événements internes (event bus) |
| **Webhook** | Notification HTTP automatique envoyée à une URL lors d'un événement |
| **HMAC** | Hash-based Message Authentication Code — signature des webhooks |
| **Meilisearch** | Moteur de recherche open-source ultra-rapide avec tolérance aux fautes |
| **MinIO** | Serveur de stockage S3-compatible auto-hébergé |
| **Caddy** | Serveur web / reverse proxy avec SSL automatique |
| **Wildcard SSL** | Certificat SSL couvrant tous les sous-domaines (*.pandamarket.tn) |

---

## Préfixes & Conventions de Nommage

| Préfixe | Usage | Exemple |
| :--- | :--- | :--- |
| `pd_` | ID des entités en BDD | `pd_store_a1b2c3` |
| `PD_` | Variables d'environnement | `PD_DATABASE_URL` |
| `/api/pd/` | Routes API | `/api/pd/stores` |
| `pd.` | Événements internes | `pd.order.placed` |
| `X-PD-` | Headers HTTP custom | `X-PD-Signature` |

---

## Statuts & États

### Store Status

| Valeur | Signification |
| :--- | :--- |
| `unverified` | KYC non soumis ou en attente |
| `verified` | KYC approuvé par l'admin |
| `suspended` | Compte désactivé par l'admin |

### Order Status

| Valeur | Signification |
| :--- | :--- |
| `payment_required` | En attente de paiement (Mandat/COD) |
| `pending` | Paiement reçu, en attente de traitement |
| `processing` | En cours de préparation |
| `fulfilled` | Expédié |
| `delivered` | Livré |
| `cancelled` | Annulé |
| `refunded` | Remboursé |

### Mandat Status

| Valeur | Signification |
| :--- | :--- |
| `pending` | Preuve uploadée, en attente de validation |
| `approved` | Validé par l'admin |
| `rejected` | Rejeté par l'admin |

### KYC Status

| Valeur | Signification |
| :--- | :--- |
| `pending` | Documents soumis, en attente |
| `approved` | Vérifié et approuvé |
| `rejected` | Refusé (avec motif) |

### Report Status

| Valeur | Signification |
| :--- | :--- |
| `open` | Signalement reçu |
| `investigating` | En cours d'investigation |
| `resolved` | Traité et résolu |
| `dismissed` | Classé sans suite |
