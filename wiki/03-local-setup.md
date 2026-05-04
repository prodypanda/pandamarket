# 03 — Local Setup Guide (Windows)

This guide walks you through setting up PandaMarket on your Windows computer from scratch.

---

## Disk Space Requirements

Make sure you have enough free disk space before starting:

| Component | Approximate Size |
|-----------|-----------------|
| Source code (cloned repo) | ~8 MB |
| Node.js dependencies (`node_modules`) | ~610 MB |
| Next.js build cache (`.next/`) | ~28 MB |
| Docker images (PostgreSQL, Redis, Meilisearch, MinIO) | ~1.5 GB |
| Docker data volumes (databases, files) | ~200 MB (grows with usage) |
| **Total minimum free space needed** | **~2.5 GB** |

> 💡 The largest packages are **Next.js** (~165 MB), **@next/swc-win32-x64-msvc** (~131 MB), **lucide-react** (~37 MB), **TypeScript** (~23 MB x2), and **sharp** (~19 MB). These are platform-specific native binaries for Windows x64.

---

## Step 1: Clone the Repository

Open **PowerShell** and run:

```powershell
# Navigate to where you want the project
cd C:\Users\YourName\Documents

# Clone the repository
git clone https://your-gitlab-server.com/pandamarket/pandamarket.git

# Enter the project folder
cd pandamarket
```

---

## Step 2: Start Infrastructure Services

PandaMarket needs PostgreSQL, Redis, Meilisearch, and MinIO running. Docker handles all of this for you.

```powershell
# Make sure Docker Desktop is running first!
# Then start all services:
docker compose up -d
```

You should see output like:
```
✔ Container pd_postgres    Started
✔ Container pd_redis       Started
✔ Container pd_meilisearch Started
✔ Container pd_minio       Started
✔ Container pd_minio_setup Started
```

### Verify services are running:

```powershell
docker compose ps
```

All containers should show `running` or `healthy` status.

### Useful URLs (after Docker is running):

| Service | URL | Purpose |
|---------|-----|---------|
| PostgreSQL | `localhost:5432` | Database (no web UI) |
| Redis | `localhost:6379` | Cache (no web UI) |
| Meilisearch | http://localhost:7700 | Search engine dashboard |
| MinIO Console | http://localhost:9101 | S3 file browser (login: `minioadmin` / `minioadmin`) |

---

## Step 3: Install Node.js Dependencies

### ⚠️ Windows Symlink Requirement (IMPORTANT — Read First!)

PandaMarket uses **npm workspaces**, which require symlinks to link the `backend`, `frontend`, and `packages/*` folders inside `node_modules`. On Windows, creating symlinks requires one of the following:

**Option A — Enable Developer Mode (Recommended):**
1. Open **Settings** → **Update & Security** → **For developers**
2. Toggle **Developer Mode** to **ON**
3. Restart your terminal (close and reopen PowerShell)

**Option B — Run as Administrator:**
1. Right-click PowerShell → **Run as Administrator**
2. Navigate to your project folder before running `npm install`

> 💡 If you skip this step, you will get an `EISDIR: illegal operation on a directory, symlink` error.

---

### Install Dependencies

From the **project root** folder, run:

```powershell
npm install
```

This installs dependencies for all workspaces (backend, frontend, and shared types). It may take 2–3 minutes.

> ⚠️ You might see deprecation warnings (e.g., `@types/bcryptjs`, `inflight`, `glob`) — these are safe to ignore. The project works fine.

If you previously attempted `npm install` and it failed, clean up first:

```powershell
# Remove the broken node_modules
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force backend\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force frontend\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages\types\node_modules -ErrorAction SilentlyContinue

# Then install fresh
npm install
```

---

## Step 4: Create the Environment File

The backend needs a `.env` file to know how to connect to the databases.

```powershell
# Create the .env file in the backend folder
Copy-Item backend\.env.example backend\.env
```

If there's no `.env.example`, create the file manually:

```powershell
New-Item -Path backend\.env -ItemType File
```

Then open `backend\.env` in VS Code and paste the following:

