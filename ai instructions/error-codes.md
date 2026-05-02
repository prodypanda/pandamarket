# PandaMarket — Catalogue des Codes d'Erreur

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## Format de Réponse

```json
{
  "error": {
    "code": "PD_XXXX",
    "message": "Message lisible par l'utilisateur",
    "details": { }
  }
}
```

---

## 1. Authentification (PD_AUTH_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_AUTH_INVALID_CREDENTIALS` | 401 | Email ou mot de passe incorrect | — |
| `PD_AUTH_TOKEN_EXPIRED` | 401 | Session expirée, veuillez vous reconnecter | — |
| `PD_AUTH_TOKEN_INVALID` | 401 | Token d'authentification invalide | — |
| `PD_AUTH_REFRESH_EXPIRED` | 401 | Refresh token expiré | — |
| `PD_AUTH_EMAIL_EXISTS` | 409 | Un compte existe déjà avec cet email | `{ email }` |
| `PD_AUTH_WEAK_PASSWORD` | 400 | Le mot de passe doit contenir au moins 8 caractères | `{ min_length: 8 }` |
| `PD_AUTH_ACCOUNT_SUSPENDED` | 403 | Votre compte a été suspendu | `{ reason }` |

## 2. Permissions (PD_PERM_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_PERM_FORBIDDEN` | 403 | Vous n'avez pas les droits pour cette action | `{ required_role }` |
| `PD_PERM_NOT_OWNER` | 403 | Vous ne pouvez modifier que vos propres ressources | `{ resource_id }` |
| `PD_PERM_ADMIN_ONLY` | 403 | Cette action est réservée aux administrateurs | — |
| `PD_PERM_PLAN_REQUIRED` | 403 | Cette fonctionnalité nécessite le plan {plan} minimum | `{ required_plan, current_plan }` |

## 3. Store (PD_STORE_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_STORE_NOT_FOUND` | 404 | Boutique introuvable | `{ store_id }` |
| `PD_STORE_SUBDOMAIN_TAKEN` | 409 | Ce sous-domaine est déjà utilisé | `{ subdomain }` |
| `PD_STORE_DOMAIN_TAKEN` | 409 | Ce domaine est déjà configuré pour une autre boutique | `{ domain }` |
| `PD_STORE_SUSPENDED` | 403 | Cette boutique est suspendue | `{ store_id }` |
| `PD_STORE_NOT_VERIFIED` | 403 | Votre boutique n'est pas encore vérifiée | — |

## 4. Produits (PD_PRODUCT_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_PRODUCT_NOT_FOUND` | 404 | Produit introuvable | `{ product_id }` |
| `PD_PRODUCT_QUOTA_EXCEEDED` | 403 | Limite de produits atteinte pour votre plan | `{ current, limit, plan }` |
| `PD_PRODUCT_IMAGE_QUOTA` | 403 | Limite d'images par produit atteinte | `{ current, limit, plan }` |
| `PD_PRODUCT_PENDING_APPROVAL` | 202 | Produit créé, en attente d'approbation admin | `{ product_id }` |
| `PD_PRODUCT_OUT_OF_STOCK` | 400 | Produit en rupture de stock | `{ product_id, available: 0 }` |
| `PD_PRODUCT_INVALID_TYPE` | 400 | Type de produit invalide | `{ valid: ["physical","digital","service"] }` |

## 5. Commandes (PD_ORDER_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_ORDER_NOT_FOUND` | 404 | Commande introuvable | `{ order_id }` |
| `PD_ORDER_ALREADY_FULFILLED` | 409 | Cette commande a déjà été expédiée | `{ order_id }` |
| `PD_ORDER_ALREADY_CANCELLED` | 409 | Cette commande est déjà annulée | `{ order_id }` |
| `PD_ORDER_CANNOT_CANCEL` | 400 | Cette commande ne peut plus être annulée | `{ order_id, status }` |
| `PD_ORDER_EMPTY_CART` | 400 | Le panier est vide | — |

## 6. Paiements (PD_PAY_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_PAY_INIT_FAILED` | 502 | Impossible d'initialiser le paiement | `{ gateway, reason }` |
| `PD_PAY_VERIFICATION_FAILED` | 400 | La vérification du paiement a échoué | `{ payment_id }` |
| `PD_PAY_ALREADY_CAPTURED` | 409 | Ce paiement a déjà été capturé | `{ payment_id }` |
| `PD_PAY_MANDAT_UPLOAD_FAILED` | 400 | Échec de l'upload de la preuve | `{ reason }` |
| `PD_PAY_MANDAT_ALREADY_REVIEWED` | 409 | Ce mandat a déjà été traité | `{ proof_id, status }` |
| `PD_PAY_INVALID_GATEWAY` | 400 | Passerelle de paiement invalide | `{ valid: ["flouci","konnect","mandat","cod"] }` |

