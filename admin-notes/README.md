# PandaMarket Admin Notes — Master Index

This directory contains all documented technical issues, enhancements, and improvements for the PandaMarket platform, organized by area.

Each note is comprehensive and self-contained, including:
- Root cause analysis with exact file paths and line numbers
- Step-by-step implementation checklists
- Acceptance criteria for verifying completion

---

## 📁 Directory Structure

```
admin-notes/
├── README.md                   ← this file
├── Enhancements/               ← legacy/cross-cutting notes
│   └── Platform_Enhancements_and_Fixes.md
├── hub-homepage/               ← Hub homepage bugs & improvements
│   ├── README.md               ← hub homepage index
│   ├── HH-01 through HH-18    ← individual note files
└── admin-settings/             ← Superadmin settings page bugs & improvements
    ├── README.md               ← admin settings index
    ├── AS-01 through AS-20    ← individual note files
```

---

## 🔴 Critical Bugs (Fix First)

| ID | Title | File |
|----|-------|------|
| AS-01 | handleSave sends full payload — can overwrite unrelated settings | [admin-settings/AS-01](admin-settings/AS-01_save-sends-full-payload-not-tab-payload.md) |
| AS-02 | No confirmation when switching tabs with unsaved changes | [admin-settings/AS-02](admin-settings/AS-02_no-unsaved-changes-guard-on-tab-switch.md) |
| AS-18 | `marketplace_public_url` defaults to garbage.team dev domain | [admin-settings/AS-18](admin-settings/AS-18_public-url-defaults-to-garbage-team.md) |
| AS-07 | Empty SMTP password sent on save may clear credentials | [admin-settings/AS-07](admin-settings/AS-07_smtp-password-cleared-on-every-save.md) |
| AS-06 | Settings search bar is completely non-functional | [admin-settings/AS-06](admin-settings/AS-06_search-filter-bar-not-filtering-fields.md) |
| HH-01 | Cart badge shows "0" on cold render | [hub-homepage/HH-01](hub-homepage/HH-01_cart-badge-zero-flash.md) |
| HH-02 | Hero stats show page-1 count, not real total | [hub-homepage/HH-02](hub-homepage/HH-02_marketplace-stats-fake-count.md) |
| HH-04 | `hub_homepage_pagination_style` setting has no effect | [hub-homepage/HH-04](hub-homepage/HH-04_pagination-style-unimplemented.md) |
| HH-07 | Footer shows hardcoded English category names | [hub-homepage/HH-07](hub-homepage/HH-07_footer-hardcoded-category-names.md) |

---

## 🟡 High-Value Enhancements

| ID | Title | File |
|----|-------|------|
| AS-04 | Banner image has no asset picker button | [admin-settings/AS-04](admin-settings/AS-04_banner-image-no-asset-picker.md) |
| AS-05 | Rewards prizes edited as raw JSON — no validation | [admin-settings/AS-05](admin-settings/AS-05_rewards-json-raw-textarea.md) |
| AS-08 | No live preview of hub banner while editing | [admin-settings/AS-08](admin-settings/AS-08_no-banner-live-preview.md) |
| AS-10 | Maintenance mode has no confirmation dialog | [admin-settings/AS-10](admin-settings/AS-10_maintenance-mode-no-danger-confirm.md) |
| AS-11 | Homepage layout selector has no visual preview | [admin-settings/AS-11](admin-settings/AS-11_homepage-layout-no-visual-preview.md) |
| HH-08 | No Add-to-Cart button on trending product cards | [hub-homepage/HH-08](hub-homepage/HH-08_no-add-to-cart-on-product-cards.md) |
| HH-11 | Hero carousel dots not keyboard-accessible | [hub-homepage/HH-11](hub-homepage/HH-11_hero-slide-dots-not-accessible.md) |
| HH-13 | No JSON-LD structured data for SEO | [hub-homepage/HH-13](hub-homepage/HH-13_no-json-ld-structured-data.md) |
| HH-14 | "Create Store" link sends unauthenticated users to dashboard | [hub-homepage/HH-14](hub-homepage/HH-14_vendor-signup-cta-wrong-href.md) |

---

## 🟢 Improvements

| ID | Title | File |
|----|-------|------|
| AS-09 | Theme selector buried — should be at top of Marketplace tab | [admin-settings/AS-09](admin-settings/AS-09_theme-selector-buried-in-long-tab.md) |
| AS-14 | No per-tab reset / discard changes button | [admin-settings/AS-14](admin-settings/AS-14_no-per-tab-reset-button.md) |
| AS-16 | All 9 tabs loaded simultaneously on mount | [admin-settings/AS-16](admin-settings/AS-16_settings-page-loads-all-tabs-on-mount.md) |
| AS-19 | Mandat fields have no copy-to-clipboard button | [admin-settings/AS-19](admin-settings/AS-19_mandat-fields-no-copy-button.md) |
| AS-20 | Tab strip has no overflow indicator on mobile | [admin-settings/AS-20](admin-settings/AS-20_tab-strip-no-overflow-indicator.md) |
| HH-09 | No skeleton loading for sponsored ads rails | [hub-homepage/HH-09](hub-homepage/HH-09_no-skeleton-loading-sponsored-ads.md) |
| HH-16 | ISR revalidate 120s is too short | [hub-homepage/HH-16](hub-homepage/HH-16_revalidation-too-aggressive.md) |
| HH-17 | Layout switch uses fragile ternary chain | [hub-homepage/HH-17](hub-homepage/HH-17_layout-switch-uses-string-chain.md) |
| HH-18 | No noscript fallback for JS-disabled buyers | [hub-homepage/HH-18](hub-homepage/HH-18_no-noscript-fallback.md) |

---

## Note Format Standard

Every note follows this structure:

```
# [ID] — [Title]

**Severity:** 🔴 Bug / 🟡 Enhancement / 🟢 Improvement
**Area:** [section of the codebase]
**File:** [path/to/file.tsx]
**Line:** [line number(s)]
**Impact:** [what breaks or is missing and why it matters]

---

## Root Cause
[exact code snippet showing the problem]

---

## Fix Checklist / Enhancement Checklist
- [ ] Step 1 — ...
- [ ] Step 2 — ...
...
- [ ] Step N — Commit with message: `...`

---

## Acceptance Criteria
- [observable result that confirms completion]
```

---

## Summary Statistics

| Area | 🔴 Bugs | 🟡 Enhancements | 🟢 Improvements | Total |
|------|---------|-----------------|-----------------|-------|
| Hub Homepage | 7 | 8 | 3 | **18** |
| Admin Settings | 8 | 8 | 4 | **20** |
| **Total** | **15** | **16** | **7** | **38** |

---

> **Last updated:** see git log  
> **Authors:** PandaMarket engineering team  
> **Related files:** `frontend/src/app/hub/page.tsx`, `frontend/src/components/hub/HubHomeContent.tsx`, `frontend/src/app/(admin)/settings/page.tsx`
