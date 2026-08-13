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
// SAMPLE NOTES (3 total — 2 Hub, 1 Admin Settings)
// ═══════════════════════════════════════════════════════════════════════════

const SAMPLE_NOTES: NoteInput[] = [
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
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

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

  // Delete old folders if they exist (cleanup from previous run)
  console.log('\n🗑️  Cleaning up old POC folders...');
  await run(
    `DELETE FROM admin_note_folders WHERE admin_id = $1 AND name ILIKE '%POC%'`,
    [adminId],
  );

  // Create folder
  console.log('📁 Creating POC folder...');
  const folderRes = await run(
    `INSERT INTO admin_note_folders (admin_id, name, color)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [adminId, '🧪 POC — Enhanced Admin Notes (3 samples)', '#8B5CF6'],
  );
  const folderId = folderRes.rows[0].id as string;
  console.log(`  📂 Folder: ${folderId}`);

  // Insert notes
  console.log('\n📝 Inserting 3 sample notes with checklist items...');
  for (let i = 0; i < SAMPLE_NOTES.length; i++) {
    const note = SAMPLE_NOTES[i];
    const noteId = pdId('anote');

    // Insert note
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

    console.log(`  ✅ Note ${i + 1}: ${note.title.substring(0, 50)}…`);

    // Insert checklist items
    for (let j = 0; j < note.checklist.length; j++) {
      const itemId = pdId('acl');
      await run(
        `INSERT INTO admin_note_checklist_items (id, note_id, content, is_done, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [itemId, noteId, note.checklist[j], false, j + 1],
      );
    }
    console.log(`     └─ ${note.checklist.length} checklist items inserted`);
  }

  console.log('\n🎉 Done!');
  console.log(`   Open the superadmin dashboard → Admin Notes → folder "${folderId}" to see the 3 enhanced notes.`);
  console.log('   Each note has a rich markdown body + proper checklist items in the DB.');

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  pool.end().catch(() => {});
  process.exit(1);
});
