# AS-12 — Global Commission Rate Can Conflict With Per-Plan Rates Silently

**Severity:** 🟡 Enhancement  
**Area:** Superadmin Settings — Finance Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 766 (in `SETTINGS_TAB_KEYS.finance`)  
**Impact:** The Finance tab has a `platform_commission_rate` field (default: 15%) that sets a platform-wide commission. However, the subscription plans (7 tiers) also have their own commission rates (e.g. Free = 15%, all paid plans = 0%). When these conflict, it's unclear which takes priority. Admins can set the global rate to 10% while all paid plans are at 0%, creating an undefined behavior that may cause incorrect commission calculations.

---

## Enhancement Checklist

- [ ] **Step 1 — Understand how commission rate is resolved in the backend**  
  Open the backend order/commission service. Determine the priority order:
  - Does the per-plan rate override the global rate?  
  - Or is the global rate used as a fallback when no plan rate is set?  
  - Document this logic clearly.

- [ ] **Step 2 — Add a contextual info box next to the commission rate field**  
  ```tsx
  <div className="space-y-1.5">
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
      Platform Commission Rate (%)
    </label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={100}
        step={0.5}
        value={settings.platform_commission_rate}
        onChange={(e) => updateSetting('platform_commission_rate', Number(e.target.value))}
        className="..."
      />
      <span className="text-sm font-bold text-slate-400 shrink-0">%</span>
    </div>
    {/* Contextual warning */}
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mt-2">
      <p className="text-xs font-bold text-amber-800">
        ⚠ This is the fallback rate for the Free plan and stores without an active subscription.
        Paid plans (Starter, Regular, Agency, Pro, Golden, Platinum) have their own rates
        defined in the <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className="underline font-black hover:text-amber-900"
        >
          Subscription Plans tab
        </button>.
        Per-plan rates take priority over this setting.
      </p>
    </div>
  </div>
  ```

- [ ] **Step 3 — Add an effective-rate display per plan**  
  In the Subscription Plans tab (or as a read-only summary card in the Finance tab), show:
  ```tsx
  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
    <h4 className="text-sm font-black text-slate-900">Commission Rate by Plan</h4>
    <table className="w-full text-xs">
      <tbody>
        {[
          { plan: 'Free', rate: `${settings.platform_commission_rate}% (this setting)` },
          { plan: 'Starter', rate: '0% (per plan)' },
          { plan: 'Regular', rate: '0% (per plan)' },
          { plan: 'Agency',  rate: '0% (per plan)' },
          { plan: 'Pro',     rate: '0% (per plan)' },
          { plan: 'Golden',  rate: '0% (per plan)' },
          { plan: 'Platinum',rate: '0% (per plan)' },
        ].map(({ plan, rate }) => (
          <tr key={plan} className="border-b border-slate-100 last:border-0">
            <td className="py-2 font-bold text-slate-700">{plan}</td>
            <td className="py-2 text-right text-slate-500">{rate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  ```

  > The actual per-plan rates should be fetched from the plans API, not hardcoded.

- [ ] **Step 4 — Add validation that prevents the global rate from exceeding 100%**  
  ```ts
  // In buildSettingsPayload
  payload.platform_commission_rate = Math.max(0, Math.min(100, Number(payload.platform_commission_rate)));
  ```

- [ ] **Step 5 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add commission rate conflict warning and per-plan rate summary card"
  ```

---

## Acceptance Criteria
- The commission rate field has a contextual warning explaining its scope (Free plan fallback).
- A "Commission Rate by Plan" summary table shows the effective rate for each tier.
- Clicking the plans link in the warning navigates to the Plans tab.
- The rate is validated to be between 0–100%.
