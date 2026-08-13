/**
 * insert-hub-admin-notes.ts
 *
 * Inserts all 38 Hub Homepage (HH-01..18) + Admin Settings (AS-01..20)
 * notes into the superadmin dashboard admin_notes page in production.
 *
 * Run from the backend/ directory:
 *   npx tsx src/scripts/insert-hub-admin-notes.ts
 */

import { Pool } from 'pg';

const DB_URI =
  'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: DB_URI,
  ssl: { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 15_000,
  statement_timeout: 30_000,
});

async function run(sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params as never);
  } finally {
    client.release();
  }
}

// ─── Note definitions ──────────────────────────────────────────────────────

type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface NoteInput {
  title: string;
  content: string;
  color: string;
  priority: Priority;
  is_pinned: boolean;
  tags: string[];
}

const HUB_NOTES: NoteInput[] = [
  {
    title: 'HH-01 🔴 Cart Badge Shows "0" on Cold Render',
    color: '#EF4444', priority: 'high', is_pinned: true,
    tags: ['bug', 'hub', 'navbar'],
    content: `## 🔴 Bug · \`HubNavbar.tsx:193\`
**Impact:** Red "0" badge always visible on cart icon on page load.

## Root Cause
Badge \`<span>\` renders unconditionally even when \`cartCount === 0\`.

## Fix Checklist
- [ ] Open \`frontend/src/components/hub/HubNavbar.tsx\` line 193
- [ ] Wrap badge with \`{cartCount > 0 && (...)}\`
- [ ] Cap at 99+: \`{cartCount > 99 ? '99+' : cartCount}\`
- [ ] Add \`aria-label\` to the cart \`<Link>\`
- [ ] Test: empty cart → no badge; 1 item → shows 1; 100 → shows 99+
- [ ] \`git commit -m "fix(hub): hide cart badge when cartCount is 0"\`

## Acceptance Criteria
- Badge hidden when cart is empty
- Shows capped count when items exist`,
  },
  {
    title: 'HH-02 🔴 Hero Stats Show Page-1 Count, Not Real Total',
    color: '#EF4444', priority: 'high', is_pinned: true,
    tags: ['bug', 'hub', 'hero', 'stats'],
    content: `## 🔴 Bug · \`HubHomeContent.tsx:154\`
**Impact:** "16+ Produits actifs" shown instead of real platform total.

## Root Cause
\`trendingProducts.length\` (max 16) used instead of \`data.meta.total\`.

## Fix Checklist
- [ ] Add \`totalProducts: data.meta?.total || 0\` to \`getTrendingProducts()\` return
- [ ] Destructure \`totalProducts\` in \`HubHomepage\`
- [ ] Add \`totalProducts?: number\` to \`HubHomeContentProps\`
- [ ] Update stats array: use real total when available
- [ ] Pass prop to \`<HubHomeContent />\`
- [ ] Test with >16 products seeded in DB
- [ ] \`git commit -m "fix(hub): show real total product count in hero stats"\`

## Acceptance Criteria
- Hero stat reflects actual DB product count`,
  },
  {
    title: 'HH-03 🔴 getProductImage() Called 3× Per Deal Card',
    color: '#F97316', priority: 'normal', is_pinned: false,
    tags: ['performance', 'hub', 'deals'],
    content: `## 🔴 Perf Bug · \`HubHomeContent.tsx:263\`
**Impact:** Redundant string parsing on every render cycle.

## Root Cause
\`getProductImage(product)\` called 3 times per card (condition check + src + getResizedImageUrl arg).

## Fix Checklist
- [ ] In \`renderDealsSpotlight\` map callback, add:
  \`const productImage = getProductImage(product);\`
  \`const resizedSrc = productImage ? getResizedImageUrl(productImage, 'medium') : '';\`
- [ ] Replace all 3 inline calls with cached variables
- [ ] Apply same pattern to \`heroProducts.map\` (~line 463)
- [ ] \`git commit -m "perf(hub): cache getProductImage() in deals spotlight"\`

## Acceptance Criteria
- Function called once per card maximum`,
  },
  {
    title: 'HH-04 🔴 hub_homepage_pagination_style Setting Has No Effect',
    color: '#EF4444', priority: 'high', is_pinned: true,
    tags: ['bug', 'hub', 'pagination', 'dead-feature'],
    content: `## 🔴 Dead Feature Bug · \`HubHomeContent.tsx\`
**Impact:** Admin sets pagination to "infinite" or "load_more" — nothing changes.

## Root Cause
\`hub_homepage_pagination_style\` setting is stored and passed as prop but never read inside \`HubHomeContent\`.

## Fix Checklist
### Phase 1 — load_more
- [ ] Add \`visibleCount\` state: \`useState(8)\`
- [ ] Slice products: \`trendingProducts.slice(0, visibleCount)\`
- [ ] Add "Voir plus" button that increments by 8
- [ ] Only render when \`paginationStyle === 'load_more'\`

### Phase 2 — pagination
- [ ] Add \`currentPage\` state
- [ ] Slice products by page (16 per page)
- [ ] Render page number buttons from \`trendingTotalPages\`

### Phase 3 — infinite scroll
- [ ] Add IntersectionObserver sentinel div
- [ ] Fetch next page when sentinel enters viewport
- [ ] Gate behind \`paginationStyle === 'infinite'\`

### Validation
- [ ] Test all 4 modes: none / load_more / pagination / infinite
- [ ] \`git commit -m "feat(hub): implement hub_homepage_pagination_style"\`

## Acceptance Criteria
- All 4 pagination modes produce distinct behavior`,
  },
  {
    title: 'HH-05 🔴 Third SponsoredAdsRail Uses Default Placement (Conflict Risk)',
    color: '#F97316', priority: 'normal', is_pinned: false,
    tags: ['bug', 'hub', 'ads'],
    content: `## 🔴 Bug · \`hub/page.tsx:210\`
**Impact:** Third rail defaults to \`hub.sponsored_products\` — same placement used on search/product pages, causing budget bleed.

## Root Cause
\`<SponsoredAdsRail locale={activeLocale} />\` — no explicit \`placement\` prop.

## Fix Checklist
- [ ] Change line 210 to:
  \`<SponsoredAdsRail placement="hub.homepage_bottom" title="You may also like" variant="cards" locale={activeLocale as any} />\`
- [ ] Register \`hub.homepage_bottom\` in backend ads placement validation
- [ ] Add to admin Ads manager placement dropdown if configurable
- [ ] Verify no campaign budget bleed between homepage and search
- [ ] \`git commit -m "fix(hub): give third SponsoredAdsRail explicit placement key"\`

## Acceptance Criteria
- All 3 rails on homepage have unique, explicit placement keys`,
  },
  {
    title: 'HH-06 🔴 Account Link Flashes Wrong Href Before Auth Check',
    color: '#EF4444', priority: 'high', is_pinned: false,
    tags: ['bug', 'hub', 'auth', 'navbar'],
    content: `## 🔴 Bug · \`HubNavbar.tsx:63\`
**Impact:** Unauthenticated visitors briefly see account link pointing to \`/hub/account\` instead of \`/login/buyer\` during auth check (~200-500ms).

## Root Cause
\`\`\`ts
// Wrong default before authChecked is true:
const accountHref = currentUser ? dashboardHref : authChecked ? '/login/buyer' : '/hub/account';
\`\`\`

## Fix Checklist
- [ ] Change to: \`const accountHref = currentUser ? dashboardHref : '/login/buyer';\`
- [ ] This eliminates the intermediate wrong-href state entirely
- [ ] Optional: show loading skeleton while \`!authChecked\`
- [ ] Test all 4 states: unauth / buyer / vendor / admin
- [ ] \`git commit -m "fix(hub): remove account link href flash before auth check"\`

## Acceptance Criteria
- No visible link change after page load for any user state`,
  },
  {
    title: 'HH-07 🔴 Footer Has Hardcoded English Category Names',
    color: '#EF4444', priority: 'high', is_pinned: false,
    tags: ['bug', 'hub', 'footer', 'i18n'],
    content: `## 🔴 Bug · \`HubFooter.tsx:138-141\`
**Impact:** "Electronics", "Fashion", "Home" shown to French/Arabic users. Dead links if those slugs don't exist.

## Root Cause
\`\`\`tsx
<li><Link href="/hub/search?category=Electronics">Electronics</Link></li>
\`\`\`
Hardcoded English strings not adapted to locale or real platform categories.

## Fix Checklist
### Option A — i18n keys (quick fix)
- [ ] Add translation keys: \`footer.categories.electronics\`, etc.
- [ ] Replace hardcoded strings with \`t()\` calls

### Option B — Dynamic categories (full fix)
- [ ] In \`hub/page.tsx\`, slice top 3 non-default categories
- [ ] Add \`topCategories?: Array<{name, slug}>\` to \`HubFooter\` props
- [ ] Render dynamic links using real category data
- [ ] Pass prop at call site in \`hub/page.tsx\`
- [ ] Test in all 3 locales (fr/en/ar)
- [ ] \`git commit -m "fix(hub): replace hardcoded footer categories with dynamic/localized values"\`

## Acceptance Criteria
- Footer categories show real platform names in active locale`,
  },
  {
    title: 'HH-08 🟡 No Add-to-Cart Button on Trending Product Cards',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'hub', 'cart', 'conversion'],
    content: `## 🟡 Enhancement · \`HubHomeContent.tsx:72\`
**Impact:** Buyers must navigate to product page to add to cart — reduces homepage conversion rate.

## Current State
\`AddToCartButton.tsx\` exists but is unused in classic theme product cards.

## Fix Checklist
- [ ] Import \`AddToCartButton\` from \`./AddToCartButton\`
- [ ] Import \`WishlistButton\` from \`./WishlistButton\`
- [ ] Wrap buttons in \`onClick={(e) => e.preventDefault()}\` container (card is a \`<Link>\`)
- [ ] Consider converting card from \`<Link>\` to \`<article>\` with separate product link
- [ ] Test: cart button adds item without navigating; wishlist button toggles
- [ ] Check WCAG: no nested \`<a>\` inside \`<a>\`
- [ ] \`git commit -m "feat(hub): add AddToCartButton to classic theme product cards"\`

## Acceptance Criteria
- Each trending card has a visible Add-to-Cart button
- Clicking it adds item without navigating to product page`,
  },
  {
    title: 'HH-09 🟡 No Skeleton Loading for Sponsored Ads Rails',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'hub', 'ads', 'ux', 'cls'],
    content: `## 🟡 Enhancement · \`SponsoredAdsRail.tsx:118\`
**Impact:** \`return null\` while loading causes layout shift (CLS) and blank sections on slow connections.

## Fix Checklist
- [ ] Add \`const [loading, setLoading] = useState(true)\`
- [ ] Set \`loading = false\` after fetch resolves (success or error)
- [ ] When \`loading === true\`, render skeleton:
  - Banner variant: \`<div className="h-60 animate-pulse rounded-3xl bg-gray-100" />\`
  - Cards variant: 6-column grid of pulse placeholders
- [ ] Keep \`if (!ads.length) return null\` guard after loading
- [ ] Test with Chrome DevTools → Slow 3G
- [ ] Measure CLS improvement in Performance tab
- [ ] \`git commit -m "feat(hub): add skeleton loading to SponsoredAdsRail"\`

## Acceptance Criteria
- Skeleton visible immediately on page load
- No layout shift when ads populate (CLS ≈ 0)`,
  },
  {
    title: 'HH-10 🟡 Hero Departments Sidebar Has No Category Icons',
    color: '#F59E0B', priority: 'low', is_pinned: false,
    tags: ['enhancement', 'hub', 'hero', 'ux'],
    content: `## 🟡 Enhancement · \`HubHomeContent.tsx:399\`
**Impact:** Text-only category sidebar looks sparse vs. Amazon-style competitors.

## Fix Checklist
- [ ] In \`heroCategories.map\` callback, extract \`catImg\`:
  \`\`\`ts
  const catImg = cat.image_url ? getResizedImageUrl(normalizePublicAssetUrl(cat.image_url), 'thumbnail') : null;
  \`\`\`
- [ ] Add 24×24 thumbnail: \`<img src={catImg} alt="" aria-hidden className="h-6 w-6 rounded-lg object-cover" />\`
- [ ] Fallback: show \`<Grid3X3 className="h-3 w-3" />\` icon in a green circle when no image
- [ ] Ensure \`alt=""\` on decorative images
- [ ] Test: sidebar width (280px) handles icon + text + arrow without overflow
- [ ] Test in RTL mode: icons on correct side
- [ ] \`git commit -m "feat(hub): add category icons to hero Departments sidebar"\`

## Acceptance Criteria
- Each sidebar category shows thumbnail or fallback icon
- RTL layout works correctly`,
  },
  {
    title: 'HH-11 🟡 Hero Carousel Dots Not Keyboard-Accessible (WCAG)',
    color: '#8B5CF6', priority: 'normal', is_pinned: false,
    tags: ['a11y', 'hub', 'carousel', 'wcag'],
    content: `## 🟡 A11y Enhancement · \`HubHomeContent.tsx:446\`
**Impact:** WCAG 2.1 AA violation — carousel dots have no role, no aria-selected, no keyboard navigation.

## Fix Checklist
- [ ] Add \`role="tablist"\` + \`aria-label="Hero slide navigation"\` to dots container
- [ ] Add \`role="tab"\` + \`aria-selected={idx === activeIndex}\` to each dot button
- [ ] Add \`onKeyDown\` handler for ArrowLeft/ArrowRight navigation:
  \`\`\`ts
  if (e.key === 'ArrowRight') setSlideIndex(prev => (prev + 1) % heroSlides.length);
  if (e.key === 'ArrowLeft') setSlideIndex(prev => (prev - 1 + heroSlides.length) % heroSlides.length);
  \`\`\`
- [ ] Add \`paused\` state, pause auto-rotation on focus
- [ ] Add Pause/Play button near dots
- [ ] Run axe accessibility audit on /hub
- [ ] \`git commit -m "a11y(hub): add ARIA roles and keyboard navigation to hero carousel"\`

## Acceptance Criteria
- ArrowLeft/Right keys navigate slides when tablist is focused
- Auto-rotation pauses on focus
- axe shows no carousel violations`,
  },
  {
    title: 'HH-12 🟡 RecentlyViewedTracker Not Called on Hub Homepage',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'hub', 'recently-viewed'],
    content: `## 🟡 Enhancement · \`HubHomeContent.tsx\`
**Impact:** "Recently Viewed" homepage block is always empty because the tracker is never called on the homepage.

## Root Cause
\`RecentlyViewedRail\` renders from localStorage data, but \`RecentlyViewedTracker\` (the writer) is never imported or rendered on the hub homepage.

## Fix Checklist
- [ ] Inspect \`RecentlyViewedTracker.tsx\` — understand its props
- [ ] If per-product: add to \`frontend/src/app/hub/products/[id]/page.tsx\`
- [ ] If list-based: add to \`HubHomeContent\` with \`trendingProducts\` prop
- [ ] Verify the \`recently_viewed\` block shows real data for returning visitors
- [ ] Test in incognito — no recently-viewed section should render
- [ ] \`git commit -m "feat(hub): connect RecentlyViewedTracker so the block has data"\`

## Acceptance Criteria
- Products tracked when user browses the hub
- Recently Viewed block shows real history for returning visitors
- New visitors see no empty rail`,
  },
  {
    title: 'HH-13 🟡 No JSON-LD Structured Data for Hub SEO',
    color: '#3B82F6', priority: 'normal', is_pinned: false,
    tags: ['seo', 'hub', 'json-ld'],
    content: `## 🟡 SEO Enhancement · \`hub/page.tsx:27\`
**Impact:** No structured data → missing Google Shopping indexing, product carousels in search, and knowledge panel.

## Fix Checklist
- [ ] Add \`Organization\` JSON-LD in \`hub/page.tsx\`:
  \`\`\`tsx
  const orgSchema = { "@context": "https://schema.org", "@type": "Organization",
    "name": marketplaceName, "url": marketplaceSettings.marketplace_public_url,
    "logo": ogImageUrl, "description": tagline };
  \`\`\`
- [ ] Add \`ItemList\` JSON-LD for trending products (top 10):
  \`\`\`tsx
  const itemListSchema = { "@context": "https://schema.org", "@type": "ItemList",
    "itemListElement": trendingProducts.slice(0, 10).map((p, i) => ({
      "@type": "ListItem", "position": i + 1, "name": p.title,
      "url": \`\${publicUrl}/hub/products/\${p.slug || p.id}\` })) };
  \`\`\`
- [ ] Inject both as \`<script type="application/ld+json" dangerouslySetInnerHTML={{...}} />\`
- [ ] Add \`alternates.canonical\` to \`generateMetadata\`
- [ ] Validate with Google Rich Results Test
- [ ] \`git commit -m "feat(hub): add Organization and ItemList JSON-LD structured data"\`

## Acceptance Criteria
- Hub page HTML contains JSON-LD for Organization and ItemList
- Google Rich Results Test passes`,
  },
  {
    title: 'HH-14 🟡 "Create Store" Link Sends Unauth Users to Dashboard',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'hub', 'navbar', 'conversion'],
    content: `## 🟡 Enhancement · \`HubNavbar.tsx:175\`
**Impact:** Unauthenticated visitors clicking "Create Store" land on dashboard (which redirects to login with no context). Should land on vendor signup page.

## Fix Checklist
- [ ] Compute \`createStoreHref\`:
  \`\`\`ts
  const createStoreHref = !currentUser ? '/hub/vendor-signup'
    : role === 'buyer' && !currentUser.store_id ? '/hub/vendor-signup'
    : role === 'admin' || role === 'super_admin' ? '/dashboard'
    : '/hub/dashboard';
  \`\`\`
- [ ] Update Link to use \`createStoreHref\`
- [ ] Show "Mon tableau de bord" text for existing vendors
- [ ] Add \`nav.dashboard\` translation key to all 3 locale files
- [ ] Test 4 states: unauth / buyer / vendor / admin
- [ ] \`git commit -m "feat(hub): route Create Store CTA to vendor-signup for unauth users"\`

## Acceptance Criteria
- Unauth visitors land on \`/hub/vendor-signup\`
- Vendors see "Dashboard" and navigate to their dashboard`,
  },
  {
    title: 'HH-15 🟡 RTL Support Incomplete in Footer Social Links',
    color: '#F59E0B', priority: 'low', is_pinned: false,
    tags: ['i18n', 'hub', 'footer', 'rtl', 'arabic'],
    content: `## 🟡 i18n Enhancement · \`HubFooter.tsx:124\`
**Impact:** With Arabic locale + RTL enabled, footer social links and grid columns do not mirror correctly.

## Fix Checklist
- [ ] Extract \`isRtl\` from \`useMarketplaceTheme\`
- [ ] Add \`dir={isRtl ? 'rtl' : undefined}\` to root \`<footer>\` element
- [ ] Wrap \`StorefrontSocialLinks\` in \`<div dir={isRtl ? 'rtl' : undefined}>\`
- [ ] Open \`StorefrontSocialLinks.tsx\` and replace physical properties:
  - \`ml-*\` → \`ms-*\`, \`mr-*\` → \`me-*\`, \`pl-*\` → \`ps-*\`, \`pr-*\` → \`pe-*\`
- [ ] Test with Arabic locale: footer grid should mirror, icons ordered RTL
- [ ] \`git commit -m "i18n(hub): fix RTL layout in footer social links for Arabic locale"\`

## Acceptance Criteria
- Footer grid mirrors in RTL mode
- Social icons ordered right-to-left in Arabic
- No physical CSS properties in RTL-sensitive components`,
  },
  {
    title: 'HH-16 🟢 ISR revalidate: 120s Too Short — Increase to 300s',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['performance', 'hub', 'isr'],
    content: `## 🟢 Improvement · \`hub/page.tsx:103\`
**Impact:** \`next: { revalidate: 120 }\` rebuilds the homepage every 2 minutes — 30× per hour unnecessary backend polling.

## Fix Checklist
- [ ] Change line 103: \`next: { revalidate: 300 }\`
- [ ] Consider env var: \`HUB_PRODUCT_REVALIDATE_SECONDS\` for deployment flexibility
- [ ] Verify \`/api/marketplace/revalidate\` is called when products are published (on-demand ISR)
- [ ] Confirm categories fetch already uses 300s (it does — align them)
- [ ] \`git commit -m "perf(hub): increase ISR revalidate from 120s to 300s"\`

## Acceptance Criteria
- Backend polling reduced by ~60%
- Hub homepage not stale by more than 5 minutes after product publish`,
  },
  {
    title: 'HH-17 🟢 Layout Selection Uses Fragile 5-Level Ternary Chain',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['refactor', 'hub', 'maintainability'],
    content: `## 🟢 Improvement · \`hub/page.tsx:164\`
**Impact:** Adding a 6th layout requires editing a fragile nested ternary. Hard to read, easy to break.

## Fix Checklist
- [ ] Create: \`function resolveHomeContentComponent(layout, theme): ComponentType\`
- [ ] Map layouts to components with simple if-statements
- [ ] Replace the ternary chain with: \`const HomeContent = resolveHomeContentComponent(homepageLayout, marketplaceTheme);\`
- [ ] Render: \`<HomeContent trendingProducts={...} ... />\`
- [ ] Define shared \`HomeContentProps\` interface
- [ ] Run \`npx tsc --noEmit\` → fix any type errors
- [ ] Test all 6 layouts still render correctly
- [ ] \`git commit -m "refactor(hub): replace layout ternary chain with resolveHomeContentComponent"\`

## Acceptance Criteria
- Layout resolution is a single named function
- Adding a new layout only requires 1 \`if\` branch + 1 import`,
  },
  {
    title: 'HH-18 🟢 No noscript Fallback for JS-Disabled Buyers/Crawlers',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['seo', 'a11y', 'hub', 'noscript'],
    content: `## 🟢 Improvement · \`hub/page.tsx\`
**Impact:** \`HubHomeContent\` is a \`'use client'\` component — buyers with JS disabled see blank content. Search crawlers with limited JS miss the product grid.

## Fix Checklist
- [ ] Create \`StaticProductGrid\` server component in \`hub/page.tsx\`:
  \`\`\`tsx
  function StaticProductGrid({ products, currency }) {
    return (
      <noscript>
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2>Trending Products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {products.slice(0, 8).map(p => (
              <a key={p.id} href={\`/hub/products/\${p.slug || p.id}\`}>
                {p.images?.[0]?.url && <img src={p.images[0].url} alt={p.title} />}
                <p>{p.title}</p>
                <p>{Number(p.price).toFixed(3)} {currency}</p>
              </a>
            ))}
          </div>
        </div>
      </noscript>
    );
  }
  \`\`\`
- [ ] Render \`<StaticProductGrid>\` inside the hub page return
- [ ] Disable JS in Chrome DevTools → verify static grid appears
- [ ] Use Google Search Console URL Inspection to check rendered HTML
- [ ] \`git commit -m "feat(hub): add noscript static product grid fallback"\`

## Acceptance Criteria
- JS-disabled users see a basic product grid
- Google Search Console shows product content in rendered HTML`,
  },
];

