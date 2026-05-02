# PandaMarket — Guide d'Intégrations Tierces

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Flouci (Paiement en ligne)

### Informations

| Élément | Détail |
| :--- | :--- |
| **Site** | https://flouci.com |
| **Type** | API REST |
| **Sandbox** | Disponible (demander accès développeur) |
| **Devise** | TND uniquement |
| **Documentation** | https://developers.flouci.com |

### Flux d'Intégration

```
1. Frontend → POST /api/pd/payments/flouci/init
   Body: { order_id, amount, success_url, fail_url }

2. Backend → POST https://developers.flouci.com/api/generate_payment
   Headers: { apppublic: PD_FLOUCI_APP_TOKEN, appsecret: PD_FLOUCI_APP_SECRET }
   Body: { app_token, app_secret, amount, accept_url, cancel_url, decline_url, session_timeout }

3. Flouci retourne → { result: { link: "https://flouci.com/pay/xxx" } }

4. Frontend redirige le client vers le lien Flouci.

5. Client paie → Flouci redirige vers success_url.

6. Backend vérifie → GET https://developers.flouci.com/api/verify_payment/{payment_id}
   Confirme le statut avant de capturer.
```

### Variables d'Environnement

```env
PD_FLOUCI_APP_TOKEN=your_app_token
PD_FLOUCI_APP_SECRET=your_app_secret
PD_FLOUCI_BASE_URL=https://developers.flouci.com/api
```

### Spécificités Mode Direct (Pro+)

Pour les vendeurs Pro+ qui utilisent leurs propres clés :
- Récupérer `payment_config.flouci_app_token` et `flouci_app_secret` depuis le Store.
- Instancier l'appel API avec les clés **du vendeur**, pas celles de la plateforme.
- Déchiffrer les clés (AES-256-GCM) avant utilisation.

---

## 2. Konnect (Paiement en ligne)

### Informations

| Élément | Détail |
| :--- | :--- |
| **Site** | https://konnect.network |
| **Type** | API REST |
| **Sandbox** | Disponible |
| **Devise** | TND (montants en millimes : 1 TND = 1000 millimes) |
| **Documentation** | https://api.konnect.network/api/v2/docs |

### Flux d'Intégration

```
1. Backend → POST https://api.konnect.network/api/v2/payments/init-payment
   Headers: { x-api-key: PD_KONNECT_API_KEY }
   Body: {
     receiverWalletId: PD_KONNECT_RECEIVER_WALLET,
     amount: 85000,  // en millimes (85 TND)
     token: "TND",
     type: "immediate",
     acceptedPaymentMethods: ["wallet", "bank_card", "e-DINAR"],
     lifespan: 30,   // minutes
     successUrl: "...",
     failUrl: "...",
     theme: "dark"
   }

2. Konnect retourne → { payUrl: "https://pay.konnect.network/xxx", paymentRef: "ref_xxx" }

3. Frontend redirige vers payUrl.

4. Client paie → Konnect redirige vers successUrl.

5. Backend vérifie → GET https://api.konnect.network/api/v2/payments/{paymentRef}
   Vérifie le statut "completed" avant capture.
```

### Variables d'Environnement

```env
PD_KONNECT_API_KEY=your_api_key
PD_KONNECT_RECEIVER_WALLET=your_wallet_id
PD_KONNECT_BASE_URL=https://api.konnect.network/api/v2
```

> ⚠️ **Attention :** Konnect utilise les **millimes** (1 TND = 1000). Toujours multiplier par 1000 avant d'envoyer et diviser par 1000 à la réception.

---

## 3. Mandat Minute (Paiement manuel)

### Informations

| Élément | Détail |
| :--- | :--- |
| **Type** | 100% manuel — pas d'API |
| **Flux** | Upload preuve → Validation admin |
| **Délai** | Variable (dépend de la réactivité admin) |

### Flux d'Intégration

```
1. Client choisit "Mandat Minute" au checkout.
2. Système crée la commande en statut `payment_required`.
3. Système affiche les instructions :
   - "Envoyez un Mandat Minute de XX TND à [Nom, N° CIN, Ville]"
   - "Uploadez la photo du reçu ci-dessous"
4. Client uploade la preuve :
   - Backend génère un presigned URL S3 (PUT, expire 15min).
   - Frontend uploade directement vers S3.
   - Backend enregistre dans `mandat_proofs`.
5. Admin notifié → File de validation.
6. Admin approuve → `payment.captured` → Commande débloquée.
```

### Informations à Afficher au Client

```
Destinataire : [Nom de l'entreprise]
CIN : [Numéro]
Ville : [Ville du bureau de poste]
Montant : XX.XXX TND
Référence : PD-ORDER-XXXXX (à indiquer sur le mandat)
```

---

## 4. Aramex (Logistique)

### Informations

| Élément | Détail |
| :--- | :--- |
| **Site** | https://www.aramex.com |
| **API** | SOAP / REST (v2) |
| **Sandbox** | Disponible (compte test) |
| **Documentation** | https://developers.aramex.com |

### Fonctionnalités à Intégrer

| Fonctionnalité | Endpoint | Priorité |
| :--- | :--- | :--- |
| Créer un envoi (shipment) | `POST /shipments` | P1 |
| Générer un bordereau (AWB) | `POST /shipments/{id}/label` | P1 |
| Calculer les frais d'envoi | `POST /rate/calculate` | P1 |
| Suivre un colis | `GET /shipments/{id}/tracking` | P2 |

### Variables d'Environnement

