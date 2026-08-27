# Engineering Specification: PLAN-B-31
## Convert Dashboard Shell to CSS Logical Properties for Flawless Arabic RTL

- **Target Bug:** [B-31](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-27-TO-B-33-FRONTEND-DATA.md#b-31)
- **Severity:** 🟠 P1 (Broken Layout in Arabic Mode / UI Overlaps)
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** Dashboard Shell Layout, Navigation Drawer, RTL Stylesheet.

---

### 1. Summary & Business Impact
In `hub/dashboard/layout.tsx:463`, the sidebar uses hardcoded `border-r` and `md:ml-64`. When an Arabic merchant selects RTL, `dir="rtl"` flips document flow, but `ml-64` forces content to the left under the sidebar, creating an unusable layout.

---

### 2. Proposed Changes & Exact Diffs
Replace physical CSS classes with logical utilities:
- `md:ml-64` → `md:ms-64` (margin-inline-start)
- `border-r` → `border-e` (border-inline-end)
- `left-0` → `start-0`
- `right-0` → `end-0`
Set `lang` and `dir` server-side on `<html>` in the root layout to eliminate SSR layout flash.

---

### 3. Automated Verification Plan
```bash
npm run test -w frontend -- src/__tests__/rtl-layout.test.tsx
```
