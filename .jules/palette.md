## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.
## 2024-06-13 - Add aria-labels to icon-only buttons
**Learning:** Found multiple icon-only buttons (like send, close, remove) across chat components lacking accessible names, which makes them invisible to screen readers.
**Action:** Always verify that buttons containing only icons have a clear and descriptive `aria-label` attribute (e.g., `aria-label="Send message"`).
