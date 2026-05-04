# 06 — Running the Project

## Daily Development Workflow

### 1. Start Docker (if not already running)
Make sure Docker Desktop is open, then:
```powershell
docker compose up -d
```

### 2. Start the Dev Servers
```powershell
# Both backend + frontend at once
npm run dev
```

Or separately:
```powershell
# Terminal 1: Backend (port 9000)
npm run dev -w backend

# Terminal 2: Frontend (port 3000)
npm run dev -w frontend
```

### 3. Open in Browser

| URL | Page |
|-----|------|
| http://localhost:3000 | Hub Homepage |
| http://localhost:3000/hub/dashboard | Vendor Dashboard |
| http://localhost:3000/hub/checkout | Checkout Page |
| http://localhost:9000/health | API Health Check |

## Background Workers

PandaMarket has 6 BullMQ workers that process asynchronous tasks. Start them in separate terminals:

```powershell
# AI worker (image compression, SEO generation)
npm run worker:ai -w backend

# Email worker (sends emails via SMTP, reads config from DB)
npm run worker:email -w backend

# Payout worker (releases retained funds every 15 min)
npm run worker:payout -w backend

# Subscription worker (checks expiry daily at 02:00, sends warnings at 09:00)
npm run worker:subscription -w backend

# Webhook worker (dispatches outgoing webhooks with HMAC signing)
npm run worker:webhook -w backend

# Search worker (full Meilisearch reindex daily at 03:00)
npm run worker:search -w backend
```

> **Note:** For development, the AI and email workers are the most important. The others run on cron schedules and can be started as needed.

## Useful Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start both backend + frontend |
| `npm run build` | Build for production |
| `npm run lint` | Check code for errors |
| `npm run format` | Auto-format all code with Prettier |
| `npm run type-check -w backend` | Check TypeScript types without building |
| `npm run test -w backend` | Run backend unit tests (9 suites) |
| `npm run test -w frontend` | Run frontend unit tests (3 suites) |
| `npm run migrate -w backend` | Apply database migrations |
| `npm run seed -w backend` | Seed sample data (plans, themes, test users) |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:logs` | View Docker logs (live) |
| `npm run docker:reset` | Delete all data and restart fresh |

### Makefile Targets (if using `make`)

| Target | Description |
|--------|-------------|
| `make dev` | Start dev environment |
| `make test` | Run all tests |
| `make lint` | Lint all code |
| `make build` | Build for production |
| `make db-migrate` | Run migrations |
| `make db-seed` | Seed database |
| `make db-reset` | Reset database (migrate + seed) |
| `make backup` | Backup all data (PostgreSQL, Redis, Meilisearch, MinIO) |
| `make workers` | Start all BullMQ workers |

## Stopping Everything

```powershell
# Stop the dev servers: press Ctrl+C in the terminal

# Stop Docker services
docker compose down

# Stop AND delete all data (fresh start)
docker compose down -v
```
