# 09 — AI Functionality & Superadmin AI-Costs — Dedicated Deep Pass

> Verified by reading `backend/src/api/ai.route.ts` (1905 lines), `backend/src/api/admin/ai-costs.routes.ts`, `backend/src/api/admin/subscription-lifecycle.routes.ts` (AI routing/prompts live there), 4 AI services, 3 workers, 8 migrations, `frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx` (3291 lines), `AiToolsStudio.tsx` (1060), `hub/dashboard/products/page.tsx` (7847), `PageBuilderEditorCore.tsx`, all AI tests, `config.ts`, `.env.example`. READ-ONLY.

---

## 1. Inventory

### 1.1 Vendor endpoints — `/api/pd/ai` (all behind `requireStore` + `requireAiToolsEnabled`, `ai.route.ts:128-134`)

| # | Endpoint | Line | Plan gate | Job row | Sync/Queued | Cost source |
|---|---|---|---|---|---|---|
| 1 | POST `/compress` | 421 | `has_image_compression` | queued | BullMQ | pricing table |
| 2 | POST `/seo-generate` | 443 | `has_ai_seo` | queued | BullMQ | pricing table |
| 3 | POST `/seo-optimize` | 463 | `has_ai_seo` | inline `seo_generation` | sync | `getFeaturePrice` :546 |
| 4 | POST `/page-copy-helper` | 591 | `has_ai_seo` | inline `page_copy` | sync | :626 |
| 5 | POST `/product-description` | 658 | `has_ai_seo` | inline | sync | :690 |
| 6 | POST `/extract-attributes` | 776 | `has_ai_seo` | inline **mislabeled** `product_description` :825 | sync | :840 |
| 7 | POST `/smart-fill` | 900 | `has_ai_seo` | inline **mislabeled** :922 | sync | :929 |
| 8 | POST `/category-pick` | 1036 | **none** | inline | sync | :1239 |
| 9 | POST `/category-pick-batch` | 1474 | **none** | **no row** | sync loop ≤50 LLM calls | :1513 |
| 10 | POST `/photo-studio/replace-background` | 1663 | `has_image_compression` | **no row** | sync | **hardcoded 1** :1673 |
| 11 | POST `/photo-studio/generate-gallery` | 1709 | `has_image_compression` | **no row** | sync | **hardcoded 2** :1719 |
| 12 | POST `/photo-studio/enhance` | 1748 | `has_image_compression` | **no row** | sync | **hardcoded 1** :1758 |
| 13-19 | GET `/jobs/:id` 1780 · `/history` 1796 · `/credits` 1815 · `/pricing` 1825 · `/token-packs` 1835 · `/token-purchases` 1845 · POST `/buy-tokens` 1857 | | | | | |
| 20-22 | GET/PUT/DELETE `/provider-config` | 1868/1878/1895 | `has_own_ai_provider` (DELETE has **none**) | | | |

### 1.2 Admin endpoints
`admin/ai-costs.routes.ts`: GET `/ai-costs` + `/ai-stats` (210-211, same handler) · GET `/ai-jobs` (225) · GET `/ai-jobs/:id` (393) · GET `/ai-config` (500) · POST `/ai-providers` (511) · PUT `/ai-providers/:id` (529) · DELETE (548) · PUT `/ai-pricing` (557).
`admin/subscription-lifecycle.routes.ts` (misplaced): GET/PUT `/ai/purpose-routing` (224/235, **no zod**) · GET `/ai/prompts` (258) · GET/PUT `/ai/prompts/:key` (269/280, **no zod**) · GET `/analytics/ai-tagging-health` (298) · POST `/analytics/ai-tagging-sweep` (320).
`credits.route.ts`: GET `/credits` (39) · POST `/credits/refill` (54, admin-only).

### 1.3 Provider adapter matrix

| Provider | Text | Image | Streaming | Timeout | Real token usage | Vision |
|---|---|---|---|---|---|---|
| Gemini | ✅ :138-143 | ❌ | ❌ | **none** | ❌ | ❌ |
| Claude | ✅ :145-165 | ❌ | ❌ | 45s | ❌ | ❌ |
| OpenAI/custom | ✅ :167-186 | ✅ :1052-1070 | ❌ | 45s text / **none** image | ❌ | ❌ |
| Replicate | ❌ **not implemented** (falls into OpenAI branch) | ✅ :1033-1050 | ❌ | none | ❌ | ❌ |

