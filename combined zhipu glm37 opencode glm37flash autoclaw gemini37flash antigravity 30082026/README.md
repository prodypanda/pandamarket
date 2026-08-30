# PandaMarket — COMBINED Order Process Audit (3 sources merged)

> **Folder**: `combined zhipu glm37 opencode glm37flash autoclaw gemini37flash antigravity 30082026/`
> **Date**: 30 August 2026 · **Merged at repository commit `7141e9f`** (branch `main`).

---

## 1. Provenance — the three source audits

| # | Source audit folder | Auditor / engine | Distinctive strengths | Files |
|---|---------------------|------------------|------------------------|-------|
| A | `zhipu glm37 opencode audit 30082026/` | Zhipu GLM 3.7 via opencode CLI | **Live production forensics** (read-only SQL against Supabase, Render deploy-parity verification, git `-S` forensics). Found the money/safety bugs and the dead `ORDER_PLACED` event. | 11 |
| B | `glm37flash autoclaw audit 30082026/` | GLM-3.7 Flash via AutoClaw | **Complete architecture reference** (4 state machines, full `pd_order.status` writer map, API surface), 11 extra findings F-1..F-11, QA reproduction checklists. | 9 |
| C | `gemini37flash antigravity 30082026/` | Gemini 3.7 Flash via Antigravity | **Financial/escrow deep-dive** — found the shipping-fee omission in vendor wallet credits (unique), migration & code blueprints, store-scoped UI status helper. | 6 |

All three audited **the same commit (`7141e9f`)** — which this merge verified is **byte-identical to the live Render production deployment** (deploy `dep-da9akcffdruc739phj0g`, live since 2026-08-29T09:48Z). Every finding below is therefore live in production.

Audit scopes agreed: Meilisearch excluded (unconfigured, owner-confirmed). No source file was modified by any audit or by this merge.

---

## 2. Merge methodology

1. All claims from all three audits were collected and **de-duplicated** (three audits independently found the same 3 reported bugs and several systemic issues — cross-confirmation raised confidence).
2. Every claim unique to one audit was **re-verified against the code** during this merge (seller.route.ts duplicate endpoint, schema constraints, test mocks, buyer pages, subscriber wallet math, invalid status literals).
3. **Conflicts were resolved with evidence** (see `06-EVIDENCE-AND-CONFLICT-RESOLUTION.md` for the full table). The two notable ones:
   - *Is `ORDER_PLACED` wired?* Audit B's events table said "✅ wired" — **WRONG**. Audit A's repo-wide grep of `eventBus.emit(PdEvent.` (13 hits, none ORDER_PLACED) plus `git log -S` (never existed) prove it is **dead, like ORDER_FULFILLED**. Resolved: dead.
   - *Where should "Préparation" live — order level or fulfillment level?* Audit C proposed also writing `pd_order.status='processing'`; Audit B argued preparation is per-store and the master order must stay an aggregate. Resolved: **fulfillment-level `'preparing'` is the source of truth**; order-level `processing` becomes a *derived* display state in the central recompute helper (safe compromise, no flapping).
4. Findings were **re-numbered into one unified scheme** (P0-x / P1-x / P2-x) so implementation references are unambiguous.
5. Fix guides, TODO checklists, and QA lists were merged into single canonical documents, keeping the strongest sketch from each source.

---

## 3. Document index (suggested reading order)

| # | File | Content |
|---|------|---------|
| 00 | `00-EXEC-SUMMARY.md` | Unified executive summary, headline numbers, cross-audit finding matrix |
| 01 | `01-THREE-SYMPTOMS-ROOT-CAUSES.md` | Merged root-cause analysis of the 3 owner-reported symptoms (backend + UI perspectives combined) |
| 02 | `02-FINDINGS-P0-CRITICAL.md` | 6 critical findings (incl. the shipping-fee wallet omission found only by Audit C) |
| 03 | `03-FINDINGS-P1-HIGH.md` | 7 high findings |
| 04 | `04-FINDINGS-P2-MEDIUM.md` | ~18 medium/hygiene findings |
| 05 | `05-ARCHITECTURE-REFERENCE.md` | Canonical architecture: data model, 4 state machines, complete writer map, API surface, events, i18n labels, money flows |
| 06 | `06-EVIDENCE-AND-CONFLICT-RESOLUTION.md` | Production DB forensics, deploy parity, git forensics, per-audit unique findings, resolved conflicts |
| 07 | `07-IMPLEMENTATION-GUIDES.md` | 12 merged how-to guides (A–L) with code sketches |
| 08 | `08-MASTER-TODO-CHECKLIST.md` | Unified phased checklist with acceptance criteria |
| 09 | `09-QA-VERIFICATION-AND-MONITORING.md` | Pre-fix reproduction, post-fix acceptance, SQL census queries, monitoring alerts |

