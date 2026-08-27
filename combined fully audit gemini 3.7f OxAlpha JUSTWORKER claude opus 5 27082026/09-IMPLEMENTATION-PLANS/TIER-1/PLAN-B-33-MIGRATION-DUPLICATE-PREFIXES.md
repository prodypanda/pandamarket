# Engineering Specification: PLAN-B-33
## Renumber 12 Duplicate Migration Prefixes & Synchronize `pd_migrations`

- **Target Bug:** [B-33](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-27-TO-B-33-FRONTEND-DATA.md#b-33)
- **Severity:** 🟠 P1 (Database Migration Ordering Flaws on Clean Installs)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Migration Runner, SQL Migration Files, Schema Versioning.

---

### 1. Summary & Business Impact
12 migration files share identical 3-digit integer prefixes (e.g. `025`, `026`, `046`, `066`). On fresh database boots, alphabetical filesystem order dictates execution. Table creation migrations collide with table alter migrations, which caused 8 AI jobs to fail because `pd_ai_prompt_templates` did not exist yet.

---

### 2. Proposed Changes & Exact Diffs
Renumber duplicate prefixes sequentially (`025b`, `026b`, etc.) and run a migration transaction that updates the `name` column in `pd_migrations` so existing databases remain in sync:
```sql
UPDATE pd_migrations SET name = '025b_store_order_notes.sql' WHERE name = '025_store_order_notes.sql';
```

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/migration-integrity.test.ts
```
