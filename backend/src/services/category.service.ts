import { PoolClient } from 'pg';
import { query, transaction } from '../db/pool';
import { PdConflictError, PdErrorCode, PdForbiddenError, PdNotFoundError, PdValidationError } from '../errors';
import { pdId } from '../utils/crypto';
import { slugify } from '../utils/subdomain';

export interface MarketplaceCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  long_description: string | null;
  image_url: string | null;
  is_default: boolean;
  is_active: boolean;
  position: number;
  product_count?: string;
  created_at: Date;
  updated_at: Date;
}

export interface StorefrontCategoryRow {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  long_description: string | null;
  image_url: string | null;
  is_default: boolean;
  is_active: boolean;
  position: number;
  product_count?: string;
  created_at: Date;
  updated_at: Date;
}

export class CategoryService {
  async ensureMarketplaceDefault(client?: PoolClient): Promise<MarketplaceCategoryRow> {
    if (client) {
      await client.query(
        `INSERT INTO pd_marketplace_category (id, name, slug, description, is_default, is_active, position)
         VALUES ('cat_market_uncategorized', 'Non categorized products', 'non-categorized-products', 'Default marketplace category for uncategorized products.', true, true, 0)
         ON CONFLICT (slug) DO UPDATE SET is_default = true, is_active = true, updated_at = NOW()`,
      );
      const { rows } = await client.query<MarketplaceCategoryRow>(
        'SELECT * FROM pd_marketplace_category WHERE is_default = true LIMIT 1',
      );
      return rows[0];
    }
    await query(
      `INSERT INTO pd_marketplace_category (id, name, slug, description, is_default, is_active, position)
       VALUES ('cat_market_uncategorized', 'Non categorized products', 'non-categorized-products', 'Default marketplace category for uncategorized products.', true, true, 0)
       ON CONFLICT (slug) DO UPDATE SET is_default = true, is_active = true, updated_at = NOW()`,
    );
    const { rows } = await query<MarketplaceCategoryRow>(
      'SELECT * FROM pd_marketplace_category WHERE is_default = true LIMIT 1',
    );
    return rows[0];
  }

  async ensureStorefrontDefault(storeId: string, client?: PoolClient): Promise<StorefrontCategoryRow> {
    const id = `cat_store_uncategorized_${storeId}`;
    if (client) {
      await client.query(
        `INSERT INTO pd_storefront_category (id, store_id, name, slug, description, is_default, is_active, position)
         VALUES ($1, $2, 'Non categorized products', 'non-categorized-products', 'Default storefront category for uncategorized products.', true, true, 0)
         ON CONFLICT (store_id, slug) DO UPDATE SET is_default = true, is_active = true, updated_at = NOW()`,
        [id, storeId],
      );
      const { rows } = await client.query<StorefrontCategoryRow>(
        'SELECT * FROM pd_storefront_category WHERE store_id = $1 AND is_default = true LIMIT 1',
        [storeId],
      );
      return rows[0];
    }
    await query(
      `INSERT INTO pd_storefront_category (id, store_id, name, slug, description, is_default, is_active, position)
       VALUES ($1, $2, 'Non categorized products', 'non-categorized-products', 'Default storefront category for uncategorized products.', true, true, 0)
       ON CONFLICT (store_id, slug) DO UPDATE SET is_default = true, is_active = true, updated_at = NOW()`,
      [id, storeId],
    );
    const { rows } = await query<StorefrontCategoryRow>(
      'SELECT * FROM pd_storefront_category WHERE store_id = $1 AND is_default = true LIMIT 1',
      [storeId],
    );
    return rows[0];
  }

  async listMarketplaceCategories(): Promise<MarketplaceCategoryRow[]> {
    await this.ensureMarketplaceDefault();
    const { rows } = await query<MarketplaceCategoryRow>(
      `SELECT c.*, COUNT(p.id)::text AS product_count
       FROM pd_marketplace_category c
       LEFT JOIN pd_product p ON p.marketplace_category_id = c.id
       GROUP BY c.id
       ORDER BY c.is_default DESC, c.position ASC, c.name ASC`,
    );
    return rows;
  }

  async listPublicMarketplaceCategories(): Promise<MarketplaceCategoryRow[]> {
    await this.ensureMarketplaceDefault();
    const { rows } = await query<MarketplaceCategoryRow>(
      `SELECT c.*, COUNT(p.id)::text AS product_count
       FROM pd_marketplace_category c
       LEFT JOIN pd_product p ON p.marketplace_category_id = c.id AND p.status = 'published'
       WHERE c.is_active = true
       GROUP BY c.id
       ORDER BY c.is_default DESC, c.position ASC, c.name ASC`,
    );
    return rows;
  }

