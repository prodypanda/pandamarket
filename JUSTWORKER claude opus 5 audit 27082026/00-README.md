# JUSTWORKER · Claude Opus 5 · PandaMarket Deep Platform Audit

**Audit date:** 2026-08-27
**Repository HEAD:** `703a14c` (`refactor(admin): split 6,883-line admin.route.ts into 17 domain routers`)
**Auditor:** Claude Opus 5 (JUSTWORKER), read-only. **No file in the application was modified.**

---

## What this audit is

A full-surface review of the PandaMarket platform — backend, marketplace hub, multi-tenant
storefronts, seller dashboard, superadmin dashboard, ads, AI, analytics, media, payments,
subscriptions, workers, database, and deployment configuration.

It is **evidence-based**. Every finding is either cited to `file:line`, backed by a live HTTP
probe against production, or backed by a read-only SQL query against the production Supabase
database. Where a claim could not be verified, that is stated explicitly in
[`12-VERIFICATION-GAPS.md`](./12-VERIFICATION-GAPS.md).

It audits the **platform**, not the content. Per your instruction, sample products, categories,
test accounts and placeholder copy are out of scope.

---

## Read in this order

| # | Document | Read it when |
| --- | --- | --- |
| 01 | [Executive Summary](./01-EXECUTIVE-SUMMARY.md) | You want the verdict and the five things that matter most. **Start here.** |
| 02 | [Architecture & Live State](./02-ARCHITECTURE-AND-LIVE-STATE.md) | You want the system map plus exactly what production looks like right now. |
| 03 | [Bugs — P0 Critical](./03-BUGS-P0-CRITICAL.md) | 6 findings. Security holes, money creation, and a build that does not compile. |
| 04 | [Bugs — P1 High](./04-BUGS-P1-HIGH.md) | 27 findings. Broken flows, silent feature loss, wrong numbers shown to users. |
| 05 | [Bugs — P2 Medium](./05-BUGS-P2-MEDIUM.md) | 59 findings. Correctness, reliability, performance, a11y, i18n, hygiene. |
| 06 | [Missing Work](./06-MISSING-WORK.md) | 18 items. Things the concept documents promise that do not exist yet. |
| 07 | [Enhancements & New Ideas](./07-ENHANCEMENTS.md) | 35 items. Architecture leverage, product opportunities, governance. |
| 08 | [**TODO Checklist**](./08-TODO-CHECKLIST.md) | **The working document.** Every task, tiered, with effort markers and cross-references. |
| 09 | [Implementation Guides](./09-IMPLEMENTATION-GUIDES.md) | You are about to fix something and want the exact diff-level instructions. |
| 10 | [Evidence & Method](./10-EVIDENCE-AND-METHOD.md) | You want to reproduce a finding or check how a number was obtained. |
| 11 | [What Is Genuinely Solid](./11-WHAT-IS-SOLID.md) | You want to know what **not** to touch, and which patterns to copy. |
| 12 | [Verification Gaps](./12-VERIFICATION-GAPS.md) | You want the honest boundary of this audit's confidence. |

Appendices:

| # | Document | Contents |
| --- | --- | --- |
| A | [Route & Guard Inventory](./A-ROUTE-INVENTORY.md) | Every mutating route and its guard status; CSRF exemptions; rate limiters. |
| B | [Database Findings](./B-DATABASE-FINDINGS.md) | Schema, indexes, RLS, row counts, table sizes, data anomalies, migration hygiene. |
| C | [Environment & Deployment](./C-ENVIRONMENT-AND-DEPLOYMENT.md) | Render/Vercel env var inventory, what is set vs what the code expects. |
| D | [Page & Route Status Matrix](./D-PAGE-STATUS-MATRIX.md) | Every hub / storefront / seller / admin page rated complete / partial / stub. |

---

## Finding counts

| Severity | Count | Meaning |
| --- | --- | --- |
| **P0** | 6 | Blocks deploy, or lets an attacker cross a tenant boundary / create money. Fix now. |
| **P1** | 27 | A core flow is broken, a promised feature is silently dead, or users see wrong data. |
| **P2** | 59 | Real defects with a workaround, latent risk, performance, accessibility, i18n. |
| **Missing work** | 18 | Not a bug — genuinely unbuilt. |
| **Enhancements** | 35 | Not a defect — leverage. |
| **Total actionable** | **145** | |

Numbering is stable across documents: `B-nn` = bug, `M-nn` = missing work, `E-nn` = enhancement.
A finding keeps its number everywhere it is referenced.

---

## The one-paragraph verdict

The commerce core is genuinely strong — checkout, payment capture and report authorization are
better engineered than most of what surrounds them. The defects cluster in five identifiable
places, which makes them tractable: **(1)** the event fan-out layer is disconnected, so seven core
domain events are subscribed but never emitted and an entire category of notifications, emails and
outgoing webhooks has never fired in production; **(2)** storefront customer identity is
indistinguishable from marketplace user identity at the token level, which opens a tenant boundary;
**(3)** several money paths are half-built — refunds are recorded but never executed, withdrawals
have no approval flow, ads auto-refill mints balance without payment; **(4)** the UI does not
reflect the backend's own feature gates, so paying and non-paying users alike hit raw 403s on
buttons the interface happily renders; **(5)** three infrastructure dependencies (email, object
storage, SMS) are unconfigured, and in two of those cases the code silently degrades rather than
failing loudly. Plus one immediate blocker: **the backend does not currently compile** because of
uncommitted work in your tree.

---

## How to use the checklist

[`08-TODO-CHECKLIST.md`](./08-TODO-CHECKLIST.md) is designed to be edited in place as you work.
Each item carries:

- a **tier** (0 = before next push, 1 = this week, 2 = this month, 3 = backlog)
- an **effort marker** (⚡ = under an hour)
- a **cross-reference** to the finding (`[B-07]`) and, where one exists, to a copy-paste guide (`→ Guide C`)
- an **acceptance criterion** — how you know it is actually done

Suggested workflow: close all of Tier 0, then re-run the verification commands in
[`10-EVIDENCE-AND-METHOD.md §6`](./10-EVIDENCE-AND-METHOD.md) to confirm the live probes changed,
then move to Tier 1.

---

## Ground rules observed during this audit

- No application file was created, modified or deleted.
- All database access was read-only. No `INSERT`, `UPDATE`, `DELETE` or DDL was executed.
- All live HTTP probes were `GET`, with one exception: a single `POST` to
  `/api/pd/retention/rewards-lead`, which returned `403` on CSRF and therefore wrote nothing.
- Credentials from `REMOTE_CREDENTIALS.md` were used only to read state (Render env vars, Vercel
  project config, Supabase schema and row counts). No secret value is reproduced in these
  documents — secrets are referenced by key name and length only.
