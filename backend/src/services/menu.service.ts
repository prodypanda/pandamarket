import { z } from 'zod';
import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';

// ─── Enums & Zod Schemas ──────────────────────────────────────────

export const menuItemTypeEnum = z.enum(['page', 'product', 'category', 'collection', 'custom_url']);
export const menuLocationEnum = z.enum(['header', 'footer', 'mobile', 'utility']);
export const footerBlockTypeEnum = z.enum(['menu', 'text', 'contact', 'social', 'newsletter', 'payment_badges', 'legal', 'map']);

export type MenuItemType = z.infer<typeof menuItemTypeEnum>;
export type MenuLocation = z.infer<typeof menuLocationEnum>;
export type FooterBlockType = z.infer<typeof footerBlockTypeEnum>;

export interface MenuItemInput {
  id?: string;
  parent_id?: string | null;
  type: MenuItemType;
  reference_id?: string | null;
  url?: string | null;
  localized_label: string | Record<string, string>;
  target?: '_self' | '_blank';
  rel?: string | null;
  icon?: string | null;
  image?: string | null;
  visibility_start?: string | null;
  visibility_end?: string | null;
  sort_order?: number;
  is_active?: boolean;
  children?: MenuItemInput[];
}

export const menuItemInputSchema: z.ZodType<MenuItemInput> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    parent_id: z.string().nullable().optional(),
    type: menuItemTypeEnum,
    reference_id: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    localized_label: z.union([z.string(), z.record(z.string())]),
    target: z.enum(['_self', '_blank']).optional().default('_self'),
    rel: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    visibility_start: z.string().nullable().optional(),
    visibility_end: z.string().nullable().optional(),
    sort_order: z.number().int().optional().default(0),
    is_active: z.boolean().optional().default(true),
    children: z.array(menuItemInputSchema).optional().default([]),
  }),
);

export const menuInputSchema = z.object({
  location: menuLocationEnum,
  items: z.array(menuItemInputSchema),
});

export const draftNavigationInputSchema = z.object({
  menus: z.array(menuInputSchema),
});

export const footerBlockInputSchema = z.object({
  id: z.string().optional(),
  type: footerBlockTypeEnum,
  title: z.string().nullable().optional(),
  content: z.record(z.unknown()).default({}),
  sort_order: z.number().int().optional().default(0),
});

export const draftFooterInputSchema = z.object({
  blocks: z.array(footerBlockInputSchema),
});

export type DraftNavigationInput = z.infer<typeof draftNavigationInputSchema>;
export type DraftFooterInput = z.infer<typeof draftFooterInputSchema>;

// ─── MenuService Implementation ───────────────────────────────────

export class MenuService {
  /**
   * Fetch draft navigation menus & nested items for a store seller
   */
  async getDraftNavigation(storeId: string) {
    const { rows: menus } = await query<{
      id: string;
      location: MenuLocation;
      is_published: boolean;
      draft_revision: any;
      published_revision: any;
    }>(
      `SELECT id, location, is_published, draft_revision, published_revision
       FROM pd_store_menu
       WHERE store_id = $1`,
      [storeId],
    );

    const resultMenus = [];
    for (const menu of menus) {
      const items = await this.getMenuItems(menu.id);
      resultMenus.push({
        ...menu,
        items,
      });
    }

    return { menus: resultMenus };
  }

  /**
   * Update draft navigation menus & items for a store seller
   */
  async updateDraftNavigation(storeId: string, input: DraftNavigationInput) {
    const validated = draftNavigationInputSchema.parse(input);

    return transaction(async (client) => {
      for (const menuData of validated.menus) {
        // Upsert store menu
        const { rows: menuRows } = await client.query<{ id: string }>(
          `INSERT INTO pd_store_menu (id, store_id, location, draft_revision)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (store_id, location)
           DO UPDATE SET draft_revision = EXCLUDED.draft_revision, updated_at = NOW()
           RETURNING id`,
          [pdId('menu'), storeId, menuData.location, JSON.stringify(menuData)],
        );

        const menuId = menuRows[0].id;

        // Clear existing items for this menu in draft update
        await client.query(`DELETE FROM pd_store_menu_item WHERE menu_id = $1`, [menuId]);

        // Insert new hierarchical items
        await this.insertMenuItemsRecursively(client, menuId, null, menuData.items);
      }

      logger.info({ store_id: storeId }, 'Draft navigation updated');
      return this.getDraftNavigation(storeId);
    });
  }

  /**
   * Fetch draft footer & blocks for a store seller
   */
  async getDraftFooter(storeId: string) {
    const { rows: footerRows } = await query<{
      id: string;
      is_published: boolean;
      draft_revision: any;
      published_revision: any;
    }>(
      `SELECT id, is_published, draft_revision, published_revision
       FROM pd_store_footer
       WHERE store_id = $1`,
      [storeId],
    );

    const footer = footerRows[0];
    if (!footer) {
      return { footer: null, blocks: [] };
    }

    const { rows: blocks } = await query(
      `SELECT id, type, title, content, sort_order
       FROM pd_store_footer_block
       WHERE footer_id = $1
       ORDER BY sort_order ASC`,
      [footer.id],
    );

    return { footer, blocks };
  }

