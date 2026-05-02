# PandaMarket — Système de Notifications

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Canaux de Notification

| Canal | Technologie | Usage |
| :--- | :--- | :--- |
| **Email** | BullMQ worker + SMTP (Brevo/Resend) | Confirmations, KYC, alertes |
| **WebSocket** | Socket.io ou native WS | Temps réel (dashboard vendeur/admin) |
| **In-App** | Table `notifications` + API poll | Centre de notifications dans l'UI |
| **SMS** | API SMS locale (optionnel, Phase 2) | Vérification téléphone KYC |

---

## 2. Matrice Complète des Notifications

### 2.1 Notifications Acheteur

| Événement | Email | In-App | Déclencheur |
| :--- | :--- | :--- | :--- |
| Inscription réussie | ✅ | — | `customer.created` |
| Commande confirmée | ✅ | ✅ | `order.placed` |
| Paiement capturé | ✅ | ✅ | `payment.captured` |
| Mandat approuvé | ✅ | ✅ | `mandat.approved` |
| Mandat rejeté | ✅ | ✅ | `mandat.rejected` |
| Commande expédiée | ✅ | ✅ | `order.fulfilled` |
| Numéro de suivi disponible | ✅ | ✅ | `tracking.updated` |
| Commande livrée | ✅ | ✅ | `order.delivered` |
| Commande annulée | ✅ | ✅ | `order.cancelled` |
| Remboursement effectué | ✅ | ✅ | `payment.refunded` |

### 2.2 Notifications Vendeur

| Événement | Email | WebSocket | In-App | Déclencheur |
| :--- | :--- | :--- | :--- | :--- |
| Inscription boutique | ✅ | — | — | `store.created` |
| Nouvelle commande reçue | ✅ | ✅ | ✅ | `order.placed` (pour son store) |
| Paiement reçu | ✅ | ✅ | ✅ | `payment.captured` |
| KYC soumis (accusé réception) | ✅ | — | ✅ | `verification.submitted` |
| KYC approuvé | ✅ | ✅ | ✅ | `verification.approved` |
| KYC rejeté | ✅ | ✅ | ✅ | `verification.rejected` |
| Produit approuvé (non-vérifié) | ✅ | ✅ | ✅ | `product.approved` |
| Produit rejeté (non-vérifié) | ✅ | ✅ | ✅ | `product.rejected` |
| Job IA terminé | — | ✅ | ✅ | `ai.job.completed` |
| Job IA échoué | — | ✅ | ✅ | `ai.job.failed` |
| Tokens IA épuisés | ✅ | — | ✅ | `credits.depleted` |
| Fonds disponibles (fin rétention) | ✅ | — | ✅ | `wallet.funds_available` |
| Retrait effectué | ✅ | — | ✅ | `wallet.payout_completed` |
| Stock faible | ✅ | ✅ | ✅ | `stock.low` (seuil configurable) |
| Signalement reçu | ✅ | ✅ | ✅ | `report.created` |
| Compte suspendu | ✅ | ✅ | ✅ | `store.suspended` |
| Abonnement expire bientôt | ✅ | — | ✅ | 7 jours avant expiration |
| Abonnement expiré | ✅ | — | ✅ | `subscription.expired` |

### 2.3 Notifications Admin

| Événement | Email | WebSocket | In-App | Déclencheur |
| :--- | :--- | :--- | :--- | :--- |
| Nouveau vendeur inscrit | — | ✅ | ✅ | `store.created` |
| KYC en attente de validation | ✅ | ✅ | ✅ | `verification.submitted` |
| Mandat en attente de validation | ✅ | ✅ | ✅ | `mandat.uploaded` |
| Produit en attente d'approbation | — | ✅ | ✅ | `product.pending_approval` |
| Nouveau signalement | ✅ | ✅ | ✅ | `report.created` |
| Demande de retrait vendeur | ✅ | ✅ | ✅ | `wallet.withdrawal_requested` |
| Erreur paiement critique | ✅ | ✅ | ✅ | `payment.error` |

---

## 3. Templates Email

### 3.1 Liste des Templates

