## 2024-05-24 - Accessibility on Chat Component
**Learning:** The ChatInbox component had several icon-only buttons (like Dismiss Error or Close Dialog) that lacked descriptive labels, a repeating pattern in small, inline UI elements.
**Action:** Always add `aria-label` attributes to icon-only buttons to ensure screen readers can announce their purpose.
