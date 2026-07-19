import { MeiliSearch } from 'meilisearch';
import { config } from '../config';
import { logger } from '../utils/logger';
import { query } from '../db/pool';

export interface SearchProductDocument {
  id: string;
  store_id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  price: number;
  thumbnail: string | null;
  tags: string[];
}

export class SearchService {
  private client: MeiliSearch;

  constructor() {
    this.client = new MeiliSearch({
      host: config.meili.host,
      apiKey: config.meili.masterKey,
    });
  }

  /**
   * Initialize indices and settings (called on app startup)
   */
  async init(): Promise<void> {
    try {
      const index = this.client.index(config.meili.productsIndex);
      await index.updateSearchableAttributes([
        'title',
        'description',
        'category',
        'tags',
      ]);
      await index.updateFilterableAttributes(['category', 'store_id', 'price', 'status']);
      await index.updateSortableAttributes(['price', 'created_at']);
      await index.updateDisplayedAttributes([
        'id',
        'title',
        'slug',
        'price',
        'thumbnail',
        'store_id',
        'category',
        'description',
        'tags',
      ]);
      logger.info('Meilisearch indices initialized successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize Meilisearch indices');
    }
  }

  /**
   * Sync a product to the search index
   */
  async indexProduct(product: SearchProductDocument): Promise<void> {
    try {
      await this.client.index(config.meili.productsIndex).addDocuments([product]);
    } catch (err) {
      logger.error({ product_id: product.id }, 'Failed to index product in Meilisearch');
    }
  }

  /**
   * Bulk index multiple products (used by search reindex worker)
   */
  async indexDocuments(documents: Record<string, unknown>[]): Promise<void> {
    try {
      await this.client.index(config.meili.productsIndex).addDocuments(documents);
      logger.info({ count: documents.length }, 'Bulk indexed documents to Meilisearch');
    } catch (err) {
      logger.error({ count: documents.length, err }, 'Failed to bulk index documents');
      throw err;
    }
  }

  /**
   * Remove a product from the search index
   */
  async removeProduct(productId: string): Promise<void> {
    try {
      await this.client.index(config.meili.productsIndex).deleteDocument(productId);
    } catch (err) {
      logger.error({ product_id: productId }, 'Failed to remove product from Meilisearch');
    }
  }

  /**
   * Query the products index (falls back to PostgreSQL if Meilisearch is unavailable)
   */
  async searchProducts(searchQuery: string, opts: { limit?: number; offset?: number; category?: string } = {}) {
    try {
      if (process.env.PD_USE_PG_SEARCH === 'true') {
        throw new Error('Forced Postgres search fallback');
      }
      const filter = opts.category ? [`category = "${opts.category}"`] : [];
      return await this.client.index(config.meili.productsIndex).search(searchQuery, {
        limit: opts.limit ?? 20,
        offset: opts.offset ?? 0,
        filter,
      });
    } catch (err) {
      logger.warn({ err, searchQuery }, 'Meilisearch query failed, falling back to PostgreSQL full-text search');
      return this.searchProductsPostgres(searchQuery, opts);
    }
  }

  /**
   * PostgreSQL fallback search implementation
   */
  private async searchProductsPostgres(searchQuery: string, opts: { limit?: number; offset?: number; category?: string } = {}) {
    let sql = `
      SELECT id, title, slug, price::float as price, thumbnail, store_id, category, description, tags
      FROM pd_product
      WHERE status = 'published'
    `;
    const params: any[] = [];

    if (opts.category) {
      params.push(opts.category);
      sql += ` AND category = $${params.length}`;
    }

    if (searchQuery.trim()) {
      params.push(`%${searchQuery.trim()}%`);
      sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length} OR category ILIKE $${params.length} OR $${params.length} = ANY(tags))`;
    }

    // Get count
    const countSql = `SELECT COUNT(*)::int as count FROM (${sql}) as sub`;
    const countRes = await query(countSql, [...params]);
    const nbHits = countRes.rows[0]?.count ?? 0;

    // Add pagination
    params.push(opts.limit ?? 20);
    sql += ` LIMIT $${params.length}`;

    params.push(opts.offset ?? 0);
    sql += ` OFFSET $${params.length}`;

    const res = await query(sql, params);
    return {
      hits: res.rows.map((row) => ({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : [],
      })),
      nbHits,
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
    };
  }
}

export const searchService = new SearchService();
