# ULTRA URGENT: Page Builder Implementation Plan

## Priority Notice

This plan is **ULTRA URGENT**.

All future agents working in this repository should prioritize completing this Page Builder plan before moving to unrelated feature work, unless the user explicitly overrides this priority.

## Current Status

The Page Builder has an existing foundation:

- Backend page CRUD, publish/unpublish, duplicate, homepage override, tenant isolation, plan gating, and sanitization.
- Seller dashboard page list and page creation flow.
- GrapesJS editor integration.
- Prebuilt templates and static blocks.
- Public rendering for custom pages and homepage override.

However, the builder is not production-complete. Large areas are still missing, especially draft/publish workflow, preview routes, version history, deeper media controls, security hardening, and analytics.

## Progress Status

- Phase 1 foundation stabilization has been started and the first pass is complete:
  - GrapesJS CSS is loaded locally through the frontend app layout.
  - Editor save/publish errors are shown inline instead of via browser alerts.
  - Unsaved-change protection is active for tab/browser navigation and editor back navigation.
  - Autosave runs after changes when the editor is ready.
  - Desktop/tablet/mobile device controls are visible in the toolbar.

- Phase 2 real store-aware blocks has been started and the first dynamic slice is complete:
  - Added safe dynamic placeholders for store hero, product grid, featured products, category showcase, and store contact blocks in the editor.
  - Added `frontend/src/components/page-builder/dynamic-blocks.ts` to render placeholders using real store/product/contact data.
  - Wired `SafePageRenderer` to resolve dynamic blocks before sanitizing and rendering.
  - Wired homepage override and custom page rendering to pass store identity, branding, contact, and published product context.
  - Added seller-facing dynamic block controls in the editor for title, subtitle, display limit, category filter, and manual product selection.
  - Manual product selections are persisted in `data-pd-product-ids` and honored by the public dynamic renderer.
  - Added live in-editor dynamic previews powered by the same dynamic renderer used on public storefront pages.
  - Switched builder option loading to store-scoped product/store/category APIs for safer seller previews.
  - Added manual category selection for category showcase blocks, persisted in `data-pd-category-slugs` and honored by the renderer.
  - Added dynamic shipping policy, payment policy, and combined store policies blocks using non-secret store context.
  - Homepage overrides and custom Page Builder pages now pass shipping mode and public policy text into the dynamic renderer.
  - Added seller settings inputs for public shipping, returns, and payment policy text used by Page Builder policy blocks.
  - Added a focused Vitest smoke test for shipping, payment, and combined policy dynamic block rendering.
  - Attempted local browser QA; frontend started on `localhost:3000`, but backend startup was blocked because PostgreSQL was not running and Docker Desktop was unavailable.
  - Completed local API/browser-route QA after Docker services were started: vendor login works, seller settings and Page Builder routes load, policy settings persist, published custom Page Builder pages render policy dynamic blocks, and temporary QA pages are deleted afterward.
  - Fixed custom Page Builder page routing on central marketplace hosts by removing the redirect from `/store/[storeHost]/pages/[slug]` back to `/store/[storeHost]`.
  - Hardened public Page Builder rendering so dynamic blocks are present in the initial rendered markup, with a lightweight initial sanitizer plus the existing DOMPurify hydration pass.
  - Fixed a final visual QA finding where a combined store policies block could be nested inside another dynamic section by GrapesJS and swallowed by the old regex renderer; the dynamic renderer now parses dynamic block nodes and preserves nested policy blocks in storefront output.
  - Fixed Page Builder editor QA findings: GrapesJS panel mounts now use React refs with cleanup/cancellation protection to prevent duplicate block/style panels after dev remounts, and template-created pages now load saved template HTML/CSS into the editor when `builder_data` is initially empty.
  - Fixed preset-template storefront rendering mismatch: public Page Builder CSS is scoped to `.gjs-page-content`, including nested responsive rules, and display-only template forms are neutralized into inert markup instead of being deleted.
  - Fixed the actual preset-template style-loss root cause found on `/store/atelier-medina/pages/merci`: loading template HTML with `setComponents()` generated component CSS from inline styles, but the later `setStyle(template.css)` call replaced that generated CSS with only shared responsive CSS. Template fallback loading now merges component CSS with template CSS, and save exports HTML/CSS from the GrapesJS wrapper component.
  - Browser QA confirmed preset-template storefront rendering now works correctly after the component-CSS merge fix.

