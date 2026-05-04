# 11 — Security Guide

> All 22 security items from the specification have been implemented and verified.

## Authentication and Authorization

### JWT Tokens
- **Access token:** 15-minute expiry, contains `{ sub, role, store_id, iat, exp }`
- **Refresh token:** 7-day expiry, stored as SHA-256 hash in `pd_refresh_tokens` table
- **Token rotation:** On refresh, old token is revoked and new pair issued in a transaction
- **Reuse detection:** Using a revoked refresh token returns `PdAuthenticationError`

### Password Security
- **bcrypt** with 12 rounds (configurable via `PD_BCRYPT_ROUNDS`)
- **Login lockout:** 5 failed attempts triggers 15-minute lockout via Redis
- **Forgot/reset password:** Crypto-random token, SHA-256 hash stored in Redis (1h TTL), all refresh tokens revoked on reset

### Role-Based Access Control (RBAC)
- `customer` — Buy, report, manage profile
- `vendor` — Manage store/products/orders (limited by plan)
- `vendor_verified` — Same + instant product publication
- `admin` / `super_admin` — Full platform access

### Middleware Guards
All defined in `backend/src/middlewares/index.ts`:
- `requireAuth` — Validates JWT
- `requireAdmin` — Admin role check
- `requireVendor` — Vendor role check
- `requireStore` — Verifies store ownership (tenant isolation)
- `requireApiKey` — API key authentication for vendor external API

## Encryption

| Data | Method | Details |
|------|--------|---------|
| Passwords | bcrypt (12 rounds) | Never stored in plain text |
| Vendor payment keys (Flouci/Konnect) | AES-256-GCM | Encrypted at rest in `payment_config` JSONB |
| API keys | SHA-256 hash | Only hash stored, key shown once on creation |
| SMTP password | AES-256-GCM | Encrypted in `pd_platform_config` |
| Data in transit | TLS 1.3 | Caddy handles SSL automatically |

**Generate a production encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Security

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 10 requests | 15 minutes |
| `POST /auth/register` | 3 requests | 1 hour |
| `POST /auth/forgot-password` | 3 requests | 1 hour |
| Public API (search, products) | 100 requests | 1 minute |
| File uploads | 10 requests | 5 minutes |

### CORS
- Origin callback function in `main.ts`
- Explicitly rejects wildcard `*` in production mode
- Supports credentials (httpOnly cookies)
- Dynamic vendor custom domains supported

### CSRF Protection
- Double-submit cookie pattern
- `pd_csrf` cookie + `X-CSRF-Token` header validation
- Implemented in `backend/src/middlewares/csrf.middleware.ts`

### Input Validation
- **Zod** schemas on all route inputs (`backend/src/validators/`)
- File type validation on uploads (images: jpg/png/webp, docs: jpg/png/pdf)
- Size limits: 10MB images, 50MB digital products

### Security Headers (via Helmet)
- **Content-Security-Policy:** Explicit directives for scripts, styles, fonts, images, connections, frames
- **HSTS:** `max-age=31536000; includeSubDomains; preload`
- **X-Content-Type-Options:** nosniff
- **X-Frame-Options:** DENY (via `frame-ancestors: 'none'`)
- **Referrer-Policy:** strict-origin-when-cross-origin

## Payment Security

### Webhook Verification
- **HMAC-SHA256** signature verification on both Flouci and Konnect webhooks
- Uses `crypto.timingSafeEqual()` to prevent timing attacks
- Implemented in `backend/src/api/payment.route.ts`

### Payment Idempotency
- `pd_payment_event` table with `UNIQUE(gateway, gateway_event_id)` constraint
- Duplicate webhooks detected via PostgreSQL error code 23505
- `orderService.markPaid()` also guards with `payment_status != 'captured'`

### Wallet Operations
- `FOR UPDATE` row locks on all wallet balance operations
- `roundTnd()` utility for TND 3-decimal precision
- Append-only `pd_wallet_transaction` audit trail (never deleted)
- Atomic transactions for all credit/debit operations

## Tenant Isolation

- Every vendor query filters by `store_id` from the authenticated user's JWT
- `requireStore` middleware verifies ownership before any store-scoped operation
- AI jobs, orders, products, wallet, API keys all enforce tenant isolation
- Verified by 8-section tenant isolation test suite

## Logging and Monitoring

### PII Redaction
Pino logger configured with redact paths:
- `password`, `password_hash`, `token`, `access_token`, `refresh_token`
- `api_key`, `secret`, `flouci_app_secret`, `konnect_api_key`
- `authorization`, `cookie`
- All redacted to `[REDACTED]`

### Observability
- **Sentry** error reporting (5xx only, PII stripped, lazy-loaded)
- **Prometheus** metrics at `GET /metrics` (HTTP histogram, request counter, business events)
- **Structured JSON logging** via Pino with request IDs
- **Audit log** table + middleware for admin actions (KYC approve/reject, mandat, suspend)

### Health Checks
- `GET /health` — Liveness (always returns 200 if server is up)
- `GET /ready` — Readiness (checks PostgreSQL, Redis, Meilisearch, MinIO with per-service latency)

## Secrets Management

### Development
- Plain `.env` file in `backend/.env` (in `.gitignore`)
- All variables use `PD_` prefix

### Production
- `config.ts` reads `_FILE` suffixed env vars (Docker Secrets pattern)
- `docker-compose.prod.yml` uses file-based secrets at `/run/secrets/`
- `scripts/init-secrets.sh` generates all secrets with `openssl rand`
- Documentation in `docs/secrets-setup.md` covers Docker Compose, Swarm, Kubernetes, and Vault

## CI/CD Security Gates

The `.gitlab-ci.yml` pipeline includes:
1. **Lint stage:** TypeScript type-check + ESLint (backend + frontend)
2. **Test stage:** Vitest with PostgreSQL + Redis services
3. **Security stage:** SAST, Secret Detection, Dependency Scanning, `npm audit`
4. **Build stage:** `tsc` + `next build`
5. **E2E stage:** Playwright tests

## Pre-Launch Checklist

- [x] All secrets in environment variables (not in code)
- [x] `.env` in `.gitignore`
- [x] HTTPS enforced (Caddy handles redirect)
- [x] Rate limiting on all endpoints
- [x] Security headers configured (CSP, HSTS, etc.)
- [x] CORS configured (no wildcard in production)
- [x] Zod validation on all inputs
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] Vendor API keys encrypted with AES-256-GCM
- [x] Webhooks signed (inbound verified, outbound HMAC-signed)
- [x] PostgreSQL/Redis not exposed to internet
- [x] `npm audit` in CI pipeline
- [x] Structured logs without sensitive data
- [x] Backups automated and tested
- [x] Refresh token rotation with reuse detection
- [x] Login lockout after failed attempts
- [x] CSRF protection on cookie-based flows
- [x] Tenant isolation verified with tests
- [x] Audit log on admin actions
- [x] Sentry error reporting configured
- [x] Docker Secrets support for production
