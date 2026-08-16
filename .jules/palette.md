## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.
## 2024-08-16 - Add ARIA label to missing modal close button
**Learning:** Found multiple instances where the generic modal/dialog close buttons (usually using a `<X />` icon) lack `aria-label` attributes. This is a recurring pattern in the app's components, making it difficult for screen reader users to identify what the button does.
**Action:** When adding close buttons or reviewing modals, explicitly ensure `aria-label="Close"` or a similar descriptive label is added to icon-only buttons.