Provider `usage`/`usageMetadata` never read → **zero real token accounting**. Platform cost = `tokens × 0.005` hardcoded (`ai-costs.routes.ts:145`). No margin tracking (revenue table `pd_ai_token_purchase` never joined to usage).

### 1.4 Admin UI capability matrix

| Capability | Status | Evidence |
|---|---|---|
| Provider CRUD | ✅ | `AiCostsDashboard.tsx:826-884` ↔ routes 511-555 |
| Purpose routing | ✅ (2 of 9 purposes dead) | :2043-2239 |
| Prompt editing | ⚠️ partial | 8 hardcoded keys; server re-seeds over edits (AI-8) |
| Feature pricing | ⚠️ partial | only 5 `AiJobType` rows; photo studio & tagging unreachable |
| Token pack management | ❌ **missing** | zero route, zero UI — SQL only |
| Per-store credit adjust | ❌ missing from UI | `POST /credits/refill` exists, 0 frontend callers |
| Job retry/cancel | ❌ missing | `bullmq_job_id` stored + displayed, never actioned |
| Budget caps/alerts | ❌ missing | no table/route/UI (Ads has them) |
| Cost export | ❌ missing | `Download` icon imported :22, never rendered |
| Provider connectivity test | ❌ **FAKE** | see AI-M1 |

---

## 2. Bugs

