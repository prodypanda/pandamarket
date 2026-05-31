## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.
## 2024-05-31 - [Added missing aria-labels to icon buttons]
**Learning:** Icon-only buttons (like 'X' close buttons, 'Trash' remove buttons) frequently lack aria-labels across the chat and settings components, making them inaccessible to screen readers.
**Action:** When creating new components or reviewing existing ones, always ensure that buttons containing only an icon component have a descriptive `aria-label` attribute added (defaulting to English as the base standard if localization is not immediately available).
