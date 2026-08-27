# 02 — Medium & Low Priority Issues & Enhancements

This document covers non-critical edge cases, performance bottlenecks, caching nuances, and UI state synchronization issues across the platform.

---

## 🟡 Issue 1: Next.js Middleware Hostname Normalization & Trailing Dots

### Problem Analysis
- **Location:** [`frontend/src/middleware.ts`](file:///c:/tek/pandamarket/frontend/src/middleware.ts#L347)
- **Details:** `getStorefrontStatus(storeHost, req)` uses `storeStatusCache` with the raw `storeHost` key.
- **Edge Case:** If an end-user navigates to `BOUTIQUE1.garbage.team` (uppercase) or DNS proxies append a trailing root dot `boutique1.garbage.team.`, cache lookups miss and can cause redundant backend `/api/pd/stores/by-host/...` roundtrips.
- **How-To Fix:**
  Normalize the `storeHost` string before cache queries:
  ```typescript
  // frontend/src/middleware.ts
  const rawStoreHost = extractStoreSubdomain(hostname) || hostname;
  const storeHost = rawStoreHost.trim().toLowerCase().replace(/\.+$/, '');
  ```

---

## 🟡 Issue 2: Live Velocity Ring Buffer in Multi-Instance Deployments

### Problem Analysis
- **Location:** [`backend/src/services/analytics.service.ts`](file:///c:/tek/pandamarket/backend/src/services/analytics.service.ts#L127)
- **Details:** `liveTelemetryBuffer` is held in server memory (`const liveTelemetryBuffer: VelocityPoint[] = []`).
- **Edge Case:** In clustered or multi-pod deployments (Render autoscaling, Kubernetes, Docker Swarm), each instance computes its own independent live velocity, resulting in jittery/inconsistent telemetry displayed in the Superadmin Live Pulse radar.
- **How-To Fix:**
  Store recent telemetry events in Redis with a 60-second sliding expiration:
  ```typescript
  // Backend Redis Sliding Window Implementation:
  export async function recordLivePulseEvent(event: RawTelemetryEvent): Promise<void> {
    const redis = getRedis();
    const now = Date.now();
    const payload = JSON.stringify(event);
    await redis.zadd('pd_live_telemetry_stream', now, `${now}:${payload}`);
    await redis.zremrangebyscore('pd_live_telemetry_stream', 0, now - 60_000);
  }
  ```

---

## 🟡 Issue 3: React 19 `act(...)` State Warnings in Frontend Unit Tests

### Problem Analysis
- **Location:** `frontend/src/__tests__/ads-campaign-wizard.test.tsx`, `frontend/src/__tests__/feature-gating.test.tsx`
- **Details:** Async state setters in `DashboardSubscriptionProvider` and `AdsCampaignWizard` execute outside of React testing library's `act()` boundaries during unit test execution.
- **How-To Fix:**
  Wrap asynchronous interactions in `await act(async () => { ... })` within frontend test files.

---

## 🟡 Issue 4: Storefront Cart Scoping on Shared Domain Browsing

### Problem Analysis
- **Location:** [`frontend/src/contexts/CartContext.tsx`](file:///c:/tek/pandamarket/frontend/src/contexts/CartContext.tsx)
- **Details:** If a buyer adds items on `boutique1.garbage.team` and then browses `boutique2.garbage.team`, both stores share the top-level cookie / localStorage domain unless cart items are filtered by `store_id`.
- **Current State:** The cart context properly partitions items by `item.store_id` and storefront pages use `storeItems = items.filter(i => i.store_id === currentStore.id)`.
- **Enhancement:** Add an optional visual indicator in the storefront cart drawer: *"You have items from another store saved in your universal cart."*

---

## 🟡 Checklist: Medium & Low Issues

- [ ] Normalize hostname in Next.js middleware before status caching.
- [ ] Migrate in-memory live velocity buffer to Redis Sorted Sets.
- [ ] Wrap asynchronous testing state updates in `act(...)`.
- [ ] Add cross-store cart item indicator in storefront drawers.
