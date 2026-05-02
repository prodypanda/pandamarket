/**
 * Product lifecycle event subscribers.
 */

import { eventBus, PdEvent } from '../events/event-bus';
import { logger } from '../utils/logger';
import { searchService } from '../services/search.service';
import { query } from '../db/pool';

export function registerProductSubscribers(): void {
  eventBus.on(PdEvent.PRODUCT_PUBLISHED, async (payload: { product_id: string; store_id: string }) => {
    try {
      const { rows } = await query<{
        id: string; store_id: string; title: string; slug: string;
        description: string | null; category: string | null;
        price: string; thumbnail: string | null; tags: string;
      }>(
        `SELECT id, store_id, title, slug, description, category, price::text, thumbnail, tags
         FROM pd_product WHERE id = $1`,
        [payload.product_id],
      );
      const p = rows[0];
      if (p) {
        await searchService.indexProduct({
          id: p.id,
          store_id: p.store_id,
          title: p.title,
          slug: p.slug,
          description: p.description,
          category: p.category,
          price: parseFloat(p.price),
          thumbnail: p.thumbnail,
          tags: p.tags ? JSON.parse(p.tags) : [],
        });
      }
    } catch (err) {
      logger.error({ err, payload }, 'product.published subscriber failed');
    }
  });
}
