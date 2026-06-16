## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2024-06-13 - Icon-only Close Buttons across the app
**Learning:** Found multiple instances where close ('X') buttons lacked `aria-label`s across components like Modals, Chat inboxes, and Pickers.
**Action:** Always verify that 'X' close buttons in overlays/modals have an `aria-label` indicating what they close (e.g., 'Close dialog', 'Dismiss error').
