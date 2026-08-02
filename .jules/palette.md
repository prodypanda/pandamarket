## 2026-06-24 - Accessibility Labels and Localization
**Learning:** Hardcoded text values (even localized strings) break accessible screen readers or UX expectations when they conflict with a component's or application's built-in translation system (`t()`), especially when modifying `aria-label` attributes.
**Action:** Always prefer the `t('namespace.key') || 'Fallback'` pattern when assigning new labels to elements if an internationalization system is present in the codebase.
