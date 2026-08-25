# PandaMarket — Platform Status

> **Single source of truth.** Consolidates the nine overlapping planning/audit
> documents at the repo root (E20). Last updated: **2026-08-25**.

## Authoritative tracking

| Document | Purpose |
| --- | --- |
| [`tabitoken opus 5 audit 24082026/`](../tabitoken%20opus%205%20audit%2024082026/README.md) | Full platform audit + remediation checklist with per-item status, implementation log, and commit references |
| [`tabitoken opus 5 audit 24082026/08-TODO-CHECKLIST.md`](../tabitoken%20opus%205%20audit%2024082026/08-TODO-CHECKLIST.md) | **The working TODO** — every open/closed item |

The older root-level docs (`AUDIT_REPORT.md`, `AUDIT_REPORT_2026-08-03.md`,
`STOREFRONT_AUDIT_REPORT.md`, `todo.md`, `tasklist.md`,
`implementation_plan.md`) are historical snapshots and may contain stale
claims — do not use them for current status.

## Current state (2026-08-25)

- **Audit remediation: 29/44 items closed** across Tiers 0–2.
- **All security findings closed**: both P0s (verified live), CORS/CSP,
  revalidate machine-auth, RLS on all 121 tables, Redis-backed rate limiting
  with real-client-IP bucketing.
- **Observability live**: Prometheus `/metrics`, Sentry error reporting
  (`pandamarket-backend` project), system-log viewer.
- **Quality gates**: lint 0 errors both sides; blocking GitHub Actions CI
  (lint + type-check + frontend unit tests); i18n parity test.
- **Database**: 203/203 FKs indexed; migrations advisory-locked, fail-hard in
  production; new migrations use timestamp prefixes (see
  `backend/src/migrations/README.md`).

## Known-open items

| Item | Blocker |
| --- | --- |
| SMTP email delivery | Render trial blocks outbound SMTP ports |
| Sentry alert rule (2-click UI task) | Legacy rules API rejected API creation |
| Worker process split (P2-17/M13) | Requires paid Render plan |
| Seller hostname scoping on revalidate | Backlog code work |
| Lint warning debt (~822 frontend / ~360 backend) | Ongoing burn-down; ledger in `frontend/eslint.config.mjs` |
| Tier-3 refactors (page-builder dedup, giant-file splits, typed API client) | Large, scheduled |

## Operational notes

- Deployments: push to `main` → Render (backend, auto-migrate) + Vercel
  (frontend) auto-deploy.
- Sandbox payment gateways require `PD_ALLOW_SANDBOX_PAYMENTS=true` in
  production until real Flouci/Konnect credentials are configured.
