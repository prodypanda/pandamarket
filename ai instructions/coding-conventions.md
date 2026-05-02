# PandaMarket — Conventions de Code

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Git Workflow

### 1.1 Stratégie de Branches

```
main ─────────────────────────────────────────── Production
  │
  └── develop ────────────────────────────────── Intégration
        │
        ├── feature/PD-001-store-model ────────── Nouvelles fonctionnalités
        ├── fix/PD-015-wallet-balance ──────────── Corrections de bugs
        ├── hotfix/PD-020-payment-crash ────────── Correctifs urgents (→ main)
        └── chore/update-dependencies ──────────── Maintenance
```

### 1.2 Nommage des Branches

```
<type>/<ticket-id>-<description-courte>
```

| Type | Usage | Exemple |
| :--- | :--- | :--- |
| `feature/` | Nouvelle fonctionnalité | `feature/PD-001-store-model` |
| `fix/` | Correction de bug | `fix/PD-015-wallet-rounding` |
| `hotfix/` | Correctif urgent (prod) | `hotfix/PD-020-payment-crash` |
| `chore/` | Maintenance, refactoring | `chore/update-medusa-v2` |
| `docs/` | Documentation uniquement | `docs/api-endpoints-update` |

### 1.3 Messages de Commit

Format **Conventional Commits** :

```
<type>(<scope>): <description>

[body optionnel]

[footer optionnel]
```

| Type | Usage |
| :--- | :--- |
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage (pas de changement de logique) |
| `refactor` | Refactoring (pas de nouvelle fonctionnalité ni fix) |
| `test` | Ajout ou modification de tests |
| `chore` | Build, CI, dépendances |
| `perf` | Amélioration de performance |

**Exemples :**

```
feat(store): add subscription plan validation
fix(wallet): correct balance rounding for TND
docs(api): update payment endpoints documentation
refactor(auth): extract JWT logic into service
test(kyc): add unit tests for verification flow
```

### 1.4 Pull Requests

- Titre : même format que le commit principal.
- Description : quoi, pourquoi, et comment tester.
- **Minimum 1 review** avant merge.
- Squash merge vers `develop`, merge commit vers `main`.
- Supprimer la branche après merge.

---

## 2. Structure du Code

### 2.1 Backend (MedusaJS)

```
backend/src/
├── api/                    # Routes API custom
│   ├── routes/
│   │   ├── store/          # /api/pd/stores
│   │   ├── wallet/         # /api/pd/wallet
│   │   ├── verification/   # /api/pd/verification
│   │   └── admin/          # /api/pd/admin/*
│   └── middlewares/        # Auth, rate-limit, validation
│
├── models/                 # Entités TypeORM étendues
│   ├── store.ts
│   ├── vendor-wallet.ts
│   ├── vendor-credits.ts
│   └── mandat-proof.ts
│
├── services/               # Logique métier
│   ├── store.ts
│   ├── wallet.ts
│   ├── kyc.ts
│   ├── ai-processor.ts
│   └── payment-flouci.ts
│
├── subscribers/            # Event handlers
│   ├── order-placed.ts
│   ├── payment-captured.ts
│   └── product-created.ts
│
├── workers/                # BullMQ workers
│   ├── image-compression.worker.ts
│   └── seo-generation.worker.ts
│
├── plugins/                # Plugins Medusa
│   ├── flouci/
│   ├── konnect/
│   └── manual-mandat/
│
├── validators/             # Schémas Zod
│   ├── store.validator.ts
│   └── product.validator.ts
│
└── utils/                  # Utilitaires partagés
    ├── crypto.ts           # Chiffrement AES
    ├── s3.ts               # Upload presigned URLs
    └── constants.ts        # Constantes globales
```

### 2.2 Frontend (Next.js)