## 7. Wallet (PD_WALLET_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_WALLET_INSUFFICIENT_FUNDS` | 400 | Solde insuffisant pour ce retrait | `{ requested, available }` |
| `PD_WALLET_MIN_WITHDRAWAL` | 400 | Montant minimum de retrait non atteint | `{ min, requested }` |
| `PD_WALLET_FUNDS_PENDING` | 400 | Fonds encore en période de rétention | `{ available_date }` |
| `PD_WALLET_PAYOUT_FAILED` | 502 | Échec du versement | `{ reason }` |

## 8. KYC (PD_KYC_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_KYC_ALREADY_SUBMITTED` | 409 | Documents déjà soumis, en attente de validation | `{ submitted_at }` |
| `PD_KYC_ALREADY_VERIFIED` | 409 | Votre boutique est déjà vérifiée | — |
| `PD_KYC_INVALID_DOCUMENT` | 400 | Document invalide (format ou taille) | `{ max_size, valid_types }` |
| `PD_KYC_REJECTED` | 400 | Vérification refusée | `{ reason }` |

## 9. IA & Crédits (PD_AI_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_AI_INSUFFICIENT_TOKENS` | 403 | Crédits IA insuffisants | `{ required, available }` |
| `PD_AI_JOB_NOT_FOUND` | 404 | Job IA introuvable | `{ job_id }` |
| `PD_AI_JOB_FAILED` | 500 | Le traitement IA a échoué | `{ job_id, reason }` |
| `PD_AI_SERVICE_UNAVAILABLE` | 503 | Service IA temporairement indisponible | — |
| `PD_AI_FILE_TOO_LARGE` | 400 | Fichier trop volumineux pour le traitement | `{ max_size, actual }` |

## 10. Signalements (PD_REPORT_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_REPORT_DUPLICATE` | 409 | Vous avez déjà signalé ce vendeur pour cette commande | `{ report_id }` |
| `PD_REPORT_NOT_FOUND` | 404 | Signalement introuvable | `{ report_id }` |
| `PD_REPORT_ALREADY_RESOLVED` | 409 | Ce signalement est déjà résolu | `{ report_id }` |

## 11. Upload & Fichiers (PD_FILE_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_FILE_TOO_LARGE` | 400 | Fichier trop volumineux | `{ max: "10MB", actual }` |
| `PD_FILE_INVALID_TYPE` | 400 | Type de fichier non autorisé | `{ valid_types }` |
| `PD_FILE_UPLOAD_FAILED` | 500 | Erreur lors de l'upload | — |
| `PD_FILE_PRESIGN_FAILED` | 500 | Impossible de générer l'URL d'upload | — |

## 12. Abonnements (PD_SUB_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_SUB_ALREADY_ACTIVE` | 409 | Vous avez déjà un abonnement actif | `{ current_plan }` |
| `PD_SUB_DOWNGRADE_BLOCKED` | 400 | Impossible de downgrader : vous dépassez les limites du plan inférieur | `{ products_count, new_limit }` |
| `PD_SUB_EXPIRED` | 403 | Votre abonnement a expiré | `{ expired_at }` |
| `PD_SUB_PAYMENT_FAILED` | 400 | Le paiement de l'abonnement a échoué | — |

## 13. API Keys (PD_KEY_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_KEY_INVALID` | 401 | Clé API invalide ou révoquée | — |
| `PD_KEY_EXPIRED` | 401 | Clé API expirée | `{ expired_at }` |
| `PD_KEY_SCOPE_DENIED` | 403 | Cette clé n'a pas les permissions requises | `{ required_scope }` |
| `PD_KEY_RATE_LIMITED` | 429 | Limite de requêtes atteinte | `{ retry_after }` |

## 14. Général (PD_*)

| Code | HTTP | Message | Détail |
| :--- | :--- | :--- | :--- |
| `PD_VALIDATION_ERROR` | 400 | Données invalides | `{ fields: { field: "reason" } }` |
| `PD_NOT_FOUND` | 404 | Ressource introuvable | — |
| `PD_RATE_LIMITED` | 429 | Trop de requêtes, réessayez plus tard | `{ retry_after }` |
| `PD_INTERNAL_ERROR` | 500 | Erreur interne du serveur | `{ request_id }` |
| `PD_SERVICE_UNAVAILABLE` | 503 | Service temporairement indisponible | — |