| ID | Bug | Evidence | Fix |
|----|-----|----------|-----|
| **AI-1** 🔴 | **Free AI on empty wallet.** `assertEnough` failure swallowed into `canDeductTokens=false`, LLM runs anyway, `tokensConsumed=0`. `/category-pick-batch` = 50 free calls/request, unlimited | `ai.route.ts:1240-1246`, `1515-1521`, `1427`, `1648` | Remove the swallow; throw `PD_AI_INSUFFICIENT_TOKENS` before any provider call |
| **AI-2** 🔴 | **Seller credit balance never displays** on products page: frontend reads `credits.ai_tokens_balance`/`balance`, backend returns `ai_tokens` | `products/page.tsx:995` vs `credits.service.ts:47-53` | Read `ai_tokens`; add a shared typed response |
| **AI-3** 🔴 | **Charged for failed photo-studio calls**; gallery returns a **hardcoded Unsplash stock photo** after billing 2 tokens | `ai.route.ts:1691-1697`, `1727-1734`, `1762-1769`, stock URL :1731 | Consume only on verified provider success; remove stock fallback |
| **AI-4** | `generateSeo` crashes on partial JSON (`parsed.title.slice` on missing field) → burns 3 BullMQ attempts | `ai.worker.ts:194-204` | Validate with zod before use; fall back to heuristic |
| **AI-5** | **Two workers on one queue; tagger is dead.** `startAiTaggerWorker` never imported; `nightly_sweep`/`sweep_untagged` unreachable; if both started they'd race and swallow jobs | `ai.worker.ts:215`, `ai-tagger.worker.ts:22,47`, `main.ts:543` | Delete the tagger worker OR register it with distinct job names + own queue |
| **AI-6** | **Tagging is invisible & free**: early return before credit/markCompleted; synthetic `job_id` with no DB row → `markProcessing` updates 0 rows; admin advertises `product_tagging` filter that always returns empty | `ai.worker.ts:223-228`, `ai-product-tagger.service.ts:257` | Create real job rows; consume tokens or explicitly price at 0 and document |
| **AI-7** | **Job types mislabeled** → admin filters return nothing. Smart-fill + extract-attributes both write `product_description`; photo studio writes nothing | `ai.route.ts:825,922`; `enums.ts:193-199`; filters `AiCostsDashboard.tsx:1806-1812` | Extend `AiJobType`, add DB CHECK, migrate historical rows |
| **AI-8** | **Admin prompt edits silently reverted**: `updatePromptTemplate` → `getPromptTemplate` re-runs `INSERT … ON CONFLICT DO UPDATE` with hardcoded source text | `ai-config.service.ts:884,899,668-731,798` | Seed only when row absent; never overwrite on read |
| **AI-9** | `page_copy` price disagreement across 4 sources (migration 2, listPricing 1, fallback 2, UI 2, comment "1") | `032:45`, `ai-config.service.ts:266,321`, `AiToolsStudio.tsx:848` | Single source = DB; delete literals |
| **AI-10** | **Claude `max_tokens` uses Gemini config** (default 500) → truncated JSON on every Claude call | `ai-config.service.ts:151`, `config.ts:160` | Per-provider max tokens column |
| **AI-11** | `config.openai` is dead (0 usages) — setting an OpenAI env key does nothing | `config.ts:162-165` | Wire env fallback or delete |
| **AI-12** | **Replicate cannot do text** but the UI offers it for every text purpose | `ai-config.service.ts:167-170`, UI :2164-2168 | Filter provider options by capability |
| **AI-13** | `markFailed` drops `input_meta` in 4 of 6 sync routes → "Inspect prompt" empty exactly when debugging matters | `ai.route.ts:585,769,893,1000` | Always pass meta |
| **AI-14** | **Non-atomic check-then-spend**: N concurrent requests all pass `assertEnough`, then `consume` throws after provider billed, job marked failed despite valid output | `ai.service.ts:86-87` + call sites | Reserve→settle pattern + idempotency key |
| **AI-15** | **Runtime DDL on hot paths**: `ALTER TABLE` on every generation; `CREATE TABLE`×4 on every tagProduct — ACCESS EXCLUSIVE locks | `ai-config.service.ts:493-503`, `ai-product-tagger.service.ts:40-91` | Delete (migrations 073/077 already do it) |
| **AI-16** | `listPricing` **writes 5 INSERTs on a GET** | `ai-config.service.ts:271-278` | Move seeding to migration |
| **AI-17** | `assertAiFeature` collapses all text features onto `has_ai_seo`, all image onto `has_image_compression` | `ai.route.ts:403-418` | Per-feature plan flags |
| **AI-18** | `deleteStoreProvider` has no plan check (inconsistent with save) | `ai-config.service.ts:353-355` | Add assert |
| **AI-19** | `/jobs/:id` 404 returns bare object, bypassing error contract (`code` missing) | `ai.route.ts:1788` | Throw `PdNotFoundError` |
| **AI-20** 🔴 | **Category-pick fabricates a category** on parse failure: assigns `flatCategories[0]` with `confidence 0.70` and a confident French reason; in batch with `apply_automatically` this is **written to up to 50 products** | `ai.route.ts:1267-1289`, `1594-1617` | Return `needs_review` instead; never auto-apply low-confidence/fallback results |

## 3. Security