```
frontend/
├── app/
│   ├── (hub)/              # Pages Hub central
│   │   ├── page.tsx        # Homepage
│   │   ├── search/
│   │   └── product/[id]/
│   │
│   ├── (store)/            # Pages Storefront vendeur
│   │   ├── page.tsx
│   │   └── product/[id]/
│   │
│   ├── (dashboard)/        # Dashboard vendeur
│   │   ├── products/
│   │   ├── orders/
│   │   ├── wallet/
│   │   ├── settings/
│   │   └── ai-tools/
│   │
│   ├── (admin)/            # Panel admin
│   │   ├── verifications/
│   │   ├── mandats/
│   │   ├── reports/
│   │   └── plans/
│   │
│   └── layout.tsx
│
├── components/
│   ├── ui/                 # Composants atomiques (Button, Input, Badge)
│   ├── hub/                # Composants spécifiques au Hub
│   ├── store/              # Composants storefront
│   ├── dashboard/          # Composants dashboard
│   └── shared/             # Composants partagés (Navbar, Footer)
│
├── lib/
│   ├── api.ts              # Client API Medusa
│   ├── auth.ts             # Helpers auth
│   └── utils.ts            # Fonctions utilitaires
│
├── hooks/                  # Custom React hooks
│   ├── use-store.ts
│   ├── use-cart.ts
│   └── use-auth.ts
│
├── themes/                 # Templates de boutique
│   ├── minimal/
│   ├── classic/
│   └── modern/
│
├── styles/
│   ├── globals.css         # Variables CSS, reset, design tokens
│   └── themes.css          # Variantes de thème
│
└── middleware.ts            # Détection hostname
```

---

## 3. Conventions de Nommage

### 3.1 Fichiers & Dossiers

| Type | Convention | Exemple |
| :--- | :--- | :--- |
| Composants React | PascalCase | `ProductCard.tsx` |
| Pages Next.js | kebab-case (convention Next) | `page.tsx`, `layout.tsx` |
| Services backend | kebab-case | `vendor-wallet.ts` |
| Modèles | kebab-case | `mandat-proof.ts` |
| Utilitaires | kebab-case | `crypto.ts` |
| Tests | `.test.ts` ou `.spec.ts` | `wallet.service.test.ts` |
| Types/Interfaces | kebab-case fichier, PascalCase export | `store.types.ts` → `IStore` |

### 3.2 Code TypeScript

| Élément | Convention | Exemple |
| :--- | :--- | :--- |
| Variables | camelCase | `walletBalance` |
| Constantes | SCREAMING_SNAKE | `MAX_PRODUCTS_FREE` |
| Fonctions | camelCase | `calculateCommission()` |
| Classes | PascalCase | `WalletService` |
| Interfaces | PascalCase avec I prefix | `IStoreConfig` |
| Types | PascalCase | `SubscriptionPlan` |
| Enums | PascalCase + PascalCase membres | `StoreStatus.Verified` |
| Événements | dot.notation | `pd.order.placed` |
| BDD colonnes | snake_case | `subscription_plan` |

### 3.3 Préfixe Global

- **Toutes les entités** : préfixe `pd_` (ex: `pd_store_abc123`).
- **Variables d'env** : préfixe `PD_` (ex: `PD_DATABASE_URL`).
- **Routes API** : préfixe `/api/pd/`.
- **Events** : préfixe `pd.` (ex: `pd.payment.captured`).

---

## 4. Règles de Code

### 4.1 TypeScript Strict

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 4.2 ESLint & Prettier

```json
// .eslintrc
{
  "extends": ["next/core-web-vitals", "prettier"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "prefer-const": "error"
  }
}

// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100
}
```

### 4.3 Règles Générales

- **Pas de `any`** : Toujours typer explicitement.
- **Pas de `console.log`** en production : Utiliser un logger structuré (Winston/Pino).
- **Pas de secrets dans le code** : Toujours via `process.env`.
- **Fonctions courtes** : Maximum ~50 lignes par fonction.
- **Commentaires** : Expliquer le *pourquoi*, pas le *quoi*.
- **Erreurs** : Toujours utiliser des classes d'erreur custom (`PdNotFoundError`, `PdQuotaExceededError`).

---

## 5. Gestion des Erreurs

### 5.1 Classes d'Erreur Custom

```typescript
// Hiérarchie
PdError (base)
├── PdValidationError     // 400 - Input invalide
├── PdAuthenticationError // 401 - Non authentifié
├── PdForbiddenError      // 403 - Pas les permissions
├── PdNotFoundError       // 404 - Ressource introuvable
├── PdQuotaExceededError  // 403 - Limite du plan atteinte
├── PdConflictError       // 409 - Conflit (domaine déjà pris)
├── PdRateLimitError      // 429 - Trop de requêtes
└── PdInternalError       // 500 - Erreur serveur
```

### 5.2 Format de Réponse Erreur

```json
{
  "error": {
    "code": "PD_QUOTA_EXCEEDED",
    "message": "Vous avez atteint la limite de 50 produits pour le plan Starter.",
    "details": {
      "current": 50,
      "limit": 50,
      "plan": "starter"
    }
  }
}
```
