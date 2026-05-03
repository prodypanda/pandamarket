/**
 * Search reindex runner — handles full bulk sync of products to Meilisearch.
 *
 * Job types:
 * - `full_reindex`: Fetches all published products from PostgreSQL and pushes to Meilisearch
 * - `partial_reindex`: Reindexes a specific set of product IDs
 */

import { query } from '../db/pool';
import { searchService } from '../services/search.service';
import { logger } from '../utils/logger';

interface ReindexJob {
  type: 'full_reindex' | 'partial_reindex';
  product_ids?: string[];
}

interface ProductRow {
  id: string;
  title: string;
  description: string | null;
  price: string;
  category: string | null;
  tags: string[] | null;
  status: string;
  store_id: string;
  thumbnail: string | null;
  created_at: Date;
}

export async function runSearchJob(data: ReindexJob): Promise<{ indexed: number }> {
  const log = logger.child({ worker: 'search', type: data.type });

  if (data.type === 'full_reindex') {
    log.info('Starting full search reindex');

    // Fetch all published products in batches
    const BATCH_SIZE = 500;
    let offset = 0;
    let totalIndexed = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { rows } = await query<ProductRow>(
        `SELECT id, title, description, price, category, tags, status, store_id, thumbnail, created_at
         FROM pd_product
         WHERE status = 'published'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset],
      );

      if (rows.length === 0) break;

      const documents = rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        price: parseFloat(row.price),
        category: row.category || '',
        tags: row.tags || [],
        status: row.status,
        store_id: row.store_id,
        thumbnail: row.thumbnail || '',
        created_at: row.created_at,
      }));

      await searchService.indexDocuments(documents);
      totalIndexed += rows.length;
      offset += BATCH_SIZE;

      log.info({ batch: offset / BATCH_SIZE, indexed: totalIndexed }, 'Reindex batch complete');
    }

    log.info({ totalIndexed }, 'Full reindex complete');
    return { indexed: totalIndexed };
  }

  if (data.type === 'partial_reindex' && data.product_ids?.length) {
    log.info({ count: data.product_ids.length }, 'Starting partial reindex');

    const placeholders = data.product_ids.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await query<ProductRow>(
      `SELECT id, title, description, price, category, tags, status, store_id, thumbnail, created_at
       FROM pd_product
       WHERE id IN (${placeholders}) AND status = 'published'`,
      data.product_ids,
    );

    if (rows.length > 0) {
      const documents = rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        price: parseFloat(row.price),
        category: row.category || '',
        tags: row.tags || [],
        status: row.status,
        store_id: row.store_id,
        thumbnail: row.thumbnail || '',
        created_at: row.created_at,
      }));

      await searchService.indexDocuments(documents);
    }

    log.info({ indexed: rows.length }, 'Partial reindex complete');
    return { indexed: rows.length };
  }

  throw new Error(`Unknown search job type: ${data.type}`);
}
