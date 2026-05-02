# PandaMarket — Guide de Sécurité

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Authentification & Autorisation

### 1.1 JWT (JSON Web Tokens)

| Paramètre | Valeur | Détail |
| :--- | :--- | :--- |
| Access Token durée | 15 minutes | Court pour limiter l'exposition |
| Refresh Token durée | 7 jours | Stocké en httpOnly cookie |
| Algorithme | RS256 | Asymétrique (clé publique/privée) |
| Payload minimal | `{ sub, role, store_id, iat, exp }` | Ne jamais stocker de données sensibles |

### 1.2 Rôles & Permissions

| Rôle | Permissions |
| :--- | :--- |
| `customer` | Acheter, signaler, gérer son profil |
| `vendor` | Gérer boutique/produits/commandes (limité par plan) |
| `vendor_verified` | Idem + publication instantanée |
| `admin` | Tout : KYC, mandats, signalements, config |
| `super_admin` | Idem + gestion des admins, plans, paramètres système |

### 1.3 Règles d'Accès

- **Vendor isolation** : Un vendeur ne peut accéder qu'aux données de son propre `store_id`.
- **Admin endpoints** : Préfixés `/api/pd/admin/` et protégés par middleware de rôle.
- **API Keys vendeur** : Accès limité aux scopes définis (`products:read`, `orders:read`, etc.).

---

## 2. Protection des Données

### 2.1 Chiffrement

| Donnée | Méthode | Détail |
| :--- | :--- | :--- |
| Mots de passe | bcrypt (12 rounds) | Jamais stockés en clair |
| Clés API vendeurs (Flouci/Konnect) | AES-256-GCM | Chiffrées au repos en BDD |
| API Keys générées | SHA-256 hash | Seul le hash est stocké, la clé est montrée une seule fois |
| Données en transit | TLS 1.3 | Caddy gère le SSL automatiquement |

### 2.2 Données Sensibles — Ne Jamais Logguer

- Mots de passe
- Tokens JWT
- Clés API (vendeur ou système)
- Numéros de carte / données de paiement
- Contenu des documents KYC (CIN, RC)

### 2.3 Stockage des Fichiers

| Type | Protection |
| :--- | :--- |
| Documents KYC (CIN, RC) | Bucket S3 privé, accès via presigned URLs (expiration 15 min) |
| Preuves Mandat Minute | Bucket S3 privé, presigned URLs |
| Images produits | Bucket S3 public en lecture |
| Produits numériques | Bucket S3 privé, presigned URLs (expiration configurable) |

---

## 3. Sécurité API

### 3.1 Rate Limiting

| Endpoint | Limite | Fenêtre |
| :--- | :--- | :--- |
| `POST /auth/login` | 5 requêtes | 15 minutes |
| `POST /auth/register` | 3 requêtes | 1 heure |
| `POST /auth/forgot-password` | 3 requêtes | 1 heure |
| API publique (search, products) | 100 requêtes | 1 minute |
| API authentifiée (vendeur) | 60 requêtes | 1 minute |
| API Keys (externe) | 120 requêtes | 1 minute |
| Upload fichiers | 10 requêtes | 5 minutes |

### 3.2 CORS (Cross-Origin Resource Sharing)

```
Origines autorisées :
- https://pandamarket.tn
- https://*.pandamarket.tn
- https://admin.pandamarket.tn
- Domaines custom des vendeurs (dynamique)

Méthodes : GET, POST, PUT, DELETE, OPTIONS
Headers : Authorization, Content-Type, X-PD-Store-ID
Credentials : true (cookies httpOnly)
```

### 3.3 Validation des Entrées

- **Toutes les entrées** sont validées côté serveur (même si validées côté client).
- Utiliser **Zod** ou **Joi** pour la validation de schéma.
- **Sanitisation** : Échapper les caractères HTML dans les textes utilisateur (prévention XSS).
- **Taille max upload** : 10 Mo par fichier image, 50 Mo pour les produits numériques.
- **Types de fichiers autorisés** :
  - Images : `.jpg`, `.jpeg`, `.png`, `.webp`
  - Documents KYC : `.jpg`, `.jpeg`, `.png`, `.pdf`
  - Import : `.csv`, `.xlsx`
  - Produits numériques : configurable par admin

