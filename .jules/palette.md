## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2026-05-06 - Missing ARIA labels on recurring close buttons
**Learning:** Found a recurring pattern where icon-only `X` (close/dismiss) buttons in modal and chat components lack `aria-label`s, breaking screen reader accessibility.
**Action:** Always add descriptive `aria-label` attributes to icon-only buttons (like `aria-label="Close dialog"`) to ensure the action is announced clearly.
