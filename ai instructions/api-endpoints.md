# PandaMarket — Endpoints API

> **Version :** 1.0 | **Date :** 02 Mai 2026  
> **Base URL :** `https://api.pandamarket.tn`  
> **Préfixe :** `/api/pd/`  
> **Auth :** JWT Bearer Token  

---

## 1. Authentification

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| POST | `/api/pd/auth/register` | Inscription vendeur | ❌ |
| POST | `/api/pd/auth/login` | Connexion | ❌ |
| POST | `/api/pd/auth/refresh` | Rafraîchir le token | 🔑 Refresh |
| POST | `/api/pd/auth/logout` | Déconnexion | 🔑 |
| POST | `/api/pd/auth/forgot-password` | Demande reset mot de passe | ❌ |
| POST | `/api/pd/auth/reset-password` | Reset mot de passe | ❌ |

---

## 2. Stores (Boutiques)

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/api/pd/stores` | Lister toutes les boutiques (Hub) | ❌ |
| GET | `/api/pd/stores/:id` | Détail d'une boutique | ❌ |
| GET | `/api/pd/stores/by-domain/:domain` | Résoudre un domaine → store | ❌ |
| POST | `/api/pd/stores` | Créer une boutique | 🔑 Vendeur |
| PUT | `/api/pd/stores/:id` | Modifier sa boutique | 🔑 Owner |
| PUT | `/api/pd/stores/:id/theme` | Changer de thème | 🔑 Owner |
| PUT | `/api/pd/stores/:id/settings` | Modifier les réglages (couleurs, logo) | 🔑 Owner |
| PUT | `/api/pd/stores/:id/payment-config` | Configurer paiement direct | 🔑 Owner (Pro+) |
| PUT | `/api/pd/stores/:id/shipping-mode` | Changer mode livraison | 🔑 Owner |

---

## 3. Produits

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/api/pd/products` | Lister produits (Hub ou Store) | ❌ |
| GET | `/api/pd/products/:id` | Détail d'un produit | ❌ |
| POST | `/api/pd/products` | Créer un produit | 🔑 Vendeur |
| PUT | `/api/pd/products/:id` | Modifier un produit | 🔑 Owner |
| DELETE | `/api/pd/products/:id` | Supprimer un produit | 🔑 Owner |
| POST | `/api/pd/products/:id/images` | Upload images (presigned URL) | 🔑 Owner |
| DELETE | `/api/pd/products/:id/images/:img_id` | Supprimer une image | 🔑 Owner |
| POST | `/api/pd/products/import` | Import CSV/Excel | 🔑 Vendeur |
| GET | `/api/pd/products/export` | Export CSV/Excel | 🔑 Vendeur |

---

## 4. Commandes (Orders)

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/api/pd/orders` | Lister ses commandes | 🔑 |
| GET | `/api/pd/orders/:id` | Détail d'une commande | 🔑 |
| POST | `/api/pd/orders` | Créer une commande (checkout) | 🔑 Client |
| PUT | `/api/pd/orders/:id/fulfill` | Marquer comme expédiée | 🔑 Vendeur |
| PUT | `/api/pd/orders/:id/cancel` | Annuler une commande | 🔑 |

---

## 5. Paiements

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| POST | `/api/pd/payments/flouci/init` | Initier un paiement Flouci | 🔑 Client |
| POST | `/api/pd/payments/flouci/callback` | Webhook retour Flouci | ❌ (signé) |
| POST | `/api/pd/payments/konnect/init` | Initier un paiement Konnect | 🔑 Client |
| POST | `/api/pd/payments/konnect/callback` | Webhook retour Konnect | ❌ (signé) |
| POST | `/api/pd/payments/mandat/upload` | Upload preuve Mandat Minute | 🔑 |
| GET | `/api/pd/payments/mandat/pending` | File des mandats en attente | 🔑 Admin |
| PUT | `/api/pd/payments/mandat/:id/approve` | Approuver un mandat | 🔑 Admin |
| PUT | `/api/pd/payments/mandat/:id/reject` | Rejeter un mandat | 🔑 Admin |

---

## 6. Wallet Vendeur

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/api/pd/wallet` | Solde du wallet | 🔑 Vendeur |
| GET | `/api/pd/wallet/transactions` | Historique des transactions | 🔑 Vendeur |
| POST | `/api/pd/wallet/withdraw` | Demander un retrait | 🔑 Vendeur |
| PUT | `/api/pd/wallet/payout-mode` | Changer le mode de versement | 🔑 Vendeur |

