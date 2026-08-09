import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ProductStatus, SellerType, StoreStatus } from '@pandamarket/types';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((prefix: string) => `pd_${prefix}_test123`),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  childLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../utils/sentry', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

import { query } from '../db/pool';
import storeRouter from '../api/store.route';
import productRouter from '../api/product.route';
import { errorHandler } from '../middlewares';

const mockedQuery = vi.mocked(query);

const app = express();
app.use(express.json());
app.use('/api/pd/stores', storeRouter);
app.use('/api/pd/products', productRouter);
app.use(errorHandler);

describe('Public Store and Product Projections (GAP-P0-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/pd/stores/:id', () => {
    it('returns only public store fields and asserts absence of private owner_id and payment_config', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'store_123',
            name: 'Panda Tech Store',
            status: StoreStatus.Verified,
            seller_type: SellerType.Retailer,
            is_verified: true,
            subdomain: 'pandatech',
            custom_domain: 'pandatech.tn',
            theme_id: 'theme_default',
            settings: {
              colors: { primary: '#111' },
              store_description: 'Best electronics in town',
              contact_email: 'support@pandatech.tn',
              secret_internal_key: 'LEAKED_SECRET',
            },
            shipping_mode: 'standard',
            created_at: new Date('2026-01-01T00:00:00Z'),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockedQuery.mockResolvedValueOnce({
        rows: [{ seller_score: '4.8', review_count: '15' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '10' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const res = await request(app).get('/api/pd/stores/store_123');

      expect(res.status).toBe(200);
      expect(res.body.store).toBeDefined();

      const store = res.body.store;
      expect(store.id).toBe('store_123');
      expect(store.name).toBe('Panda Tech Store');
      expect(store.subdomain).toBe('pandatech');
      expect(store.custom_domain).toBe('pandatech.tn');
      expect(store.is_verified).toBe(true);

      // CRITICAL SECURITY ASSERTIONS: Ensure private fields are NEVER exposed
      expect(store.owner_id).toBeUndefined();
      expect(store.payment_config).toBeUndefined();
      expect(store.subscription_plan).toBeUndefined();
      expect(store.subscription_type).toBeUndefined();
      expect(store.subscription_expires_at).toBeUndefined();
      expect(store.settings.secret_internal_key).toBeUndefined();
    });
  });

  describe('GET /api/pd/stores/by-host/:hostname', () => {
    it('resolves store by host and omits private vendor fields', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'store_123',
            name: 'Panda Tech Store',
            status: StoreStatus.Verified,
            seller_type: SellerType.Retailer,
            is_verified: true,
            subdomain: 'pandatech',
            custom_domain: 'pandatech.tn',
            theme_id: 'theme_default',
            settings: { colors: { primary: '#111' } },
            shipping_mode: 'standard',
            owner_id: 'usr_private_owner_999',
            payment_config: 'ENCRYPTED_CONFIG_LEAK',
            created_at: new Date('2026-01-01T00:00:00Z'),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockedQuery.mockResolvedValueOnce({
        rows: [{ seller_score: '5.0', review_count: '2' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '10' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const res = await request(app).get('/api/pd/stores/by-host/pandatech.pandamarket.tn');

      expect(res.status).toBe(200);
      expect(res.body.store).toBeDefined();

      const store = res.body.store;
      expect(store.owner_id).toBeUndefined();
      expect(store.payment_config).toBeUndefined();
    });
  });

  describe('GET /api/pd/products/:id', () => {
    it('returns public product DTO and asserts absence of digital_file_key, inventory_quantity, and rejection_reason', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'prod_999',
            store_id: 'store_123',
            type: 'digital',
            status: ProductStatus.Published,
            title: 'E-Book Guide to Antigravity',
            slug: 'guide-to-antigravity',
            description: 'Learn advanced coding',
            category: 'E-Books',
            marketplace_category_id: 'cat_ebooks',
            storefront_category_id: 'scat_1',
            price: '29.990',
            in_stock: true,
            stock_status: 'in_stock',
            weight_grams: null,
            thumbnail: 'https://cdn.example.com/thumb.jpg',
            seo_title: 'Guide to Antigravity',
            seo_description: 'E-Book Guide',
            tags: ['ebook', 'guide'],
            attributes: [],
            created_at: new Date('2026-01-10T00:00:00Z'),
            updated_at: new Date('2026-01-10T00:00:00Z'),
            store_name: 'Panda Tech Store',
            store_subdomain: 'pandatech',
            images: [],
            variants: [],
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const res = await request(app).get('/api/pd/products/prod_999');

      expect(res.status).toBe(200);
      expect(res.body.product).toBeDefined();

      const product = res.body.product;
      expect(product.id).toBe('prod_999');
      expect(product.title).toBe('E-Book Guide to Antigravity');
      expect(product.price).toBe(29.99);
      expect(product.currency).toBe('TND');
      expect(product.availability).toEqual({
        in_stock: true,
        stock_status: 'in_stock',
      });

      // CRITICAL SECURITY ASSERTIONS: Private fields must be absent
      expect(product.digital_file_key).toBeUndefined();
      expect(product.digital_file_name).toBeUndefined();
      expect(product.digital_file_size).toBeUndefined();
      expect(product.inventory_quantity).toBeUndefined();
      expect(product.rejection_reason).toBeUndefined();
      expect(product.download_count).toBeUndefined();
    });

    it('returns 404 for unverified store or non-published product', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const res = await request(app).get('/api/pd/products/prod_draft_123');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/pd/products/by-store/:storeId/:slug', () => {
    it('returns public product DTO without sensitive fields', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'prod_100',
            store_id: 'store_123',
            type: 'physical',
            status: ProductStatus.Published,
            title: 'Mechanical Keyboard',
            slug: 'mechanical-keyboard',
            description: 'RGB Keyboard',
            category: 'Electronics',
            price: '150.000',
            in_stock: true,
            stock_status: 'in_stock',
            weight_grams: 800,
            thumbnail: 'https://cdn.example.com/kb.jpg',
            seo_title: null,
            seo_description: null,
            tags: [],
            attributes: [],
            created_at: new Date(),
            updated_at: new Date(),
            store_name: 'Panda Tech Store',
            store_subdomain: 'pandatech',
            images: [],
            variants: [],
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const res = await request(app).get('/api/pd/products/by-store/store_123/mechanical-keyboard');

      expect(res.status).toBe(200);
      expect(res.body.product).toBeDefined();

      const product = res.body.product;
      expect(product.digital_file_key).toBeUndefined();
      expect(product.inventory_quantity).toBeUndefined();
    });
  });

  describe('GET /api/pd/products/public', () => {
    it('lists published products with safe public projection', async () => {
      // Platform settings lookup
      mockedQuery.mockResolvedValueOnce({
        rows: [{ catalog_default_sort: 'newest' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Products query
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'prod_1',
            store_id: 'store_123',
            type: 'physical',
            status: ProductStatus.Published,
            title: 'Headphones',
            slug: 'headphones',
            description: 'Wireless',
            category: 'Audio',
            price: '89.900',
            in_stock: true,
            stock_status: 'in_stock',
            weight_grams: 250,
            thumbnail: null,
            seo_title: null,
            seo_description: null,
            tags: [],
            attributes: [],
            created_at: new Date(),
            updated_at: new Date(),
            store_name: 'Panda Tech Store',
            store_subdomain: 'pandatech',
            images: [],
            variants: [],
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Count query
      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const res = await request(app).get('/api/pd/products/public');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);

      const product = res.body.data[0];
      expect(product.digital_file_key).toBeUndefined();
      expect(product.inventory_quantity).toBeUndefined();
    });
  });
});
