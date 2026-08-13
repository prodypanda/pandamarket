## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.
## 2024-05-14 - Add missing ARIA labels to icon-only buttons
**Learning:** Found multiple icon-only action buttons relying solely on `title` attributes (e.g. Preview, Edit, Hide) in the marketplace ads dashboard. These are effectively invisible or poorly described to screen readers.
**Action:** Always verify that icon-only buttons (`<button><Icon /></button>`) have an explicit `aria-label` attribute matching the app's primary locale (French) for accessibility, rather than relying exclusively on tooltips.
