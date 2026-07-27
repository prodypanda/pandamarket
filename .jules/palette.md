## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2026-06-24 - Icon-only Close Buttons Language Consideration
**Learning:** Found an accessibility issue where icon-only close buttons lacked `aria-label`s. Added them, but initially used French "Fermer". Because screen readers rely on language profiles, mixing French terms into an otherwise English application causes pronunciation errors and user confusion.
**Action:** When adding accessibility strings like `aria-label` to icon-only buttons, ensure the language of the string exactly matches the primary language of the application context (e.g., using English "Close" instead of French "Fermer" for English interfaces).
