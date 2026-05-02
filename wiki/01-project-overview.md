# 01 — Project Overview

## What is PandaMarket?

PandaMarket is a **Marketplace as a Service (MaaS)** platform built specifically for the Tunisian market. Think of it like Shopify + a central marketplace — vendors can create their own online store, and all products are also listed on a central hub where customers can browse and buy from multiple vendors.

## How the Platform Works

```
┌──────────────────────────────────────────────────────┐
│                   CUSTOMERS                          │
│  Browse hub ─── Search ─── Buy ─── Pay (TND)         │
└──────────────┬───────────────────────────────────────┘
               │
       ┌───────▼────────┐
       │  pandamarket.tn │  ◄── Central Hub (Next.js)
       │  (Hub Homepage) │      Browse all products
       └───────┬────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │       Vendor Subdomains                  │
    │  demo.pandamarket.tn  ─── Vendor Store   │
    │  shoes.pandamarket.tn ─── Vendor Store   │
    │  tech.pandamarket.tn  ─── Vendor Store   │
    └──────────┬──────────────────────────────┘
               │
       ┌───────▼────────┐
       │  Backend API    │  ◄── Express.js (Port 9000)
       │  /api/pd/*      │      Auth, Products, Orders
       └───────┬────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │       Infrastructure                     │
    │  PostgreSQL ── Redis ── Meilisearch       │
    │  MinIO (S3) ── BullMQ Workers             │
    └─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) | Server-side rendering, multi-tenant routing |
| **Backend** | Express.js + TypeScript | REST API, authentication, business logic |
| **Database** | PostgreSQL 16 | Relational data (users, stores, products, orders) |
| **Cache/Queue** | Redis 7 + BullMQ | Session cache, background job queues |
| **Search** | Meilisearch | Instant product search across all vendors |
| **Storage** | MinIO (S3-compatible) | Product images, theme assets, documents |
| **Reverse Proxy** | Caddy | HTTPS, wildcard subdomains, custom domain routing |

## Monorepo Structure

```
pandamarket/
├── backend/           # Express API server
│   ├── src/
│   │   ├── api/       # Route handlers (auth, products, orders, etc.)
│   │   ├── services/  # Business logic layer
│   │   ├── db/        # PostgreSQL pool + Redis client
│   │   ├── middlewares/# Auth, validation, rate limiting
│   │   ├── workers/   # BullMQ background workers (AI, email)
│   │   ├── migrations/# SQL migration files
│   │   └── main.ts    # Server entry point
│   └── package.json
│
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── hub/           # Central marketplace pages
│   │   │   │   ├── dashboard/ # Vendor dashboard (products, orders)
│   │   │   │   └── checkout/  # Checkout flow (Flouci, Konnect, Mandat)
│   │   │   └── store/[storeHost]/ # Dynamic vendor storefronts
│   │   ├── components/
│   │   │   ├── hub/           # Hub navbar, search bar
│   │   │   └── themes/        # Minimal, Classic, Modern themes
│   │   └── lib/               # Theme configs, utilities
│   └── package.json
│
├── packages/
│   └── types/         # Shared TypeScript types (@pandamarket/types)
│
├── docker-compose.yml # Dev infrastructure (Postgres, Redis, Meilisearch, MinIO)
├── Caddyfile          # Reverse proxy configuration
└── package.json       # Root workspace config
```

## Key Concepts

### Multi-Tenancy
Each vendor gets their own subdomain (e.g., `shoes.pandamarket.tn`). The Next.js middleware intercepts the hostname and routes to the correct store page with its chosen theme.

### Payment Gateways
PandaMarket supports Tunisian payment methods:
- **Flouci** — Online card/wallet payments
- **Konnect** — Online payments via Konnect network
- **Mandat Minute** — Manual post office transfer (customer uploads receipt)
- **COD** — Cash on Delivery

### Escrow System
When a customer pays, the money goes into escrow. After a configurable retention period, the vendor's wallet is credited (minus platform commission). Vendors can then withdraw to their bank account.