---

## 7. Abonnements

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/api/pd/subscriptions/plans` | Lister les plans disponibles | ❌ |
| GET | `/api/pd/subscriptions/current` | Plan actuel du vendeur | 🔑 Vendeur |
| POST | `/api/pd/subscriptions/upgrade` | Upgrader de plan | 🔑 Vendeur |
| POST | `/api/pd/subscriptions/downgrade` | Downgrader de plan | 🔑 Vendeur |

---

## 8. Vérification KYC

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| POST | `/api/pd/verification/documents` | Soumettre les documents (RC + CIN) | 🔑 Vendeur |
| GET | `/api/pd/verification/status` | Statut de vérification | 🔑 Vendeur |
| GET | `/api/pd/admin/verifications/pending` | File des vérifications en attente | 🔑 Admin |
| PUT | `/api/pd/admin/verifications/:id/approve` | Approuver un vendeur | 🔑 Admin |
| PUT | `/api/pd/admin/verifications/:id/reject` | Rejeter un vendeur | 🔑 Admin |

---

## 9. IA & Crédits

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/api/pd/credits` | Solde de tokens IA | 🔑 Vendeur |
| POST | `/api/pd/credits/purchase` | Acheter un pack de tokens | 🔑 Vendeur |
| POST | `/api/pd/ai/compress` | Lancer la compression d'image | 🔑 Vendeur |
| POST | `/api/pd/ai/seo-generate` | Générer titre + description SEO | 🔑 Vendeur |
| GET | `/api/pd/ai/jobs/:id` | Statut d'un job IA | 🔑 Vendeur |
| GET | `/api/pd/ai/history` | Historique des jobs IA | 🔑 Vendeur |

---

## 10. Signalements (Reports)

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| POST | `/api/pd/reports` | Créer un signalement | 🔑 Client |
| GET | `/api/pd/admin/reports` | Lister les signalements | 🔑 Admin |
| PUT | `/api/pd/admin/reports/:id/status` | Mettre à jour le statut | 🔑 Admin |

---

## 11. API Vendeur (Externe)

> Endpoints pour l'intégration ERP/POS des vendeurs.

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/api/pd/vendor/products` | Lister ses produits | 🔑 API Key |
| PUT | `/api/pd/vendor/products/:id/stock` | Mettre à jour le stock | 🔑 API Key |
| GET | `/api/pd/vendor/orders` | Lister ses commandes | 🔑 API Key |
| POST | `/api/pd/vendor/api-keys` | Générer une clé API | 🔑 Vendeur |
| DELETE | `/api/pd/vendor/api-keys/:id` | Révoquer une clé API | 🔑 Vendeur |
| GET | `/api/pd/vendor/api-keys` | Lister ses clés API | 🔑 Vendeur |

---

## 12. Webhooks Sortants

> Événements envoyés à l'URL configurée par le vendeur.

| Événement | Payload | Déclencheur |
| :--- | :--- | :--- |
| `pd.order.placed` | Order object | Nouvelle commande reçue |
| `pd.order.fulfilled` | Order + tracking | Commande expédiée |
| `pd.order.cancelled` | Order object | Commande annulée |
| `pd.stock.low` | Product + qty | Stock en dessous du seuil |
| `pd.payment.captured` | Payment object | Paiement capturé |
| `pd.payment.refunded` | Payment object | Remboursement effectué |

**Sécurité :** Chaque webhook inclut un header `X-PD-Signature` (HMAC-SHA256) pour vérification.

---

## 13. Recherche (Hub)

| Méthode | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/api/pd/search?q=...` | Recherche produits (Meilisearch) | ❌ |
| GET | `/api/pd/search/suggest?q=...` | Auto-complétion | ❌ |
| GET | `/api/pd/categories` | Lister les catégories | ❌ |

**Paramètres de filtre :** `category`, `store_id`, `price_min`, `price_max`, `sort`, `page`, `limit`

---

## Codes de Réponse

| Code | Signification |
| :--- | :--- |
| `200` | Succès |
| `201` | Créé avec succès |
| `400` | Requête invalide |
| `401` | Non authentifié |
| `403` | Accès interdit (quota dépassé, plan insuffisant) |
| `404` | Ressource non trouvée |
| `409` | Conflit (domaine déjà pris, etc.) |
| `429` | Rate limit atteint |
| `500` | Erreur serveur |