- Phase 3 asset manager/media library has been started:
  - GrapesJS Asset Manager now preloads store-owned media from `/api/pd/stores/me/media`.
  - The editor toolbar includes a **Médias** button to open/refresh the GrapesJS media library.
  - Asset uploads inside GrapesJS use the existing `/api/pd/files/presign` flow with `purpose: 'product_image'`, upload directly to S3/MinIO, normalize public URLs, and add uploaded images back into the Asset Manager.
  - Browser QA confirmed the first media-library slice is working.
  - Store Hero blocks now support a `data-pd-image-url` background image selected from the GrapesJS media library or entered manually; sellers can also set saved `data-pd-image-position` and `data-pd-image-fit` controls for focal position and crop/contain behavior, including visible horizontal/vertical focus sliders, while public rendering normalizes local MinIO URLs and rejects unsafe URL schemes.
  - Browser QA confirmed the Store Hero media controls, focal sliders, recadrage control, editor canvas preview, save/publish flow, and storefront rendering are working.
  - Focused validation passed for PageBuilderEditor/dynamic-blocks ESLint, frontend TypeScript, dynamic block tests, and diff whitespace checks.

- Phase 4 draft/preview/publish, SEO, and navigation has been started:
  - Added persisted Page Builder page metadata fields for `seo_title`, `seo_description`, `og_image`, `noindex`, `show_in_navigation`, `show_in_footer`, and `sort_order`.
  - Added seller-facing Page Builder right-panel controls for SEO title/description, social sharing image selection from the media library, noindex, navigation/footer visibility, and sort order.
  - Public custom Page Builder pages and homepage overrides now use saved metadata for SEO/Open Graph/Twitter output and render eligible published custom pages in the Page Builder chrome navigation/footer.
  - Focused backend service regression coverage validates SEO/navigation persistence and unsafe OG image URL sanitization.
  - Draft-vs-published storage separation is implemented: editor/dashboard reads draft content, normal save/autosave writes `draft_*` fields, public storefronts continue reading published fields, and publish copies draft content/metadata into public fields.
  - Draft preview route/token support is implemented with short-lived signed preview tokens, an editor **Aperçu** action, draft rendering for custom pages/homepage overrides, no-store backend fetches, and noindex preview metadata.
  - Slug conflict UX is improved with inline duplicate detection, selectable slug suggestions, and structured backend conflict details for Page Builder page create/update.
  - Version history/rollback foundation is implemented: publishing stores retained snapshots, sellers can list versions from the editor, and restoring a version writes the snapshot back into the saved draft for preview before republishing.
  - Local end-to-end QA passed for publish snapshot creation, version listing, restore-to-draft, draft preview after restore, live-page isolation before republish, and republish of the restored draft.
  - Added `029_audit_log_action_text.sql` after QA exposed long Page Builder restore URLs overflowing `pd_audit_log.action`.

The next required work is **Phase 4 — manual visual browser click-through of the editor history panel, then move to Phase 5 template/section library work**.

## Mandatory Working Rule

Before starting any unrelated next step, complete the next incomplete phase in this plan.

When continuing work, always state the immediate next step first.

---

## Phase 1 — Stabilize the Editor Foundation

### Goal

Make the existing builder reliable enough for sellers to use without losing work.

### Tasks

- Bundle GrapesJS CSS locally instead of loading it from `unpkg.com`.
- Replace editor `alert()` calls with proper inline/toast-style error and success feedback.
- Add unsaved-change protection before browser/tab navigation.
- Add autosave behavior for changed drafts.
- Add clear save state indicators: unsaved, saving, saved, autosaved, failed.
- Add visible desktop/tablet/mobile device preview controls.
- Improve editor top toolbar usability.

### Acceptance Criteria

- Editor loads without external CDN CSS.
- Seller is warned before leaving with unsaved changes.
- Manual save and publish errors are shown inside the UI.
- Autosave runs only when content changed and editor is ready.
- Device preview buttons visibly switch the GrapesJS canvas device.

---

## Phase 2 — Real Store-Aware Blocks

### Goal

Replace static placeholders with blocks that can render real store data.

### Tasks