const AS_NOTES: NoteInput[] = [
  {
    title: 'AS-01 🔴 handleSave Sends Full Payload — Cross-Tab Data Loss Risk',
    color: '#EF4444', priority: 'urgent', is_pinned: true,
    tags: ['bug', 'admin-settings', 'critical', 'data-loss'],
    content: `## 🔴 CRITICAL Bug · \`settings/page.tsx:1328\`
**Impact:** Every "Save Changes" click sends all 100+ settings keys to the backend, not just the active tab. Changes on inactive tabs get silently persisted.

## Root Cause
\`buildSettingsPayload(settings, tab?)\` has a tab-scope overload but it's never used:
\`\`\`ts
// Line 1328 — WRONG (sends everything):
const payload = buildSettingsPayload(settings);
// Should be:
const payload = buildSettingsPayload(settings, activeTab);
\`\`\`

## Fix Checklist
- [ ] In \`handleSave()\`, change line 1328 to: \`buildSettingsPayload(settings, activeTab)\`
- [ ] Update post-save state merge to only mark active tab keys as "clean":
  \`\`\`ts
  const savedKeys = SETTINGS_TAB_KEYS[activeTab];
  setSavedSettings(prev => ({ ...prev, ...Object.fromEntries(savedKeys.map(k => [k, data.data?.[k] ?? settings[k]])) }));
  \`\`\`
- [ ] Verify backend \`PUT /api/pd/admin/settings\` does a merge, not a full replace
- [ ] Test: edit Marketplace + Finance tabs → save only Finance → Marketplace change must NOT reach DB
- [ ] \`git commit -m "fix(admin/settings): scope handleSave to active tab only"\`

## Acceptance Criteria
- Saving Finance tab sends ONLY finance keys
- Unsaved edits on other tabs are preserved in form state`,
  },
  {
    title: 'AS-02 🔴 No Confirmation When Switching Tabs With Unsaved Changes',
    color: '#EF4444', priority: 'high', is_pinned: true,
    tags: ['bug', 'admin-settings', 'data-loss', 'ux'],
    content: `## 🔴 Bug · \`settings/page.tsx:1510\`
**Impact:** Admins silently lose all edits when clicking a different tab.

## Root Cause
\`onClick={() => setActiveTab(tab.id)}\` switches tabs immediately with no check.

## Fix Checklist
- [ ] Add state: \`const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);\`
- [ ] Add state: \`const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);\`
- [ ] Create \`handleTabClick(tabId)\`: if has unsaved changes → show dialog; else switch
- [ ] Replace \`onClick={() => setActiveTab(tab.id)}\` with \`onClick={() => handleTabClick(tab.id)}\`
- [ ] Render confirmation modal with "Stay & Save" + "Discard & Switch" buttons
- [ ] "Discard & Switch": revert current tab keys to \`savedSettings\` then switch
- [ ] Add \`window.addEventListener('beforeunload', ...)\` guard
- [ ] Test full flow: edit → click tab → stay/discard → close browser tab
- [ ] \`git commit -m "fix(admin/settings): add unsaved-changes guard on tab switch"\`

## Acceptance Criteria
- Dialog appears when switching tabs with unsaved changes
- "Stay & Save" keeps current tab active, changes intact
- beforeunload fires when navigating away with unsaved changes`,
  },
  {
    title: 'AS-03 🔴 Default Primary Color Is Red but Hub Renders Green',
    color: '#F97316', priority: 'normal', is_pinned: false,
    tags: ['bug', 'admin-settings', 'theme', 'colors'],
    content: `## 🔴 Bug · \`settings/page.tsx:247\`
**Impact:** Fresh deployment has \`marketplace_primary_color: '#B91C1C'\` (red admin UI color) but Hub renders \`#16C784\` (green) everywhere — contradictory brand config.

## Fix Checklist
### Part 1 — Fix defaults
- [ ] Change line 247: \`marketplace_primary_color: '#16C784'\`
- [ ] Change line 248: \`marketplace_secondary_color: '#0f9f6e'\`

### Part 2 — Wire CSS variables to Hub (full fix)
- [ ] In \`hub/page.tsx\`, inject \`<style dangerouslySetInnerHTML={{ __html: \`:root { --pd-primary: \${settings.marketplace_primary_color}; --pd-secondary: \${settings.marketplace_secondary_color}; }\` }} />\`
- [ ] Replace \`text-[#16C784]\` with \`text-[var(--pd-primary)]\` across Hub components
- [ ] Add \`pd-primary\` color to \`tailwind.config.ts\`
- [ ] Test: set blue primary in admin → Hub turns blue
- [ ] \`git commit -m "fix(admin/settings): correct default primary color, inject CSS vars for theming"\`

## Acceptance Criteria
- Default color matches the Hub's actual green
- Changing the color in admin settings updates the Hub appearance`,
  },
  {
    title: 'AS-04 🔴 Banner Image Field Has No Asset Picker Button',
    color: '#F97316', priority: 'normal', is_pinned: false,
    tags: ['bug', 'admin-settings', 'ux', 'asset-picker'],
    content: `## 🔴 UX Bug · \`settings/page.tsx:1059\`
**Impact:** \`hub_homepage_banner_image_url\` is a plain text input. All logo fields have an "Upload/Choose" button. The most important homepage image has no picker — admins must paste raw URLs.

## Fix Checklist
- [ ] Extend picker union type to add \`'hub_homepage_banner_image_url'\` (and \`'marketplace_og_image_url'\`, \`'marketplace_favicon_url'\`)
- [ ] Replace \`renderTextInput('hub_homepage_banner_image_url', ...)\` with custom field:
  \`\`\`tsx
  <div className="flex gap-2">
    <input type="text" value={settings.hub_homepage_banner_image_url} onChange={...} className="flex-1 ..." />
    <button onClick={() => setMarketplaceLogoPickerTarget('hub_homepage_banner_image_url')}>
      <UploadCloud /> Choose
    </button>
  </div>
  {settings.hub_homepage_banner_image_url && <img src={...} className="h-32 w-full object-cover rounded-xl" />}
  \`\`\`
- [ ] Confirm \`MarketplaceAssetPicker\`'s \`onSelect\` handler uses dynamic key (it does — no other change needed)
- [ ] Apply same pattern to og_image_url and favicon_url
- [ ] \`git commit -m "fix(admin/settings): add asset picker to hub banner image field"\`

## Acceptance Criteria
- Banner image has Upload/Choose button
- Selecting image from picker populates field + shows preview`,
  },
  {
    title: 'AS-05 🔴 Rewards Prizes Edited as Raw JSON — No Validation',
    color: '#EF4444', priority: 'high', is_pinned: false,
    tags: ['bug', 'admin-settings', 'rewards', 'json-validation'],
    content: `## 🔴 Bug · \`settings/page.tsx:749\`
**Impact:** A single misplaced comma in the raw JSON textarea breaks the live spinning-wheel widget for ALL buyers.

## Fix Checklist
### Part 1 — Validation (immediate)
- [ ] Add visual validation in the prizes textarea onChange:
  \`\`\`tsx
  // Red border + error message when JSON.parse() throws
  const isValid = (() => { try { JSON.parse(val); return true; } catch { return false; } })();
  \`\`\`
- [ ] In \`buildSettingsPayload\`, add JSON array validation + fallback to DEFAULT
- [ ] Block save when prizes JSON is invalid

### Part 2 — Structured editor (full fix)
- [ ] Parse JSON → array of \`{label, code, disc, icon, color, desc}\` objects
- [ ] Render each prize as an editable card row with individual inputs
- [ ] Add "Add Prize" / "Remove Prize" buttons
- [ ] Sync changes back to JSON string
- [ ] \`git commit -m "fix(admin/settings): add JSON validation and prize editor for rewards widget"\`

## Acceptance Criteria
- Invalid JSON shows red border + error message immediately
- Save is blocked if JSON is invalid
- Rewards widget never broken by bad prizes JSON`,
  },
  {
    title: 'AS-06 🔴 Settings Search Bar Is Completely Non-Functional',
    color: '#EF4444', priority: 'high', is_pinned: true,
    tags: ['bug', 'admin-settings', 'search', 'dead-feature'],
    content: `## 🔴 Dead Feature · \`settings/page.tsx:1460\`
**Impact:** The search bar shows "Search setting (e.g. logo, aramex, flouci)..." but typing in it does NOTHING. \`searchQuery\` state is set but never used to filter any fields.

## Fix Checklist
- [ ] Build flat search index (\`SETTINGS_SEARCH_INDEX\`) mapping key → label, description, tab, keywords
- [ ] Compute \`searchResults\` with \`useMemo\`: filter index by \`searchQuery\`
- [ ] When \`searchQuery\` is non-empty, render a results panel showing matching fields
- [ ] Each result is a button that: \`setActiveTab(result.tab)\` + scrolls to the field
- [ ] Add \`id={"setting-" + key}\` to each field wrapper for scroll targeting
- [ ] Show "No settings match" message when results empty
- [ ] \`git commit -m "feat(admin/settings): implement search bar field filtering with jump navigation"\`

## Acceptance Criteria
- Typing "logo" shows all logo-related fields
- Clicking result navigates to correct tab and scrolls to field
- "smtp" → email fields; "aramex" → shipping fields`,
  },
  {
    title: 'AS-07 🔴 Empty SMTP Password May Clear Saved Credentials',
    color: '#EF4444', priority: 'high', is_pinned: false,
    tags: ['bug', 'admin-settings', 'smtp', 'security'],
    content: `## 🔴 Bug · \`settings/page.tsx:1363\`
**Impact:** Admin saves email settings without re-entering password → \`smtp_pass: ""\` sent to backend → password may be wiped → all transactional emails break.

## Root Cause
\`\`\`ts
// smtpForm.smtp_pass === "" is sent to the API even when unchanged
const res = await fetchWithCsrf('/api/pd/admin/smtp-config', {
  body: JSON.stringify(smtpForm), // ← always includes smtp_pass: ""
});
\`\`\`

## Fix Checklist
- [ ] In \`handleSmtpSave\`, strip empty password from payload:
  \`\`\`ts
  const smtpPayload = { ...smtpForm };
  if (!smtpPayload.smtp_pass) delete smtpPayload.smtp_pass;
  \`\`\`
- [ ] Verify backend SMTP PUT handler ignores missing \`smtp_pass\` key
- [ ] Show password status badge: "✓ Password saved — leave blank to keep" / "No password saved"
- [ ] Test: save config without password → send test email → must still work
- [ ] \`git commit -m "fix(admin/settings): omit empty smtp_pass from save payload"\`

## Acceptance Criteria
- Saving without new password does NOT clear existing password
- Password field shows clear indicator of stored state`,
  },
  {
    title: 'AS-08 🟡 No Live Preview of Hub Banner While Editing',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'ux', 'preview'],
    content: `## 🟡 Enhancement · \`settings/page.tsx\`
**Impact:** Admin must save → wait for ISR revalidation → check /hub to see banner changes. A live preview eliminates this feedback loop.

## Fix Checklist
- [ ] Add a \`BannerPreview\` component below the banner fields:
  - Dark bg-slate-950 card with gradient overlay
  - Shows \`hub_homepage_banner_title\`, \`hub_homepage_banner_subtitle\`, \`hub_homepage_banner_cta_label\`
  - Shows \`hub_homepage_banner_image_url\` as background image at 20% opacity
  - Placeholder text when fields are empty
- [ ] Place in \`md:col-span-2\` so it spans full width
- [ ] Make preview theme-aware (green for panda, red/orange for aliexpress)
- [ ] Add "View live page →" button that opens \`/hub\` in new tab
- [ ] \`git commit -m "feat(admin/settings): add live banner preview card"\`

## Acceptance Criteria
- Preview updates in real-time as admin types
- Preview reflects title, subtitle, CTA, and background image
- "View live" button opens /hub`,
  },
  {
    title: 'AS-09 🟡 Theme Selector Buried in Long Scrollable Tab',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'ux', 'theme'],
    content: `## 🟡 Enhancement · \`settings/page.tsx:1203\`
**Impact:** Theme selector (most impactful visual setting) is buried after 40+ fields. Admins must scroll to find it.

## Fix Checklist
- [ ] Move \`renderMarketplaceThemeSelector()\` to the TOP of the Marketplace tab (before any other field)
- [ ] Add \`<SectionHeader icon={<LayoutGrid />} title="Marketplace Theme & Layout" />\`
- [ ] Add "Active" badge to selected theme card
- [ ] Group theme + layout + color pickers in a collapsible "Appearance" \`<details>\` section
- [ ] Add quick-change click on the header card's "Theme: panda" display
- [ ] See also AS-11 for the layout card picker
- [ ] \`git commit -m "feat(admin/settings): elevate theme selector to top of Marketplace tab"\`

## Acceptance Criteria
- Theme selector is first section visible without scrolling
- Active badge highlights selected theme
- Color pickers grouped in Appearance section`,
  },
  {
    title: 'AS-10 🟡 Maintenance Mode Toggle Has No Confirmation Dialog',
    color: '#F59E0B', priority: 'high', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'safety', 'maintenance'],
    content: `## 🟡 Safety Enhancement · \`settings/page.tsx:1555\`
**Impact:** Single accidental click on maintenance toggle takes the entire marketplace offline with no confirmation.

## Fix Checklist
- [ ] Add state: \`const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);\`
- [ ] Replace generic \`renderToggle\` for \`maintenance_enabled\` with custom danger toggle:
  - Red/amber styling with "DANGER" badge
  - Clicking ON → shows confirmation dialog
  - Clicking OFF → immediate (restoring service is safe, no confirm needed)
- [ ] Confirmation dialog shows: "YES, TAKE PLATFORM OFFLINE" button
- [ ] Add persistent red banner in admin panel when maintenance is ACTIVE + saved
- [ ] \`git commit -m "feat(admin/settings): add confirmation dialog for maintenance mode"\`

## Acceptance Criteria
- Enabling maintenance requires explicit confirmation click
- Disabling is immediate
- Active maintenance shows persistent red warning banner`,
  },
  {
    title: 'AS-11 🟡 Homepage Layout Selector Has No Visual Preview',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'ux', 'layout'],
    content: `## 🟡 Enhancement · \`settings/page.tsx\`
**Impact:** 6 homepage layouts shown as plain \`<select>\` options. Admins can't see what each looks like without switching live.

## Fix Checklist
- [ ] Create \`HOMEPAGE_LAYOUT_OPTIONS\` array with id, name, description, previewColors, badge
- [ ] Create \`renderHomepageLayoutSelector()\` using same card pattern as theme selector:
  - Color swatch preview (3 swatches)
  - Mini grid skeleton
  - Active badge ("✓ Active")
  - "Premium" badge for aliexpress2
- [ ] Replace \`<select>\` with the card grid
- [ ] Add contextual note when "theme_default" selected: "Will use {X} based on active theme"
- [ ] Position directly below theme selector in Appearance section
- [ ] Test all 6 options save and reflect on /hub
- [ ] \`git commit -m "feat(admin/settings): replace layout select with visual card picker"\`

## Acceptance Criteria
- All 6 layouts shown as visual cards with previews
- "Active" badge on selected layout
- Context note for "Theme Default" option`,
  },
  {
    title: 'AS-12 🟡 Global Commission Rate Conflicts With Per-Plan Rates Silently',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'finance', 'commission'],
    content: `## 🟡 Enhancement · \`settings/page.tsx:766\`
**Impact:** Admin changes global commission rate not knowing paid plan rates are 0% — confusing and potentially incorrect billing.

## Fix Checklist
- [ ] Confirm backend priority: does per-plan override global? Document clearly
- [ ] Add contextual amber info box next to \`platform_commission_rate\` field:
  "⚠ This is the fallback rate for Free plan vendors. Paid plans have their own rates in the Plans tab."
- [ ] Add clickable "View Subscription Plan rates →" link that navigates to Plans tab
- [ ] Add per-plan rate summary table (fetched from plans API, not hardcoded)
- [ ] Add validation: \`Math.max(0, Math.min(100, value))\` in \`buildSettingsPayload\`
- [ ] \`git commit -m "feat(admin/settings): add commission rate conflict warning"\`

## Acceptance Criteria
- Commission field has context note about scope
- Per-plan rate summary visible
- Rate clamped to 0–100%`,
  },
  {
    title: 'AS-13 🟡 Seller Rail Settings Have No Effect on Classic Theme',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'hub', 'seller-rail'],
    content: `## 🟡 Enhancement · \`settings/page.tsx:300\`
**Impact:** 5 seller rail settings (\`hub_hero_seller_rail_title\`, etc.) are stored but \`HubHomeContent.tsx\` never reads them. Admins editing these fields see zero effect.

## Fix Checklist
- [ ] Extend \`MarketplaceSettings\` interface in \`HubHomeContent.tsx\` with seller rail keys
- [ ] In the hero aside CTA card (~line 479), replace hardcoded text with settings values:
  \`\`\`tsx
  <p className="text-lg font-black">
    {marketplaceSettings?.hub_hero_seller_rail_title || t('hub.hero.ctaCreateStore')}
  </p>
  \`\`\`
- [ ] Wire \`hub_hero_show_seller_rail: false\` to hide the card entirely
- [ ] Wire \`hub_hero_seller_rail_cta_url\` to the Link href
- [ ] Wire \`hub_hero_seller_rail_badge_text\` to the badge
- [ ] Test: change title in settings → save → verify on /hub
- [ ] \`git commit -m "feat(hub): wire hub_hero_seller_rail_* settings to classic theme hero CTA"\`

## Acceptance Criteria
- Changing seller rail title in settings updates the hero CTA on /hub
- \`hub_hero_show_seller_rail: false\` hides the card`,
  },
  {
    title: 'AS-14 🟡 No Per-Tab Reset / Discard Changes Button',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'ux'],
    content: `## 🟡 Enhancement · \`settings/page.tsx\`
**Impact:** No way to undo edits on a tab. Only option is to manually revert each field or reload the page (which loses all in-progress work on ALL tabs).

## Fix Checklist
- [ ] Add "Discard Changes" button in sticky header (shown only when \`hasUnsavedPlatformChanges\`):
  \`\`\`tsx
  <button onClick={handleReset}>
    <RotateCcw className="h-3.5 w-3.5" /> Discard Changes
  </button>
  \`\`\`
- [ ] Implement \`handleReset()\`: revert only active tab keys to \`savedSettings\` values
- [ ] Add optional "Reset to factory defaults" in collapsible Danger Zone at tab bottom
- [ ] Factory defaults reset only applies to current tab, shows as unsaved until Save
- [ ] Test: edit 3 fields → discard → all 3 revert; hasUnsavedPlatformChanges = false
- [ ] \`git commit -m "feat(admin/settings): add Discard Changes and Reset to Defaults buttons"\`

## Acceptance Criteria
- "Discard Changes" reverts only current tab to last saved values
- "Reset to defaults" sets current tab to DEFAULT_SETTINGS values (unsaved until clicked Save)`,
  },
  {
    title: 'AS-15 🟡 Image Size Settings Have No Aspect Ratio Validation',
    color: '#F59E0B', priority: 'normal', is_pinned: false,
    tags: ['enhancement', 'admin-settings', 'images', 'validation'],
    content: `## 🟡 Enhancement · \`settings/page.tsx\`
**Impact:** Admin can set \`thumbnail_w=1200\` and \`thumbnail_h=50\` → 24:1 ratio → all product thumbnails distorted platform-wide.

## Fix Checklist
- [ ] Create \`renderImageSizeInputs(prefix, label)\` helper:
  - Renders W and H as side-by-side inputs
  - Computes ratio: \`(w / h).toFixed(2)\`
  - Shows green badge when square (±10px)
  - Shows red warning when ratio > 3:1 or < 0.33:1
- [ ] Add visual mini rectangle preview scaled to dimensions
- [ ] In \`buildSettingsPayload\`, clamp all image dimensions: \`Math.max(50, Math.min(4000, value))\`
- [ ] Replace raw \`renderNumberInput\` calls for \`image_size_*\` with new helper
- [ ] Test: set 1200×50 → red warning; set 300×300 → green square indicator
- [ ] \`git commit -m "feat(admin/settings): add aspect ratio validation to image size settings"\`

## Acceptance Criteria
- Extreme ratios show red warning
- Square ratios show green indicator
- Dimensions clamped to 50–4000px range`,
  },
  {
    title: 'AS-16 🟢 Settings Page Loads All 9 Tabs Simultaneously on Mount',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['performance', 'admin-settings'],
    content: `## 🟢 Improvement · \`settings/page.tsx:1259\`
**Impact:** All 9 tabs' JSX rendered (with \`hidden\` CSS) + SMTP fetch fired on every page load regardless of which tab will be used.

## Fix Checklist
- [ ] Replace \`className={\`\${activeTab === 'X' ? '' : 'hidden'}\`}\` pattern with \`{activeTab === 'X' && (...)}\` conditional rendering for all 9 tab sections
- [ ] Move SMTP fetch to only trigger when Email tab first activated:
  \`\`\`ts
  const [smtpFetched, setSmtpFetched] = useState(false);
  useEffect(() => {
    if (activeTab === 'email' && !smtpFetched) fetchSmtpConfig().then(() => setSmtpFetched(true));
  }, [activeTab, smtpFetched]);
  \`\`\`
- [ ] Show skeleton in Email tab while loading
- [ ] Verify \`hasUnsavedPlatformChanges\` still works (it reads from state, not DOM — safe)
- [ ] Measure Time-to-Interactive before/after with Chrome DevTools
- [ ] \`git commit -m "perf(admin/settings): lazy-render inactive tabs, defer SMTP fetch"\`

## Acceptance Criteria
- Only active tab's JSX in DOM
- SMTP fetch deferred until Email tab opened
- No functional regression`,
  },
  {
    title: 'AS-17 🟢 No Link to Audit Log Entry After Saving Settings',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['improvement', 'admin-settings', 'audit-log'],
    content: `## 🟢 Improvement · \`settings/page.tsx:1342\`
**Impact:** "Saved Successfully!" appears for 3s then vanishes. No way to immediately verify what was recorded in the audit log.

## Fix Checklist
- [ ] After successful save, fetch latest audit log entry:
  \`\`\`ts
  const auditRes = await fetch('/api/pd/admin/audit-log?limit=1&action=settings_update', { credentials: 'include' });
  const entry = (await auditRes.json()).data?.[0];
  if (entry?.id) setAuditLogUrl(\`/dashboard/audit-log?highlight=\${entry.id}\`);
  \`\`\`
- [ ] Show "View in audit log →" link next to "Saved!" confirmation
- [ ] Auto-hide after 8 seconds (same as saved banner)
- [ ] \`git commit -m "feat(admin/settings): add View in audit log link after save"\`

## Acceptance Criteria
- "View in audit log" link appears after successful save
- Link navigates to audit log with the entry highlighted`,
  },
  {
    title: 'AS-18 🔴 marketplace_public_url Defaults to garbage.team Dev Domain',
    color: '#EF4444', priority: 'urgent', is_pinned: true,
    tags: ['bug', 'admin-settings', 'config', 'critical'],
    content: `## 🔴 Critical Bug · \`settings/page.tsx:245\`
**Impact:** Any operator deploying without changing this will have all email templates, OG canonical URLs, and sharing links pointing to \`https://garbage.team\`.

## Root Cause
\`\`\`ts
marketplace_public_url: 'https://garbage.team', // ← dev artifact in DEFAULT_SETTINGS
\`\`\`

## Fix Checklist
- [ ] Change to: \`marketplace_public_url: ''\` (empty — force operator to configure)
- [ ] Add "REQUIRED" badge to the field label in Marketplace tab
- [ ] Show red border + warning when field is empty:
  "⚠ This field is required — email links and canonical URLs will break without it"
- [ ] Show amber warning when value contains "garbage.team": "You appear to be using the dev preview domain"
- [ ] Add "Initial Setup Required" banner when critical fields are empty
- [ ] Add URL format validation in \`buildSettingsPayload\` (must start with https://)
- [ ] Strip trailing slash from value
- [ ] \`git commit -m "fix(admin/settings): change marketplace_public_url default to empty string"\`

## Acceptance Criteria
- Default is empty string, not a dev domain
- Empty field shows red required warning
- garbage.team value shows amber dev warning`,
  },
  {
    title: 'AS-19 🟢 Mandat Payment Fields Have No Copy-to-Clipboard Buttons',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['improvement', 'admin-settings', 'mandat', 'support-ux'],
    content: `## 🟢 Improvement · \`settings/page.tsx\` (Finance tab)
**Impact:** Support agents frequently need to share mandat recipient details with buyers. Currently must manually select-copy. A one-click copy button saves time and prevents transcription errors.

## Fix Checklist
- [ ] Create reusable \`CopyableField\` component:
  \`\`\`tsx
  function CopyableField({ label, value }) {
    const [copied, setCopied] = useState(false);
    return (
      <div>
        <label>{label}</label>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl bg-stone-50 select-all">{value}</div>
          <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? <CheckCircle2 /> : <Copy />}
          </button>
        </div>
      </div>
    );
  }
  \`\`\`
- [ ] Import \`Copy\` from lucide-react
- [ ] Add \`CopyableField\` for: recipient_name, cin, city, proof_email
- [ ] Add compound "Copy All Instructions" field: formats all 4 as a single string
- [ ] \`git commit -m "feat(admin/settings): add copy-to-clipboard to mandat fields"\`

## Acceptance Criteria
- One-click copy for each mandat field
- Compound "Copy All" gives full payment instructions
- "Copied!" feedback shown for 2 seconds`,
  },
  {
    title: 'AS-20 🟢 Tab Strip Has No Overflow Indicator on Mobile',
    color: '#10B981', priority: 'low', is_pinned: false,
    tags: ['improvement', 'admin-settings', 'mobile', 'ux'],
    content: `## 🟢 Improvement · \`settings/page.tsx:1498\`
**Impact:** On mobile screens, 9 tabs overflow horizontally but there's no gradient fade or scroll arrows indicating more content exists. Admins miss "Integrations", "Plans", and "Email" tabs.

## Fix Checklist
- [ ] Create \`TabStrip\` component with scroll state tracking:
  \`\`\`ts
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Add scroll + resize event listeners → update state
  \`\`\`
- [ ] Add left/right fade gradient overlays when overflow detected
- [ ] Add left/right scroll arrow buttons (\`ChevronLeft\` / \`ChevronRight\`)
- [ ] Hide native scrollbar: \`scrollbarWidth: 'none'\`
- [ ] Auto-scroll active tab into view when tab changes
- [ ] \`git commit -m "feat(admin/settings): add tab strip overflow indicators and scroll arrows"\`

## Acceptance Criteria
- Fade gradient visible when tabs overflow on mobile
- Scroll arrows allow keyboard/mouse scrolling through tabs
- Active tab auto-scrolls into view
- No native scrollbar visible`,
  },
];

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔌 Connecting to production Supabase DB…');

  // Find the super_admin account
  const adminRes = await run(
    `SELECT id FROM pd_user WHERE role IN ('super_admin', 'admin') ORDER BY created_at ASC LIMIT 1`,
  );
  if (adminRes.rowCount === 0) {
    console.error('❌ No admin/super_admin user found in pd_user table');
    process.exit(1);
  }
  const adminId = adminRes.rows[0].id as string;
  console.log(`✅ Found admin user: ${adminId}`);

  // Create two folders
  console.log('📁 Creating folders…');

  const hubFolderRes = await run(
    `INSERT INTO admin_note_folders (admin_id, name, color)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [adminId, '🏠 Hub Homepage — Fixes & Improvements', '#16C784'],
  );
  let hubFolderId: string;
  if (hubFolderRes.rowCount === 0) {
    // Already exists — fetch it
    const existing = await run(
      `SELECT id FROM admin_note_folders WHERE admin_id = $1 AND name = $2 LIMIT 1`,
      [adminId, '🏠 Hub Homepage — Fixes & Improvements'],
    );
    hubFolderId = existing.rows[0].id as string;
  } else {
    hubFolderId = hubFolderRes.rows[0].id as string;
  }
  console.log(`  📂 Hub folder: ${hubFolderId}`);

  const settingsFolderRes = await run(
    `INSERT INTO admin_note_folders (admin_id, name, color)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [adminId, '⚙️ Admin Settings — Fixes & Improvements', '#B91C1C'],
  );
  let settingsFolderId: string;
  if (settingsFolderRes.rowCount === 0) {
    const existing = await run(
      `SELECT id FROM admin_note_folders WHERE admin_id = $1 AND name = $2 LIMIT 1`,
      [adminId, '⚙️ Admin Settings — Fixes & Improvements'],
    );
    settingsFolderId = existing.rows[0].id as string;
  } else {
    settingsFolderId = settingsFolderRes.rows[0].id as string;
  }
  console.log(`  📂 Settings folder: ${settingsFolderId}`);

  // Insert Hub notes
  console.log('\n📝 Inserting Hub Homepage notes (HH-01 to HH-18)…');
  for (let i = 0; i < HUB_NOTES.length; i++) {
    const note = HUB_NOTES[i];
    await run(
      `INSERT INTO admin_notes
         (admin_id, folder_id, type, title, content, content_format,
          color, priority, is_pinned, tags, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        adminId,
        hubFolderId,
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
    console.log(`  ✅ HH-${String(i + 1).padStart(2, '0')}: ${note.title.substring(0, 50)}…`);
  }

  // Insert Admin Settings notes
  console.log('\n📝 Inserting Admin Settings notes (AS-01 to AS-20)…');
  for (let i = 0; i < AS_NOTES.length; i++) {
    const note = AS_NOTES[i];
    await run(
      `INSERT INTO admin_notes
         (admin_id, folder_id, type, title, content, content_format,
          color, priority, is_pinned, tags, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        adminId,
        settingsFolderId,
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
    console.log(`  ✅ AS-${String(i + 1).padStart(2, '0')}: ${note.title.substring(0, 50)}…`);
  }

  console.log('\n🎉 Done! Inserted:');
  console.log(`   ${HUB_NOTES.length} Hub Homepage notes → folder "${hubFolderId}"`);
  console.log(`   ${AS_NOTES.length} Admin Settings notes → folder "${settingsFolderId}"`);
  console.log('\n   Open the superadmin dashboard → Admin Notes to see them.');

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  pool.end().catch(() => {});
  process.exit(1);
});
