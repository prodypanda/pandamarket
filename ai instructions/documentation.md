# PandaMarket — Documentation Technique Complète

> **Version :** 2.0  
> **Dernière mise à jour :** 02 Mai 2026  
> **Type de plateforme :** MaaS (Marketplace as a Service) + SaaS Multi-Tenant  
> **Comparable à :** Shopify (boutiques individuelles) + Amazon (hub central)

---

## 1. Vision du Projet & Architecture Globale

PandaMarket est une plateforme hybride permettant à n'importe quel vendeur de :

1. **Créer sa propre boutique en ligne** avec un sous-domaine gratuit ou un domaine personnalisé (modèle SaaS type Shopify).
2. **Lister automatiquement ses produits** sur un Hub central de découverte (modèle Marketplace type Amazon).

La plateforme supporte la vente de **biens physiques**, **produits numériques** (téléchargements sécurisés + clés de licence) et **services** (commande classique avec livraison de rapport/travail).

### 1.1 Stack Technique

| Couche | Technologie | Rôle |
| :--- | :--- | :--- |
| **Backend Core** | MedusaJS (Node.js, TypeScript) | Moteur e-commerce headless |
| **Base de données** | PostgreSQL | Données relationnelles |
| **Cache & Queues** | Redis | Sessions, cache, files d'attente BullMQ |
| **Frontend** | Next.js (App Router) | Hub central + Storefronts vendeurs |
| **Multi-Tenancy** | Vercel Platforms / Caddy | Wildcard SSL, sous-domaines dynamiques |
| **Recherche** | Meilisearch (auto-hébergé) | Recherche instantanée, typo-tolerant |
| **Tâches Async** | BullMQ | Workers IA, emails, notifications |
| **Stockage** | S3-Compatible (MinIO / Cloudflare R2) | Fichiers, images, preuves de paiement |
| **Page Builder** | GrapesJS ou Craft.js | Éditeur Drag & Drop pour les vendeurs |

### 1.2 Pourquoi MedusaJS ?

- **Architecture Headless** : Backend totalement découplé du frontend — possibilité d'utiliser Next.js, React, ou une app mobile.
- **Extensibilité** : Logique métier via subscribers et services Node.js (pas de plugins rigides comme WooCommerce).
- **Multi-vendeur** : Extension via le starter Mercur pour gérer les entités `Store` liées aux produits.
- **Paiements complexes** : Gestion native de l'order splitting.

### 1.3 Pourquoi Meilisearch ?

- **Ultra-rapide** : Search-as-you-type pour le hub central.
- **Tolérance aux fautes** : Crucial pour les clients qui font des fautes de frappe.
- **Open-source** : Hébergement autonome, contrôle total des données.
- **Intégration facile** avec MedusaJS.

---

## 2. Infrastructure & Multi-Tenancy

### 2.1 Logique de Routage

| Type | Exemple | Description |
| :--- | :--- | :--- |
| **Sous-domaine gratuit** | `vendeur1.pandamarket.tn` | Généré automatiquement à la création du store |
| **Domaine personnalisé** | `ma-boutique.com` | Pointé vers l'IP du serveur par le vendeur |
| **Hub central** | `pandamarket.tn` | Catalogue global agrégé |

### 2.2 Middleware Next.js

Implémenter un middleware qui détecte le `hostname` de la requête :
- Si le hostname est le domaine principal → charger le Hub central.
- Sinon → résoudre le `store_id` correspondant et charger les données de la boutique du vendeur.

### 2.3 Gestion SSL Dynamique

**Caddy** est recommandé pour la génération automatique de certificats SSL « on-the-fly » pour chaque domaine/sous-domaine de vendeur. Alternative : Vercel Platforms.

### 2.4 Moteur de Rendu des Boutiques

Deux modes au choix du vendeur :
1. **Thèmes pré-construits** : Composants dynamiques Next.js. Chaque vendeur choisit un `theme_id` et le frontend charge le layout correspondant. Catalogue de thèmes gratuits et payants.
2. **Page Builder Drag & Drop** : Intégration de GrapesJS ou Craft.js dans le dashboard vendeur pour une personnalisation totale.

---

## 3. Modèle de Données (Extensions MedusaJS)

### 3.1 Table `Store` (Extended)

| Champ | Type | Description |
| :--- | :--- | :--- |
| `status` | enum | `unverified`, `verified`, `suspended` |
| `is_verified` | boolean | Détermine le workflow d'approbation produits |
| `subscription_plan` | enum | `free`, `starter`, `regular`, `agency`, `pro`, `golden`, `platinum` |
| `subscription_type` | enum | `commission`, `yearly` |
| `custom_domain` | string (nullable) | Domaine personnalisé du vendeur |
| `subdomain` | string (unique) | Sous-domaine auto-généré |
| `theme_id` | string | Slug du template sélectionné |
| `settings` | JSONB | Couleurs, logos, configuration UI |
| `payment_config` | JSONB | Clés API personnelles Flouci/Konnect (plans Pro+) |
| `shipping_mode` | enum | `self_managed`, `platform_unified` |