| ID | Issue | Evidence |
|----|-------|----------|
| **AI-S1** 🔴 | **Stored XSS seller → superadmin.** `selectedJob.output.description_html` rendered raw; content originates from LLM whose prompt is built from seller-controlled title/description | `AiCostsDashboard.tsx:3078-3081`; source `ai.route.ts:763` |
| **AI-S2** | Same raw render in seller UI (`smartFillSuggestions.suggested_description`) | `products/page.tsx:6921-6923` |
| **AI-S3** 🔴 | **Prompt injection fully unmitigated** in all 9 sync endpoints; `/smart-fill` interpolates inside double quotes (`"${effectiveRawInput}"`) → attacker controls the JSON contract → controls `marketplace_category_id` → written to `pd_product` when `apply_automatically:true` | `ai.route.ts:945`, `1529-1534`, `1609-1617` |
| **AI-S4** | **API keys usable as plaintext**: `safeDecrypt` returns raw stored value on decrypt failure if length ≥8; operators cannot tell encrypted from plaintext rows | `ai-config.service.ts:71-87` |
| **AI-S5** 🔴 | **SSRF**: photo-studio `image_url` validated only `.min(1).max(2048)` (not even `z.string().url()`), forwarded to provider and fetched server-side by the worker. Repo already has `utils/ssrf.ts` — **not applied to any AI path**. `http://169.254.169.254/...` reachable | schemas :63,:75; worker `ai.worker.ts:83-92` |
| **AI-S6** | Full prompts + outputs readable by **any admin** (not just superadmin), searchable via `(input_meta)::text` — contains seller pricing/brand data | `ai-costs.routes.ts:261,283-284`; guard `middlewares/index.ts:182` |
| **AI-S7** | PII to third parties with no consent gate, no region pinning, arbitrary `base_url` custom providers allowed | `ai-costs.routes.ts:477` |
| **AI-S8** 🔴 | **No AI rate limiting** — only global 100 req/min. With batch ×50 → **~5,000 provider calls/min from one seller**, credits bypassable via AI-1 | `middlewares/index.ts:364-372` |
| **AI-S9** | Admin AI writes have **no zod** (`purpose-routing`, `prompts/:key`) → unbounded prompt size prepended to every generation | `subscription-lifecycle.routes.ts:235-292` |
| **AI-S10** | Audit log useless for AI: all `/api/pd/ai/*` recorded as `resource_type='api'`, `resource_id='pd'`; no actor for tagging/photo studio | `audit-log.middleware.ts:150-165` |
| **AI-S11** | Raw provider error strings (URLs, org ids, quota details) surfaced to sellers | `ai-config.service.ts:392-394` → `ai.route.ts:586` |

## 4. Incomplete / Missing

- **AI-M1** 🔴 **The "Sandbox / Tester un Prompt IA" is entirely fake** — `setTimeout(900ms)` returning a hardcoded "Montre Chronographe" result with invented telemetry. An admin will use it to validate a new API key and be told it works regardless (`AiCostsDashboard.tsx:1018-1044`, presented as realtime at :3232).
- **AI-M2** 2 of 9 routing purposes never consumed (`text_summarization`, `image_upscaling`) yet have dedicated UI cards; `/page-copy-helper` calls plain `generateText` so its routing card is decorative (`ai-config.service.ts:546-556`, `:627`).
- **AI-M3** 2 DB prompt templates never read (`product_smart_fill`, `page_copy`) — editing them changes nothing (prompts built inline at `ai.route.ts:938-971`, `606-607`).
- **AI-M4** **No realtime job progress** — no polling/socket in `AiToolsStudio`; manual refresh only. `AI_JOB_QUEUED` never emitted; `AI_JOB_FAILED` has **no subscriber** → failures notify nobody.
- **AI-M5** Insufficient-credit UX generic: backend returns `{required, available}`, no frontend file reads the code; no "buy tokens" CTA.
- **AI-M6** Token-pack purchase: transaction itself is **correct and atomic**, but wallet-only (gateway columns unused), **no idempotency key** (double-click debits twice), `GET /token-purchases` has no UI, `metadata` never written, no refund path, no admin revenue visibility.
- **AI-M7** Only 5 of 12 endpoints create job rows → `tokens_used` can never be reconciled against `SUM(pd_ai_jobs.tokens_consumed)`; **invalidates every number on the cost dashboard**.

## 5. Dead schema / dead config

`pd_ai_jobs.input_url` (never set by sync routes) · `bullmq_job_id` (stored, displayed, never used) · `started_at` == `created_at` for inline jobs (timeline shows identical stamps) · `pd_ai_token_purchase.metadata` / `status` / `payment_method` (single value each) · `pd_ai_token_pack.is_enabled` / `sort_order` (no write path) · `pd_ai_provider_config.priority` / `is_default` (ignored by purpose routing yet UI says "Priorité d'appel") · `pd_ai_prompt_templates.description` (never rendered) · `pd_vendor_credits.last_refill` (written 5×, read nowhere — **no monthly reset job exists**) · `config.openai.*` · `PdEvent.AI_JOB_QUEUED`.
Constraint gaps: no CHECK on `pd_ai_jobs.type`/`status`, none on `pd_ai_token_purchase.status`, none preventing `ai_tokens < -1`; missing composite index `(store_id, created_at DESC)` matching `listByStore`.
Env: `GEMINI_API_KEY`/`GOOGLE_API_KEY`/`GEMINI_MODEL` fallbacks + all `PD_OPENAI_*` undocumented in `.env.example`; no `PD_AI_*` vars exist; `.env.example` never mentions that platform keys live in `pd_ai_provider_config` and that rotating `PD_ENCRYPTION_KEY` silently degrades them into the plaintext path (AI-S4).