- Add product grid block backed by seller products.
- Add featured products block with selected products.
- Add category/collection showcase block.
- Add hero block using store logo, name, colors, tagline, CTA, and optional background image.
- Add contact block using store settings.
- Add policy blocks for shipping, returns, payment methods, and COD.
- Define safe block placeholders/data attributes for public rendering.

### Acceptance Criteria

- Product/category/contact blocks render real current store data.
- Blocks work safely on homepage and custom pages.
- No seller-controlled JavaScript is required.

---

## Phase 3 — Asset Manager / Media Library

### Goal

Let sellers upload, browse, and reuse images inside the builder.

### Tasks

- Add store-scoped image upload API or integrate with existing file presign flow.
- Validate file type, size, dimensions, and ownership.
- Add media library UI inside the editor.
- Integrate media library with GrapesJS Asset Manager.
- Support hero/background images and image blocks.

### Acceptance Criteria

- Seller can upload and insert images from the editor.
- Media is store-scoped and cannot leak between sellers.
- Invalid files are rejected safely.

### Progress

- The editor integrates the existing store-scoped media library endpoint (`/api/pd/stores/me/media`) with GrapesJS Asset Manager.
- The editor integrates image uploads with the existing presigned upload endpoint (`/api/pd/files/presign`) using `purpose: 'product_image'`.
- A toolbar **Médias** action opens the GrapesJS Asset Manager and refreshes store-owned images.
- Uploaded images are validated client-side as images under 10 MB, uploaded directly to S3/MinIO, normalized for local/LAN public URL compatibility, and immediately added to the editor asset list.
- Store Hero dynamic blocks expose an **Image hero** control in the right panel, can select an image from the media library, adjust focal position via presets or horizontal/vertical sliders, choose recadrage/contain behavior, and render it publicly as a safe gradient-overlaid background.

---

## Phase 4 — Draft, Preview, Publish, SEO, and Navigation

### Goal

Make custom pages safe to edit and useful in production storefronts.

### Tasks

- Separate draft content from published content.
- Add preview draft route/token for unpublished changes.
- Add `seo_title`, `seo_description`, `og_image`, and optional `noindex`.
- Add navigation/footer visibility controls.
- Improve slug management and conflict messages.
- Add version history and rollback for published pages.

### Acceptance Criteria

- Sellers can preview drafts before publishing.
- Editing published pages does not change live pages until publish.
- Custom pages can appear in storefront navigation/footer.
- SEO metadata is available for public pages.

### Progress

- SEO metadata and navigation/footer visibility first slice is implemented across migration, API validation, service sanitization/persistence, editor controls, seller page list loading, public custom page metadata, and homepage override metadata.
- Public Page Builder chrome now renders links for published pages marked for navigation/footer, excluding the current rendered page/homepage override.
- Draft-vs-published storage separation is implemented with `draft_*` columns and `published_at`; normal saves no longer mutate public HTML/CSS/metadata, while publish copies draft content into the live fields.
- Backend regression tests cover draft-only saves and publish copy behavior.
- Draft preview route/token support is implemented: authenticated sellers can generate a short-lived preview token, open draft custom pages/homepage overrides from the editor, and public storefront routes render draft HTML/CSS only when the token matches the requested store/page/slug.
- Backend regression tests cover preview token creation, draft HTML/CSS reads, and slug mismatch rejection.
- Slug conflict UX is improved: the seller create-page modal detects duplicate slugs before submit, blocks invalid slugs inline, offers available alternatives, and backend conflicts now include `{ field: 'slug', slug, resource: 'page_builder_page' }` details for create/update race conditions.
- Version history and rollback foundation is implemented with migration `028_page_builder_versions.sql`, publish-time snapshots, retained per-page version listing/restoration APIs, an editor history panel, and restore-to-draft behavior that does not mutate the live page until republish.
- Local end-to-end QA passed against the running dev server using seller `vendor.pro@test.tn`: publish creates versions, version listing returns retained snapshots, restore writes only to draft, preview renders restored draft content, live public content stays unchanged until republish, and republish makes the restored version live.
- QA also exposed long Page Builder restore URLs overflowing `pd_audit_log.action`; migration `029_audit_log_action_text.sql` widens that column to `TEXT`, was applied locally, and an isolated restore request no longer logs the warning.
- Manual visual browser click-through of the editor history panel passed after fixing the GrapesJS invalid `builder_data` fallback; Phase 4 is complete locally and work has moved to Phase 5.

