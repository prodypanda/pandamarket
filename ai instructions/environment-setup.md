# PandaMarket — Guide de Configuration Environnement Dev

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Prérequis à Installer

| Outil | Version | Installation |
| :--- | :--- | :--- |
| **Node.js** | 20 LTS | https://nodejs.org (ou `nvm install 20`) |
| **npm** | 10+ | Inclus avec Node.js |
| **Docker Desktop** | 4.30+ | https://docker.com/products/docker-desktop |
| **Git** | 2.40+ | https://git-scm.com |
| **VS Code** | Latest | https://code.visualstudio.com |

### Extensions VS Code Recommandées

```
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Prisma (Prisma.prisma)
- Docker (ms-azuretools.vscode-docker)
- Thunder Client (rangav.vscode-thunder-client) — Test API
- GitLens (eamodio.gitlens)
```

---

## 2. Installation Pas à Pas

### Étape 1 : Cloner le Repo

```bash
git clone https://github.com/pandamarket/pandamarket.git
cd pandamarket
```

### Étape 2 : Lancer les Services (Docker)

```bash
# Démarre PostgreSQL, Redis, Meilisearch, MinIO
docker-compose up -d

# Vérifier que tout tourne
docker-compose ps
```

Services disponibles après démarrage :

| Service | Port | URL |
| :--- | :--- | :--- |
| PostgreSQL | 5432 | `postgresql://pd_user:password@localhost:5432/pandamarket` |
| Redis | 6379 | `redis://localhost:6379` |
| Meilisearch | 7700 | http://localhost:7700 |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 (minioadmin/minioadmin) |

### Étape 3 : Configurer le Backend

```bash
cd backend

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env
# Modifier .env si nécessaire (les valeurs par défaut marchent pour le dev)

# Appliquer les migrations
npx medusa migrations run

# Seeder les données initiales (plans, admin, thèmes)
npx medusa seed -f data/seed.json

# Lancer le backend en mode dev
npm run dev
```

Le backend est accessible sur **http://localhost:9000**

### Étape 4 : Configurer le Frontend

```bash
cd ../frontend

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local

# Lancer le frontend en mode dev
npm run dev
```

Le frontend est accessible sur **http://localhost:3000**

### Étape 5 : Configurer MinIO (Buckets)

```bash
# Installer le client MinIO (mc)
# Via Docker :
docker run --rm -it --entrypoint /bin/sh minio/mc

# Configurer l'alias
mc alias set local http://localhost:9000 minioadmin minioadmin

# Créer les buckets
mc mb local/pd-product-images
mc mb local/pd-private-files
mc mb local/pd-themes

# Rendre le bucket d'images public
mc anonymous set public local/pd-product-images
```

### Étape 6 : Configurer Meilisearch

```bash
# L'index sera créé automatiquement par le subscriber MedusaJS
# Pour vérifier manuellement :
curl http://localhost:7700/health
# Réponse attendue : { "status": "available" }
```

---

## 3. Fichier .env.example (Backend)

```env
# === Application ===
PD_NODE_ENV=development
PD_PORT=9000
PD_ADMIN_CORS=http://localhost:3000
PD_STORE_CORS=http://localhost:3000

# === Database ===
PD_DATABASE_URL=postgresql://pd_user:password@localhost:5432/pandamarket

# === Redis ===
PD_REDIS_URL=redis://localhost:6379

# === Storage (MinIO local) ===
PD_S3_ENDPOINT=http://localhost:9000
PD_S3_BUCKET_PUBLIC=pd-product-images
PD_S3_BUCKET_PRIVATE=pd-private-files
PD_S3_ACCESS_KEY=minioadmin
PD_S3_SECRET_KEY=minioadmin
PD_S3_REGION=us-east-1

# === Paiements (sandbox) ===
PD_FLOUCI_APP_TOKEN=sandbox_token
PD_FLOUCI_APP_SECRET=sandbox_secret
PD_KONNECT_API_KEY=sandbox_key
PD_KONNECT_RECEIVER_WALLET=sandbox_wallet

# === IA ===
PD_GEMINI_API_KEY=your_gemini_key

# === Meilisearch ===
PD_MEILI_HOST=http://localhost:7700
PD_MEILI_MASTER_KEY=meili_master_dev_key

# === Auth ===
PD_JWT_SECRET=dev_jwt_secret_change_in_production
PD_COOKIE_SECRET=dev_cookie_secret_change_in_production
```

---

## 4. Données de Seed (Comptes de Test)

Après le seed, les comptes suivants sont disponibles :

| Rôle | Email | Mot de passe |
| :--- | :--- | :--- |
| Super Admin | `admin@pandamarket.tn` | `Admin123!` |
| Vendeur (vérifié, Pro) | `vendor.pro@test.tn` | `Test123!` |
| Vendeur (non-vérifié, Free) | `vendor.free@test.tn` | `Test123!` |
| Client | `customer@test.tn` | `Test123!` |

---

## 5. Commandes Utiles

| Commande | Emplacement | Description |
| :--- | :--- | :--- |
| `npm run dev` | backend/ | Lance le serveur Medusa en mode watch |
| `npm run dev` | frontend/ | Lance Next.js en mode dev (HMR) |
| `npm run test` | backend/ | Lance les tests unitaires (Vitest) |
| `npm run test:e2e` | frontend/ | Lance les tests E2E (Playwright) |
| `npm run lint` | les deux | Vérifie le code avec ESLint |
| `npm run format` | les deux | Formate avec Prettier |
| `npm run build` | les deux | Build de production |
| `docker-compose up -d` | racine | Démarre les services |
| `docker-compose down` | racine | Arrête les services |
| `docker-compose logs -f postgres` | racine | Voir les logs PostgreSQL |

---

## 6. Tester les Sous-Domaines en Local

Pour tester le multi-tenant en local, ajouter au fichier `hosts` :

**Windows :** `C:\Windows\System32\drivers\etc\hosts`  
**Mac/Linux :** `/etc/hosts`

```
127.0.0.1   pandamarket.local
127.0.0.1   admin.pandamarket.local
127.0.0.1   boutique1.pandamarket.local
127.0.0.1   boutique2.pandamarket.local
```

Puis accéder via `http://boutique1.pandamarket.local:3000`

---

## 7. Troubleshooting

| Problème | Solution |
| :--- | :--- |
| PostgreSQL ne démarre pas | Vérifier qu'aucun autre service n'utilise le port 5432 |
| Redis connection refused | `docker-compose restart redis` |
| Meilisearch 401 | Vérifier `PD_MEILI_MASTER_KEY` dans `.env` |
| MinIO access denied | Vérifier les credentials dans `.env` |
| Next.js hot reload lent | Augmenter la mémoire Node : `NODE_OPTIONS=--max-old-space-size=4096` |
| Migration échoue | `docker-compose down -v` puis `docker-compose up -d` (reset BDD) |
| Port déjà utilisé | `npx kill-port 9000` ou `npx kill-port 3000` |