### 3.2 Table `Subscription_Limits`

| Champ | Type | Description |
| :--- | :--- | :--- |
| `plan_id` | string | Référence au plan |
| `max_products` | integer | Nombre max de produits |
| `max_images_per_product` | integer | Nombre max d'images par produit |
| `has_ai_seo` | boolean | Accès aux outils IA SEO |
| `has_image_compression` | boolean | Accès à la compression d'image |
| `has_custom_domain` | boolean | Droit d'utiliser un domaine personnalisé |
| `has_page_builder` | boolean | Accès au Drag & Drop builder |
| `commission_rate` | decimal | Taux de commission (0 pour yearly) |
| `ai_tokens_included` | integer | Jetons IA inclus mensuellement |

### 3.3 Table `Vendor_Wallet`

| Champ | Type | Description |
| :--- | :--- | :--- |
| `store_id` | FK → Store | Référence au vendeur |
| `balance` | decimal | Solde disponible |
| `pending_balance` | decimal | Solde en période de rétention |
| `payout_mode` | enum | `automatic`, `on_demand` |
| `retention_days` | integer | Jours avant libération (dépend du plan) |

### 3.4 Table `Vendor_Credits` (Tokens IA)

| Champ | Type | Description |
| :--- | :--- | :--- |
| `store_id` | FK → Store | Référence au vendeur |
| `ai_tokens` | integer | Compteur de jetons restants |
| `last_refill` | timestamp | Dernière recharge |

### 3.5 Table `Mandat_Proofs`

| Champ | Type | Description |
| :--- | :--- | :--- |
| `order_id` | FK → Order | Commande concernée |
| `uploaded_by` | enum | `buyer`, `vendor` |
| `image_url` | string | URL presigned vers le fichier uploadé |
| `amount_expected` | decimal | Montant attendu |
| `status` | enum | `pending`, `approved`, `rejected` |
| `reviewed_by` | FK → Admin | Admin ayant validé |
| `reviewed_at` | timestamp | Date de validation |

### 3.6 Table `Verification_Documents`

| Champ | Type | Description |
| :--- | :--- | :--- |
| `store_id` | FK → Store | Référence au vendeur |
| `rc_document_url` | string | Registre de commerce uploadé |
| `cin_document_url` | string | CIN uploadée |
| `phone_verified` | boolean | Vérification par appel téléphonique |
| `status` | enum | `pending`, `approved`, `rejected` |

### 3.7 Table `Reports` (Signalement Fraude)

| Champ | Type | Description |
| :--- | :--- | :--- |
| `reporter_id` | FK → Customer | Client qui signale |
| `store_id` | FK → Store | Vendeur signalé |
| `order_id` | FK → Order (nullable) | Commande concernée |
| `reason` | text | Motif du signalement |
| `status` | enum | `open`, `investigating`, `resolved`, `dismissed` |

### 3.8 Table `API_Keys` (Vendeurs)

| Champ | Type | Description |
| :--- | :--- | :--- |
| `store_id` | FK → Store | Référence au vendeur |
| `key_hash` | string | Hash de la clé API |
| `label` | string | Nom donné par le vendeur |
| `scopes` | JSONB | Permissions (products, orders, stock) |
| `is_active` | boolean | Actif/révoqué |

---

## 4. Système de Paiement

### 4.1 Passerelles Supportées

| Passerelle | Type | Intégration |
| :--- | :--- | :--- |
| **Flouci** | Paiement en ligne local | API directe |
| **Konnect** | Paiement en ligne local | API directe |
| **Mandat Minute** | Paiement manuel (hors-ligne) | Upload de preuve + validation admin |
| **Paiement à la livraison (COD)** | Manuel | Confirmation à la réception |

### 4.2 Flux Hybride de Paiement

#### Mode Escrow (Préconfiguré)
1. Le client paie → l'argent arrive sur le compte PandaMarket.
2. La commission est calculée dynamiquement à la capture.
3. Le montant net est crédité dans le `Vendor_Wallet` avec une période de rétention.
4. Le vendeur choisit : retrait automatique (après X jours) ou retrait sur demande.

#### Mode Direct (Pro+)
1. Le vendeur entre ses propres clés API Flouci/Konnect dans son dashboard.
2. MedusaJS instancie le `PaymentProvider` avec les credentials **du vendeur** (et non ceux de la plateforme).
3. L'argent va directement sur le compte du vendeur.

### 4.3 Workflow Mandat Minute (Machine à États)

