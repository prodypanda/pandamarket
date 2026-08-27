# Engineering Specification: PLAN-T3-04
## Decompose Frontend Monoliths (Products 7,000 Lines & Admin Settings 6,200 Lines)

- **Target Task:** [T3-04](../../00-MASTER-CHECKLIST/TIER-3-ARCHITECTURE-DEBT.md)
- **Severity:** 🟢 Maintainability & Bundle Performance
- **Estimated Effort:** 🏗 8 hours
- **Impacted Systems:** Products Dashboard Page, Admin Settings Screen, Next.js Code Splitting.

---

### 1. Summary & Business Impact
Two colossal frontend files degrade developer productivity, cause merge conflicts, and inflate client bundle sizes:
1. `frontend/src/app/hub/dashboard/products/page.tsx` (6,980 lines)
2. `frontend/src/app/(admin)/settings/page.tsx` (6,200 lines)

---

### 2. Decomposition Architecture
#### A. Products Page Modularization:
- `components/dashboard/products/ProductsTable.tsx` (table rendering, bulk actions)
- `components/dashboard/products/ProductDrawer.tsx` (edit drawer modal)
- `components/dashboard/products/tabs/ProductGeneralTab.tsx`
- `components/dashboard/products/tabs/ProductMediaTab.tsx`
- `components/dashboard/products/tabs/ProductInventoryTab.tsx`
- `components/dashboard/products/tabs/ProductAiStudioTab.tsx`

#### B. Admin Settings Modularization:
- Split into 7 tab modules matching `PLATFORM_SETTING_SECTION_KEYS`: `GeneralTab`, `FinanceTab`, `SecurityTab`, `NotificationsTab`, `OperationsTab`, `LocalizationTab`, `LegalTab`.

---

### 3. Verification Plan
```bash
npm run type-check -w frontend
npm run build -w frontend
```
