## 2026-05-25 - Added missing ARIA labels to icon-only buttons
**Learning:** Icon-only buttons (like X, Menu, Heart) frequently lack `aria-label` attributes, causing them to be read poorly by screen readers. Furthermore, when adding fallback text to English components, it is best to provide English fallbacks (e.g., 'Close', 'Open menu') to avoid jarring language mismatches for screen readers.
**Action:** Always scan for icon-only button patterns when reviewing UI components and inject appropriate English `aria-label`s or use the `translate` function if available.
