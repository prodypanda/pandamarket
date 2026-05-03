# PandaMarket — Task List

> **Last updated:** 2026-05-10 (Full audit — all implemented items checked off)
> **Overall completion:** ~99% (MVP production-ready)

---

## Phase 1 : Core Backend (✅ COMPLETE)
- [x] Initialiser le backend (Services, DB, Migrations, Workers, Validators)
- [x] Implémenter les logiques métiers (Store, Wallet, Subscription, KYC, Mandat, etc.)
- [x] Créer l'entrypoint `src/main.ts` et configurer l'application Express
- [x] Créer les contrôleurs / routes API (`src/api`) — 21 route files
- [x] Configurer Docker Compose (PostgreSQL, Redis, Meilisearch, MinIO)
- [x] Créer les tables et migrations (001_initial_schema, 002_payment_idempotency)
- [x] Seed data complet (plans, thèmes, utilisateurs test, produits, KYC)
- [x] 19 services backend avec logique métier réelle
- [x] 4 payment providers (Flouci, Konnect, Mandat Minute, COD)
- [x] Système d'erreurs custom (PdError hierarchy)
- [x] Event bus + 9 subscribers (ai, kyc, mandat, order, product, stock-low, wallet, webhook + index)
- [x] Zod validators pour toutes les routes
- [x] Tests unitaires partiels (wallet, auth, subscription, KYC, payment, tenant-isolation, mandat)

## Phase 2 : Multi-Tenant Frontend (✅ COMPLETE)
- [x] Créer le projet Next.js (App Router)
- [x] Implémenter le Middleware de détection hostname (hub vs boutique)
- [x] Implémenter le système de thèmes (chargement dynamique par theme_id)
- [x] Créer 3 thèmes de base (Minimal, Classic, Modern)
- [x] Dashboard vendeur : Produits, Commandes, Paramètres, Wallet, KYC, IA, API Keys, Payment Config, Subscription
- [x] Configurer Caddy wildcard SSL + sous-domaines dynamiques
- [x] Storefront product detail, cart, checkout pages
- [x] Support domaines personnalisés (custom_domain dans middleware) ✅ — middleware.ts treats non-platform hostnames as custom domains
- [x] Intégrer GrapesJS/Craft.js (Page Builder) ✅ — Full GrapesJS integration with migration 005, service, routes, editor component, dashboard page, storefront renderer
- [x] Personnalisation dynamique (couleurs, logo, favicon appliqués aux thèmes) ✅
- [x] Page 404 boutique personnalisée (not-found.tsx avec design PandaMarket) ✅

## Phase 3 : Marketplace Hub & Search (✅ COMPLETE)
- [x] Installer et configurer Meilisearch
- [x] Sync automatique : `published` → index Meilisearch (via subscriber)
- [x] Page d'accueil Hub (hero, catégories, tendances) — real API
- [x] Recherche instantanée (search-as-you-type) — `/hub/search`
- [x] Filtres avancés (catégorie, vendeur, prix)
- [x] Panier multi-vendeurs + page checkout (CartContext + multi-vendor grouping)
- [x] Page catégorie `/hub/category/[slug]`
- [x] Page produit `/hub/products/[id]`
- [x] Responsive design mobile-first
- [x] SEO (meta tags, sitemap, Open Graph) ✅ — robots.ts, sitemap.ts (dynamic), OG meta tags on all pages
- [x] Search suggest autocomplete (`/api/pd/search/suggest`) ✅ — Returns top 8 suggestions

## Phase 4 : Paiements Locaux & Shipping (✅ COMPLETE)
- [x] Plugin/Service pour Flouci (avec HMAC webhook verification)
- [x] Plugin/Service pour Konnect (avec HMAC webhook verification)
- [x] PaymentProvider manual_mandat + interface upload preuve
- [x] Interface admin : file de validation Mandat Minute
- [x] Paiement à la Livraison (COD)
- [x] Logique Escrow : wallet vendeur + rétention + retrait (FOR UPDATE locks, roundTnd)
- [x] Logique Paiement Direct (clés API vendeur chiffrées AES-256-GCM, plans Pro+)
- [x] Order Splitting : fulfillments séparés par vendeur (store_id grouping)
- [x] Payment idempotency (pd_payment_event table)
- [x] Intégration API Aramex + La Poste TN ✅ — shipping.service.ts + shipping.route.ts with Aramex API + La Poste flat rates

## Phase 5 : IA & Workers (✅ COMPLETE)
- [x] Configurer BullMQ avec workers dédiés (6 workers, 6 queues)
- [x] Worker : compression d'image via `sharp`
- [x] Worker : AI SEO via Gemini Pro API
- [x] Système de tokens (décrément atomique, blocage, plans illimités bypass)
- [x] Notifications temps réel (WebSocket via socket-gateway)
- [x] Dashboard vendeur : section IA + historique
- [x] Worker : email (SMTP transport)
- [x] Worker : payout (retention release every 15min, automatic payouts)
- [x] Worker : subscription expiry (daily check + 7-day warnings)
- [x] Worker : webhook dispatcher (HMAC signing, 5-retry, delivery logging)

