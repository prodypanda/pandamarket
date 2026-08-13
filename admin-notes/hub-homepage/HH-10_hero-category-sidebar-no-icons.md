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

- [ ] **Step 1 — Add a small thumbnail to each sidebar link**  
  Use the category's `image_url` (if available) as a 24×24 avatar-style image:
  ```tsx
  {heroCategories.map((category) => {
    const catImg = category.image_url
      ? getResizedImageUrl(normalizePublicAssetUrl(category.image_url), 'thumbnail')
      : null;

    return (
      <Link
        key={category.slug}
        href={`/hub/search?category=${encodeURIComponent(category.slug)}`}
        className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm
                   font-semibold text-gray-600 transition hover:bg-[#16C784]/10 hover:text-[#0f9f6e]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {catImg ? (
            <img
              src={catImg}
              alt=""
              aria-hidden
              className="h-6 w-6 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg
                             bg-[#16C784]/10 text-[#16C784] flex-shrink-0">
              <Grid3X3 className="h-3 w-3" />
            </span>
          )}
          <span className="truncate">{category.name}</span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
      </Link>
    );
  })}
  ```

- [ ] **Step 2 — Add `alt=""` and `aria-hidden` to the category image**  
  The image is decorative (the category name provides the accessible label), so `alt=""` is correct.

- [ ] **Step 3 — Ensure categories have images in the admin**  
  - Open the Superadmin → Marketplace Categories page.  
  - Confirm that each category has an `image_url` set.  
  - If not, the fallback `Grid3X3` icon renders (as implemented in Step 1).

- [ ] **Step 4 — Test on small screens**  
  The sidebar is hidden on mobile (`hidden ... lg:block`) — no impact on mobile layout.  
  On desktop, verify the sidebar width (280px) can accommodate the 24px icon + text + arrow without overflow.

- [ ] **Step 5 — Test in RTL mode**  
  With Arabic locale active, verify the icon appears on the right side and the arrow on the left (logical flow). Use `start-3` / `end-3` instead of `left-3` / `right-3` if physical properties are used.

- [ ] **Step 6 — Commit**  
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
