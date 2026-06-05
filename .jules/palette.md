## 2024-05-27 - Icon-only Quantity Buttons in Cart Component
**Learning:** Found an accessibility issue where quantity adjustment buttons (+ and -) lacked `aria-label`s. Screen reader users would just hear "button" without context of what it does, making quantity adjustment confusing.
**Action:** Always add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` (or appropriate descriptive text) to icon-only buttons in interactive controls like quantity selectors or cart UI.

## 2024-06-05 - Missing ARIA labels on common Chat component actions
**Learning:** Found several icon-only buttons (like <X /> or <Send />) in ChatInbox.tsx and InstantChatLauncher.tsx that lacked aria-labels. Given the interactive and messaging nature of these components, making sure actions like "Dismiss error", "Send message", and "Close dialog" are properly announced to screen readers is critical for accessibility.
**Action:** Always scan for generic icon-only close/action buttons in messaging and modal components and default to adding English `aria-label` attributes to ensure keyboard/screen-reader users have full context.