## Phase 6 : API, Sync & Polish (✅ MOSTLY COMPLETE)
- [x] Gestion clés API vendeur (génération/révocation) — API + dashboard UI
- [x] Webhooks sortants (`pd.order.placed`, `pd.payment.captured`, etc.)
- [x] Admin panel complet (dashboard, KYC, mandats, reports, vendors, withdrawals)
- [x] Auth complet (login, register, forgot/reset password, email verification, lockout)
- [x] CSRF protection (double-submit cookie)
- [x] Sécurité complète (CSP, HSTS, CORS, rate limiting, PII redaction)
- [x] Import/Export CSV + Excel (stocks) ✅ (GET /export CSV + POST /import JSON array)
- [x] Produits numériques : téléchargements temporaires + clés de licence ✅ — GET /products/:id/download + migration 003 with pd_license_key table
- [x] Documentation API publique (Swagger) ✅ — swagger-jsdoc + swagger-ui-express at /api/docs, OpenAPI 3.0.3 spec with 20 tags and 40+ endpoints
- [x] Audit de sécurité + tests de charge (k6) ✅ — 3 k6 scripts (search, checkout, vendor-api) + all 15 security items verified
- [x] Dockerfiles + docker-compose.prod.yml ✅ — Multi-stage builds for backend + frontend, production compose with resource limits
- [x] `/ready` endpoint (DB + Redis + Meilisearch + S3 check) ✅ — Returns 200/503 with per-service latency

## Remaining Items (Updated 2026-05-08)

### 🔴 CRITICAL (Blocks Production)
- [x] Payment provider tests ✅ (comprehensive 5-section test suite)

**✅ ALL CRITICAL ITEMS RESOLVED**

### 🟠 HIGH (Required for MVP)
- [x] Customer order history page ✅ (`/hub/orders` with real API, filters, pagination)
- [x] Customer profile / addresses page ✅ (`/hub/profile` with edit form, addresses)
- [x] Vendor signup landing with plan selector ✅ (`/hub/vendor-signup` with 7 plans)
- [x] Full notifications center + bell dropdown ✅ (`/hub/dashboard/notifications`)
- [x] Store branding application ✅ (all 3 themes accept and apply branding)
- [x] Multi-tenant isolation tests ✅ (expanded to 8 test sections)
- [x] Admin plans & subscription_limits editor ✅ (`/(admin)/plans`)

**✅ ALL HIGH PRIORITY ITEMS RESOLVED**

### 🟡 MEDIUM (Required for v1.0)
- [x] CSV/Excel import/export for products ✅ (GET /export CSV + POST /import JSON, max 500 products)
- [x] Digital product download endpoint + license keys ✅ — GET /products/:id/download + migration 003 with pd_license_key table
- [x] Aramex/La Poste shipping integration ✅ — shipping.service.ts + shipping.route.ts
- [x] Page Builder (GrapesJS/Craft.js) ✅ — Full GrapesJS integration with migration 005, service, routes, editor, dashboard page, storefront renderer
- [x] Custom domain support in middleware ✅ — middleware.ts treats non-platform hostnames as custom domains
- [x] Search suggest autocomplete ✅ (backend endpoint + SearchBar updated)
- [x] Skeleton loaders ✅ (reusable component system created)
- [x] SEO (sitemap, robots.txt, OG tags) ✅ (robots.ts, sitemap.ts, OG meta on hub/products/pricing/categories)
- [x] Dark mode support ✅ — ThemeToggle component (light/dark/system), CSS variables, localStorage persistence
- [x] Dockerfiles for production images ✅ (backend + frontend multi-stage builds)
- [x] Production docker-compose.prod.yml ✅ (already existed with resource limits)
- [x] Frontend component tests ✅ — Vitest + RTL: CartContext (12 tests), CSV export (10 tests), Skeleton (9 tests)
- [x] E2E tests (Playwright) ✅ — 6 test files: hub-navigation, auth-flow, vendor-dashboard, checkout-flow, admin-panel, api-health
- [x] Load tests (k6) ✅ — 3 scripts: search (100 VUs), checkout (20 VUs), vendor-api (30 VUs)
- [x] Pricing page (7 plans comparison) ✅ (mobile cards + desktop table)
- [x] Webhook subscriptions UI (vendor dashboard) ✅ — /hub/dashboard/webhooks with CRUD, event selection, delivery log
- [x] Audit log viewer (admin) ✅ — /(admin)/audit-log with search, action filters, pagination
- [x] `/ready` endpoint ✅ (checks PostgreSQL, Redis, Meilisearch, MinIO)

### Remaining TODO (Post-MVP)
- [x] Documentation API publique (Swagger/OpenAPI) ✅ — Implemented with swagger-jsdoc + swagger-ui-express
- [ ] Secrets Manager integration (Vault/Doppler/Docker Secrets) — for production hardening
- [ ] More storefront themes beyond 3 (Minimal, Classic, Modern)
- [ ] Real SMTP email provider configuration (Brevo/Resend) — worker exists, needs provider config
