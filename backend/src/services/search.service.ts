import { MeiliSearch } from 'meilisearch';
import { config } from '../config';
import { logger } from '../utils/logger';

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
   * Query the products index
   */
  async searchProducts(query: string, opts: { limit?: number; offset?: number; category?: string } = {}) {
    const filter = opts.category ? [`category = "${opts.category}"`] : [];
    
    return this.client.index(config.meili.productsIndex).search(query, {
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
      filter,
    });
  }
}

export const searchService = new SearchService();
