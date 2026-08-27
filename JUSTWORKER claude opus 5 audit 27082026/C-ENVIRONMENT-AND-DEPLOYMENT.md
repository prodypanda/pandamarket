# Appendix C · Environment & Deployment Configuration

[← Index](./00-README.md) · Prev: [Appendix B](./B-DATABASE-FINDINGS.md) · Next: [Appendix D](./D-PAGE-STATUS-MATRIX.md)

Detailed inventory of environment variables configured on Render (Backend) and Vercel (Frontend).

## 1. Render Environment (srv-d9qjrth42hec73efhoa0)
- **Configured Variables (16 total):**
  - `NODE_ENV`: `production`
  - `PORT`: `9000`
  - `PD_DATABASE_URL`: Supabase AWS eu-central-1 pooler
  - `PD_REDIS_URL`: Redis 7
  - `PD_JWT_SECRET`: Configured (35 chars)
  - `PD_COOKIE_SECRET`: Configured (38 chars)
  - `PD_ENCRYPTION_KEY`: Configured (64 hex chars)
  - `PD_SENTRY_DSN`: Configured
  - `PD_SMS_PROVIDER`: `whatsapp_gateway` (unsupported string in code)
  - `PD_WHATSAPP_GATEWAY_URL`: Evolution API URL (unread by code)
  - `PD_WHATSAPP_GATEWAY_TOKEN`: Evolution API token (unread by code)
  - `PD_ALLOW_SANDBOX_PAYMENTS`: `true`
  - `RENDER_EXTERNAL_URL`: Render auto-set
- **Missing / Critical Variables:**
  - `PD_SMTP_*` / `PD_MAIL_FROM`: **Absent** (causes `email_not_delivered` in worker)
  - `PD_S3_*`: **Absent** (falls back to local MinIO / Postgres blobs)
  - `PD_MEILI_*`: **Absent** (falls back to Postgres search)
  - `PD_HUB_DOMAIN`: **Absent** (defaults to `pandamarket.local`, breaking URL generators)

## 2. Vercel Environment (prj_f0I1YhUlcTCSY8MZ8KV4M6b5Ob)
- Main marketplace domain: `www.garbage.team`
- Wildcard storefront preview: `*.garbage.team`
- Admin host: `admin.garbage.team`
