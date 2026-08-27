# Engineering Specification: PLAN-M-07
## Multi-Admin Capability & Role-Based Access Control (RBAC) System

- **Target PRD Gap:** [M-07](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-07)
- **Severity:** 🟡 PRD Gap / Enterprise Security & Delegation
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Admin Auth Middleware, Admin User Management, Admin Sidebar & Tabs.

---

### 1. Summary & Business Impact
All administrative accounts currently share a binary `role = 'admin'` with full visibility into all operational data, customer PII, and financial settings, with only `super_admin` reserved for certain destructive operations. To enable hiring customer support agents, marketing content managers, and accounting staff, the platform requires granular role capabilities.

---

### 2. Capabilities Matrix
- `catalog:manage`: Approve/reject vendor products and categories.
- `finance:view`: View platform revenue and vendor wallets.
- `finance:payout`: Approve and disburse vendor withdrawals.
- `support:manage`: View customer orders, review tickets, and manage disputes.
- `settings:manage`: SuperAdmin-only platform configuration.

---

### 3. Implementation Details
1. Create `pd_admin_capability` junction table linking admin users to specific permission scopes.
2. Implement `requireCapability(scope)` Express middleware.
3. Conditionally render navigation items in `frontend/src/app/(admin)/layout.tsx` based on active capabilities.

---

### 4. Verification Plan
```bash
npm run test -w backend -- src/__tests__/admin-rbac.test.ts
```
