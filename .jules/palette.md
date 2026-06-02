## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.
## 2025-06-02 - Add ARIA labels to chat close buttons
**Learning:** Found multiple instances of icon-only close buttons lacking accessible names, which impacts screen reader navigation for critical interactive elements like dismissing errors or closing chat launchers.
**Action:** Always verify that buttons containing only an `<X>` or similar icon include an `aria-label="Close"` attribute, using English as the base standard for hardcoded ARIA labels unless a translation function is readily available.
