/**
 * insert-admin-notes-poc.ts
 *
 * Proof-of-concept: inserts 3 sample admin notes with PROPER checklist format:
 *   - Rich markdown `content` (diagnosis, root cause, acceptance criteria — NO embedded - [ ] bullets)
 *   - Checklist items as real DB rows in `admin_note_checklist_items` table
 *
 * Run from backend/:
 *   npx tsx src/scripts/insert-admin-notes-poc.ts
 */

import { Pool } from 'pg';
import { customAlphabet } from 'nanoid';

const DB_URI =
  'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: DB_URI,
  ssl: { rejectUnauthorized: false },
  max: 3,
  connectionTimeoutMillis: 20_000,
  statement_timeout: 30_000,
});

const nano = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16);
const pdId = (entity: string) => `pd_${entity}_${nano()}`;

async function run(sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params as never);
  } finally {
    client.release();
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface NoteInput {
  title: string;
  content: string;        // Rich markdown — NO embedded - [ ] bullets
  color: string;
  priority: Priority;
  is_pinned: boolean;
  tags: string[];
  checklist: string[];    // Each item becomes a row in admin_note_checklist_items
}

// ═══════════════════════════════════════════════════════════════════════════
// HUB HOMEPAGE NOTES  (HH-01 → HH-18)
// ═══════════════════════════════════════════════════════════════════════════

const HUB_NOTES: NoteInput[] = [
  // ─── HH-01 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-01 🔴 Cart Badge Shows "0" on Every Cold Page Load',
    color: '#EF4444',
    priority: 'high',
    is_pinned: true,
    tags: ['bug', 'hub', 'navbar', 'cart'],
    content: `## Overview
The cart icon in HubNavbar always renders a red badge showing **"0"** on the first render — before the cart state is hydrated from localStorage or the API. This creates a broken visual for every new visitor.

## Affected File
\`frontend/src/components/hub/HubNavbar.tsx\` — around **line 193**

## Root Cause
The badge \`<span>\` is rendered unconditionally regardless of whether \`cartCount\` is zero:
\`\`\`tsx
// ❌ WRONG — badge always visible
<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
  {cartCount}
</span>
\`\`\`

There is no guard to suppress the badge when \`cartCount === 0\`, and no cap for large numbers (e.g. 150 items overflows the badge).

## Expected Behaviour
- **Empty cart** → badge is hidden entirely (no element in the DOM)
- **1–99 items** → badge shows the exact count
- **100+ items** → badge shows \`99+\`
- Badge has proper \`aria-label\` for screen readers

## Acceptance Criteria
- Badge is absent from the DOM when cart is empty
- Badge shows a capped count (max \`99+\`) when items exist
- Cart \`<Link>\` has \`aria-label="Cart, X items"\` attribute
- No layout shift or flash on cold load`,
    checklist: [
      'Open frontend/src/components/hub/HubNavbar.tsx and navigate to line 193 (the cart badge span)',
      'Wrap the entire badge <span> with a conditional: {cartCount > 0 && ( ... )} so it only renders when there are items',
      'Inside the badge, replace {cartCount} with: {cartCount > 99 ? "99+" : cartCount}',
      'Add aria-label to the cart <Link>: aria-label={`Cart, ${cartCount} item${cartCount !== 1 ? "s" : ""}`}',
      'Test with empty cart: verify no badge element exists in the DOM (inspect with DevTools)',
      'Test with 1 item in cart: verify badge shows "1"',
      'Test with 100+ items: verify badge shows "99+"',
      'Run: git commit -m "fix(hub): hide cart badge when cartCount is 0, cap at 99+"',
    ],
  },

  // ─── HH-02 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-02 🔴 Hero Stats Show Page-1 Count Instead of Real Platform Total',
    color: '#EF4444',
    priority: 'high',
    is_pinned: true,
    tags: ['bug', 'hub', 'hero', 'stats'],
    content: `## Overview
The hero section stat badge reads **"16+ Produits actifs"** even when the platform has hundreds or thousands of products. This number is incorrect — it is the length of the first page of trending products (max 16), not the actual platform total.

## Affected File
\`frontend/src/components/hub/HubHomeContent.tsx\` — around **line 154** (stats array)

## Root Cause
\`\`\`tsx
// ❌ WRONG — uses the page slice count, not the real total
{ value: \`\${trendingProducts.length}+\`, label: 'Produits actifs' }
\`\`\`

The API response \`data.meta.total\` contains the real total but it is never surfaced to the component. \`trendingProducts\` is just the current page slice.

## Data Flow
\`hub/page.tsx\` → calls \`getTrendingProducts()\` → returns \`{ products, meta: { total, page, limit } }\` → only \`products\` array is passed down → \`total\` is dropped.

## Acceptance Criteria
- Hero stat shows the actual database total product count
- If the API fails, falls back gracefully (e.g., shows \`"500+"\` or hides the stat)
- No hardcoded numbers anywhere in the stats array`,
    checklist: [
      'Open frontend/src/app/hub/page.tsx and find the getTrendingProducts() call',
      'Destructure meta from the result: const { products: trendingProducts, meta: trendingMeta } = await getTrendingProducts(...)',
      'Pass totalProducts={trendingMeta?.total ?? 0} as a prop to <HubHomeContent />',
      'Open frontend/src/components/hub/HubHomeContent.tsx and add totalProducts?: number to HubHomeContentProps interface',
      'Find the stats array (around line 154) and change the products stat to: { value: totalProducts > 0 ? `${totalProducts.toLocaleString()}+` : `${trendingProducts.length}+`, label: t("hub.stats.activeProducts") }',
      'Add the translation key hub.stats.activeProducts to all 3 locale files (fr/en/ar)',
      'Test with >16 products seeded in DB — stat must show the real total',
      'Run: git commit -m "fix(hub): show real total product count in hero stats"',
    ],
  },


  // ─── HH-03 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-03 🔴 getProductImage() Called 3× Per Card — Redundant Parsing',
    color: '#F97316', priority: 'normal', is_pinned: false,
    tags: ['performance', 'hub', 'deals'],
    content: `## Overview
In the Deals Spotlight section, \`getProductImage(product)\` is called **three times** per product card on every render cycle — once for the conditional check, once for the \`src\` attribute, and once as an argument to \`getResizedImageUrl()\`. This function parses a JSON string or URL on every call — pure wasted CPU.

## Affected File
\`frontend/src/components/hub/HubHomeContent.tsx\` — \`renderDealsSpotlight\` map callback (~line 263), and again in \`heroProducts.map\` (~line 463)

## Root Cause
\`\`\`tsx
// ❌ WRONG — called 3 times per card
{getProductImage(product) && (
  <img src={getResizedImageUrl(getProductImage(product)!, 'medium')} />
)}
\`\`\`
Each call to \`getProductImage\` re-parses \`product.images\` from scratch. With 16 cards × 3 calls = **48 redundant parse operations** per render.

## Performance Impact
On low-end mobile devices with 16 deal cards, this contributes to render jank. React DevTools Profiler shows these calls as the top flamegraph hot spots in the deals section.

## Acceptance Criteria
- \`getProductImage\` called **exactly once** per card
- \`getResizedImageUrl\` called **exactly once** per card
- No functional change to displayed images`,
    checklist: [
      'Open frontend/src/components/hub/HubHomeContent.tsx and find the renderDealsSpotlight function',
      'At the top of the .map() callback, add: const productImage = getProductImage(product);',
      'Add: const resizedSrc = productImage ? getResizedImageUrl(productImage, "medium") : "";',
      'Replace all 3 inline getProductImage(product) calls in that card with the cached productImage variable',
      'Replace the getResizedImageUrl(...) call with resizedSrc',
      'Repeat the same fix in the heroProducts.map() callback around line 463',
      'Open React DevTools Profiler, record a render of the hub page, and confirm getProductImage no longer appears multiple times per card in the flamegraph',
      'Run: git commit -m "perf(hub): cache getProductImage() result in deals spotlight and hero products"',
    ],
  },

  // ─── HH-04 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-04 🔴 hub_homepage_pagination_style Setting Has Zero Effect (Dead Feature)',
    color: '#EF4444', priority: 'high', is_pinned: true,
    tags: ['bug', 'hub', 'pagination', 'dead-feature'],
    content: `## Overview
The admin settings page has a **"Pagination Style"** control with 4 modes: \`none\`, \`load_more\`, \`pagination\`, \`infinite\`. The selected value is stored in the DB and passed down as a prop — but \`HubHomeContent\` **never reads it**. Every mode produces identical behaviour: a static grid of 16 products with no way to see more.

## Affected Files
- \`frontend/src/components/hub/HubHomeContent.tsx\` — receives \`paginationStyle\` prop but never uses it
- \`frontend/src/app/hub/page.tsx\` — passes the setting correctly

## Root Cause
The prop \`paginationStyle\` is typed and passed, but there is no conditional rendering block that branches on its value. The feature was planned but never implemented.

## Modes to Implement
| Mode | Behaviour |
|------|-----------|
| \`none\` | Static grid, no pagination (current — keep as-is) |
| \`load_more\` | "Load More" button appends next 8 products |
| \`pagination\` | Page number buttons, 16 per page |
| \`infinite\` | IntersectionObserver auto-loads next page on scroll |

## Acceptance Criteria
- All 4 modes produce distinct, correct behaviour
- Page/offset state resets when filters change
- No extra API calls when already at the last page`,
    checklist: [
      'Open frontend/src/components/hub/HubHomeContent.tsx and confirm paginationStyle prop is received',
      'PHASE 1 — load_more: Add state: const [visibleCount, setVisibleCount] = useState(16)',
      'PHASE 1: Slice products: const visibleProducts = trendingProducts.slice(0, visibleCount)',
      'PHASE 1: Render a "Voir plus" button below the grid when paginationStyle === "load_more" && visibleCount < trendingProducts.length',
      'PHASE 1: Button onClick increments visibleCount by 8: setVisibleCount(prev => prev + 8)',
      'PHASE 2 — pagination: Add state: const [currentPage, setCurrentPage] = useState(1)',
      'PHASE 2: Slice products by page: trendingProducts.slice((currentPage-1)*16, currentPage*16)',
      'PHASE 2: Render page number buttons from trendingTotalPages, highlight the active page',
      'PHASE 3 — infinite: Add a sentinel <div ref={sentinelRef} /> below the grid',
      'PHASE 3: Add useEffect with IntersectionObserver that calls fetchMoreProducts() when sentinel enters viewport',
      'PHASE 3: Gate behind paginationStyle === "infinite" — do NOT run the observer for other modes',
      'Test all 4 modes by changing the setting in admin → Hub tab and reloading /hub',
      'Run: git commit -m "feat(hub): implement all 4 hub_homepage_pagination_style modes"',
    ],
  },

  // ─── HH-05 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-05 🔴 Third SponsoredAdsRail Uses Default Placement Key (Budget Bleed)',
    color: '#F97316', priority: 'normal', is_pinned: false,
    tags: ['bug', 'hub', 'ads'],
    content: `## Overview
The hub homepage renders **three** \`SponsoredAdsRail\` components. The third (bottom of page, ~line 210 in \`hub/page.tsx\`) has **no placement prop**, causing it to silently fall back to \`hub.sponsored_products\` — the same key used on search and product pages. Ad campaign budgets are consumed by three positions simultaneously, analytics are inaccurate, and advertisers get the wrong inventory.

## Affected File
\`frontend/src/app/hub/page.tsx\` — around **line 210**

## Root Cause
\`\`\`tsx
// ❌ WRONG — missing placement, falls back to default
<SponsoredAdsRail locale={activeLocale} />
\`\`\`

## Correct Placement Keys (all three rails)
| Position | Placement Key |
|----------|--------------|
| Top banner (rail 1) | \`hub.homepage_top\` |
| Mid-page (rail 2) | \`hub.homepage_mid\` |
| Bottom (rail 3) | \`hub.homepage_bottom\` ← MISSING |

## Acceptance Criteria
- All 3 rails have unique, explicit placement keys
- Backend ads placement validation accepts \`hub.homepage_bottom\`
- Campaign budget not shared between homepage and other page types`,
    checklist: [
      'Open frontend/src/app/hub/page.tsx and find the third <SponsoredAdsRail> around line 210',
      'Add: placement="hub.homepage_bottom" title="You May Also Like" variant="cards" to the component props',
      'Open the backend ads placement validation file (grep for "hub.sponsored_products" in backend/src) and add "hub.homepage_bottom" to the allowed placements array',
      'If the admin Ads Manager has a placement dropdown, add "Hub — Homepage Bottom" as an option',
      'Verify in the DB that no existing campaigns use the fallback default key unintentionally',
      'Test: open /hub, open Network tab, verify 3 separate placement keys are requested (top, mid, bottom)',
      'Run: git commit -m "fix(hub): give third SponsoredAdsRail explicit placement key hub.homepage_bottom"',
    ],
  },

  // ─── HH-06 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-06 🔴 Account Link Flashes Wrong Href Before Auth Hydration',
    color: '#EF4444', priority: 'high', is_pinned: false,
    tags: ['bug', 'hub', 'auth', 'navbar'],
    content: `## Overview
For unauthenticated visitors, the navbar account icon briefly points to \`/hub/account\` for ~200–500ms before the auth check completes and correctly updates it to \`/login/buyer\`. If the user clicks during this window, they land on a protected page with no context.

## Affected File
\`frontend/src/components/hub/HubNavbar.tsx\` — around **line 63**

## Root Cause
\`\`\`tsx
// ❌ WRONG — /hub/account is a protected route used as an intermediate state
const accountHref = currentUser ? dashboardHref : authChecked ? '/login/buyer' : '/hub/account';
\`\`\`

## Fix (1 line)
\`\`\`tsx
// ✅ CORRECT — always /login/buyer for non-authenticated
const accountHref = currentUser ? dashboardHref : '/login/buyer';
\`\`\`

## Acceptance Criteria
- On cold load, account link immediately points to \`/login/buyer\` for guests — no flash
- Authenticated users see their correct dashboard link
- No intermediate wrong-href state exists`,
    checklist: [
      'Open frontend/src/components/hub/HubNavbar.tsx and go to line 63',
      'Replace the 3-way ternary with: const accountHref = currentUser ? dashboardHref : "/login/buyer";',
      'Remove the authChecked intermediate branch — it is no longer needed for this variable',
      'Optional: while !authChecked, render the account icon as a non-clickable skeleton to avoid any premature click',
      'Test as logged-out user: open /hub, immediately click the account icon — must land on /login/buyer every time',
      'Test as buyer: icon must link to /hub/dashboard',
      'Test as vendor: icon must link to /hub/dashboard',
      'Test as admin: icon must link to /dashboard',
      'Run: git commit -m "fix(hub): remove account link href flash before auth check completes"',
    ],
  },

  // ─── HH-07 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-07 🔴 Footer Has Hardcoded English Category Names (i18n Break)',
    color: '#EF4444', priority: 'high', is_pinned: false,
    tags: ['bug', 'hub', 'footer', 'i18n'],
    content: `## Overview
The "Popular Categories" section in \`HubFooter\` shows **"Electronics"**, **"Fashion"**, **"Home & Garden"** — hardcoded English strings. French and Arabic users see English labels. The href slugs are also English-only and produce empty search results on non-English platforms.

## Affected File
\`frontend/src/components/hub/HubFooter.tsx\` — around **lines 138–141**

## Root Cause
\`\`\`tsx
// ❌ WRONG — hardcoded English strings and slugs
<li><Link href="/hub/search?category=Electronics">Electronics</Link></li>
\`\`\`

## Fix Strategy (Full Fix — Dynamic Categories)
Pass the top 4 real platform categories (fetched in \`hub/page.tsx\`, already available) into \`HubFooter\` as a \`topCategories\` prop. This eliminates hardcoding entirely.

## Acceptance Criteria
- Footer categories show real platform names from the DB
- Links use actual category slugs that exist in the DB
- Works correctly in all 3 locales: fr / en / ar`,
    checklist: [
      'Open frontend/src/app/hub/page.tsx — categories are already fetched via getCategories()',
      'Slice top 4 non-default categories: const footerCategories = categories.filter(c => c.slug !== "all").slice(0, 4)',
      'Pass: <HubFooter topCategories={footerCategories} ... />',
      'Open frontend/src/components/hub/HubFooter.tsx and add topCategories?: Array<{name: string, slug: string}> to the props interface',
      'Replace the 3 hardcoded <li> items with: {topCategories?.map(cat => (<li key={cat.slug}><Link href={`/hub/search?category=${cat.slug}`}>{cat.name}</Link></li>))}',
      'Add a fallback: if topCategories is empty, render nothing (no dead links)',
      'Test in French locale: category names must appear in French as stored in DB',
      'Test in Arabic locale: category names must appear in Arabic',
      'Run: git commit -m "fix(hub): replace hardcoded footer categories with dynamic real category data"',
    ],
  },

  // ─── HH-08 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-08 🟡 Trending Product Cards Have No Add-to-Cart Button',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'hub', 'cart', 'conversion'],
    content: `## Overview
Every trending product card is a bare \`<Link>\` — clicking anywhere navigates away. There is **no Add-to-Cart or Wishlist button**. \`AddToCartButton\` and \`WishlistButton\` components already exist but are unused here. This directly harms homepage conversion rate.

## Affected File
\`frontend/src/components/hub/HubHomeContent.tsx\` — \`renderClassicProductCard\` (~line 72)

## WCAG Constraint
The card is a \`<Link>\` (\`<a>\` tag). Nesting another \`<a>\` inside it is invalid HTML. **Convert the card to an \`<article>\`** with a separate product link, and place buttons alongside it.

## Pattern
\`\`\`tsx
<article className="relative group rounded-2xl border ...">
  <WishlistButton productId={product.id} className="absolute top-2 right-2 z-10" />
  <Link href={productHref}><img src={resizedSrc} alt={product.title} /></Link>
  <div className="p-4">
    <Link href={productHref}><p>{product.title}</p></Link>
    <p>{formattedPrice}</p>
    <div onClick={(e) => e.stopPropagation()}>
      <AddToCartButton product={product} />
    </div>
  </div>
</article>
\`\`\`

## Acceptance Criteria
- Each card shows a Wishlist button and Add-to-Cart button
- Clicking Add-to-Cart adds item WITHOUT navigating
- No nested \`<a>\` inside \`<a>\` (axe audit passes)`,
    checklist: [
      'Open frontend/src/components/hub/HubHomeContent.tsx and find renderClassicProductCard',
      'Import AddToCartButton and WishlistButton at the top of the file',
      'Convert the outer <Link> wrapper to <article className="relative group ...">',
      'Add a standalone <Link href={productHref}> around the product image',
      'Add a standalone <Link href={productHref}> around the product title text',
      'Add <WishlistButton productId={product.id} className="absolute top-2 right-2 z-10" />',
      'Add <div onClick={(e) => e.stopPropagation()}><AddToCartButton product={product} /></div> below the price',
      'Run axe accessibility audit on /hub — confirm no "nested interactive controls" violation',
      'Test: clicking Add-to-Cart adds item and shows cart badge increment WITHOUT navigating',
      'Test: clicking the product image or title navigates to the product page',
      'Run: git commit -m "feat(hub): add AddToCartButton and WishlistButton to classic theme product cards"',
    ],
  },

  // ─── HH-09 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-09 🟡 Sponsored Ads Rails Have No Skeleton Loading (CLS Issue)',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'hub', 'ads', 'ux', 'cls'],
    content: `## Overview
\`SponsoredAdsRail\` returns \`null\` while ads are loading. This causes **Cumulative Layout Shift (CLS)** — the content below the rail jumps up, then back down when ads appear. On slow connections this is very visible and harms Core Web Vitals.

## Affected File
\`frontend/src/components/hub/SponsoredAdsRail.tsx\` — around **line 118** (\`if (!ads.length) return null\`)

## Root Cause
No loading state exists. The component fetches ads on mount and returns nothing until the fetch resolves — leaving no reserved space in the layout.

## Skeleton Specs
**Banner variant:** \`<div className="h-60 w-full animate-pulse rounded-3xl bg-gray-100" />\`

**Cards variant (6 placeholders):**
\`\`\`tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
  {Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100" />
  ))}
</div>
\`\`\`

## Acceptance Criteria
- Skeleton renders immediately on mount (before fetch completes)
- CLS score improves (target: < 0.1)
- After fetch, if no ads → component unmounts cleanly (no stuck skeleton)`,
    checklist: [
      'Open frontend/src/components/hub/SponsoredAdsRail.tsx',
      'Add loading state: const [loading, setLoading] = useState(true)',
      'In the fetch useEffect, set loading = false in the .finally() block (both success and error paths)',
      'Add: if (loading) return <SkeletonBlock variant={variant} /> BEFORE the if (!ads.length) return null guard',
      'Create a SkeletonBlock sub-component that renders the correct skeleton based on the variant prop',
      'Banner skeleton: full-width h-60 animate-pulse rounded div',
      'Cards skeleton: 6-column grid of h-48 animate-pulse placeholder cards',
      'Keep the if (!ads.length) return null guard AFTER loading is false',
      'Test with Chrome DevTools → Network → Slow 3G: confirm skeleton appears then transitions to ads',
      'Measure CLS with Lighthouse before and after — confirm improvement',
      'Run: git commit -m "feat(hub): add skeleton loading to SponsoredAdsRail to prevent CLS"',
    ],
  },

  // ─── HH-10 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-10 🟡 Hero Departments Sidebar Shows No Category Icons',
    color: '#F59E0B', priority: 'low', is_pinned: false,
    tags: ['enhancement', 'hub', 'hero', 'ux'],
    content: `## Overview
The hero "All Departments" sidebar shows text-only category rows. Amazon and AliExpress show a small icon or thumbnail per category. The categories already have \`image_url\` in the DB — it is simply not displayed in the sidebar.

## Affected File
\`frontend/src/components/hub/HubHomeContent.tsx\` — \`heroCategories.map\` block (~line 399)

## Implementation Pattern
\`\`\`tsx
// Top of .map() callback:
const catImg = cat.image_url
  ? getResizedImageUrl(normalizePublicAssetUrl(cat.image_url), 'thumbnail')
  : null;

// In the row JSX:
{catImg ? (
  <img src={catImg} alt="" aria-hidden className="h-6 w-6 rounded-lg object-cover flex-shrink-0" />
) : (
  <div className="h-6 w-6 rounded-lg bg-[#16C784]/10 flex items-center justify-center flex-shrink-0">
    <Grid3X3 className="h-3 w-3 text-[#16C784]" />
  </div>
)}
\`\`\`

## Acceptance Criteria
- Each sidebar category shows a 24×24 thumbnail if \`image_url\` exists
- Fallback icon shown when no image
- \`alt=""\` on decorative thumbnails
- Works in both LTR and RTL modes`,
    checklist: [
      'Open frontend/src/components/hub/HubHomeContent.tsx and find heroCategories.map() (~line 399)',
      'Import Grid3X3 from lucide-react if not already imported',
      'At the top of the .map() callback, compute: const catImg = cat.image_url ? getResizedImageUrl(normalizePublicAssetUrl(cat.image_url), "thumbnail") : null;',
      'In the rendered row JSX, add the icon container before the category name',
      'Conditional: if catImg exists render <img src={catImg} alt="" aria-hidden className="h-6 w-6 rounded-lg object-cover flex-shrink-0" />',
      'Fallback: render a small colored circle with Grid3X3 icon inside',
      'Add rtl:rotate-180 to the ChevronRight icon so it flips in Arabic locale',
      'Test sidebar width (280px) does not overflow with icon + text + arrow in both LTR and RTL',
      'Test with a category that has no image_url — fallback icon must appear',
      'Run: git commit -m "feat(hub): add category thumbnail icons to hero departments sidebar"',
    ],
  },

  // ─── HH-11 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-11 🟡 Hero Carousel Dots Fail WCAG 2.1 AA (No ARIA, No Keyboard Nav)',
    color: '#8B5CF6', priority: 'normal', is_pinned: false,
    tags: ['a11y', 'hub', 'carousel', 'wcag'],
    content: `## Overview
The hero carousel navigation dots have **no ARIA roles, no keyboard navigation, and no auto-rotation pause**. This violates WCAG 2.1 Level AA — Success Criteria 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value). Screen reader users cannot identify or operate the carousel.

## Affected File
\`frontend/src/components/hub/HubHomeContent.tsx\` — dots container (~line 446)

## Correct ARIA Pattern
\`\`\`tsx
<div role="tablist" aria-label="Hero slide navigation">
  {heroSlides.map((_, idx) => (
    <button
      key={idx}
      role="tab"
      aria-selected={idx === activeIndex}
      aria-label={\`Go to slide \${idx + 1}\`}
      tabIndex={idx === activeIndex ? 0 : -1}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') setSlideIndex((prev) => (prev + 1) % heroSlides.length);
        if (e.key === 'ArrowLeft') setSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
      }}
    />
  ))}
</div>
\`\`\`

## Auto-Rotation Pause (WCAG 2.2.2)
Pause rotation on focus, hover, and dot click (resume after 5s idle).

## Acceptance Criteria
- ArrowLeft / ArrowRight navigate slides when tablist is focused
- Each dot announces state to screen readers (\`aria-selected\`)
- Auto-rotation pauses on focus and hover
- axe-core reports zero carousel violations`,
    checklist: [
      'Open frontend/src/components/hub/HubHomeContent.tsx and find the hero dots container (~line 446)',
      'Add role="tablist" and aria-label="Hero slide navigation" to the dots container div',
      'Add role="tab", aria-selected={idx === activeIndex}, and aria-label={`Go to slide ${idx + 1}`} to each dot button',
      'Set tabIndex={idx === activeIndex ? 0 : -1} so only the active dot is in the tab order',
      'Add onKeyDown handler to each dot: ArrowRight advances, ArrowLeft goes back (with wraparound)',
      'Add const [isPaused, setIsPaused] = useState(false) to the component',
      'In the auto-rotation useEffect interval, check isPaused and skip the tick if true',
      'Add onFocus={() => setIsPaused(true)} and onBlur={() => setIsPaused(false)} to the tablist container',
      'Add onMouseEnter={() => setIsPaused(true)} and onMouseLeave={() => setIsPaused(false)} to the carousel wrapper',
      'Run axe-core browser extension on /hub — confirm no carousel violations',
      'Run: git commit -m "a11y(hub): add ARIA roles, keyboard navigation, and pause to hero carousel"',
    ],
  },

  // ─── HH-12 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-12 🟡 RecentlyViewedTracker Never Called — Block Always Empty',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'hub', 'recently-viewed'],
    content: `## Overview
The hub homepage "Recently Viewed" section reads from localStorage. But \`RecentlyViewedTracker\` — the component that **writes** to localStorage — is never rendered on the product detail page. The block is always empty for every returning buyer.

## Root Cause
\`RecentlyViewedRail\` reads \`localStorage['recentlyViewed']\`.
\`RecentlyViewedTracker\` writes to it — but it is missing from the product detail page.

## Fix Strategy
Add \`<RecentlyViewedTracker productId={product.id} />\` to the product detail page. When a buyer views a product, it gets written to localStorage. The hub homepage then reads and displays it.

## Acceptance Criteria
- Visiting a product page writes it to localStorage
- Returning to /hub shows the recently-viewed rail with real products
- New visitors / incognito: the rail does not render (no empty placeholder)
- Admin setting \`hub_show_recently_viewed: false\` hides the rail`,
    checklist: [
      'Open frontend/src/components/hub/RecentlyViewedTracker.tsx and read its props interface',
      'Open frontend/src/app/hub/products/[id]/page.tsx (the product detail page)',
      'Import RecentlyViewedTracker at the top of the product detail page file',
      'Render <RecentlyViewedTracker productId={product.id} /> in the product detail page (client-side — wrap in a client component if needed)',
      'Open HubHomeContent.tsx and find the RecentlyViewedRail render',
      'Confirm the rail has a guard: only render if localStorage recentlyViewed has at least 1 item',
      'Test: browse a product at /hub/products/[id] → go back to /hub → recently viewed rail shows that product',
      'Test in incognito: the rail must NOT render (no empty placeholder)',
      'Test: admin setting hub_show_recently_viewed = false → rail hidden',
      'Run: git commit -m "feat(hub): connect RecentlyViewedTracker to product detail page so rail has data"',
    ],
  },

  // ─── HH-13 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-13 🟡 Hub Homepage Has No JSON-LD Structured Data (SEO Gap)',
    color: '#3B82F6', priority: 'normal', is_pinned: false,
    tags: ['seo', 'hub', 'json-ld'],
    content: `## Overview
The hub homepage has OpenGraph \`<meta>\` tags but **no JSON-LD structured data**. Missing:
- No **Google Shopping** product carousel eligibility
- No **Organization** knowledge panel
- No **ItemList** rich results in Google Search

JSON-LD is a \`<script type="application/ld+json">\` tag — the preferred format for Google structured data.

## Affected File
\`frontend/src/app/hub/page.tsx\` — \`generateMetadata\` and page return (~line 27)

## Schemas to Implement
**Organization:**
\`\`\`json
{ "@context": "https://schema.org", "@type": "Organization",
  "name": "Marketplace Name", "url": "https://...", "logo": "https://...", "description": "Tagline" }
\`\`\`

**ItemList (top 10 trending products):**
\`\`\`json
{ "@context": "https://schema.org", "@type": "ItemList",
  "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "...", "url": "..." }] }
\`\`\`

## Acceptance Criteria
- Hub page HTML contains both JSON-LD scripts in \`<head>\`
- Google Rich Results Test passes with no errors
- \`alternates.canonical\` set in \`generateMetadata\``,
    checklist: [
      'Open frontend/src/app/hub/page.tsx and find the generateMetadata function',
      'Add alternates: { canonical: `${marketplaceSettings.marketplace_public_url}/hub` } to the metadata return',
      'Below generateMetadata, create a buildOrgSchema(settings) helper returning the Organization JSON-LD object',
      'Create a buildItemListSchema(products, publicUrl) helper returning the ItemList JSON-LD for the top 10 trending products',
      'In the page return, add: <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrgSchema(marketplaceSettings)) }} />',
      'Add a second script tag for the ItemList schema',
      'Test with Google Rich Results Test at search.google.com/test/rich-results (use ngrok or deploy to staging)',
      'Confirm no validation errors in the Rich Results Test output',
      'Run: git commit -m "feat(hub): add Organization and ItemList JSON-LD structured data for SEO"',
    ],
  },

  // ─── HH-14 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-14 🟡 "Create Store" CTA Sends Unauthenticated Users to Dashboard',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'hub', 'navbar', 'conversion'],
    content: `## Overview
The "Create Store" button sends **all users to \`/dashboard\`** — a protected route that immediately redirects unauthenticated visitors to \`/login/seller\` with no return URL. The user loses their intent. They should land directly on \`/hub/vendor-signup\`.

## Affected File
\`frontend/src/components/hub/HubNavbar.tsx\` — around **line 175**

## Correct Routing Logic
| User State | Destination | Label |
|-----------|------------|-------|
| Unauthenticated | \`/hub/vendor-signup\` | "Create Your Store" |
| Buyer (no store) | \`/hub/vendor-signup\` | "Create Your Store" |
| Vendor (has store) | \`/hub/dashboard\` | "My Dashboard" |
| Admin | \`/dashboard\` | "Admin Panel" |

\`\`\`tsx
// ✅ CORRECT
const createStoreHref = !currentUser ? '/hub/vendor-signup'
  : role === 'buyer' && !currentUser.store_id ? '/hub/vendor-signup'
  : role === 'admin' || role === 'super_admin' ? '/dashboard'
  : '/hub/dashboard';
\`\`\`

## Acceptance Criteria
- Unauthenticated visitors land on \`/hub/vendor-signup\`
- Buyers without a store land on \`/hub/vendor-signup\`
- Vendors land on their seller dashboard
- Admins land on the admin panel`,
    checklist: [
      'Open frontend/src/components/hub/HubNavbar.tsx and find the "Create Store" Link around line 175',
      'Compute createStoreHref using the routing table above (4-way conditional)',
      'Compute createStoreLabel: "Créer votre boutique" for unauth/buyer, t("nav.myDashboard") for vendor, t("nav.adminPanel") for admin',
      'Update the Link href to use createStoreHref and text to use createStoreLabel',
      'Add translation keys nav.myDashboard and nav.adminPanel to all 3 locale files (fr/en/ar)',
      'Test as unauthenticated: button goes to /hub/vendor-signup',
      'Test as buyer with no store: button goes to /hub/vendor-signup',
      'Test as vendor: button goes to /hub/dashboard with label "Mon tableau de bord"',
      'Test as admin: button goes to /dashboard',
      'Run: git commit -m "feat(hub): route Create Store CTA correctly based on user role"',
    ],
  },

  // ─── HH-15 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-15 🟡 RTL Layout Broken in Footer Social Links (Arabic Locale)',
    color: '#F59E0B', priority: 'low', is_pinned: false,
    tags: ['i18n', 'hub', 'footer', 'rtl', 'arabic'],
    content: `## Overview
With the Arabic locale + RTL enabled, the hub footer social links do **not mirror correctly**. Physical CSS properties (\`ml-*\`, \`mr-*\`, \`pl-*\`, \`pr-*\`) don't flip in RTL. Tailwind logical properties (\`ms-*\`, \`me-*\`, \`ps-*\`, \`pe-*\`) must be used instead.

## Affected Files
- \`frontend/src/components/hub/HubFooter.tsx\` — root \`<footer>\` element (~line 124)
- \`StorefrontSocialLinks\` component rendered inside the footer

## Physical → Logical Mapping
| Physical | Logical |
|---------|---------|
| \`ml-*\` | \`ms-*\` |
| \`mr-*\` | \`me-*\` |
| \`pl-*\` | \`ps-*\` |
| \`pr-*\` | \`pe-*\` |

## Acceptance Criteria
- Footer grid mirrors in RTL (columns reverse order)
- Social icons are ordered right-to-left in Arabic
- No physical spacing utilities remain in RTL-sensitive components
- LTR layout (French/English) is unchanged`,
    checklist: [
      'Open frontend/src/components/hub/HubFooter.tsx',
      'Extract isRtl: const isRtl = locale === "ar" || marketplaceSettings?.rtl_enabled',
      'Add dir={isRtl ? "rtl" : "ltr"} to the root <footer> element',
      'Find every ml-* class in HubFooter.tsx and replace with ms-* equivalent',
      'Find every mr-* class and replace with me-*',
      'Find every pl-* class and replace with ps-*',
      'Find every pr-* class and replace with pe-*',
      'Open StorefrontSocialLinks component and apply the same physical→logical replacements',
      'Add dir={isRtl ? "rtl" : undefined} to the StorefrontSocialLinks wrapper div in the footer',
      'Switch locale to Arabic in admin settings, open /hub, verify the footer grid mirrors correctly',
      'Verify French/English footer is visually unchanged',
      'Run: git commit -m "i18n(hub): fix RTL footer layout using logical CSS properties"',
    ],
  },

  // ─── HH-16 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-16 🟢 ISR revalidate: 120s Is Too Aggressive — Increase to 300s',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['performance', 'hub', 'isr'],
    content: `## Overview
The hub homepage trending products fetch uses \`next: { revalidate: 120 }\` — rebuilding the page **30 times per hour** unnecessarily. The categories fetch already uses 300s. Both should be aligned.

## Affected File
\`frontend/src/app/hub/page.tsx\` — around **line 103** (trending products fetch)

## Fix
\`\`\`ts
// Change from:
next: { revalidate: 120 }
// To:
next: { revalidate: 300 }
\`\`\`

## On-Demand ISR
Verify \`/api/marketplace/revalidate\` is called when products are published. If working correctly, the interval can safely be raised to 600s+.

## Acceptance Criteria
- Trending products fetch uses \`revalidate: 300\` minimum
- All hub fetches are aligned on the same revalidation window
- On-demand revalidation fires when new products are published`,
    checklist: [
      'Open frontend/src/app/hub/page.tsx and find the trending products fetch call (~line 103)',
      'Change next: { revalidate: 120 } to next: { revalidate: 300 }',
      'Search the same file for any other revalidate: 120 calls and update all to 300',
      'Verify the categories fetch already uses revalidate: 300 (confirm it matches)',
      'Open the backend product publish/approve handlers and check for revalidatePath or revalidate API calls',
      'If on-demand revalidation is missing: add a call to revalidateHubHomepage() after product publish/approve',
      'Optional: use an env variable: process.env.HUB_PRODUCT_REVALIDATE_SECONDS ?? "300"',
      'Test: publish a product → wait → confirm it appears on /hub within the new window',
      'Run: git commit -m "perf(hub): increase ISR revalidate from 120s to 300s"',
    ],
  },

  // ─── HH-17 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-17 🟢 Layout Selection Uses a Fragile 5-Level Nested Ternary',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['refactor', 'hub', 'maintainability'],
    content: `## Overview
In \`hub/page.tsx\`, the homepage component is selected via a 5-level nested ternary. This is unreadable, fragile (adding a 6th layout requires editing the expression mid-chain), and error-prone (silent fallthrough on unknown values).

## Affected File
\`frontend/src/app/hub/page.tsx\` — around **line 164**

## Current (Bad) Pattern
\`\`\`tsx
// ❌ — 5-level ternary
const HomeContent = homepageLayout === 'classic' ? HubHomeContent
  : homepageLayout === 'modern' ? ModernHubContent
  : homepageLayout === 'aliexpress' ? AliexpressHubContent
  : homepageLayout === 'aliexpress2' ? Aliexpress2HubContent
  : homepageLayout === 'theme_default' ? resolveThemeDefault(marketplaceTheme)
  : HubHomeContent;
\`\`\`

## Correct Pattern
\`\`\`tsx
// ✅ — named function, one if per layout, explicit fallback
function resolveHomeContentComponent(layout: string, theme: string): ComponentType<HomeContentProps> {
  if (layout === 'classic') return HubHomeContent;
  if (layout === 'modern') return ModernHubContent;
  if (layout === 'aliexpress') return AliexpressHubContent;
  if (layout === 'aliexpress2') return Aliexpress2HubContent;
  if (layout === 'theme_default') return resolveThemeDefault(theme);
  return HubHomeContent; // safe default
}
\`\`\`

## Acceptance Criteria
- Layout resolution is a single named function
- Adding a new layout requires exactly 1 new \`if\` branch + 1 import
- All 6 layouts still render correctly
- \`npx tsc --noEmit\` passes`,
    checklist: [
      'Open frontend/src/app/hub/page.tsx and find the ternary chain around line 164',
      'Define or confirm a shared HomeContentProps interface that all layout components accept',
      'Create resolveHomeContentComponent(layout, theme) function above the page component',
      'Map each layout string to its component with simple if-statements',
      'Add safe default: return HubHomeContent at the bottom of the function',
      'Replace the ternary chain with: const HomeContent = resolveHomeContentComponent(homepageLayout, marketplaceTheme)',
      'Render: <HomeContent trendingProducts={trendingProducts} ... />',
      'Run: npx tsc --noEmit from the frontend/ directory — fix any type errors',
      'Test all 6 layouts by changing the setting in admin → Hub tab and reloading /hub for each',
      'Run: git commit -m "refactor(hub): replace layout ternary chain with resolveHomeContentComponent"',
    ],
  },

  // ─── HH-18 ──────────────────────────────────────────────────────────────
  {
    title: 'HH-18 🟢 No noscript Fallback — JS-Disabled Buyers See Blank Page',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['seo', 'a11y', 'hub', 'noscript'],
    content: `## Overview
\`HubHomeContent\` is a \`'use client'\` component. Buyers with JavaScript disabled see a **blank content area** — only the navbar and footer render. This affects SEO crawlers with limited JS, corporate networks that block scripts, and accessibility tools.

## Affected File
\`frontend/src/app/hub/page.tsx\` — page return statement

## Solution: \`<noscript>\` Server Fallback
Since \`hub/page.tsx\` is a Server Component, it can render a \`<noscript>\` fallback directly in the HTML:

\`\`\`tsx
function StaticProductGrid({ products, currency }) {
  return (
    <noscript>
      <div className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold mb-8">Trending Products</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {products.slice(0, 8).map(p => (
            <a key={p.id} href={\`/hub/products/\${p.slug || p.id}\`} className="block">
              {p.images?.[0]?.url && <img src={p.images[0].url} alt={p.title} className="w-full aspect-square object-cover rounded-xl" />}
              <p className="mt-2 font-medium text-sm">{p.title}</p>
            </a>
          ))}
        </div>
      </div>
    </noscript>
  );
}
\`\`\`

## Acceptance Criteria
- Disabling JS in Chrome DevTools → basic product grid is visible
- Google Search Console shows product content in rendered HTML
- No React hydration errors with the noscript tag in place`,
    checklist: [
      'Open frontend/src/app/hub/page.tsx (Server Component — safe to add noscript)',
      'Create a StaticProductGrid server component function using the pattern from the note content',
      'The function takes products and currency as props and renders a <noscript> block with plain <a href> links (not Next.js <Link> — that requires JS)',
      'Render <StaticProductGrid products={trendingProducts} currency={currencySetting} /> in the page return, after <HubHomeContent />',
      'Open Chrome DevTools → Settings → Debugger → Disable JavaScript, then reload /hub',
      'Confirm the static product grid is visible in the noscript fallback',
      'Re-enable JavaScript and confirm no hydration warning in the console',
      'Use Google Search Console URL Inspection to verify product content appears in rendered HTML',
      'Run: git commit -m "feat(hub): add noscript static product grid fallback for JS-disabled browsers"',
    ],
  },


];

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN SETTINGS NOTES  (AS-01 → AS-20)
// ═══════════════════════════════════════════════════════════════════════════

