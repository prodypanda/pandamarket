## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.
## 2024-05-23 - Dropdown Visual Feedback & Accessibility
**Learning:** Dropdowns without clear visual state (like a rotating chevron) or accessibility attributes (`aria-expanded`) make it difficult for both sighted and screen reader users to understand their state. Small additions like `rotate-180` on open and `aria-expanded` significantly improve interaction confidence.
**Action:** Always pair interactive dropdown triggers with visual state indicators (rotating icons) and semantic ARIA states (`aria-expanded`, `aria-haspopup`) to ensure the interaction is immediately understandable.
