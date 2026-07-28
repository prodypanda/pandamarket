## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2024-07-28 - Missing ARIA label for mobile menu in EleganceTheme
**Learning:** When using a generic `<button>` to wrap a toggleable UI element such as a mobile nav menu (e.g. `<Menu className="..." />`), lacking an `aria-label` leaves screen readers without context, announcing it just as "button".
**Action:** Always include an `aria-label` (such as `aria-label="Menu"`) on icon-only interactive toggle buttons for mobile navigation.
