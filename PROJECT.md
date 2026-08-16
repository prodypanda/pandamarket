# Project: PandaMarket Superadmin Marketplace Products Management & Tagging Hub

## Architecture
- **Backend API Layer**: Express.js router at `backend/src/api/admin.route.ts` protected by `requireAuth` and `requireAdmin` middlewares. Exposes `GET /api/pd/admin/products` and `PATCH /api/pd/admin/products/:id/tags`.
- **Database Layer**: PostgreSQL database containing `pd_product`, `pd_store`, `pd_marketplace_category`, `pd_storefront_category`, `pd_product_image`, `pd_product_variant`, and `pd_audit_log`. Uses parameterized queries, `LEFT JOIN LATERAL` with `json_agg` for complete relational graphs, and GIN indexed tag searches.
- **Frontend UI Layer**: Next.js 15 App Router page at `frontend/src/app/(admin)/products/page.tsx`. Built with Tailwind CSS, Lucide icons, responsive dual-view (Administrative Data Table & Visual Grid Cards), multi-faceted filter & search controls, and slide-out Product Inspection & AI Tagging Drawer.
- **Navigation & I18n Layer**: Admin sidebar in `frontend/src/app/(admin)/layout.tsx` under CATALOG & CONTENT with active route highlighting, flyout menus, and synchronized multilingual strings across English (`en.json`), French (`fr.json`), and Arabic (`ar.json`) with full RTL layout support.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Superadmin Auth & Role Enforcement | Require JWT session with Superadmin/Admin role (HTTP 401/403 for unauthorized). | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Product Catalog Query & Pagination | `GET /api/pd/admin/products` with `page` (default 1) and `limit` (default 20, max 100), total count, and total pages. | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Multi-axis Product Sorting | Sort by `created_at` (newest/oldest), `price` (asc/desc), `title` (asc/desc), `inventory_quantity` (asc/desc), `store_name` (asc/desc). | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Universal Text Search | Parameterized text search matching product title, description, SKU, vendor tags, AI interest tags, and store name. | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Multi-faceted Filtering | Filter by `status`, `marketplace_category_id`, `store_id`, `product_type` (physical/digital/service), `stock_status` (all/in_stock/low_stock/out_of_stock), `ai_tagged`. | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Comprehensive Entity Hydration | Return images array, variants array, full store object, marketplace & storefront category objects, vendor tags (`tags` JSONB), AI interest tags (`interest_tags` text[]). | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Summary Metrics Aggregation | Return platform metrics header: `total_products`, `published_count`, `pending_count`, `draft_count`, `rejected_count`, `archived_count`, `out_of_stock_count`, `low_stock_count`, `ai_tagged_count`. | M1 | ORIGINAL_REQUEST §R1 |
| 8 | Product Tag Management API | `PATCH /api/pd/admin/products/:id/tags` to update vendor `tags` and AI `interest_tags` with Zod validation, normalization, and audit logging. | M1 | ORIGINAL_REQUEST §R1 |
| 9 | Dual View Modes (Table vs Grid) | Seamless switch between high-density Administrative Data Table and visual Grid Cards view, preserving filter/pagination state. | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Product Visual Details & Badges | Thumbnail with fallback icon and hover zoom, gallery counter badge, title, slug/ID copy button, product type badge, category path accent badge, status pills. | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Storefront Identity & Live Links | Store name, verified merchant badge, and 1-click external link to live store domain (`https://${store}.garbage.team/products/${slug}`). | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Price & Stock Level Indicators | TND currency formatting (3 decimal places) and color-coded stock level badges (green for in stock, amber for low stock <= 5, red for out of stock). | M2 | ORIGINAL_REQUEST §R2 |
| 13 | Interactive Product Inspection Drawer | Slide-out drawer displaying 6 tabbed panels: Overview & Images, Variants Breakdown Table, Attributes & Specs, SEO & Taxonomy, Store Info, and AI Tag Studio. | M2 | ORIGINAL_REQUEST §R2 |
| 14 | In-Drawer AI & Vendor Tag Studio | In-drawer tag manager allowing administrators to view, add, remove, and persist vendor tags and AI interest tags via PATCH API. | M2 | ORIGINAL_REQUEST §R2 |
| 15 | Universal Search & Filter Bar | Debounced text search, category dropdown, store dropdown, status tabs, stock filter, product type filter, sort selector, and pagination controls. | M2 | ORIGINAL_REQUEST §R2 |
| 16 | Admin Sidebar Navigation Link | Register "Marketplace Products" (`/products`) under CATALOG & CONTENT in `frontend/src/app/(admin)/layout.tsx` with `Package` icon, active highlight, and flyout support. | M2 | ORIGINAL_REQUEST §R3 |
| 17 | Multilingual Localization (EN, FR, AR) | Complete translation keys for `admin.sidebar.marketplaceProducts` and `admin.products.*` across `en.json`, `fr.json`, and `ar.json` with RTL layout support. | M2 | ORIGINAL_REQUEST §R3 |
| 18 | Automated Test Suite (Unit/Integration) | Backend Vitest tests for admin routes and Frontend Vitest tests for products page components and tag editing interactions. | M3 | ORIGINAL_REQUEST §Acceptance Criteria |
| 19 | E2E & Forensic Verification | Playwright E2E test suite + Forensic Integrity Audit verifying zero cheating, real database interaction, and correct functionality. | M3 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Superadmin Products Backend API | Implement `GET /api/pd/admin/products` and `PATCH /api/pd/admin/products/:id/tags` in `backend/src/api/admin.route.ts` with Zod validation, multi-axis search/filter/sort, metrics, and audit logging. | none | IN_PROGRESS |
| 2 | M2: Admin Products UI, Navigation & I18n | Implement `frontend/src/app/(admin)/products/page.tsx`, dual Table/Grid views, inspection drawer, tag studio, sidebar navigation in `layout.tsx`, and EN/FR/AR translations. | M1 | PLANNED |
| 3 | M3: E2E Verification & Adversarial Hardening | Comprehensive automated test execution (Vitest backend, Vitest frontend, Playwright E2E), multi-tier validation, and Forensic Integrity Audit. | M1, M2 | PLANNED |

