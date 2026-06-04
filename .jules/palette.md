## 2024-06-04 - Adding aria-label to icon-only chat buttons
**Learning:** Icon-only buttons used for dismissals (like 'X' icons) and sending messages lack clear meaning for screen reader users, leading to severe accessibility gaps in critical communication tools.
**Action:** Always add explicit `aria-label` attributes to any icon-only button to describe its function (e.g., "Dismiss error", "Send message").
