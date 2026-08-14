# HH-10 — Hero Departments Sidebar Has No Category Icons

**Severity:** 🟡 Enhancement  
**Area:** Hub Homepage — Hero Left Sidebar  
**File:** `frontend/src/components/hub/HubHomeContent.tsx`  
**Line:** 399–413  
**Impact:** The left "Departments" sidebar in the hero shows only text category names. All Amazon-style and competitor marketplaces show a small category image or icon next to each department. Adding visual cues improves scannability and visual hierarchy on the page.

---

## Current State

```tsx
// HubHomeContent.tsx:399–413 — hero sidebar
{heroCategories.map((category) => (
  <Link
    key={category.slug}
    href={`/hub/search?category=${encodeURIComponent(category.slug)}`}
    className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold
               text-gray-600 transition hover:bg-[#16C784]/10 hover:text-[#0f9f6e]"
  >
    <span className="truncate">{category.name}</span>   {/* ← text only */}
    <ArrowRight className="h-3.5 w-3.5" />
  </Link>
))}
```

Each `MarketplaceCategory` already has an `image_url` field — it's just not used in the sidebar.

---

## Enhancement Checklist

- [x] **Step 1 — Add a small thumbnail to each sidebar link**  
- [x] **Step 2 — Add `alt=""` and `aria-hidden` to the category image**  
- [x] **Step 3 — Ensure categories have images in the admin**  
- [x] **Step 4 — Test on small screens**  
- [x] **Step 5 — Test in RTL mode**  
- [x] **Step 6 — Commit**  
  ```
  git add frontend/src/components/hub/HubHomeContent.tsx
  git commit -m "feat(hub): add category thumbnail icons to hero Departments sidebar"
  ```

---

## Acceptance Criteria
- Each category in the hero sidebar shows a small thumbnail image.
- Categories without images show a fallback grid icon.
- The sidebar layout does not break or overflow.
- Works in both LTR and RTL modes.
