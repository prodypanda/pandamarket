# E2E Test Infra: PandaMarket Feature 20

## Test Philosophy
- Opaque-box, requirement-driven, independently verifiable testing derived directly from `ORIGINAL_REQUEST.md`.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinations + Real-World End-to-End Scenarios.

## Feature Inventory & Test Matrix
| # | Feature | Requirement | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (E2E Scenario) |
|---|---------|-------------|:-----------------:|:-----------------:|:-----------------:|:---------------------:|
| 1 | Store Subscriptions & Anti-Bot Logic | R1 | 5 tests | 5 tests | ✓ | Scenario 1 |
| 2 | Smart Batched Notifications | R2 | 5 tests | 5 tests | ✓ | Scenario 2 |
| 3 | AI Interest Engine & Dynamic Profile | R3 | 5 tests | 5 tests | ✓ | Scenario 3 |
| 4 | 'My Followed Feed' Page | R3 | 5 tests | 5 tests | ✓ | Scenario 3 |
| 5 | Strict Seller Retention Boundary | R3 | 5 tests | 5 tests | ✓ | Scenario 4 |
| 6 | Hub Feed 30% Injection & Algorithm Tuning | R4 | 5 tests | 5 tests | ✓ | Scenario 4 |
| 7 | Seller Logarithmic Trust Score Formula | R5 | 5 tests | 5 tests | ✓ | Scenario 5 |
| 8 | Seller Loyalty Dashboard & Broadcasts (2/wk limit) | R5 | 5 tests | 5 tests | ✓ | Scenario 5 |
| 9 | Superadmin Admin-Notes Folder & 44 Checklist Items | R6 | 5 tests | 5 tests | ✓ | Scenario 6 |

## Real-World Application Scenarios (Tier 4)
1. **Scenario 1: Buyer Follow Lifecycle & Anti-Bot Classification**
   - Unverified new buyer subscribes to Store A -> `subscribers_count` increments, `verified_subscribers_count` unchanged.
   - Buyer completes an order -> subsequent subscription to Store B immediately increments both `subscribers_count` and `verified_subscribers_count`.
2. **Scenario 2: Multi-Item Price Drop & 15-Minute Debounced Alert**
   - Vendor updates 4 product prices within 5 minutes.
   - BullMQ sliding buffer aggregates events -> exactly 1 consolidated notification created and pushed via WebSocket to subscribers.
3. **Scenario 3: AI Tagging & Personalized Followed Feed Rendering**
   - New products auto-tagged with Gemini Pro tags.
   - Buyer browses, likes, and purchases items -> interest profile calculates dynamic tag weights with 60-day decay.
   - `/my-followed-feed` renders followed stores carousel, chronological discount updates, and AI cross-seller recommendations.
4. **Scenario 4: Hub 30% Personalization & Private Storefront Isolation**
   - Hub home renders base catalog with 30% personalized injected items.
   - Accessing private seller store (`store1.pandamarket.tn`) strictly renders only store1 products with zero competitor recommendations.
5. **Scenario 5: Seller Loyalty Hub, Broadcast Rate Limiting & Trust Score**
   - Seller checks Loyalty Dashboard KPIs and 24-governorate distribution map.
   - Seller dispatches broadcast with coupon code.
   - Seller attempts to dispatch 3rd broadcast in same week -> rejected with 429 / rate limit error.
   - Seller trust score recalculates accurately with logarithmic verified subscriber proof.
6. **Scenario 6: Superadmin Notes & Interactive Execution Checklists**
   - Superadmin opens `/admin/notes` -> folder `ff32063c-baff-42ca-ad94-768b20c5e6d4` contains all 6 task cards.
   - Superadmin toggles checklist items -> persistence verified in DB.

## Test Runner Commands
- Backend Test Runner: `npm --prefix backend test`
- Frontend Test Runner: `npm --prefix frontend test`
- Backend Type-Check: `npm run type-check -w backend`
- Frontend Type-Check: `cd frontend && npx tsc --noEmit`
- Full E2E Verification Script: `npx tsx backend/src/scripts/verify-feature20-full.ts`