## Interface Contracts
### Backend ↔ Frontend API Contract
#### `GET /api/pd/admin/products`
- **Query Parameters**:
  - `page`: integer (min: 1, default: 1)
  - `limit`: integer (min: 1, max: 100, default: 20)
  - `search`: string (optional, searches title, description, SKU, tags, interest_tags, store name)
  - `status`: enum (`all`, `published`, `draft`, `pending_approval`, `rejected`, `archived`)
  - `marketplace_category_id`: string UUID (optional)
  - `store_id`: string UUID (optional)
  - `product_type`: enum (`all`, `physical`, `digital`, `service`)
  - `stock_status`: enum (`all`, `in_stock`, `low_stock`, `out_of_stock`)
  - `ai_tagged`: enum (`all`, `tagged`, `untagged`)
  - `sort_by`: enum (`created_at`, `price`, `title`, `inventory_quantity`, `store_name`)
  - `sort_order`: enum (`asc`, `desc`)
- **Response Format** (`HTTP 200 OK`):
  ```typescript
  {
    success: true,
    data: AdminProductRecord[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      total_pages: number
    },
    metrics: {
      total_products: number,
      published_count: number,
      pending_count: number,
      draft_count: number,
      rejected_count: number,
      archived_count: number,
      out_of_stock_count: number,
      low_stock_count: number,
      ai_tagged_count: number
    }
  }
  ```

#### `PATCH /api/pd/admin/products/:id/tags`
- **Path Parameter**: `id` (product UUID)
- **Request Body**:
  ```typescript
  {
    tags?: string[],
    interest_tags?: string[]
  }
  ```
- **Response Format** (`HTTP 200 OK`):
  ```typescript
  {
    success: true,
    data: {
      id: string,
      tags: string[],
      interest_tags: string[],
      interest_tags_synced_at: string
    },
    message: string
  }
  ```

## Code Layout
- Backend routes: `backend/src/api/admin.route.ts`
- Backend tests: `backend/src/__tests__/admin-products.route.test.ts`
- Frontend page: `frontend/src/app/(admin)/products/page.tsx`
- Frontend layout & sidebar: `frontend/src/app/(admin)/layout.tsx`
- Frontend translations: `frontend/src/i18n/messages/en.json`, `fr.json`, `ar.json`
- Frontend tests: `frontend/src/__tests__/admin-products-page.test.tsx`
- E2E tests: `frontend/e2e/admin-marketplace-products.spec.ts`