const AS_NOTES: NoteInput[] = [

  // ─── AS-01 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-01 🔴 handleSave Sends Full Settings Payload — Cross-Tab Data Loss',
    color: '#EF4444',
    priority: 'urgent',
    is_pinned: true,
    tags: ['bug', 'admin-settings', 'critical', 'data-loss'],
    content: `## Overview
This is the **most critical bug** in the Admin Settings page. Every time the admin clicks "Save Changes", the full payload of **all 100+ settings keys** is sent to the backend — regardless of which tab is active. This means if you are on the Finance tab, your unsaved edits on the Marketplace tab are also silently written to the database.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — \`handleSave\` function, around **line 1328**

## Root Cause
\`buildSettingsPayload(settings, tab?)\` has a tab-scope overload, but it is never used:
\`\`\`ts
// ❌ WRONG — sends everything, ignores tab scope
const payload = buildSettingsPayload(settings);

// ✅ CORRECT — send only what's on the active tab
const payload = buildSettingsPayload(settings, activeTab);
\`\`\`

## Danger Scenario
1. Admin opens Settings → Marketplace tab
2. Admin starts editing the store name
3. Admin switches to Finance tab without saving
4. Admin makes changes on Finance tab and clicks Save
5. **Result**: BOTH the unfinished Marketplace edit AND the Finance changes are written to the DB

## Acceptance Criteria
- Saving the Finance tab sends **only** Finance-tab keys to the API
- Unsaved edits on other tabs are preserved in local React state (not lost)
- Backend \`PUT /api/pd/admin/settings\` does a merge — not a full replace — confirmed`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the handleSave function (~line 1328)',
      'Change: const payload = buildSettingsPayload(settings); → const payload = buildSettingsPayload(settings, activeTab);',
      'Find the SETTINGS_TAB_KEYS map and confirm it contains the correct keys for each tab',
      'After a successful save, update only the active tab keys in savedSettings state: const savedKeys = SETTINGS_TAB_KEYS[activeTab]; setSavedSettings(prev => ({ ...prev, ...Object.fromEntries(savedKeys.map(k => [k, data.data?.[k] ?? settings[k]])) }))',
      'Open the backend settings PUT handler and confirm it does a MERGE (UPDATE only provided keys) — NOT a full replace',
      'If the backend does a full replace: fix it to use a MERGE pattern before proceeding',
      'Test scenario: edit Marketplace name → switch to Finance tab → make Finance changes → Save → verify Marketplace name change did NOT reach the DB',
      'Test: hasUnsavedPlatformChanges still correctly reflects unsaved changes on inactive tabs',
      'Run: git commit -m "fix(admin/settings): scope handleSave payload to active tab only — prevent cross-tab data loss"',
    ],
  },

  // ─── AS-02 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-02 🔴 No Confirmation When Switching Tabs With Unsaved Changes',
    color: '#EF4444', priority: 'high', is_pinned: true,
    tags: ['bug', 'admin-settings', 'data-loss', 'ux'],
    content: `## Overview
When an admin has unsaved changes on a settings tab and clicks a different tab, the form **silently discards all edits** with no warning, no confirmation, and no recovery option.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — tab onClick handler (~line 1510)

## Root Cause
\`\`\`tsx
// ❌ Switches immediately, discards changes
onClick={() => setActiveTab(tab.id)}
\`\`\`

## UX Flow to Implement
1. Admin edits a field on the Marketplace tab
2. Admin clicks the Finance tab
3. **Dialog appears:** "You have unsaved changes. What would you like to do?"
   - **"Stay & Save"** → saves current tab → then switches
   - **"Discard & Switch"** → reverts current tab → switches
   - **"Cancel"** → dismisses dialog, stays on current tab

## Also Required
Add a \`beforeunload\` event listener — warns when the browser tab/window is closed with unsaved changes.

## Acceptance Criteria
- Dialog appears on tab switch with any unsaved change
- "Stay & Save" saves then switches
- "Discard & Switch" reverts and switches
- \`beforeunload\` fires when navigating away`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx',
      'Add state: const [pendingTabId, setPendingTabId] = useState<string | null>(null)',
      'Add state: const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)',
      'Create handleTabClick(tabId): if hasUnsavedPlatformChanges → setPendingTabId(tabId), setShowUnsavedDialog(true); else setActiveTab(tabId)',
      'Replace onClick={() => setActiveTab(tab.id)} with onClick={() => handleTabClick(tab.id)}',
      'Add a modal with 3 buttons: "Stay & Save", "Discard & Switch", "Cancel"',
      '"Stay & Save": call handleSave(), then in the success callback setActiveTab(pendingTabId) and close dialog',
      '"Discard & Switch": revert active tab keys to savedSettings, then setActiveTab(pendingTabId), close dialog',
      '"Cancel": close dialog, keep current tab and changes',
      'Add useEffect: attach window.addEventListener("beforeunload", handler) when hasUnsavedPlatformChanges is true, remove when false',
      'Test: edit a field → click different tab → dialog appears → test all 3 button outcomes',
      'Test: edit a field → close browser tab → native "Leave site?" prompt appears',
      'Run: git commit -m "fix(admin/settings): add unsaved-changes guard and beforeunload protection"',
    ],
  },

  // ─── AS-03 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-03 🔴 Default Primary Color is Red (#B91C1C) but Hub Renders Green',
    color: '#F97316', priority: 'normal', is_pinned: false,
    tags: ['bug', 'admin-settings', 'theme', 'colors'],
    content: `## Overview
\`DEFAULT_SETTINGS\` has \`marketplace_primary_color: '#B91C1C'\` (admin UI red). But the Hub renders \`#16C784\` (green) everywhere via hardcoded Tailwind. A fresh deployment shows a contradiction: admin panel says "red", buyer-facing site is green.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — \`DEFAULT_SETTINGS\` (~line 247)

## Root Cause
\`\`\`ts
// ❌ Wrong defaults — admin UI color, not hub brand color
marketplace_primary_color: '#B91C1C',
marketplace_secondary_color: '#991B1B',
\`\`\`

## Full Fix: Wire CSS Variables to the Hub
Even with a correct default, the Hub ignores the stored color. Colors must be injected as CSS custom properties.

## Implementation Plan
1. Fix defaults to green (#16C784)
2. In \`hub/page.tsx\`, inject \`<style>:root { --pd-primary: ...; --pd-secondary: ...; }</style>\`
3. Replace \`text-[#16C784]\` in Hub components with \`text-pd-primary\`
4. Add \`pd-primary\` / \`pd-secondary\` to \`tailwind.config.ts\`

## Acceptance Criteria
- Default primary matches Hub brand green
- Changing color in admin settings updates the Hub visually
- Admin panel red accent is unaffected`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find DEFAULT_SETTINGS (~line 247)',
      'Change marketplace_primary_color from "#B91C1C" to "#16C784"',
      'Change marketplace_secondary_color from "#991B1B" to "#0f9f6e"',
      'Open frontend/src/app/hub/page.tsx and find the page return',
      'Add: <style dangerouslySetInnerHTML={{ __html: `:root { --pd-primary: ${marketplaceSettings.marketplace_primary_color ?? "#16C784"}; --pd-secondary: ${marketplaceSettings.marketplace_secondary_color ?? "#0f9f6e"}; }` }} />',
      'Open frontend/tailwind.config.ts and add: colors: { "pd-primary": "var(--pd-primary)", "pd-secondary": "var(--pd-secondary)" }',
      'Run: grep -r "text-\\[#16C784\\]" frontend/src/components/hub/ to find all hardcoded green usages',
      'Replace each text-[#16C784] with text-pd-primary, and bg-[#16C784] with bg-pd-primary',
      'Test: set blue (#3B82F6) in admin → save → reload /hub → hub renders in blue',
      'Confirm admin panel still uses its own red accent (not pd-primary)',
      'Run: git commit -m "fix(admin/settings): correct default primary color and wire CSS variables to Hub"',
    ],
  },

  // ─── AS-04 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-04 🔴 Hub Banner Image Field Has No Asset Picker Button',
    color: '#F97316', priority: 'normal', is_pinned: false,
    tags: ['bug', 'admin-settings', 'ux', 'asset-picker'],
    content: `## Overview
\`hub_homepage_banner_image_url\` is a plain text input. Every other logo/image field has an **"Upload / Choose"** button opening \`MarketplaceAssetPicker\`. The most important homepage image requires admins to paste raw URLs manually — a UX regression.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — Hub tab, banner image field (~line 1059)

## Field Template to Replace With
\`\`\`tsx
<div className="flex gap-2 items-center">
  <input type="text" value={settings.hub_homepage_banner_image_url || ''}
    onChange={(e) => updateSetting('hub_homepage_banner_image_url', e.target.value)}
    placeholder="https://..." className="flex-1 rounded-xl border px-4 py-3 text-sm" />
  <button type="button"
    onClick={() => setMarketplaceLogoPickerTarget('hub_homepage_banner_image_url')}
    className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium hover:bg-gray-200">
    <UploadCloud className="h-4 w-4" /> Choose
  </button>
</div>
{settings.hub_homepage_banner_image_url && (
  <img src={settings.hub_homepage_banner_image_url}
    className="mt-3 h-32 w-full rounded-xl object-cover border" alt="Banner preview" />
)}
\`\`\`

## Acceptance Criteria
- Banner field has a "Choose" button that opens the asset picker
- Selecting an image populates the URL and shows a live preview
- Same fix applied to og_image_url and favicon_url`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find hub_homepage_banner_image_url in the Hub tab (~line 1059)',
      'Extend the marketplaceLogoPickerTarget union type to include "hub_homepage_banner_image_url", "marketplace_og_image_url", "marketplace_favicon_url"',
      'Replace renderTextInput("hub_homepage_banner_image_url", ...) with the custom field template from the note',
      'Import UploadCloud from lucide-react if not already imported',
      'Verify MarketplaceAssetPicker onSelect calls updateSetting(marketplaceLogoPickerTarget, selectedUrl)',
      'Apply the same custom field pattern to marketplace_og_image_url in the Marketplace tab',
      'Apply the same custom field pattern to marketplace_favicon_url in the Marketplace tab',
      'Test: click Choose on the banner field → picker opens → select image → URL populated → preview appears',
      'Test: manually type a URL → preview image appears immediately below the field',
      'Run: git commit -m "feat(admin/settings): add asset picker and preview to hub banner, OG image, and favicon fields"',
    ],
  },

  // ─── AS-05 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-05 🔴 Rewards Prizes Edited as Raw JSON — No Validation or Guard',
    color: '#EF4444', priority: 'high', is_pinned: false,
    tags: ['bug', 'admin-settings', 'rewards', 'json-validation'],
    content: `## Overview
The Rewards/Wheel-of-Fortune settings shows prizes as a **raw JSON textarea**. One typo breaks the spinning-wheel widget for **all buyers simultaneously**. There is no validation, no error state, and the broken JSON is saved straight to the DB.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — Rewards tab (~line 749)

## Phase 1: Immediate Validation (Quick Fix)
\`\`\`tsx
const isValidPrizesJson = useMemo(() => {
  try { JSON.parse(settings.rewards_prizes_json || '[]'); return true; }
  catch { return false; }
}, [settings.rewards_prizes_json]);
\`\`\`
Red border + error message + **Save blocked** when invalid.

## Phase 2: Structured Prize Editor
Parse JSON → array of \`{ label, code, disc, icon, color, desc }\` objects → editable card rows with "Add Prize" / "Remove Prize" buttons → sync back to JSON string.

## Acceptance Criteria
- Invalid JSON shows immediate red border + error message
- Save button is disabled when prizes JSON is invalid
- The live wheel widget is never broken by bad admin input`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the rewards prizes textarea (~line 749)',
      'Add useMemo isValidPrizesJson: try JSON.parse, return true/false',
      'Add red border (border-red-400) to textarea when isValidPrizesJson is false',
      'Add red error message below: "⚠ Invalid JSON — save is blocked until this is fixed"',
      'In handleSave, add early return: if (!isValidPrizesJson) { showToast("Fix invalid prizes JSON"); return; }',
      'In buildSettingsPayload, wrap prizes JSON key in try/catch and fall back to last saved valid value',
      'PHASE 2: Parse JSON → parsedPrizes array (with try/catch)',
      'PHASE 2: Render each prize as an editable card with inputs for label, code, disc, icon, color, desc',
      'PHASE 2: Add "Add Prize" button (appends default empty prize object)',
      'PHASE 2: Add "Remove" button on each card (splices from array)',
      'PHASE 2: Sync card changes back: setSettings(prev => ({ ...prev, rewards_prizes_json: JSON.stringify(parsedPrizes) }))',
      'Test: enter broken JSON → red border → Save blocked → fix → red gone → Save works',
      'Run: git commit -m "fix(admin/settings): add JSON validation and structured prize editor for rewards wheel"',
    ],
  },

  // ─── AS-06 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-06 🔴 Settings Search Bar Is Completely Non-Functional (Dead Feature)',
    color: '#EF4444', priority: 'high', is_pinned: true,
    tags: ['bug', 'admin-settings', 'search', 'dead-feature'],
    content: `## Overview
The search bar shows **"Search settings (e.g. logo, aramex, flouci)..."** but typing anything does absolutely nothing. \`searchQuery\` state is set but never used to filter, highlight, or navigate to any field. Fully non-functional dead code.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — search bar (~line 1460)

## Implementation Plan

### 1. Build a Search Index
\`\`\`ts
const SETTINGS_SEARCH_INDEX = [
  { key: 'marketplace_name', label: 'Marketplace Name', tab: 'marketplace', keywords: ['name', 'title'] },
  { key: 'smtp_host', label: 'SMTP Host', tab: 'email', keywords: ['smtp', 'email', 'mail'] },
  // ... one entry per field
]
\`\`\`

### 2. Compute Results with useMemo
\`\`\`ts
const searchResults = useMemo(() =>
  !searchQuery ? [] : SETTINGS_SEARCH_INDEX.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.keywords.some(k => k.includes(searchQuery.toLowerCase()))
  ), [searchQuery]);
\`\`\`

### 3. Navigate on Click
\`\`\`tsx
onClick={() => {
  setActiveTab(result.tab);
  setTimeout(() => document.getElementById('setting-' + result.key)?.scrollIntoView({ behavior: 'smooth' }), 100);
}}
\`\`\`

## Acceptance Criteria
- Typing "logo" shows all logo-related fields across all tabs
- Clicking result navigates to tab and scrolls to field
- Empty query → no results panel shown`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the searchQuery state and search bar input',
      'Create SETTINGS_SEARCH_INDEX array above the component — one entry per settings field with: key, label, tab, keywords[]',
      'Include at least 30 entries covering all 9 tabs',
      'Add useMemo searchResults: filter index by searchQuery (case-insensitive match on label and keywords)',
      'When searchQuery non-empty and results exist: render a dropdown panel below the search bar',
      'Each result shows: field label, colored tab badge, and a right-arrow icon',
      'Clicking a result: setActiveTab(result.tab), then setTimeout 100ms, then getElementById("setting-" + result.key)?.scrollIntoView()',
      'Add id={"setting-" + key} to each settings field wrapper div throughout the page',
      'When searchQuery non-empty and no results: show "No settings found for: [query]"',
      'Press Escape: clear searchQuery and close the results panel',
      'Test: type "logo" → see logo results → click one → tab switches, field scrolls into view',
      'Run: git commit -m "feat(admin/settings): implement functional search bar with jump navigation"',
    ],
  },

  // ─── AS-07 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-07 🔴 Empty SMTP Password Silently Clears Saved Credentials',
    color: '#EF4444', priority: 'high', is_pinned: false,
    tags: ['bug', 'admin-settings', 'smtp', 'security'],
    content: `## Overview
When an admin saves Email settings without re-entering the SMTP password (the field is blank by default), \`smtp_pass: ""\` is sent to the backend. This may **overwrite the stored password with an empty string** — silently breaking all transactional email (order confirmations, password resets, etc.).

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — \`handleSmtpSave\` (~line 1363)

## Root Cause
\`\`\`ts
// ❌ Always sends smtp_pass even when blank
const res = await fetchWithCsrf('/api/pd/admin/smtp-config', {
  body: JSON.stringify(smtpForm), // smtp_pass === "" when unchanged
});
\`\`\`

## Frontend Fix
\`\`\`ts
// ✅ Strip empty password before sending
const smtpPayload = { ...smtpForm };
if (!smtpPayload.smtp_pass) delete smtpPayload.smtp_pass;
\`\`\`

## Backend Fix (also required)
Backend SMTP PUT handler must NOT overwrite the stored password when \`smtp_pass\` key is absent from the request body.

## Password Status UX
Show a status indicator below the smtp_pass field:
- ✓ "Password saved — leave blank to keep"
- ⚠ "No password saved yet"

## Acceptance Criteria
- Saving without new password does NOT change the stored SMTP password
- Test email works after saving without re-entering password
- Password field shows a clear status indicator`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find handleSmtpSave (~line 1363)',
      'Add: const smtpPayload = { ...smtpForm }; if (!smtpPayload.smtp_pass) delete smtpPayload.smtp_pass;',
      'Update the fetch body to use smtpPayload instead of smtpForm',
      'Open the backend SMTP config PUT handler (grep backend/src for smtp-config route)',
      'Confirm the UPDATE query only includes smtp_pass in SET clause when present in the request body',
      'If the backend does a full replace: change it to only update fields present in the payload',
      'Add a password status badge below the smtp_pass input field',
      'If smtp_pass is empty AND smtp_pass_is_set is true: green "✓ Password saved — leave blank to keep"',
      'If smtp_pass is empty AND smtp_pass_is_set is false: yellow "⚠ No password saved"',
      'Backend should return smtp_pass_is_set: boolean (never return the actual password)',
      'Test: save SMTP without entering password → send test email → must succeed',
      'Run: git commit -m "fix(admin/settings): omit empty smtp_pass from payload, preserve stored password"',
    ],
  },

  // ─── AS-08 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-08 🟡 No Live Preview of Hub Banner While Editing',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'ux', 'preview'],
    content: `## Overview
To see how a banner change looks, an admin must: save → wait ISR revalidation (up to 5min) → open /hub → check. A live preview card eliminates this feedback loop.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — Hub tab, banner section

## BannerPreview Component
\`\`\`tsx
function BannerPreview({ settings }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-8 md:col-span-2"
      style={{ backgroundImage: settings.hub_homepage_banner_image_url
        ? \`url(\${settings.hub_homepage_banner_image_url})\` : 'none',
        backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/60 rounded-2xl" />
      <div className="relative z-10 max-w-xl">
        <h2 className="text-3xl font-black text-white">
          {settings.hub_homepage_banner_title || 'Your Banner Title Here'}
        </h2>
        <p className="mt-2 text-white/70">
          {settings.hub_homepage_banner_subtitle || 'Subtitle text goes here'}
        </p>
        <button className="mt-4 rounded-xl bg-[#16C784] px-6 py-2 text-sm font-bold text-white">
          {settings.hub_homepage_banner_cta_label || 'Shop Now'}
        </button>
      </div>
      <a href="/hub" target="_blank" className="absolute top-4 right-4 z-10 text-white/70 text-sm underline">
        View live →
      </a>
    </div>
  );
}
\`\`\`

## Acceptance Criteria
- Preview updates in real-time as admin types
- Shows: title, subtitle, CTA button, background image
- "View live →" link opens /hub in a new tab`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the Hub tab banner fields section',
      'Create BannerPreview component using the template from the note content',
      'Show hub_homepage_banner_title (placeholder "Your Banner Title Here" when empty)',
      'Show hub_homepage_banner_subtitle (placeholder when empty)',
      'Show hub_homepage_banner_cta_label as a styled green button (placeholder when empty)',
      'Use hub_homepage_banner_image_url as CSS background-image with a dark overlay',
      'Add "View live page →" link that opens /hub in a new tab',
      'Place <BannerPreview settings={settings} /> below the banner input fields using md:col-span-2',
      'Test: type in the title field → preview updates instantly without saving',
      'Test: paste an image URL → background appears immediately in the preview',
      'Run: git commit -m "feat(admin/settings): add live banner preview card in Hub settings tab"',
    ],
  },

  // ─── AS-09 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-09 🟡 Theme Selector Buried After 40 Fields — Hard to Discover',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'ux', 'theme'],
    content: `## Overview
The **Marketplace Theme** selector is the most impactful visual setting — it changes the entire buyer-facing store. Yet it is positioned **after 40+ other fields**, requiring significant scrolling. New operators routinely miss it.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — \`renderMarketplaceThemeSelector()\` (~line 1203)

## Recommended New Layout (Top of Marketplace Tab)
1. 🎨 **Theme selector** ← move to TOP
2. 🏠 **Homepage Layout** (see AS-11)
3. 🎨 **Primary + Secondary Color** pickers
4. (Collapsible) Advanced branding

## Active Badge
Add a green ✓ "Active" badge to the currently selected theme card.

## Acceptance Criteria
- Theme selector is the **first** visible section on the Marketplace tab
- Active theme card has a ✓ "Active" badge
- Color pickers are grouped in an "Appearance" section directly below`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find renderMarketplaceThemeSelector() call in the Marketplace tab',
      'Cut the renderMarketplaceThemeSelector() call and paste it at the TOP of the Marketplace tab, before all other fields',
      'Add a section header: <SectionHeader icon={<LayoutGrid />} title="Appearance & Theme" />',
      'Move marketplace_primary_color and marketplace_secondary_color pickers to immediately after the theme selector',
      'Move homepage layout selector (renderHomepageLayoutSelector) after the color pickers (see AS-11)',
      'Inside renderMarketplaceThemeSelector, add Active badge to the selected card: <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">✓ Active</span>',
      'Optionally wrap the Appearance section in <details open> for collapsibility',
      'Test: open Marketplace tab → theme selector visible without any scrolling',
      'Test: switch theme → Active badge moves to the new selection',
      'Run: git commit -m "feat(admin/settings): elevate theme selector to top of Marketplace tab"',
    ],
  },

  // ─── AS-10 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-10 🟡 Maintenance Mode Toggle Has No Confirmation Dialog (Danger)',
    color: '#F59E0B', priority: 'high', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'safety', 'maintenance'],
    content: `## Overview
The **Maintenance Mode** toggle is one click away from taking the **entire marketplace offline** for all buyers and vendors. There is no confirmation, no warning, and no visible indication until the page refreshes. A misclick during a live sale is catastrophic.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — \`renderToggle('maintenance_enabled', ...)\` (~line 1555)

## Safety Pattern
**Enabling** (dangerous → requires confirmation):
1. Admin clicks toggle ON
2. Modal: "⚠ Take Platform Offline?" with red styling
3. Two buttons: **"Yes, Take Offline"** (red) / **"Cancel"** (gray)

**Disabling** (safe → immediate, no dialog):
Toggle can turn OFF immediately.

**Active Maintenance Banner:**
When \`maintenance_enabled === true\` AND saved: show a persistent red banner at the top of the admin panel.

## Acceptance Criteria
- Enabling maintenance requires explicit confirmation click
- Disabling is immediate (no dialog)
- Active maintenance shows persistent red warning banner in admin`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx',
      'Add state: const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false)',
      'Find renderToggle("maintenance_enabled", ...) and replace with a custom toggle component',
      'Custom toggle: when clicked to ON → do NOT update state → setShowMaintenanceConfirm(true)',
      'Custom toggle: when clicked to OFF → immediately update settings state to maintenance_enabled: false',
      'Add a danger confirmation modal when showMaintenanceConfirm is true',
      'Modal: red design, warning message, "Yes, Take Platform Offline" button + "Cancel" button',
      '"Yes" button: updateSetting("maintenance_enabled", true), setShowMaintenanceConfirm(false)',
      '"Cancel" button: setShowMaintenanceConfirm(false), ensure toggle visually resets to OFF',
      'At the top of the settings page, add a persistent red banner when savedSettings.maintenance_enabled === true',
      'Test: click toggle → modal appears → Cancel → toggle stays OFF',
      'Test: click toggle → modal → Confirm → setting updates → red banner appears',
      'Run: git commit -m "feat(admin/settings): add confirmation dialog and warning banner for maintenance mode"',
    ],
  },

  // ─── AS-11 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-11 🟡 Homepage Layout Selector Is a Plain <select> — No Visual Preview',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'ux', 'layout'],
    content: `## Overview
The **Homepage Layout** setting (6 options: classic, modern, aliexpress, aliexpress2, masonry, theme_default) is a plain HTML \`<select>\` dropdown. Admins have no idea what each layout looks like without switching it live — a frustrating trial-and-error process.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — homepage layout \`<select>\`

## Replacement: Visual Card Grid (same pattern as theme selector)
Each layout card shows:
- Layout name + short description
- Tiny wireframe grid skeleton showing the layout structure
- "✓ Active" badge on the current selection
- "Premium" or "New" badges where applicable

## Layout Definitions
\`\`\`ts
const LAYOUT_OPTIONS = [
  { id: 'classic', name: 'Classic', desc: 'Clean grid with hero banner' },
  { id: 'modern', name: 'Modern', desc: 'Card-based with large imagery' },
  { id: 'aliexpress', name: 'AliExpress', desc: 'Dense product grid, deal-focused' },
  { id: 'aliexpress2', name: 'AliExpress Pro', desc: 'Premium version', badge: 'Premium' },
  { id: 'masonry', name: 'Masonry', desc: 'Pinterest-style varied heights', badge: 'New' },
  { id: 'theme_default', name: 'Theme Default', desc: 'Uses your active theme layout' },
]
\`\`\`

## Acceptance Criteria
- All 6 layouts shown as visual selection cards
- Active layout has a ✓ "Active" badge
- "Theme Default" shows which layout it resolves to
- Changing card selection updates the setting immediately`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the homepage layout <select> field',
      'Create LAYOUT_OPTIONS array above the component with: id, name, desc, badge for all 6 layouts',
      'Create renderHomepageLayoutSelector() following the same card pattern as renderMarketplaceThemeSelector()',
      'Each card shows: layout name, description, small visual preview (CSS skeleton or color swatches), badge if applicable',
      'The active layout (matching settings.hub_homepage_layout) gets a green "✓ Active" overlay badge',
      'Clicking a card calls updateSetting("hub_homepage_layout", layout.id)',
      'For "theme_default" card: add a note "Will use [X layout] based on your active [Y theme] theme"',
      'Replace the old <select> for hub_homepage_layout with renderHomepageLayoutSelector()',
      'Position below the theme selector in the Appearance section (see AS-09)',
      'Test: select "AliExpress" → save → reload /hub → AliExpress layout renders',
      'Run: git commit -m "feat(admin/settings): replace layout select with visual card picker"',
    ],
  },

  // ─── AS-12 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-12 🟡 Global Commission Rate Has No Warning About Per-Plan Conflicts',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'finance', 'commission'],
    content: `## Overview
The Finance tab has a **Global Commission Rate** field. But the Plans tab has per-plan rates that **override** the global rate for vendors on paid plans. An admin can configure the global rate not realising it has zero effect on 80% of vendors (those on paid plans).

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — Finance tab, \`platform_commission_rate\` (~line 766)

## Context Warning Box to Add
\`\`\`tsx
<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
  <p className="font-semibold">⚠ Scope: Free Plan Vendors Only</p>
  <p className="mt-1">Paid subscription plans have their own commission rates in the Plans tab.</p>
  <a href="#" onClick={() => setActiveTab('plans')} className="mt-2 inline-block font-medium underline">
    View per-plan rates →
  </a>
</div>
\`\`\`

## Validation
Clamp to 0–100% on blur: \`Math.max(0, Math.min(100, Number(value)))\`

## Acceptance Criteria
- Commission field has amber scope warning
- "View per-plan rates" link navigates to Plans tab
- Rate is clamped to 0–100%`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find platform_commission_rate in Finance tab (~line 766)',
      'Add the amber info box directly below the field label (above the input)',
      'Info box: explains this is the fallback rate for Free plan vendors only',
      'Add "View per-plan commission rates →" link that calls setActiveTab("plans")',
      'Add onBlur validation: clamp value to Math.max(0, Math.min(100, Number(value)))',
      'Add input type="number" with min="0" max="100" step="0.1" attributes',
      'Optionally fetch and display a summary table of plan commission rates from the plans API',
      'Test: enter -5 → blur → snaps to 0',
      'Test: enter 150 → blur → snaps to 100',
      'Test: click "View per-plan rates →" → navigates to Plans tab',
      'Run: git commit -m "feat(admin/settings): add commission rate context warning and 0-100% validation"',
    ],
  },

  // ─── AS-13 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-13 🟡 Seller Rail Settings Stored in DB But Never Read by Hub',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'hub', 'seller-rail'],
    content: `## Overview
The Admin Settings panel has **6 dedicated fields** for the hero seller-signup CTA:
- \`hub_hero_seller_rail_title\` / \`hub_hero_seller_rail_subtitle\`
- \`hub_hero_seller_rail_cta_label\` / \`hub_hero_seller_rail_cta_url\`
- \`hub_hero_seller_rail_badge_text\`
- \`hub_hero_show_seller_rail\` (visibility toggle)

All 6 are saved to the DB when the admin saves. **None are read by \`HubHomeContent.tsx\`**. The hero CTA has hardcoded text that never changes.

## Affected Files
- \`frontend/src/app/(admin)/settings/page.tsx\` — has the fields ✓
- \`frontend/src/components/hub/HubHomeContent.tsx\` — ignores all 6 ✗

## Fix
Extend \`HubHomeContent\`'s \`marketplaceSettings\` interface with these 6 keys, then wire each hardcoded text with:
\`\`\`tsx
{marketplaceSettings?.hub_hero_seller_rail_title || t('hub.hero.defaultCtaTitle')}
\`\`\`

## Acceptance Criteria
- Changing the seller rail title in admin → updates the hero CTA on /hub after save
- \`hub_hero_show_seller_rail: false\` hides the entire card
- All 5 text fields are wired to override defaults`,
    checklist: [
      'Open frontend/src/components/hub/HubHomeContent.tsx and find the MarketplaceSettings interface or prop type',
      'Add 6 keys to the interface: hub_hero_seller_rail_title, hub_hero_seller_rail_subtitle, hub_hero_seller_rail_cta_label, hub_hero_seller_rail_cta_url, hub_hero_seller_rail_badge_text, hub_hero_show_seller_rail',
      'Find the hero seller CTA card (~line 479) — it has hardcoded text',
      'Replace title with: {marketplaceSettings?.hub_hero_seller_rail_title || t("hub.hero.ctaCreateStore")}',
      'Replace subtitle with: {marketplaceSettings?.hub_hero_seller_rail_subtitle || t("hub.hero.ctaSubtitle")}',
      'Replace CTA button text with: {marketplaceSettings?.hub_hero_seller_rail_cta_label || t("hub.hero.ctaButton")}',
      'Replace CTA button href with: href={marketplaceSettings?.hub_hero_seller_rail_cta_url || "/hub/vendor-signup"}',
      'Replace badge text with: {marketplaceSettings?.hub_hero_seller_rail_badge_text || "Gratuit"}',
      'Wrap entire seller CTA card with: {(marketplaceSettings?.hub_hero_show_seller_rail !== false) && ( ... )}',
      'Test: change seller rail title in admin → save → reload /hub → new title appears',
      'Test: set hub_hero_show_seller_rail to false → save → seller CTA card disappears on /hub',
      'Run: git commit -m "feat(hub): wire hub_hero_seller_rail_* settings to classic theme hero CTA"',
    ],
  },

  // ─── AS-14 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-14 🟡 No Discard Changes / Reset to Defaults Button Per Tab',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'ux'],
    content: `## Overview
Once changes are made on a settings tab, there is **no way to undo** them except reloading the entire page (which loses ALL in-progress work on ALL tabs). A "Discard Changes" button for the current tab is a significant UX improvement.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — sticky header actions

## Two Actions to Add

### 1. Discard Changes (Per-Tab, in sticky header)
\`\`\`tsx
function handleReset() {
  const tabKeys = SETTINGS_TAB_KEYS[activeTab];
  setSettings(prev => ({
    ...prev,
    ...Object.fromEntries(tabKeys.map(k => [k, savedSettings[k]]))
  }));
}
\`\`\`
Show only when \`hasUnsavedPlatformChanges\` is true.

### 2. Reset to Factory Defaults (Per-Tab, in Danger Zone)
Resets to \`DEFAULT_SETTINGS\` values. NOT a save — admin must still click Save.

## Acceptance Criteria
- "Discard Changes" button appears in sticky header with unsaved changes
- Clicking reverts only active tab's fields to last saved values
- Factory defaults reset shows as unsaved until Save is clicked`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the sticky header save button area',
      'Add handleReset(): reads SETTINGS_TAB_KEYS[activeTab], resets those keys to savedSettings values',
      'Add "Discard Changes" button with RotateCcw icon in sticky header — show only when hasUnsavedPlatformChanges',
      'Discard Changes button calls handleReset() — no confirmation needed (changes not yet saved)',
      'At the bottom of each tab section, add a collapsible <details> Danger Zone with a styled <summary>',
      'Inside Danger Zone: "Reset [Tab Name] to Factory Defaults" button',
      'Factory defaults button: setSettings(prev => ({ ...prev, ...Object.fromEntries(SETTINGS_TAB_KEYS[activeTab].map(k => [k, DEFAULT_SETTINGS[k]])) }))',
      'Factory defaults does NOT save — just populates the form. Admin must click Save.',
      'Test: edit 3 fields → Discard Changes → all 3 revert → hasUnsavedPlatformChanges becomes false',
      'Test: Reset to Factory Defaults → fields reset → Save button becomes active (unsaved state)',
      'Run: git commit -m "feat(admin/settings): add Discard Changes and Reset to Factory Defaults buttons"',
    ],
  },

  // ─── AS-15 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-15 🟡 Image Size Settings Have No Aspect Ratio Validation',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'images', 'validation'],
    content: `## Overview
Admin can enter \`width=1200, height=50\` (a 24:1 ratio) — distorting **all product thumbnails** platform-wide. No validation, no warning, no visual feedback.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — image size fields

## renderImageSizeInputs Helper
\`\`\`tsx
function renderImageSizeInputs(prefix: string, label: string) {
  const w = Number(settings[\`\${prefix}_w\`]) || 0;
  const h = Number(settings[\`\${prefix}_h\`]) || 1;
  const ratio = w / h;
  const isSquare = Math.abs(ratio - 1) < 0.1;
  const isExtreme = ratio > 3 || ratio < 0.33;
  return (
    <div>
      <label>{label}</label>
      <div className="flex gap-3">
        <input type="number" min="50" max="4000" value={w}
          onChange={(e) => updateSetting(\`\${prefix}_w\`, Math.max(50, Math.min(4000, +e.target.value)))} />
        <span className="self-center text-gray-400">×</span>
        <input type="number" min="50" max="4000" value={h}
          onChange={(e) => updateSetting(\`\${prefix}_h\`, Math.max(50, Math.min(4000, +e.target.value)))} />
      </div>
      {isSquare && <p className="text-green-600 text-xs mt-1">✓ Square aspect ratio</p>}
      {isExtreme && <p className="text-red-500 text-xs mt-1">⚠ Extreme ratio ({ratio.toFixed(1)}:1) — may distort images</p>}
      <div className="mt-2 border rounded bg-gray-50" style={{ width: Math.min(w/10, 120), height: Math.min(h/10, 120) }} />
    </div>
  );
}
\`\`\`

## Acceptance Criteria
- 1200×50 shows red "Extreme ratio" warning
- 300×300 shows green "Square" indicator
- Dimensions clamped to 50–4000px`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find all image size inputs (search for _w and _h suffix fields)',
      'Create renderImageSizeInputs(prefix, label) helper using the template from the note content',
      'Helper computes: ratio = w/h, isSquare (ratio within 0.1 of 1.0), isExtreme (ratio > 3 or < 0.33)',
      'Show green "✓ Square" message when isSquare is true',
      'Show red "⚠ Extreme ratio" warning when isExtreme is true',
      'Add mini rectangle preview div with CSS width/height proportional to values (capped at 120px)',
      'In onChange handlers, clamp: Math.max(50, Math.min(4000, Number(e.target.value)))',
      'Also clamp in buildSettingsPayload for all image_size_* keys as a safety net',
      'Replace raw renderNumberInput calls for image size fields with renderImageSizeInputs()',
      'Test: 1200×50 → red warning → preview is wide flat rectangle',
      'Test: 300×300 → green square indicator → preview is a square',
      'Run: git commit -m "feat(admin/settings): add aspect ratio validation to image size settings"',
    ],
  },

  // ─── AS-16 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-16 🟢 All 9 Tabs Load Simultaneously on Mount (Performance Waste)',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['performance', 'admin-settings'],
    content: `## Overview
All 9 tabs' JSX renders simultaneously on every page load using a \`hidden\` CSS class. This means 9× the DOM nodes on mount, and the SMTP config fetch fires even if the admin never opens the Email tab.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — tab rendering pattern (~line 1259)

## Current (Wasteful) Pattern
\`\`\`tsx
// ❌ — all tabs always in DOM
<div className={activeTab === 'marketplace' ? '' : 'hidden'}>...</div>
<div className={activeTab === 'hub' ? '' : 'hidden'}>...</div>
// ... × 9
\`\`\`

## Correct Pattern: Conditional Rendering
\`\`\`tsx
// ✅ — only active tab in DOM
{activeTab === 'marketplace' && <MarketplaceTab ... />}
{activeTab === 'email' && <EmailTab ... />}
\`\`\`

## SMTP Fetch Deferral
\`\`\`ts
const [smtpFetched, setSmtpFetched] = useState(false);
useEffect(() => {
  if (activeTab === 'email' && !smtpFetched)
    fetchSmtpConfig().then(() => setSmtpFetched(true));
}, [activeTab, smtpFetched]);
\`\`\`

## Acceptance Criteria
- Only active tab's JSX exists in DOM
- SMTP fetch deferred until Email tab first opened
- \`hasUnsavedPlatformChanges\` still works (reads state, not DOM — no regression)`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the 9 tab content divs (~line 1259)',
      'Replace className={activeTab === "marketplace" ? "" : "hidden"} pattern with conditional rendering for all 9 tabs',
      'Pattern: {activeTab === "marketplace" && ( ... )} — do this for all 9 tabs',
      'Find the SMTP config fetch useEffect',
      'Add state: const [smtpFetched, setSmtpFetched] = useState(false)',
      'Change SMTP useEffect to only fire when: activeTab === "email" && !smtpFetched',
      'After fetch resolves: setSmtpFetched(true) so it only fires once per session',
      'Add a loading skeleton inside the Email tab while SMTP config is loading (!smtpFetched)',
      'Verify hasUnsavedPlatformChanges computation is unaffected (it reads from settings state, not DOM)',
      'Open Chrome DevTools → Performance → record page load → compare Time-to-Interactive before/after',
      'Test all 9 tabs: navigate to each and confirm correct content renders',
      'Run: git commit -m "perf(admin/settings): lazy-render inactive tabs and defer SMTP fetch"',
    ],
  },

  // ─── AS-17 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-17 🟢 No Audit Log Link Shown After Saving Settings',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['improvement', 'admin-settings', 'audit-log'],
    content: `## Overview
After saving settings, the page shows "✓ Saved!" for 3 seconds then disappears. There is no way to quickly verify what was recorded in the audit log without manually navigating there.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — success banner after handleSave (~line 1342)

## Implementation
\`\`\`ts
// After successful save:
const auditRes = await fetch('/api/pd/admin/audit-log?limit=1&action=settings_update', { credentials: 'include' });
const entry = (await auditRes.json()).data?.[0];
if (entry?.id) setAuditLogUrl(\`/dashboard/audit-log?highlight=\${entry.id}\`);
\`\`\`

In the success banner:
\`\`\`tsx
{auditLogUrl && (
  <a href={auditLogUrl} className="ms-2 underline text-sm font-medium">
    View in audit log →
  </a>
)}
\`\`\`

## Acceptance Criteria
- "View in audit log →" link appears after every successful save
- Link navigates to the audit log with the entry highlighted
- Link disappears when the success banner auto-dismisses`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the handleSave success handler (~line 1342)',
      'Add state: const [auditLogUrl, setAuditLogUrl] = useState<string | null>(null)',
      'After the save API call succeeds, fetch: GET /api/pd/admin/audit-log?limit=1&action=settings_update',
      'Extract entry ID: const entryId = auditData.data?.[0]?.id',
      'If entryId exists: setAuditLogUrl(`/dashboard/audit-log?highlight=${entryId}`)',
      'In the success banner JSX, add: {auditLogUrl && <a href={auditLogUrl} className="ms-2 underline text-sm">View in audit log →</a>}',
      'In the banner auto-dismiss timeout, also reset: setAuditLogUrl(null)',
      'Test: save settings → success banner appears with "View in audit log →" link → click it → navigates to entry',
      'Test: after 8 seconds → banner and link both disappear',
      'Run: git commit -m "feat(admin/settings): add View in audit log link to save success banner"',
    ],
  },

  // ─── AS-18 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-18 🔴 marketplace_public_url Defaults to "garbage.team" Dev Domain',
    color: '#EF4444', priority: 'urgent', is_pinned: true,
    tags: ['bug', 'admin-settings', 'config', 'critical'],
    content: `## Overview
**Critical deployment risk.** \`DEFAULT_SETTINGS\` contains:
\`\`\`ts
marketplace_public_url: 'https://garbage.team'
\`\`\`
Any operator who deploys without changing this will have ALL of the following pointing to garbage.team:
- All transactional email links (order confirmations, password resets)
- All OpenGraph canonical URLs (social sharing)
- All JSON-LD structured data URLs
- Vendor store URLs shared with buyers

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — \`DEFAULT_SETTINGS\` (~line 245)

## Required Fixes
1. **Change default** to empty string: \`marketplace_public_url: ''\`
2. **REQUIRED badge**: red badge on the field label
3. **Empty validation**: red border + "⚠ This field is required" when empty
4. **Dev domain warning**: amber warning when value contains "garbage.team"
5. **Format validation**: must start with \`https://\`, strip trailing slash on save

## Acceptance Criteria
- Default is empty string (not garbage.team)
- Empty field shows red required warning
- garbage.team value shows amber dev warning
- Value validated to start with https://`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find DEFAULT_SETTINGS (~line 245)',
      'Change marketplace_public_url from "https://garbage.team" to an empty string: ""',
      'Find the marketplace_public_url input field in the Marketplace tab',
      'Add a red "REQUIRED" badge next to the field label',
      'Add computed: const publicUrlEmpty = !settings.marketplace_public_url',
      'When publicUrlEmpty: add border-red-400 to input + show: "⚠ This field is required — email links and canonical URLs will be broken"',
      'Add computed: const publicUrlIsDevDomain = settings.marketplace_public_url?.includes("garbage.team")',
      'When publicUrlIsDevDomain: show amber warning: "⚠ You appear to be using the dev preview domain. Update before going live."',
      'In handleSave or buildSettingsPayload: validate value starts with "https://" — block save if not',
      'Strip trailing slash: value.replace(/\\/$/, "")',
      'Block Save button for Marketplace tab when publicUrlEmpty is true',
      'Run: git commit -m "fix(admin/settings): change marketplace_public_url default to empty, add REQUIRED validation"',
    ],
  },

  // ─── AS-19 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-19 🟢 Mandat Payment Fields Have No Copy-to-Clipboard Buttons',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['improvement', 'admin-settings', 'mandat', 'support-ux'],
    content: `## Overview
The Finance tab has Mandat payment fields (recipient name, CIN, city, proof email) that support agents copy and share with buyers. Currently they must select text manually. A one-click copy button saves time and prevents errors.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — Finance tab, Mandat section

## CopyableField Component
\`\`\`tsx
function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 rounded-xl border bg-stone-50 px-4 py-3 text-sm select-all">
          {value || <span className="text-gray-400 italic">Not configured</span>}
        </div>
        <button type="button" disabled={!value}
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="rounded-xl border p-3 hover:bg-gray-50 disabled:opacity-40">
          {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-500" />}
        </button>
      </div>
    </div>
  );
}
\`\`\`

## Acceptance Criteria
- One-click copy for each mandat field
- "Copy All" gives complete formatted instructions
- "Copied!" feedback for 2 seconds`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the Mandat payment section in Finance tab',
      'Create a CopyableField component using the template from the note content',
      'Import Copy and CheckCircle2 from lucide-react',
      'Replace mandat_recipient_name display with: <CopyableField label="Recipient Name" value={settings.mandat_recipient_name || ""} />',
      'Replace mandat_cin with: <CopyableField label="CIN" value={settings.mandat_cin || ""} />',
      'Replace mandat_city with: <CopyableField label="City" value={settings.mandat_city || ""} />',
      'Replace mandat_proof_email with: <CopyableField label="Proof Email" value={settings.mandat_proof_email || ""} />',
      'Add a "Copy All Instructions" button that formats and copies: "Mandat to: [name]\\nCIN: [cin]\\nCity: [city]\\nProof to: [email]"',
      'Test: click copy on a field → icon changes to green checkmark → 2s → reverts to copy icon',
      'Test: field with empty value → button is disabled',
      'Run: git commit -m "feat(admin/settings): add copy-to-clipboard to mandat payment fields"',
    ],
  },

  // ─── AS-20 ──────────────────────────────────────────────────────────────
  {
    title: 'AS-20 🟢 Settings Tab Strip Has No Overflow Indicator on Mobile',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['improvement', 'admin-settings', 'mobile', 'ux'],
    content: `## Overview
On mobile screens, 9 tabs overflow horizontally with **no fade gradient, no scroll arrows, and no indicator** of hidden content. Admins miss "Integrations", "Plans", and "Email" tabs entirely.

## Affected File
\`frontend/src/app/(admin)/settings/page.tsx\` — tab strip container (~line 1498)

## TabStrip Component
\`\`\`tsx
function TabStrip({ tabs, activeTab, onTabClick }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = scrollRef.current;
    el?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();
    return () => { el?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);

  // Auto-scroll active tab into view
  useEffect(() => {
    scrollRef.current?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  return (
    <div className="relative">
      {canScrollLeft && <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />}
      {canScrollRight && <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />}
      <div ref={scrollRef} className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {tabs.map(tab => (
          <button key={tab.id} data-active={activeTab === tab.id} onClick={() => onTabClick(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
\`\`\`

## Acceptance Criteria
- Gradient fade visible at edges when overflow exists
- Active tab auto-scrolls into view on tab change
- Native scrollbar hidden but scroll still works`,
    checklist: [
      'Open frontend/src/app/(admin)/settings/page.tsx and find the tab strip container (~line 1498)',
      'Extract the tab strip into a TabStrip component (in the same file or a small separate file)',
      'Add scrollRef = useRef<HTMLDivElement>(null)',
      'Add canScrollLeft and canScrollRight state booleans',
      'Add updateScrollState function reading scrollRef.current.scrollLeft and scrollWidth',
      'Add scroll + resize event listeners in a useEffect calling updateScrollState',
      'When canScrollLeft: render left fade gradient (absolute, pointer-events-none)',
      'When canScrollRight: render right fade gradient',
      'Add [scrollbar-width:none] (or overflow-x:scroll with scrollbar-width:none CSS) to the tab container',
      'Add useEffect watching activeTab: scrollIntoView({ inline: "center" }) on the active tab button',
      'Replace current tab strip markup with <TabStrip tabs={SETTINGS_TABS} activeTab={activeTab} onTabClick={handleTabClick} />',
      'Test on 375px viewport: scroll tabs → gradients appear/disappear correctly',
      'Test: switch to the last tab → it auto-scrolls into view',
      'Run: git commit -m "feat(admin/settings): add tab overflow indicators and active tab auto-scroll for mobile"',
    ],
  },


];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function insertNotes(
  adminId: string,
  folderId: string,
  notes: NoteInput[],
  prefix: string,
) {
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteId = pdId('anote');
    await run(
      `INSERT INTO admin_notes
         (id, admin_id, folder_id, type, title, content, content_format,
          color, priority, is_pinned, tags, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        noteId,
        adminId,
        folderId,
        'note',
        note.title,
        note.content,
        'markdown',
        note.color,
        note.priority,
        note.is_pinned,
        note.tags,
        i + 1,
      ],
    );

    console.log(`  ✅ ${prefix}-${String(i + 1).padStart(2, '0')}: ${note.title.substring(0, 55)}…`);
    for (let j = 0; j < note.checklist.length; j++) {
      await run(
        `INSERT INTO admin_note_checklist_items (id, note_id, content, is_done, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [pdId('acl'), noteId, note.checklist[j], false, j + 1],
      );
    }
    console.log(`     └─ ${note.checklist.length} checklist items`);
  }
}

