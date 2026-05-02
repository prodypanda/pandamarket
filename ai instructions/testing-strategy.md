# PandaMarket — Stratégie de Tests

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Approche Générale

| Niveau | Outil | Couverture Cible | Quand |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | Vitest | 80% services backend | À chaque commit |
| **Integration Tests** | Vitest + Supertest | Endpoints API critiques | À chaque PR |
| **E2E Tests** | Playwright | Parcours utilisateur clés | Avant chaque merge → main |
| **Load Tests** | k6 | Endpoints de recherche + checkout | Phase 6 (pré-lancement) |

---

## 2. Tests Unitaires (Backend)

### 2.1 Services à Tester en Priorité

| Service | Tests Critiques |
| :--- | :--- |
| `WalletService` | Calcul commission, balance update, rétention, retrait |
| `SubscriptionService` | Vérification quotas (produits max, images max), upgrade/downgrade |
| `KycService` | Transition de statuts (pending → approved/rejected), is_verified flag |
| `PaymentService` | Routing Escrow vs Direct, calcul commission par plan |
| `CreditService` | Décrément tokens, blocage si solde = 0, plans illimités bypass |
| `ProductService` | Statut draft vs published selon is_verified, limites plan |

### 2.2 Exemples de Cas de Test

```
WalletService
  ├── calculateCommission()
  │   ├── ✓ retourne 15% pour plan Free
  │   ├── ✓ retourne 0% pour plans Yearly
  │   └── ✓ gère correctement les arrondis TND (3 décimales)
  │
  ├── creditWallet()
  │   ├── ✓ ajoute au pending_balance
  │   ├── ✓ crée une wallet_transaction
  │   └── ✓ échoue si wallet n'existe pas
  │
  └── processWithdrawal()
      ├── ✓ transfère de balance vers total_withdrawn
      ├── ✓ échoue si montant > balance disponible
      └── ✓ échoue si pending_balance non libéré

SubscriptionService
  ├── canCreateProduct()
  │   ├── ✓ autorise si count < max_products
  │   ├── ✓ bloque si count >= max_products
  │   └── ✓ autorise toujours pour plans illimités (Pro+)
  │
  └── canUploadImage()
      ├── ✓ autorise si count < max_images_per_product
      └── ✓ bloque si count >= max_images_per_product
```

### 2.3 Configuration Vitest

```typescript
// vitest.config.ts
export default {
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: { lines: 80, branches: 75 }
    }
  }
};
```

---

## 3. Tests d'Intégration (API)

### 3.1 Endpoints Critiques à Tester

| Endpoint | Scénarios |
| :--- | :--- |
| `POST /auth/register` | Inscription réussie, email dupliqué, validation champs |
| `POST /products` | Création réussie, quota dépassé, vendeur non-auth |
| `POST /payments/flouci/init` | Init réussi, montant invalide, commande inexistante |
| `POST /payments/mandat/upload` | Upload réussi, fichier trop gros, type invalide |
| `PUT /admin/verifications/:id/approve` | Approbation réussie, accès non-admin refusé |
| `POST /wallet/withdraw` | Retrait réussi, solde insuffisant, montant négatif |
| `GET /search?q=...` | Résultats pertinents, filtres, pagination, query vide |

### 3.2 Setup Test

```typescript
// Utiliser une BDD PostgreSQL de test (Docker)
// Seed avant chaque suite, cleanup après
beforeAll(async () => {
  await seedTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
});
```

---

## 4. Tests E2E (Playwright)

### 4.1 Parcours Critiques

| ID | Parcours | Priorité |
| :--- | :--- | :--- |
| E2E-01 | Inscription vendeur → Choix plan → Création boutique | P0 |
| E2E-02 | Vendeur ajoute un produit → Visible sur le Hub | P0 |
| E2E-03 | Client recherche → Ajoute au panier → Checkout Flouci | P0 |
| E2E-04 | Client paie par Mandat → Upload preuve → Admin approuve | P0 |
| E2E-05 | Vendeur soumet KYC → Admin approuve → Badge vérifié | P0 |
| E2E-06 | Vendeur non-vérifié crée produit → Admin approuve → Publié | P0 |
| E2E-07 | Panier multi-vendeurs → Fulfillments séparés | P1 |
| E2E-08 | Vendeur utilise IA SEO → Résultat affiché | P1 |
| E2E-09 | Client visite boutique vendeur via sous-domaine | P0 |
| E2E-10 | Vendeur consulte wallet → Demande retrait | P1 |

### 4.2 Configuration Playwright

```typescript
// playwright.config.ts
export default {
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
};
```

---

## 5. Tests de Charge (k6)

### 5.1 Scénarios

| Scénario | VUs | Durée | Seuil |
| :--- | :--- | :--- | :--- |
| Recherche Hub (Meilisearch) | 100 | 5 min | p95 < 100ms |
| Page produit | 50 | 5 min | p95 < 200ms |
| Checkout + paiement | 20 | 5 min | p95 < 500ms |
| API vendeur (CRUD produits) | 30 | 5 min | p95 < 300ms |

### 5.2 Exécution

```bash
# Installer k6
# Lancer le test de charge
k6 run --vus 100 --duration 5m tests/load/search.js
```

---

## 6. CI/CD Pipeline

```
Push/PR → GitHub Actions
    │
    ├── 1. Lint (ESLint + Prettier check)
    ├── 2. Type Check (tsc --noEmit)
    ├── 3. Unit Tests (vitest --coverage)
    ├── 4. Integration Tests (vitest + supertest + Docker DB)
    ├── 5. Build (next build + medusa build)
    │
    └── Merge → main
         │
         ├── 6. E2E Tests (Playwright)
         ├── 7. Deploy staging
         └── 8. Deploy production (manual trigger)
```

---

## 7. Conventions de Test

- **Nommage** : `[service-name].test.ts` ou `[service-name].spec.ts`
- **Structure** : `describe` → `it` → `expect` (AAA pattern : Arrange, Act, Assert)
- **Isolation** : Chaque test est indépendant (pas d'état partagé entre tests)
- **Mocking** : Mocker les services externes (Flouci, Konnect, Gemini), jamais la BDD pour les tests d'intégration
- **Données** : Utiliser des factories pour générer les données de test
