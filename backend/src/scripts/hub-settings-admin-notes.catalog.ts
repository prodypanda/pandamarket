/**
 * Source-backed Admin Notes catalog for the Hub homepage and Superadmin
 * settings audit.
 *
 * Keep this file credential-free. It is safe to review and commit separately
 * from the production synchronization command.
 */

export type NotePriority = 'low' | 'normal' | 'high' | 'urgent';
export type NoteClassification =
  | 'Verified bug'
  | 'Verified reliability risk'
  | 'Enhancement'
  | 'Improvement'
  | 'New functionality'
  | 'Verified / no defect';

export interface FolderDefinition {
  name: string;
  color: string;
  sortOrder: number;
}

export interface AuditNoteDefinition {
  externalId: string;
  folder: string;
  sortOrder: number;
  title: string;
  priority: NotePriority;
  classification: NoteClassification;
  scope: string;
  finding: string;
  correction?: string;
  evidence: string[];
  reproduce: string[];
  rootCause: string[];
  impact: string[];
  howTo: string[];
  edgeCases?: string[];
  quality?: string[];
  tests?: string[];
  rollout?: string[];
  acceptance: string[];
  related?: string[];
  tags: string[];
  verifiedComplete?: boolean;
}

export const CATALOG_VERSION = 'hub-settings-audit-2026-08-13-v3';
export const AUDIT_DATE = '2026-08-13';

export const FOLDERS = {
  hub: '🏠 Hub Homepage — Fixes & Improvements',
  settings: '⚙️ Admin Settings — Fixes & Improvements',
  contract: 'Hub Configuration Contract & Layout Parity',
  reliability: 'Hub Reliability & Observability',
  localization: 'Localization & Accessibility',
  security: 'Security & Operations',
  governance: 'Admin Notes Governance',
  quality: 'Quality Assurance & Regression Coverage',
  ideas: 'Hub Product Ideas & Growth',
} as const;

export const folderDefinitions: FolderDefinition[] = [
  { name: FOLDERS.hub, color: '#16C784', sortOrder: 10 },
  { name: FOLDERS.settings, color: '#B91C1C', sortOrder: 20 },
  { name: FOLDERS.contract, color: '#7C3AED', sortOrder: 30 },
  { name: FOLDERS.reliability, color: '#0F766E', sortOrder: 40 },
  { name: FOLDERS.localization, color: '#2563EB', sortOrder: 50 },
  { name: FOLDERS.security, color: '#DC2626', sortOrder: 60 },
  { name: FOLDERS.quality, color: '#CA8A04', sortOrder: 70 },
  { name: FOLDERS.ideas, color: '#DB2777', sortOrder: 80 },
  { name: FOLDERS.governance, color: '#475569', sortOrder: 90 },
];