  async createMarketplaceCategory(input: { name: string; description?: string; short_description?: string; long_description?: string; image_url?: string | null; position?: number }): Promise<MarketplaceCategoryRow> {
    const name = input.name.trim();
    if (name.length < 2) throw new PdValidationError('Category name is required');
    const id = pdId('cat');
    const slug = await this.uniqueMarketplaceSlug(slugify(name));
    const { rows } = await query<MarketplaceCategoryRow>(
      `INSERT INTO pd_marketplace_category (id, name, slug, description, position)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, name, slug, input.description?.trim() || input.short_description?.trim() || null, input.position ?? 100],
    );
    if (input.short_description !== undefined || input.long_description !== undefined || input.image_url !== undefined) {
      return this.updateMarketplaceCategory(rows[0].id, {
        short_description: input.short_description,
        long_description: input.long_description,
        image_url: input.image_url,
      });
    }
    return rows[0];
  }

  async updateMarketplaceCategory(id: string, patch: { name?: string; description?: string; short_description?: string; long_description?: string; image_url?: string | null; is_active?: boolean; position?: number }): Promise<MarketplaceCategoryRow> {
    const current = await this.getMarketplaceCategory(id);
    const fields: string[] = [];
    const values: unknown[] = [id];

    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (name.length < 2) throw new PdValidationError('Category name is required');
      values.push(name);
      fields.push(`name = $${values.length}`);
      if (!current.is_default) {
        values.push(await this.uniqueMarketplaceSlug(slugify(name), id));
        fields.push(`slug = $${values.length}`);
      }
    }
    if (patch.description !== undefined) {
      values.push(patch.description.trim() || null);
      fields.push(`description = $${values.length}`);
    }
    if (patch.short_description !== undefined) {
      const shortDescription = patch.short_description.trim() || null;
      values.push(shortDescription);
      fields.push(`short_description = $${values.length}`);
      values.push(shortDescription);
      fields.push(`description = $${values.length}`);
    }
    if (patch.long_description !== undefined) {
      values.push(patch.long_description.trim() || null);
      fields.push(`long_description = $${values.length}`);
    }
    if (patch.image_url !== undefined) {
      values.push(patch.image_url?.trim() || null);
      fields.push(`image_url = $${values.length}`);
    }
    if (patch.is_active !== undefined) {
      if (current.is_default && !patch.is_active) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Default marketplace category cannot be disabled');
      }
      values.push(patch.is_active);
      fields.push(`is_active = $${values.length}`);
    }
    if (patch.position !== undefined) {
      values.push(patch.position);
      fields.push(`position = $${values.length}`);
    }

    if (!fields.length) return current;
    fields.push('updated_at = NOW()');
    const { rows } = await query<MarketplaceCategoryRow>(
      `UPDATE pd_marketplace_category SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return rows[0];
  }

  async getMarketplaceCategory(id: string): Promise<MarketplaceCategoryRow> {
    const { rows } = await query<MarketplaceCategoryRow>('SELECT * FROM pd_marketplace_category WHERE id = $1', [id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Marketplace category not found');
    return rows[0];
  }

  async getMarketplaceCategoryBySlug(slug: string): Promise<MarketplaceCategoryRow> {
    const { rows } = await query<MarketplaceCategoryRow>(
      'SELECT * FROM pd_marketplace_category WHERE slug = $1 AND is_active = true LIMIT 1',
      [slug],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Marketplace category not found');
    return rows[0];
  }

  async getMarketplaceDeleteImpact(id: string) {
    const category = await this.getMarketplaceCategory(id);
    const { rows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM pd_product WHERE marketplace_category_id = $1',
      [id],
    );
    return { category, product_count: parseInt(rows[0].count, 10) };
  }

  async deleteMarketplaceCategory(id: string, confirm = false): Promise<{ reassigned_products: number }> {
    return transaction(async (client) => {
      const category = await this.getMarketplaceCategoryInTx(client, id);
      if (category.is_default) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Default marketplace category cannot be deleted');
      }
      const defaultCategory = await this.ensureMarketplaceDefault(client);
      const { rows: countRows } = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM pd_product WHERE marketplace_category_id = $1',
        [id],
      );
      const productCount = parseInt(countRows[0].count, 10);
      if (productCount > 0 && !confirm) {
        throw new PdConflictError(PdErrorCode.VALIDATION_ERROR, 'Category contains products. Confirm deletion to move them to Non categorized products.', {
          product_count: productCount,
          fallback_category_id: defaultCategory.id,
        });
      }
      await client.query(
        `UPDATE pd_product
         SET marketplace_category_id = $1, category = $2
         WHERE marketplace_category_id = $3`,
        [defaultCategory.id, defaultCategory.name, id],
      );
      await client.query('DELETE FROM pd_marketplace_category WHERE id = $1', [id]);
      return { reassigned_products: productCount };
    });
  }

  async listStorefrontCategories(storeId: string): Promise<StorefrontCategoryRow[]> {
    await this.ensureStorefrontDefault(storeId);
    const { rows } = await query<StorefrontCategoryRow>(
      `SELECT c.*, COUNT(p.id)::text AS product_count
       FROM pd_storefront_category c
       LEFT JOIN pd_product p ON p.storefront_category_id = c.id
       WHERE c.store_id = $1
       GROUP BY c.id
       ORDER BY c.is_default DESC, c.parent_id NULLS FIRST, c.position ASC, c.name ASC`,
      [storeId],
    );
    return rows;
  }

  async createStorefrontCategory(storeId: string, input: { name: string; parent_id?: string | null; description?: string; short_description?: string; long_description?: string; image_url?: string | null; position?: number }): Promise<StorefrontCategoryRow> {
    const name = input.name.trim();
    if (name.length < 2) throw new PdValidationError('Category name is required');
    if (input.parent_id) await this.assertStorefrontCategory(storeId, input.parent_id);
    const id = pdId('cat');
    const slug = await this.uniqueStorefrontSlug(storeId, slugify(name));
    const { rows } = await query<StorefrontCategoryRow>(
      `INSERT INTO pd_storefront_category (id, store_id, parent_id, name, slug, description, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, storeId, input.parent_id || null, name, slug, input.description?.trim() || input.short_description?.trim() || null, input.position ?? 100],
    );
    if (input.short_description !== undefined || input.long_description !== undefined || input.image_url !== undefined) {
      return this.updateStorefrontCategory(storeId, rows[0].id, {
        short_description: input.short_description,
        long_description: input.long_description,
        image_url: input.image_url,
      });
    }
    return rows[0];
  }

  async updateStorefrontCategory(storeId: string, id: string, patch: { name?: string; parent_id?: string | null; description?: string; short_description?: string; long_description?: string; image_url?: string | null; is_active?: boolean; position?: number }): Promise<StorefrontCategoryRow> {
    const current = await this.assertStorefrontCategory(storeId, id);
    const fields: string[] = [];
    const values: unknown[] = [id, storeId];

    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (name.length < 2) throw new PdValidationError('Category name is required');
      values.push(name);
      fields.push(`name = $${values.length}`);
      if (!current.is_default) {
        values.push(await this.uniqueStorefrontSlug(storeId, slugify(name), id));
        fields.push(`slug = $${values.length}`);
      }
    }
    if (patch.parent_id !== undefined) {
      if (current.is_default && patch.parent_id) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Default storefront category cannot be a subcategory');
      }
      if (patch.parent_id) await this.assertStorefrontCategory(storeId, patch.parent_id);
      values.push(patch.parent_id || null);
      fields.push(`parent_id = $${values.length}`);
    }
    if (patch.description !== undefined) {
      values.push(patch.description.trim() || null);
      fields.push(`description = $${values.length}`);
    }
    if (patch.short_description !== undefined) {
      const shortDescription = patch.short_description.trim() || null;
      values.push(shortDescription);
      fields.push(`short_description = $${values.length}`);
      values.push(shortDescription);
      fields.push(`description = $${values.length}`);
    }
    if (patch.long_description !== undefined) {
      values.push(patch.long_description.trim() || null);
      fields.push(`long_description = $${values.length}`);
    }
    if (patch.image_url !== undefined) {
      values.push(patch.image_url?.trim() || null);
      fields.push(`image_url = $${values.length}`);
    }
    if (patch.is_active !== undefined) {
      if (current.is_default && !patch.is_active) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Default storefront category cannot be disabled');
      }
      values.push(patch.is_active);
      fields.push(`is_active = $${values.length}`);
    }
    if (patch.position !== undefined) {
      values.push(patch.position);
      fields.push(`position = $${values.length}`);
    }

    if (!fields.length) return current;
    fields.push('updated_at = NOW()');
    const { rows } = await query<StorefrontCategoryRow>(
      `UPDATE pd_storefront_category SET ${fields.join(', ')} WHERE id = $1 AND store_id = $2 RETURNING *`,
      values,
    );
    return rows[0];
  }

  async deleteStorefrontCategory(storeId: string, id: string): Promise<{ reassigned_products: number }> {
    return transaction(async (client) => {
      const category = await this.getStorefrontCategoryInTx(client, storeId, id);
      if (category.is_default) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Default storefront category cannot be deleted');
      }
      const fallback = await this.ensureStorefrontDefault(storeId, client);
      const { rows: countRows } = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM pd_product WHERE storefront_category_id = $1 AND store_id = $2',
        [id, storeId],
      );
      const productCount = parseInt(countRows[0].count, 10);
      await client.query(
        `UPDATE pd_product
         SET storefront_category_id = $1
         WHERE storefront_category_id = $2 AND store_id = $3`,
        [fallback.id, id, storeId],
      );
      await client.query(
        `UPDATE pd_storefront_category SET parent_id = NULL WHERE parent_id = $1 AND store_id = $2`,
        [id, storeId],
      );
      await client.query('DELETE FROM pd_storefront_category WHERE id = $1 AND store_id = $2', [id, storeId]);
      return { reassigned_products: productCount };
    });
  }

  async resolveProductCategories(storeId: string, marketplaceCategoryId?: string | null, storefrontCategoryId?: string | null) {
    const marketplace = marketplaceCategoryId
      ? await this.getActiveMarketplaceCategory(marketplaceCategoryId)
      : await this.ensureMarketplaceDefault();
    const storefront = storefrontCategoryId
      ? await this.assertStorefrontCategory(storeId, storefrontCategoryId, true)
      : await this.ensureStorefrontDefault(storeId);
    return { marketplace, storefront };
  }

  private async getActiveMarketplaceCategory(id: string): Promise<MarketplaceCategoryRow> {
    const { rows } = await query<MarketplaceCategoryRow>(
      'SELECT * FROM pd_marketplace_category WHERE id = $1 AND is_active = true',
      [id],
    );
    if (!rows[0]) throw new PdValidationError('Marketplace category not found or inactive');
    return rows[0];
  }

  private async assertStorefrontCategory(storeId: string, id: string, activeOnly = false): Promise<StorefrontCategoryRow> {
    const { rows } = await query<StorefrontCategoryRow>(
      `SELECT * FROM pd_storefront_category WHERE store_id = $1 AND id = $2${activeOnly ? ' AND is_active = true' : ''}`,
      [storeId, id],
    );
    if (!rows[0]) throw new PdValidationError('Storefront category not found or inactive');
    return rows[0];
  }

  private async getMarketplaceCategoryInTx(client: PoolClient, id: string): Promise<MarketplaceCategoryRow> {
    const { rows } = await client.query<MarketplaceCategoryRow>('SELECT * FROM pd_marketplace_category WHERE id = $1', [id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Marketplace category not found');
    return rows[0];
  }

  private async getStorefrontCategoryInTx(client: PoolClient, storeId: string, id: string): Promise<StorefrontCategoryRow> {
    const { rows } = await client.query<StorefrontCategoryRow>('SELECT * FROM pd_storefront_category WHERE store_id = $1 AND id = $2', [storeId, id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Storefront category not found');
    return rows[0];
  }

  private async uniqueMarketplaceSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base || 'category';
    let suffix = 1;
    while (await this.marketplaceSlugExists(slug, excludeId)) {
      slug = `${base || 'category'}-${suffix++}`;
    }
    return slug;
  }

  private async marketplaceSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const params: unknown[] = [slug];
    let sql = 'SELECT 1 FROM pd_marketplace_category WHERE slug = $1';
    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id != $${params.length}`;
    }
    const { rowCount } = await query(sql, params);
    return Boolean(rowCount);
  }

  private async uniqueStorefrontSlug(storeId: string, base: string, excludeId?: string): Promise<string> {
    let slug = base || 'category';
    let suffix = 1;
    while (await this.storefrontSlugExists(storeId, slug, excludeId)) {
      slug = `${base || 'category'}-${suffix++}`;
    }
    return slug;
  }

  private async storefrontSlugExists(storeId: string, slug: string, excludeId?: string): Promise<boolean> {
    const params: unknown[] = [storeId, slug];
    let sql = 'SELECT 1 FROM pd_storefront_category WHERE store_id = $1 AND slug = $2';
    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id != $${params.length}`;
    }
    const { rowCount } = await query(sql, params);
    return Boolean(rowCount);
  }
}

export const categoryService = new CategoryService();
