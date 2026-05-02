# PandaMarket — Matrice des Permissions (RBAC)

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## Légende

| Symbole | Signification |
| :--- | :--- |
| ✅ | Accès autorisé |
| ❌ | Accès refusé |
| 🔒 | Accès limité (propres données uniquement) |
| 💎 | Accès conditionnel (dépend du plan) |

---

## 1. Authentification

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `POST /auth/register` | ✅ | ✅ | ✅ | ❌ |
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/refresh` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/logout` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/forgot-password` | ✅ | ✅ | ✅ | ✅ |

## 2. Stores

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `GET /stores` | ✅ | ✅ | ✅ | ✅ |
| `GET /stores/:id` | ✅ | ✅ | ✅ | ✅ |
| `POST /stores` | ❌ | ✅ | ✅ | ✅ |
| `PUT /stores/:id` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `PUT /stores/:id/theme` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `PUT /stores/:id/settings` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `PUT /stores/:id/payment-config` | ❌ | 💎 Pro+ | 💎 Pro+ | ✅ |

## 3. Produits

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `GET /products` | ✅ | ✅ | ✅ | ✅ |
| `GET /products/:id` | ✅ | ✅ | ✅ | ✅ |
| `POST /products` | ❌ | 🔒 → draft | 🔒 → published | ✅ |
| `PUT /products/:id` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `DELETE /products/:id` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `POST /products/:id/images` | ❌ | 🔒 Own 💎 | 🔒 Own 💎 | ✅ |
| `POST /products/import` | ❌ | ✅ | ✅ | ✅ |
| `GET /products/export` | ❌ | 🔒 Own | 🔒 Own | ✅ |

## 4. Commandes

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `GET /orders` | 🔒 Own | 🔒 Store | 🔒 Store | ✅ |
| `GET /orders/:id` | 🔒 Own | 🔒 Store | 🔒 Store | ✅ |
| `POST /orders` | ✅ | ❌ | ❌ | ❌ |
| `PUT /orders/:id/fulfill` | ❌ | 🔒 Store | 🔒 Store | ✅ |
| `PUT /orders/:id/cancel` | 🔒 Own | 🔒 Store | 🔒 Store | ✅ |

## 5. Paiements

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `POST /payments/flouci/init` | ✅ | ❌ | ❌ | ❌ |
| `POST /payments/konnect/init` | ✅ | ❌ | ❌ | ❌ |
| `POST /payments/mandat/upload` | ✅ | ✅ | ✅ | ❌ |
| `GET /payments/mandat/pending` | ❌ | ❌ | ❌ | ✅ |
| `PUT /payments/mandat/:id/approve` | ❌ | ❌ | ❌ | ✅ |
| `PUT /payments/mandat/:id/reject` | ❌ | ❌ | ❌ | ✅ |

## 6. Wallet

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `GET /wallet` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `GET /wallet/transactions` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `POST /wallet/withdraw` | ❌ | 🔒 Own | 🔒 Own | ❌ |
| `PUT /wallet/payout-mode` | ❌ | 🔒 Own | 🔒 Own | ❌ |

## 7. Abonnements

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `GET /subscriptions/plans` | ✅ | ✅ | ✅ | ✅ |
| `GET /subscriptions/current` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `POST /subscriptions/upgrade` | ❌ | ✅ | ✅ | ✅ |
| `POST /subscriptions/downgrade` | ❌ | ✅ | ✅ | ✅ |

## 8. KYC

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `POST /verification/documents` | ❌ | ✅ | ❌ | ❌ |
| `GET /verification/status` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `GET /admin/verifications/pending` | ❌ | ❌ | ❌ | ✅ |
| `PUT /admin/verifications/:id/approve` | ❌ | ❌ | ❌ | ✅ |
| `PUT /admin/verifications/:id/reject` | ❌ | ❌ | ❌ | ✅ |

## 9. IA & Crédits

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `GET /credits` | ❌ | 🔒 Own | 🔒 Own | ✅ |
| `POST /credits/purchase` | ❌ | ✅ | ✅ | ❌ |
| `POST /ai/compress` | ❌ | 💎 Tokens/Plan | 💎 Tokens/Plan | ❌ |
| `POST /ai/seo-generate` | ❌ | 💎 Tokens/Plan | 💎 Tokens/Plan | ❌ |
| `GET /ai/jobs/:id` | ❌ | 🔒 Own | 🔒 Own | ✅ |

## 10. Signalements

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `POST /reports` | ✅ | ❌ | ❌ | ❌ |
| `GET /admin/reports` | ❌ | ❌ | ❌ | ✅ |
| `PUT /admin/reports/:id/status` | ❌ | ❌ | ❌ | ✅ |

## 11. API Vendeur (Externe)

| Endpoint | Customer | Vendor | Vendor Verified | Admin | API Key |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /vendor/products` | ❌ | ❌ | ❌ | ❌ | 🔒 Scope |
| `PUT /vendor/products/:id/stock` | ❌ | ❌ | ❌ | ❌ | 🔒 Scope |
| `GET /vendor/orders` | ❌ | ❌ | ❌ | ❌ | 🔒 Scope |
| `POST /vendor/api-keys` | ❌ | 💎 Agency+ | 💎 Agency+ | ✅ | ❌ |
| `DELETE /vendor/api-keys/:id` | ❌ | 🔒 Own | 🔒 Own | ✅ | ❌ |

## 12. Recherche

| Endpoint | Customer | Vendor | Vendor Verified | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `GET /search` | ✅ | ✅ | ✅ | ✅ |
| `GET /search/suggest` | ✅ | ✅ | ✅ | ✅ |
| `GET /categories` | ✅ | ✅ | ✅ | ✅ |

---

## Règles de Restriction par Plan

| Feature | Free | Starter | Regular | Agency | Pro | Golden | Platinum |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Payment Config (Direct) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| API Keys | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Page Builder | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Compress | ❌ | 💎 Tokens | 💎 Tokens | 💎 Tokens | ✅ ∞ | ✅ ∞ | ✅ ∞ |
| AI SEO | ❌ | 💎 Tokens | 💎 Tokens | 💎 Tokens | ✅ ∞ | ✅ ∞ | ✅ ∞ |
| Custom Domain | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ WL |
