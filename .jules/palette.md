## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.
## 2024-08-05 - Localized Accessibility Constraints
**Learning:** Accessibility attributes like ARIA labels must align with the application's primary locale (French) to ensure screen readers pronounce them intelligibly for the target demographic. Mixing English ARIA labels in a French UI breaks the experience.
**Action:** Always verify the application's default language configuration and translate accessibility labels accordingly when adding or modifying them.
