# PandaMarket — Zhipu GLM 3.7 (opencode) Deep Audit — 30/08/2026

> **Scope**: Marketplace ORDER PROCESS (end-to-end) + investigation of 3 seller-dashboard symptoms reported by the owner.
> **Auditor**: Zhipu GLM 3.7 via opencode CLI agent.
> **Date**: 30 August 2026.
> **Repo state audited**: local HEAD `7141e9f` — verified identical to the LIVE Render production deployment (deploy `dep-da9akcffdruc739phj0g`, live since 2026-08-29T09:48:10Z). **Every bug in this audit is live in production.**

---

## Why this audit exists

The owner reported 3 symptoms in the seller dashboard (`/hub/dashboard/orders`):

1. An order expedition is marked "expédiée" (shipped) but the order status still displays "pending" / "En attente".
2. The seller cannot change the "Préparation" (preparation) status of an order.
3. The "Articles de la boutique" (store items) card shows "Détail des articles indisponible" (item details unavailable).

All three were root-caused, verified against the live production database (Supabase), and traced to specific lines of code. They are symptoms of **3 deeper systemic defects** in the order state machine (see `01-ANSWERS-THREE-SYMPTOMS.md`).

---

## Document index

| # | File | Content |
|---|------|---------|
| 00 | `00-EXEC-SUMMARY.md` | Executive summary, key numbers, top findings |
| 01 | `01-ANSWERS-THREE-SYMPTOMS.md` | Detailed root-cause answers to the 3 reported symptoms, with production evidence |
| 02 | `02-BUGS-P0-CRITICAL.md` | Critical bugs (order state machine desync, dead events, unsafe cancel, corrupting refunds) |
| 03 | `03-BUGS-P1-HIGH.md` | High-severity bugs (RTO guards, COD OTP security theater, hardcoded domains, fulfill overwrite) |
| 04 | `04-BUGS-P2-MEDIUM.md` | Medium / hygiene issues (timeline logic, colors, i18n hardcoding, duplicate types) |
| 05 | `05-ORDER-PROCESS-FULL-AUDIT.md` | Full end-to-end order flow documentation: checkout -> payment -> fulfillment -> delivery -> cancel -> refund -> RTO -> settlement, with per-endpoint audit notes |
| 06 | `06-EVIDENCE-PRODUCTION-DB.md` | All SQL queries run against production + results, Render deploy verification, git forensics, methodology |
| 07 | `07-WHAT-WORKS-WELL.md` | Solid architecture worth preserving (do not break while fixing) |
| 08 | `08-MASTER-TODO-CHECKLIST.md` | Prioritized, actionable TODO checklist with acceptance criteria |
| 09 | `09-IMPLEMENTATION-GUIDES.md` | Step-by-step "how to fix" guides with concrete code sketches |

**Suggested reading order**: 00 -> 01 -> 02 -> 05 -> 08 -> 09.

---

## Key numbers at a glance

| Metric | Value |
|--------|-------|
| Order-processing backend files audited in depth | `order.service.ts` (2,666 lines), `order.route.ts` (553 lines), `shipping.service.ts` (1,089 lines), `order.subscriber.ts` (426 lines), middlewares, workers, event bus |
| Seller dashboard page audited | `frontend/src/app/hub/dashboard/orders/page.tsx` (~4,438 lines) |
| Critical (P0) defects found | **5** |
| High (P1) defects found | **4** |
| Medium / hygiene (P2) issues found | **9+** |
| Production orders analyzed directly in DB | 20 most recent + full status distributions |
| Production orders currently in a desynced state | **5 confirmed** (3 multi-vendor partial-ship, 2 carrier-label shipped with stale order status) |
| Lifecycle events defined but never emitted | **2** (`pd.order.placed`, `pd.order.fulfilled`) |
| Files modified by this audit | **0** (read-only audit; no code was changed) |

---

## The one-paragraph summary

PandaMarket's order pipeline has a **split-brain state machine**: `pd_order.status` (global) and `pd_fulfillment.status` (per-store) are updated by different code paths that don't know about each other. The manual "Mark shipped" path correctly syncs the order status; the **carrier-label generation path and the carrier-tracking-sync path do NOT** — they set the fulfillment to `shipped`/`delivered` and leave the order stuck at `pending`/`payment_required` forever (confirmed live in production: COD orders shipped via Aramex on Aug 15 are still `payment_required` today). On top of that, the two most important lifecycle events (`ORDER_PLACED`, `ORDER_FULFILLED`) have full subscriber pipelines (emails, WhatsApp, in-app notifications, vendor webhooks, stock alerts) **but no code ever emits them**, so the entire notification/webhook layer for orders is silently dead. The seller dashboard then faithfully displays the corrupted state ("Expédiée" badge next to "En attente" order status), offers no "Préparation" control because no such persisted state exists (`OrderStatus.Processing` is dead code), and the COD Radar / RTO tabs show "Détail des articles indisponible" because they open the detail drawer from the **list row** (which has no items) instead of calling the detail endpoint. All fixes are detailed in `09-IMPLEMENTATION-GUIDES.md`.

---

## Constraints respected during this audit

- **No files were modified, created, or deleted** anywhere in the repo (verified with `git status` before/after — only pre-existing untracked audit folders from other agents were present).
- Production credentials from `REMOTE_CREDENTIALS.md` were used **read-only** (SELECT queries + Render API GET calls). The only write to the filesystem was to the OS temp folder for query scripts, which were deleted afterwards.
- Meilisearch was intentionally skipped (not configured yet, per owner instruction).
- Note: parallel AI agents may be working in this workspace; this audit folder is purely additive and touches nothing else.
