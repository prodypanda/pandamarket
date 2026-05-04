# 05 — Database & Migrations

## How Migrations Work

PandaMarket uses a custom SQL migration runner. Migration files are `.sql` files stored in `backend/src/migrations/sql/` and are applied in alphabetical order.

The system tracks which migrations have been applied in a `pd_migrations` table.

## Current Migrations

The project has 5 SQL migration files:

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | 16 core tables (users, stores, products, orders, wallet, credits, KYC, reports, etc.) + indexes + triggers |
| `002_payment_idempotency_and_webhooks.sql` | Payment events (idempotency), webhook subscriptions/deliveries, audit log, platform config |
| `003_shipping_and_digital.sql` | License keys, shipments, pickup requests |
| `004_theme_purchases.sql` | Theme purchase tracking + price columns on themes |
| `005_page_builder.sql` | Store pages for GrapesJS page builder |

All tables use the `pd_` prefix (e.g., `pd_store`, `pd_product`, `pd_order`).

## Running Migrations

```powershell
# Apply all pending migrations
npm run migrate -w backend

# Output example:
# ✓ Applied migration 001_initial_schema.sql
# ✓ Applied migration 002_wallet_tables.sql
# Database is up to date
```

## Rolling Back

```powershell
npm run migrate:rollback -w backend
```

## Creating a New Migration

1. Create a new `.sql` file in `backend/src/migrations/sql/`
2. Name it with a numeric prefix: `003_add_reviews_table.sql`
3. Write your SQL:

```sql
CREATE TABLE pd_reviews (
    id          VARCHAR(30) PRIMARY KEY,
    product_id  VARCHAR(30) NOT NULL REFERENCES pd_product(id),
    user_id     VARCHAR(30) NOT NULL REFERENCES pd_user(id),
    rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

4. Run `npm run migrate -w backend`

## Seeding Sample Data

```powershell
npm run seed -w backend
```

## Connecting to the Database Directly

Using Docker:
```powershell
docker exec -it pd_postgres psql -U pd_user -d pandamarket
```

Common SQL queries:
```sql
-- List all tables
\dt

-- View users
SELECT id, email, role FROM pd_user;

-- View stores
SELECT id, name, subdomain, subscription_plan FROM pd_store;

-- Check migrations
SELECT * FROM pd_migrations ORDER BY executed_at;
```

To exit: type `\q` and press Enter.
