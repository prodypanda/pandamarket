# PandaMarket — Architecture Technique

> **Version :** 1.1 | **Date :** 06 Mai 2026

---

## 1. Vue d'Ensemble de l'Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS (Browsers)                       │
│        Acheteurs  |  Vendeurs  |  Super Admin                   │
└────────────┬──────────────┬──────────────┬──────────────────────┘
             │              │              │
             ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 REVERSE PROXY (Caddy)                            │
│   Wildcard SSL  |  Sous-domaines  |  Domaines Custom            │
│   *.pandamarket.tn  |  ma-boutique.com  |  pandamarket.tn       │
└────────────┬──────────────┬──────────────┬──────────────────────┘
             │              │              │
             ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS (App Router)                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐             │
│  │ Hub Page │  │ Storefront   │  │ Admin Panel   │             │
│  │ Central  │  │ (par vendeur)│  │ (Super Admin) │             │
│  └──────────┘  └──────────────┘  └───────────────┘             │
│        Middleware hostname → routing dynamique                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ API REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MEDUSAJS (Node.js)                           │
│  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ Stores    │ │ Products  │ │ Orders     │ │ Payments      │  │
│  │ Service   │ │ Service   │ │ Service    │ │ Service       │  │
│  └───────────┘ └───────────┘ └────────────┘ └───────────────┘  │
│  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ KYC       │ │ Wallet    │ │ Credits    │ │ Webhooks      │  │
│  │ Service   │ │ Service   │ │ Service    │ │ Service       │  │
│  └───────────┘ └───────────┘ └────────────┘ └───────────────┘  │
└──────┬──────────────┬──────────────┬────────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────────────┐
│ PostgreSQL │ │   Redis    │ │   Meilisearch      │
│ (Données)  │ │ (Cache +   │ │ (Recherche Hub)    │
│            │ │  BullMQ)   │ │                    │
└────────────┘ └─────┬──────┘ └────────────────────┘
                     │
                     ▼
              ┌────────────┐     ┌──────────────────┐
              │  BullMQ    │────▶│  S3-Compatible   │
              │  Workers   │     │  (MinIO / R2)    │
              │ (IA, Email)│     │  Fichiers/Images │
              └────────────┘     └──────────────────┘
```

---

## 2. Routage Multi-Tenant

### Middleware Next.js

```
Request entrant
    │
    ▼
hostname === "pandamarket.tn"?
    ├── OUI → Charger le Hub Central (catalogue global)
    │
    ├── hostname === "admin.pandamarket.tn"?
    │   └── OUI → Charger le Panel Admin
    │
    └── NON → Résoudre le store_id via :
              1. Table `Store.subdomain` (ex: boutique1.pandamarket.tn)
              2. Table `Store.custom_domain` (ex: ma-boutique.com)
              └── Charger le Storefront du vendeur avec son theme_id
```

### Notes d'implémentation actuelles

- Le domaine central reste propriétaire du Hub et des pages marketplace.
- Les vrais sous-domaines/domaines storefront sont réécrits par `frontend/src/middleware.ts` vers `/store/[storeHost]`.
- `frontend/src/lib/store-hosts.ts` et `frontend/src/lib/store-routing.ts` séparent le comportement central `/store/:storeHost` du comportement storefront réel.
- Les liens internes storefront doivent rester relatifs (`/`, `/cart`, `/checkout`) quand ils ciblent un vrai sous-domaine.
- Les pages storefront de niveau route utilisent maintenant les couleurs/polices du thème sélectionné, même lorsqu'elles ne passent pas par un composant de thème.

---

## 3. Flux de Paiement

### Mode Escrow

```
Client paie (Flouci/Konnect)
    │
    ▼
Argent → Compte PandaMarket
    │
    ▼
Commission calculée (selon plan vendeur)
    │
    ▼
Montant net → Vendor_Wallet (pending_balance)
    │
    ▼
Après X jours de rétention → balance disponible
    │
    ├── payout_mode = "automatic" → Virement auto
    └── payout_mode = "on_demand" → Vendeur demande retrait
```

### Mode Direct (Pro+)

```
Client paie (Flouci/Konnect)
    │
    ▼
