# Part A — Hub Homepage
**P0 — Real bugs**
*   **A1.** Locale ignored by sponsored ad rails — `hub/page.tsx`. Fixed to pass `marketplaceSettings.marketplace_default_locale`.
*   **A2.** `AliExpress2HomeContent` broken sibling fixed: Added `useLocale` import, i18n support, RTL support (`dir` attribute), and Hub Homepage blocks support. Unlocked light/dark mode based on brand settings.
*   **A3.** Infinite Loading Trigger Too Low — `HubProductPagination.tsx`. Changed `rootMargin` from `100px` to `600px`.
*   **A4.** `useLocale()` flash of wrong locale on first paint. Prevented rendering until `isLoaded` is true.
*   **A5.** Missing `aria-labels` on Wishlist and Cart floating buttons in `hub/layout.tsx`.
*   **A6.** Empty state on "Deals" and "Alibaba" layouts didn't translate. Applied `t()` across 4 files.

# Part B — Super Admin Settings
*   **B1.** Cross-tab save data loss — Refactored `handleSave` to use global `/api/pd/admin/settings` endpoint instead of partial updates, preventing silent data loss.
*   **B2.** Arabic locale crash in appearance tab — Added `ar` mapping strings.
*   **B3.** Global font fallback — Configured `next/font` for Inter.
