# Project: PandaMarket Feature 20 — Store Subscriptions, Followed Feed, AI Interest Engine & Seller Loyalty

## Architecture
PandaMarket is a multi-tenant marketplace platform built with Node.js/Express/PostgreSQL backend and Next.js 16 App Router frontend.
- **Backend**: Express + TypeScript, raw PostgreSQL connection pool (`getPool()`), BullMQ async workers on Redis (`pd_ai_queue`, `pd_notification_batch_queue`, `pd_email_queue`), Socket.IO gateway (`socketGateway.emitToUser`), `@google/generative-ai` (Gemini Pro).
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, Lucide React, Socket.IO client, `fetchWithCsrf` client layer with automatic session refresh.
- **Admin**: Superadmin `/admin/notes` interactive task workspace with folder ID `ff32063c-baff-42ca-ad94-768b20c5e6d4` and `/admin/settings` platform configuration with optimistic concurrency & advisory locks.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DB Schema & Migrations | Create `pd_store_subscription`, `pd_buyer_interest_profile`, `pd_seller_broadcast`, add columns `interest_tags`, `subscribers_count`, `verified_subscribers_count` | M1 | ORIGINAL_REQUEST R1, R3, R5 |
| 2 | Superadmin Admin-Notes DB Population | Populate Folder `ff32063c-baff-42ca-ad94-768b20c5e6d4` with 6 task cards and 44 interactive checklist items | M1 | ORIGINAL_REQUEST R6 |
| 3 | Store Subscription REST APIs | `POST/DELETE /api/pd/stores/:id/subscribe`, `GET /api/pd/stores/:id/subscription-status`, `GET /api/pd/buyer/subscriptions` | M2 | ORIGINAL_REQUEST R1 |
| 4 | Anti-Bot Verified Subscriber Logic | Verify buyer has $\ge 1$ completed purchase to increment `verified_subscribers_count` | M2 | ORIGINAL_REQUEST R1 |
| 5 | Seller Logarithmic Trust Score Formula | $0.40 \cdot \text{Rating} + 0.30 \cdot \text{SLA} + 0.20 \cdot \log_{10}(\text{Verified Subs}+1) - 0.10 \cdot \text{Dispute Rate}$ | M2 | ORIGINAL_REQUEST R5 |
| 6 | Store Follow UI Button & Badges | Animated `StoreFollowButton` with optimistic UI and live badges on PDP seller hover card, seller action bar, and vendor directory cards | M2 | ORIGINAL_REQUEST R1 |
| 7 | Sliding 15-min Notification Buffer | BullMQ 15-min debounced sliding aggregation buffer in `pd_notification_batch_queue` for price drops and new product publications | M3 | ORIGINAL_REQUEST R2 |
| 8 | In-App Notification Center & WebSocket Push | Single consolidated notifications in notification center dropdown + real-time `socketGateway.emitToUser` push | M3 | ORIGINAL_REQUEST R2 |
| 9 | 7:00 PM Daily Email Digest | BullMQ repeatable cron `0 19 * * *` dispatching daily summary of followed store updates to opted-in buyers | M3 | ORIGINAL_REQUEST R2 |
| 10 | Gemini Pro AI Product Auto-Tagging | Event-driven BullMQ jobs on product creation/update + nightly sweep cron generating normalized `interest_tags` | M4 | ORIGINAL_REQUEST R3 |
| 11 | Dynamic Buyer Interest Profile Engine | Calculate tag weights with 60-day exponential decay formula: $\sum W(e) \cdot e^{-\Delta t/60}$ (Orders=5, Subs=4, Likes=2) | M4 | ORIGINAL_REQUEST R3 |
| 12 | 'My Followed Feed' Page (`/my-followed-feed`) | Section 1: Mes Boutiques Suivies carousel, Section 2: Nouveautés & Baisses de Prix timeline, Section 3: Découvertes & Boutiques Similaires | M4 | ORIGINAL_REQUEST R3 |
| 13 | Strict Seller Retention Boundary | Enforce 100% competitor-free private store pages (`*.pandamarket.tn`); cross-seller recommendations restricted to Marketplace Hub & Followed Feed | M4 | ORIGINAL_REQUEST R3 |
| 14 | Marketplace Hub 30% Interest Injection | Hub feed generator injecting ~30% interest-matched products for logged-in buyers | M5 | ORIGINAL_REQUEST R4 |
| 15 | Superadmin Feed Algorithm Tuning Controls | Platform settings for `hub_feed_base_sort` (shuffled/newest/alpha/bestsellers) and `hub_feed_personalization_pct` (0-50%) in `/admin/settings` | M5 | ORIGINAL_REQUEST R4 |
| 16 | AI Auto-Tagging Diagnostic Monitor | Health monitor card in `/admin/settings` and `GET /api/pd/admin/analytics/ai-tagging-health` reporting tag coverage and status | M5 | ORIGINAL_REQUEST R4 |
| 17 | Seller Dashboard 'Abonnés & Fidélité' Tab | New dashboard route `/hub/dashboard/loyalty` with 4 Growth KPI cards (Total, New this week, % Verified, Growth rate) | M6 | ORIGINAL_REQUEST R5 |
| 18 | Subscriber Broadcast Composer & Rate Limiter | Send custom message + store coupon to subscribers, rate-limited to max 2 broadcasts/calendar week | M6 | ORIGINAL_REQUEST R5 |
| 19 | Broadcast History Table & Audience Map | Broadcast performance table (claims %, GMV) and geographic breakdown across 24 Tunisian governorates | M6 | ORIGINAL_REQUEST R5 |
| 20 | Complete E2E Test Suite & Coverage Hardening | 100% passing E2E tests (Tiers 1-4) + Tier 5 Adversarial Coverage Hardening | M7 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Migrations & Admin-Notes Seeding | Schema migration `073_store_subscriptions_and_ai_interest.sql`, seed folder `ff32063c-baff-42ca-ad94-768b20c5e6d4` with 6 task cards and 44 checklist items | none | DONE |
| M2 | Store Subscriptions & Anti-Bot Verification | Backend subscription service, APIs, anti-bot purchase check, trust score formula, frontend `StoreFollowButton` & badges | M1 | DONE |
| M3 | Smart Batched Notifications | 15-min BullMQ sliding buffer, consolidated in-app notifications, WebSocket push, 7:00 PM email digest, bell dropdown UI | M2 | DONE |
| M4 | AI Interest Engine & 'My Followed Feed' Page | Gemini auto-tagging, dynamic buyer interest profile calculation with 60-day decay, `/my-followed-feed` page (3 sections), strict storefront isolation | M2 | DONE |
| M5 | Marketplace Hub Algorithm Tuning & Superadmin | 30% feed injection, superadmin settings card in `/admin/settings`, base sorting selector, personalization slider, AI health monitor | M4 | DONE |
| M6 | Seller Loyalty Dashboard & Broadcasts | Seller dashboard `/hub/dashboard/loyalty`, KPI cards, broadcast composer with 2/week limit, history table, Tunisian governorate map | M2 | DONE |
| M7 | E2E Verification & Adversarial Hardening | Verification of 100% E2E test suite (Tiers 1-4) + Tier 5 adversarial testing + forensic integrity audit | M1, M2, M3, M4, M5, M6 | DONE |

