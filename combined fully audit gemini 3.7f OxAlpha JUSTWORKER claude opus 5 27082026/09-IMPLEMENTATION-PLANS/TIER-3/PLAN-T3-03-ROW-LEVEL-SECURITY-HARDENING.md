# Engineering Specification: PLAN-T3-03
## Enable Row-Level Security (RLS) on Unprotected Tables & Tenant Policies

- **Target Task:** [T3-03](../../00-MASTER-CHECKLIST/TIER-3-ARCHITECTURE-DEBT.md)
- **Severity:** 🟢 Multi-Tenant Data Isolation / Defense-in-Depth
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** PostgreSQL Security, Supabase Data Protection.

---

### 1. Summary & Business Impact
5 tables (`pd_admin_notes`, `pd_admin_note_tags`, `pd_order_admin_notes`, etc.) currently have Row-Level Security disabled. If a client connects directly via Supabase anonymous keys, tables without RLS are exposed. Enabling RLS across all tables enforces multi-tenant boundary checks in the database layer itself.

---

### 2. Implementation Details
```sql
ALTER TABLE pd_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_admin_note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_order_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_store_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_user_admin_notes ENABLE ROW LEVEL SECURITY;

-- Restrict to backend service role only:
CREATE POLICY admin_notes_service_role_policy ON pd_admin_notes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### 3. Verification Plan
Run Supabase security advisor queries to verify 100% RLS compliance.