---

## Phase 5 — Template and Section Library Upgrade

### Goal

Help sellers build professional pages quickly.

### Tasks

- Improve templates by seller type/category: fashion, electronics, food, services, digital goods, wholesale.
- Make templates brand-aware using store colors/logo.
- Add reusable section library for hero, products, FAQ, testimonials, policies, contact, banner, and collections.
- Add large preview before template selection.
- Add one-click homepage templates.

### Acceptance Criteria

- Seller can create a professional homepage quickly.
- Templates match the seller's branding.
- Templates are mobile-friendly.

### Progress

- Phase 5 first slice is implemented locally: templates now carry seller-type/section/homepage metadata, the picker supports seller-type filtering, and template previews/selections apply store branding colors, name, and logo when available.
- Added a one-click dynamic homepage template composed of connected Page Builder sections for hero, featured products, collections, policies, and contact.
- Added an in-editor reusable section library for one-click insertion of hero, products, collections, banner, FAQ, testimonials, policies, and contact sections, with quick filtering and draft-change feedback.

---

## Phase 6 — Security and Rendering Hardening

### Goal

Keep public storefront rendering safe and performant.

### Tasks

- Scope builder CSS so seller CSS cannot break storefront header/footer.
- Review and harden HTML/CSS sanitization.
- Keep custom JavaScript blocked unless a controlled widget system is implemented.
- Ensure CSP compatibility.
- Add caching/invalidation strategy for published pages.

### Acceptance Criteria

- No CSS leaks into global storefront chrome.
- XSS vectors are blocked on save and render.
- Public pages remain fast.

### Progress

- Public Page Builder CSS is scoped to `.gjs-page-content` in `SafePageRenderer`, including nested `@media`, `@supports`, and `@container` rules.
- Stored/rendered template forms are neutralized to inert `<div data-pd-form-placeholder="true">` markup so contact/newsletter sections remain visible without enabling seller-controlled form submission.
- Template fallback loading preserves component CSS generated from inline template styles instead of overwriting it with shared responsive CSS.
- Editor saves normalize full-document `<body>` wrappers and export HTML/CSS from the GrapesJS wrapper component.
- Backend and frontend sanitization continue to block scripts, event handlers, dangerous protocols, iframes, objects, embeds, applets, and unsafe CSS constructs.
- Focused validation passed for storefront rendering tests, frontend ESLint/TypeScript, backend ESLint/TypeScript, backend Page Builder service tests, and diff whitespace checks.
- Backend save sanitization and frontend SSR/hydration rendering now share stronger URL/CSS hardening for `srcset`, `poster`/`formaction`/`xlink:href`, inline style attributes, quoted CSS `url()` values, `vbscript:`, and non-image `data:` CSS URLs.
- Added regression coverage for backend stored HTML/CSS sanitization and initial storefront renderer markup hardening.
- Published Page Builder homepage/page/list fetches now use shared short ISR tags, and seller publish/unpublish/homepage/delete actions trigger an authenticated Next revalidation endpoint to invalidate affected store/page/homepage tags immediately.

---

## Phase 7 — Visual Interface Polish and Drag-and-Drop Sections

### Goal

Make the Page Builder interface feel **classic, elegant, clear, and professional**, with a calm seller-friendly editing experience. Quick section elements must support real drag-and-drop into the canvas, not only click-to-add.

### Tasks

- Audit the current Page Builder dashboard/editor visual hierarchy, spacing, typography, colors, panel density, empty states, loading states, and feedback states.
- Refine the editor UI toward a classic/elegant/clear style: neutral surfaces, consistent controls, readable panels, calm accents, and less visual clutter.
- Improve the quick sections/elements library so section cards are draggable sources with clear drag affordances, hover/focus states, and drop feedback in the canvas.
- Make drag-and-drop the primary interaction for quick section insertion; keep click-to-add only as a secondary convenience if it does not create UX confusion.
- Validate the improved interface across common seller screen sizes without breaking existing save, preview, publish, template, or GrapesJS serialization behavior.

### Acceptance Criteria

- The Page Builder interface feels clean, classic, elegant, and easy to understand.
- Sellers can drag quick sections/elements from the sidebar into the canvas.
- Drag state, valid drop targets, and placement feedback are visible and reliable.
- Existing click-to-add behavior is either preserved as a secondary shortcut or safely replaced without regressions.
- Saving, previewing, publishing, and public rendering continue to work after the visual/interaction polish.