```
[Checkout] → Client choisit "Mandat Minute"
    ↓
[Commande créée] → Statut: `payment_required` / `awaiting`
    ↓
[Upload] → Client/vendeur uploade photo du reçu (via presigned URL S3)
    ↓
[File Admin] → Notification envoyée à l'admin
    ↓
[Validation] → Admin approuve ou rejette
    ↓
  ✅ Approuvé → Événement `payment.captured` déclenché → Commande débloquée
  ❌ Rejeté → Notification au client → Possibilité de re-uploader
```

Le PaymentProvider `manual_mandat` est à créer comme plugin Medusa.

---

## 5. Logistique & Expédition

### 5.1 Options du Vendeur

1. **Self-managed** : Le vendeur gère sa propre logistique.
2. **Plateforme unifiée** : Intégration API avec Aramex, La Poste TN, etc. Génération automatique de bordereaux d'expédition.

### 5.2 Order Splitting

Quand un client achète chez plusieurs vendeurs dans un seul panier :
- Génération de **Fulfillments séparés** par vendeur.
- **Frais de port séparés** calculés par vendeur.
- **Notifications séparées** par vendeur.
- Comportement **configurable** par l'admin depuis le panel central.

---

## 6. Services IA & Workers Asynchrones

### 6.1 Pipeline de Traitement

```
[Vendeur Upload] → Job ajouté à la file BullMQ (Redis)
    ↓
[Worker Node.js] → Traitement (compression / génération SEO)
    ↓
[Notification] → WebSocket ou Webhook informe le vendeur que c'est prêt
```

### 6.2 Services Disponibles

| Service | Outil | Description |
| :--- | :--- | :--- |
| **Compression d'image** | `sharp` (Node.js) | Optimisation du poids sans perte de qualité |
| **AI SEO** | Gemini Pro API | Génération de titres et méta-descriptions à partir de la photo produit |

### 6.3 Modèle de Consommation

Le vendeur peut choisir entre :
1. **Usage illimité** : Inclus dans certains abonnements (Pro, Golden, Platinum).
2. **Système de jetons** : Chaque action IA décrémente le compteur `ai_tokens`. Les packs de jetons sont achetables séparément.

---

## 7. Vérification & Modération

### 7.1 Processus KYC (Know Your Customer)

| Étape | Description |
| :--- | :--- |
| 1. Dépôt de documents | Registre de Commerce (RC) + Carte d'Identité Nationale (CIN) |
| 2. Vérification téléphonique | Appel téléphonique par l'équipe admin |
| 3. Validation finale | **100% manuelle** par un Super Admin |

### 7.2 Workflow d'Approbation des Produits

- **`vendor.is_verified === false`** → Le produit est créé avec le statut `draft`. Notification envoyée à l'admin pour approbation.
- **`vendor.is_verified === true`** → Le produit passe directement en `published`.

### 7.3 Système de Signalement (Report)

Les clients peuvent signaler un vendeur pour fraude. L'admin dispose d'une interface de gestion des signalements avec suivi du statut.

---

## 8. Synchronisation des Stocks

### 8.1 Import/Export Manuel
- Support des fichiers **CSV** et **Excel**.
- Interface d'upload dans le dashboard vendeur.

### 8.2 API & Webhooks (Vendeurs Pro)

| Fonctionnalité | Description |
| :--- | :--- |
| **API Key Management** | Le vendeur génère des clés API dans son dashboard |
| **Webhooks sortants** | Le système envoie des événements (ex: `order.placed`) à l'ERP du vendeur |
| **Sync temps réel** | Connexion bidirectionnelle avec les logiciels de gestion (ERP/POS) |

---

## 9. Stockage Hybride (S3-Compatible)

### Stratégie