| ID | Objet | Variables |
| :--- | :--- | :--- |
| `welcome_customer` | Bienvenue sur PandaMarket ! | `{name}` |
| `welcome_vendor` | Votre boutique est prête ! | `{name, store_name, subdomain}` |
| `order_confirmed` | Commande #{order_id} confirmée | `{name, order_id, items[], total}` |
| `payment_captured` | Paiement reçu pour #{order_id} | `{name, order_id, amount, method}` |
| `mandat_approved` | Mandat approuvé — Commande débloquée | `{name, order_id, amount}` |
| `mandat_rejected` | Mandat rejeté — Action requise | `{name, order_id, reason, reupload_url}` |
| `order_shipped` | Votre commande est en route ! | `{name, order_id, tracking_number, carrier}` |
| `kyc_approved` | Félicitations ! Votre boutique est vérifiée ✓ | `{name, store_name}` |
| `kyc_rejected` | Vérification refusée | `{name, reason, resubmit_url}` |
| `product_approved` | Produit publié : {product_name} | `{name, product_name, product_url}` |
| `product_rejected` | Produit refusé : {product_name} | `{name, product_name, reason}` |
| `new_order_vendor` | 🛍️ Nouvelle commande #{order_id} | `{store_name, order_id, items[], total}` |
| `wallet_available` | Fonds disponibles : {amount} TND | `{name, amount, wallet_url}` |
| `payout_completed` | Retrait de {amount} TND effectué | `{name, amount, method}` |
| `stock_low` | ⚠️ Stock faible : {product_name} | `{store_name, product_name, quantity}` |
| `subscription_expiring` | Votre abonnement expire dans 7 jours | `{name, plan, expiry_date, renew_url}` |
| `subscription_expired` | Votre abonnement {plan} a expiré | `{name, plan, renew_url}` |

### 3.2 Design des Emails

- **Template de base** : Layout responsive avec header (logo PandaMarket), body, footer.
- **Couleurs** : Reprendre la palette du design system (Panda Green pour CTA, Panda Black pour le texte).
- **CTA button** : Panda Green (#16C784), border-radius 8px, padding 12px 24px.
- **Footer** : Liens (Aide, CGU, Désabonnement) + adresse légale.
- **Mobile-friendly** : Max-width 600px, font-size minimum 14px.

---

## 4. Notifications In-App

### 4.1 Table `notifications`

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES "user"(id),
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB DEFAULT '{}',
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

### 4.2 API Endpoints

| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/pd/notifications` | Lister ses notifications (paginé) |
| GET | `/api/pd/notifications/unread-count` | Nombre de non-lues |
| PUT | `/api/pd/notifications/:id/read` | Marquer comme lue |
| PUT | `/api/pd/notifications/read-all` | Marquer toutes comme lues |

### 4.3 UI

- **Icône cloche** dans la navbar avec badge compteur (rouge si > 0).
- **Dropdown** : Liste des 10 dernières, bouton "Voir tout".
- **Page dédiée** : Liste complète avec filtres par type.
- **Animation** : Badge pulse quand nouvelle notification arrive (WebSocket).

---

## 5. WebSocket (Temps Réel)

### 5.1 Événements WebSocket

| Canal | Événement | Données | Destinataire |
| :--- | :--- | :--- | :--- |
| `store:{store_id}` | `new_order` | Order summary | Vendeur |
| `store:{store_id}` | `payment_received` | Amount, method | Vendeur |
| `store:{store_id}` | `ai_job_done` | Job result | Vendeur |
| `store:{store_id}` | `stock_alert` | Product, qty | Vendeur |
| `admin` | `kyc_pending` | Store info | Admin |
| `admin` | `mandat_pending` | Proof info | Admin |
| `admin` | `new_report` | Report summary | Admin |
| `user:{user_id}` | `notification` | Notification object | Tout utilisateur |

### 5.2 Architecture

```
Client (Dashboard) ←── WebSocket ──→ Backend (MedusaJS)
                                          │
                                          │ Subscriber écoute l'event MedusaJS
                                          │
                                     Event Bus (order.placed, etc.)
```

- Authentification WebSocket : Token JWT passé à la connexion.
- Reconnexion automatique : Côté client, avec backoff exponentiel.
- Fallback : Si WebSocket indisponible, polling toutes les 30s.
