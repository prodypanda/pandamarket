# Engineering Specification: PLAN-M-11
## Decouple Background Workers from Web API into Dedicated Worker Process

- **Target PRD Gap:** [M-11](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-11)
- **Severity:** 🟡 PRD Gap / Scalability & Reliability
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Background Workers, Render Infrastructure, Process Architecture.

---

### 1. Summary & Business Impact
Currently, background workers (email worker, image processor, AI generation, cleanup timers) run in the same Node.js process as the Express HTTP server. Heavy AI jobs or Sharp image decodes block the event loop, causing API response times to spike. Separating workers into a dedicated background process guarantees web API responsiveness.

---

### 2. Implementation Details
1. Create standalone worker entrypoint: `backend/src/worker.ts`.
2. Configure `worker.ts` to connect to Redis and instantiate BullMQ processors.
3. In `backend/src/main.ts`, conditionally disable workers when `ROLE === 'api'`.
4. Add npm script: `"start:worker": "node dist/worker.js"` for deployment on Render as a Background Worker service.

---

### 3. Verification Plan
```bash
npm run type-check -w backend
```
