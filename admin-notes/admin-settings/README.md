# Admin Settings — Historical Markdown Index

> **Historical snapshot:** Use `backend/src/scripts/hub-settings-admin-notes.catalog.ts` and the production Superadmin Admin Notes page for the current AS-01–AS-24 definitions. Several conclusions below were corrected on 2026-08-13.

This folder contains all documented bugs, enhancements, and improvements for the Superadmin Settings page (`/dashboard/settings`).

Each note file follows a consistent format:
- **Severity badge** — 🔴 Bug / 🟡 Enhancement / 🟢 Improvement
- **Root cause analysis** — exactly where and why the problem exists
- **Step-by-step fix checklist** — ordered, actionable tasks with file paths and line references

---

## Notes Index

| File | ID | Title | Severity |
|------|----|-------|----------|
| [AS-01_save-sends-full-payload-not-tab-payload.md](AS-01_save-sends-full-payload-not-tab-payload.md) | AS-01 | handleSave ignores tab scope — sends all keys on every save | 🔴 Bug |
| [AS-02_no-unsaved-changes-guard-on-tab-switch.md](AS-02_no-unsaved-changes-guard-on-tab-switch.md) | AS-02 | No confirmation dialog when switching tabs with unsaved changes | 🔴 Bug |
| [AS-03_default-primary-color-red-not-green.md](AS-03_default-primary-color-red-not-green.md) | AS-03 | DEFAULT_SETTINGS primary color is red but Hub renders green | 🔴 Bug |
| [AS-04_banner-image-no-asset-picker.md](AS-04_banner-image-no-asset-picker.md) | AS-04 | Hub banner image URL has no asset picker button | 🔴 Bug |
| [AS-05_rewards-json-raw-textarea.md](AS-05_rewards-json-raw-textarea.md) | AS-05 | Rewards prizes edited as raw JSON with no validation | 🔴 Bug |
| [AS-06_search-filter-bar-not-filtering-fields.md](AS-06_search-filter-bar-not-filtering-fields.md) | AS-06 | Settings search bar does not filter individual fields | 🔴 Bug |
| [AS-07_smtp-password-cleared-on-every-save.md](AS-07_smtp-password-cleared-on-every-save.md) | AS-07 | SMTP empty password may unintentionally clear saved credentials | 🔴 Bug |
| [AS-08_no-banner-live-preview.md](AS-08_no-banner-live-preview.md) | AS-08 | No live preview of Hub banner in settings panel | 🟡 Enhancement |
| [AS-09_theme-selector-buried-in-long-tab.md](AS-09_theme-selector-buried-in-long-tab.md) | AS-09 | Theme selector buried with no section prominence | 🟡 Enhancement |
| [AS-10_maintenance-mode-no-danger-confirm.md](AS-10_maintenance-mode-no-danger-confirm.md) | AS-10 | Maintenance mode toggle has no confirmation dialog | 🟡 Enhancement |
| [AS-11_homepage-layout-no-visual-preview.md](AS-11_homepage-layout-no-visual-preview.md) | AS-11 | Homepage layout selector has no visual preview of each layout | 🟡 Enhancement |
| [AS-12_commission-rate-vs-per-plan-conflict.md](AS-12_commission-rate-vs-per-plan-conflict.md) | AS-12 | Global commission rate can conflict with per-plan rates silently | 🟡 Enhancement |
| [AS-13_seller-rail-settings-invisible-in-classic-theme.md](AS-13_seller-rail-settings-invisible-in-classic-theme.md) | AS-13 | Seller rail settings have no effect on classic theme | 🟡 Enhancement |
| [AS-14_no-per-tab-reset-button.md](AS-14_no-per-tab-reset-button.md) | AS-14 | No per-tab reset to saved values button | 🟡 Enhancement |
| [AS-15_image-size-no-aspect-ratio-validation.md](AS-15_image-size-no-aspect-ratio-validation.md) | AS-15 | Image size settings have no aspect ratio validation | 🟡 Enhancement |
| [AS-16_settings-page-loads-all-tabs-on-mount.md](AS-16_settings-page-loads-all-tabs-on-mount.md) | AS-16 | Settings page loads all 9 tabs simultaneously on mount | 🟢 Improvement |
| [AS-17_no-audit-log-link-after-save.md](AS-17_no-audit-log-link-after-save.md) | AS-17 | No link to audit log entry after saving settings | 🟢 Improvement |
| [AS-18_public-url-defaults-to-garbage-team.md](AS-18_public-url-defaults-to-garbage-team.md) | AS-18 | marketplace_public_url defaults to garbage.team dev domain | 🔴 Bug |
| [AS-19_mandat-fields-no-copy-button.md](AS-19_mandat-fields-no-copy-button.md) | AS-19 | Mandat payment fields have no copy-to-clipboard button | 🟢 Improvement |
| [AS-20_tab-strip-no-overflow-indicator.md](AS-20_tab-strip-no-overflow-indicator.md) | AS-20 | Tab strip has no visual overflow indicator on mobile | 🟢 Improvement |

---

> **Last updated:** see git log  
> **Related folder:** `admin-notes/hub-homepage/`