## 6. Quality (dashboard)

- Browser-side aggregation over a **LIMIT 20** dataset presented as global counts; pills read "Tous (20)" beside a true global KPI (`:1443-1448`, backend :114).
- Activity log silently substitutes `recent_failures` (LIMIT 8) with fabricated `tokens_consumed:0` when activity is empty — indistinguishable from real rows (`:1497-1512`).
- Top consumers truncated twice (server 10, client `.slice(0,6)`) while header claims 10.
- Missing loading/error states: `fetchConfig` `catch {}` → empty provider list with no error; `fetchHistory` `catch { /* Silent */ }` leaves stale rows.
- **A11y**: 3 attributes total in 3291 lines. No modal roles on 2 of 3 modals, no focus trap/Escape, click-only `<div>` rows with nested `<Link>`, unlabeled selects/inputs, chart is `<div>`s with `title` only, no `<caption>`/`scope`, tabs without `role="tablist"`.
- **100% hardcoded French** (no `useLocale`/`t`) incl. ~180 lines of French prompts; backend French leaks into API responses too.
- Re-render churn: every keystroke in history search recreates `fetchHistory` and refires the effect → **one HTTP request per character**; `fetchHistory` reads+writes `historyPagination`; refresh triggers 4 requests.
- 10 unused lucide imports; `failureSearch` state unused; sort setters exist with **no UI control** so sorting is permanently `created_at desc` despite backend supporting 4 keys.
- **Metrics the backend cannot provide**: "Coût Estimé" is `tokens×0.005`; "Latence Moyenne" uses `COALESCE(completed_at, NOW())` so stuck jobs inflate it forever; "Durée d'Exécution" grows unbounded per stuck row; "Moteur/Modèle" is a human label, real model id not stored; "Tokens Déduits" excludes photo studio + batch; `by_type` collapses two features; queue health reads DB not BullMQ.
- Prompt logic duplicated in **4 places** (route inline, service seed, migration SQL, frontend defaults) and already drifted (`⭐` vs `✨`). JSON-extraction regex copy-pasted at **8 sites**.
- `/category-pick-batch` = up to 50 sequential 45s calls in one HTTP request → theoretical 37-minute request; will hit any proxy timeout.
- `ai.route.ts` 1905 lines mixing routing + parsing + prompts + a 130-line hierarchy resolver inside a `.map()`; dashboard is one 2756-line component with 40+ `useState`.

## 7. Test gaps

Existing: `ai-product-tagger.service.test.ts` (296 lines, genuine). `ai-category-picker.test.ts` — weak (try/catch assertions, unmocked real DB, one test asserts logic re-implemented **inside the test**). `admin-ai-jobs.test.ts` — vacuous (copies the mapper into the test body; would pass if the route were deleted).
Missing: **zero route tests for all 22 AI endpoints**; provider resolution/cascade/`safeDecrypt` untested; **`credits.service.ts` has no test file at all** (the only money-moving AI code); `ai.service.ts` untested; both workers untested (a registration test would have caught AI-5, a `generateSeo` test AI-4); exported pure helpers untested; no prompt-injection test, no AI SSRF test, no rate-limit test; **zero frontend AI tests** (a single assertion would have caught AI-2); no AI load test despite batch being the most expensive endpoint.

## 8. Fix checklist — AI

