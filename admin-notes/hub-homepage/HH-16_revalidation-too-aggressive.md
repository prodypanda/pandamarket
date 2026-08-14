# HH-16 — ISR `revalidate: 120` Is Too Short for Low-Traffic Stores

**Severity:** 🟢 Improvement  
**Area:** Hub Homepage — Incremental Static Regeneration  
**File:** `frontend/src/app/hub/page.tsx`  
**Line:** 103  
**Impact:** The trending products fetch uses `next: { revalidate: 120 }` (every 2 minutes). For a marketplace with low product update frequency, this causes unnecessary backend load — the backend is polled 30 times per hour even when no products change. Increasing to 300–600s would reduce load without any meaningful freshness penalty.

---

## Root Cause

```ts
// hub/page.tsx:102–105
res = await fetch(`${backendUrl}/api/pd/products/public?${params.toString()}`, {
  next: { revalidate: 120 },   // ← 2 minutes — very aggressive
  signal: controller.signal,
});
```

The categories fetch uses a more appropriate 300s:
```ts
// hub/page.tsx:127–130
res = await fetch(`${backendUrl}/api/pd/categories?locale=...`, {
  next: { revalidate: 300 },  // ← 5 minutes — better
```

---

## Improvement Checklist

- [x] **Step 1 — Increase the products ISR revalidation interval**  
- [x] **Step 2 — Support HUB_PRODUCT_REVALIDATE_SECONDS environment variable**  
- [x] **Step 3 — Add cache tags and verify on-demand revalidation trigger**  
- [x] **Step 4 — Verify the revalidation endpoint exists and works**  
- [x] **Step 5 — Test ISR behavior**  
- [x] **Step 6 — Commit**  
  ```
  git add frontend/src/app/hub/page.tsx
  git commit -m "perf(hub): increase ISR revalidate from 120s to 300s to reduce unnecessary backend polling"
  ```

---

## Acceptance Criteria
- Trending products fetch uses `revalidate: 300` (or configurable via env).
- The hub homepage is not stale by more than 5 minutes after a product publish.
- Backend polling is reduced by ~60% compared to the 120s setting.