async function main() {
  console.log('🔌 Connecting to production Supabase DB…');
  const adminRes = await run(
    `SELECT id FROM pd_user WHERE role IN ('super_admin', 'admin') ORDER BY created_at ASC LIMIT 1`,
  );
  if (adminRes.rowCount === 0) { console.error('❌ No admin user found'); process.exit(1); }
  const adminId = adminRes.rows[0].id as string;
  console.log(`✅ Admin user: ${adminId}`);

  // Remove all v1 and POC folders
  console.log('\n🗑️  Removing old folders...');
  await run(
    `DELETE FROM admin_note_folders WHERE admin_id = $1
      AND (name ILIKE '%Hub Homepage%' OR name ILIKE '%Admin Settings%' OR name ILIKE '%POC%')`,
    [adminId],
  );

  // Hub folder
  const hubFolder = await run(
    `INSERT INTO admin_note_folders (admin_id, name, color) VALUES ($1, $2, $3) RETURNING id`,
    [adminId, '🏠 Hub Homepage — Fixes & Improvements', '#16C784'],
  );
  const hubFolderId = hubFolder.rows[0].id as string;
  console.log(`\n📁 Hub folder: ${hubFolderId}`);

  // Admin Settings folder
  const settingsFolder = await run(
    `INSERT INTO admin_note_folders (admin_id, name, color) VALUES ($1, $2, $3) RETURNING id`,
    [adminId, '⚙️ Admin Settings — Fixes & Improvements', '#B91C1C'],
  );
  const settingsFolderId = settingsFolder.rows[0].id as string;
  console.log(`📁 Settings folder: ${settingsFolderId}`);

  // Insert Hub notes
  console.log('\n📝 Inserting Hub Homepage notes (HH-01 to HH-18)...');
  await insertNotes(adminId, hubFolderId, HUB_NOTES, 'HH');

  // Insert Admin Settings notes
  console.log('\n📝 Inserting Admin Settings notes (AS-01 to AS-20)...');
  await insertNotes(adminId, settingsFolderId, AS_NOTES, 'AS');

  console.log('\n🎉 All done!');
  console.log(`   ${HUB_NOTES.length} Hub notes + ${AS_NOTES.length} Admin Settings notes inserted.`);
  console.log('   Open the superadmin dashboard → Admin Notes to see them.');
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  pool.end().catch(() => {});
  process.exit(1);
});
