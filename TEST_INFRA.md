# E2E Test Infra: PandaMarket Superadmin Marketplace Products Management & Tagging Hub

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Tests are designed directly from the user specifications in `ORIGINAL_REQUEST.md` and `PROJECT.md`, exercising the system through public API endpoints, CLI scripts, and browser interactions without reliance on private implementation details.
- **Systematic 4-Tier Methodology**:
  1. **Tier 1 (Feature Coverage)**: >=5 test cases per feature covering representative happy-path inputs (Category-Partition).
  2. **Tier 2 (Boundary & Corner Cases)**: >=5 test cases per feature probing boundary conditions, 0 stock, extreme page sizes, invalid formats, and SQL injection safety (Boundary Value Analysis).
  3. **Tier 3 (Cross-Feature Combinations)**: Pairwise combinatorial testing verifying interactions (e.g. search + category filter + sort + pagination, drawer tag edits reflected in table/grid).
  4. **Tier 4 (Real-World Application Scenarios)**: High-level realistic operational workflows (Superadmin catalog audit, low-stock restock workflow, AI interest tagging workflow, Arabic RTL audit).

---

## Feature Inventory & Test Coverage Matrix
| # | Feature | Requirement Source | Tier 1 (Min 5) | Tier 2 (Min 5) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|---------------------|:--------------:|:--------------:|:-----------------:|:-----------------:|
| F1 | Superadmin Auth & Role Enforcement | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F2 | Product Catalog Query & Pagination | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F3 | Multi-Axis Sorting | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F4 | Universal Text Search | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F5 | Multi-Faceted Filtering | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F6 | Entity Hydration & Detail Graphs | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F7 | Summary Metrics Aggregation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F8 | Product Tag Management API | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F9 | Dual View Modes (Table vs Grid) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F10 | Visual Details, Badges & Store Links | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F11 | Interactive Inspection Drawer | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F12 | Navigation & Arabic RTL I18n | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

---

## Test Architecture & Runners

### 1. Browser End-to-End Test Suite (Playwright)
- **File**: `frontend/e2e/admin-marketplace-products.spec.ts`
- **Runner**: Playwright v1.60 with multi-browser support (Chromium, Firefox, Mobile Viewports)
- **Invocation Commands**:
  ```bash
  cd frontend
  npm run test:e2e:chromium -- e2e/admin-marketplace-products.spec.ts
  ```
- **Pass/Fail Semantics**: Exit code 0 indicates all browser navigation, view rendering, filter interactions, drawer inspections, tag updates, and RTL assertions passed.

### 2. Frontend Component & Integration Test Suite (Vitest)
- **File**: `frontend/src/__tests__/admin-products-page.test.tsx`
- **Runner**: Vitest v2.0.5 with React Testing Library & JSDOM
- **Invocation Commands**:
  ```bash
  cd frontend
  npm run test -- src/__tests__/admin-products-page.test.tsx
  ```
- **Pass/Fail Semantics**: Exit code 0 indicates all 8 comprehensive suites (50+ assertions) passed.

### 3. Backend API & Security Integration Test Suite (Vitest)
- **File**: `backend/src/__tests__/admin-products.route.test.ts`
- **Runner**: Vitest v2.1.9 with Supertest
- **Invocation Commands**:
  ```bash
  cd backend
  npm run test -- src/__tests__/admin-products.route.test.ts
  ```
- **Pass/Fail Semantics**: Exit code 0 indicates all authentication, SQL query building, tag sanitization, metrics, and security assertions passed.

#### Full backend run and diagnostics

The backend suite is an integration suite: PostgreSQL and Redis must be reachable before it starts. The normal runner uses Vitest's `forks` pool with two bounded workers. It performs a bounded service preflight, so a missing local dependency fails in seconds with the configured host/port instead of producing cascading connection errors or hanging Redis tests.

```bash
# From the repository root, after starting PostgreSQL and Redis:
npm run test -w backend

# CI-equivalent run (runtime check, service preflight, migrations, JUnit output):
npm run test:ci -w backend

# One-worker diagnostic for shared state, open handles, or resource pressure:
npm run test:serial -w backend
```

The supported test runtime is Node.js 20 (the repository `.nvmrc` and CI image) with Vitest 2.1.9. `test:runtime` enforces both values before CI executes the suite. Do not point these tests at production databases or queues; use disposable development/CI services.

---

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Verification Focus |
|---|----------|--------------------|--------------------|
| 1 | Superadmin Full Catalog Audit | F1, F2, F5, F7, F9, F10, F11 | Admin logs in, reviews metrics header, switches to Table view, filters by `published` and category, verifies total counts match metrics. |
| 2 | Low-Stock & Out-of-Stock Restock Alert | F2, F5, F10, F11 | Admin applies `stock_status=out_of_stock` and `low_stock`, inspects product cards in Grid view, clicks card to verify variant breakdown stock levels. |
| 3 | AI Interest Tagging & Catalog Enrichment Workflow | F4, F6, F8, F11 | Admin searches for untagged products, opens inspection drawer, adds new interest tags in AI Tag Studio, saves changes, and verifies instant persistence via PATCH API. |
| 4 | Arabic Localization & RTL Layout Audit | F9, F10, F11, F12 | Admin switches locale to Arabic (`ar`), verifies RTL document direction (`dir="rtl"`), translated sidebar links, Arabic column headers, TND currency formatting, and drawer alignment. |

---

## Coverage Thresholds & Minimums
- **Identified Features ($N$)**: 12
- **Tier 1 (Feature Coverage)**: $\ge 5 \times 12 = 60$ test cases
- **Tier 2 (Boundary & Corner Cases)**: $\ge 5 \times 12 = 60$ test cases
- **Tier 3 (Cross-Feature Combinations)**: $\ge 12$ pairwise test cases
- **Tier 4 (Real-World Scenarios)**: $\ge \max(5, 12 \div 2) = 6$ scenario test cases
- **Total Suite Minimum**: $\ge 138$ test cases across E2E, Frontend Integration, and Backend Integration suites.
