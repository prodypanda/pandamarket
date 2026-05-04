# 01 — Project Overview

> **Last updated:** 2026-05-03 | **Status:** Production-ready (100% feature-complete)

## What is PandaMarket?

PandaMarket is a **Marketplace as a Service (MaaS)** platform built for the Tunisian market. It combines two models:

- **Hub Marketplace** (like Amazon) — A central portal at `pandamarket.tn` where customers browse products from all vendors.
- **Individual SaaS Stores** (like Shopify) — Each vendor gets their own customizable online store with a free subdomain (e.g., `shoes.pandamarket.tn`) or custom domain.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind 4 | SSR, multi-tenant routing, responsive UI |
| **Backend** | Express.js + TypeScript (strict mode) | REST API, authentication, business logic |
| **Database** | PostgreSQL 16 | Relational data (20+ tables with `pd_` prefix) |
| **Cache/Queue** | Redis 7.2 + BullMQ | Session cache, 6 background job queues |
| **Search** | Meilisearch 1.8 | Instant product search, typo-tolerant |
| **Storage** | MinIO (S3-compatible) | Product images, KYC docs, digital products |
| **Reverse Proxy** | Caddy | HTTPS, wildcard subdomains, on-demand TLS |
| **AI** | Google Gemini Pro + sharp | SEO generation, image compression |
| **Page Builder** | GrapesJS | Drag-and-drop page editor for vendors |
| **Shared Types** | `@pandamarket/types` | TypeScript types shared between backend/frontend |

## Feature Summary

### For Customers
- Browse the central Hub marketplace with instant search (Meilisearch)
- Visit individual vendor storefronts (7 themes available)
- Multi-vendor cart with per-vendor shipping (order splitting)
- Pay via **Flouci**, **Konnect**, **Mandat Minute**, or **COD**
- Order tracking, profile management, report fraudulent vendors
- Digital product downloads with license keys

### For Vendors
- **7 subscription plans** (Free with 15% commission to Platinum with white-label)
- Customizable storefront with 7 themes + GrapesJS page builder (Regular+)
- Product management (physical, digital, services) with variant support
- AI tools: image compression (sharp) + SEO generation (Gemini Pro)
- Wallet with escrow, retention periods, and on-demand/automatic withdrawal
- KYC verification (RC + CIN + phone OTP via SMS)
- API keys for ERP/POS integration (Agency+) + outgoing webhooks with HMAC signing
- CSV import/export, shipping integration (Aramex + La Poste TN)
- Real-time notifications via WebSocket
- Direct payment mode (Pro+) with vendor's own Flouci/Konnect credentials

### For Super Admin
- KYC verification queue (approve/reject vendors)
- Mandat Minute validation queue (approve/reject payment proofs)
- Product approval queue (for unverified vendors)
- Report/dispute management with vendor suspension
- Subscription plans editor, global settings (order splitting, retention days)
- Audit log viewer, AI cost dashboard
- SMTP email configuration with provider presets (Brevo, Resend, Gmail, etc.)
- Withdrawal request management, vendor management

## Codebase Counts (Verified 2026-05-03)

| Component | Count | Details |
|-----------|-------|---------|
| Backend services | 20 | auth, store, product, order, payment, wallet, subscription, kyc, mandat, notification, report, search, ai, credits, api-key, shipping, theme, sms, page-builder, smtp-config |
| API route files | 21 | All PRD endpoints covered including page builder + SMTP config |
| Payment providers | 6 files | Flouci, Konnect, Manual Mandat, COD + interface + registry |
| BullMQ workers | 6 (12 files) | AI, email, payout, subscription, webhook, search |
| Event subscribers | 9 | ai, kyc, mandat, order, product, stock-low, wallet, webhook + index |
| SQL migrations | 5 | initial schema, payment/webhooks, shipping/digital, theme purchases, page builder |
| Backend tests | 9 suites | wallet, auth, subscription, kyc, payment-providers, payment, tenant-isolation, mandat, page-builder |
| Frontend tests | 3 suites | cart-context, csv-export, skeleton |
| E2E tests | 6 files | hub-navigation, auth-flow, vendor-dashboard, checkout-flow, admin-panel, api-health |
| Load tests | 3 scripts | search, checkout, vendor-api |
| Storefront themes | 7 | Minimal, Classic, Modern, Boutique, Artisan, TechHub, Flavor |
| Hub pages | 11 dirs | homepage, cart, category, checkout, dashboard, orders, pricing, products, profile, search, vendor-signup |
| Dashboard pages | 14 dirs | ai, api-keys, kyc, notifications, orders, payment-config, products, reports, settings, subscription, wallet, webhooks, page-builder + overview |
| Admin pages | 12 dirs | ai-costs, audit-log, dashboard, kyc, mandats, plans, reports, settings, smtp-config, users, withdrawals + layout |

