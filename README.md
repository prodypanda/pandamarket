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
| **Frontend**       | Next.js 14 (App Router)     | Hub + multi-tenant storefronts         |
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
git clone https://gitlab.com/prodypanda1/pandamarket.git
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
<details>
<summary>Original GitLab template</summary>



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/user/project/repository/web_editor/#create-a-file) or [upload](https://docs.gitlab.com/user/project/repository/web_editor/#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.com/prodypanda1/pandamarket.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

* [Set up project integrations](https://gitlab.com/prodypanda1/pandamarket/-/settings/integrations)

## Collaborate with your team

* [Invite team members and collaborators](https://docs.gitlab.com/user/project/members/)
* [Create a new merge request](https://docs.gitlab.com/user/project/merge_requests/creating_merge_requests/)
* [Automatically close issues from merge requests](https://docs.gitlab.com/user/project/issues/managing_issues/#closing-issues-automatically)
* [Enable merge request approvals](https://docs.gitlab.com/user/project/merge_requests/approvals/)
* [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/topics/autodevops/requirements/)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ci/environments/protected_environments/)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.