---

## 4. Headline numbers

| Metric | Value |
|--------|-------|
| Critical (P0) findings (merged) | **6** |
| High (P1) findings (merged) | **7** |
| Medium/hygiene (P2) findings (merged) | **18** |
| Findings found by ALL THREE audits independently | 5 (the 3 symptoms + carrier desync + dead shipped-notification event) |
| Findings unique to Audit A (opencode) | 5 (ORDER_PLACED dead, unsafe cancel, gross-vs-net refund debit, OTP leak, hardcoded domains) |
| Findings unique to Audit B (autoclaw) | 6 (refund oversight gap, cancelled-label trap, untranslated chips, duplicate endpoint, markPaid jump, test-mock contract gap) |
| Findings unique to Audit C (gemini) | 1 major (**shipping fee omitted from vendor wallet credit**) + blueprints |
| New findings surfaced during THIS merge | 2 (invalid status literals `'paid'/'shipped'/'completed'` in SQL; duplicate fulfill endpoint body-param drift `carrier_name` vs `carrier`) |
| Production orders verified in desynced state | 5 (3 multi-vendor partial-ship + 2 carrier-label shipped stuck at `payment_required` since Aug-15) |
| Lifecycle events defined but never emitted | 2 (`pd.order.placed`, `pd.order.fulfilled`) |
| Production money leaks confirmed/indicated | COD carrier-delivered capture missing; shipping fees never credited to vendors; refund double-restock |

---

## 5. The one-paragraph summary

PandaMarket's order pipeline runs on **four loosely-coupled state machines** (`pd_order.status`, `pd_order.payment_status`, `pd_fulfillment.status`, `pd_shipment.status`) with **no single owner of truth**: the manual "Mark shipped" path syncs the order aggregate, but the **carrier-label path and the carrier-tracking-sync path mutate fulfillments without ever recomputing the order** (confirmed live: single-fulfillment COD orders shipped Aug-15 are still `payment_required` today, with their payment forever un-capturable by existing code). On top of that: the two core lifecycle events (`ORDER_PLACED`, `ORDER_FULFILLED`) have **full subscriber pipelines (emails, WhatsApp, in-app, vendor webhooks, stock alerts) but zero emitters** — the entire order notification layer is silently dead; **vendor wallets are credited item-subtotal-net only, so the shipping fees buyers pay (7 TND/store) never reach the merchants** who pay the carriers; **refunds double-restock inventory and debit gross from net-credited wallets**; and the seller dashboard faithfully renders all of it — contradictory status badges, a fake auto-completed "Préparation" timeline step with no persisted state behind it, and "Détail des articles indisponible" in the COD/RTO tabs because they open the drawer from item-less list rows. All fixes — one centralized status recompute, two event emissions, one wallet-credit correction, and a handful of frontend one-liners — are fully specified in `07-IMPLEMENTATION-GUIDES.md`.

---

## 6. Constraints & operational protocol (as required by REMOTE_CREDENTIALS.md)

- **This merge modified zero source files** — only this new folder was created. `git status` verified.
- Parallel-agent safety: this folder is purely additive; all future edits per the fix plan must re-read target files immediately before writing.
- Production credentials were used strictly read-only by Audit A (SELECTs + Render GET endpoints).
- Any implementation following `08-MASTER-TODO-CHECKLIST.md` must be committed & pushed to `github/main` **only with explicit owner confirmation**, then verified on Render (`srv-d9qjrth42hec73efhoa0`) and Vercel (`www.garbage.team`).