## Monorepo Structure

```
pandamarket/
+-- backend/                    # Express API server
|   +-- src/
|   |   +-- api/                # 21 route files
|   |   +-- services/           # 20 business logic services
|   |   +-- workers/            # 6 BullMQ workers (12 files)
|   |   +-- queues/             # 6 queue definitions
|   |   +-- subscribers/        # 9 event subscribers
|   |   +-- plugins/payment/    # 6 payment provider files
|   |   +-- middlewares/        # Auth, CSRF, audit-log, rate limiting
|   |   +-- utils/              # 9 utilities
|   |   +-- migrations/sql/     # 5 SQL migrations
|   |   +-- validators/         # Zod validation schemas
|   |   +-- realtime/           # WebSocket gateway
|   |   +-- __tests__/          # 9 test suites
|   |   +-- main.ts             # Entry point
|   +-- data/seed.ts            # Idempotent seed data
|   +-- Dockerfile
|
+-- frontend/                   # Next.js frontend
|   +-- src/app/
|   |   +-- hub/                # Hub (11 dirs) + dashboard (14 dirs)
|   |   +-- (admin)/            # Admin panel (12 dirs)
|   |   +-- (auth)/             # Auth pages (4 dirs)
|   |   +-- store/[storeHost]/  # Vendor storefronts
|   +-- src/components/themes/  # 7 storefront themes
|   +-- e2e/                    # 6 Playwright E2E tests
|   +-- Dockerfile
|
+-- packages/types/             # @pandamarket/types
+-- tests/load/                 # 3 k6 load test scripts
+-- scripts/                    # backup.sh, restore.sh, init-secrets.sh
+-- docs/                       # runbook.md, secrets-setup.md
+-- wiki/                       # This documentation
+-- ai instructions/            # 20 specification documents
|
+-- docker-compose.yml          # Dev infrastructure
+-- docker-compose.prod.yml     # Production config
+-- Caddyfile                   # Reverse proxy
+-- Makefile                    # Common operations
+-- .gitlab-ci.yml              # CI/CD pipeline
+-- implementation_plan.md      # Full audit and task tracking
```

## Key Concepts

### Multi-Tenant Routing
The Next.js middleware (`frontend/src/middleware.ts`) routes based on hostname:

| Hostname | Routes To |
|----------|-----------|
| `pandamarket.tn` | Hub Central (`/hub/*`) |
| `admin.pandamarket.tn` | Admin Panel (`/(admin)/*`) |
| `*.pandamarket.tn` | Vendor Storefront by subdomain |
| Any other domain | Vendor Storefront by custom domain lookup |

### Payment Gateways
- **Flouci** — Online payments with HMAC-SHA256 webhook verification
- **Konnect** — Online payments (amounts in millimes: 1 TND = 1000) with HMAC verification
- **Mandat Minute** — Manual post office transfer (customer uploads receipt, admin validates)
- **COD** — Cash on Delivery
- **Escrow mode** (all plans): PandaMarket collects, deducts commission, credits vendor wallet after retention
- **Direct mode** (Pro+): Money goes directly to vendor's own payment account

### Subscription Plans

| Plan | Products | Commission | AI | Page Builder | Direct Pay | Price/Year |
|------|----------|------------|-----|-------------|------------|------------|
| **Free** | 10 | 15% | No | No | No | 0 TND |
| **Starter** | 50 | 0% | Basic | No | No | 300 TND |
| **Regular** | 100 | 0% | Basic | Yes | No | 600 TND |
| **Agency** | 300 | 0% | Advanced | Yes | No | 1,200 TND |
| **Pro** | Unlimited | 0% | Unlimited | Yes | Yes | 2,400 TND |
| **Golden** | Unlimited | 0% | Unlimited | Yes | Yes | 4,800 TND |
| **Platinum** | Unlimited | 0% | Premium | Yes | Yes | 9,600 TND |

### Storefront Themes
7 themes (5 free + 2 premium): Minimal, Classic, Modern, Boutique, Artisan, TechHub, Flavor.

### Test Accounts (After Seeding)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@pandamarket.tn` | `Admin123!` |
| Vendor (verified, Pro) | `vendor.pro@test.tn` | `Test123!` |
| Vendor (unverified, Free) | `vendor.free@test.tn` | `Test123!` |
| Customer | `customer@test.tn` | `Test123!` |