### Progress

- Initial quick-section drag-and-drop slice implemented in `PageBuilderEditor`: section cards are draggable, click-to-add remains available, and the canvas shows a clear drop zone while dragging before inserting the dropped section into the draft.
- Broader editor chrome polish started: the top toolbar, feedback bar, quick section panel, filter chips, canvas shell, right settings/history/dynamic panels, and style/layer section headings now use a warmer classic/elegant light palette with calmer borders, clearer hierarchy, and more readable controls.
- Dashboard and template selection polish continued: the Page Builder dashboard loading/access/list/empty/card/create-modal surfaces and the TemplatePicker grid/preview modals now share the same classic warm palette, rounded surfaces, calm accents, and clearer hierarchy as the editor.
- Remaining generated editor UI polish continued: GrapesJS-created block/style/layer/trait/asset modal controls now receive scoped warm-theme overrides, and the dashboard created-page cards no longer reserve a large blank preview area; they use a compact summary band with page status instead.

---

## Phase 8 — Analytics and Conversion Tools

### Goal

Help sellers understand page performance.

### Tasks

- Track custom page views.
- Track CTA clicks.
- Track product block clicks.
- Add page performance stats in the dashboard list.

### Acceptance Criteria

- Sellers can see page views and basic engagement.
- CTA and product clicks are measurable.

### Progress

- Phase 8 first analytics slice is implemented locally: added `pd_store_page_analytics_event` migration for Page Builder page views, CTA clicks, and product clicks.
- Added public analytics collection endpoint `/api/pd/analytics/page-builder/event`, validating store/page ownership and only recording events for published pages.
- Public custom Page Builder pages and homepage overrides now pass analytics context into `SafePageRenderer`; draft previews are excluded from tracking.
- `SafePageRenderer` records a one-time page view per rendered page and delegates link clicks into CTA/product click events.
- Dynamic product grid and hero CTA links now emit explicit Page Builder analytics metadata for reliable product/CTA attribution.
- Seller Page Builder dashboard page cards show 30-day views and click engagement chips for published pages.
- Local DB migration and runtime smoke verification passed: `031_page_builder_analytics.sql` was applied/recorded, the public analytics endpoint accepted a test page view for a published page, the 30-day aggregate incremented, and the smoke-test event was cleaned up.

---

## Phase 9 — Tests and QA

### Tasks

- Backend tests for CRUD, plan gating, tenant isolation, drafts, publish, navigation, and media permissions.
- Frontend tests for create/save/publish/preview/template flows.
- Security tests for sanitizer behavior.
- Manual QA for full seller flow.

### Acceptance Criteria

- Existing page builder tests pass.
- New tests cover critical paths.
- Seller can create, edit, preview, publish, set homepage, and view public page successfully.

### Progress

