## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2024-06-15 - Icon-only Close Buttons in Modals
**Learning:** Discovered multiple modal and popover close buttons using the `<X>` icon without an `aria-label`. Screen reader users will only hear 'button', making it difficult to understand how to dismiss overlays.
**Action:** Always provide descriptive text like `aria-label="Close modal"` or `aria-label="Close instant chat"` on icon-only dismiss controls across the platform.
