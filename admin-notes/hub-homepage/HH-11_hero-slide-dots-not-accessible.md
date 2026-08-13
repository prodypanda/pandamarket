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

- [ ] **Step 1 — Add `role="tablist"` to the dots container**  
  ```tsx
  <div
    role="tablist"
    aria-label="Hero slide navigation"
    className="mt-6 flex gap-1.5"
  >
  ```

- [ ] **Step 2 — Add `role="tab"` and `aria-selected` to each dot button**  
  ```tsx
  <button
    key={`${entry.title}-${idx}`}
    type="button"
    role="tab"
    aria-label={`Slide ${idx + 1}${entry.title ? `: ${entry.title}` : ''}`}
    aria-selected={idx === slideIndex % heroSlides.length}
    onClick={() => setSlideIndex(idx)}
    className={...}
  />
  ```

### Part 2 — Keyboard navigation

- [ ] **Step 3 — Add `onKeyDown` handler to the tablist for arrow key navigation**  
  ```tsx
  const handleDotKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSlideIndex((prev) => (prev + 1) % heroSlides.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    }
  };

  // In JSX:
  <div
    role="tablist"
    aria-label="Hero slide navigation"
    onKeyDown={handleDotKeyDown}
    className="mt-6 flex gap-1.5"
  >
  ```

### Part 3 — Pause on focus / keyboard interaction

- [ ] **Step 4 — Pause the auto-rotation when a dot is focused or the slider container is focused**  
  Add a `paused` state:
  ```ts
  const [paused, setPaused] = useState(false);
  ```
  
  Modify the auto-rotation `useEffect`:
  ```ts
  useEffect(() => {
    if (heroSlides.length <= 1 || paused) return;
    const id = setInterval(() => setSlideIndex((prev) => (prev + 1) % heroSlides.length), 6000);
    return () => clearInterval(id);
  }, [heroSlides.length, paused]);
  ```
  
  Add `onFocus={() => setPaused(true)}` and `onBlur={() => setPaused(false)}` to the tablist div.

### Part 4 — Add a "Pause / Play" button (WCAG 2.2 best practice)

- [ ] **Step 5 — Add a pause/play toggle near the dots**  
  ```tsx
  <button
    type="button"
    aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
    onClick={() => setPaused(p => !p)}
    className="ms-2 text-white/60 hover:text-white"
  >
    {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
  </button>
  ```

- [ ] **Step 6 — Test with keyboard only**  
  - Tab to the tablist → focus should land on the active dot.  
  - ArrowRight → next slide activates.  
  - ArrowLeft → previous slide activates.  
  - Space/Enter → activate focused dot.  
  - Auto-rotation pauses on focus, resumes on blur.

- [ ] **Step 7 — Run axe accessibility audit**  
  In Chrome DevTools → Accessibility → Run axe on `/hub`.  
  Resolve any remaining violations related to the carousel.

- [ ] **Step 8 — Commit**  
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