- Added focused backend route coverage for Page Builder analytics events in `backend/src/__tests__/analytics.route.test.ts`, covering successful published-page tracking, `tracked: false` for unpublished/wrong-store pages, and invalid event validation.
- Extended backend analytics route coverage to verify visitor identifiers are hashed before persistence and optional product/target/page fields are normalized before insertion.
- Focused analytics test validation passed locally, along with backend route lint, backend TypeScript, and diff whitespace checks.
- Added frontend regression coverage for seller dashboard analytics labels in `frontend/src/__tests__/page-builder-dashboard-stats.test.ts`, backed by the reusable `page-builder-dashboard-stats` helper used by the Page Builder dashboard cards.
- Focused frontend validation passed for the new dashboard stats helper/test and the Page Builder dashboard page, including Vitest, ESLint, frontend TypeScript, and diff whitespace checks.
- Extracted reusable public renderer analytics helpers into `frontend/src/lib/page-builder-analytics.ts` and wired `SafePageRenderer` to use them for payload creation and click classification.
- Added focused frontend coverage for Page Builder public renderer analytics logic in `frontend/src/__tests__/page-builder-renderer-analytics.test.tsx`, covering page-view payloads, product/CTA classification, and analytics text normalization.
- Added backend service regression coverage in `backend/src/__tests__/page-builder.service.test.ts` to protect the `listPages()` analytics aggregate query feeding seller dashboard cards.
- Extended dynamic block regression coverage in `frontend/src/__tests__/dynamic-blocks.test.ts` to protect product-grid product click markers and store hero/product-grid CTA analytics markers.
- Added renderer sanitization regression coverage to ensure analytics `data-*` attributes survive public rendering while unsafe handlers/scripts are still stripped.
- Consolidated analytics validation passed locally: backend analytics/Page Builder suites passed with 45 tests, frontend Page Builder analytics suites passed with 18 tests, backend/frontend TypeScript passed, focused ESLint passed, and `git diff --check` passed across touched analytics files.
- Programmatic local seller-flow QA passed with the seeded Pro vendor: CSRF/login, dashboard page list, temporary custom page creation, draft save/fetch, draft preview, publish, public page fetch, `page_view` and `cta_click` analytics recording, dashboard stats update, unpublish, public 404 after unpublish, and cleanup all completed successfully.
- Temporary QA cleanup was verified: no `qa-page-builder-*` pages and no matching QA analytics events remained in the local database.
- Added focused Playwright browser coverage in `frontend/e2e/page-builder-analytics.spec.ts` for a published product-grid Page Builder page, covering real browser public page rendering, `page_view` tracking, product link `product_click` tracking, product navigation, seller dashboard aggregate refresh, and API cleanup.
- Browser e2e validation passed locally with `npx playwright test e2e/page-builder-analytics.spec.ts --project=chromium`.
- Added focused Playwright browser coverage for the Page Builder editor quick-section flow, covering authenticated seller store selection, editor routing, quick-section click insertion, quick-section drag-and-drop onto the canvas, draft save, persisted block HTML verification, and API cleanup.
- Browser e2e validation passed locally with `npx playwright test e2e/page-builder-analytics.spec.ts --project=chromium` using 2 Chromium tests.
- Homepage override responsive rendering remains manual/browser-host QA for now: `/store/atelier-medina` on the central marketplace host intentionally renders the marketplace seller page before Page Builder homepage overrides are checked, so automated homepage override coverage should use a dedicated storefront-owned host/subdomain route if added later.

### Manual QA Checklist

- Log in as a seller with Page Builder access.
- Create a new custom page from a blank page and from a template.
- Edit content, save as draft, refresh, and confirm draft content persists.
- Open draft preview and confirm preview does not record analytics events.
- Publish the page and verify the public custom page renders correctly.
- Set a Page Builder page as the storefront homepage and verify the public homepage override renders correctly.
- Visit the published page in a browser and confirm a `page_view` event is recorded.
- Click a product-grid product link and confirm a `product_click` event is recorded.
- Click store hero/product-grid CTA links and confirm `cta_click` events are recorded.
- Reopen the seller Page Builder dashboard and confirm 30-day views/clicks update after analytics events exist.
- Unpublish or delete a Page Builder page and confirm public rendering/cache behavior remains correct.

### Remaining Browser-Only QA

- Manual browser QA should now focus on visual behavior that automated Playwright assertions do not fully prove.
- Editor visual controls:
  - Log in as `vendor.pro@test.tn`, select `Atelier Médina`, and open `/hub/dashboard/page-builder`.
  - Open a draft page in the editor and confirm the GrapesJS canvas, left panels, top toolbar, settings panels, and save/preview controls render without overlap or clipping.
  - Click a quick section and drag a quick section onto the canvas, confirming the visual drop state, toast feedback, and inserted section layout look correct.
  - Select/edit text, images, buttons, and dynamic blocks in the canvas and confirm visible controls remain usable.
- Responsive visual rendering:
  - Check dashboard, editor, preview, public custom page, and storefront homepage override at desktop, tablet, and mobile widths.
  - Confirm Page Builder sections preserve spacing, images, CTA buttons, product grids, and footer/header chrome across breakpoints.
- Homepage override visuals:
  - Set a Page Builder page as the storefront homepage, visit the real storefront-owned host/subdomain for `Atelier Médina`, verify the custom homepage renders correctly, then unset or restore the previous homepage state.
- Cleanup:
  - Delete or unpublish any manual QA pages and confirm no temporary test page remains visible in seller navigation or the public storefront.

---

## Immediate Next Step

Continue **Phase 9 — Manual Browser QA**: execute the remaining visual checklist for GrapesJS controls, responsive rendering, homepage override visuals, and cleanup.
