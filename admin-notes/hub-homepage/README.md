# Hub Homepage — Historical Markdown Index

> **Historical snapshot:** Use `backend/src/scripts/hub-settings-admin-notes.catalog.ts` and the production Superadmin Admin Notes page for the current HH-01–HH-18 definitions. Several conclusions below were corrected on 2026-08-13.

This folder contains all documented bugs, enhancements, and improvements for the Hub Homepage (`/hub`).

Each note file follows a consistent format:
- **Severity badge** — 🔴 Bug / 🟡 Enhancement / 🟢 Improvement
- **Root cause analysis** — exactly where and why the problem exists
- **Step-by-step fix checklist** — ordered, actionable tasks with file paths and line references

---

## Notes Index

| File | ID | Title | Severity |
|------|----|-------|----------|
| [HH-01_cart-badge-zero-flash.md](HH-01_cart-badge-zero-flash.md) | HH-01 | Cart badge always shows 0 on cold render | 🔴 Bug |
| [HH-02_marketplace-stats-fake-count.md](HH-02_marketplace-stats-fake-count.md) | HH-02 | Hero stat numbers show page-1 count instead of total | 🔴 Bug |
| [HH-03_getProductImage-called-twice.md](HH-03_getProductImage-called-twice.md) | HH-03 | getProductImage called redundantly in deals spotlight | 🔴 Bug |
| [HH-04_pagination-style-unimplemented.md](HH-04_pagination-style-unimplemented.md) | HH-04 | hub_homepage_pagination_style setting is wired but never implemented | 🔴 Bug |
| [HH-05_third-sponsored-rail-duplicate-placement.md](HH-05_third-sponsored-rail-duplicate-placement.md) | HH-05 | Third SponsoredAdsRail uses default placement — may clash | 🔴 Bug |
| [HH-06_auth-link-flash-before-hydration.md](HH-06_auth-link-flash-before-hydration.md) | HH-06 | Account link flashes wrong href before auth check | 🔴 Bug |
| [HH-07_footer-hardcoded-category-names.md](HH-07_footer-hardcoded-category-names.md) | HH-07 | Footer Marketplace column has hardcoded English category names | 🔴 Bug |
| [HH-08_no-add-to-cart-on-product-cards.md](HH-08_no-add-to-cart-on-product-cards.md) | HH-08 | No Add-to-Cart button on Trending product cards | 🟡 Enhancement |
| [HH-09_no-skeleton-loading-sponsored-ads.md](HH-09_no-skeleton-loading-sponsored-ads.md) | HH-09 | No skeleton placeholder while sponsored ads load | 🟡 Enhancement |
| [HH-10_hero-category-sidebar-no-icons.md](HH-10_hero-category-sidebar-no-icons.md) | HH-10 | Hero Departments sidebar has no category icons | 🟡 Enhancement |
| [HH-11_hero-slide-dots-not-accessible.md](HH-11_hero-slide-dots-not-accessible.md) | HH-11 | Hero carousel dots are not keyboard-accessible | 🟡 Enhancement |
| [HH-12_recently-viewed-tracker-not-on-homepage.md](HH-12_recently-viewed-tracker-not-on-homepage.md) | HH-12 | RecentlyViewedTracker not called on hub homepage | 🟡 Enhancement |
| [HH-13_no-json-ld-structured-data.md](HH-13_no-json-ld-structured-data.md) | HH-13 | Missing JSON-LD structured data for SEO | 🟡 Enhancement |
| [HH-14_vendor-signup-cta-wrong-href.md](HH-14_vendor-signup-cta-wrong-href.md) | HH-14 | Create Store nav link sends unauthenticated users to dashboard | 🟡 Enhancement |
| [HH-15_rtl-footer-social-links.md](HH-15_rtl-footer-social-links.md) | HH-15 | RTL support incomplete in footer social links | 🟡 Enhancement |
| [HH-16_revalidation-too-aggressive.md](HH-16_revalidation-too-aggressive.md) | HH-16 | ISR revalidate 120 s is too short for low-traffic stores | 🟢 Improvement |
| [HH-17_layout-switch-uses-string-chain.md](HH-17_layout-switch-uses-string-chain.md) | HH-17 | Layout selection uses fragile string-chain instead of map | 🟢 Improvement |
| [HH-18_no-noscript-fallback.md](HH-18_no-noscript-fallback.md) | HH-18 | No noscript fallback for JS-disabled buyers | 🟢 Improvement |

---

> **Last updated:** see git log  
> **Related folder:** `admin-notes/admin-settings/`
