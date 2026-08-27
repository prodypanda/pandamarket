# 08 — AI Functionality & Superadmin AI-Costs (Dedicated Deep Pass)

> **Audited Surfaces:** `backend/src/api/ai.route.ts` (1,905 lines), `backend/src/api/admin/ai-costs.routes.ts`, `backend/src/api/admin/subscription-lifecycle.routes.ts`, 4 AI backend services, 3 background workers, 8 migrations, `frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx` (3,291 lines), `AiToolsStudio.tsx` (1,060 lines), `hub/dashboard/products/page.tsx` (7,847 lines), `PageBuilderEditorCore.tsx`.

---

## 1. Inventory & Architecture

### 1.1 Vendor Endpoints — `/api/pd/ai` (Guarded by `requireStore` + `requireAiToolsEnabled`)

| # | Endpoint | Line | Plan Gate | Job Row in DB | Sync/Async | Cost Source |
|---|---|---|---|---|---|---|
| 1 | POST `/compress` | 421 | `has_image_compression` | Queued | BullMQ worker | Pricing table |
| 2 | POST `/seo-generate` | 443 | `has_ai_seo` | Queued | BullMQ worker | Pricing table |
| 3 | POST `/seo-optimize` | 463 | `has_ai_seo` | Inline `seo_generation` | Sync | `getFeaturePrice` :546 |
| 4 | POST `/page-copy-helper` | 591 | `has_ai_seo` | Inline `page_copy` | Sync | :626 |
| 5 | POST `/product-description` | 658 | `has_ai_seo` | Inline | Sync | :690 |
| 6 | POST `/extract-attributes` | 776 | `has_ai_seo` | Inline **mislabeled** `product_description` | Sync | :840 |
| 7 | POST `/smart-fill` | 900 | `has_ai_seo` | Inline **mislabeled** `product_description` | Sync | :929 |
| 8 | POST `/category-pick` | 1036 | **None** | Inline | Sync | :1239 |
| 9 | POST `/category-pick-batch` | 1474 | **None** | **No row created** | Sync loop (≤50 calls) | :1513 |
| 10 | POST `/photo-studio/replace-background` | 1663 | `has_image_compression` | **No row created** | Sync | **Hardcoded 1** :1673 |
| 11 | POST `/photo-studio/generate-gallery` | 1709 | `has_image_compression` | **No row created** | Sync | **Hardcoded 2** :1719 |
| 12 | POST `/photo-studio/enhance` | 1748 | `has_image_compression` | **No row created** | Sync | **Hardcoded 1** :1758 |

### 1.2 Provider Adapter Capabilities

| Provider | Text Generation | Image Processing | Streaming | Timeout | Real Token Accounting |
|---|---|---|---|---|---|
| **Gemini** | ✅ Supported | ❌ | ❌ | None | ❌ (Guessed `tokens × 0.005`) |
| **Claude** | ✅ Supported | ❌ | ❌ | 45s | ❌ |
| **OpenAI / Custom** | ✅ Supported | ✅ DALL-E / Custom | ❌ | 45s text / None image | ❌ |
| **Replicate** | ❌ (Falls into OpenAI) | ✅ Replicate endpoint | ❌ | None | ❌ |

---

## 2. Critical & High AI Bugs

### [AI-1] Free AI Calls on Empty Wallet
- **Forensic Evidence:** In `backend/src/api/ai.route.ts:1240-1246, 1515-1521`:
  When `assertEnough` fails, the error is swallowed and converted into `canDeductTokens = false`. The LLM generation proceeds anyway with `tokensConsumed = 0`.
- **Impact:** Any merchant with 0 token balance can make unlimited AI requests. On `/category-pick-batch`, a single request triggers 50 free LLM calls.
- **Fix:** Remove error swallowing. If `creditsService.assertEnough` fails, immediately throw `PdValidationError(PdErrorCode.AI_INSUFFICIENT_TOKENS)`.

---

### [AI-2] Seller Token Balance Never Displays on Products Page
- **Forensic Evidence:** `frontend/src/app/hub/dashboard/products/page.tsx:995` expects `credits.ai_tokens_balance` or `credits.balance`. The backend endpoint `GET /api/pd/ai/credits` returns `{ data: { ai_tokens: N } }`.
- **Impact:** The token pill in the merchant product editor permanently shows 0 or blank.
- **Fix:** Normalize response shape to return both `ai_tokens` and `balance`.

---

### [AI-3] Charged for Failed Photo Studio Calls + Hardcoded Unsplash Fallback
- **Forensic Evidence:** In `backend/src/api/ai.route.ts:1727-1734`:
  If photo generation fails, it returns a hardcoded Unsplash stock photo URL (`images.unsplash.com/photo-1523275335684...`) while billing the merchant 2 tokens.
- **Fix:** Deduct tokens only on verified upstream success. Never return dummy stock photos on failure.

---

