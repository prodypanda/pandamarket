## 2024-05-14 - ARIA labels for Chat Inbox UI
**Learning:** Found multiple icon-only buttons in the `ChatInbox` component that were lacking proper ARIA labels. This is a common pattern where standard design systems omit labels for obvious (to sighted users) actions like closing a modal or dismissing an error.
**Action:** Always verify icon-only buttons (`<X />` in `lucide-react`) have descriptive `aria-label`s like "Dismiss error" or "Close modal".
