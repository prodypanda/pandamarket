# Engineering Specification: PLAN-B-13
## Align Frontend Feature Gating with Backend Subscription Plan Limits

- **Target Bug:** [B-13](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-11-TO-B-16-COMMERCE-GAPS.md#b-13)
- **Severity:** 🟠 P1 (Free/Starter Sellers Hit Raw 403 Errors on Clickable Buttons)
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Dashboard Layout, Product Studio, Online Store Themes, Custom Domains.

---

### 1. Summary & Business Impact
The backend rigorously enforces plan limits via `assertLimit` (e.g. `has_custom_domain`, `has_page_builder`, `ai_credits`, premium themes). However, the seller dashboard UI renders all of these buttons enabled with no lock icons or plan badges. A Free seller clicks "Generate AI Description" or "Activate Premium Theme" and receives raw unhandled 403 Forbidden modal errors.

---

### 2. Proposed Changes & Exact Diffs

#### A. Provide Plan Limits in `frontend/src/app/hub/dashboard/layout.tsx`
Fetch `/api/pd/subscriptions/current` once in the root dashboard layout and provide `planLimits` via React Context.

#### B. Badge & Disable Locked Features
In `products/page.tsx`:
```tsx
const { limits } = useDashboardSubscription();
<Button
  disabled={!limits?.has_ai_tools}
  onClick={handleAiGenerate}
>
  {!limits?.has_ai_tools && <Lock className="w-3 h-3 mr-1" />}
  Générer avec l'IA
</Button>
```

---

### 3. Automated Verification Plan
```bash
npm run test -w frontend -- src/__tests__/feature-gating.test.tsx
```
