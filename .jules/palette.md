## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2024-06-13 - Inconsistent Accessible States and Labels in Repeated Components
**Learning:** Found instances where duplicate or visually similar interactive components across different states (e.g., login form toggles) lack consistent accessibility attributes like `aria-label` or `aria-expanded`, even if the first instance has them. Screen reader users would miss essential context in alternate views.
**Action:** Always ensure that all instances of an interactive element, including toggles and accordions across different component states, have consistent and appropriate ARIA attributes.
