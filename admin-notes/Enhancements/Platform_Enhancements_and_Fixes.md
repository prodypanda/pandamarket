# Platform Enhancements & Fixes Roadmap

This document outlines the bugs, validation improvements, missing capabilities, and backend enhancements required for the Hub Homepage and Super Admin Settings.

## Part A — Hub Homepage

### P0 — Real bugs
*   **A1.** Locale ignored by sponsored ad rails — `hub/page.tsx:205,207,208` pass `marketplaceSettings.marketplace_default_locale` instead of the computed `activeLocale` (`:152`). A visitor switching to en/ar still gets default-locale ads.
*   **A2.** `AliExpress2HomeContent` is broken:
    *   No `useLocale` import at all → zero i18n, ~30 hardcoded English strings.
    *   No `dir` attribute anywhere → Arabic renders LTR with physical left/right margins.
    *   Does not read `hub_homepage_blocks` → the entire Homepage Blocks editor in admin is inert for this layout.
    *   Hard-locked dark mode (`bg-[#09090b]`) instead of following the brand settings.
*   **A22.** Type drift - `hub_homepage_layout` in `marketplace-settings.ts:41` omits 'alibaba'/'amazon' from its union although both are valid in Zod and in the admin UI.
*   **A23.** A11y misc - cart badge count has no aria-label; wishlist/messages are icon-only links with no accessible name; pagination buttons lack `aria-current` on the active page and hardcode `#ff6a00` regardless of theme.

## Part B — Super Admin settings for the Hub

### P0 — Data-loss bugs
*   **B1.** Cross-tab save discards unsaved edits. `handleSave` sends only the active tab's payload but then replaces the entire local state with the server's full settings. Editing Marketplace + Commerce and hitting Save silently throws away the Commerce edits.
*   **B2.** No unsaved-changes guard. No `beforeunload`, no route-change interception, no confirmation on tab switch.
*   **B3.** Failed load can overwrite production values. On fetch failure, the form silently keeps `DEFAULT_SETTINGS` with no disabled state - a subsequent Save writes defaults over real DB values.
*   **B4.** Fire-and-forget cache invalidation. `fetch('/api/marketplace/revalidate')` has no retry and no feedback. If it fails, the admin sees "Saved" while the hub stays stale.

### P1 — Validation & feedback (Phase 2)
*   **B5.** Invalid input is silently coerced, never reported. Malformed hex colors revert to default, out-of-range numbers clamp, invalid IDs are silently emptied.
*   **B6.** No per-field errors. Input components have no error slot; server errors are flattened into one generic banner.
*   **B7.** No live preview of layout/theme/banner images (e.g., og_image_url and favicon_url are bare text boxes).
*   **B8.** Layout-irrelevant fields always visible. "Alibaba B2B Hero" section renders even when layout is not 'alibaba'.
*   **B9.** Thin help text. `catalog_featured_category_slugs` has no validation or category picker. `rewards_widget_prizes_json` is a raw textarea.
*   **B10.** The admin panel itself isn't localized. Labels are hardcoded English while defaults/placeholders are hardcoded French.
*   **B11.** Two competing Save buttons scoped to the active tab, next to a whole-object dirty indicator.
*   **B12.** Monolithic architecture. ~2800 lines, one flat ~180-key state object. Every keystroke re-renders the entire settings page.

### P1 — Missing admin capability (Phase 2)
*   **B13.** Featured/curated product picker. Homepage grid is auto-sourced. Admins cannot hand-pick/pin products or boost a vendor.
*   **B14.** CMS pages. No route for CMS pages (About/FAQ/Terms) on the Hub. Footer links point outside the platform.
*   **B15.** Announcement bar. Only exists as a toggleable block with no editable text/link/schedule fields.
*   **B16.** Hub navigation menu editor. No admin UI; derived from category tree.
*   **B17.** Scheduling / campaign windows. No start/end datetime on banners/blocks/slides.
*   **B18.** A/B testing or layout preview-as-draft. Layout switches are instantly live; no staging/preview.
*   **B19.** Per-locale content. Banner text and block titles are single-value (no fr/en/ar variants).
*   **B20.** SEO controls. No per-homepage meta override, no structured data JSON-LD settings.

### P2 — Backend / platform (Phase 3)
*   **B21.** Everything is stored as a string and coerced on read. Complex objects are JSON-in-TEXT. Needs jsonb columns or server-side schema validation on write.
*   **B22.** Multi-instance cache incoherence. `invalidateCache` clears local memory but no subscriber clears peers, causing stale data across replicas.
*   **B23.** No cache-control headers on the public endpoint `GET /api/pd/marketplace/settings`.
*   **B24.** Permissions are broader than "Super Admin". Any admin can restyle the entire marketplace. Need dedicated permission for appearance.
*   **B25.** Audit log stores no diff. Records the new body but no previous value.
*   **B26.** Validator inconsistency. `marketplaceSettingsSchema` is `.strict()` but `commerceSettingsSchema` is `.passthrough()`.
