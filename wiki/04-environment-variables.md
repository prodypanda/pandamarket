# 04 — Environment Variables Reference

Every config option uses a `PD_` prefix. The `.env` file lives at `backend/.env`.

---

## Application

| Variable | Default | Description |
|----------|---------|-------------|
| `PD_NODE_ENV` | `development` | `development`, `production`, or `test` |
| `PD_PORT` | `9000` | Backend port |
| `PD_LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error`, `fatal` |
| `PD_HUB_DOMAIN` | `pandamarket.local` | Hub domain for subdomain parsing |
| `PD_ADMIN_CORS` | `http://localhost:3000` | Allowed admin origins (comma-separated) |
| `PD_STORE_CORS` | `http://localhost:3000` | Allowed store origins (comma-separated) |

## Database

| Variable | Required | Description |
|----------|----------|-------------|
| `PD_DATABASE_URL` | ✅ | PostgreSQL connection string: `postgresql://user:pass@host:5432/db` |
| `PD_DATABASE_POOL_SIZE` | No | Max concurrent connections (default: 20) |
| `PD_DATABASE_SSL` | No | Enable SSL (default: false, set true in prod) |

## Redis

| Variable | Required | Description |
|----------|----------|-------------|
| `PD_REDIS_URL` | ✅ | Redis URL (default: `redis://localhost:6379`) |

## S3 / MinIO

| Variable | Default | Description |
|----------|---------|-------------|
| `PD_S3_ENDPOINT` | `http://localhost:9100` | S3 API endpoint |
| `PD_S3_FORCE_PATH_STYLE` | `true` | Path-style URLs (true for MinIO, false for AWS) |
| `PD_S3_BUCKET_PUBLIC` | `pd-product-images` | Public images bucket |
| `PD_S3_BUCKET_PRIVATE` | `pd-private-files` | Private files bucket |
| `PD_S3_BUCKET_THEMES` | `pd-themes` | Theme assets bucket |
| `PD_S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `PD_S3_SECRET_KEY` | `minioadmin` | S3 secret key |
| `PD_S3_PUBLIC_BASE_URL` | `http://localhost:9100/pd-product-images` | Public URL for images |

## Authentication

| Variable | Description |
|----------|-------------|
| `PD_JWT_SECRET` | **⚠️ CHANGE IN PROD!** JWT signing secret |
| `PD_JWT_ACCESS_EXPIRES_IN` | Access token TTL (default: `15m`) |
| `PD_JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default: `7d`) |
| `PD_COOKIE_SECRET` | **⚠️ CHANGE IN PROD!** Signed cookie secret |
| `PD_BCRYPT_ROUNDS` | Password hash rounds (default: `12`) |
| `PD_ENCRYPTION_KEY` | **⚠️ CHANGE IN PROD!** 64-char hex AES-256 key |

Generate a production encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Meilisearch

| Variable | Default | Description |
|----------|---------|-------------|
| `PD_MEILI_HOST` | `http://localhost:7700` | Meilisearch URL |
| `PD_MEILI_MASTER_KEY` | `meili_master_dev_key` | **⚠️ CHANGE IN PROD!** |
| `PD_MEILI_PRODUCTS_INDEX` | `products` | Search index name |

## Payments

| Variable | Description |
|----------|-------------|
| `PD_FLOUCI_APP_TOKEN` | Flouci token (from dashboard) |
| `PD_FLOUCI_APP_SECRET` | Flouci secret |
| `PD_KONNECT_API_KEY` | Konnect API key |
| `PD_KONNECT_RECEIVER_WALLET` | Konnect wallet ID |

## AI

| Variable | Description |
|----------|-------------|
| `PD_GEMINI_API_KEY` | Google Gemini key (empty = disable AI) |
| `PD_GEMINI_MODEL` | Model name (default: `gemini-1.5-flash`) |
| `PD_GEMINI_MAX_TOKENS` | Max output tokens (default: 500) |

## Email (SMTP)

| Variable | Description |
|----------|-------------|
| `PD_SMTP_HOST` | SMTP host (empty = log to console). Can also be configured via admin UI. |
| `PD_SMTP_PORT` | SMTP port (default: 587) |
| `PD_SMTP_USER` | SMTP username |
| `PD_SMTP_PASS` | SMTP password |
| `PD_MAIL_FROM` | Sender address (default: `PandaMarket <noreply@pandamarket.tn>`) |

> **Note:** SMTP can also be configured dynamically via the admin panel at `/(admin)/smtp-config`. The email worker reads config from the database with a 60-second cache TTL, falling back to env vars.

## SMS (Phone Verification)

| Variable | Description |
|----------|-------------|
| `PD_SMS_PROVIDER` | `twilio`, `infobip`, or `console` (default: console) |
| `PD_TWILIO_ACCOUNT_SID` | Twilio account SID |
| `PD_TWILIO_AUTH_TOKEN` | Twilio auth token |
| `PD_TWILIO_FROM_NUMBER` | Twilio sender phone number |

## Shipping

| Variable | Description |
|----------|-------------|
| `PD_ARAMEX_USERNAME` | Aramex API username |
| `PD_ARAMEX_PASSWORD` | Aramex API password |
| `PD_ARAMEX_ACCOUNT_NUMBER` | Aramex account number |

## Observability

| Variable | Description |
|----------|-------------|
| `PD_SENTRY_DSN` | Sentry DSN (empty = disable Sentry) |
| `PD_METRICS_ENABLED` | Enable Prometheus metrics at `/metrics` (default: false) |

## Business Logic

| Variable | Default | Description |
|----------|---------|-------------|
| `PD_DEFAULT_RETENTION_DAYS` | 7 | Escrow hold days before funds are available |
| `PD_DEFAULT_CURRENCY` | TND | Platform currency |
| `PD_MIN_WITHDRAWAL_TND` | 20 | Minimum withdrawal amount |

## Docker Secrets (Production)

In production, any variable can be loaded from a file by appending `_FILE` to the variable name. For example:
- `PD_JWT_SECRET_FILE=/run/secrets/jwt_secret` reads the secret from the file
- This is the Docker Secrets pattern used in `docker-compose.prod.yml`
- Run `scripts/init-secrets.sh` to generate all secret files
