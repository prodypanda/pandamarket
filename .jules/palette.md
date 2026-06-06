## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2024-05-18 - Missing ARIA labels on table action buttons
**Learning:** Icon-only action buttons inside data tables (like Edit/Delete) are frequently implemented without screen reader context, making the table confusing to navigate.
**Action:** Always add descriptive `aria-label` and `title` attributes to icon-only buttons, especially in repeating lists or tables.
