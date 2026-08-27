# Engineering Specification: PLAN-M-05
## Administrator Withdrawal Approval & Bank Transfer Processing Workflow

- **Target PRD Gap:** [M-05](../../04-MISSING-WORK-PRD/M-01-TO-M-06-CORE-COMMERCE.md#m-05)
- **Severity:** 🟡 PRD Gap / Financial Operations Management
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Admin Withdrawals Router, Wallet Service, Admin UI.

---

### 1. Summary & Business Impact
When vendors request payouts via `POST /me/wallet/withdraw`, transactions are marked `pending` in `pd_wallet_transaction`. The admin panel currently only displays a read-only list with no mechanisms to approve, reject, or enter bank transfer references. This plan introduces a formal state machine: `pending` → `approved` → `processing` → `completed` / `rejected`.

---

### 2. Technical Architecture & Endpoints
1. `POST /api/pd/admin/withdrawals/:id/approve`: Transitions status to `approved`.
2. `POST /api/pd/admin/withdrawals/:id/reject`: Reverses funds back to merchant wallet available balance.
3. `POST /api/pd/admin/withdrawals/:id/complete`: Requires `bank_reference` (virement bancaire slip reference) and marks transaction completed.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/admin-withdrawals.test.ts
```
