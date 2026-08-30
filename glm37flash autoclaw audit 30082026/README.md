# GLM-3.7 Flash / AutoClaw — Order Process Audit Package (2026-08-30)

> Audit performed by **Auto Legal (AutoClaw / GLM-3.7 Flash)** on **2026-08-30**, against repository commit `7141e9f` (branch `main`).
> Read-only audit: **no source file was modified**. All fixes in `06-FIX-PLAN` are *suggestions to review*, not applied patches.

## What happened to the three reported bugs

| # | Reported symptom | Verdict | One-line root cause |
|---|------------------|---------|---------------------|
| 1 | Expedition is "Expédiée" but order status stays "En attente" (pending) | **Confirmed bug** | Label creation (`shippingService.createShipment`) sets fulfillment → `shipped` but never updates `pd_order.status`; `processing` is never written anywhere |
| 2 | Seller cannot change the "Préparation" status | **Confirmed missing capability** | No API endpoint and no DB writer exist for a preparation/`processing` state; the timeline step is auto-derived (and wrong) |
| 3 | "Articles de la boutique" shows "Détail des articles indisponible" | **Confirmed bug (deterministic in 2 entry points)** | COD table and RTO table open the order drawer from **list rows** that never contain `items`; detail-fetch failures fall back to the same empty state |

## Package contents (reading order)

| File | Purpose |
|------|---------|
| [00-FULL-AUDIT-REPORT.md](./00-FULL-AUDIT-REPORT.md) | The complete master audit report (state machines, lifecycle, all evidence) |
| [01-ORDER-ARCHITECTURE-REFERENCE.md](./01-ORDER-ARCHITECTURE-REFERENCE.md) | Data model, 4 state machines, complete `pd_order.status` writer map, API surface, FR label mappings |
| [02-BUG-1-ORDER-STATUS-STUCK-PENDING.md](./02-BUG-1-ORDER-STATUS-STUCK-PENDING.md) | Bug #1 deep dive: reproduction, evidence chain, impact, fix options |
| [03-BUG-2-NO-PREPARATION-CONTROL.md](./03-BUG-2-NO-PREPARATION-CONTROL.md) | Bug #2 deep dive: why "Préparation" can never change, dead `processing` state |
| [04-BUG-3-ITEMS-DETAIL-UNAVAILABLE.md](./04-BUG-3-ITEMS-DETAIL-UNAVAILABLE.md) | Bug #3 deep dive: list vs detail item aggregation, the two broken entry points |
| [05-ADDITIONAL-FINDINGS-F1-F11.md](./05-ADDITIONAL-FINDINGS-F1-F11.md) | 11 additional findings (dead `ORDER_FULFILLED` event, refund restock inflation, …) with severity |
| [06-FIX-PLAN-P0-P1-P2.md](./06-FIX-PLAN-P0-P1-P2.md) | Prioritized implementation guide: files/functions to change, code sketches, regression risks |
| [07-QA-REPRODUCTION-CHECKLIST.md](./07-QA-REPRODUCTION-CHECKLIST.md) | Checkbox checklists: reproduce each bug pre-fix, verify post-fix, regression list |

## Method & environment notes

- Repository: `C:\tek\pandamarket`, commit `7141e9f` ("fix(paypal): complete hardening of PayPal webhook routing…").
- Every claim is pinned to `file:line` in the cited commit and was re-verified by direct read or repo-wide search (no memory-based claims).
- Live production check: `GET https://pandamarket-backend-fjom.onrender.com/health` → `200 {"status":"ok"}` at 2026-08-30 ~10:00 UTC. No other production calls were made.
- The Supabase and Redis passwords in `REMOTE_CREDENTIALS.md` are **redacted in the file itself** (`***` / `…`), so no data-level verification against production was possible. Conclusions are code-level.
- Meilisearch is unconfigured (owner-confirmed); it does not participate in the order pipeline, so it has no bearing on these findings.
- Search/indexing note for whoever greps this package: labels referenced below come from `frontend/src/i18n/messages/fr.json` under `dashboardPages.orders`.

## How to use this package

1. Read `00` for the global picture (15 min).
2. Hand `02`–`04` to whoever fixes each bug — each is self-contained with reproduction steps.
3. Implement following `06` in P0 → P1 → P2 order; each item lists the exact file/function and the aggregate rule to apply.
4. Run `07` checklists before and after the fix; the pre-fix lists reproduce all three bugs deterministically.
