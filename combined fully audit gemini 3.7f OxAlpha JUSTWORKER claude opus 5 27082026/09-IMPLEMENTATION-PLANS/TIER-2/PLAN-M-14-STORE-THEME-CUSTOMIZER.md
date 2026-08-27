# Engineering Specification: PLAN-M-14
## Visual Storefront Theme Customizer & Real-Time CSS Variable Live Preview

- **Target PRD Gap:** [M-14](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-14)
- **Severity:** 🟡 PRD Gap / Merchant Storefront Experience
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** Theme Customizer UI, Store Settings Service, Storefront Template Engine.

---

### 1. Summary & Business Impact
Merchants currently select from 20 themes, but cannot customize their brand colors (primary, accent, background), typography fonts, header layout, or announcement banner text without writing custom CSS code. This plan builds a visual no-code theme customizer with real-time iframe preview.

---

### 2. Implementation Details
1. Store settings schema: `theme_config` JSON containing `colors`, `fonts`, `header`, `footer`.
2. Frontend visual editor: `frontend/src/app/hub/dashboard/themes/customize/page.tsx`.
3. PostMessage bridge between editor parent and theme iframe for instant zero-reload CSS variable updates.
4. Server-side CSS variable injection on storefront SSR to guarantee zero style flickering.

---

### 3. Verification Plan
```bash
npm run test -w frontend -- src/__tests__/theme-customizer.test.tsx
```
