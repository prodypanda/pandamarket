## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2024-06-13 - Icon-only Close and Delete Buttons
**Learning:** Discovered multiple icon-only close ('X') and delete ('Trash2') buttons across various components lacking 'aria-label' attributes, making their purpose ambiguous to screen reader users.
**Action:** Ensure all icon-only buttons include descriptive 'aria-label' attributes (e.g., 'aria-label="Close"', 'aria-label="Delete"') to provide clear context and improve overall accessibility.
