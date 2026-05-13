## 2026-05-13 - [Accessibility] Missing ARIA labels on Icon-only buttons
**Learning:** Icon-only buttons in the UI components (e.g. ChatInbox X buttons) commonly lack `aria-label`s and `title` attributes, making them inaccessible for screen readers.
**Action:** Always verify icon-only buttons include an `aria-label` or descriptive text, particularly for actions like "dismiss", "close" or "delete".