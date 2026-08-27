# P0-01 · BACKEND-BUILD-FAILURE

### P0-1 · Backend does not compile (Active TypeScript Breakage)
- **Files:** `backend/src/main.ts:345`, `backend/src/api/retention.route.ts:12,17`
- **Evidence:** Running `npx tsc --noEmit -w backend` fails with `TS2304: Cannot find name 'retentionRouter'`.
- **Root Cause:** Route mounted before being imported; Zod validator unused.
- **Fix Guide:** See [Guide A](../../06-IMPLEMENTATION-GUIDES/GUIDE-A-BUILD-AND-REWARDS.md).