### Tier A (security/revenue, this week)
- [ ] Sanitize `AiCostsDashboard.tsx:3080` + `products/page.tsx:6923` with existing DOMPurify — **AI-S1/AI-S2** ⚡
- [ ] Remove `canDeductTokens` swallow; fail closed — **AI-1**
- [ ] Stop consuming credits on provider failure; delete Unsplash fallback — **AI-3**
- [ ] Apply `utils/ssrf.ts` to all 3 photo-studio schemas + `ai.worker.ts` image loader — **AI-S5**
- [ ] Add `aiRateLimit` (e.g. 20/min/store, 5/min for batch); make batch async (job + progress endpoint) — **AI-S8/Q-12**
- [ ] Never auto-apply fallback categories; return `needs_review` — **AI-20**
- [ ] Prompt-injection hardening: delimit user text (XML tags/fenced blocks), instruct model to ignore embedded instructions, validate output IDs against the allowed category set before write — **AI-S3**
- [ ] zod on `PUT /ai/purpose-routing` + `/ai/prompts/:key` with length caps — **AI-S9**
- [ ] Remove `safeDecrypt` plaintext fallback; add `needs_reinput` state — **AI-S4**
- [ ] Restrict AI job inspection to `requireSuperAdmin` or redact `input_meta` for plain admins — **AI-S6**

### Tier B (correctness/billing)
- [ ] Reserve→settle credit pattern + idempotency keys (AI-14) and on `buy-tokens` (AI-M6)
- [ ] Create `pd_ai_jobs` rows for photo studio + batch + tagging; add type CHECK; migrate mislabeled rows — **AI-7/AI-M7/AI-6**
- [ ] Record real provider usage: add `prompt_tokens`, `completion_tokens`, `model`, `provider_cost_usd`, `charged_tokens` → replace the `×0.005` guess and enable margin reporting
- [ ] Fix `generateSeo` zod validation (AI-4); Claude max_tokens per provider (AI-10); provider capability filter (AI-12); wire or delete `config.openai` (AI-11)
- [ ] Decide tagger worker: delete or register with its own queue — **AI-5**
- [ ] Stop prompt re-seeding on read; migrate seeds — **AI-8/AI-16**
- [ ] Remove runtime DDL — **AI-15**
- [ ] Always persist `input_meta` on failure — **AI-13**
- [ ] Per-feature plan flags — **AI-17**; DELETE provider-config plan check — **AI-18**; error contract on `/jobs/:id` — **AI-19**
- [ ] Single price source for `page_copy` — **AI-9**
- [ ] Stuck-job sweeper (`processing` > 30min → failed) + exclude non-finished from latency metrics

### Tier C (dashboard & UX)
- [ ] Replace fake sandbox with a real provider-connectivity test endpoint — **AI-M1**
- [ ] Server-side aggregations + pagination for activity log; remove fabricated fallback rows
- [ ] Add loading/error/empty states; surface fetch failures
- [ ] i18n the whole dashboard (EN/FR/AR) incl. prompt labels
- [ ] Debounce history search (300ms) + stable `useCallback` deps; split into per-tab components
- [ ] Wire sort controls; remove unused imports/state
- [ ] Realtime job updates via existing socket (`AI_JOB_COMPLETED` already emitted) + `AI_JOB_FAILED` subscriber + `AI_JOB_QUEUED` emission — **AI-M4**
- [ ] Insufficient-credit UX with required/available + buy-tokens CTA — **AI-M5**
- [ ] Token-pack purchase history UI; admin token-pack CRUD; per-store credit adjust UI — **AI-M6**
- [ ] A11y pass (modal roles, focus trap, labels, chart alternative, tablist)

### Tier D (tests)
- [ ] `credits.service.test.ts` (money paths, concurrency, unlimited plans)
- [ ] Supertest suite for all 22 AI endpoints (auth, plan gates, tenant isolation, zod bounds, credit ordering)
- [ ] Worker tests incl. registration assertion + `generateSeo` partial-JSON
- [ ] Prompt-injection + SSRF regression tests
- [ ] Frontend tests: balance mapping, XSS sink, provider CRUD, routing/prompt/pricing saves, history filters
- [ ] k6 load test for `/category-pick-batch`

---

## 9. New AI functionality, enhancements & ideas

See [13-NEW-IDEAS-ROADMAP.md](./13-NEW-IDEAS-ROADMAP.md) §1 for the full AI roadmap (28 proposals: AI cost governance, per-store budgets, model router with price/quality tiers, semantic search & RAG, bulk catalog onboarding, Darija support, AI moderation, AI analyst, prompt playground with diffing, evaluation harness, and more).