- **Phase initiale** : MinIO auto-hébergé sur un serveur local en Tunisie (rapidité d'accès).
- **Phase scale** : Migration vers AWS S3 ou Cloudflare R2 en changeant uniquement les variables d'environnement (aucune modification de code).

### Cas d'Usage

| Type de fichier | Stockage |
| :--- | :--- |
| Images produits (originales + compressées) | S3-compatible |
| Preuves de Mandat Minute | S3-compatible (presigned URLs) |
| Produits numériques (téléchargements) | S3-compatible (liens temporaires sécurisés) |
| Templates / Assets boutiques | S3-compatible |

---

## 10. Matrice Business Logic (Quotas par Plan)

| Plan | Type | Produits Max | Images/Prod | Commission | Domaine Custom | AI Tools | Page Builder | Paiement Direct |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Free** | Commission | 10 | 2 | 15% | ❌ | ❌ | ❌ | ❌ |
| **Starter** | Annuel | 50 | 5 | 0% | ✅ | Basique | ❌ | ❌ |
| **Regular** | Annuel | 100 | 7 | 0% | ✅ | Basique | ✅ | ❌ |
| **Agency** | Annuel | 300 | 10 | 0% | ✅ | Avancé | ✅ | ❌ |
| **Pro** | Annuel | Illimité | 15 | 0% | ✅ | Illimité | ✅ | ✅ |
| **Golden** | Annuel | Illimité | 20 | 0% | ✅ | Illimité | ✅ | ✅ |
| **Platinum** | Annuel | Illimité | 30 | 0% | ✅ + White Label | Premium | ✅ | ✅ |

---

## 11. Roadmap d'Implémentation

### Phase 1 : Core Backend (Semaine 1-2)
- [ ] Initialiser MedusaJS avec PostgreSQL + Redis.
- [ ] Étendre les modèles `Store`, `Product`, `User` avec les champs additionnels.
- [ ] Créer les tables `Subscription_Limits`, `Vendor_Wallet`, `Vendor_Credits`.
- [ ] Implémenter le système de vérification manuelle (KYC).
- [ ] Créer les tables `Verification_Documents` et `Reports`.

### Phase 2 : Multi-Tenant Frontend (Semaine 3-4)
- [ ] Créer le Storefront Starter en Next.js.
- [ ] Développer le middleware de détection hostname.
- [ ] Implémenter le système de thèmes (chargement dynamique par `theme_id`).
- [ ] Intégrer GrapesJS/Craft.js pour le Page Builder.
- [ ] Configurer Caddy pour le wildcard SSL et les domaines custom.

### Phase 3 : Marketplace Hub & Search (Semaine 5-6)
- [ ] Configurer et déployer Meilisearch.
- [ ] Synchronisation auto : chaque produit `published` est indexé avec son `store_id`.
- [ ] Page d'accueil du Hub avec filtres par catégorie, vendeur, prix.
- [ ] Recherche instantanée (search-as-you-type) avec tolérance aux fautes.

### Phase 4 : Paiements Locaux & Shipping (Semaine 7-8)
- [ ] Développer le plugin Medusa pour Flouci.
- [ ] Développer le plugin Medusa pour Konnect.
- [ ] Implémenter le PaymentProvider `manual_mandat`.
- [ ] Développer l'interface de validation admin pour les Mandats.
- [ ] Implémenter l'Order Splitting (Fulfillments séparés par vendeur).
- [ ] Intégration API Aramex pour les bordereaux.

### Phase 5 : IA & Workers (Semaine 9-10)
- [ ] Configurer BullMQ avec les workers dédiés.
- [ ] Implémenter la compression d'image via `sharp`.
- [ ] Intégrer Gemini Pro API pour le SEO automatique.
- [ ] Développer le système de tokens (crédits IA).
- [ ] Notifications temps réel (WebSocket) pour informer les vendeurs.

### Phase 6 : API Vendeurs & Sync (Semaine 11-12)
- [ ] Système de génération/gestion de clés API pour les vendeurs.
- [ ] Import/Export CSV et Excel pour les stocks.
- [ ] Webhooks sortants (`order.placed`, `stock.updated`, etc.).
- [ ] Documentation API publique pour les intégrations ERP/POS.

---

## 12. Conventions & Sécurité

- **Préfixe API** : Toutes les entités utilisent le préfixe `pd_` (ex: `pd_store_xxx`, `pd_order_xxx`).
- **Uploads sécurisés** : Tous les fichiers sont uploadés via des presigned URLs (jamais d'upload direct).
- **API sécurisées** : Authentification JWT + rate limiting.
- **Données sensibles** : Les clés API vendeurs sont chiffrées en base de données.

---

## 13. Prompt de Départ pour l'Agent IA

> « Tu es un développeur Fullstack Senior. Ton objectif est de bâtir PandaMarket, une plateforme MaaS.
> 1. Utilise MedusaJS en backend.
> 2. Le frontend doit supporter le multi-tenancy via les headers host.
> 3. Implémente un système d'abonnement à 7 niveaux (Free à Platinum) avec des limites strictes sur le nombre de produits et d'images.
> 4. Crée un plugin de paiement pour le 'Mandat Minute' avec upload de preuve et validation admin.
> 5. Implémente un système de paiement hybride (Escrow + Direct) avec wallet vendeur.
> 6. Utilise BullMQ pour traiter l'optimisation d'image (sharp) et le SEO via IA (Gemini Pro) en arrière-plan.
> 7. Crée un système de tokens IA avec consommation par action.
> 8. Implémente la vérification KYC manuelle (RC + CIN + appel téléphonique).
> 9. Toutes les API doivent être sécurisées et respecter les normes de préfixage (ex: `pd_` pour Panda).
> Commence par générer le schéma Prisma/TypeORM pour les extensions de modèles demandées. »
