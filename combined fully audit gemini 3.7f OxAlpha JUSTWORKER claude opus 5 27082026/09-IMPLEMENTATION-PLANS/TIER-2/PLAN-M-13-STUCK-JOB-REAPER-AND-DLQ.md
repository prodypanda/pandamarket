# Engineering Specification: PLAN-M-13
## Background Job Reaper & Dead-Letter Queue (DLQ) Processor

- **Target PRD Gap:** [M-13](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-13)
- **Severity:** 🟡 PRD Gap / Job Reliability & Observability
- **Estimated Effort:** 🛠 2.5 hours
- **Impacted Systems:** AI Job Queue, Outbox Worker, BullMQ DLQ Processor.

---

### 1. Summary & Business Impact
11 background AI jobs are permanently stuck in `processing` status in production database, locking credits and leaving merchants waiting indefinitely. When external APIs fail or workers crash mid-execution, orphaned jobs remain unhandled with no dead-letter queue (DLQ) or auto-recovery.

---

### 2. Implementation Details
1. **Reaper Cron (every 10 minutes):**
   ```sql
   UPDATE pd_ai_job
   SET status = 'failed', error_message = 'Job timed out after 15 minutes without progress'
   WHERE status = 'processing' AND started_at < NOW() - INTERVAL '15 minutes';
   ```
2. Automatically refund deducted AI credits to the seller's account upon reaper timeout.
3. Move permanent failures in `pd_outbox_event` (attempts >= 5) to `pd_outbox_dlq` and alert admins via Sentry.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/job-reaper.test.ts
```
