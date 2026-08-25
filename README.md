# 🐼 PandaMarket

> **Tunisian MaaS** — Marketplace as a Service + Multi-tenant SaaS storefronts.
> Combines an Amazon-style central Hub with Shopify-style individual vendor stores.

[![Node](https://img.shields.io/badge/node-20%20LTS-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-UNLICENSED-red)]()
[![Status](https://img.shields.io/badge/status-WIP-yellow)]()

---

## 🎯 Overview

PandaMarket allows any Tunisian merchant to:

1. **Create their own online store** with a free subdomain (`my-shop.pandamarket.tn`) or a custom domain.
2. **Automatically list products** on a central Hub of discovery (`pandamarket.tn`).
3. **Accept local payments** (Flouci, Konnect, Mandat Minute, Cash on Delivery).
4. **Use AI tools** for SEO and image compression.
5. **Integrate ERP/POS** via REST API and outgoing webhooks.

### Current agent handoff

If you are a new AI agent or developer continuing the current work, start with:

- [`docs/AGENT_CHECKPOINT_2026-05-06.md`](./docs/AGENT_CHECKPOINT_2026-05-06.md)
- [`wiki/14-agent-checkpoint-current-state.md`](./wiki/14-agent-checkpoint-current-state.md)

These files summarize the storefront theming/cart/checkout pass, validation already run, key files, and rules for continuing without re-discovery.

### 7-tier subscription model

| Plan         | Price (TND/year) | Commission | Products | Custom Domain | AI Tools  | Direct Payment |
| :----------- | :--------------- | :--------- | :------- | :------------ | :-------- | :------------- |
| **Free**     | 0                | 15%        | 10       | ❌            | ❌        | ❌             |
| **Starter**  | 300              | 0%         | 50       | ✅            | Basic     | ❌             |
| **Regular**  | 600              | 0%         | 100      | ✅            | Basic     | ❌             |
| **Agency**   | 1 200            | 0%         | 300      | ✅            | Advanced  | ❌             |
| **Pro**      | 2 400            | 0%         | ∞        | ✅            | Unlimited | ✅             |
| **Golden**   | 4 800            | 0%         | ∞        | ✅            | Unlimited | ✅             |
| **Platinum** | 9 600            | 0%         | ∞        | ✅ + WL       | Premium   | ✅             |

---

## ⚙️ Tech Stack

| Layer              | Technology                  | Purpose                                |
| :----------------- | :-------------------------- | :------------------------------------- |
| **Backend**        | Node.js 20 + TypeScript     | API + business logic (MedusaJS-style)  |
| **Frontend**       | Next.js 16 (App Router)     | Hub + multi-tenant storefronts         |
| **Database**       | PostgreSQL 16               | Relational data                        |
| **Cache + Queues** | Redis 7 + BullMQ            | Sessions, async jobs                   |
| **Search**         | Meilisearch                 | Hub product search (typo-tolerant)     |
| **Storage**        | MinIO (dev) → R2/S3 (prod)  | Files, images, KYC docs                |
| **Reverse Proxy**  | Caddy                       | Auto SSL (wildcard + on-demand)        |
| **AI Image**       | sharp                       | Image compression                      |
| **AI SEO**         | Google Gemini Pro           | Title + meta-description generation    |
| **Payments**       | Flouci, Konnect, Mandat, COD| Tunisia-first gateways                 |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20 LTS** (`nvm install 20`)
- **Docker Desktop** 4.30+
- **Git** 2.40+

### 1. Clone & install

```bash
git clone https://github.com/prodypanda/pandamarket
cd pandamarket
npm install
```

### 2. Start infrastructure

```bash
npm run docker:up
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 4. Migrate & seed the database

```bash
cd backend && npm run migrate && npm run seed && cd ..
```

### 5. Run dev servers

```bash
npm run dev
```

| Service     | URL                                |
| :---------- | :--------------------------------- |
| Hub         | http://localhost:3000              |
| Backend API | http://localhost:9000              |
| Meilisearch | http://localhost:7700              |
| MinIO API   | http://localhost:9100              |
| MinIO UI    | http://localhost:9101              |

### 6. Test multi-tenant locally

Add to your `hosts` file:

```
127.0.0.1   pandamarket.local
127.0.0.1   admin.pandamarket.local
127.0.0.1   boutique1.pandamarket.local
```

Then visit http://boutique1.pandamarket.local:3000

### 7. Test accounts (after seed)

| Role                   | Email                       | Password    |
| :--------------------- | :-------------------------- | :---------- |
| Super Admin            | `admin@pandamarket.tn`      | `Admin123!` |
| Vendor (Verified, Pro) | `vendor.pro@test.tn`        | `Test123!`  |
| Vendor (Free)          | `vendor.free@test.tn`       | `Test123!`  |
| Customer               | `customer@test.tn`          | `Test123!`  |

---

## 📁 Project Structure

```
pandamarket/
├── ai instructions/         # 📚 Project specs (PRD, architecture, etc.)
├── backend/                 # 🛠 MedusaJS-style backend
│   ├── src/
│   │   ├── api/             # REST routes (/api/pd/*)
│   │   ├── models/          # Database entities
│   │   ├── services/        # Business logic
│   │   ├── workers/         # BullMQ async jobs (AI, emails)
│   │   ├── plugins/         # Payment plugins
│   │   ├── validators/      # Zod schemas
│   │   ├── errors/          # Custom PdError classes
│   │   └── migrations/      # SQL migrations
│   └── data/seed.ts
├── frontend/                # 🎨 Next.js (App Router)
│   ├── src/app/
│   │   ├── hub/             # Hub central pages
│   │   ├── store/           # Vendor storefront + central /store routes
│   │   ├── hub/dashboard/   # Vendor dashboard
│   │   └── (admin)/         # Admin panel
│   ├── src/components/themes/ # Storefront templates
│   ├── src/components/store/  # Storefront/cart shared components
│   ├── src/lib/             # Routing, theme, marketplace helpers
│   └── src/middleware.ts    # Hostname-based tenant detection
├── packages/types/          # Shared TS types
├── docker-compose.yml
├── Caddyfile
└── package.json             # npm workspaces root
```

---

## 📚 Documentation

- **Current agent checkpoint:** [`docs/AGENT_CHECKPOINT_2026-05-06.md`](./docs/AGENT_CHECKPOINT_2026-05-06.md)
- **Wiki index:** [`wiki/README.md`](./wiki/README.md)
- **Project overview:** [`wiki/01-project-overview.md`](./wiki/01-project-overview.md)
- **AI/project instructions:** [`ai instructions/`](./ai%20instructions/)
- **Frontend agent rules:** [`frontend/AGENTS.md`](./frontend/AGENTS.md)

For product work, start with `spécifications fonctionnelles (PRD).md`. For current storefront/theming continuation, start with the checkpoint file above.

---

## 🛣 Roadmap

| Phase | Weeks | Theme                         | Status         |
| :---- | :---- | :---------------------------- | :------------- |
| 1     | 1–3   | Core Backend (extensions, KYC)| 🚧 In Progress |
| 2     | 4–6   | Multi-Tenant Frontend         | 🚧 In Progress |
| 3     | 7–9   | Hub Marketplace + Search      | ⏳ Planned     |
| 4     | 10–11 | Local Payments + Shipping     | ⏳ Planned     |
| 5     | 12–13 | AI Workers + Notifications    | ⏳ Planned     |
| 6     | 14–16 | Vendor API + Polish           | ⏳ Planned     |

---

## 📜 License

UNLICENSED — Proprietary. All rights reserved © PandaMarket.

---

> 🐼 _Built with care for the Tunisian e-commerce ecosystem._

<!-- Original GitLab template content below -->
