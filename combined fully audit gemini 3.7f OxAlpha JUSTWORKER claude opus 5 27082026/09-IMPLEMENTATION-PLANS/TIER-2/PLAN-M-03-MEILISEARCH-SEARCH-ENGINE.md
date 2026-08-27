# Engineering Specification: PLAN-M-03
## Meilisearch Full-Text Engine with Automatic PostgreSQL ILIKE Fallback

- **Target PRD Gap:** [M-03](../../04-MISSING-WORK-PRD/M-01-TO-M-06-CORE-COMMERCE.md#m-03)
- **Severity:** 🟡 PRD Gap / Search Performance & Relevance
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** Search Route, Search Service, BullMQ Sync Worker.

---

### 1. Summary & Business Impact
Marketplace product search currently executes `ILIKE '%term%'` queries across titles and descriptions with sequential table scans. Meilisearch delivers sub-50ms typo-tolerant search, faceted filtering (price, category, vendor), and instant autocomplete. Because the user will configure Meilisearch later, the engine must feature an automatic dual-mode: use Meilisearch when credentials are provided, or fall back to optimized PostgreSQL search.

---

### 2. Technical Architecture & Flow
1. **Indexes:** `pd_products`, `pd_stores`, `pd_categories`.
2. **Search Worker:** Listens to `PdEvent.PRODUCT_CREATED`, `UPDATED`, `DELETED` and queues incremental document syncs.
3. **Graceful Fallback:** If `MEILISEARCH_HOST` is empty or unreachable, `searchService.searchProducts` transparently executes PostgreSQL query.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/search-service.test.ts
```
