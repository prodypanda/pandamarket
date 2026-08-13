import { query } from '../db/pool';

async function main() {
  try {
    const adminRes = await query('SELECT id FROM pd_user WHERE role = $1 LIMIT 1', ['admin']);
    if (adminRes.rowCount === 0) {
      console.log('No admin found');
      process.exit(0);
    }
    const adminId = adminRes.rows[0].id;

    const folderRes = await query(`
      INSERT INTO admin_notes_folders (admin_id, name, color, sort_order) 
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [adminId, 'Resolved Issues & Updates', '#16C784', 1]);
    const folderId = folderRes.rows[0].id;

    const content = `
## Part A — Hub Homepage
**P0 — Real bugs**
*   **A1.** Locale ignored by sponsored ad rails — \`hub/page.tsx\`. Fixed to pass \`marketplaceSettings.marketplace_default_locale\`.
*   **A2.** \`AliExpress2HomeContent\` broken sibling fixed: Added \`useLocale\` import, i18n support, RTL support (\`dir\` attribute), and Hub Homepage blocks support. Unlocked light/dark mode based on brand settings.
*   **A3.** Infinite Loading Trigger Too Low — \`HubProductPagination.tsx\`. Changed \`rootMargin\` from \`100px\` to \`600px\`.
*   **A4.** \`useLocale()\` flash of wrong locale on first paint. Prevented rendering until \`isLoaded\` is true.
*   **A5.** Missing \`aria-labels\` on Wishlist and Cart floating buttons in \`hub/layout.tsx\`.
*   **A6.** Empty state on "Deals" and "Alibaba" layouts didn't translate. Applied \`t()\` across 4 files.

## Part B — Super Admin Settings
*   **B1.** Cross-tab save data loss — Refactored \`handleSave\` to use global \`/api/pd/admin/settings\` endpoint instead of partial updates, preventing silent data loss.
*   **B2.** Arabic locale crash in appearance tab — Added \`ar\` mapping strings.
*   **B3.** Global font fallback — Configured \`next/font\` for Inter.
    `;

    await query(`
      INSERT INTO admin_notes (admin_id, type, title, content, content_format, color, priority, is_pinned, folder_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      adminId, 'markdown', 'Platform Enhancements & Fixes (Part A & B)', content, 'markdown', '#3B82F6', 'normal', true, folderId
    ]);

    console.log('Admin note inserted successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error inserting admin note', err);
    process.exit(1);
  }
}

main();
