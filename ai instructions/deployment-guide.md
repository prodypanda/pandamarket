# PandaMarket — Guide de Déploiement

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Prérequis Système

| Composant | Version Minimum | Recommandé |
| :--- | :--- | :--- |
| Node.js | 18 LTS | 20 LTS |
| PostgreSQL | 14 | 16 |
| Redis | 7 | 7.2 |
| Meilisearch | 1.6 | 1.8+ |
| Docker | 24 | 25+ |
| Docker Compose | 2.20 | 2.27+ |
| Caddy | 2.7 | 2.8+ |

### Serveur Minimum (Développement)
- 2 vCPU, 4 Go RAM, 50 Go SSD

### Serveur Recommandé (Production)
- 4 vCPU, 8 Go RAM, 200 Go SSD (+ stockage S3 séparé)

---

## 2. Variables d'Environnement

### Backend (MedusaJS)

```env
# Application
PD_NODE_ENV=production
PD_PORT=9000
PD_ADMIN_CORS=https://admin.pandamarket.tn
PD_STORE_CORS=https://pandamarket.tn,https://*.pandamarket.tn

# Base de données
PD_DATABASE_URL=postgresql://pd_user:password@localhost:5432/pandamarket
PD_DATABASE_POOL_SIZE=20

# Redis
PD_REDIS_URL=redis://localhost:6379

# Stockage S3-Compatible
PD_S3_ENDPOINT=http://localhost:9000       # MinIO local
PD_S3_BUCKET=pandamarket-files
PD_S3_ACCESS_KEY=minioadmin
PD_S3_SECRET_KEY=minioadmin
PD_S3_REGION=us-east-1

# Paiements
PD_FLOUCI_APP_TOKEN=flouci_app_xxx
PD_FLOUCI_APP_SECRET=flouci_secret_xxx
PD_KONNECT_API_KEY=konnect_xxx
PD_KONNECT_RECEIVER_WALLET=wallet_xxx

# IA
PD_GEMINI_API_KEY=gemini_xxx

# Meilisearch
PD_MEILI_HOST=http://localhost:7700
PD_MEILI_MASTER_KEY=meili_master_xxx

# JWT
PD_JWT_SECRET=jwt_secret_xxx
PD_COOKIE_SECRET=cookie_secret_xxx
```

### Frontend (Next.js)

```env
NEXT_PUBLIC_MEDUSA_URL=https://api.pandamarket.tn
NEXT_PUBLIC_HUB_DOMAIN=pandamarket.tn
NEXT_PUBLIC_MEILI_HOST=https://search.pandamarket.tn
NEXT_PUBLIC_MEILI_SEARCH_KEY=meili_search_xxx
```

---

## 3. Docker Compose (Développement)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pandamarket
      POSTGRES_USER: pd_user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  meilisearch:
    image: getmeili/meilisearch:v1.8
    environment:
      MEILI_MASTER_KEY: meili_master_xxx
    ports:
      - "7700:7700"
    volumes:
      - meili_data:/meili_data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"   # Console MinIO
    volumes:
      - minio_data:/data

volumes:
  pg_data:
  redis_data:
  meili_data:
  minio_data:
```

---

## 4. Caddyfile (Production)

```caddyfile
# Hub central
pandamarket.tn {
    reverse_proxy localhost:3000
}

# Panel Admin
admin.pandamarket.tn {
    reverse_proxy localhost:3000
}

# API Backend
api.pandamarket.tn {
    reverse_proxy localhost:9000
}

# Recherche
search.pandamarket.tn {
    reverse_proxy localhost:7700
}

# Wildcard - Boutiques vendeurs (sous-domaines)
*.pandamarket.tn {
    reverse_proxy localhost:3000
}
```

> **Note :** Caddy génère automatiquement les certificats SSL via Let's Encrypt. Pour les domaines personnalisés des vendeurs, utiliser l'option `on_demand_tls` de Caddy.

---

## 5. Commandes de Déploiement

### Initialisation

```bash
# 1. Cloner le repo
git clone https://github.com/pandamarket/pandamarket.git
cd pandamarket

# 2. Lancer les services (Docker)
docker-compose up -d

# 3. Installer les dépendances backend
cd backend && npm install

# 4. Appliquer les migrations BDD
npx medusa migrations run

# 5. Seed les données initiales (plans d'abonnement)
npx medusa seed -f data/seed.json

# 6. Lancer le backend
npm run start

# 7. Installer et lancer le frontend
cd ../frontend && npm install && npm run build && npm run start
```

### Mises à jour

```bash
git pull origin main
cd backend && npm install && npx medusa migrations run && npm run build
cd ../frontend && npm install && npm run build
# Restart les services via PM2 ou systemd
pm2 restart all
```

---

## 6. Monitoring & Logs

| Outil | Usage | Recommandation |
| :--- | :--- | :--- |
| **PM2** | Process manager Node.js | Gestion des crashs et restarts |
| **BullMQ Board** | Dashboard des queues IA | Monitoring des jobs |
| **PostgreSQL** | Logs requêtes lentes | `log_min_duration_statement = 200` |
| **Caddy** | Logs d'accès | Rotation automatique |

---

## 7. Stratégie de Backup

| Composant | Fréquence | Outil |
| :--- | :--- | :--- |
| PostgreSQL | Quotidien | `pg_dump` + cron |
| Redis | Horaire | RDB snapshots |
| MinIO (fichiers) | Quotidien | `mc mirror` vers backup S3 |
| Meilisearch | Quotidien | Snapshot API `/snapshots` |

---

## 8. Migration MinIO → Cloud

Quand le volume de fichiers dépasse la capacité du serveur local :

```bash
# 1. Changer les variables d'environnement
PD_S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
PD_S3_ACCESS_KEY=cloudflare_key
PD_S3_SECRET_KEY=cloudflare_secret

# 2. Migrer les fichiers existants
mc mirror local/pandamarket-files r2/pandamarket-files

# 3. Redémarrer le backend
pm2 restart backend
```

> ✅ Aucune modification de code nécessaire grâce à l'API S3-compatible.