```env
# =====================================================
# PandaMarket Backend — Local Development
# =====================================================

# App
PD_NODE_ENV=development
PD_PORT=9000
PD_LOG_LEVEL=info
PD_HUB_DOMAIN=pandamarket.local

# CORS (frontend URLs)
PD_ADMIN_CORS=http://localhost:3000
PD_STORE_CORS=http://localhost:3000

# Database
PD_DATABASE_URL=postgresql://pd_user:pd_password@localhost:5432/pandamarket
PD_DATABASE_POOL_SIZE=20
PD_DATABASE_SSL=false

# Redis
PD_REDIS_URL=redis://localhost:6379

# S3 (MinIO)
PD_S3_ENDPOINT=http://localhost:9100
PD_S3_FORCE_PATH_STYLE=true
PD_S3_BUCKET_PUBLIC=pd-product-images
PD_S3_BUCKET_PRIVATE=pd-private-files
PD_S3_BUCKET_THEMES=pd-themes
PD_S3_ACCESS_KEY=minioadmin
PD_S3_SECRET_KEY=minioadmin
PD_S3_REGION=us-east-1
PD_S3_PUBLIC_BASE_URL=http://localhost:9100/pd-product-images

# Auth
PD_JWT_SECRET=dev_jwt_secret_change_in_production_1234567890
PD_JWT_ACCESS_EXPIRES_IN=15m
PD_JWT_REFRESH_EXPIRES_IN=7d
PD_COOKIE_SECRET=dev_cookie_secret_change_in_production
PD_BCRYPT_ROUNDS=12

# Encryption
PD_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000

# Meilisearch
PD_MEILI_HOST=http://localhost:7700
PD_MEILI_MASTER_KEY=meili_master_dev_key
PD_MEILI_PRODUCTS_INDEX=products

# Payments (sandbox / test mode)
PD_FLOUCI_BASE_URL=https://developers.flouci.com/api
PD_FLOUCI_APP_TOKEN=sandbox_token
PD_FLOUCI_APP_SECRET=sandbox_secret
PD_KONNECT_BASE_URL=https://api.preprod.konnect.network/api/v2
PD_KONNECT_API_KEY=sandbox_key
PD_KONNECT_RECEIVER_WALLET=sandbox_wallet

# AI (optional — leave empty to disable)
PD_GEMINI_API_KEY=
PD_GEMINI_MODEL=gemini-1.5-flash
PD_GEMINI_MAX_TOKENS=500

# Mail (optional — leave empty for console logging)
PD_SMTP_HOST=
PD_SMTP_PORT=587
PD_SMTP_USER=
PD_SMTP_PASS=
PD_MAIL_FROM=PandaMarket <noreply@pandamarket.tn>

# Misc
PD_DEFAULT_RETENTION_DAYS=7
PD_DEFAULT_CURRENCY=TND
PD_MIN_WITHDRAWAL_TND=20
```

---

## Step 5: Run Database Migrations

This creates all the tables in PostgreSQL:

```powershell
npm run migrate -w backend
```

You should see output like:
```
✓ Applied migration 001_initial_schema.sql
✓ Applied migration 002_wallet_tables.sql
...
Database is up to date
```

---

## Step 6: Seed the Database (Optional)

If a seed script exists, you can populate the database with sample data:

```powershell
npm run seed -w backend
```

---

## Step 7: Start the Development Servers

You have two options:

### Option A: Start everything at once (recommended)

```powershell
npm run dev
```

This starts both the backend (port 9000) and frontend (port 3000) simultaneously.

### Option B: Start them separately (two terminals)

**Terminal 1 — Backend:**
```powershell
npm run dev -w backend
```

**Terminal 2 — Frontend:**
```powershell
npm run dev -w frontend
```

---

## Step 8: Verify Everything Works

Open your browser and visit:

| URL | What you should see |
|-----|-------------------|
| http://localhost:3000 | The PandaMarket Hub homepage |
| http://localhost:9000/health | `{"status":"ok","timestamp":"..."}` |
| http://localhost:7700 | Meilisearch dashboard |
| http://localhost:9101 | MinIO console (login: minioadmin/minioadmin) |

---

## 🎉 You're Done!

Your local development environment is now running. Here's what you have:

- ✅ PostgreSQL database with all tables created
- ✅ Redis for caching and job queues
- ✅ Meilisearch for instant product search
- ✅ MinIO for file/image storage
- ✅ Backend API running on port 9000
- ✅ Frontend running on port 3000

Next: Read **[04 — Environment Variables](04-environment-variables.md)** to understand each setting, or **[06 — Running the Project](06-running-the-project.md)** for daily development commands.