function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function numbered(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function defaultEdgeCases(note: AuditNoteDefinition): string[] {
  return [
    `Verify ${note.externalId} with empty, partial, malformed, and unexpectedly large API/configuration data; the UI must not silently convert a failure into a valid-looking state.`,
    'Verify slow networks, aborted requests, repeated clicks, browser back/forward navigation, multiple open admin tabs, and a save that finishes after the operator changes tabs.',
    'Verify French, English, and Arabic including RTL direction, 200% text zoom, keyboard-only navigation, and narrow 320 px through wide desktop viewports.',
    'Do not expose secrets, internal identifiers, raw stack traces, or sensitive request bodies in UI messages, analytics, screenshots, or logs.',
  ];
}

function defaultQuality(note: AuditNoteDefinition): string[] {
  return [
    `Accessibility: every control introduced or changed for ${note.externalId} needs a programmatic name, visible focus, correct role/state, predictable keyboard order, and a non-color-only status indicator.`,
    'Localization: move new user-facing copy into the locale dictionaries and verify interpolation, pluralization, long French text, and Arabic RTL alignment.',
    'Responsive behavior: preserve 44×44 px touch targets, avoid horizontal overflow, and ensure sticky/floating UI does not cover the active control or validation message.',
    'Performance: avoid duplicate requests, unbounded caches/listeners/timers, layout-shifting placeholders, and unnecessary hydration work; measure the affected request/render path before and after.',
    'Observability: record a stable event or structured log for success, failure, retry, and fallback paths without logging credentials or complete configuration payloads.',
  ];
}

function defaultTests(note: AuditNoteDefinition): string[] {
  return [
    `Add focused unit tests for the normalization/state logic introduced by ${note.externalId}, including the failure and boundary cases described above.`,
    'Add an API or component integration test proving the producer and consumer agree on field names, totals, defaults, validation, and error semantics.',
    'Add a Playwright regression that exercises the user-visible path at desktop and mobile sizes, plus keyboard assertions where an interactive control is involved.',
    'Run targeted TypeScript and ESLint checks for every touched frontend/backend area and attach the exact commands/results to the note before completion.',
  ];
}

function defaultRollout(note: AuditNoteDefinition): string[] {
  return [
    `Ship ${note.externalId} as a small reversible change. If behavior or data contracts change, keep compatibility with currently stored values during the rollout.`,
    'For high/urgent changes, validate in staging with production-like data, monitor errors and key business events after release, and define the metric that triggers rollback.',
    'Rollback must restore the previous code/configuration path without deleting Admin Notes, user content, audit history, or saved marketplace settings.',
  ];
}

export function buildChecklist(note: AuditNoteDefinition): string[] {
  const firstEvidence = note.evidence[0] || note.finding;
  const firstReproduction = note.reproduce[0] || note.finding;
  const implementation = note.howTo.slice(0, 5);
  const implementationItems = implementation.map(
    (step, index) => `${String(index + 3).padStart(2, '0')} — Implementation: ${step}`,
  );
  const checklist = [
    `01 — Baseline: reproduce and capture the current behavior — ${firstReproduction}`,
    `02 — Contract: confirm the finding against current source/runtime evidence — ${firstEvidence}`,
    ...implementationItems,
    `08 — Edge cases: cover failure, empty, slow-network, concurrency, and malformed-data cases described in the note.`,
    `09 — Accessibility/i18n/responsive: verify keyboard, screen reader names/states, FR/EN/AR + RTL, 200% zoom, mobile, tablet, and desktop.`,
    `10 — Security/performance/observability: confirm no sensitive-data leakage, no duplicate/unbounded work, and add actionable failure telemetry.`,
    `11 — Unit tests: add focused tests for the changed state, parser, resolver, or component behavior.`,
    `12 — Integration tests: verify the frontend, API, database/configuration contract, and cache/revalidation behavior together.`,
    `13 — E2E regression: add or extend Playwright coverage for the complete operator/buyer flow and its visible success/error states.`,
    `14 — Release proof: run targeted typecheck/lint/tests, deploy reversibly, verify every acceptance criterion, and attach evidence before marking ${note.externalId} complete.`,
  ];
  return checklist.slice(0, 14);
}

export function buildVerifiedChecklist(note: AuditNoteDefinition): string[] {
  return [
    `01 — Source verification complete: re-read the current producer, consumer, and data-flow code cited in ${note.externalId}; the earlier suspected defect is not present.`,
    `02 — Runtime verification complete: reproduce the real user flow in the affected layout/role/locale and confirm the verified behavior matches this note's acceptance criteria.`,
    `03 — Regression guard complete: retain or add the focused automated check named in this note so a future refactor cannot silently invalidate the conclusion.`,
    `04 — Audit conclusion recorded: keep ${note.externalId} completed as evidence, and reopen it only with a current source location plus a repeatable failing scenario.`,
  ];
}

export function renderNoteContent(note: AuditNoteDefinition): string {
  const state = note.verifiedComplete
    ? 'Verified complete / no active defect. Preserve as audit evidence unless code changes invalidate the conclusion.'
    : 'Open — implementation and verification are still required.';
  const correction = note.correction
    ? `\n## Correction to earlier wording\n\n${note.correction}\n`
    : '';
  const related = note.related?.length
    ? `\n## Dependencies and related notes\n\n${bullets(note.related)}\n`
    : '';

  return `# ${note.externalId} — ${note.title}

> **Audit date:** ${AUDIT_DATE}  
> **Catalog version:** ${CATALOG_VERSION}  
> **Status:** ${state}  
> **Classification:** ${note.classification}  
> **Priority:** ${note.priority}  
> **Scope:** ${note.scope}

## Verified finding

${note.finding}
${correction}
## Source and runtime evidence

${bullets(note.evidence)}

## How to reproduce or verify

${numbered(note.reproduce)}

## Root cause and data flow

${bullets(note.rootCause)}

## User, business, and operational impact

${bullets(note.impact)}

## Detailed implementation / how-to

${numbered(note.howTo)}

## Edge cases and safety requirements

${bullets(note.edgeCases ?? defaultEdgeCases(note))}

## Accessibility, localization, responsive, performance, and observability

${bullets(note.quality ?? defaultQuality(note))}

## Required tests

${bullets(note.tests ?? defaultTests(note))}

## Rollout and rollback

${bullets(note.rollout ?? defaultRollout(note))}

## Acceptance criteria

${bullets(note.acceptance)}
${related}
## Completion rule

Do not mark this note complete from code review alone. Complete its database checklist, attach automated-test results plus a runtime screenshot/log where applicable, verify the acceptance criteria in the affected locale/layout, and record any deliberately deferred item in a linked note.
`;
}

function n(note: AuditNoteDefinition): AuditNoteDefinition {
  return note;
}

const hubNotes: AuditNoteDefinition[] = [
  n({
    externalId: 'HH-01', folder: FOLDERS.hub, sortOrder: 1,
    title: 'Hide the cart badge until hydration and omit a zero-count badge', priority: 'high', classification: 'Verified bug',
    scope: 'Hub navbar cart state and first render',
    finding: 'HubNavbar always renders the cart-count badge, including when the current count is zero and while the client cart context is still hydrating. Every cold visit can therefore display a prominent red “0” badge that communicates an error-like state and may change after hydration.',
    evidence: [
      '`frontend/src/components/hub/HubNavbar.tsx` computes `cartCount = getItemCount()` and unconditionally renders the absolute red badge beside `ShoppingBag`.',
      'The cart value is supplied by client context, while the navbar is initially rendered before client persistence/API state has settled; there is no `hydrated`/`ready` signal in the badge branch.',
    ],
    reproduce: ['Open `/hub` in a fresh/private browser session and inspect the cart icon during first paint and hydration.', 'Repeat with a persisted non-empty cart and throttle JavaScript/network to make the zero-to-real-count transition visible.', 'Empty the cart and confirm the badge remains visible with `0`.'],
    rootCause: ['Presentation is coupled directly to a numeric count without distinguishing “not ready”, “empty”, and “non-empty”.', 'The badge branch has no `cartCount > 0` condition and the cart context does not expose hydration state to this consumer.'],
    impact: ['Creates visual noise and a misleading error-like badge for every empty-cart buyer.', 'Hydration changes can cause layout/visual instability and reduce trust in cart accuracy.'],
    howTo: ['Expose an explicit cart readiness/hydration flag from the shared cart context, or derive a stable server-safe initial state.', 'Render the badge only after readiness and only when `cartCount > 0`; cap large counts with an accessible value such as `99+`.', 'Add an accessible cart link label that includes the count after hydration without causing noisy announcements.', 'Keep the cart icon hit target stable whether the badge exists or not, and avoid suppressing the cart link itself while loading.', 'Test empty, persisted, cross-tab-updated, and API-restored carts.'],
    acceptance: ['No badge is rendered for an empty cart.', 'A persisted non-zero count appears once without flashing `0`.', 'The cart link remains keyboard accessible and its accessible name communicates the final count.', 'No hydration warning or layout shift is introduced.'],
    related: ['LA-02 — accessible names and states for icon controls.', 'HH-06 — authentication-dependent navbar hydration.'],
    tags: ['bug', 'hub', 'navbar', 'cart', 'hydration'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-02', folder: FOLDERS.hub, sortOrder: 2,
    title: 'Use the API total for marketplace statistics instead of page-one length', priority: 'high', classification: 'Verified bug',
    scope: 'Hub server fetch contract and Classic hero statistics',
    finding: 'The product API pagination metadata includes the marketplace total, but `getTrendingProducts()` returns only `products` and `totalPages`. Classic Hub statistics then display `trendingProducts.length`, which is merely the first page size, not the number of active products.',
    evidence: ['`frontend/src/app/hub/page.tsx:getTrendingProducts()` requests page 1 with `limit=16`, reads pagination metadata, but its return type retains only `products` and `totalPages`.', '`frontend/src/components/hub/HubHomeContent.tsx` builds `marketplaceStats` with `${trendingProducts.length}+` for active products.'],
    reproduce: ['Ensure production/staging has more than 16 public products.', 'Open the Classic Hub layout and compare the “active products” statistic to `/api/pd/products/public?page=1&limit=16` metadata.', 'Change the first-page limit and observe that the advertised marketplace statistic changes even though catalog size does not.'],
    rootCause: ['The server component narrows the API response and drops `meta.total` before passing data to layouts.', 'A display metric is derived from a presentation slice rather than an authoritative aggregate.'],
    impact: ['Publishes materially incorrect marketplace scale information to buyers and sellers.', 'Makes the statistic unstable when pagination limits change and prevents meaningful analytics comparison.'],
    howTo: ['Extend the server fetch result to include an explicit `totalProducts` sourced from validated API metadata.', 'Pass `totalProducts` through the layout props or a shared `HubHomeData` contract rather than recomputing it per layout.', 'Render a localized formatted value, with a deliberate fallback such as hiding the statistic when total metadata is unavailable.', 'Add backend/frontend contract validation so missing or non-numeric totals become an observable degraded state.', 'Avoid using a plus sign unless the product requirement intentionally communicates an approximate lower bound.'],
    acceptance: ['The displayed total equals the API aggregate when the catalog has more than one page.', 'Changing page size does not change the statistic.', 'Missing/failed metadata never produces a fabricated count.', 'All layouts that show product totals consume the same authoritative field.'],
    related: ['HR-01 — fetch failures must not become valid-looking empty content.', 'HC-01 — shared settings/data capability matrix.'],
    tags: ['bug', 'hub', 'hero', 'stats', 'api-contract'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-03', folder: FOLDERS.hub, sortOrder: 3,
    title: 'Normalize each product image once per render path', priority: 'low', classification: 'Improvement',
    scope: 'Hub product cards and image URL normalization',
    finding: 'Some Hub card branches call `getProductImage(product)` repeatedly in the condition and again while constructing the resized URL. The helper is inexpensive today, but repeated normalization is avoidable work and makes image fallback logic harder to keep consistent across five layouts.',
    evidence: ['`frontend/src/components/hub/HubHomeContent.tsx` deal/recommendation branches invoke `getProductImage(product)` two or three times in a single JSX expression.', '`frontend/src/components/hub/AmazonHomeContent.tsx` repeats `getProductImage()` in lightning-deal and pagination cards, while other card components already store a local `image` value.'],
    reproduce: ['Inspect the referenced card branches or instrument `normalizePublicAssetUrl` during a Hub render.', 'Render a page with many products and compare helper invocation counts before and after memoizing/localizing the normalized URL.'],
    rootCause: ['Image selection/normalization is duplicated inline instead of resolved once at the product-card boundary.', 'Layouts implement parallel card logic rather than sharing a small normalized view model/helper.'],
    impact: ['Minor unnecessary CPU/string work becomes multiplied by products, blocks, and rerenders.', 'Duplicated fallback expressions increase the chance of inconsistent URLs, sizes, or empty-image behavior.'],
    howTo: ['Resolve `const image = getProductImage(product)` once at the top of each card/render callback.', 'Prefer a shared `resolveHubProductImage(product, size)` helper or normalized product-card view model for all layouts.', 'Keep resizing separate from source selection so a missing URL is not passed through the resizer.', 'Measure before/after only as a regression guard; do not introduce heavyweight memoization for a trivial pure computation.', 'Add tests for image array, thumbnail fallback, empty URL, and already-normalized public asset paths.'],
    acceptance: ['Each card resolves its source image once per render.', 'Image fallback behavior is identical across the affected layouts.', 'No invalid empty URL is sent to the resize helper.', 'Targeted rendering tests and lint/typecheck pass.'],
    tags: ['performance', 'hub', 'images', 'maintainability'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-04', folder: FOLDERS.hub, sortOrder: 4,
    title: 'Repair pagination data and behavior parity across every Hub layout', priority: 'high', classification: 'Verified bug',
    scope: 'Hub product loading styles: none, load more, infinite, and numbered pagination',
    finding: 'The configured homepage pagination style does not have a consistent contract. Classic does not render `HubProductPagination`; four other layouts do. Only Alibaba receives the real initial total-page count. The server page uses 16 products while subsequent client pages use 12, and numbered pagination switches between initial and fetched grids with inconsistent page-one semantics.',
    evidence: ['`frontend/src/app/hub/page.tsx` fetches `limit=16` and passes `trendingTotalPages` only to `AlibabaHomeContent`.', '`HubHomeContent.tsx` declares `hub_homepage_pagination_style` but does not render `HubProductPagination`; AliExpress, AliExpress2, Amazon, and Alibaba do.', '`HubProductPagination.tsx` fetches `limit=12`, defaults `initialTotalPages=1`, begins load-more at page 2, and hides initial products after any numbered-page fetch.', 'Pagination controls do not expose `aria-current`, and previous/next icon buttons lack explicit navigation labels.'],
    reproduce: ['Select each pagination style in Superadmin Settings and visit every homepage layout.', 'Use a catalog with more than 16 products and compare page boundaries for none, load-more, infinite, and numbered modes.', 'Select page 1 after visiting page 2 and inspect duplicates/missing products and the current-page accessibility tree.', 'Throttle requests and click pages quickly to expose overlapping response order.'],
    rootCause: ['Pagination is a client component bolted onto layout-specific product subsets instead of a shared catalog query contract.', 'Page size, total count, initial data, sort, and rendering ownership are not represented by one typed model.', 'The component has no abort controller or request identity guard.'],
    impact: ['Admin settings can appear saved while having no effect or a different effect depending on layout.', 'Buyers can see duplicates, missing items, incorrect page counts, stale results, or inaccessible controls.', 'Analytics and merchandising order become unreliable because the first and later pages use different page sizes.'],
    howTo: ['Define one `HubCatalogPage` contract containing products, page, pageSize, total, totalPages, sort, and query identity.', 'Choose one page size and use it for the initial server request and every client request; compute total pages from the same metadata.', 'Render the shared pagination component from every layout, including Classic, at an explicit block location.', 'For numbered pagination, make page 1 a real state and either reuse the server page or refetch it consistently; never mix a 16-item first page with 12-item later pages.', 'Abort or ignore superseded requests, disable only the relevant interaction, preserve focus, and expose loading/error/retry states.', 'Add `nav` semantics, localized previous/next labels, `aria-current="page"`, and an announcement for the newly loaded range.'],
    acceptance: ['All five layouts honor every configured loading style.', 'No product is skipped or duplicated at a page boundary.', 'Total pages and active page remain correct after sort/layout changes.', 'Fast repeated navigation cannot let an older response overwrite the latest page.', 'Keyboard and screen-reader users can identify and operate current/previous/next pages.'],
    related: ['HC-01 — capability matrix.', 'QA-01 — cross-layout regression suite.', 'HR-01 — explicit loading/error/empty states.'],
    tags: ['bug', 'hub', 'pagination', 'api-contract', 'a11y'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-05', folder: FOLDERS.hub, sortOrder: 5,
    title: 'Define sponsored placement ownership and prevent duplicate rails per layout', priority: 'normal', classification: 'Verified reliability risk',
    scope: 'Hub sponsored banner, brands, and product placements',
    finding: 'The third outer rail in `hub/page.tsx` intentionally uses the default `hub.sponsored_products` placement; the old claim that its placement is missing was incorrect. The real defect is ownership: the page always renders three outer rails while Alibaba and Amazon can also render sponsored rails inside their configurable block order, causing duplicate placement delivery and impression competition.',
    correction: 'Do not “fix” this by merely adding a placement prop to the third outer rail—it already resolves to `hub.sponsored_products`. Establish exactly which layer owns each placement for each layout and render it once.',
    evidence: ['`frontend/src/app/hub/page.tsx` renders outer `hub.home_banner`, `hub.sponsored_brands`, and a default `hub.sponsored_products` rail around every layout.', '`AlibabaHomeContent.tsx` and `AmazonHomeContent.tsx` import and render `SponsoredAdsRail` in layout block renderers, including sponsored brands.', '`resolveHomeBlocks()` allows admins to order/enable sponsored blocks, but the outer page rails bypass that layout contract.'],
    reproduce: ['Enable sponsored brand/product blocks and select Alibaba or Amazon.', 'Serve ads for the same placement, load `/hub`, and count matching rail instances, delivery requests, and impression events.', 'Reorder or disable the internal sponsored block and observe that outer rails remain.'],
    rootCause: ['Sponsored content is composed at both the route shell and layout levels without a single placement registry.', 'Homepage block configuration and unconditional outer chrome are independent systems.'],
    impact: ['Duplicates paid inventory, distorts impression/click reporting, and can overcharge or underdeliver campaigns.', 'Creates excessive vertical content and prevents admins from reliably controlling homepage order.'],
    howTo: ['Create a layout capability/placement registry declaring `home_banner`, `sponsored_brands`, and `sponsored_products` ownership.', 'Move rendering to one level: preferably block-aware layout composition, with the route shell rendering only placements explicitly marked global.', 'Deduplicate by placement plus logical slot, not creative ID, and document whether multiple distinct slots may share a placement.', 'Ensure disabling/reordering a sponsored block has an observable, consistent effect.', 'Add analytics assertions that one visible slot records at most one qualifying impression per creative/session policy.'],
    acceptance: ['Each configured sponsored slot renders exactly once.', 'Disabling or moving a block behaves consistently in Alibaba, Amazon, AliExpress, Premium Deals, and Classic.', 'Delivery and impression metrics match the number of actual visible slots.', 'The default `hub.sponsored_products` placement remains supported and documented.'],
    related: ['HR-03 — sponsored cache and observer isolation.', 'HC-01 — layout capability matrix.'],
    tags: ['bug', 'hub', 'ads', 'placements', 'analytics'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-06', folder: FOLDERS.hub, sortOrder: 6,
    title: 'Eliminate the authentication-dependent account-link href flash', priority: 'high', classification: 'Verified bug',
    scope: 'Hub navbar authentication hydration and account routing',
    finding: 'Before `/auth/me` completes, the account link points to `/hub/account`; after the request it may become buyer login, vendor dashboard, or admin dashboard. A user can focus/click the link while it represents the wrong destination, and the DOM href changes after hydration.',
    evidence: ['`HubNavbar.tsx` derives `accountHref = currentUser ? dashboardHref : authChecked ? "/login/buyer" : "/hub/account"`.', 'Authentication is resolved only in a client `useEffect`, so the pre-check link is interactive and has a different destination from the settled unauthenticated state.'],
    reproduce: ['Throttle `/api/pd/auth/me`, load `/hub`, and inspect/click the account link before and after the response.', 'Repeat as unauthenticated buyer, authenticated buyer, vendor, and admin.', 'Use keyboard focus during hydration and observe destination/label changes.'],
    rootCause: ['Authentication-dependent navigation is rendered with a speculative href instead of a neutral loading contract or server-known session.', 'The label also mixes localized login copy with hardcoded French `Mon compte`.'],
    impact: ['Early clicks can navigate to the wrong page or bounce through redirects.', 'Changing focused-link behavior is confusing for keyboard/screen-reader users and introduces locale inconsistency.'],
    howTo: ['Prefer resolving the session in a server boundary and pass a stable role-aware navigation model to the client navbar.', 'If client resolution is required, render a non-navigating skeleton/disabled account control until `authChecked`, preserving dimensions and focus order.', 'Centralize role-to-destination mapping and cover customer/buyer aliases, vendor-with-store, admin, superadmin, expired session, and API failure.', 'Localize the settled label for every locale and expose an accessible loading label only if the control remains focusable.', 'Add route tests for each role and verify no destination changes after the control becomes interactive.'],
    acceptance: ['The account control never exposes a destination that is known to be speculative.', 'Each role lands on the intended account/dashboard route.', 'Unauthenticated users see a stable buyer-login destination.', 'Label and accessible name are localized and do not change unexpectedly while focused.'],
    related: ['HH-14 — Create Store routing.', 'LA-02 — navbar accessible names/states.'],
    tags: ['bug', 'hub', 'auth', 'navbar', 'hydration'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-07', folder: FOLDERS.hub, sortOrder: 7,
    title: 'Generate footer marketplace links from localized category and CMS data', priority: 'high', classification: 'Verified bug',
    scope: 'Hub footer category links and public navigation copy',
    finding: 'The Hub footer marketplace/category column contains hardcoded labels and destinations rather than consuming localized category/CMS data. It can become stale, English-only, or point at generic search paths that do not match the current catalog taxonomy.',
    evidence: ['`frontend/src/components/hub/HubFooter.tsx` defines public footer link labels in component code instead of the locale dictionaries/category API.', 'The Hub route already has ordered localized categories, but the footer receives only marketplace settings and independently hardcodes navigation content.'],
    reproduce: ['Switch between French, English, and Arabic and compare footer category labels to the locale/category API.', 'Rename, disable, or reorder a marketplace category and observe the footer remains unchanged.', 'Verify each footer link destination against actual category routes.'],
    rootCause: ['Footer information architecture is duplicated as static component content.', 'There is no typed CMS/footer-link or featured-category contract shared with Superadmin Settings.'],
    impact: ['Breaks localization and RTL content expectations and can send buyers to irrelevant results.', 'Requires code deployment for merchandising/navigation changes that should be configuration-driven.'],
    howTo: ['Define a public footer model with localized label, URL, visibility, order, and optional category reference.', 'For category shortcuts, resolve active localized categories on the server and pass a bounded list to the footer.', 'Use settings only for editable support/social links and validate routes with the existing public-link schema.', 'Provide deterministic fallbacks when no categories exist; do not expose broken placeholder links.', 'Add Superadmin controls or reuse Homepage Blocks/CMS with preview and validation.'],
    acceptance: ['Footer labels change correctly with FR/EN/AR locale and align correctly in RTL.', 'Disabled/renamed categories are not advertised under stale names.', 'Every rendered link resolves to an allowed working destination.', 'Admins can update configured footer content without a code change.'],
    related: ['LA-01 — complete localization audit.', 'AS-23 — safe structured editors.'],
    tags: ['bug', 'hub', 'footer', 'i18n', 'navigation'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-08', folder: FOLDERS.hub, sortOrder: 8,
    title: 'Add variant-safe purchase actions to Hub product cards', priority: 'normal', classification: 'Enhancement',
    scope: 'Hub product-card conversion actions',
    finding: 'Most homepage product cards are link-only. Adding a direct purchase action could improve conversion, but a naive “Add to cart” button would be wrong for products requiring variant/options selection, unavailable inventory, digital rules, or store-specific fulfillment.',
    evidence: ['Hub layout card implementations primarily wrap the whole card in `Link` and do not share a purchase-action resolver.', 'Product/cart routing already distinguishes Hub marketplace products and store-scoped storefront products; homepage actions must preserve the central Hub cart contract.'],
    reproduce: ['Review cards across all five layouts with simple, variant, out-of-stock, and restricted products.', 'Confirm buyers must always open product detail even when the item can be safely added with defaults.'],
    rootCause: ['Product cards have no shared capability model describing whether direct add is safe.', 'Parallel layout card implementations make one-off buttons likely to diverge.'],
    impact: ['Extra navigation reduces conversion for simple products.', 'An unsafe quick-add implementation could add the wrong variant/quantity or bypass availability rules.'],
    howTo: ['Create a shared `resolveHubPurchaseAction(product)` returning `quick_add`, `choose_options`, `unavailable`, or `view_details` plus reason.', 'Use the existing Hub cart context/API and preserve store/vendor identity for central marketplace checkout.', 'Render a secondary button without nesting an interactive element inside the card link; restructure card semantics accordingly.', 'For variant products, open an accessible options dialog or route to detail with clear “Choose options” copy.', 'Handle loading, duplicate clicks, optimistic failure rollback, inventory changes, and analytics consistently across layouts.'],
    acceptance: ['Simple eligible products can be added from every supported layout.', 'Variant products never add an arbitrary variant.', 'Unavailable products present a truthful disabled/view-details state.', 'Card and action remain valid semantic, keyboard, touch, and screen-reader controls.', 'Cart count and line items update once per successful action.'],
    related: ['HH-01 — stable cart badge.', 'HC-01 — cross-layout capability parity.'],
    tags: ['enhancement', 'hub', 'cart', 'conversion', 'variants'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-09', folder: FOLDERS.hub, sortOrder: 9,
    title: 'Give sponsored rails distinct loading, empty, and error states', priority: 'normal', classification: 'Verified reliability risk',
    scope: 'SponsoredAdsRail layout stability and delivery diagnostics',
    finding: '`SponsoredAdsRail` initializes with an empty array and returns `null` for loading, valid empty inventory, HTTP failure, parse failure, and rejected cached promise. The page cannot reserve space, users see content jump when ads arrive, and operators cannot distinguish no eligible campaign from broken delivery.',
    evidence: ['`SponsoredAdsRail.tsx` has only `ads` state; the fetch catch sets `[]` and `if (!ads.length) return null` handles every non-success state.', 'No skeleton, retry UI, diagnostic code, or minimum reserved slot is rendered.'],
    reproduce: ['Throttle the ad delivery request and observe the rail appearing after surrounding content.', 'Return `{ads: []}`, a 500 response, malformed JSON, and a network rejection; compare the identical visual result.', 'Measure layout shift around banner/card placements.'],
    rootCause: ['The state model collapses `idle/loading/empty/error/success` into one array.', 'Ad slots have no layout contract for reserved height or acceptable collapse behavior.'],
    impact: ['Creates cumulative layout shift and inconsistent reading position.', 'Masks ad-delivery outages and makes campaign support/debugging difficult.'],
    howTo: ['Model explicit status plus a safe error code and request/placement identifier.', 'Define per-variant slot dimensions and render a non-animated or subtle skeleton that preserves geometry.', 'Treat valid empty inventory as a deliberate collapsed or house-content state according to placement policy.', 'Provide retry/backoff for transient failures without exposing implementation details to buyers.', 'Emit placement-scoped success/empty/error/latency telemetry and connect it to an operator dashboard/alert.'],
    acceptance: ['Loading does not shift surrounding content beyond the agreed CLS budget.', 'Empty inventory and delivery failure are distinguishable in telemetry.', 'Transient failures can recover without reloading the entire page.', 'Buyer-facing error treatment remains discreet and accessible.'],
    related: ['HR-03 — cache and observer isolation.', 'HH-05 — placement ownership.'],
    tags: ['bug', 'hub', 'ads', 'loading', 'cls', 'observability'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-10', folder: FOLDERS.hub, sortOrder: 10,
    title: 'Bring category icon and state parity to the Classic hero sidebar', priority: 'low', classification: 'Enhancement',
    scope: 'Classic Hub category discovery',
    finding: 'The Classic homepage category presentation is less informative than the shared mega-menu/Alibaba variants and does not consistently use configured category icons or meaningful fallbacks. Category scanning can be improved without inventing decorative icons unrelated to taxonomy.',
    evidence: ['`CategoryMegaMenu.tsx` has `ICON_MAP` plus slug-based fallbacks, while Classic hero/category UI uses separate rendering logic.', 'Category API nodes already expose `icon`, image, localized description, position, and children.'],
    reproduce: ['Open Classic and Alibaba/mega-menu layouts with categories that have configured icons.', 'Compare information density, fallback behavior, active/hover states, and narrow-screen behavior.'],
    rootCause: ['Category presentation logic is duplicated and capabilities differ by layout.', 'There is no shared category visual model resolving configured icon, safe fallback, image, and localized description.'],
    impact: ['Classic is harder to scan and does not honor all admin category metadata.', 'Duplicated icon inference may drift or produce inconsistent meaning.'],
    howTo: ['Extract a shared category visual resolver that prioritizes configured icon/image and uses deterministic fallbacks.', 'Use icons only when they aid recognition; keep the category name as the accessible text and mark decorative icons appropriately.', 'Define active, hover, focus, loading, missing-image, and long-label states.', 'Keep the sidebar optional/collapsible on small screens and do not force a desktop column into mobile.', 'Verify all taxonomy changes remain data-driven.'],
    acceptance: ['Configured category icons appear consistently in Classic and the mega-menu.', 'Fallbacks are deterministic and do not replace text labels.', 'Long FR/AR labels and RTL direction do not clip or misalign.', 'Keyboard focus is visible and touch targets meet minimum size.'],
    related: ['LA-04 — mega-menu keyboard/focus model.', 'HC-01 — layout parity matrix.'],
    tags: ['enhancement', 'hub', 'categories', 'icons', 'classic-layout'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-11', folder: FOLDERS.hub, sortOrder: 11,
    title: 'Complete accessible carousel interaction across every layout', priority: 'high', classification: 'Verified bug',
    scope: 'Homepage and sponsored carousel autoplay, controls, and announcements',
    finding: 'Carousel implementations differ across Hub layouts. Several use unconditional `setInterval` autoplay without pause on hover/focus, page visibility, or reduced-motion preference; slide indicators do not consistently expose the active state, and some controls are too small or incompletely labeled.',
    evidence: ['AliExpress and Amazon homepage components start a 6-second interval whenever multiple slides exist.', 'Alibaba has configurable autoplay/arrows/dot styles but does not consume the stored transition mode and indicator buttons expose labels without `aria-current`/selected state.', '`SponsoredAdsRail` banner also auto-rotates independently.'],
    reproduce: ['Enable multiple slides in each layout and navigate using keyboard, pointer, screen reader, and `prefers-reduced-motion: reduce`.', 'Move focus into the carousel and switch the browser tab; observe whether rotation pauses.', 'Inspect active indicator semantics and touch-target dimensions.'],
    rootCause: ['Each layout owns a separate timer/control implementation instead of a shared accessible carousel controller.', 'Autoplay is treated as animation styling rather than user-controlled changing content.'],
    impact: ['Changing content can disrupt reading/focus and fails WCAG expectations for pause/stop and motion sensitivity.', 'Users cannot reliably determine the active slide or operate controls across layouts.'],
    howTo: ['Create a shared carousel hook/controller with autoplay, interval, pause reasons, active index, visibility handling, and cleanup.', 'Disable autoplay by default for reduced motion and pause while hovered, focus-within, offscreen, or document-hidden; resume only when every pause reason clears.', 'Use a labeled region, stable heading relationship, previous/next buttons, selected/current indicator state, and optional polite announcements only for user-initiated changes.', 'Meet 44×44 px targets and preserve focus when slides change.', 'Make transition style an intentional visual layer on top of the same state machine and never hide content from assistive technology incorrectly.'],
    acceptance: ['All carousels pause for focus/hover/hidden page and honor reduced motion.', 'Active slide and controls are correctly exposed to assistive technology.', 'No timer runs after unmount or with one slide.', 'Manual navigation works consistently in every homepage layout and sponsored banner.'],
    related: ['HC-02 — carousel setting scope/dead transition control.', 'LA-02 — control naming and state.'],
    tags: ['bug', 'hub', 'carousel', 'a11y', 'motion', 'wcag'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-12', folder: FOLDERS.hub, sortOrder: 12,
    title: 'Verified: recently viewed tracking is installed on product detail', priority: 'low', classification: 'Verified / no defect',
    scope: 'Recently viewed product collection and homepage rails',
    finding: 'The earlier suspicion that recently viewed data was never collected is not reproducible. Product detail installs the tracker and homepage templates render `RecentlyViewedRail`; no code change is required unless the tracking contract changes.',
    correction: 'A homepage should display recently viewed items, not record every product shown on the homepage as “viewed.” Tracking belongs on product-detail interaction and is already present.',
    evidence: ['Product-detail code includes the recently viewed tracker for actual product visits.', 'Hub homepage layouts import/render the shared `RecentlyViewedRail` component.', 'The existing production note is completed with all four verification checklist rows done.'],
    reproduce: ['Visit a product detail, return to `/hub`, and verify the product appears in the recently viewed rail.', 'Repeat with empty storage, duplicates, and the configured maximum.', 'Verify clearing relevant client state removes the rail or produces its intended empty behavior.'],
    rootCause: ['No active defect; the original note conflated data collection with data presentation.'],
    impact: ['Keeping this verified record prevents future agents from adding incorrect homepage impression tracking that would pollute buyer history.'],
    howTo: ['Preserve the existing product-detail tracker and shared rail contract.', 'If privacy/retention requirements change, update the tracker, consent behavior, storage limits, and this note together.', 'Retest after product-detail or recently-viewed refactors.'],
    acceptance: ['A real product-detail visit populates the rail.', 'Homepage impressions alone do not create recently viewed entries.', 'The completed note and 4/4 checklist state remain preserved.'],
    related: ['QA-01 — protect this verified behavior with regression coverage.'],
    tags: ['verified', 'hub', 'recently-viewed', 'no-defect'], verifiedComplete: true,
  }),
  n({
    externalId: 'HH-13', folder: FOLDERS.hub, sortOrder: 13,
    title: 'Add truthful Hub JSON-LD and social metadata from authoritative data', priority: 'normal', classification: 'Enhancement',
    scope: 'Hub homepage SEO and machine-readable marketplace identity',
    finding: 'The Hub homepage does not publish a deliberate JSON-LD graph describing the marketplace/website/search action and visible curated content. Metadata should be added carefully; emitting every first-page product as authoritative structured data would be noisy and can become inconsistent with page content.',
    evidence: ['`frontend/src/app/hub/page.tsx` renders the homepage composition without a JSON-LD script for WebSite/Organization/ItemList.', 'Marketplace name, public URL, logos, locale, categories, and product metadata are already available from settings/API sources.'],
    reproduce: ['Inspect page source and test the Hub URL with structured-data validation tools.', 'Compare canonical/social metadata and visible marketplace identity across locales/layouts.'],
    rootCause: ['SEO metadata was not modeled as part of the shared Hub data contract.', 'Layout-specific UI evolved faster than a stable semantic/SEO layer.'],
    impact: ['Search engines have less explicit information about site search, organization identity, and curated category/product lists.', 'Incorrect future markup could create rich-result warnings or advertise stale prices/availability.'],
    howTo: ['Define a server-generated JSON-LD graph for `WebSite` with `SearchAction` and `Organization`/`OnlineStore` identity using the canonical public URL.', 'Add `ItemList` only for a stable visible curated list and include product offers only when price, currency, URL, image, availability, and seller data are authoritative.', 'Generate canonical, Open Graph, and locale alternates from the same trusted settings/route model.', 'Escape serialized JSON safely and never include admin-only configuration or unsanitized user HTML.', 'Validate each locale/layout in automated tests and external validators.'],
    acceptance: ['Structured data validates without critical errors.', 'Every URL/image/price in markup matches visible current content.', 'Canonical and locale metadata are stable across layouts.', 'No secrets, admin data, or fabricated ratings/counts are emitted.'],
    related: ['HH-02 — authoritative totals.', 'AS-18 — public URL configuration.'],
    tags: ['enhancement', 'hub', 'seo', 'json-ld', 'metadata'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-14', folder: FOLDERS.hub, sortOrder: 14,
    title: 'Route Create Store according to authentication and seller state', priority: 'high', classification: 'Verified bug',
    scope: 'Hub navbar seller-acquisition CTA',
    finding: 'The navbar “Create Store” CTA always links to `/hub/dashboard`, including for unauthenticated buyers and users who do not have a seller store. The correct action depends on auth, onboarding, store ownership, and seller status.',
    evidence: ['`frontend/src/components/hub/HubNavbar.tsx` renders the Create Store link with a constant `/hub/dashboard` href.', 'The same component already fetches current user role/store information for the account link, but that state is not used for this CTA.'],
    reproduce: ['Click Create Store while signed out, as a buyer without a store, a vendor with a store, and an admin.', 'Record redirects/bounces and whether the landing page explains the next step.'],
    rootCause: ['The acquisition CTA bypasses the role/state routing resolver.', 'Copy and destination are not modeled together as a stateful call to action.'],
    impact: ['Unauthenticated prospects can be sent into a protected dashboard instead of a persuasive signup/onboarding path.', 'Existing vendors may see acquisition copy instead of “Seller Dashboard,” reducing clarity and conversion.'],
    howTo: ['Create a server/client-safe `resolveSellerCta(user, onboardingState)` returning localized label, href, and analytics intent.', 'Signed-out users should go to vendor signup/plan selection with a safe return URL; eligible buyers should go to seller conversion onboarding.', 'Existing vendors should see a dashboard/manage-store action, and suspended/pending stores should receive an appropriate status route.', 'Keep the pre-auth state non-speculative as described in HH-06.', 'Instrument CTA impression/click/activation funnel by resolved state, not by personally identifying details.'],
    acceptance: ['Signed-out visitors reach vendor signup without a protected-route bounce.', 'Existing vendors reach their seller dashboard.', 'Pending/suspended/blocked states receive truthful copy and destination.', 'CTA label and destination remain stable once interactive and are localized.'],
    related: ['HH-06 — auth hydration.', 'PI-02 — seller/merchandising growth experiments.'],
    tags: ['bug', 'hub', 'navbar', 'seller-acquisition', 'routing'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-15', folder: FOLDERS.hub, sortOrder: 15,
    title: 'Verified: no reproducible footer social-link RTL defect', priority: 'low', classification: 'Verified / no defect',
    scope: 'Hub footer social links in Arabic RTL',
    finding: 'The previously reported footer social-link RTL defect was not reproducible in the current implementation. Logical spacing utilities and flex behavior are sufficient for the current icon-only/social link row; retain this note as verification evidence rather than implementing speculative changes.',
    correction: 'Do not add direction-specific transforms or reverse icon order without a confirmed design requirement. Social brand icons generally keep their native shape in RTL.',
    evidence: ['Current footer layout uses flex/logical spacing patterns rather than left/right-dependent positioning for the social row.', 'The production note is completed with a 4/4 verification checklist.'],
    reproduce: ['Set locale to Arabic and inspect the footer at mobile and desktop widths.', 'Navigate every social link by keyboard and confirm focus order and target are sensible.', 'Test 200% zoom and long surrounding Arabic content.'],
    rootCause: ['No active defect; earlier wording inferred an RTL issue without a reproducible failure.'],
    impact: ['Prevents unnecessary CSS changes that could reverse brand icons or create a real focus-order mismatch.'],
    howTo: ['Preserve logical CSS utilities and native social icon orientation.', 'Reopen only with a screenshot, affected viewport/locale, expected behavior, and reproducible source location.', 'Continue validating accessible names and URL configuration under LA-02/AS settings notes.'],
    acceptance: ['Arabic footer has no clipping, overlap, or focus-order mismatch.', 'Brand icons are not mirrored incorrectly.', 'Completed status and the existing 4/4 checklist remain preserved.'],
    related: ['LA-01 — broader localization audit.', 'LA-02 — accessible names.'],
    tags: ['verified', 'hub', 'footer', 'rtl', 'no-defect'], verifiedComplete: true,
  }),
  n({
    externalId: 'HH-16', folder: FOLDERS.hub, sortOrder: 16,
    title: 'Define Hub freshness, cache, and on-demand invalidation as one contract', priority: 'normal', classification: 'Improvement',
    scope: 'Server fetch revalidation and settings publication freshness',
    finding: 'The earlier statement that a 120-second product revalidate is simply “too short” is not sufficiently grounded. The actual problem is an undefined freshness contract: products use 120 seconds, categories 300 seconds, marketplace settings have their own cache, and the admin save triggers a separate best-effort revalidation request without guaranteed success.',
    correction: 'Do not change TTLs based only on traffic volume. Define freshness targets by data type and pair TTL fallback with reliable on-demand invalidation.',
    evidence: ['`frontend/src/app/hub/page.tsx` uses `next: { revalidate: 120 }` for products and 300 for categories.', '`frontend/src/app/(admin)/settings/page.tsx` fires `/api/marketplace/revalidate` after save but does not await or report its outcome.', 'Product, category, settings, and ad delivery have different consistency needs.'],
    reproduce: ['Change Hub layout/banner/settings and measure time until every deployed instance shows the update.', 'Publish/unpublish a product or category and compare cache behavior with and without revalidation failure.', 'Simulate the revalidation endpoint failing after a successful settings save.'],
    rootCause: ['TTL values and invalidation triggers were added per fetch/mutation without a documented data-freshness SLO.', 'Persistence success and cache propagation are treated as one success message even though they are separate operations.'],
    impact: ['Admins cannot know when changes are public; stale or partially updated Hub instances may persist.', 'Overly aggressive TTLs waste backend capacity, while overly long TTLs delay critical catalog/maintenance changes.'],
    howTo: ['Classify settings, products, categories, campaigns, and maintenance data by target freshness and acceptable stale window.', 'Use tag/path-based on-demand revalidation from successful mutation flows and retain TTLs as resilience fallbacks.', 'Make invalidation idempotent, authenticated, scoped, and observable; include retry or queued propagation for transient failure.', 'Return persistence and publication states separately to the admin UI.', 'Measure cache hit ratio, invalidation latency, error rate, and stale-content incidents before tuning TTLs.'],
    acceptance: ['Each data type has a documented freshness target and fallback TTL.', 'Successful relevant mutations trigger scoped invalidation.', 'The admin UI distinguishes “saved” from “published/propagated.”', 'Transient invalidation failure is retried or clearly actionable.'],
    related: ['HR-02 — settings save/revalidation outcome.', 'PI-01 — draft/publish/rollback workflow.'],
    tags: ['improvement', 'hub', 'cache', 'revalidation', 'freshness'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-17', folder: FOLDERS.hub, sortOrder: 17,
    title: 'Replace the homepage layout ternary with an exhaustive resolver', priority: 'low', classification: 'Improvement',
    scope: 'Hub layout selection and maintainability',
    finding: '`hub/page.tsx` chooses among five layouts using a nested ternary with theme-default exceptions. It works today, but adding layouts or changing theme fallbacks can silently route to Classic because the relationship is not exhaustive or centrally testable.',
    evidence: ['`frontend/src/app/hub/page.tsx` builds `homeContent` through chained `homepageLayout === ... ? ... :` branches.', '`resolveHomepageLayout()` separately normalizes stored values, while `theme_default` behavior is embedded in the render chain.'],
    reproduce: ['Trace each stored layout plus each marketplace theme through the current ternary.', 'Introduce an unknown layout in a type-level test and observe there is no compile-time exhaustive failure in the render selection.'],
    rootCause: ['Normalization, theme fallback, component selection, and prop capability are split across conditional expressions.', 'Layout props are not modeled by a discriminated union/registry.'],
    impact: ['Future layout additions can miss required props such as totals or configuration capability.', 'Reviewers have difficulty seeing the complete routing matrix and fallback behavior.'],
    howTo: ['Create a pure `resolveHubLayout({ configuredLayout, marketplaceTheme })` returning a strict layout ID.', 'Use a switch with a `never` assertion or a typed registry mapping each layout ID to its renderer/capabilities.', 'Keep theme-default resolution separate from rendering and unit-test every combination.', 'Have the capability matrix drive required data props and settings visibility.', 'Log/monitor unknown stored values and use a documented safe fallback.'],
    acceptance: ['Every supported layout/theme combination has an explicit test.', 'Adding a layout produces compile-time/test failures until its renderer and capabilities are registered.', 'Unknown stored values use the documented fallback and are observable.', 'Rendered behavior remains unchanged for existing valid configurations.'],
    related: ['HC-01 — settings-to-layout capability matrix.', 'HC-02 — Alibaba-only carousel controls.'],
    tags: ['improvement', 'hub', 'layout', 'typescript', 'maintainability'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HH-18', folder: FOLDERS.hub, sortOrder: 18,
    title: 'Verified: client layout components are server-prerendered; no blank-page defect', priority: 'low', classification: 'Verified / no defect',
    scope: 'Hub rendering architecture and JavaScript-disabled assumptions',
    finding: 'The earlier claim that using client components makes the Hub blank until JavaScript executes is incorrect. Next.js server-prerenders client components into HTML and hydrates them; there is no reproduced blank-page defect requiring a custom `<noscript>` copy of the marketplace.',
    correction: 'A `<noscript>` fallback may be a product choice for critical messaging, but it is not the fix for a nonexistent client-component blank-page bug. Focus on progressive enhancement of individual interactions and server-visible content.',
    evidence: ['The Hub route is a server component that fetches marketplace data and renders the selected client layout component into the server response.', 'Current source/page behavior provides homepage HTML before hydration; the production note is completed with 4/4 verification items.'],
    reproduce: ['Inspect server response HTML for `/hub` and confirm headings/product/category content is present.', 'Disable JavaScript and distinguish available content from interactions that legitimately require client code.', 'Check for hydration errors separately; none are implied merely by a `use client` boundary.'],
    rootCause: ['No active defect; the old note relied on an incorrect model of Next.js client components.'],
    impact: ['Prevents duplicate inaccessible noscript markup and unnecessary maintenance.', 'Keeps attention on real progressive-enhancement gaps such as navigation, search, and pagination.'],
    howTo: ['Preserve server data fetching and prerendered semantic content.', 'For each interactive feature, define a graceful non-JavaScript route/form only when required by product goals.', 'Reopen this note only if a concrete server-render/hydration regression is reproduced.'],
    acceptance: ['Server response contains meaningful Hub content.', 'No hydration error causes a blank page in supported browsers.', 'The completed status and existing 4/4 checklist remain preserved.'],
    related: ['QA-01 — add rendering/hydration regression checks.'],
    tags: ['verified', 'hub', 'ssr', 'hydration', 'no-defect'], verifiedComplete: true,
  }),
];

const settingsNotes: AuditNoteDefinition[] = [
  n({
    externalId: 'AS-01', folder: FOLDERS.settings, sortOrder: 1,
    title: 'Scope settings saves to the active section and changed keys', priority: 'urgent', classification: 'Verified bug',
    scope: 'Superadmin platform settings save payload',
    finding: 'Implemented locally on 2026-08-13: platform saves now target the active section endpoint, submit only normalized keys that differ from the saved snapshot, preserve drafts in other sections and edits made while a request is in flight, and use per-section `If-Match` versions to reject stale concurrent writes. Production deployment and runtime verification are still required before closing this note.',
    correction: 'The original defect was verified. Its primary code path is now fixed in the working tree, but the note remains open until the updated frontend/backend are deployed, the production API returns `section_versions`, and the complete operator flow is verified in the live Superadmin UI.',
    evidence: ['`frontend/src/app/(admin)/settings/page.tsx` now calls `PUT /api/pd/admin/settings/:section`, includes an `If-Match` section version, disables platform saves until authoritative settings load succeeds, and scopes both save and reset actions to the active section.', '`frontend/src/lib/admin-settings-save.ts` centralizes dirty-key selection plus response/conflict merging so hidden drafts and edits made during an in-flight request are retained.', '`backend/src/services/platform-config.service.ts` derives section versions from `pd_platform_config.updated_at`, serializes section writes with a PostgreSQL advisory transaction lock, checks the expected version atomically, and writes only allowed section keys.', '`backend/src/api/admin.route.ts` returns the latest grouped settings/version snapshot on `PD_SETTINGS_CONFLICT`, enabling an actionable 409 recovery path.', 'Automated verification passed locally: frontend helper tests 6/6, backend platform-config tests 3/3, frontend TypeScript, backend TypeScript, focused ESLint with no errors, and `git diff --check`.'],
    reproduce: ['Edit a field in Marketplace, do not save, switch to Finance, edit/save Finance, then reload and inspect both values.', 'Load settings, simulate a stale tab/open second admin session, save an unrelated section, and inspect `updated_keys`/audit metadata.', 'Capture the request body and confirm it contains keys outside the active section.'],
    rootCause: ['Frontend state was global while the save action was presented as section-specific.', 'A section-aware backend endpoint existed but was not used by the primary save path.', 'The response replaced the complete local settings snapshot, which could erase other unsaved drafts.', 'The API exposed no section version, so two administrators editing the same section used silent last-write-wins behavior.'],
    impact: ['Can publish changes the operator did not intend to save and overwrite a newer value from another administrator/session.', 'Makes audit history noisy because many unchanged/unrelated keys are submitted.', 'Raises the severity of initial-load fallback and hidden-draft defects.'],
    howTo: ['Implemented: call the section endpoint for platform tabs and derive the request body from normalized dirty keys within `SETTINGS_TAB_KEYS[activeTab]` only.', 'Implemented: merge success responses only into submitted keys, retain drafts in other sections, and keep a newer edit when the operator changes a submitted field while its request is in flight.', 'Implemented: return per-section versions, send them through `If-Match`, serialize same-section writes, and return an actionable `PD_SETTINGS_CONFLICT` response with the latest values/version.', 'Before completion, deploy frontend/backend together and verify the initial GET, section PUT, 409 recovery, audit metadata, cache revalidation, and multi-admin scenario against production-like data.', 'Keep a deliberate global-save operation absent unless a future UI explicitly names, previews, and confirms its cross-section scope.'],
    tests: ['Passed: `frontend` — `npx vitest run src/lib/admin-settings-save.test.ts` (6/6), covering scoped dirty keys, normalization, hidden drafts, in-flight edits, saved-state merging, and conflict refresh merging.', 'Passed: `backend` — `npx vitest run src/__tests__/platform-config.service.test.ts` (3/3), covering section version calculation, stale-write rejection, and allowed-key enforcement.', 'Passed: `frontend` — `npx next typegen` followed by `npx tsc --noEmit --pretty false`; passed: `backend` — `npx tsc --noEmit --pretty false`.', 'Passed: focused frontend ESLint with zero errors (one pre-existing `next/image` warning in the Settings page) and repository `git diff --check`.', 'Still required: authenticated API integration and Playwright coverage for live save, hidden drafts, failed load, and two-admin conflicts.'],
    rollout: ['Deploy the backend response/version contract before or atomically with the frontend so `section_versions` is available when the UI begins sending `If-Match`.', 'Run the database/API smoke test without changing unrelated production settings; use reversible test values and restore them through the same scoped endpoint.', 'Monitor 409 rates, validation failures, `updated_keys`, Settings save latency, cache invalidation, and Hub revalidation after release.', 'Rollback may return the UI to the earlier global endpoint, but should retain the additive error code and response metadata; do not delete configuration rows, timestamps, Admin Notes, or audit history.'],
    acceptance: ['A save request contains no key outside the active platform section.', 'A save request omits normalized values that equal the saved snapshot.', 'Unsaved edits in another tab remain local and are not persisted or discarded.', 'An edit made while the request is in flight is not overwritten by the response.', 'Concurrent same-section updates produce an actionable 409 conflict instead of silent last-write-wins data loss.', '`updated_keys` and audit metadata reflect only actual changed keys.', 'The save and reset controls cannot act on fallback defaults after an initial load failure.'],
    related: ['AS-02 — per-section drafts/navigation.', 'AS-21 — action-bar domain.', 'AS-22 — failed initial load.', 'AS-24 — shared schema/default contract.'],
    tags: ['bug', 'admin-settings', 'data-integrity', 'save-scope', 'urgent'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-02', folder: FOLDERS.settings, sortOrder: 2,
    title: 'Protect per-section drafts and warn before abandoning them', priority: 'high', classification: 'Verified reliability risk',
    scope: 'Settings navigation, dirty state, and draft ownership',
    finding: 'Switching tabs does not currently discard values because panels stay mounted and share state; the old “tab switch loses data” wording was inaccurate. The real risk is hidden unsaved drafts: the header dirty indicator only evaluates the active section, navigation is unrestricted, and an unscoped save can publish hidden changes.',
    correction: 'Do not add a blanket confirmation on every tab switch while drafts are intentionally preserved. Track drafts by section, show where unsaved work exists, and confirm only when an action would actually discard or publish it.',
    evidence: ['Every tab section uses an `activeTab ? "" : "hidden"` class and remains mounted.', '`hasUnsavedPlatformChanges` checks only `SETTINGS_TAB_KEYS[activeTab]`.', 'Global `settings` state preserves hidden values; current reset/save behavior can affect more than the visible section.'],
    reproduce: ['Edit Marketplace, switch to Finance, and observe the Marketplace draft is hidden with no tab badge.', 'Reload/navigate away with hidden drafts and confirm there is no targeted explanation of what will be lost.', 'Use the floating reset/save actions from another tab and inspect their effect.'],
    rootCause: ['Dirty state is computed for presentation, not modeled as a section-indexed draft system.', 'Tabs have no status metadata for clean/dirty/saving/error/conflict.', 'Navigation, reset, and save semantics are not defined per domain.'],
    impact: ['Operators can forget hidden changes, accidentally publish them, or lose them on route exit.', 'Ambiguous status undermines confidence in a high-risk control surface.'],
    howTo: ['Derive dirty keys and status for every section, including separate SMTP/template/plan domains.', 'Show a subtle unsaved badge on affected tabs and a summary of hidden drafts near global navigation.', 'Allow tab switching without interruption when drafts remain safely preserved.', 'Prompt only before route exit, reload, discard, reset, or another action that would lose drafts; list affected sections.', 'After a section save, clear only that section’s dirty state and preserve all others.'],
    acceptance: ['Every section with unsaved work is identifiable while viewing another section.', 'Safe tab switching does not show unnecessary dialogs.', 'Discard/route-exit prompts name the sections and changes that will be lost.', 'Saving one section neither publishes nor clears another section’s draft.'],
    related: ['AS-01 — scoped saves.', 'AS-14 — per-tab discard.', 'AS-21 — action bars.'],
    tags: ['bug', 'admin-settings', 'drafts', 'navigation', 'data-integrity'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-03', folder: FOLDERS.settings, sortOrder: 3,
    title: 'Make configured marketplace brand colors drive every Hub layout', priority: 'high', classification: 'Verified bug',
    scope: 'Marketplace color settings and Hub theming',
    finding: 'Superadmin can edit `marketplace_primary_color` and `marketplace_secondary_color`, but Hub layouts and shared controls contain many fixed emerald, red/orange, navy, and Amazon palette values. Saving colors therefore produces partial or no visible change depending on the selected layout.',
    evidence: ['Settings defines and validates both color fields.', '`HubNavbar.tsx`, `SearchBar.tsx`, `HubHomeContent.tsx`, AliExpress/Amazon/Alibaba layouts, pagination, and sponsored UI contain hardcoded hex/Tailwind palette values.', 'Marketplace theme helpers cover named themes but are not a complete runtime token bridge from admin colors.'],
    reproduce: ['Set distinctive accessible primary/secondary colors, save, and compare navbar, hero, CTA, focus ring, links, pagination, and cards in all layouts.', 'Toggle dark mode and Arabic locale and document components that retain old palettes.'],
    rootCause: ['Brand settings are data fields without a shared CSS-variable/token consumer at the Hub shell.', 'Layouts were authored as separate visual themes and encode colors directly in component classes.'],
    impact: ['The settings UI promises customization it cannot reliably deliver.', 'Brand inconsistency, contrast failures, and expensive per-layout maintenance increase.'],
    howTo: ['Resolve validated colors once on the server and expose semantic CSS variables such as accent, accent-hover, accent-contrast, secondary, focus, and surface accents.', 'Define which named marketplace themes may intentionally override which tokens and show that scope in Settings.', 'Replace core interactive/chrome hardcodes with semantic variables; retain layout-specific decorative palettes only where documented.', 'Compute/validate contrast for text, focus, disabled, and dark-mode combinations and offer safe derived values.', 'Add a visual token preview and cross-layout screenshot coverage.'],
    acceptance: ['Changing configured colors updates every documented Hub surface without deployment.', 'Each layout clearly indicates deliberate exceptions.', 'Text/focus/control contrast meets WCAG AA in light and dark modes.', 'No component falls back to an unrelated legacy palette after hydration.'],
    related: ['HC-01 — capability matrix.', 'AS-09 — theme/layout discoverability.', 'QA-01 — visual regressions.'],
    tags: ['bug', 'admin-settings', 'hub', 'theme', 'design-tokens'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-04', folder: FOLDERS.settings, sortOrder: 4,
    title: 'Add the asset library to Hub banner and slide image fields', priority: 'normal', classification: 'Enhancement',
    scope: 'Hub banner image authoring',
    finding: 'Marketplace logo and maintenance image fields can open `MarketplaceAssetPicker`, but the Hub banner image and structured hero/block images are typed as raw URLs. This is inconsistent and encourages invalid, temporary, oversized, or unauthorized external assets.',
    evidence: ['`marketplaceLogoPickerTarget` supports logo and maintenance illustration keys only.', 'The Hub Homepage section renders `hub_homepage_banner_image_url` through the generic text input.', 'Hero/Homepage block editors expose image URL text fields without the shared asset picker.'],
    reproduce: ['Open Marketplace settings and compare logo/maintenance asset selection with banner/slide image fields.', 'Paste invalid, private, expiring, or extremely large URLs and inspect current validation/preview behavior.'],
    rootCause: ['Asset picker integration is keyed to a small union of setting names rather than a reusable field control.', 'Structured editors do not share media-library primitives.'],
    impact: ['Slower authoring, more broken imagery, inconsistent image optimization, and support burden.', 'External URLs can introduce privacy, CSP, performance, or mixed-content risk.'],
    howTo: ['Extract a reusable `MarketplaceImageField` supporting asset picker, manual allowed URL, preview, remove, alt/purpose guidance, and validation status.', 'Use it for banner, hero desktop/mobile images, block banners, category promotional images, and maintenance illustration as appropriate.', 'Restrict schemes/domains according to public asset policy and display actual dimensions/file size/type.', 'Provide crop/focal-point/aspect guidance rather than mutating the source unexpectedly.', 'Store stable asset references or normalized public URLs and verify deletion/reference behavior.'],
    acceptance: ['Admins can select an existing platform asset for every Hub promotional image field.', 'Invalid/unsafe URLs cannot be saved silently.', 'Preview uses the same normalized/optimized URL behavior as the Hub.', 'Desktop/mobile aspect and missing-alt warnings are clear before save.'],
    related: ['AS-15 — image dimension/aspect validation.', 'AS-23 — safe structured editors.'],
    tags: ['enhancement', 'admin-settings', 'assets', 'images', 'authoring'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-05', folder: FOLDERS.settings, sortOrder: 5,
    title: 'Replace raw rewards JSON with a validated prize editor', priority: 'high', classification: 'Verified bug',
    scope: 'Rewards widget prize configuration',
    finding: '`rewards_widget_prizes_json` is edited/stored as a string and backend validation only trims and caps it at 20,000 characters. Invalid JSON, duplicate codes, impossible discounts, unsafe colors/copy, or semantically incomplete prizes can be persisted and fail later in the buyer widget.',
    evidence: ['Settings defaults contain a long JSON array string and the page treats the setting as text.', '`backend/src/api/admin.route.ts` validates the field with `z.coerce.string().trim().max(20000)` only.', '`GamifiedRewardsWidget.tsx` parses the value at runtime in a try/catch, moving validation failure to the public experience.'],
    reproduce: ['Enter malformed JSON and attempt save.', 'Enter a valid but wrong-shaped object/array with missing label/code, duplicate code, negative/huge discount, or invalid color.', 'Load the buyer rewards widget and inspect fallback/error behavior.'],
    rootCause: ['A domain object is transported as an opaque string through frontend, API, and database.', 'Validation is deferred to the runtime consumer instead of enforced at the authoring boundary.'],
    impact: ['A single admin typo can break or silently degrade a buyer-facing retention feature.', 'Duplicate/invalid incentives can create financial, legal, and support exposure.'],
    howTo: ['Define a shared Zod/domain schema for prize type, label translations, code, value, constraints, icon, color, description, probability/eligibility, and enabled state.', 'Build a list editor with add/duplicate/reorder/delete, inline validation, unique-code enforcement, and computed preview.', 'Validate again on the backend and persist a structured JSON value or a versioned serialized schema.', 'Provide a safe migration/parser for existing arrays and refuse destructive conversion when legacy data is invalid.', 'Connect configured prizes to actual promotion eligibility and show warnings for unknown/expired codes.'],
    acceptance: ['Malformed or semantically invalid prize data cannot be persisted.', 'Existing valid prizes migrate without loss.', 'Every configured prize renders correctly in preview and buyer widget.', 'Duplicate or unavailable promotion codes are flagged before publication.'],
    related: ['AS-23 — shared structured editor safety.', 'AS-24 — schema single source.'],
    tags: ['bug', 'admin-settings', 'rewards', 'validation', 'financial-risk'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-06', folder: FOLDERS.settings, sortOrder: 6,
    title: 'Make Settings search navigate to real matching controls', priority: 'high', classification: 'Verified bug',
    scope: 'Superadmin Settings search/filter',
    finding: 'The Settings Control Center updates `searchQuery` and renders a clear button, but no sections, tabs, labels, descriptions, or controls consume the value. The advertised real-time filter is a dead feature.',
    evidence: ['`searchQuery` is declared and bound to the header input in `settings/page.tsx`.', 'Repository search shows no filtering/highlighting/navigation logic based on `searchQuery`.'],
    reproduce: ['Type exact labels such as logo, SMTP, maintenance, commission, or hero.', 'Observe that the active tab and visible controls do not change, highlight, or show results.'],
    rootCause: ['Controls are generated ad hoc without a searchable settings metadata registry.', 'The input was added before result and navigation behavior were implemented.'],
    impact: ['Creates false affordance and slows operators in a very long multi-domain page.', 'Keyboard and screen-reader users receive no result count/status.'],
    howTo: ['Create a typed registry for setting key, localized label, description, aliases, section, anchor, and permissions/capability.', 'Debounce/filter locally, show grouped results with count, and allow Enter/click to activate the target tab and focus/scroll the control.', 'Highlight the matched section without hiding unrelated content unexpectedly; provide a clear no-results state and suggested terms.', 'Index SMTP, plans, template actions, and explanatory sections even when they are not platform setting keys.', 'Expose combobox/listbox semantics, arrow navigation, Escape, and an `aria-live` result summary.'],
    acceptance: ['Searching a known key or alias shows and navigates to the correct control.', 'No-results and cleared states are explicit.', 'Keyboard-only and screen-reader interaction follows combobox expectations.', 'Search respects permissions/layout capability and does not expose hidden sensitive values.'],
    related: ['AS-09 — discoverability.', 'LA-02 — settings control accessibility.'],
    tags: ['bug', 'admin-settings', 'search', 'navigation', 'a11y'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-07', folder: FOLDERS.settings, sortOrder: 7,
    title: 'Verified: empty SMTP password preserves the saved credential', priority: 'low', classification: 'Verified / no defect',
    scope: 'SMTP settings secret preservation',
    finding: 'The current SMTP flow explicitly tells the operator that an empty password keeps the existing credential, omits/reuses it on the backend, and clears the local password after a successful replacement. The old credential-clearing defect is not present.',
    correction: 'Do not change empty-password semantics to clear the secret. A destructive “remove credential” action must be explicit, separately authorized, and audited.',
    evidence: ['The UI displays “Password is set; leave empty to keep it.” when `smtp_pass_set` is true.', '`handleSmtpSave()` sends the form and then clears only the local entered password after success.', 'SMTP service behavior was previously verified; production note is completed with 4/4 checklist items.'],
    reproduce: ['Load an existing SMTP configuration, leave password empty, change a non-secret field, save, and run the connection test.', 'Replace the password, save, reload, and confirm only the set-state is returned.', 'Attempt the explicit credential-removal workflow if/when one exists.'],
    rootCause: ['No active defect; earlier analysis assumed a full replace without checking service merge semantics.'],
    impact: ['Preserving this verified behavior prevents accidental secret deletion and avoids reintroducing a security regression.'],
    howTo: ['Keep empty-as-preserve semantics and never return the stored secret.', 'Add a distinct confirmed “clear password” operation if product requirements need it.', 'Retain integration tests around merge, replacement, test connection, and audit redaction.'],
    acceptance: ['Saving with an empty password leaves the existing credential usable.', 'Replacing a password works and the secret is not returned to the browser.', 'Completed status and 4/4 checklist remain preserved.'],
    related: ['SO-03 — audit-log secret redaction.'],
    tags: ['verified', 'admin-settings', 'smtp', 'security', 'no-defect'], verifiedComplete: true,
  }),
  n({
    externalId: 'AS-08', folder: FOLDERS.settings, sortOrder: 8,
    title: 'Extend the existing hero preview into an accurate cross-layout draft preview', priority: 'normal', classification: 'Enhancement',
    scope: 'Hub banner, hero, and homepage block preview',
    finding: 'The old “no live preview” claim is stale: `HeroCarouselEditor` already renders a preview. The remaining gap is fidelity and scope—banner fields, block order, typography, responsive crops, localization, and non-Alibaba layouts are not previewed as the actual Hub will render them.',
    correction: 'Preserve and build on the existing hero preview; do not create a duplicate preview widget that models a different schema.',
    evidence: ['`frontend/src/components/admin/HeroCarouselEditor.tsx` includes preview rendering for the selected slide.', '`HomepageBlocksEditor` edits multiple layout blocks, while Settings has separate global banner fields and layout selection.', 'Actual Hub layouts consume settings differently and use runtime tokens/localized data not fully represented in the editor preview.'],
    reproduce: ['Edit a hero slide and compare the existing preview with Alibaba desktop/mobile runtime.', 'Change global banner fields or block ordering and note which changes have no corresponding live preview.', 'Switch layout/locale/theme and compare preview fidelity.'],
    rootCause: ['Preview is local to one editor rather than driven by the production layout resolver and normalized draft settings.', 'The settings page lacks an isolated draft-preview route/data source.'],
    impact: ['Admins can still publish crops, text overflow, contrast, ordering, or layout-specific settings they did not anticipate.', 'A second hand-built preview would drift further from production.'],
    howTo: ['Create an authenticated preview route/frame that renders the real selected Hub layout with an in-memory/versioned draft payload.', 'Add desktop/tablet/mobile and FR/EN/AR controls, light/dark theme where supported, and safe sample/real catalog data selection.', 'Use postMessage or a draft token with strict origin/auth checks; never place sensitive settings in public URLs.', 'Show unsupported-setting warnings from the capability matrix and validation overlays for crop, overflow, contrast, and missing content.', 'Keep the existing inline slide preview as a fast editor aid, but label its fidelity and link to full preview.'],
    acceptance: ['Full preview uses production layout components and draft values without public save.', 'Admins can inspect every layout, locale, and target viewport relevant to the changed setting.', 'Unsupported controls and validation problems are visible before publish.', 'Preview access is authenticated, expires, and does not leak secrets.'],
    related: ['PI-01 — staged publish/rollback.', 'PI-03 — preview lab.', 'HC-01 — capability matrix.'],
    tags: ['enhancement', 'admin-settings', 'preview', 'hub', 'responsive'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-09', folder: FOLDERS.settings, sortOrder: 9,
    title: 'Reorganize Hub appearance settings around operator tasks and dependencies', priority: 'normal', classification: 'Improvement',
    scope: 'Settings information architecture and theme/layout discoverability',
    finding: 'Theme, colors, homepage layout, pagination, mega-menu, blocks, and Alibaba-only hero controls are distributed through a long Marketplace tab. Their relationships and layout scope are unclear, making it easy to configure an option that has no effect.',
    evidence: ['The Marketplace tab contains multiple large hidden/mounted sections in source order.', 'Homepage layout remains a plain select and Alibaba B2B controls are shown as part of the same broad tab.', 'The Settings search is currently non-functional and no capability warnings link controls to consuming layouts.'],
    reproduce: ['Ask an operator to change the Hub layout, brand colors, hero slides, and sponsored block order without source knowledge.', 'Measure scrolling/backtracking and count settings whose scope cannot be inferred from the label.'],
    rootCause: ['Information architecture follows implementation history and storage keys rather than operator workflows.', 'There is no summary/navigation within Marketplace appearance configuration.'],
    impact: ['Slower, error-prone administration and increased support dependence.', 'Hidden/dead controls are more likely to be saved without verification.'],
    howTo: ['Split or sub-navigate Marketplace into Identity, Theme & tokens, Homepage composition, Navigation/taxonomy, Sponsored content, and Public links.', 'Place layout selection and preview first, then reveal layout-compatible settings contextually.', 'Add sticky section navigation, completion/error badges, and “used by” dependency text sourced from HC-01.', 'Preserve URLs/anchors for deep links and Settings search results.', 'Keep advanced controls collapsible but searchable; do not hide validation errors in collapsed sections.'],
    acceptance: ['A new operator can locate a requested Hub control without scanning the full page.', 'Layout-specific controls are clearly labeled and conditionally visible/disabled with explanation.', 'Deep links/search focus the exact section.', 'Reorganization does not reset drafts or change stored values.'],
    related: ['AS-06 — functional search.', 'AS-11 — visual layout selector.', 'HC-01 — capability matrix.'],
    tags: ['improvement', 'admin-settings', 'information-architecture', 'discoverability'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-10', folder: FOLDERS.settings, sortOrder: 10,
    title: 'Require an impact-aware confirmation before enabling maintenance mode', priority: 'high', classification: 'Enhancement',
    scope: 'Platform maintenance controls and availability risk',
    finding: 'Maintenance mode can be toggled within the same generic settings flow without a dedicated confirmation that explains buyer/seller impact, current schedule/message, administrator bypass behavior, or publication result.',
    evidence: ['Maintenance settings use the generic `renderToggle()` and global/section save path.', 'Backend invalidates maintenance cache when a `maintenance_` key changes, but the UI does not preview the effective maintenance experience or require typed confirmation.'],
    reproduce: ['Toggle maintenance mode and save as an authorized admin.', 'Observe whether the UI summarizes affected hosts/routes, start/end timing, bypass access, and rollback action.', 'Simulate cache invalidation failure.'],
    rootCause: ['A high-impact availability control is modeled like an ordinary boolean.', 'There is no dedicated command workflow or two-step publish contract.'],
    impact: ['An accidental click/save can take buyer/vendor surfaces offline or display incomplete messaging.', 'Operators may believe mode is active/inactive when propagation failed.'],
    howTo: ['Use a dedicated maintenance action card with current effective state, schedule, message/illustration preview, affected surfaces, and bypass rules.', 'When enabling immediate maintenance, require explicit confirmation (and optional typed phrase/reason according to policy); when scheduling, validate timezone and conflicts.', 'Save/publish maintenance independently from unrelated settings and await propagation.', 'Record reason, actor, before/after, schedule, and result in immutable audit history.', 'Provide a prominent tested “end maintenance” rollback action and emergency API/runbook.'],
    acceptance: ['Maintenance cannot be enabled through an accidental generic save.', 'Confirmation shows exact impact and effective time in the operator timezone.', 'The UI reports persistence and propagation separately.', 'Enable/disable actions have complete audit records and a tested rollback.'],
    related: ['HR-02 — save/publication result.', 'SO-02 — privileged settings permissions.', 'PI-01 — scheduling and rollback.'],
    tags: ['enhancement', 'admin-settings', 'maintenance', 'safety', 'availability'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-11', folder: FOLDERS.settings, sortOrder: 11,
    title: 'Replace the homepage layout select with visual, capability-aware choices', priority: 'normal', classification: 'Enhancement',
    scope: 'Homepage layout selection',
    finding: 'The homepage layout is selected from a plain text `<select>`. Names such as “Deals,” “Premium deals,” “Alibaba B2B,” and “Amazon classic” do not explain visual structure, supported controls, responsive behavior, or the relationship to `theme_default`.',
    evidence: ['`settings/page.tsx` renders six text options in `hub_homepage_layout`.', 'The five runtime layouts have substantially different block, pagination, sponsored, carousel, and theming capabilities.'],
    reproduce: ['Open Settings without prior source knowledge and choose a layout based only on option labels.', 'Compare expected result with actual Hub and note unsupported settings that remain visible.'],
    rootCause: ['Layout selection is treated as an enum field rather than a product-level appearance decision.', 'No thumbnail/description/capability metadata is shared between Settings and runtime resolver.'],
    impact: ['Higher chance of selecting the wrong template or expecting unsupported controls.', 'Operators must save and visit the public site repeatedly to compare layouts.'],
    howTo: ['Define a typed layout manifest with ID, localized name, description, thumbnail, intended use, supported blocks/settings, and status.', 'Render a keyboard-accessible radio-card grid with a clear selected state and a link to full preview.', 'Explain `theme_default` by showing the currently resolved layout for the selected marketplace theme.', 'Warn about settings that will become inactive before switching and preserve them unless explicitly discarded.', 'Include mobile/desktop thumbnails generated from maintained fixtures, not marketing images that drift from production.'],
    acceptance: ['Each layout can be compared visually and by capability before selection.', 'Radio cards have correct group/checked semantics and work at mobile/zoom sizes.', 'Switch warnings list inactive settings without deleting them.', 'Theme-default resolution is explicit and tested.'],
    related: ['HC-01 — capability manifest.', 'AS-08/PI-03 — real preview.'],
    tags: ['enhancement', 'admin-settings', 'layout', 'preview', 'a11y'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-12', folder: FOLDERS.settings, sortOrder: 12,
    title: 'Remove or formally define the duplicate global commission setting', priority: 'high', classification: 'Verified bug',
    scope: 'Platform finance settings and order commission calculation',
    finding: 'Settings labels `platform_commission_rate` as “Free Plan Commission Rate,” while live order commission behavior is plan-driven through subscription plan rates. The global value appears dead or misleading and can diverge from the authoritative plan configuration.',
    evidence: ['Finance Settings renders `platform_commission_rate` as an editable percentage.', 'Current order/subscription commission flows use normalized subscription plan configuration rather than this broad global field (verified during source audit).', 'No clear precedence or consumer is documented in the Settings UI.'],
    reproduce: ['Change the global commission rate without changing plan rates and create/test orders under Free and paid plans.', 'Trace the computed commission and identify whether any production path consumes the global value.', 'Compare exports/reports/settings labels for conflicting rates.'],
    rootCause: ['A legacy global key remained after commission logic moved to per-plan configuration.', 'Settings lacks provenance/consumer metadata and cannot identify unused keys.'],
    impact: ['Admins may believe they changed seller fees when billing remains unchanged.', 'Incorrect fee expectations create contractual, accounting, and support risk.'],
    howTo: ['Complete a code/database/report audit of every read/write of `platform_commission_rate` and document any migration dependency.', 'If unused, remove it from UI/API/defaults after a deprecation period and preserve history; if used as a fallback, define exact precedence and rename it truthfully.', 'Use one commission service/config source for checkout, order records, invoices, dashboards, refunds, and reporting.', 'Show effective rate and source for each plan and validate 0–100 plus currency/tax rounding rules.', 'Add financial regression tests and reconcile sample order totals before rollout.'],
    acceptance: ['There is one documented authoritative commission source for every seller plan.', 'Changing the displayed rate changes the actual calculated rate or the control is removed.', 'Historical orders retain their captured commission values.', 'Reports, invoices, and refunds reconcile to the same rule.'],
    related: ['AS-24 — schema/default governance.', 'QA-01 — financial/settings regression coverage.'],
    tags: ['bug', 'admin-settings', 'finance', 'commission', 'dead-setting'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-13', folder: FOLDERS.settings, sortOrder: 13,
    title: 'Make seller-rail controls explicitly layout-aware', priority: 'normal', classification: 'Improvement',
    scope: 'Alibaba hero seller rail settings',
    finding: 'Seller-rail visibility and copy controls are presented within broad Marketplace settings, but their current runtime consumer is the Alibaba B2B hero. In other layouts the fields can be edited and saved with no visible effect.',
    evidence: ['Settings labels the section “Alibaba B2B Hero Section.”', '`AlibabaHomeContent.tsx` consumes `hub_hero_show_seller_rail` and seller-rail copy/CTA settings.', 'Other layouts use different seller acquisition content or none.'],
    reproduce: ['Select Classic/Amazon/AliExpress, edit seller-rail fields, save, and inspect the Hub.', 'Switch back to Alibaba and see the preserved values become active.'],
    rootCause: ['Layout-specific settings share one global form without capability gating.', 'Stored inactive values are not distinguished from broken settings.'],
    impact: ['Operators can waste time and misdiagnose a save/runtime bug.', 'Future layouts may accidentally consume incompatible copy without an explicit contract.'],
    howTo: ['Use the layout capability matrix to show seller-rail controls only when Alibaba is selected, or display them disabled with a clear “Alibaba only” explanation.', 'Preserve inactive values and indicate they will reactivate when returning to Alibaba.', 'If seller acquisition is desired across layouts, define a separate semantic seller-CTA block with per-layout renderers.', 'Validate CTA URL/label and authenticated routing against HH-14.', 'Include scope in search results, audit change summary, and preview.'],
    acceptance: ['The UI never implies seller-rail settings affect unsupported layouts.', 'Values persist safely across layout switches.', 'Alibaba preview/runtime reflects the configured content.', 'Any cross-layout seller CTA uses an explicit shared block contract.'],
    related: ['HC-01 — capability matrix.', 'HH-14 — seller CTA routing.'],
    tags: ['improvement', 'admin-settings', 'alibaba', 'seller-rail', 'layout-scope'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-14', folder: FOLDERS.settings, sortOrder: 14,
    title: 'Provide per-section discard and narrowly scoped reset actions', priority: 'normal', classification: 'Enhancement',
    scope: 'Settings reset/discard behavior',
    finding: 'The floating reset action replaces the entire platform settings object with `savedSettings`, regardless of the active tab. There is no clear per-section discard, and global reset can silently remove drafts in hidden sections.',
    evidence: ['The fixed bottom action calls `setSettings(savedSettings)`.', 'Dirty status in the main header is active-section-specific, creating a mismatch between what appears dirty and what Reset affects.'],
    reproduce: ['Create drafts in two platform tabs, view one, press Reset, and inspect both tabs.', 'Compare the action wording with the scope of discarded changes.'],
    rootCause: ['Reset was implemented against the global state container rather than the active settings domain.', 'No confirmation summarizes affected dirty keys.'],
    impact: ['Can destroy unrelated unsaved work and undermines trust in reversible editing.', 'Operators may avoid experimentation because recovery behavior is unclear.'],
    howTo: ['Implement “Discard changes in [section]” using that section’s key list and saved snapshot.', 'List the number/names of changed fields and confirm only when there are meaningful edits.', 'Offer a separate global discard only from a global draft summary and explicitly enumerate affected sections.', 'Handle SMTP/templates/plans with their own reset semantics rather than platform-state reset.', 'Restore field validation/error state consistently and return focus to the initiating action.'],
    acceptance: ['Section discard changes only the active section.', 'Hidden drafts remain intact unless a confirmed global discard is used.', 'Action labels name their scope and are disabled when nothing in scope is dirty.', 'Discard works with keyboard/screen reader and preserves saved server values.'],
    related: ['AS-02 — draft tracking.', 'AS-21 — action bars.'],
    tags: ['enhancement', 'admin-settings', 'reset', 'drafts', 'data-safety'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-15', folder: FOLDERS.settings, sortOrder: 15,
    title: 'Validate Hub image dimensions, crop, focal point, and delivery budget', priority: 'normal', classification: 'Enhancement',
    scope: 'Banner, hero, category, logo, and block imagery',
    finding: 'Image fields validate mostly as URLs. They do not communicate required aspect ratios, safe text zones, mobile crops, dimensions, file weight, animation, transparency, or focal point, so a syntactically valid image can render poorly or cause excessive transfer.',
    evidence: ['Public-link validation accepts relative/http(s) URLs but does not inspect image metadata.', 'Layouts use different hero/card aspect ratios and some support separate mobile hero images.', 'Asset previews do not provide production-layout crop overlays for every target.'],
    reproduce: ['Use portrait, ultrawide, tiny, huge, animated, transparent, and text-heavy images in banner/slide fields.', 'Inspect all layouts at 320 px, tablet, desktop, and high-DPR displays.'],
    rootCause: ['The settings model stores an image URL without a media-purpose schema.', 'Layout-specific requirements are implicit in CSS.'],
    impact: ['Clipped text/products, unreadable overlays, layout shift, bandwidth waste, and inconsistent brand presentation.', 'Admins discover problems only after publication.'],
    howTo: ['Define media-purpose profiles with recommended/min dimensions, ratio/range, max bytes, allowed MIME/animation, responsive variants, and safe-area overlay.', 'Read metadata from managed assets and validate remote images through a secure server-side metadata/proxy path if remote URLs remain allowed.', 'Support focal point and optional desktop/mobile assets; preview actual crops for every consuming layout.', 'Warn for suboptimal but usable assets and block unsafe/unsupported formats or extreme sizes.', 'Ensure optimized variants are generated and invalidated when assets change.'],
    acceptance: ['Every promotional image field displays its target requirements before selection.', 'Invalid/unsafe images cannot be silently published.', 'Admins can preview desktop/mobile crops and set a focal point where needed.', 'Delivered images meet agreed format, dimension, and byte budgets.'],
    related: ['AS-04 — asset picker.', 'AS-08/PI-03 — preview.'],
    tags: ['enhancement', 'admin-settings', 'images', 'validation', 'performance'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-16', folder: FOLDERS.settings, sortOrder: 16,
    title: 'Lazy-load heavy settings domains while preserving drafts', priority: 'low', classification: 'Improvement',
    scope: 'Settings page mount/render/request performance',
    finding: 'The old claim that all nine tabs independently fetch on mount is overstated. Most platform sections are one mounted component tree, but every hidden section is still rendered, and SMTP configuration is fetched immediately even when Email is never opened. Heavy editors/managers may therefore increase initial render and request cost.',
    correction: 'Optimize measured expensive domains; do not unmount every tab blindly because current mounted state is what preserves drafts.',
    evidence: ['All tab sections remain in the DOM with `hidden` classes.', 'SMTP config `useEffect` runs on page mount regardless of `activeTab`.', 'Homepage editors, plan management, email template manager, and many controls live in one large settings page module.'],
    reproduce: ['Profile initial Settings render/network/bundle with Marketplace active.', 'Record whether SMTP/templates/plans/editor code/data loads before its tab is opened.', 'Create drafts and test any lazy-mount prototype for state loss.'],
    rootCause: ['The page is a monolith with shared local state and eager child mounting.', 'No per-domain loader/cache/draft boundary exists.'],
    impact: ['Slower admin interaction on lower-end devices and unnecessary sensitive/configuration requests.', 'Naive optimization can regress draft persistence.'],
    howTo: ['Measure bundle, render, and request cost by domain before splitting.', 'Lazy-load SMTP, template, plan, and complex editor modules/data on first activation; cache their loaded state for the session.', 'Keep drafts in parent/domain stores so a component can unmount/remount safely.', 'Use lightweight placeholders with stable height and accessible status.', 'Prefetch only when likely/useful, and avoid duplicate requests on tab revisit.'],
    acceptance: ['Initial Settings route no longer fetches SMTP or loads heavy inactive domains unnecessarily.', 'First tab activation has a clear bounded loading state.', 'Drafts survive tab switches and lazy remounts.', 'Measured initial JS/render/request cost improves without accessibility regression.'],
    related: ['AS-02 — draft ownership.', 'QA-01 — performance regression coverage.'],
    tags: ['improvement', 'admin-settings', 'performance', 'lazy-loading'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-17', folder: FOLDERS.settings, sortOrder: 17,
    title: 'Link successful settings changes to a filtered audit record', priority: 'low', classification: 'Enhancement',
    scope: 'Settings save confirmation and audit traceability',
    finding: 'State-changing admin requests are generically audit-logged, but Settings success UI only says saved and does not provide a stable audit entry ID/link, changed-key summary, actor/time, or before/after values.',
    evidence: ['Global `auditLog` middleware records non-safe admin requests after response.', '`handleSave()` displays a temporary success label but the settings endpoint response contains no audit entry reference.', 'Generic audit action is route-based and body-based; settings handler logs updated keys separately to application logs.'],
    reproduce: ['Save a settings section and attempt to locate the exact record in the Audit Log UI.', 'Compare the save response, success message, middleware entry, and server logger record.'],
    rootCause: ['Audit write is fire-and-forget generic middleware and not part of the domain response contract.', 'Settings service does not create a structured before/after change set with a returned audit identifier.'],
    impact: ['Operators and reviewers spend time correlating actions and cannot quickly verify what changed.', 'Generic body snapshots may be incomplete, overly broad, or unsafe for secrets.'],
    howTo: ['Create a domain settings-change audit record containing section, changed keys, redacted before/after, actor, request/correlation ID, persistence result, and publication result.', 'Return the audit ID/change summary with the save response after durable write.', 'Show “View change in audit log” and a concise changed-key summary in the success state.', 'For sensitive fields record “changed/cleared/preserved,” never secret values.', 'Allow rollback linkage to a prior version when PI-01 is implemented.'],
    acceptance: ['Every successful settings change has one discoverable domain audit record.', 'The success UI links directly to it and names the changed section/keys.', 'Sensitive values are never persisted in audit metadata.', 'Failed/no-op saves are represented accurately.'],
    related: ['SO-03 — secret redaction.', 'PI-01 — version/rollback history.'],
    tags: ['enhancement', 'admin-settings', 'audit-log', 'traceability'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-18', folder: FOLDERS.settings, sortOrder: 18,
    title: 'Remove deployment-specific public URL defaults and verify canonical origin', priority: 'high', classification: 'Verified bug',
    scope: 'Marketplace public URL configuration',
    finding: 'The settings/default stack contains a deployment-specific public URL fallback rather than deriving a verified canonical origin from deployment configuration. If saved or consumed, it can generate incorrect links, metadata, emails, callbacks, or previews.',
    evidence: ['`marketplace_public_url` exists in duplicated frontend/backend defaults/configuration.', 'Earlier repository notes identified a non-production preview domain in defaults; current behavior must be resolved from environment/verified domain rather than a developer host.', 'JSON-LD, public links, emails, and preview flows depend on a trustworthy canonical URL.'],
    reproduce: ['Inspect the effective setting in a new environment with no database override.', 'Generate a public email/metadata/canonical link and compare it to the expected production domain.', 'Try a development/preview host and inspect warnings.'],
    rootCause: ['Environment-specific data was encoded as an application default.', 'There is no verified-origin state distinguishing inferred, configured, and validated domains.'],
    impact: ['Broken SEO, auth/payment callbacks, emails, share links, and cross-origin behavior.', 'Potential phishing/trust issue if users are sent to an unintended host.'],
    howTo: ['Make deployment environment/canonical host configuration the authoritative fallback; do not hardcode a preview domain in source.', 'Store only intentional admin override and show its provenance/effective value.', 'Validate HTTPS, normalized origin, allowed domains, no path/query, and optional DNS/domain verification.', 'Warn/block known local/preview domains in production and show consumers impacted by a change.', 'Test canonical generation, emails, OAuth/payment callbacks, assets, and revalidation across environments.'],
    acceptance: ['A fresh production deployment resolves to the approved canonical origin.', 'Preview/local origins cannot be accidentally published as production.', 'All public URL consumers use the same normalized source.', 'Changing the origin is permissioned, audited, previewed, and reversible.'],
    related: ['HH-13 — SEO metadata.', 'SO-02 — privileged setting permissions.', 'AS-24 — defaults governance.'],
    tags: ['bug', 'admin-settings', 'public-url', 'deployment', 'security'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-19', folder: FOLDERS.settings, sortOrder: 19,
    title: 'Add safe copy actions and masking for operational payment identifiers', priority: 'low', classification: 'Improvement',
    scope: 'Mandat/payment configuration operator ergonomics',
    finding: 'Frequently copied payment/mandat identifiers are plain inputs without dedicated copy feedback. Operators may manually select incomplete text, while sensitive values also need clear masking/reveal policy rather than indiscriminate copying.',
    evidence: ['Mandat/payment fields in Settings use generic text inputs.', 'No consistent reusable copy button or success announcement is attached to these operational values.'],
    reproduce: ['Attempt to copy long identifiers on desktop/mobile and paste them into a validation target.', 'Use keyboard/screen reader and inspect whether success/failure is announced.'],
    rootCause: ['Generic form controls do not include operational affordances or sensitivity metadata.', 'Copy behavior is not centralized.'],
    impact: ['Transcription errors can delay payment reconciliation and support work.', 'Poorly designed copy/reveal controls can expose secrets.'],
    howTo: ['Classify fields as public identifier, sensitive identifier, or secret.', 'Add a reusable labeled copy button for eligible values using the Clipboard API with a fallback and non-intrusive live-region feedback.', 'Mask sensitive identifiers by default with a permissioned reveal; never provide copy for stored secrets that are not returned.', 'Keep the input label, copy control, and status programmatically associated.', 'Audit reveal/copy only when policy requires it, without logging the copied value.'],
    acceptance: ['Eligible full values copy correctly on supported desktop/mobile browsers.', 'Success/failure is announced and focus remains stable.', 'Secrets are never exposed merely to support copying.', 'RTL and long values do not overflow the field/control row.'],
    related: ['SO-03 — secret handling.', 'LA-02 — accessible controls.'],
    tags: ['improvement', 'admin-settings', 'clipboard', 'payments', 'operator-ux'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-20', folder: FOLDERS.settings, sortOrder: 20,
    title: 'Improve mobile tab overflow, orientation, and active-tab visibility', priority: 'low', classification: 'Improvement',
    scope: 'Settings navigation on narrow/touch screens',
    finding: 'The settings tab strip is horizontally scrollable with a custom scrollbar, but there are no edge fades, previous/next affordances, active-tab auto-scroll, or orientation/position semantics. Additional tabs can be easy to miss on touch devices.',
    evidence: ['The tab container uses `overflow-x-auto` and thin scrollbar styling.', 'Tab buttons are ordinary buttons without `role=tab`, `aria-selected`, roving focus, or `aria-controls`.'],
    reproduce: ['Open Settings at 320–390 px width and navigate to tabs beyond the first viewport.', 'Reload/deep-link to a later tab and check whether the selected button is visible.', 'Use keyboard arrow keys and a screen reader.'],
    rootCause: ['The navigation is styled as pills but has neither a complete tab pattern nor a mobile overflow pattern.', 'Selected-tab visibility is left to manual scrolling.'],
    impact: ['Operators may not discover Plans/Email/integrations and can lose context after selection.', 'Keyboard behavior does not match a visual tab interface.'],
    howTo: ['Choose and implement one semantic model: true tabs with tablist/tab/tabpanel and roving arrows, or navigation buttons/links with clear current-page state.', 'Auto-scroll the active item into view without disorienting motion; honor reduced motion.', 'Add edge fades/scroll buttons or an overflow menu with accessible labels and disabled states.', 'Preserve sticky header space, touch targets, and focus visibility.', 'Support deep links/query/hash so reload returns to the selected domain.'],
    acceptance: ['Every tab is discoverable and reachable at 320 px without precision scrolling.', 'The active tab is visible after click, keyboard navigation, and reload.', 'Semantics match behavior and screen readers announce selection.', 'No horizontal page overflow or sticky-header obstruction occurs.'],
    related: ['AS-09 — information architecture.', 'LA-02 — settings semantics.'],
    tags: ['improvement', 'admin-settings', 'mobile', 'tabs', 'a11y'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-21', folder: FOLDERS.settings, sortOrder: 21,
    title: 'Scope every sticky action bar to the active settings domain', priority: 'high', classification: 'Verified bug',
    scope: 'Top and floating Settings actions across platform, plans, and email domains',
    finding: 'The top sticky action changes behavior for Email/Plans, but the bottom floating bar always displays platform dirty state, resets platform settings, and calls `handleSave()`. On Email it silently returns because the active tab is not a platform tab; on Plans it presents irrelevant platform status/actions.',
    evidence: ['Bottom bar computes `JSON.stringify(settings) !== JSON.stringify(savedSettings)` regardless of `activeTab`.', 'Its Save button always calls `handleSave`, whose first line returns for Email/Plans.', 'The top action has separate SMTP/Plans branches, so two visible action systems disagree.'],
    reproduce: ['Open Email, change SMTP, then use the bottom Save/Reset controls.', 'Open Plans and inspect the bottom status/actions.', 'Create a hidden platform draft, switch to Email, and observe platform “Unsaved changes” while editing SMTP.'],
    rootCause: ['A legacy global floating toolbar was retained after the page acquired multiple settings domains.', 'Action state/handlers are not represented by a domain adapter.'],
    impact: ['Visible buttons can do nothing or affect hidden data—serious operator trust and accessibility failure.', 'Duplicate sticky controls compete for attention and can cover content.'],
    howTo: ['Remove the duplicate bottom bar or drive one action surface from a typed active-domain controller.', 'Define for each domain: dirty, valid, loading, saving, saved, error, primary action, discard action, and explanatory copy.', 'Plans should expose only plan-specific actions; Email should save SMTP or template changes according to the active subsection.', 'Never show a platform reset/save while another domain is active.', 'Ensure sticky UI does not obscure validation/errors and announce save status.'],
    acceptance: ['Every visible Save/Reset action operates on exactly the visible domain it names.', 'No action silently returns.', 'Plans, Email, and platform tabs report their own dirty/save state.', 'Only one primary sticky action surface is present at a time.'],
    related: ['AS-01 — scoped saves.', 'AS-14 — scoped discard.', 'AS-02 — domain drafts.'],
    tags: ['bug', 'admin-settings', 'action-bar', 'save', 'high'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-22', folder: FOLDERS.settings, sortOrder: 22,
    title: 'Block edits and saves after an authoritative settings-load failure', priority: 'high', classification: 'Verified bug',
    scope: 'Initial Settings load failure and fallback defaults',
    finding: 'The page initializes editable state with `DEFAULT_SETTINGS`. If `/admin/settings` fails, it shows an error but leaves the full default form and save controls available. An operator can save those defaults over real production configuration.',
    evidence: ['`settings` and `savedSettings` initialize to `DEFAULT_SETTINGS`.', 'On fetch failure only `error` is set; controls/actions are not disabled and no `hasLoadedAuthoritativeSettings` guard exists.', '`handleSave()` can normalize and submit the default-filled object.'],
    reproduce: ['Force the settings GET to fail while PUT remains available.', 'Change one visible field or press a save action and inspect the submitted payload/effective configuration.', 'Repeat with AS-01’s global payload behavior.'],
    rootCause: ['UI defaults serve both skeleton/fallback display and authoritative editable state.', 'Load status lacks an unrecoverable/degraded state gate.'],
    impact: ['A transient read outage can trigger widespread configuration overwrite, including security, payments, maintenance, and Hub appearance.', 'Error banner alone is insufficient protection for destructive stale state.'],
    howTo: ['Represent load status explicitly and do not mount/enable editable values until authoritative settings are loaded.', 'On failure, show a blocking retry state with request ID and safe navigation; do not treat defaults as saved data.', 'If read-only cached data is shown, label its timestamp/source and disable save until refreshed.', 'Add a server version/ETag to save requests so stale snapshots are rejected.', 'Guard every save handler/action, not only button disabled styling.'],
    acceptance: ['No settings mutation can be sent before successful authoritative load.', 'Failure state has retry and actionable diagnostics.', 'Cached/stale display, if used, is clearly labeled and non-editable.', 'Automated tests prove GET failure cannot lead to PUT.'],
    related: ['AS-01 — unscoped payload.', 'HR-01 — explicit failure states.'],
    tags: ['bug', 'admin-settings', 'load-failure', 'data-loss', 'high'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-23', folder: FOLDERS.settings, sortOrder: 23,
    title: 'Harden hero and homepage block editors with schema-safe authoring', priority: 'high', classification: 'Verified bug',
    scope: 'HeroCarouselEditor and HomepageBlocksEditor validation/accessibility',
    finding: 'Hero invalid JSON is caught and replaced with an empty slide list in the editor, which can make malformed stored data look like a valid blank configuration and be overwritten. Homepage block validation checks only that JSON is an object; URLs/images/content shapes are weakly validated. Clickable slide rows and block tabs do not consistently implement keyboard/tab semantics, and reset lacks impact confirmation.',
    evidence: ['`HeroCarouselEditor.tsx` parses string JSON inside a catch fallback and continues with an empty list.', '`hub_hero_carousel_slides` backend schema is only a length-limited string; `hubHomepageBlocksSchema` validates JSON object-ness, not the full block schema.', '`HomepageBlocksEditor` uses custom tabs/controls and Reset behavior without a complete semantic tab/confirmation model.'],
    reproduce: ['Seed malformed hero JSON, open Settings, and inspect the apparently empty editor; make another change and save.', 'Enter invalid/unsafe CTA/image URLs or malformed block fields that still form an object.', 'Operate slide selection, reorder, tabs, and reset with keyboard/screen reader.'],
    rootCause: ['Structured domain data is stored as strings and parsed independently in several layers.', 'Editors prioritize permissive recovery over preserving/reporting corrupt source data.', 'Interactive composite widgets were built without shared accessible primitives.'],
    impact: ['Opening/saving Settings can destroy malformed-but-recoverable content without warning.', 'Broken links/images and inaccessible authoring can reach production.', 'Admin cannot distinguish “no slides” from “configuration failed to parse.”'],
    howTo: ['Define versioned shared schemas for hero slides and homepage blocks, including IDs, localized copy, allowed URLs, media fields, visibility, order, and per-layout options.', 'Parse with a result type; on failure display the raw-value error, disable destructive save, and offer download/repair/reset as explicit choices.', 'Validate on every edit and again on backend; return field paths/messages and retain the draft.', 'Use buttons/listbox or tabs with correct roles, keyboard movement, selected state, focus management, and drag/reorder alternatives.', 'Confirm reset with a summary and support undo until save; preserve stable item IDs.'],
    acceptance: ['Malformed stored JSON cannot be silently converted and saved as empty content.', 'Every saved slide/block passes the shared semantic schema.', 'Invalid URLs/media/copy show field-specific errors before save.', 'All editor actions are keyboard/screen-reader operable and Reset is explicit/reversible.'],
    related: ['AS-05 — rewards schema editor.', 'AS-24 — schema single source.', 'AS-08 — preview.'],
    tags: ['bug', 'admin-settings', 'editors', 'json', 'validation', 'a11y'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'AS-24', folder: FOLDERS.settings, sortOrder: 24,
    title: 'Generate frontend, backend, defaults, and section maps from one settings contract', priority: 'high', classification: 'Improvement',
    scope: 'Platform settings schema/default/type governance',
    finding: 'Settings keys, defaults, types, normalization lists, tab-key maps, backend defaults, validation schemas, and public marketplace settings interfaces are duplicated across multiple files. Drift is already visible in dead/partial controls and makes additions easy to implement in only some layers.',
    evidence: ['`settings/page.tsx` contains a large `PlatformSettings` interface, `DEFAULT_SETTINGS`, text/number/boolean key arrays, and `SETTINGS_TAB_KEYS`.', '`frontend/src/types/settings.ts`, `frontend/src/lib/marketplace-settings.ts`, `backend/src/services/platform-config.service.ts`, and `backend/src/api/admin.route.ts` duplicate overlapping definitions/defaults.', 'Runtime consumers support only subsets of stored keys.'],
    reproduce: ['Choose a setting such as hero transition, homepage blocks, public URL, or commission and trace its type/default/validation/section/consumer across files.', 'Compare values and supported enums for discrepancies or missing consumers.'],
    rootCause: ['No canonical machine-readable settings registry drives generated artifacts.', 'Storage, admin form, public exposure, and runtime capability evolved independently.'],
    impact: ['Silent schema drift, unsafe defaults, dead controls, inconsistent validation, and costly reviews/tests.', 'A change can compile in one package while failing only in production data flow.'],
    howTo: ['Create a canonical settings definition with key, type/schema, default, section, sensitivity, public exposure, normalization, permissions, and consumer/capability metadata.', 'Generate or import frontend types/defaults, backend validators/defaults, section maps, and documentation from it while respecting package boundaries.', 'Separate secret settings from public settings at the type level and never serialize them into broad responses.', 'Add a CI parity test that fails on duplicate/unregistered keys, enum/default mismatch, or public exposure without classification.', 'Migrate incrementally by section and keep backward-compatible parsing for stored legacy values.'],
    acceptance: ['A new setting is defined once and all required types/defaults/validation maps derive from it.', 'CI detects orphan/dead/unclassified settings and default/enum drift.', 'Secret/public boundaries are explicit and enforced.', 'Existing production values remain readable throughout migration.'],
    related: ['HC-01 — runtime capability matrix.', 'NG-01 — notes/catalog governance.', 'AS-23 — structured schemas.'],
    tags: ['improvement', 'admin-settings', 'schema', 'defaults', 'governance'],
    verifiedComplete: true,
  }),
];

const crossCuttingNotes: AuditNoteDefinition[] = [
  n({
    externalId: 'HC-01', folder: FOLDERS.contract, sortOrder: 1,
    title: 'Establish a tested settings-to-layout capability matrix', priority: 'urgent', classification: 'Verified reliability risk',
    scope: 'Contract between Superadmin controls and five Hub homepage layouts',
    finding: 'Settings exposes a broad set of colors, blocks, pagination, mega-menu, hero, carousel, seller-rail, and banner controls, but runtime layouts consume different subsets. Without an explicit matrix, the UI cannot tell whether a saved value is active, ignored, or partially supported.',
    evidence: ['Classic does not render shared pagination; only Alibaba receives initial total pages.', 'Alibaba consumes the configurable hero controls; other layouts implement separate carousel behavior.', 'Amazon/Alibaba own internal sponsored blocks while the route also renders outer rails.', 'Hardcoded palette/copy and block support differ across layouts.'],
    reproduce: ['For every marketplace theme/layout, change each Hub-related setting and record the public runtime effect.', 'Compare the result with Settings labels and visibility.', 'Identify settings with no consumer, multiple competing consumers, or layout-specific behavior.'],
    rootCause: ['Settings keys and layout implementations are independent rather than registered capabilities.', 'There is no executable contract/CI check connecting admin controls to public consumers.'],
    impact: ['Dead settings, false promises, regression-prone layout additions, and slow manual audits.', 'Operators cannot safely predict the effect of a change.'],
    howTo: ['Create a typed layout manifest listing supported/required/unsupported settings, blocks, data props, ad slots, tokens, pagination, and carousel features.', 'Use it to drive Settings visibility/help, layout resolver props, preview warnings, and documentation.', 'Add contract tests that set non-default values and assert each declared consumer responds; fail if a stored key is unclassified.', 'Distinguish global shell capabilities from layout-owned capabilities and define one owner per slot.', 'Version the manifest and include migration notes when capability changes make stored values inactive.'],
    acceptance: ['Every Hub appearance key is classified for every layout.', 'Settings accurately shows active/inactive scope.', 'CI fails when a layout or setting is added without capability registration/tests.', 'No sponsored, pagination, hero, or block responsibility has multiple unintended owners.'],
    related: ['HH-04, HH-05, AS-03, AS-13, AS-24, HC-02.'],
    tags: ['contract', 'hub', 'settings', 'layouts', 'urgent'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HC-02', folder: FOLDERS.contract, sortOrder: 2,
    title: 'Remove dead carousel controls or implement them with honest layout scope', priority: 'high', classification: 'Verified bug',
    scope: 'Hero carousel settings and runtime consumers',
    finding: 'Carousel configuration is presented as a rich settings set, but most controls are Alibaba-only and `hub_hero_carousel_transition` is stored/validated without any runtime consumer. Other layouts use hardcoded six-second intervals and separate controls.',
    evidence: ['Alibaba consumes source mode, autoplay, interval, arrows, and dot style.', 'Repository search finds `hub_hero_carousel_transition` only in types/defaults/schema/settings—not in Hub layout rendering.', 'AliExpress and Amazon use fixed `setInterval(..., 6000)` behavior.'],
    reproduce: ['Change transition to slide/fade/zoom and inspect every layout.', 'Change autoplay/interval/dots/arrows while using non-Alibaba layouts.', 'Compare Settings wording to actual runtime effects.'],
    rootCause: ['Settings were added for one layout without an explicit layout prefix/capability declaration.', 'Transition enum was persisted before implementation.'],
    impact: ['Admins save controls that do nothing and cannot trust preview/publication.', 'Multiple carousel engines drift in accessibility and behavior.'],
    howTo: ['Decide product scope: either rename/group controls as Alibaba-only or build a shared carousel configuration consumed by every eligible layout.', 'Implement transition with reduced-motion fallback only if all states remain accessible and performant; otherwise remove/deprecate the dead key.', 'Migrate existing stored values without deleting them until deprecation completes.', 'Use HH-11’s shared carousel controller and the capability manifest.', 'Add telemetry/contract tests proving each visible setting changes runtime behavior.'],
    acceptance: ['No visible control has zero runtime effect.', 'Layout scope is explicit in Settings and preview.', 'Transition behavior, if kept, works and honors reduced motion.', 'Fixed hardcoded carousel intervals are removed where shared configuration is promised.'],
    related: ['HH-11 — accessible carousel.', 'HC-01 — capability matrix.', 'AS-24 — schema governance.'],
    tags: ['bug', 'hub', 'settings', 'carousel', 'dead-setting'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HR-01', folder: FOLDERS.reliability, sortOrder: 1,
    title: 'Do not render fetch failures as an empty marketplace', priority: 'high', classification: 'Verified bug',
    scope: 'Hub server product/category fetch error semantics',
    finding: 'Product and category server helpers catch failures and return empty data. The selected layout then renders a valid-looking empty/sparse marketplace, so buyers and monitoring cannot distinguish an actual empty catalog from backend timeout, invalid response, or service outage.',
    evidence: ['`getTrendingProducts()` and `getMarketplaceCategories()` catch errors and fall back to empty arrays/default totals.', 'The route has no discriminated status passed to layouts.', 'Several public components render empty arrays as normal content.'],
    reproduce: ['Return 500, timeout, malformed JSON, and network failure from product/category endpoints.', 'Compare UI and telemetry to a genuinely empty catalog/category tree.'],
    rootCause: ['Resilience fallback discards error identity and data freshness.', 'UI state contract contains data only, not status/error/source.'],
    impact: ['Outages appear as “no products,” damaging buyer trust and hiding incidents.', 'Automated monitoring may miss revenue-impacting failures.'],
    howTo: ['Return typed `{status,data,errorCode,requestId,staleAt}` results from server fetchers.', 'Use independent boundaries so product failure does not necessarily erase categories and vice versa.', 'Render a localized retry/degraded state; optionally show last-known-good data with an explicit freshness label.', 'Emit structured latency/status/fallback metrics and alert on sustained error/empty anomalies.', 'Keep detailed errors server-side and expose only safe buyer messages/request IDs.'],
    acceptance: ['Real empty and fetch failure have different UI and telemetry.', 'Partial data can render without claiming unavailable sections are empty.', 'Retry/recovery works and stale data is labeled.', 'Monitoring detects sustained product/category delivery failures.'],
    related: ['AS-22 — load failure safety.', 'HH-09 — ad status.', 'QA-01 — failure E2E.'],
    tags: ['bug', 'hub', 'reliability', 'error-state', 'observability'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HR-02', folder: FOLDERS.reliability, sortOrder: 2,
    title: 'Report settings persistence and Hub publication as separate outcomes', priority: 'high', classification: 'Verified bug',
    scope: 'Settings save, cache invalidation, and public propagation',
    finding: 'After settings persistence succeeds, the frontend fires `/api/marketplace/revalidate` without awaiting or inspecting it, then reports “Saved Successfully.” A failed invalidation is invisible even though the Hub may continue showing stale content.',
    evidence: ['`handleSave()` calls `fetch(...revalidate).catch(() => undefined)` after a successful settings response.', 'Save UI sets success immediately and has no publication status/retry.', 'The persistence and revalidation operations use separate requests with no shared correlation ID.'],
    reproduce: ['Allow settings PUT to succeed and force revalidation POST to fail/timeout.', 'Observe the success message and stale public Hub.', 'Repeat across multiple deployments/instances.'],
    rootCause: ['The UI treats a two-stage workflow as one fire-and-forget action.', 'No durable publication job/status exists.'],
    impact: ['Admins believe changes are live when they are not.', 'Support/debugging cannot correlate configuration version with public cache state.'],
    howTo: ['Return a settings version/change ID from persistence.', 'Trigger scoped invalidation server-side or enqueue a durable publish job using that version.', 'Return/display `saved`, `publishing`, `published`, or `publish_failed` states with retry and audit link.', 'Make retries idempotent and verify all target tags/paths/regions reached the version.', 'Alert on publication backlog/failure and keep last successful public version visible.'],
    acceptance: ['The UI never labels a failed propagation as fully published.', 'Operators can retry without duplicating changes.', 'Public Hub can report/verify the expected settings version.', 'Persistence and publication share a correlation/audit record.'],
    related: ['HH-16 — freshness contract.', 'PI-01 — staged publication.'],
    tags: ['bug', 'admin-settings', 'revalidation', 'publication', 'observability'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'HR-03', folder: FOLDERS.reliability, sortOrder: 3,
    title: 'Bound sponsored-ad caching and isolate impression observers per rail', priority: 'high', classification: 'Verified bug',
    scope: 'SponsoredAdsRail cache lifetime and impression correctness',
    finding: '`SponsoredAdsRail` declares a promise cache in component scope with no expiry/invalidation and keeps rejected promises. Its impression effect observes every `[data-sponsored-ad]` in the document, not only elements owned by the current rail. With multiple rails, instances can observe each other and attempt duplicate impression timers/events.',
    evidence: ['`const adFetchCache = new Map<string, Promise<any>>()` is used without timestamp/TTL/delete-on-error.', '`document.querySelectorAll("[data-sponsored-ad]")` is called by every rail instance.', 'The page/layout may render multiple rail instances simultaneously.'],
    reproduce: ['Render multiple rails and instrument observer callbacks/event POSTs per creative.', 'Cause one delivery promise to reject, then remount/retry the same URL.', 'Change campaign eligibility during a long client session and inspect stale cache behavior.'],
    rootCause: ['Cache ownership/lifecycle is implicit and not tied to ad delivery freshness.', 'Observer selection is global instead of ref-scoped.', 'Event idempotency relies on per-instance sets plus random event keys rather than one ownership policy.'],
    impact: ['Stale ads, permanent empty state after transient rejection, duplicated impression attempts, inaccurate billing/analytics, and unnecessary observers.', 'Cross-instance behavior becomes difficult to test.'],
    howTo: ['Move cache to a module/provider with explicit TTL, max size, invalidation, and rejected-promise eviction—or use a tested request cache library.', 'Attach a root ref to each rail and observe only that instance’s current creative elements.', 'Define impression idempotency by campaign/creative/placement/session/view window and enforce it server-side as well.', 'Cancel timers when elements/slides disappear and handle visibility/offscreen state.', 'Add placement-scoped diagnostics for cache hit/miss/age, observer count, and deduplicated events.'],
    acceptance: ['A transient delivery failure can recover on retry/remount.', 'No rail observes another rail’s DOM nodes.', 'One qualifying view produces the intended single impression under the documented policy.', 'Cached inventory expires/invalidates within the campaign freshness target.'],
    related: ['HH-05 — placement ownership.', 'HH-09 — explicit ad states.', 'HH-11 — sponsored autoplay.'],
    tags: ['bug', 'hub', 'ads', 'cache', 'impressions', 'analytics'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'LA-01', folder: FOLDERS.localization, sortOrder: 1,
    title: 'Complete Hub localization and RTL across all layouts', priority: 'high', classification: 'Verified bug',
    scope: 'Hub user-facing copy, formatting, and bidirectional layout',
    finding: 'All layouts still include hardcoded French/English labels, ad copy, stats, endings, banners, and format assumptions. Some strings use fake expressions such as `String("hub.deal") || "Deal"` rather than translations. Layouts therefore provide inconsistent FR/EN/AR experiences.',
    evidence: ['`HubNavbar.tsx` hardcodes `Mon compte` and promotional strip copy.', '`HubHomeContent.tsx`, Amazon/AliExpress/Alibaba components, pagination, SponsoredAdsRail, and CategoryMegaMenu include direct language branches or hardcoded English/French.', 'Currency formatting is frequently manual fixed-decimal string composition.'],
    reproduce: ['Switch FR/EN/AR in every layout and inventory untranslated/mixed-language copy.', 'Test long translated strings, plural counts, numerals/currency, and RTL at mobile/desktop widths.'],
    rootCause: ['Layouts were built independently without a required locale key inventory and shared formatting helpers.', 'Runtime content and admin-entered content lack a consistent localization model.'],
    impact: ['Mixed-language marketplace, RTL clipping/order errors, and inaccurate locale-specific currency/count presentation.', 'Every new layout multiplies translation debt.'],
    howTo: ['Extract all static copy to typed locale dictionaries and use shared number/currency/date/plural formatters.', 'Define localization for admin-authored content: per-locale fields with fallback indicator and completeness status.', 'Replace manual locale ternaries where dictionary keys are appropriate; retain semantic bidi-safe logical CSS.', 'Audit alt text, aria labels, empty/error/loading copy, SEO metadata, and analytics labels.', 'Add pseudo-localization/long-string and Arabic visual tests per layout.'],
    acceptance: ['No buyer-visible Hub string is unintentionally hardcoded/mixed across FR/EN/AR.', 'Currency/count/date formatting follows locale policy.', 'Arabic RTL has correct logical order, focus order, alignment, and no clipping.', 'Missing admin translations use a visible documented fallback.'],
    related: ['HH-07 — footer.', 'LA-02/03/04 — interaction accessibility.', 'QA-01.'],
    tags: ['bug', 'hub', 'i18n', 'rtl', 'localization'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'LA-02', folder: FOLDERS.localization, sortOrder: 2,
    title: 'Add accessible names, roles, and state to Hub and Settings controls', priority: 'high', classification: 'Verified bug',
    scope: 'Cross-surface WCAG control semantics',
    finding: 'Icon-only wishlist/messages/cart links lack accessible names; Settings toggles are buttons without `role=switch`, `aria-checked`, or label association; tab-like controls lack complete semantics; multiple show/hide/copy/clear controls rely on icon or glyph alone.',
    evidence: ['`HubNavbar.tsx` icon links contain only Lucide SVGs.', '`renderToggle()` renders an unlabeled button and visual knob without switch state.', 'Settings tab buttons do not expose `aria-selected`/controls; several editor/navigation composites have incomplete semantics.'],
    reproduce: ['Inspect accessibility tree and navigate HubNavbar/Settings with keyboard and a screen reader.', 'Toggle settings and determine whether name/state are announced.', 'Test focus visibility at 200% zoom and dark mode.'],
    rootCause: ['Visual components were implemented without reusable accessible primitives and IDs.', 'Labels/descriptions are sibling text rather than programmatically associated controls.'],
    impact: ['WCAG AA failures and blocked/ambiguous operation for screen-reader and keyboard users.', 'High-risk settings can be toggled without the user knowing current state.'],
    howTo: ['Give every icon-only link/button a localized accessible name and optional count/state.', 'Implement a shared Switch with label, description, `role=switch`, `aria-checked`, disabled/busy state, and visible focus.', 'Use correct tab/navigation semantics and associate panels, validation messages, hints, and save status.', 'Audit touch targets and focus order across sticky overlays/modals/editors.', 'Add automated axe checks plus manual keyboard/screen-reader verification.'],
    acceptance: ['Every interactive control has a meaningful unique accessible name.', 'Toggle/tab/current/loading/error states are announced correctly.', 'All workflows complete keyboard-only with visible focus and no obstruction.', 'Automated accessibility tests cover Hub navbar/search/pagination and Settings toggles/tabs/editors.'],
    related: ['LA-03 — search combobox.', 'LA-04 — mega-menu.', 'HH-11 — carousel.'],
    tags: ['bug', 'a11y', 'hub', 'admin-settings', 'wcag'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'LA-03', folder: FOLDERS.localization, sortOrder: 3,
    title: 'Make Hub search race-safe and implement the combobox pattern', priority: 'high', classification: 'Verified bug',
    scope: 'Hub search suggestions and keyboard interaction',
    finding: 'Suggestion requests are debounced but not aborted or sequence-guarded, so an older response can overwrite a newer query. Failure and valid no-results both become an empty result list. The input/dropdown lacks the ARIA combobox/listbox/option model, active-descendant navigation, Escape handling, and result-status announcement.',
    evidence: ['`SearchBar.tsx` issues `fetch` and immediately calls `setResults` with no AbortController/request ID.', 'Catch/non-OK set `[]`; UI then renders the same “no results” message.', 'Only Enter-to-search is handled; suggestions cannot be traversed with arrows.'],
    reproduce: ['Throttle requests, type two queries quickly with reversed response timing, and observe result/query mismatch.', 'Force 500/network failure and compare with a valid empty response.', 'Operate suggestions with keyboard/screen reader.'],
    rootCause: ['Debounce limits frequency but does not guarantee response order.', 'Search UI is implemented as input plus links rather than an accessible autocomplete state machine.'],
    impact: ['Buyers can select results unrelated to their current query and cannot efficiently use suggestions without pointer input.', 'Outages masquerade as zero inventory.'],
    howTo: ['Abort superseded requests and also verify a monotonically increasing request/query identity before applying state.', 'Model idle, too-short, loading, success, empty, and error; preserve the last query each response belongs to.', 'Implement the editable combobox/listbox pattern with expanded, controls, active-descendant, option IDs, arrow/Home/End/Enter/Escape, and focus behavior.', 'Use a polite status region for count/loading/error without announcing every keystroke excessively.', 'Cache only bounded safe suggestions by normalized locale/query and invalidate appropriately.'],
    acceptance: ['Older responses never replace newer-query results.', 'Error and empty states are visibly/telemetrically distinct.', 'All suggestions can be reached/selected/dismissed by keyboard and announced correctly.', 'Changing locale/query closes or refreshes stale results safely.'],
    related: ['HR-01 — error semantics.', 'LA-02 — accessible controls.', 'QA-01.'],
    tags: ['bug', 'hub', 'search', 'race-condition', 'a11y'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'LA-04', folder: FOLDERS.localization, sortOrder: 4,
    title: 'Complete mega-menu keyboard, Escape, focus-return, and data ownership', priority: 'high', classification: 'Verified bug',
    scope: 'CategoryMegaMenu interaction and requests',
    finding: 'The trigger exposes `aria-expanded`, but the large portal/menu lacks a complete menu/disclosure keyboard model: no Escape close/focus return, roving navigation, or robust outside-click handling for portaled content. The component also fetches marketplace settings and categories itself, duplicating data already available at the Hub route/navbar layer.',
    evidence: ['`CategoryMegaMenu.tsx` handles click outside and trigger click but no keydown/Escape/focus restoration model was found.', 'It fetches `/marketplace/settings` and `/categories` based on lazy mode/locale despite related settings/categories already being fetched elsewhere.', 'Portal content complicates `menuRef.contains()` ownership.'],
    reproduce: ['Open with keyboard, traverse categories/subcategories, press Escape, Tab out, and check focus return.', 'Click inside/outside portaled content and inspect close behavior.', 'Count settings/category requests on a Hub load.'],
    rootCause: ['A complex disclosure/navigation surface lacks a formal interaction state machine and root ownership spanning trigger/portal.', 'Data fetching is embedded in the component rather than supplied by a shared provider/server payload.'],
    impact: ['Keyboard/screen-reader users can become disoriented or unable to traverse/close the menu.', 'Duplicate requests add latency and can show inconsistent settings/category versions.'],
    howTo: ['Choose disclosure/navigation semantics appropriate to links; implement trigger keys, Escape, focus entry/return, Tab behavior, and active category movement.', 'Use trigger/content refs and portal-aware outside interaction/focus management.', 'Pass normalized category tree and mega-menu settings from a shared server/provider cache; lazy-load only genuinely deferred deeper data.', 'Expose loading/error/empty states and localized instructions/status.', 'Test all four menu visual styles, RTL, mobile alternative, and long category trees.'],
    acceptance: ['Menu fully opens, navigates, closes, and returns focus by keyboard.', 'Portal interactions do not close unexpectedly or trap focus.', 'Hub load does not duplicate identical settings/category requests.', 'All variants retain correct semantics and RTL behavior.'],
    related: ['HH-10 — category visual parity.', 'LA-02 — semantics.', 'HR-01 — data errors.'],
    tags: ['bug', 'hub', 'mega-menu', 'keyboard', 'performance'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'SO-01', folder: FOLDERS.security, sortOrder: 1,
    title: 'Remove and rotate credentials embedded in legacy scripts/history', priority: 'urgent', classification: 'Verified reliability risk',
    scope: 'Repository scripts, production credentials, and incident response',
    finding: 'Legacy Admin Notes scripts were written as production insertion utilities and may contain or encourage embedded connection material/destructive behavior. The new synchronizer is credential-free, but any credential ever committed/shared must be treated as exposed and rotated; `REMOTE_CREDENTIALS.md` must remain protected and unmodified.',
    evidence: ['Current safe synchronizer reads only normal `PD_*` environment variables and contains no credential literal.', 'Legacy note scripts include destructive folder deletion/insertion flows and should not remain the operational source of truth.', 'The protected credential file hash was recorded and must remain unchanged.'],
    reproduce: ['Scan tracked history/current scripts for database URLs, tokens, secrets, and commands that source local credential documents.', 'Review secret-manager/database logs for use of any exposed credential.'],
    rootCause: ['One-off production maintenance scripts bypassed a standard credential and migration/synchronization workflow.', 'Secrets and data-mutation logic were coupled in developer tooling.'],
    impact: ['Unauthorized database access, uncontrolled note deletion/duplication, audit/compliance exposure.', 'Removing a literal from current code alone does not invalidate leaked history.'],
    howTo: ['Rotate any credential that was committed, pasted, logged, or shared beyond its intended boundary; revoke old sessions/keys.', 'Use environment/secret manager injection only and prohibit scripts from reading/printing credential documents in normal operation.', 'Quarantine/deprecate destructive legacy scripts and document the idempotent synchronizer as the sole supported path.', 'Enable secret scanning/pre-commit/CI detection and review history remediation according to incident policy.', 'Audit database access around exposure and record remediation without copying secret values.'],
    acceptance: ['No tracked current file contains active production credentials.', 'Exposed credentials are revoked/rotated and access reviewed.', 'Only the safe idempotent synchronizer is documented for note updates.', '`REMOTE_CREDENTIALS.md` is unchanged and never printed/embedded.'],
    related: ['NG-01 — synchronization governance.', 'SO-03 — audit redaction.'],
    tags: ['security', 'credentials', 'operations', 'urgent'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'SO-02', folder: FOLDERS.security, sortOrder: 2,
    title: 'Create a dedicated privileged permission for platform appearance/settings', priority: 'high', classification: 'Verified reliability risk',
    scope: 'Authorization boundary for platform-wide settings',
    finding: 'The admin router comment says “Super Admin only,” but middleware permits both `admin` and `super_admin` for all routes. Platform settings include maintenance, payments, security, integrations, public URL, and Hub appearance; broad admin access may exceed intended least privilege.',
    evidence: ['`backend/src/api/admin.route.ts` applies `router.use(requireAuth, requireAdmin)`.', '`requireAdmin` equals `requireRole(UserRole.Admin, UserRole.SuperAdmin)`.', 'No dedicated settings/appearance permission guard is attached to GET/PUT settings routes.'],
    reproduce: ['Authenticate as a non-super admin and call/read `/api/pd/admin/settings` and section update endpoints.', 'Compare actual access with product role policy and UI route visibility.'],
    rootCause: ['A broad role middleware protects a heterogeneous router with no capability/permission layer.', 'Comments/product terminology and executable authorization diverged.'],
    impact: ['An admin intended for moderation/support may change platform availability, fees, integrations, or public branding.', 'Compromise of a lower-privilege admin has a larger blast radius.'],
    howTo: ['Confirm the intended role matrix with product/security owners; do not assume every `admin` should be blocked if policy says otherwise.', 'Introduce explicit capabilities such as `platform_settings.read`, `platform_settings.write`, `appearance.publish`, `maintenance.manage`, and `secrets.manage`.', 'Enforce them server-side per endpoint/section and mirror them in UI visibility/action states.', 'Require step-up authentication/2FA for sensitive publication or secret/domain/payment changes as policy dictates.', 'Add authorization tests for superadmin, each admin capability set, vendor, buyer, and unauthenticated access.'],
    acceptance: ['Executable permissions match documented role policy.', 'Unauthorized roles cannot read or mutate restricted settings directly by API.', 'Sensitive domains can be separated from appearance-only administration.', 'Denied attempts are safely audited and tested.'],
    related: ['AS-10 — maintenance safety.', 'PI-01 — publish permission.', 'AS-18 — public origin.'],
    tags: ['security', 'rbac', 'admin-settings', 'least-privilege'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'SO-03', folder: FOLDERS.security, sortOrder: 3,
    title: 'Harden audit-log redaction and settings before/after metadata', priority: 'high', classification: 'Verified bug',
    scope: 'Generic audit middleware and sensitive settings bodies',
    finding: 'Audit middleware recursively redacts exact key names in a small set, but settings include sensitive identifiers/tokens whose names may not exactly match that set (for example client secrets or provider-specific credentials). Generic request-body logging also lacks a safe domain-aware before/after model.',
    evidence: ['`audit-log.middleware.ts` redacts exact lowercase names such as `password`, `secret`, `api_key`, specific provider keys, and tokens.', 'Platform settings include many integration/payment/security keys and future additions can bypass the static set.', 'Middleware logs `req.body` after generic redaction for every state-changing route.'],
    reproduce: ['Enumerate sensitive settings keys and compare each to `REDACT_FIELDS` exact matching.', 'Submit representative secret-like keys not in the set and inspect a non-production audit row.', 'Check nested arrays/objects, which are not recursively redacted element-by-element.'],
    rootCause: ['Sensitivity is inferred from a manually maintained denylist instead of schema metadata/allowlisted audit shape.', 'Generic middleware cannot understand preserve/rotate/clear semantics.'],
    impact: ['Credentials or sensitive configuration could be stored indefinitely in audit logs/backups/exports.', 'Incomplete change context reduces audit usefulness even when no secret leaks.'],
    howTo: ['Classify setting sensitivity in the canonical schema and construct audit metadata from an allowlisted safe change summary.', 'Use defense-in-depth name-pattern redaction for password/secret/token/key/credential plus exact classifications, including arrays and nested objects.', 'For secrets record only `unchanged`, `set`, `rotated`, or `cleared` and provider/field identifier.', 'Add tests that enumerate every sensitive setting and assert no raw value reaches logger/audit serialization.', 'Define retention/export access controls and an incident procedure for historical leaked audit data.'],
    acceptance: ['No secret value can appear in audit logs for current registered settings.', 'New sensitive keys fail CI unless audit classification is defined.', 'Before/after metadata is useful for non-sensitive fields and state-only for secrets.', 'Nested/array payloads are safely handled.'],
    related: ['AS-17 — audit link/change record.', 'AS-24 — sensitivity metadata.', 'SO-01 — credential response.'],
    tags: ['security', 'audit-log', 'secrets', 'redaction', 'bug'],
    verifiedComplete: true,
  }),
  n({
    externalId: 'NG-01', folder: FOLDERS.governance, sortOrder: 1,
    title: 'Use one idempotent, source-backed catalog for audit notes', priority: 'high', classification: 'Improvement',
    scope: 'Admin Notes lifecycle, synchronization, and audit quality',
    finding: 'Previous one-off insertion scripts and local Markdown created stale claims, duplicates, destructive cleanup logic, and incomplete production notes. Managed notes need one typed catalog keyed by stable external IDs and a synchronizer that never deletes/trashes/archives existing content.',
    evidence: ['Production contains historical trashed duplicates plus 47 active managed notes.', 'Legacy scripts delete matching folders and insert new note IDs/checklists.', 'The new catalog/synchronizer matches `external-id:*`, preserves IDs/completion, and performs read-only dry-run by default.'],
    reproduce: ['Run inventory/dry-run twice and compare planned changes.', 'Inspect completed verified notes and checklist states before/after synchronization.', 'Add a catalog note and confirm only that stable external ID is created.'],
    rootCause: ['Notes were treated as disposable seed data rather than maintained operational records.', 'No source-of-truth/version/safety invariant existed.'],
    impact: ['Lost completion history, duplicated work, misleading guidance, and risky production scripts.', 'Engineers cannot trust the dashboard backlog.'],
    howTo: ['Maintain all managed definitions in the credential-free typed catalog with audit date/version/evidence/acceptance/checklist.', 'Use active unique `external-id:*` as the natural key; fail on duplicates.', 'Dry-run by default; require explicit apply and transaction; never delete/trash/archive.', 'Preserve note IDs, completed flags/timestamps, and completed checklist rows; update open checklist content idempotently.', 'Verify count, uniqueness, folder distribution, content richness, completion invariants, and protected credential hash after apply.'],
    acceptance: ['Repeated apply produces zero changes.', 'No existing note/folder is deleted, trashed, or archived.', 'Completed verified notes remain completed with their checklist state.', 'Every managed note has detailed content, tags, folder, and database checklist rows.'],
    related: ['SO-01 — safe credential handling.', 'QA-01 — synchronizer tests.'],
    tags: ['governance', 'admin-notes', 'idempotency', 'safety'],
  }),
  n({
    externalId: 'QA-01', folder: FOLDERS.quality, sortOrder: 1,
    title: 'Build a cross-layout Hub and Settings regression suite', priority: 'high', classification: 'Verified reliability risk',
    scope: 'Automated regression coverage for this audit',
    finding: 'Current Playwright coverage is smoke-level: Hub tests mainly assert a heading/search/main and Admin Settings asserts the page body loads. It does not verify layout capability, settings persistence/scope, failures, pagination, accessibility, publication, or the completed audit invariants.',
    evidence: ['`frontend/e2e/hub-navigation.spec.ts` contains basic route/content checks and a search navigation test.', '`frontend/e2e/admin-panel.spec.ts` only checks that `/settings` renders main/body.', 'No cross-layout fixture matrix or settings mutation/persistence test was found.'],
    reproduce: ['Introduce a controlled regression such as disabling Classic pagination or making Settings Save a no-op; current smoke tests can still pass.', 'Run E2E with API failure and confirm no assertion distinguishes an empty marketplace from an outage.'],
    rootCause: ['Tests were organized around route availability rather than business contracts and high-risk state transitions.', 'No deterministic data/config fixture supports all Hub layouts.'],
    impact: ['The same defects can recur unnoticed, especially across five layouts and multiple admin domains.', 'Manual verification cost remains high and completed notes can become stale.'],
    howTo: ['Create deterministic API/database fixtures for products, categories, ads, users/roles, and settings versions.', 'Parameterize Hub E2E across every layout/theme/locale/mobile-desktop combination for critical shared contracts.', 'Add Settings tests for authoritative load failure, per-section draft/save/reset, validation, audit link, publication failure/retry, and permissions.', 'Add accessibility scans plus focused keyboard tests for navbar, search, pagination, carousel, mega-menu, toggles, tabs, and editors.', 'Use bounded visual snapshots for layout/token/crop regressions and run a smaller critical matrix in PR plus full scheduled suite.'],
    acceptance: ['A regression in any declared layout capability fails an automated test.', 'Settings cannot silently save wrong-scope/default data without test failure.', 'Critical accessibility/failure-state workflows are covered.', 'Test fixtures are deterministic, isolated, and do not mutate production.'],
    related: ['HC-01 — test matrix source.', 'All HH/AS/HR/LA/SO notes.'],
    tags: ['qa', 'e2e', 'hub', 'admin-settings', 'regression'],
  }),
  n({
    externalId: 'PI-01', folder: FOLDERS.ideas, sortOrder: 1,
    title: 'Add draft, preview, schedule, publish, and rollback for Hub appearance', priority: 'high', classification: 'New functionality',
    scope: 'Safe content/appearance release workflow',
    finding: 'Hub settings currently save directly into the effective configuration and separately attempt revalidation. A versioned publication workflow would let admins prepare coordinated layout/banner/block/color changes, preview them, schedule launch, obtain approval, and rollback safely.',
    evidence: ['Settings combines authoring and immediate effective persistence.', 'AS-08 identifies the need for production-faithful draft preview; HR-02 identifies ambiguous publication state.', 'High-impact maintenance/public URL/appearance changes need stronger control.'],
    reproduce: ['Attempt to prepare a multi-section campaign refresh over several sessions without affecting production.', 'Attempt to preview/share/approve it and rollback the full set after publication.'],
    rootCause: ['Configuration storage models only current key/value, not versions/change sets/lifecycle.', 'Cache publication is not a first-class domain operation.'],
    impact: ['Direct value: safer launches, fewer partial updates, coordinated merchandising, clear accountability, faster rollback.', 'Cost: version storage, migration, conflict resolution, preview security, and publication job complexity.'],
    howTo: ['Introduce immutable settings versions/change sets with base version, draft owner, changed keys, validation result, and status.', 'Render authenticated previews from a draft version using real layouts and capability warnings.', 'Support submit/approve permissions, schedule with timezone, publish job, and atomic effective-version switch.', 'Invalidate caches by published version and expose propagation status.', 'Provide one-click rollback that creates a new audited version rather than rewriting/deleting history.'],
    acceptance: ['Admins can save a draft without changing the public Hub.', 'Preview exactly identifies the draft version and never exposes secrets.', 'Scheduled/manual publish switches a validated version and reports propagation.', 'Rollback restores a prior complete configuration with audit history intact.'],
    related: ['AS-08, HR-02, HH-16, SO-02, AS-17.'],
    tags: ['idea', 'hub', 'publishing', 'preview', 'rollback'],
  }),
  n({
    externalId: 'PI-02', folder: FOLDERS.ideas, sortOrder: 2,
    title: 'Add rule-based merchandising and sponsored-slot governance', priority: 'normal', classification: 'New functionality',
    scope: 'Homepage merchandising, targeting, and campaign operations',
    finding: 'Homepage blocks currently focus on static enable/order/copy while products/categories/ads are selected by fixed slices or separate systems. A rule layer could schedule and target merchandising by locale, category, inventory, seller quality, campaign, and audience—provided paid placement remains clearly separated and auditable.',
    evidence: ['Layouts derive featured/deal lists from the same initial product slice using layout-local rules.', 'Sponsored placements and homepage blocks have overlapping ownership (HH-05).', 'Settings already stores featured category slugs and block order but not conditions/schedules.'],
    reproduce: ['Try to run a weekend campaign for Arabic mobile buyers featuring an in-stock category and a sponsored brand only during a fixed window.', 'Observe that this requires code/config juggling and has no conflict/exposure preview.'],
    rootCause: ['Merchandising configuration lacks conditions, priority, schedule, fallback, and simulation.', 'Organic and sponsored composition are not governed by one transparent placement model.'],
    impact: ['Potential gains in conversion, campaign operations, seller exposure fairness, and reduced developer dependence.', 'Risks include opaque ranking, ad disclosure errors, over-targeting, and rule conflicts.'],
    howTo: ['Define versioned rules with slot, audience conditions, schedule/timezone, priority, source/query, fallback, caps, and disclosure type.', 'Build a simulator showing which rule/creative/product wins for a sample context and why.', 'Separate organic ranking from paid placements visually and analytically; enforce campaign eligibility/budget.', 'Add conflict detection, no-inventory fallback, frequency caps, seller fairness/policy constraints, and kill switch.', 'Measure exposure, click, conversion, revenue, and guardrail metrics with privacy-safe segmentation.'],
    acceptance: ['An authorized admin can schedule a rule and preview the winning content/context.', 'Conflicts and missing inventory have deterministic fallbacks.', 'Paid content is labeled and metrics reconcile to placement ownership.', 'Rules can be disabled/rolled back without code deployment.'],
    related: ['HH-05, HR-03, HC-01, PI-01.'],
    tags: ['idea', 'merchandising', 'ads', 'targeting', 'scheduling'],
  }),
  n({
    externalId: 'PI-03', folder: FOLDERS.ideas, sortOrder: 3,
    title: 'Create a Hub preview and accessibility lab inside Superadmin', priority: 'normal', classification: 'New functionality',
    scope: 'Pre-publication visual and quality validation',
    finding: 'A production-faithful preview can also become an automated quality lab: compare layouts/viewports/locales, flag missing translations, overflow, contrast, broken links/images, unsupported settings, excessive payload, and interaction accessibility before publish.',
    evidence: ['The existing hero preview is local and limited (AS-08).', 'This audit found repeated cross-layout, i18n, a11y, theming, image, and capability defects that could be detected from a draft render.'],
    reproduce: ['Prepare a draft with long Arabic copy, low-contrast colors, a portrait banner, invalid CTA, and a layout-only setting.', 'Today, identify how many problems are only visible after manual public inspection.'],
    rootCause: ['Validation is field/schema-centric and disconnected from rendered layout outcomes.', 'No stable preview harness exposes layout/locale/viewport matrices to automated checks.'],
    impact: ['Fewer broken launches, faster operator feedback, and enforceable visual/accessibility quality gates.', 'Requires careful avoidance of false confidence; automated checks supplement manual review.'],
    howTo: ['Build on PI-01’s authenticated real-layout draft preview, not a duplicate component model.', 'Provide viewport/locale/theme/layout matrix controls plus a comparison mode.', 'Run link/media validation, translation completeness, axe checks, contrast analysis, overflow/text-clamp warnings, and performance budgets.', 'Classify blocking vs warning findings with source setting/control links and allow policy-based documented exceptions.', 'Store the validation report on the draft version and require fresh checks after relevant edits.'],
    acceptance: ['A draft can be inspected in all supported layouts/locales/viewports from one session.', 'Detected issues link back to the responsible setting/editor item.', 'Blocking policy prevents publication until resolved or explicitly authorized.', 'Results are reproducible and versioned with the draft.'],
    related: ['AS-08, AS-15, HC-01, LA-01, LA-02, QA-01, PI-01.'],
    tags: ['idea', 'preview', 'accessibility', 'visual-qa', 'admin-settings'],
  }),
];

export const auditNotes: AuditNoteDefinition[] = [
  ...hubNotes,
  ...settingsNotes,
  ...crossCuttingNotes,
];

export const expectedCompletedExternalIds = ['AS-01', 'AS-02', 'AS-03', 'AS-04', 'AS-05', 'AS-06', 'AS-07', 'AS-08', 'AS-09', 'AS-10', 'AS-11', 'AS-12', 'AS-13', 'AS-14', 'AS-15', 'AS-16', 'AS-17', 'AS-18', 'AS-19', 'AS-20', 'AS-21', 'AS-22', 'AS-23', 'AS-24', 'HC-01', 'HC-02', 'HH-01', 'HH-02', 'HH-03', 'HH-04', 'HH-05', 'HH-06', 'HH-07', 'HH-08', 'HH-09', 'HH-10', 'HH-11', 'HH-12', 'HH-13', 'HH-14', 'HH-15', 'HH-16', 'HH-17', 'HH-18', 'HR-01', 'HR-02', 'HR-03', 'LA-01', 'LA-02', 'LA-03', 'LA-04', 'SO-01', 'SO-02', 'SO-03'] as const;

export function validateCatalog(notes: AuditNoteDefinition[] = auditNotes): void {
  const ids = new Set<string>();
  const folderNames = new Set(folderDefinitions.map((folder) => folder.name));
  for (const note of notes) {
    if (ids.has(note.externalId)) throw new Error(`Duplicate catalog external ID: ${note.externalId}`);
    ids.add(note.externalId);
    if (!/^[A-Z]{2}-\d{2}$/.test(note.externalId)) throw new Error(`Invalid external ID: ${note.externalId}`);
    if (!folderNames.has(note.folder)) throw new Error(`Unknown folder for ${note.externalId}: ${note.folder}`);
    if (note.title.length > 430) throw new Error(`Title too long: ${note.externalId}`);
    const content = renderNoteContent(note);
    if (content.length < 2600) throw new Error(`Note content is not detailed enough: ${note.externalId} (${content.length})`);
    const checklist = buildChecklist(note);
    if (checklist.length < 10) throw new Error(`Checklist is incomplete: ${note.externalId}`);
    if (checklist.some((item) => item.length > 990)) throw new Error(`Checklist item too long: ${note.externalId}`);
  }
  for (const externalId of expectedCompletedExternalIds) {
    const note = notes.find((entry) => entry.externalId === externalId);
    if (!note?.verifiedComplete) throw new Error(`Verified completed note missing from catalog: ${externalId}`);
  }
}

validateCatalog();