### [AI-4] `generateSeo` Crashes on Partial JSON
- **Forensic Evidence:** `backend/src/workers/ai.worker.ts:194-204` assumes `parsed.title` always exists and calls `.slice(0, 70)`. If the LLM returns an incomplete JSON object, it throws an unhandled error and burns 3 BullMQ retry attempts.
- **Fix:** Validate the parsed object with a Zod schema with safe fallbacks before accessing properties.

---

### [AI-5] Two Workers on One Queue & Dead Tagger Worker
- **Forensic Evidence:** `ai.worker.ts:215` and `ai-tagger.worker.ts:22`. `startAiTaggerWorker` is never imported or started in `main.ts:543`. If started, both workers would listen to the same queue, racing and stealing each other's jobs.
- **Fix:** Assign dedicated queue names: `ai-general-queue` and `ai-tagging-queue`.

---

### [AI-6] Product Tagging is Free and Leaves Jobs Stuck in `processing`
- **Forensic Evidence:** `ai.worker.ts:223-228` executes `return taggingResult as any;` before calling `creditsService.consume` or `aiService.markCompleted`.
- **Impact:** Jobs stick in `processing` status forever; zero tokens are deducted.
- **Fix:** Remove early return and let execution reach completion and billing statements.

---

### [AI-7] AI Job Types Mislabeled in Database
- **Forensic Evidence:** `/extract-attributes` (`ai.route.ts:825`) and `/smart-fill` (`ai.route.ts:922`) both record `job_type = 'product_description'`.
- **Impact:** Admin filters for `extract_attributes` and `smart_fill` in `AiCostsDashboard.tsx` return zero results.
- **Fix:** Add distinct enum values: `extract_attributes` and `smart_fill` in `AiJobType`.

---

### [AI-8] Admin Prompt Edits Silently Reverted on Read
- **Forensic Evidence:** In `backend/src/services/ai-config.service.ts:884,899,668-731`:
  `getPromptTemplate` executes `INSERT ... ON CONFLICT (purpose) DO UPDATE` with hardcoded source text. Every time prompts are fetched, admin customizations are overwritten.
- **Fix:** Change query to `INSERT ... ON CONFLICT (purpose) DO NOTHING`.

---

### [AI-10] Claude `max_tokens` Uses Gemini Default (500 Tokens)
- **Forensic Evidence:** `ai-config.service.ts:151` applies `config.ai.gemini.maxTokens` (default 500) to Claude. Complex descriptions or structured attribute extractions are truncated mid-JSON.
- **Fix:** Add provider-specific token limit configuration.

---

### [AI-14] Non-Atomic Check-Then-Spend Race Condition
- **Forensic Evidence:** In `backend/src/services/ai.service.ts:86-87`, token check occurs before LLM invocation, but deduction occurs after. Concurrent requests bypass token caps.
- **Fix:** Implement a two-phase reservation protocol: reserve credits before queueing; settle or refund upon completion.

---

### [AI-15] Runtime DDL Executed on Hot Generation Paths
- **Forensic Evidence:** `ai-config.service.ts:493-503` runs `ALTER TABLE` on every text generation call; `ai-product-tagger.service.ts:40-91` runs 4× `CREATE TABLE IF NOT EXISTS` on every tagProduct call, taking `ACCESS EXCLUSIVE` table locks.
- **Fix:** Remove runtime DDL entirely; schema objects already exist via migrations 073 and 077.

---

### [AI-20] Category-Pick Fabricates Categories on Parse Failure
- **Forensic Evidence:** `ai.route.ts:1267-1289`: If LLM fails to return valid JSON, it falls back to `flatCategories[0]` with confidence `0.70` and a fabricated explanation. With `apply_automatically: true`, up to 50 products are categorized into the wrong category.
- **Fix:** Return `needs_review` on parse failure; never auto-apply heuristic fallbacks.

---

## 3. AI Security & Safety Vulnerabilities

- **[AI-S1 & AI-S2] Stored XSS in Seller and Admin Panels:** AI HTML output rendered raw via `dangerouslySetInnerHTML` without DOMPurify in `products/page.tsx:6923` and `AiCostsDashboard.tsx:3080`.
- **[AI-S3] Unmitigated Prompt Injection:** User inputs are directly concatenated inside prompt templates (`"${effectiveRawInput}"`), allowing prompt overrides to manipulate output JSON contracts.
- **[AI-S4] Plaintext Key Fallback on Decrypt Failure:** `ai-config.service.ts:71-87` returns raw encrypted strings as API keys when decryption fails, causing confusing 401 errors.
- **[AI-S5] Server-Side Request Forgery (SSRF) in Photo Studio:** `image_url` on `/photo-studio/*` is fetched server-side by the worker without passing through `utils/ssrf.ts`. Cloud metadata endpoints (`169.254.169.254`) and internal microservices are reachable.
- **[AI-S8] Absence of AI Endpoint Rate Limiting:** While general endpoints have a 100 req/min limit, `/category-pick-batch` allows 50 calls per batch, producing up to 5,000 upstream LLM calls per minute from a single user.
