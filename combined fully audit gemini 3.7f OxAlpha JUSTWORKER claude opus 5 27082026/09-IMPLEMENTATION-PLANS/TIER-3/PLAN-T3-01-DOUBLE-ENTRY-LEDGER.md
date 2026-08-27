# Engineering Specification: PLAN-T3-01
## Double-Entry Financial General Ledger Architecture (`pd_ledger_entry`)

- **Target Task:** [T3-01](../../00-MASTER-CHECKLIST/TIER-3-ARCHITECTURE-DEBT.md)
- **Severity:** 🟢 Architectural Evolution / Financial Integrity
- **Estimated Effort:** 🏗 6 hours
- **Impacted Systems:** Financial Ledger, Vendor Wallet Service, Platform Accounting.

---

### 1. Summary & Business Impact
Platform funds are currently tracked in single-entry balance tables (`pd_vendor_wallet.available_balance`). Single-entry models cannot prove that total money moving into the platform equals money disbursed minus fees. This plan implements a double-entry general ledger with debits and credits, guaranteeing a zero-sum invariant:
`SUM(debit_amount) - SUM(credit_amount) == 0` for every financial event.

---

### 2. Database Schema
```sql
CREATE TYPE ledger_account_type AS ENUM (
  'customer_funds_receivable', -- Assets: incoming gateway captures
  'vendor_payable',           -- Liabilities: merchant wallet balances
  'platform_revenue',         -- Equity: commissions, plan fees, ads spend
  'bank_cash_clearing'        -- Assets: physical bank balances
);

CREATE TABLE IF NOT EXISTS pd_ledger_entry (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL, -- Groups debit/credit legs
  account_type ledger_account_type NOT NULL,
  entity_id TEXT,               -- store_id, user_id, or 'platform'
  entry_direction VARCHAR(10) NOT NULL CHECK (entry_direction IN ('debit', 'credit')),
  amount NUMERIC(12, 3) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  description TEXT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  reference_id TEXT,            -- order_id, payout_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_transaction ON pd_ledger_entry(transaction_id);
CREATE INDEX idx_ledger_entity ON pd_ledger_entry(entity_id, account_type);
```

---

### 3. Phased Shadow-Write Implementation
1. **Phase 1 (Shadow Writes):** When `walletService` credits or debits accounts, write matching ledger entries in the same database transaction.
2. **Phase 2 (Reconciliation Cron):** A nightly job asserts that single-entry wallet balances equal the ledger sum for every merchant.
3. **Phase 3 (Cutover):** Make `pd_vendor_wallet.available_balance` a read-through cached projection derived from the ledger.

---

### 4. Verification Plan
```bash
npm run test -w backend -- src/__tests__/double-entry-ledger.test.ts
```