PaymentProvider instancié avec clés API du VENDEUR
    │
    ▼
Argent → Directement sur le compte du vendeur
```

### Mandat Minute

```
Client choisit "Mandat Minute"
    │
    ▼
Commande créée → statut: payment_required
    │
    ▼
Client uploade preuve (presigned URL → S3)
    │
    ▼
Admin notifié → File de validation
    │
    ├── ✅ Approuvé → payment.captured → Commande débloquée
    └── ❌ Rejeté → Notification client → Re-upload possible
```

---

## 4. Pipeline IA Asynchrone

```
Vendeur uploade image / demande SEO
    │
    ▼
Vérification crédit (ai_tokens > 0 OU plan illimité?)
    │
    ├── NON → Erreur "Crédits insuffisants"
    │
    └── OUI → Job ajouté à BullMQ
              │
              ▼
         Worker traite le job :
         ├── Compression → sharp
         └── SEO → Gemini Pro API
              │
              ▼
         Résultat stocké → S3
              │
              ▼
         ai_tokens décrémenté
              │
              ▼
         Notification WebSocket → Vendeur informé
```

---

## 5. Stack Détaillée

| Composant | Technologie | Justification |
| :--- | :--- | :--- |
| **Backend** | MedusaJS (Node.js, TS) | Headless e-commerce, extensible via services/subscribers |
| **Frontend** | Next.js (App Router) | SSR pour SEO, middleware pour multi-tenancy |
| **BDD** | PostgreSQL | Robuste, supporte JSONB pour configs flexibles |
| **Cache/Queues** | Redis + BullMQ | Performant, natif Node.js, fiable |
| **Recherche** | Meilisearch | Ultra-rapide, typo-tolerant, open-source, auto-hébergeable |
| **Stockage** | MinIO → Cloudflare R2 | S3-compatible, migration sans code, local → cloud |
| **Proxy** | Caddy | SSL automatique on-the-fly, plus simple que Nginx |
| **Page Builder** | GrapesJS / Craft.js | Open-source, intégrable dans le dashboard vendeur |
| **IA Compression** | sharp | Rapide, léger, natif Node.js |
| **IA SEO** | Gemini Pro API | Génération texte de qualité à partir d'images |

---

## 6. Structure des Répertoires (Proposée)

```
pandamarket/
├── backend/                    # MedusaJS
│   ├── src/
│   │   ├── models/             # Modèles étendus (Store, Wallet, Credits...)
│   │   ├── services/           # Logique métier
│   │   ├── subscribers/        # Event handlers
│   │   ├── api/                # Routes API custom
│   │   ├── plugins/            # Plugins paiement (Flouci, Konnect, Mandat)
│   │   └── workers/            # BullMQ workers (IA, emails)
│   ├── medusa-config.js
│   └── package.json
│
├── frontend/                   # Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── hub/            # Pages du Hub central
│   │   │   ├── store/          # Pages storefront + central /store
│   │   │   ├── hub/dashboard/  # Dashboard vendeur
│   │   │   └── (admin)/        # Pages admin
│   │   ├── components/
│   │   │   ├── hub/            # Composants marketplace
│   │   │   ├── store/          # Composants storefront/cart partagés
│   │   │   └── themes/         # Templates de boutique
│   │   ├── contexts/           # Contextes React
│   │   ├── hooks/              # Hooks React
│   │   ├── lib/                # Helpers themes, routing, marketplace
│   │   └── middleware.ts       # Détection hostname
│   └── package.json
│
├── docker-compose.yml           # PostgreSQL, Redis, Meilisearch, MinIO
├── Caddyfile                    # Config reverse proxy
└── docs/                        # Documentation
```

---

## 7. Conventions de Nommage

| Élément | Convention | Exemple |
| :--- | :--- | :--- |
| Entités BDD | Préfixe `pd_` | `pd_store_abc123` |
| Routes API | `/api/pd/...` | `/api/pd/stores`, `/api/pd/wallets` |
| Events | `snake_case` | `pd.order.placed`, `pd.payment.captured` |
| Env variables | `PD_` prefix | `PD_DATABASE_URL`, `PD_REDIS_URL` |
