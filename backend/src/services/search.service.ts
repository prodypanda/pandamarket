/**
 * SearchService — wraps Meilisearch for the Hub central product search.
 * Indexes published products with store metadata so search results
 * can be displayed without extra DB roundtrips.
 */

import { MeiliSearch, Index } from 'meilisearch';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ProductStatus, SearchQueryDto, SearchResultDto } from '@pandamarket/types';
import { query } from '../db/pool';

let client: MeiliSearch | null = null;
let productsIndex: Index | null = null;

function getClient(): MeiliSearch {
  if (!client) {
    client = new MeiliSearch({
      host: config.meili.host,
      apiKey: config.meili.masterKey,
    });
    logger.info({ host: config.meili.host }, 'Meilisearch client initialised');
  }
  return client;
}

async function getProductsIndex(): Promise<Index> {
  if (productsIndex) return productsIndex;
  const c = getClient();
  productsIndex = c.index(config.meili.productsIndex);
  return productsIndex;
}

export class SearchService {
  /**
   * Configure index settings (called once at boot or via setup script).
   */
  async ensureIndex(): Promise<void> {
    const c = getClient();
    try {
      const indexes = await c.getIndexes({ limit: 100 });
      const exists = indexes.results.some((i) => i.uid === config.meili.productsIndex);
      if (!exists) {
        await c.createIndex(config.meili.productsIndex, { primaryKey: 'id' });
        logger.info({ uid: config.meili.productsIndex }, 'Meilisearch index created');
      }
      const idx = await getProductsIndex();
      await idx.updateSettings({
        searchableAttributes: ['title', 'description', 'category', 'store_name', 'tags'],
        filterableAttributes: [
          'store_id',
          'category',
          'price',
          'status',
          'store_verified',
        ],
        sortableAttributes: ['price', 'created_at'],
        displayedAttributes: [
          'id',
          'title',
          'price',
          'thumbnail',
          'store_id',
          'store_name',
          'store_verified',
          'category',
        ],
      });
      logger.info('Meilisearch index settings updated');
    } catch (err) {
      logger.error({ err }, 'Failed to configure Meilisearch — continuing');
    }
  }

  /**
   * Add or update a product in the search index.
   */
  async indexProduct(productId: string): Promise<void> {
    const { rows } = await query<{
      id: string;
      title: string;
      price: string;
      thumbnail: string | null;
      store_id: string;
      category: string | null;
      tags: string[];
      description: string | null;
      created_at: Date;
      status: ProductStatus;
      store_name: string;
      store_verified: boolean;
    }>(
      `SELECT p.id, p.title, p.price::text, p.thumbnail, p.store_id, p.category,
              p.tags, p.description, p.created_at, p.status,
              s.name AS store_name, s.is_verified AS store_verified
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       WHERE p.id = $1`,
      [productId],
    );
    const p = rows[0];
    if (!p) return;

    const idx = await getProductsIndex();
    if (p.status !== ProductStatus.Published) {
      await idx.deleteDocument(p.id).catch(() => undefined);
      return;
    }
    await idx.addDocuments([
      {
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        tags: p.tags,
        price: parseFloat(p.price),
        thumbnail: p.thumbnail,
        store_id: p.store_id,
        store_name: p.store_name,
        store_verified: p.store_verified,
        status: p.status,
        created_at: Math.floor(p.created_at.getTime() / 1000),
      },
    ]);
  }

  async removeProduct(productId: string): Promise<void> {
    const idx = await getProductsIndex();
    await idx.deleteDocument(productId).catch(() => undefined);
  }

  /**
   * Bulk reindex — used by admin script after a fresh DB import.
   */
  async reindexAll(): Promise<number> {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM pd_product WHERE status = 'published'`,
    );
    for (const r of rows) await this.indexProduct(r.id);
    logger.info({ count: rows.length }, 'Reindex complete');
    return rows.length;
  }

  /**
   * Search the Hub.
   */
  async search(q: SearchQueryDto): Promise<{ data: SearchResultDto[]; total: number }> {
    const idx = await getProductsIndex();
    const filters: string[] = ['status = "published"'];
    if (q.category) filters.push(`category = "${q.category}"`);
    if (q.store_id) filters.push(`store_id = "${q.store_id}"`);
    if (q.price_min !== undefined) filters.push(`price >= ${q.price_min}`);
    if (q.price_max !== undefined) filters.push(`price <= ${q.price_max}`);

    const sortMap: Record<string, string> = {
      price_asc: 'price:asc',
      price_desc: 'price:desc',
      newest: 'created_at:desc',
    };

    const limit = Math.min(100, q.limit ?? 20);
    const offset = ((q.page ?? 1) - 1) * limit;

    const result = await idx.search<SearchResultDto>(q.q ?? '', {
      filter: filters.join(' AND '),
      sort: q.sort && sortMap[q.sort] ? [sortMap[q.sort]] : undefined,
      limit,
      offset,
    });

    return {
      data: result.hits as SearchResultDto[],
      total: result.estimatedTotalHits ?? result.hits.length,
    };
  }

  /**
   * Auto-complete suggestions (just a top-N search with low limit).
   */
  async suggest(prefix: string, limit = 8): Promise<SearchResultDto[]> {
    const idx = await getProductsIndex();
    const result = await idx.search<SearchResultDto>(prefix, {
      filter: 'status = "published"',
      limit,
    });
    return result.hits as SearchResultDto[];
  }
}

export const searchService = new SearchService();