```env
PD_ARAMEX_USERNAME=your_username
PD_ARAMEX_PASSWORD=your_password
PD_ARAMEX_ACCOUNT_NUMBER=your_account
PD_ARAMEX_ACCOUNT_PIN=your_pin
PD_ARAMEX_ACCOUNT_ENTITY=your_entity
PD_ARAMEX_ACCOUNT_COUNTRY=TN
PD_ARAMEX_BASE_URL=https://ws.aramex.net/ShippingAPI.V2
```

---

## 5. La Poste Tunisienne

### Informations

| Élément | Détail |
| :--- | :--- |
| **Type** | API REST (si disponible) ou intégration manuelle |
| **Sandbox** | À vérifier avec La Poste |
| **Alternative** | Colis Rapid Poste |

> ⚠️ La Poste TN n'a pas toujours d'API publique stable. Prévoir une alternative manuelle (génération de PDF bordereau) si l'API n'est pas disponible.

---

## 6. Gemini Pro API (IA)

### Informations

| Élément | Détail |
| :--- | :--- |
| **Provider** | Google (Vertex AI / AI Studio) |
| **Modèle** | Gemini 2.0 Pro |
| **Type** | API REST / SDK Node.js |
| **Pricing** | Pay-per-use (input/output tokens) |
| **Documentation** | https://ai.google.dev/docs |

### Cas d'Usage PandaMarket

#### AI SEO (Génération titre + description)

```
Input : Image produit (base64 ou URL)
Prompt : "Analyse cette image de produit e-commerce.
         Génère un titre SEO optimisé (max 70 caractères)
         et une méta-description (max 160 caractères)
         en français. Format JSON: { title, description, tags[] }"
Output : { title: "...", description: "...", tags: ["...", "..."] }
```

#### Variables d'Environnement

```env
PD_GEMINI_API_KEY=your_api_key
PD_GEMINI_MODEL=gemini-2.0-pro
PD_GEMINI_MAX_TOKENS=500
```

#### Gestion des Coûts

- Estimation : ~0.005 TND par appel SEO (texte + image).
- Les tokens IA du vendeur couvrent cette charge.
- Monitoring mensuel des coûts API via dashboard admin.

---

## 7. MinIO (Stockage S3-Compatible)

### Informations

| Élément | Détail |
| :--- | :--- |
| **Type** | Auto-hébergé (S3-compatible) |
| **Console** | Port 9001 (UI web) |
| **API** | Port 9000 (S3-compatible) |
| **SDK** | `@aws-sdk/client-s3` (même SDK que AWS S3) |

### Buckets à Créer

| Bucket | Accès | Usage |
| :--- | :--- | :--- |
| `pd-product-images` | Public read | Images produits |
| `pd-private-files` | Privé (presigned) | KYC docs, mandats, produits numériques |
| `pd-themes` | Public read | Assets des templates |

### Presigned URLs

```typescript
// Upload (vendeur uploade vers S3 directement)
const uploadUrl = await s3.getSignedUrl('putObject', {
  Bucket: 'pd-private-files',
  Key: `mandats/${orderId}/${filename}`,
  Expires: 900, // 15 minutes
  ContentType: 'image/jpeg',
});

// Download (client télécharge un produit numérique)
const downloadUrl = await s3.getSignedUrl('getObject', {
  Bucket: 'pd-private-files',
  Key: `digital/${productId}/${filename}`,
  Expires: 3600, // 1 heure
});
```

### Variables d'Environnement

```env
PD_S3_ENDPOINT=http://localhost:9000
PD_S3_BUCKET_PUBLIC=pd-product-images
PD_S3_BUCKET_PRIVATE=pd-private-files
PD_S3_ACCESS_KEY=minioadmin
PD_S3_SECRET_KEY=minioadmin
PD_S3_REGION=us-east-1
```

---

## 8. Meilisearch (Recherche)

### Configuration Initiale

```bash
# Créer l'index produits
curl -X POST 'http://localhost:7700/indexes' \
  -H 'Authorization: Bearer PD_MEILI_MASTER_KEY' \
  -H 'Content-Type: application/json' \
  --data '{ "uid": "products", "primaryKey": "id" }'

# Configurer les attributs de recherche
curl -X PUT 'http://localhost:7700/indexes/products/settings' \
  -H 'Authorization: Bearer PD_MEILI_MASTER_KEY' \
  -H 'Content-Type: application/json' \
  --data '{
    "searchableAttributes": ["title", "description", "category", "store_name"],
    "filterableAttributes": ["store_id", "category", "price", "status"],
    "sortableAttributes": ["price", "created_at"],
    "displayedAttributes": ["id", "title", "price", "thumbnail", "store_id", "store_name", "category"]
  }'
```

### Sync Produits → Meilisearch

- **Trigger** : À chaque `product.published` ou `product.updated`.
- **Subscriber MedusaJS** : Écoute les événements et pousse vers Meilisearch.
- **Bulk initial** : Script de seed pour indexer tous les produits existants.

---

## Matrice Récapitulative

| Service | Type | Sandbox | SDK/Lib | Priorité |
| :--- | :--- | :--- | :--- | :--- |
| Flouci | Paiement API | ✅ | HTTP (axios/fetch) | P0 |
| Konnect | Paiement API | ✅ | HTTP (axios/fetch) | P0 |
| Mandat Minute | Manuel | — | Custom (S3 upload) | P0 |
| Aramex | Logistique API | ✅ | HTTP + SOAP | P1 |
| La Poste TN | Logistique | ⚠️ À vérifier | TBD | P2 |
| Gemini Pro | IA API | ✅ | `@google/generative-ai` | P1 |
| MinIO | Stockage | Local | `@aws-sdk/client-s3` | P0 |
| Meilisearch | Recherche | Local | `meilisearch` npm | P0 |
