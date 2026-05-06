# 13 — Local URLs, Auth Flow, and Dashboard Reference

This page centralizes the local development URLs, authentication behavior, and dashboard entry points for PandaMarket.

## Core Local Services

| Service | URL |
|---|---|
| Frontend / Hub | `http://localhost:3000` |
| Backend API | `http://localhost:9000` |
| Backend API through frontend proxy | `http://localhost:3000/api/pd` |
| Backend health | `http://localhost:9000/health` |
| Backend readiness | `http://localhost:9000/ready` |
| Swagger UI | `http://localhost:9000/api/docs` |
| Swagger JSON | `http://localhost:9000/api/docs.json` |
| Metrics, if enabled | `http://localhost:9000/metrics` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| Meilisearch | `http://localhost:7700` |
| MinIO API | `http://localhost:9100` |
| MinIO Console | `http://localhost:9101` |

## Frontend Proxy and CSRF

Frontend client code should call backend APIs through the local proxy path:

```text
/api/pd/*
```

The proxy is configured in `frontend/next.config.ts` and forwards to:

```text
http://localhost:9000/api/pd/*
```

Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) must include the CSRF header:

```text
X-CSRF-Token: <pd_csrf cookie value>
```

Use `fetchWithCsrf` from:

```text
frontend/src/lib/api.ts
```

## Auth Behavior

Protected frontend routes are guarded by `frontend/src/middleware.ts` using the `pd_at` auth cookie.

If the user is not logged in, protected routes redirect to:

```text
/login?next=<original-path>
```

After successful login, the login page honors the `next` parameter and returns the user to the originally requested route.

The Hub header account button behaves as follows:

| State | Header account link |
|---|---|
| Logged out | `Login` → `/login` |
| Logged in vendor with store | `My Dashboard` → `/hub/dashboard` |
| Logged in admin or super admin | `My Dashboard` → `/dashboard` |
| Logged in user without store | `My Dashboard` → `/hub/vendor-signup` |

## Test Accounts

After seeding the database, these accounts are available:

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@pandamarket.tn` | `Admin123!` |
| Vendor, Pro | `vendor.pro@test.tn` | `Test123!` |
| Vendor, Free | `vendor.free@test.tn` | `Test123!` |
| Customer | `customer@test.tn` | `Test123!` |

## Hub and Auth Pages

| Page | URL |
|---|---|
| Hub home | `http://localhost:3000/hub` |
| Login | `http://localhost:3000/login` |
| Register | `http://localhost:3000/register` |
| Forgot password | `http://localhost:3000/forgot-password` |
| Reset password | `http://localhost:3000/reset-password` |
| Search | `http://localhost:3000/hub/search` |
| Pricing | `http://localhost:3000/hub/pricing` |
| Cart | `http://localhost:3000/hub/cart` |
| Checkout | `http://localhost:3000/hub/checkout` |
| Wishlist | `http://localhost:3000/hub/wishlist` |
| Profile | `http://localhost:3000/hub/profile` |
| Customer orders | `http://localhost:3000/hub/orders` |
| Product detail | `http://localhost:3000/store/{storeHost}/products/{categorySlug}/{productSlug}` |
| Category | `http://localhost:3000/hub/category/{slug}` |

## Vendor Dashboard Pages

| Page | URL |
|---|---|
| Overview | `http://localhost:3000/hub/dashboard` |
| Products | `http://localhost:3000/hub/dashboard/products` |
| Orders | `http://localhost:3000/hub/dashboard/orders` |
| Wallet | `http://localhost:3000/hub/dashboard/wallet` |
| Page builder | `http://localhost:3000/hub/dashboard/page-builder` |
| AI tools | `http://localhost:3000/hub/dashboard/ai` |
| KYC | `http://localhost:3000/hub/dashboard/kyc` |
| Subscription | `http://localhost:3000/hub/dashboard/subscription` |
| API keys | `http://localhost:3000/hub/dashboard/api-keys` |
| Webhooks | `http://localhost:3000/hub/dashboard/webhooks` |
| Payment config | `http://localhost:3000/hub/dashboard/payment-config` |
| Reports | `http://localhost:3000/hub/dashboard/reports` |
| Notifications | `http://localhost:3000/hub/dashboard/notifications` |
| Settings | `http://localhost:3000/hub/dashboard/settings` |

## Super Admin Pages

| Page | URL |
|---|---|
| Dashboard | `http://localhost:3000/dashboard` |
| KYC review | `http://localhost:3000/kyc` |
| Mandats | `http://localhost:3000/mandats` |
| Reports | `http://localhost:3000/reports` |
| Users / vendors | `http://localhost:3000/users` |
| Withdrawals | `http://localhost:3000/withdrawals` |
| Plans | `http://localhost:3000/plans` |
| AI costs | `http://localhost:3000/ai-costs` |
| Audit log | `http://localhost:3000/audit-log` |
| SMTP config | `http://localhost:3000/smtp-config` |
| Settings | `http://localhost:3000/settings` |

## Storefront Pages

Direct route format:

```text
http://localhost:3000/store/{storeHost}
```

Examples:

```text
http://localhost:3000/store/boutique1
http://localhost:3000/store/minimal-demo
```

Store routes:

| Page | URL |
|---|---|
| Store home | `http://localhost:3000/store/{storeHost}` |
| Store cart | `http://localhost:3000/store/{storeHost}/cart` |
| Store checkout | `http://localhost:3000/store/{storeHost}/checkout` |
| Store product | `http://localhost:3000/store/{storeHost}/products/{categorySlug}/{productSlug}` |
| Store custom page | `http://localhost:3000/store/{storeHost}/pages/{slug}` |

## Local Multi-Tenant Hostnames

Add these entries to the Windows hosts file for local hostname testing:

```text
127.0.0.1 pandamarket.local
127.0.0.1 admin.pandamarket.local
127.0.0.1 boutique1.pandamarket.local
```

Then visit:

```text
http://pandamarket.local:3000
http://admin.pandamarket.local:3000
http://boutique1.pandamarket.local:3000
```

## Dashboard Data Notes

The vendor dashboard should use authenticated vendor/store data:

| Area | Data source |
|---|---|
| Current user | `GET /api/pd/auth/me` |
| Current vendor store | `GET /api/pd/stores/me` |
| Vendor products | `GET /api/pd/stores/me/products` |
| Vendor orders | `GET /api/pd/orders/store` |
| Vendor wallet | `GET /api/pd/wallet/me` |
| Store settings save | `PUT /api/pd/stores/me/settings` |
| Theme save | `PUT /api/pd/stores/me/theme` |
| Domain save | `PUT /api/pd/stores/me/domain` |
| Shipping save | `PUT /api/pd/stores/me/shipping` |

If a dashboard action shows a network-style error, first verify that:

- **Frontend proxy is used:** API path starts with `/api/pd`.
- **Backend is running:** `http://localhost:9000/health` returns `status: ok`.
- **User is authenticated:** `GET /api/pd/auth/me` returns the current user.
- **Vendor has a store:** `GET /api/pd/stores/me` returns the current store.
- **CSRF is present:** mutating requests use `fetchWithCsrf`.
