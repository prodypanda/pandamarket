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
  created_at?: string | number;
}

export interface SearchProductOptions {
  limit?: number;
  offset?: number;
  category?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'newest';
}

export interface SearchResult<T = SearchProductDocument> {
  hits: T[];
  nbHits: number;
  limit: number;
  offset: number;
  provider?: 'meilisearch' | 'postgres';
}

export class SearchService {
  private client: MeiliSearch | null = null;

  constructor() {
    if (config.meili?.host && config.meili?.masterKey) {
      try {
        this.client = new MeiliSearch({
          host: config.meili.host,
          apiKey: config.meili.masterKey,
        });
      } catch (err) {
        logger.warn({ err }, '[SearchService] Could not initialize Meilisearch client');
      }
    }
  }

  /**
   * Initialize indices and settings (called on app startup)
   */
  async init(): Promise<void> {
    if (!this.client) return;
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
        'created_at',
      ]);
      logger.info('Meilisearch indices initialized successfully');
    } catch (err) {
      logger.warn({ err }, 'Failed to initialize Meilisearch indices');
    }
  }

  /**
   * Sync a product to the search index
   */
  async indexProduct(product: SearchProductDocument): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.index(config.meili.productsIndex).addDocuments([product]);
    } catch (err) {
      logger.warn({ product_id: product.id }, 'Failed to index product in Meilisearch');
    }
  }

  /**
   * Bulk index multiple products (used by search reindex worker)
   */
  async indexDocuments(documents: Record<string, unknown>[]): Promise<void> {
    if (!this.client) return;
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
    if (!this.client) return;
    try {
      await this.client.index(config.meili.productsIndex).deleteDocument(productId);
    } catch (err) {
      logger.warn({ product_id: productId }, 'Failed to remove product from Meilisearch');
    }
  }

  /**
   * Query the products index (falls back to PostgreSQL if Meilisearch is unavailable)
   */
  async searchProducts(searchQuery: string, opts: SearchProductOptions = {}): Promise<SearchResult> {
    if (this.client && process.env.PD_USE_PG_SEARCH !== 'true') {
      try {
        const filters: string[] = [];
        if (opts.category) filters.push(`category = "${opts.category}"`);
        if (opts.storeId) filters.push(`store_id = "${opts.storeId}"`);
        if (opts.minPrice !== undefined) filters.push(`price >= ${opts.minPrice}`);
        if (opts.maxPrice !== undefined) filters.push(`price <= ${opts.maxPrice}`);

        const sort: string[] = [];
        if (opts.sortBy === 'price_asc') sort.push('price:asc');
        else if (opts.sortBy === 'price_desc') sort.push('price:desc');
        else if (opts.sortBy === 'newest') sort.push('created_at:desc');

        const res = await this.client.index(config.meili.productsIndex).search(searchQuery, {
          limit: opts.limit ?? 20,
          offset: opts.offset ?? 0,
          filter: filters.length > 0 ? filters : undefined,
          sort: sort.length > 0 ? sort : undefined,
        });

        return {
          hits: res.hits as SearchProductDocument[],
          nbHits: res.estimatedTotalHits ?? res.hits.length,
          limit: opts.limit ?? 20,
          offset: opts.offset ?? 0,
          provider: 'meilisearch',
        };
      } catch (err) {
        logger.warn({ err, searchQuery }, 'Meilisearch query failed, falling back to PostgreSQL full-text search');
      }
    }

    return this.searchProductsPostgres(searchQuery, opts);
  }

  /**
   * PostgreSQL fallback search implementation
   */
  private async searchProductsPostgres(searchQuery: string, opts: SearchProductOptions = {}): Promise<SearchResult> {
    let sql = `
      SELECT id, title, slug, price::float as price, thumbnail, store_id, category, description, tags, created_at
      FROM pd_product
      WHERE status = 'published'
    `;
    const params: any[] = [];

    if (opts.category) {
      params.push(opts.category);
      sql += ` AND category = $${params.length}`;
    }

    if (opts.storeId) {
      params.push(opts.storeId);
      sql += ` AND store_id = $${params.length}`;
    }

    if (opts.minPrice !== undefined) {
      params.push(opts.minPrice);
      sql += ` AND price >= $${params.length}`;
    }

    if (opts.maxPrice !== undefined) {
      params.push(opts.maxPrice);
      sql += ` AND price <= $${params.length}`;
    }

    if (searchQuery && searchQuery.trim()) {
      params.push(`%${searchQuery.trim()}%`);
      sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length} OR category ILIKE $${params.length} OR tags::text ILIKE $${params.length})`;
    }

    // Get count
    const countSql = `SELECT COUNT(*)::int as count FROM (${sql}) as sub`;
    const countRes = await query<{ count: number }>(countSql, [...params]);
    const nbHits = countRes.rows[0]?.count ?? 0;

    // Sorting
    if (opts.sortBy === 'price_asc') {
      sql += ' ORDER BY price ASC';
    } else if (opts.sortBy === 'price_desc') {
      sql += ' ORDER BY price DESC';
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    // Pagination
    params.push(opts.limit ?? 20);
    sql += ` LIMIT $${params.length}`;

    params.push(opts.offset ?? 0);
    sql += ` OFFSET $${params.length}`;

    const res = await query<any>(sql, params);
    return {
      hits: res.rows.map((row) => ({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : [],
      })),
      nbHits,
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
      provider: 'postgres',
    };
  }
}

export const searchService = new SearchService();