### 3.4 Protection CSRF

- Utiliser le pattern **Double Submit Cookie** pour les formulaires.
- Les API REST sont protégées par les tokens JWT (pas de cookies de session).

### 3.5 Headers de Sécurité

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; img-src 'self' *.r2.cloudflarestorage.com
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 4. Sécurité des Paiements

### 4.1 Webhooks Entrants (Flouci/Konnect)

- **Vérifier la signature** de chaque webhook reçu (HMAC ou clé secrète).
- **Idempotence** : Vérifier que le `payment_id` n'a pas déjà été traité.
- **IP Whitelisting** : Si les passerelles fournissent des IPs fixes, les whitelister.

### 4.2 Webhooks Sortants (vers ERP vendeur)

- Chaque webhook inclut un header `X-PD-Signature` : HMAC-SHA256 du body avec le secret du vendeur.
- Retry policy : 3 tentatives (1s, 30s, 5min) puis abandon.
- Logging de chaque tentative (succès/échec).

### 4.3 Wallet & Transactions

- **Transactions atomiques** : Utiliser les transactions PostgreSQL pour toute opération sur le wallet.
- **Double-entry** : Chaque mouvement crée deux écritures (débit/crédit) pour la traçabilité.
- **Audit trail** : Table `wallet_transactions` jamais supprimée, append-only.

---

## 5. Sécurité Infrastructure

### 5.1 Réseau

- PostgreSQL, Redis, Meilisearch, MinIO : **non exposés** sur Internet (bind à `127.0.0.1` ou réseau Docker interne).
- Seuls Caddy (443) et les webhooks callback (via Caddy) sont exposés.
- Firewall : Bloquer tout sauf ports 80, 443 et SSH (22 avec clé uniquement).

### 5.2 Secrets

- Tous les secrets dans des **variables d'environnement** (jamais dans le code).
- Fichier `.env` dans `.gitignore`.
- En production : utiliser un gestionnaire de secrets (ex: Docker Secrets, Vault).

### 5.3 Dépendances

- `npm audit` exécuté à chaque CI/CD.
- Dependabot ou Renovate activé sur le repo.
- Pas de `*` dans les versions de `package.json`.

---

## 6. Logging & Monitoring

### 6.1 Ce qu'il faut logguer

| Événement | Niveau | Détail |
| :--- | :--- | :--- |
| Login réussi | INFO | user_id, IP, timestamp |
| Login échoué | WARN | email tenté, IP, timestamp |
| Paiement capturé | INFO | order_id, montant, passerelle |
| Paiement échoué | ERROR | order_id, erreur, passerelle |
| KYC approuvé/rejeté | INFO | store_id, admin_id |
| Mandat approuvé/rejeté | INFO | proof_id, admin_id |
| Rate limit atteint | WARN | IP, endpoint |
| Erreur serveur 500 | ERROR | Stack trace (sans données sensibles) |

### 6.2 Format de Log

```json
{
  "timestamp": "2026-05-02T15:00:00Z",
  "level": "INFO",
  "service": "backend",
  "event": "payment.captured",
  "data": { "order_id": "pd_order_xxx", "amount": 85.000, "gateway": "flouci" },
  "request_id": "req_abc123",
  "ip": "197.x.x.x"
}
```

---

## 7. Checklist Pré-Lancement

- [ ] Tous les secrets sont dans des variables d'environnement
- [ ] `.env` est dans `.gitignore`
- [ ] HTTPS obligatoire (redirection HTTP → HTTPS)
- [ ] Rate limiting actif sur tous les endpoints
- [ ] Headers de sécurité configurés
- [ ] CORS configuré (pas de `*` en production)
- [ ] Validation Zod/Joi sur tous les inputs
- [ ] Mots de passe hashés bcrypt (12 rounds)
- [ ] Clés API chiffrées AES-256-GCM en BDD
- [ ] Webhooks signés (entrants vérifiés, sortants signés)
- [ ] PostgreSQL/Redis non exposés sur Internet
- [ ] `npm audit` sans vulnérabilités critiques
- [ ] Logs structurés sans données sensibles
- [ ] Backups automatiques configurés et testés
