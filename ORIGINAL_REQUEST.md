# Original User Request

## 2026-08-16T10:10:41Z

Build an impeccable, feature-complete Superadmin Marketplace Products management, catalog inspection, and tagging hub for PandaMarket.

Working directory: c:/tek/pandamarket
Integrity mode: development

## Requirements

### R1. Superadmin Products Backend API
Create and expose a dedicated Superadmin endpoint `GET /api/pd/admin/products` and tag update endpoint `PATCH /api/pd/admin/products/:id/tags` in `backend/src/api/admin.route.ts`:
- Support pagination (`page`, `limit`), sorting (`created_at`, `price`, `title`, `inventory_quantity`, `store_name`), and multi-faceted search (text search on title, description, SKU, tags, interest tags, store name).
- Filtering by `status` (`all`, `published`, `draft`, `pending_approval`, `rejected`, `archived`), `marketplace_category_id`, `store_id`, `product_type` (`physical`, `digital`, `service`), `stock_status` (`all`, `in_stock`, `low_stock`, `out_of_stock`), and `ai_tagged` status.
- Return comprehensive product records including: thumbnail & image gallery, title, slug, price, inventory quantity, product type, status, rejection reason, vendor tags (`tags`), AI-generated interest tags (`interest_tags`), full store object (`id`, `name`, `subdomain`, `custom_domain`, `is_verified`), marketplace category object (`id`, `name`, `slug`), storefront category, variants count, and creation/update timestamps.
- Summary metrics header / metadata (total products count, published count, pending count, out of stock count).
- Strict Superadmin role check, Zod input validation, SQL injection prevention, and proper error handling.

### R2. Superadmin Marketplace Products UI Page
Create the admin page at `frontend/src/app/(admin)/products/page.tsx`:
- **Dual View Modes**: Seamless toggle between a dense, responsive Administrative Data Table and a visual Grid Cards view.
- **Product Details & Metadata Display**:
  - High-res thumbnail preview with fallback icon, image gallery count badge, and hover zoom.
  - Product title, slug, ID copy button, product type badge (Physical / Digital / Service).
  - Truncated rich description with expandable preview.
  - Marketplace category badge with color accent and hierarchical path.
  - Store name with verified badge and quick external link to live store domain (`[store].garbage.team/products/[slug]`).
  - Tagging keywords: distinguished visual chips for vendor tags and Gemini AI interest tags (`interest_tags`).
  - Price formatting in TND (Tunisian Dinar) and stock level indicator (green for in stock, amber for low stock <= 5, red for out of stock).
  - Product lifecycle status pill (`published`, `pending_approval`, `rejected`, `draft`, `archived`).
- **Interactive Inspection Drawer / Modal**:
  - Slide-out drawer to view complete product details: all high-resolution images, variants breakdown table (SKU, title, price, inventory, options), attributes, SEO metadata, and store owner info.
  - AI tags inspection panel with manual tag editing / saving capability (`PATCH /api/pd/admin/products/:id/tags`).
- **Search, Filters & Controls**:
  - Debounced universal search bar.
  - Category selector dropdown, store filter, status tabs, and stock status filter.
  - Sort dropdown (Newest first, Oldest first, Price: Low to High, Price: High to Low, Stock: Low to High).
  - Responsive pagination controls (page size selector, jump to page, item counts).

### R3. Sidebar Navigation & Internationalization
- Integrate the "Marketplace Products" link in `frontend/src/app/(admin)/layout.tsx` under the **CATALOG & CONTENT** section with the `Package` or `ShoppingBag` icon, active state highlighting, and flyout menu support.
- Add multilingual translation strings (`admin.sidebar.marketplaceProducts`, `admin.products.*`) across English, French, and Arabic locale files.

## Acceptance Criteria

### API & Data Verification
- [ ] `GET /api/pd/admin/products` returns HTTP 200 with data array and pagination metadata when accessed with valid Admin session.
- [ ] Non-admin requests receive HTTP 401/403.
- [ ] Filtering by keyword, status, category, and store correctly filters database results.
- [ ] `PATCH /api/pd/admin/products/:id/tags` successfully updates `tags` and `interest_tags` in `pd_product` with audit logging.

### Frontend & UX Verification
- [ ] Page renders flawlessly at `/products` without hydration mismatch, horizontal scrollbar glitches, or layout shifts.
- [ ] Toggle between Table and Grid view smoothly updates the layout while preserving active filters and pagination.
- [ ] Clicking a product row or card opens the inspection drawer displaying all images, variants, and specifications.
- [ ] AI and vendor tags can be viewed and edited in the inspection drawer.
- [ ] Live store link navigates correctly to the public storefront product page.
- [ ] RTL layout functions properly when Arabic locale is selected.
