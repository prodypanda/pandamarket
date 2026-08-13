/**
 * insert-hub-admin-notes.ts
 *
 * Inserts all 38 comprehensive Hub Homepage + Admin Settings notes
 * into the superadmin dashboard admin_notes page.
 *
 * Run: npx tsx src/scripts/insert-hub-admin-notes.ts
 *
 * Uses a direct pg connection to the production Supabase DB so it can be
 * executed without the full backend server environment.
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

async function q<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params as never);
    return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

// ─── Note content builders ─────────────────────────────────────────────────

const HH_NOTES: Array<{
  title: string;
  content: string;
  color: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  tags: string[];
}> = [
  {
    title: 'HH-01 — Cart Badge Always Shows "0" on Cold Render',
    color: '#EF4444',
    priority: 'high',
    is_pinned: false,
    tags: ['bug', 'hub', 'navbar', 'ux'],
    content: `## 🔴 Bug — Hub Navbar · \`HubNavbar.tsx:193-198\`

**Impact:** Every page load shows a red "0" badge on the shopping bag icon, misleading visitors who have no cart items.

## Root Cause
\`\`\`tsx
// HubNavbar.tsx:195 — badge renders unconditionally even when cartCount === 0
<span className="absolute -top-2 -right-2 bg-red-500 ...">
  {cartCount}
</span>
\`\`\`

## Fix Checklist
- [ ] Open \`frontend/src/components/hub/HubNavbar.tsx\` → line 193
- [ ] Wrap the badge \`<span>\` with \`{cartCount > 0 && (…)}\`
- [ ] Cap display at 99+: \`{cartCount > 99 ? '99+' : cartCount}\`
- [ ] Add \`aria-label={\`Cart — \${cartCount} items\`}\` to the \`<Link>\`
- [ ] Test: empty cart → no badge; 1 item → badge shows 1; 100 items → shows 99+
- [ ] Commit: \`fix(hub): hide cart badge when cartCount is 0, add aria-label\`

## Acceptance Criteria
- Red badge is invisible when cart is empty
- Badge shows correct count (capped at 99+) when items exist
- Cart link has an accessible name at all times`,
  },
  {
    title: 'HH-02 — Hero Stats Show Page-1 Count Instead of Real Total',
    color: '#EF4444',
    priority: 'high',
    is_pinned: false,
    tags: ['bug', 'hub', 'hero', 'stats'],
    content: `## 🔴 Bug — Hub Homepage Hero · \`HubHomeContent.tsx:154-158\`

**Impact:** Visitors see "16+ Produits actifs" (first page only) instead of the real platform total.

## Root Cause
\`\`\`ts
// HubHomeContent.tsx:154 — only shows trendingProducts.length (max 16)
{ label: 'Produits actifs', value: \`\${trendingProducts.length}+\` }
\`\`\`
\`data.meta.total\` is available in the API response but never passed down.

## Fix Checklist
- [ ] In \`hub/page.tsx\` → add \`totalProducts: data.meta?.total || 0\` to \`getTrendingProducts\` return
- [ ] Destructure \`totalProducts\` at the call site (line ~154)
- [ ] Add \`totalProducts?: number\` to \`HubHomeContentProps\`
- [ ] Update stats: use \`totalProducts\` when > 16, fallback to \`trendingProducts.length\`
- [ ] Pass \`totalProducts={totalProducts}\` to \`<HubHomeContent />\`
- [ ] Test: seed > 16 products → stat shows real total
- [ ] Commit: \`fix(hub): show real total product count in hero stats\`

## Acceptance Criteria
- Hero "Produits actifs" reflects full platform count
- Works correctly when DB has 0 products`,
  },
  {
    title: 'HH-03 — getProductImage() Called 3× Per Deal Card (Redundant)',
    color: '#F97316',
    priority: 'normal',
    is_pinned: false,
    tags: ['performance', 'hub', 'deals'],
    content: `## 🔴 Bug (Performance) — Deals Spotlight · \`HubHomeContent.tsx:263-264\`

**Impact:** \`getProductImage(product)\` runs string parsing + URL normalization 3 times per product card in the Deals Spotlight section.

## Root Cause
\`\`\`tsx
// Called 3× per card:
{getProductImage(product) ? (
  <img src={getProductImage(product)
           ? getResizedImageUrl(getProductImage(product), 'medium')
           : ''} .../>
) : ...}
\`\`\`

## Fix Checklist
- [ ] In \`renderDealsSpotlight\`, extract image before JSX:
  \`\`\`tsx
  const productImage = getProductImage(product);
  const resizedSrc = productImage ? getResizedImageUrl(productImage, 'medium') : '';
  \`\`\`
- [ ] Replace all 3 inline calls with the cached variables
- [ ] Apply same pattern to \`heroProducts.map\` (~line 463)
- [ ] Verify no visual change after fix
- [ ] Commit: \`perf(hub): cache getProductImage() result in deals spotlight\`

## Acceptance Criteria
- \`getProductImage()\` called at most once per product card
- Deal product images still display correctly`,
  },
];
