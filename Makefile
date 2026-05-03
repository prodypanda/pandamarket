# PandaMarket — Common Operations
# Usage: make <target>

.PHONY: help dev stop logs db-reset db-migrate db-seed test lint build clean

# Default target
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Development ─────────────────────────────────────────────────────────────

dev: ## Start all services (Docker + backend + frontend)
	docker compose up -d
	@echo "✅ Docker services started"
	@echo "Starting backend..."
	cd backend && npm run dev &
	@echo "Starting frontend..."
	cd frontend && npm run dev &
	@echo "🐼 PandaMarket running at http://localhost:3000"

stop: ## Stop all services
	docker compose down
	@echo "✅ All services stopped"

restart: ## Restart Docker services
	docker compose restart
	@echo "✅ Services restarted"

# ─── Logs ────────────────────────────────────────────────────────────────────

logs: ## Show all Docker logs (follow)
	docker compose logs -f

logs-pg: ## Show PostgreSQL logs
	docker compose logs -f postgres

logs-redis: ## Show Redis logs
	docker compose logs -f redis

logs-meili: ## Show Meilisearch logs
	docker compose logs -f meilisearch

# ─── Database ────────────────────────────────────────────────────────────────

db-migrate: ## Run database migrations
	cd backend && npx tsx src/migrations/run.ts
	@echo "✅ Migrations applied"

db-rollback: ## Rollback last migration
	cd backend && npx tsx src/migrations/rollback.ts
	@echo "✅ Migration rolled back"

db-seed: ## Seed the database with initial data
	cd backend && npx tsx data/seed.ts
	@echo "✅ Database seeded"

db-reset: ## Reset database (destroy + recreate + migrate + seed)
	docker compose down -v
	docker compose up -d postgres redis meilisearch minio
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 3
	$(MAKE) db-migrate
	$(MAKE) db-seed
	@echo "✅ Database reset complete"

db-shell: ## Open PostgreSQL shell
	docker compose exec postgres psql -U pd_user -d pandamarket

# ─── Workers ─────────────────────────────────────────────────────────────────

workers: ## Start all BullMQ workers (using runner entrypoints with graceful shutdown)
	cd backend && npx tsx src/workers/ai-runner.ts &
	cd backend && npx tsx src/workers/email-runner.ts &
	cd backend && npx tsx src/workers/payout-runner.ts &
	cd backend && npx tsx src/workers/subscription-runner.ts &
	cd backend && npx tsx src/workers/webhook-runner.ts &
	cd backend && npx tsx src/workers/search-runner.ts &
	@echo "✅ All 6 workers started"

# ─── Testing ─────────────────────────────────────────────────────────────────

test: ## Run backend unit tests
	cd backend && npx vitest run

test-watch: ## Run backend tests in watch mode
	cd backend && npx vitest

test-coverage: ## Run tests with coverage report
	cd backend && npx vitest run --coverage

# ─── Code Quality ────────────────────────────────────────────────────────────

lint: ## Run ESLint on all code
	cd backend && npx tsc --noEmit
	@echo "✅ Backend type check passed"

format: ## Format code with Prettier
	npx prettier --write "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}"
	@echo "✅ Code formatted"

# ─── Build ───────────────────────────────────────────────────────────────────

build: ## Build both backend and frontend for production
	cd backend && npx tsc
	cd frontend && npm run build
	@echo "✅ Production build complete"

build-docker: ## Build Docker images
	docker build -t pandamarket-backend ./backend
	docker build -t pandamarket-frontend ./frontend
	@echo "✅ Docker images built"

# ─── Backup & Restore ────────────────────────────────────────────

backup: ## Run full backup (PostgreSQL + Redis + Meilisearch)
	bash scripts/backup.sh
	@echo "✅ Backup complete"

backup-db: ## Backup PostgreSQL only
	bash scripts/backup.sh --db-only
	@echo "✅ Database backup complete"

# ─── Cleanup ─────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts and node_modules
	rm -rf backend/dist frontend/.next
	@echo "✅ Build artifacts cleaned"

clean-all: clean ## Remove everything including node_modules
	rm -rf node_modules backend/node_modules frontend/node_modules packages/types/node_modules
	@echo "✅ All node_modules removed"

# ─── Install ─────────────────────────────────────────────────────────────────

install: ## Install all dependencies
	npm install
	@echo "✅ Dependencies installed"