## Interface Contracts

### Store Subscription API
- `POST /api/pd/stores/:id/subscribe` -> `{ success: true, is_subscribed: true, is_verified_buyer: boolean, subscribers_count: number, verified_subscribers_count: number }`
- `DELETE /api/pd/stores/:id/subscribe` -> `{ success: true, is_subscribed: false, subscribers_count: number, verified_subscribers_count: number }`
- `GET /api/pd/stores/:id/subscription-status` -> `{ is_subscribed: boolean, is_verified_buyer: boolean, notify_price_drops: boolean, notify_new_products: boolean, subscribers_count: number, verified_subscribers_count: number }`
- `GET /api/pd/buyer/subscriptions` -> `{ subscriptions: Array<{ store: StoreSummary, latest_products: ProductSummary[], unread_updates_count: number }> }`

### Notification Batching Worker & WebSocket
- Redis list key: `notif_buffer:store:{storeId}:{type}`
- Delayed BullMQ job: queue `pd_notification_batch_queue`, jobId `batch:{storeId}:{type}`, delay 15 min.
- WebSocket event: `socketGateway.emitToUser(buyerId, 'notification', payload)`

### AI Interest Engine & Buyer Profile
- Gemini Pro Tagging: returns JSON `{ tags: string[] }` (4–8 normalized lowercase tags).
- Buyer Interest Profile Calculation:
  $$\text{Tag Weight}(T) = \sum_{e \in \text{Events}(T)} W(e) \cdot e^{-\frac{\Delta t \text{ (days)}}{60}}$$
  $W(\text{order}) = 5.0$, $W(\text{subscription}) = 4.0$, $W(\text{wishlist}) = 2.0$.
