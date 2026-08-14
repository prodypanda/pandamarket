# HH-11 — Hero Carousel Dots Are Not Keyboard-Accessible

**Severity:** 🟡 Enhancement (Accessibility / WCAG)  
**Area:** Hub Homepage — Hero Carousel  
**File:** `frontend/src/components/hub/HubHomeContent.tsx`  
**Line:** 446–452  
**Impact:** The carousel slide indicators (dots) are `<button>` elements with `aria-label="Slide N"` but:
1. No `role="tab"` or `role="tablist"` pattern for the dot container
2. No keyboard arrow key navigation (left/right arrows should cycle slides)
3. The active slide has no `aria-current="true"` or `aria-selected` attribute
This violates WCAG 2.1 AA Success Criterion 4.1.2 (Name, Role, Value).

---

## Current State

```tsx
// HubHomeContent.tsx:446–452
<div className="mt-6 flex gap-1.5">
  {heroSlides.map((entry, idx) => (
    <button
      key={`${entry.title}-${idx}`}
      type="button"
      aria-label={`Slide ${idx + 1}`}          // ← only label, no current indicator
      onClick={() => setSlideIndex(idx)}
      className={`h-1.5 rounded-full transition-all
        ${idx === slideIndex % heroSlides.length ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
    />
  ))}
</div>
```

---

## Enhancement Checklist

### Part 1 — ARIA improvements

- [x] **Step 1 — Add `role="tablist"` to the dots container**  
- [x] **Step 2 — Add `role="tab"` and `aria-selected` to each dot button**  
- [x] **Step 3 — Add `onKeyDown` handler to the tablist for arrow key navigation**  
- [x] **Step 4 — Pause the auto-rotation when focused**  
- [x] **Step 5 — Add a pause/play toggle near the dots**  
- [x] **Step 6 — Test with keyboard only**  
- [x] **Step 7 — Run axe accessibility audit**  
- [x] **Step 8 — Commit**  
  ```
  git add frontend/src/components/hub/HubHomeContent.tsx
  git commit -m "a11y(hub): add ARIA roles, keyboard navigation, and pause control to hero carousel dots"
  ```

---

## Acceptance Criteria
- Carousel dots have `role="tab"` and `aria-selected` state.
- ArrowLeft/ArrowRight keys navigate slides when focus is inside the tablist.
- Auto-rotation pauses when the user focuses the control area.
- axe audit shows no new carousel-related violations.
