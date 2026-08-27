# Engineering Specification: PLAN-B-22
## Make Outbox Worker Claims Atomic via `FOR UPDATE SKIP LOCKED` & Add Lease Reaper

- **Target Bug:** [B-22](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-22-TO-B-26-WORKERS-AND-ADS.md#b-22)
- **Severity:** 🟠 P1 (Outbox Event Duplication & Stuck Processing Records)
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Outbox Worker, Event Dispatcher, Multi-Instance Scaling.

---

### 1. Summary & Business Impact
In `backend/src/workers/outbox.worker.ts:33-67`, claims are made with a separate `SELECT ... WHERE status = 'pending'` followed by an `UPDATE`. When running multiple backend containers on Render, all instances claim the same rows simultaneously, dispatching duplicate webhook/email events. If a process terminates mid-execution, rows stay in `processing` forever.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `backend/src/workers/outbox.worker.ts`
```sql
UPDATE pd_outbox_event 
SET status = 'processing', attempts = attempts + 1, claimed_at = NOW()
WHERE id = ANY (
  SELECT id FROM pd_outbox_event
  WHERE status = 'pending' AND next_attempt_at <= NOW()
  ORDER BY created_at ASC
  LIMIT 10
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```
Add a 5-minute lease recovery sweep:
```sql
UPDATE pd_outbox_event
SET status = 'pending', claimed_at = NULL
WHERE status = 'processing' AND claimed_at < NOW() - INTERVAL '5 minutes';
```

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/outbox-worker.test.ts
```