- `GET /api/pd/marketplace/recommendations/buyer-interests` -> `{ recommended_products: Product[], similar_stores: Store[] }`

### Hub Feed Algorithm & Superadmin Settings
- Settings keys: `hub_feed_base_sort` (`random`|`newest`|`alphabetical`|`best_sellers`), `hub_feed_personalization_pct` (0–50), `ai_auto_tagging_enabled` (boolean).
- Diagnostic endpoint: `GET /api/pd/admin/analytics/ai-tagging-health` -> `{ total_products, tagged_products, tag_coverage_pct, top_tags, pending_tag_jobs }`

### Seller Trust Score & Broadcasts
- Logarithmic formula:
  $$\text{Trust Score} = 0.40 \cdot \text{Rating} + 0.30 \cdot \text{SLA} + 0.20 \cdot \log_{10}(\text{Verified Subscribers} + 1) - 0.10 \cdot \text{Dispute Rate}$$
- `POST /api/pd/seller/subscribers/broadcast` -> `{ success: true, broadcast_id: string, recipients_count: number }` (enforces max 2 per week).
- `GET /api/pd/seller/subscribers/analytics` -> `{ total_subscribers, new_this_week, verified_pct, growth_rate_pct, governorate_distribution: Record<string, number> }`

## Code Layout
- Backend:
  - Database Migrations: `backend/src/migrations/sql/073_store_subscriptions_and_ai_interest.sql`
  - Services: `backend/src/services/store-subscription.service.ts`, `backend/src/services/notification-batch.service.ts`, `backend/src/services/ai-product-tagger.service.ts`, `backend/src/services/buyer-interest.service.ts`, `backend/src/services/seller-broadcast.service.ts`, `backend/src/services/seller-trust.service.ts`
  - Routes: `backend/src/api/store.route.ts`, `backend/src/api/buyer.route.ts`, `backend/src/api/seller.route.ts`, `backend/src/api/marketplace.route.ts`, `backend/src/api/admin.route.ts`
  - Queues & Workers: `backend/src/queues/notification-batch-queue.ts`, `backend/src/workers/notification-batch.worker.ts`, `backend/src/workers/ai-tagger.worker.ts`
  - Seeding Scripts: `backend/src/scripts/insert-feature20-admin-notes.ts`
  - Unit/Integration Tests: `backend/src/__tests__/store-subscription.service.test.ts`, `backend/src/__tests__/smart-notification-batch.test.ts`, `backend/src/__tests__/buyer-interest.service.test.ts`, `backend/src/__tests__/seller-trust.service.test.ts`, `backend/src/__tests__/admin-notes-feature20.test.ts`
- Frontend:
  - Pages: `frontend/src/app/hub/my-followed-feed/page.tsx`, `frontend/src/app/hub/dashboard/loyalty/page.tsx`, `frontend/src/app/(admin)/settings/page.tsx`, `frontend/src/app/(admin)/admin-notes/page.tsx`
  - Components: `frontend/src/components/store/StoreFollowButton.tsx`, `frontend/src/components/feed/FollowedStoresCarousel.tsx`, `frontend/src/components/feed/FeedTimeline.tsx`, `frontend/src/components/feed/DiscoverSimilarStores.tsx`, `frontend/src/components/dashboard/BroadcastComposer.tsx`, `frontend/src/components/dashboard/TunisiaAudienceMap.tsx`, `frontend/src/components/hub/NotificationBell.tsx`, `frontend/src/components/hub/HubNavbar.tsx`
  - Types: `frontend/src/types/settings.ts`, `packages/types/`
  - Unit/Component Tests: `frontend/src/__tests__/store-follow-button.test.tsx`, `frontend/src/__tests__/my-followed-feed.test.tsx`, `frontend/src/__tests__/seller-loyalty-dashboard.test.tsx`, `frontend/src/__tests__/admin-settings-algorithm.test.tsx`
