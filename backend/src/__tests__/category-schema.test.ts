import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { categoryService } from '../services/category.service';
import { query } from '../db/pool';

describe('Category Schema & Megamenu Queries', () => {
  beforeAll(async () => {
    // Ensure table and column exist in test DB
    await query(`
      ALTER TABLE pd_marketplace_category
        ADD COLUMN IF NOT EXISTS show_in_megamenu BOOLEAN NOT NULL DEFAULT true;
    `);
  });

  it('queries megamenu categories without error', async () => {
    const categories = await categoryService.listPublicMarketplaceCategories();
    expect(Array.isArray(categories)).toBe(true);
  });

  it('creates and updates category with show_in_megamenu flag', async () => {
    const testSlug = `test-cat-schema-${Date.now()}`;
    const category = await categoryService.createMarketplaceCategory({
      name: 'Test Megamenu Category',
      slug: testSlug,
      show_in_megamenu: true,
    });

    expect(category.id).toBeDefined();
    expect(category.show_in_megamenu).toBe(true);

    const updated = await categoryService.updateMarketplaceCategory(category.id, {
      show_in_megamenu: false,
    });
    expect(updated.show_in_megamenu).toBe(false);

    // Cleanup
    await query('DELETE FROM pd_marketplace_category WHERE id = $1', [category.id]);
  });
});
