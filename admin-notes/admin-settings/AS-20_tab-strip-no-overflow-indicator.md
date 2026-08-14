# AS-20 — Tab Strip Has No Visual Overflow Indicator on Mobile

**Severity:** 🟢 Improvement  
**Area:** Superadmin Settings — Tab Navigation  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1498–1527  
**Impact:** The settings tab strip uses `overflow-x-auto` to allow horizontal scrolling on small screens. However, there is no visual indication that more tabs exist beyond the visible viewport (no gradient fade, no scroll hint, no arrows). Mobile admins frequently miss the "Integrations", "Plans", and "Email" tabs entirely because there is no affordance indicating that the list continues.

---

## Improvement Checklist

- [x] **Step 1 — Wrap the tab strip in a scroll-aware container**  
- [x] **Step 2 — Import `ChevronLeft` and `ChevronRight` from lucide-react**  
- [x] **Step 3 — Auto-scroll the active tab into view when the page loads or tab changes**  
- [x] **Step 4 — Hide the native scrollbar and render smooth edge gradients**  
- [x] **Step 5 — Test on mobile**  
- [x] **Step 6 — Test active tab auto-scroll**  
- [x] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add scroll fade gradients and arrow buttons to tab strip on mobile"
  ```

---

## Acceptance Criteria
- On screens narrower than ~900px, left/right fade gradients appear at the edges of the tab strip.
- Scroll arrow buttons appear when content extends beyond the visible area.
- Clicking the arrows smoothly scrolls the tab list.
- The active tab auto-scrolls into view when the page loads.
- No native scrollbar is visible within the tab strip.
