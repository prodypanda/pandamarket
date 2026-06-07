## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2024-06-07 - Icon-only Close Buttons in Chat Interface
**Learning:** Found multiple icon-only "close" (X) buttons in the chat components (dismissing errors, removing images, closing dialogs) that lacked `aria-label`s, rendering them completely inaccessible to screen reader users who would only hear "button".
**Action:** Always add descriptive `aria-label`s (like "Close dialog", "Dismiss error", "Remove image") to icon-only action buttons to ensure full keyboard and screen reader accessibility.