  /**
   * Update draft footer & blocks for a store seller
   */
  async updateDraftFooter(storeId: string, input: DraftFooterInput) {
    const validated = draftFooterInputSchema.parse(input);

    return transaction(async (client) => {
      // Upsert store footer
      const { rows: footerRows } = await client.query<{ id: string }>(
        `INSERT INTO pd_store_footer (id, store_id, draft_revision)
         VALUES ($1, $2, $3)
         ON CONFLICT (store_id)
         DO UPDATE SET draft_revision = EXCLUDED.draft_revision, updated_at = NOW()
         RETURNING id`,
        [pdId('ftr'), storeId, JSON.stringify(validated)],
      );

      const footerId = footerRows[0].id;

      // Delete old blocks
      await client.query(`DELETE FROM pd_store_footer_block WHERE footer_id = $1`, [footerId]);

      // Insert blocks
      for (let i = 0; i < validated.blocks.length; i++) {
        const block = validated.blocks[i];
        await client.query(
          `INSERT INTO pd_store_footer_block (id, footer_id, type, title, content, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            pdId('ftrblk'),
            footerId,
            block.type,
            block.title ?? null,
            JSON.stringify(block.content ?? {}),
            block.sort_order ?? i,
          ],
        );
      }

      logger.info({ store_id: storeId }, 'Draft footer updated');
      return this.getDraftFooter(storeId);
    });
  }

  /**
   * Publish draft navigation and footer for a store
   */
  async publishContent(storeId: string) {
    return transaction(async (client) => {
      // Copy draft_revision to published_revision for all store menus
      await client.query(
        `UPDATE pd_store_menu
         SET published_revision = draft_revision,
             is_published = true,
             updated_at = NOW()
         WHERE store_id = $1`,
        [storeId],
      );

      // Copy draft_revision to published_revision for store footer
      await client.query(
        `UPDATE pd_store_footer
         SET published_revision = draft_revision,
             is_published = true,
             updated_at = NOW()
         WHERE store_id = $1`,
        [storeId],
      );

      logger.info({ store_id: storeId }, 'Store navigation and footer published');
      return { success: true, store_id: storeId };
    });
  }

  /**
   * Get public published navigation & footer for storefront rendering
   */
  async getPublicNavigation(storeId: string) {
    const { rows: menus } = await query<{
      id: string;
      location: MenuLocation;
      published_revision: any;
    }>(
      `SELECT id, location, published_revision
       FROM pd_store_menu
       WHERE store_id = $1 AND is_published = true`,
      [storeId],
    );

    const publicMenus = [];
    for (const menu of menus) {
      const items = await this.getMenuItems(menu.id, true);
      publicMenus.push({
        id: menu.id,
        location: menu.location,
        items,
      });
    }

    const { rows: footerRows } = await query<{ id: string; published_revision: any }>(
      `SELECT id, published_revision FROM pd_store_footer WHERE store_id = $1 AND is_published = true`,
      [storeId],
    );

    const footer = footerRows[0];
    let footerBlocks: any[] = [];
    if (footer) {
      const { rows: blocks } = await query(
        `SELECT id, type, title, content, sort_order
         FROM pd_store_footer_block
         WHERE footer_id = $1
         ORDER BY sort_order ASC`,
        [footer.id],
      );
      footerBlocks = blocks;
    }

    return {
      menus: publicMenus,
      footer: footer ? { id: footer.id, blocks: footerBlocks } : null,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private async getMenuItems(menuId: string, activeOnly = false): Promise<any[]> {
    let sql = `SELECT id, parent_id, type, reference_id, url, localized_label, target, rel, icon, image, visibility_start, visibility_end, sort_order, is_active
               FROM pd_store_menu_item
               WHERE menu_id = $1`;
    if (activeOnly) {
      sql += ` AND is_active = true AND (visibility_start IS NULL OR visibility_start <= NOW()) AND (visibility_end IS NULL OR visibility_end >= NOW())`;
    }
    sql += ` ORDER BY sort_order ASC`;

    const { rows } = await query(sql, [menuId]);
    return this.buildItemTree(rows, null);
  }

  private buildItemTree(rows: any[], parentId: string | null): any[] {
    return rows
      .filter((row) => row.parent_id === parentId)
      .map((row) => ({
        ...row,
        children: this.buildItemTree(rows, row.id),
      }));
  }

  private async insertMenuItemsRecursively(
    client: any,
    menuId: string,
    parentId: string | null,
    items: MenuItemInput[],
  ) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemId = item.id || pdId('mnitem');
      await client.query(
        `INSERT INTO pd_store_menu_item
          (id, menu_id, parent_id, type, reference_id, url, localized_label, target, rel, icon, image, visibility_start, visibility_end, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          itemId,
          menuId,
          parentId,
          item.type,
          item.reference_id ?? null,
          item.url ?? null,
          typeof item.localized_label === 'string'
            ? JSON.stringify({ fr: item.localized_label, en: item.localized_label })
            : JSON.stringify(item.localized_label),
          item.target ?? '_self',
          item.rel ?? null,
          item.icon ?? null,
          item.image ?? null,
          item.visibility_start ? new Date(item.visibility_start) : null,
          item.visibility_end ? new Date(item.visibility_end) : null,
          item.sort_order ?? i,
          item.is_active ?? true,
        ],
      );

      if (item.children && item.children.length > 0) {
        await this.insertMenuItemsRecursively(client, menuId, itemId, item.children);
      }
    }
  }
}

export const menuService = new MenuService();
