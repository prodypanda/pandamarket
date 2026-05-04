# 10 — API Reference

> **Base URL:** `https://api.pandamarket.tn` | **Prefix:** `/api/pd/`
> **Auth:** JWT Bearer Token | **API Docs:** `/api/docs` (Swagger UI)

## Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register vendor/customer | No |
| POST | `/auth/login` | Login (returns JWT + refresh token) | No |
| POST | `/auth/refresh` | Refresh access token | Refresh |
| POST | `/auth/logout` | Logout (revokes refresh token) | JWT |
| GET | `/auth/me` | Get current user info | JWT |
| POST | `/auth/forgot-password` | Request password reset email | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| POST | `/auth/send-verification` | Send email verification | JWT |
| GET | `/auth/verify-email` | Verify email with token | No |

## Stores

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/stores` | List all stores | No |
| GET | `/stores/:id` | Get store details | No |
| GET | `/stores/by-host/:hostname` | Resolve hostname to store | No |
| POST | `/stores` | Create a store | JWT (Vendor) |
| PUT | `/stores/:id` | Update store | JWT (Owner) |
| PUT | `/stores/:id/theme` | Change theme | JWT (Owner) |
| PUT | `/stores/:id/settings` | Update settings (colors, logo) | JWT (Owner) |
| PUT | `/stores/me/payment-config` | Configure direct payment keys | JWT (Pro+) |
| PUT | `/stores/:id/custom-domain` | Set custom domain | JWT (Owner) |

## Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/products` | List products (Hub or Store) | No |
| GET | `/products/:id` | Product detail | No |
| POST | `/products` | Create product (quota enforced) | JWT (Vendor) |
| PUT | `/products/:id` | Update product | JWT (Owner) |
| DELETE | `/products/:id` | Delete product | JWT (Owner) |
| GET | `/products/export` | Export products as CSV | JWT (Vendor) |
| POST | `/products/import` | Import products (JSON, max 500) | JWT (Vendor) |
| GET | `/products/:id/download` | Download digital product | JWT (Customer) |

## Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/orders` | List orders (customer or vendor) | JWT |
| GET | `/orders/:id` | Order detail | JWT |
| POST | `/orders` | Create order (checkout) | JWT (Customer) |
| PUT | `/orders/:id/fulfill` | Mark as shipped | JWT (Vendor) |
| PUT | `/orders/:id/cancel` | Cancel order | JWT |

## Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/payments/init` | Initialize payment (any gateway) | JWT |
| POST | `/payments/mandat/upload` | Upload mandat proof | JWT |
| POST | `/payments/webhook/flouci` | Flouci webhook callback | HMAC |
| POST | `/payments/webhook/konnect` | Konnect webhook callback | HMAC |

## Wallet

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/wallet` | Get wallet balance | JWT (Vendor) |
| GET | `/wallet/transactions` | Transaction history | JWT (Vendor) |
| POST | `/wallet/withdraw` | Request withdrawal | JWT (Vendor) |
| PUT | `/wallet/payout-mode` | Set auto/on-demand payout | JWT (Vendor) |

## Subscriptions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/subscriptions/plans` | List all plans | No |
| GET | `/subscriptions/current` | Current vendor plan | JWT (Vendor) |
| POST | `/subscriptions/upgrade` | Upgrade plan | JWT (Vendor) |
| POST | `/subscriptions/downgrade` | Downgrade plan | JWT (Vendor) |

## KYC Verification

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/verification/documents` | Submit KYC documents | JWT (Vendor) |
| GET | `/verification/status` | Check verification status | JWT (Vendor) |
| POST | `/verification/phone/send-otp` | Send phone OTP | JWT (Vendor) |
| POST | `/verification/phone/verify-otp` | Verify phone OTP | JWT (Vendor) |

## AI and Credits

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/credits` | Token balance | JWT (Vendor) |
| POST | `/credits/purchase` | Buy token pack | JWT (Vendor) |
| POST | `/ai/compress` | Compress image | JWT (Vendor) |
| POST | `/ai/seo-generate` | Generate SEO title/description | JWT (Vendor) |
| GET | `/ai/jobs/:id` | Job status | JWT (Vendor) |
| GET | `/ai/history` | Job history | JWT (Vendor) |

## Search

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/search?q=...` | Search products (Meilisearch) | No |
| GET | `/search/suggest?q=...` | Autocomplete suggestions | No |
| GET | `/categories` | List categories | No |

## Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | List notifications (paginated) | JWT |
| GET | `/notifications/unread-count` | Unread count | JWT |
| PUT | `/notifications/:id/read` | Mark as read | JWT |
| PUT | `/notifications/read-all` | Mark all as read | JWT |

## Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/reports` | Create fraud report | JWT (Customer) |

## Vendor API (External / ERP)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/vendor/products` | List vendor products | API Key |
| PUT | `/vendor/products/:id/stock` | Update stock | API Key |
| GET | `/vendor/orders` | List vendor orders | API Key |
| POST | `/vendor/api-keys` | Create API key | JWT (Agency+) |
| GET | `/vendor/api-keys` | List API keys | JWT (Vendor) |
| DELETE | `/vendor/api-keys/:id` | Revoke API key | JWT (Vendor) |

## Shipping

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/shipping/rates` | Calculate shipping rates | JWT |
| POST | `/shipping/shipments` | Create shipment | JWT (Vendor) |
| GET | `/shipping/shipments/:id/tracking` | Track shipment | JWT |

## Themes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/themes` | List all themes | No |
| GET | `/themes/:slug` | Get theme by slug | No |
| POST | `/themes/:slug/purchase` | Purchase premium theme | JWT (Vendor) |
| GET | `/themes/purchases` | List purchased themes | JWT (Vendor) |

## Page Builder

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/page-builder/pages` | List vendor pages | JWT (Regular+) |
| GET | `/page-builder/pages/:id` | Get page | JWT (Regular+) |
| POST | `/page-builder/pages` | Create page | JWT (Regular+) |
| PUT | `/page-builder/pages/:id` | Update page | JWT (Regular+) |
| DELETE | `/page-builder/pages/:id` | Delete page | JWT (Regular+) |
| POST | `/page-builder/pages/:id/duplicate` | Duplicate page | JWT (Regular+) |
| GET | `/stores/:id/pages` | List published pages (public) | No |
| GET | `/stores/:id/pages/:slug` | Get page by slug (public) | No |
| GET | `/stores/:id/pages/homepage` | Get homepage override | No |

## Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/stats` | Dashboard statistics | JWT (Admin) |
| GET | `/admin/verifications/pending` | KYC queue | JWT (Admin) |
| PUT | `/admin/verifications/:id/approve` | Approve KYC | JWT (Admin) |
| PUT | `/admin/verifications/:id/reject` | Reject KYC | JWT (Admin) |
| GET | `/admin/mandats/pending` | Mandat queue | JWT (Admin) |
| PUT | `/admin/mandats/:id/approve` | Approve mandat | JWT (Admin) |
| PUT | `/admin/mandats/:id/reject` | Reject mandat | JWT (Admin) |
| GET | `/admin/reports` | List reports | JWT (Admin) |
| PUT | `/admin/reports/:id/status` | Update report status | JWT (Admin) |
| GET | `/admin/products/pending` | Pending product approvals | JWT (Admin) |
| PUT | `/admin/products/:id/approve` | Approve product | JWT (Admin) |
| PUT | `/admin/products/:id/reject` | Reject product | JWT (Admin) |
| GET | `/admin/withdrawals` | Withdrawal requests | JWT (Admin) |
| GET | `/admin/audit-log` | Audit log | JWT (Admin) |
| GET | `/admin/ai-costs` | AI cost dashboard | JWT (Admin) |
| GET | `/admin/settings` | Get global settings | JWT (Admin) |
| PUT | `/admin/settings` | Update global settings | JWT (Admin) |
| GET | `/admin/smtp-config` | Get SMTP config | JWT (Admin) |
| PUT | `/admin/smtp-config` | Save SMTP config | JWT (Admin) |
| POST | `/admin/smtp-config/test` | Test SMTP connection | JWT (Admin) |

## Internal Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/internal/tls-allowed?hostname=...` | Caddy on-demand TLS gate | Internal |
| GET | `/health` | Liveness check | No |
| GET | `/ready` | Readiness check (DB+Redis+Meili+S3) | No |
| GET | `/metrics` | Prometheus metrics | No |

## Files

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/files/presign` | Get presigned upload URL | JWT |

## Response Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Not authenticated |
| `403` | Forbidden (quota exceeded, plan insufficient) |
| `404` | Not found |
| `409` | Conflict (duplicate subdomain, etc.) |
| `429` | Rate limited |
| `500` | Server error |
