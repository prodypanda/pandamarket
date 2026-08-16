/**
 * Superadmin Marketplace Products Management & Tagging Hub Test Suite
 *
 * Covers all 4 Tiers:
 * - Tier 1: Role enforcement, catalog retrieval defaults, 5-field sorting, 6-facet filtering, entity hydration, metrics, tag updates
 * - Tier 2: Boundary & Corner Cases (invalid UUIDs, extreme page limits > 100, page 0/negatives, empty tag arrays, SQL injection resilience, zero stock)
 * - Tier 3: Cross-Feature Combinations (search keyword + category filter + price sorting + pagination combined)
 * - Tier 4: Real-World Scenarios (Full Superadmin catalog audit flow, AI tagging sync flow, low-stock triage)
 */

import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '@pandamarket/types';
import { signAccessToken } from '../utils/jwt';
import { errorHandler } from '../middlewares';

// ---------------------------------------------------------------------------
// Mock Dependencies
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: vi.fn(async (cb: any) => cb({ query: (...args: unknown[]) => mockQuery(...args) })),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  childLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../services/system-log.service', () => ({
  systemLogService: {
    captureError: vi.fn(),
  },
}));

vi.mock('../utils/sentry', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

import adminRouter from '../api/admin.route';

// ---------------------------------------------------------------------------
// Test App & Mock Data Helpers
// ---------------------------------------------------------------------------

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/pd/admin', adminRouter);
  app.use(errorHandler);
  return app;
}

const superAdminToken = signAccessToken({
  sub: 'superadmin_usr_01',
  role: UserRole.SuperAdmin,
  store_id: null,
});

const adminToken = signAccessToken({
  sub: 'admin_usr_02',
  role: UserRole.Admin,
  store_id: null,
});

const vendorToken = signAccessToken({
  sub: 'vendor_usr_03',
  role: UserRole.Vendor,
  store_id: 'store_medina_01',
});

const customerToken = signAccessToken({
  sub: 'customer_usr_04',
  role: UserRole.Customer,
  store_id: null,
});

const mockProductRecord = {
  id: 'prod_e0123456-789a-bcde-f012-3456789abcde',
  store_id: 'store_11112222-3333-4444-5555-666677778888',
  product_type: 'physical',
  status: 'published',
  title: 'Céramique de Nabeul Fait Main',
  slug: 'ceramique-de-nabeul-fait-main',
  description: 'Vase traditionnel en céramique peinte à la main par les artisans de Nabeul.',
  price: '85.500',
  inventory_quantity: 12,
  weight_grams: 650,
  thumbnail: 'https://cdn.pandamarket.tn/products/vase-nabeul-thumb.jpg',
  seo_title: 'Vase Céramique Nabeul - PandaMarket',
  seo_description: 'Achetez de la céramique traditionnelle de Nabeul sur PandaMarket.',
  tags: ['artisanat', 'ceramique', 'nabeul', 'decoration'],
  interest_tags: ['poterie', 'artisanat-tunisien', 'fait-main'],
  interest_tags_synced_at: '2026-08-15T12:00:00.000Z',
  attributes: { matiere: 'Argile', motif: 'Floral Andalou' },
  metadata: { handpainted: true, origin: 'Nabeul' },
  rejection_reason: null,
  product_reference: 'REF-NAB-001',
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: '2026-08-15T12:00:00.000Z',
  store: {
    id: 'store_11112222-3333-4444-5555-666677778888',
    name: 'Atelier Médina Nabeul',
    subdomain: 'atelier-medina',
    custom_domain: 'ateliermedina.tn',
    is_verified: true,
    status: 'active',
    seller_type: 'artisan',
  },
  marketplace_category: {
    id: 'cat_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    name: 'Artisanat & Décoration',
    slug: 'artisanat-decoration',
  },
  storefront_category: {
    id: 'scat_11111111-2222-3333-4444-555555555555',
    name: 'Poteries Traditionnelles',
    slug: 'poteries-traditionnelles',
  },
  images: [
    {
      id: 'img_01',
      url: 'https://cdn.pandamarket.tn/products/vase-nabeul-thumb.jpg',
      alt_text: 'Vase céramique vue de face',
      position: 0,
      is_thumbnail: true,
    },
    {
      id: 'img_02',
      url: 'https://cdn.pandamarket.tn/products/vase-nabeul-detail.jpg',
      alt_text: 'Détail peinture émaillée',
      position: 1,
      is_thumbnail: false,
    },
  ],
  variants: [
    {
      id: 'var_01',
      sku: 'NAB-VASE-BLU-M',
      title: 'Bleu Royal 30cm',
      price: '85.500',
      inventory_quantity: 12,
      options: { size: '30cm', color: 'Bleu Royal' },
      is_active: true,
      created_at: '2026-08-10T10:00:00.000Z',
    },
  ],
  variants_count: 1,
};

const mockCatalogMetrics = {
  total_products: 48,
  published_count: 32,
  pending_count: 6,
  draft_count: 4,
  rejected_count: 2,
  archived_count: 4,
  out_of_stock_count: 5,
  low_stock_count: 8,
  ai_tagged_count: 38,
};

function setupCatalogDbMock(products: any[] = [mockProductRecord], total = 48, metrics = mockCatalogMetrics) {
  mockQuery.mockImplementation((sql: string) => {
    if (typeof sql === 'string' && sql.includes('COUNT(*)::int AS total_products')) {
      return Promise.resolve({ rows: [metrics] });
    }
    if (typeof sql === 'string' && sql.includes('COUNT(*)::int AS total')) {
      return Promise.resolve({ rows: [{ total }] });
    }
    if (typeof sql === 'string' && sql.includes('json_build_object')) {
      return Promise.resolve({ rows: products });
    }
    return Promise.resolve({ rows: [] });
  });
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('Superadmin Marketplace Products Hub API (admin.route.ts)', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  // =========================================================================
  // TIER 1: Feature Coverage (Category-Partition & Happy-Path)
  // =========================================================================
  describe('Tier 1: Feature Coverage & Happy-Path Workflows', () => {
    describe('1.1 Role Enforcement & Superadmin Security (F1)', () => {
      it('allows SuperAdmin role with HTTP 200', async () => {
        setupCatalogDbMock();
        const res = await request(app)
          .get('/api/pd/admin/products')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeInstanceOf(Array);
      });

      it('allows Admin role with HTTP 200', async () => {
        setupCatalogDbMock();
        const res = await request(app)
          .get('/api/pd/admin/products')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('rejects Vendor role with HTTP 403 Forbidden', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products')
          .set('Authorization', `Bearer ${vendorToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('PD_PERM_FORBIDDEN');
      });

      it('rejects Customer role with HTTP 403 Forbidden', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('PD_PERM_FORBIDDEN');
      });

      it('rejects unauthenticated requests (missing Bearer token) with HTTP 401 Unauthorized', async () => {
        const res = await request(app).get('/api/pd/admin/products');

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('PD_AUTH_TOKEN_INVALID');
      });

      it('rejects malformed / invalid JWT tokens with HTTP 401 Unauthorized', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products')
          .set('Authorization', 'Bearer invalid.token.payload');

        expect(res.status).toBe(401);
      });
    });

    describe('1.2 Catalog Query & Pagination Defaults (F2)', () => {
      it('returns default page 1, limit 20, total count, and total pages', async () => {
        setupCatalogDbMock([mockProductRecord], 48);

        const res = await request(app)
          .get('/api/pd/admin/products')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.pagination).toMatchObject({
          page: 1,
          limit: 20,
          total: 48,
          total_pages: 3,
        });
        expect(res.body.data).toHaveLength(1);
      });

      it('passes explicit pagination (page=2, limit=10) with correct OFFSET and LIMIT', async () => {
        setupCatalogDbMock([mockProductRecord], 48);

        const res = await request(app)
          .get('/api/pd/admin/products?page=2&limit=10')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.pagination.page).toBe(2);
        expect(res.body.pagination.limit).toBe(10);
        expect(res.body.pagination.total_pages).toBe(5);

        // Verify SQL parameters: LIMIT 10 OFFSET 10
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall).toBeDefined();
        const params = dataCall[1];
        expect(params[params.length - 2]).toBe(10); // limit
        expect(params[params.length - 1]).toBe(10); // offset = (2-1)*10
      });
    });

    describe('1.3 Multi-Axis Sorting (F3)', () => {
      const sortCases = [
        { field: 'created_at', order: 'desc', sqlCol: 'p.created_at DESC' },
        { field: 'created_at', order: 'asc', sqlCol: 'p.created_at ASC' },
        { field: 'price', order: 'desc', sqlCol: 'p.price DESC' },
        { field: 'price', order: 'asc', sqlCol: 'p.price ASC' },
        { field: 'title', order: 'asc', sqlCol: 'p.title ASC' },
        { field: 'title', order: 'desc', sqlCol: 'p.title DESC' },
        { field: 'inventory_quantity', order: 'asc', sqlCol: 'p.inventory_quantity ASC' },
        { field: 'inventory_quantity', order: 'desc', sqlCol: 'p.inventory_quantity DESC' },
        { field: 'store_name', order: 'asc', sqlCol: 's.name ASC' },
        { field: 'store_name', order: 'desc', sqlCol: 's.name DESC' },
      ];

      for (const { field, order, sqlCol } of sortCases) {
        it(`sorts by ${field} in ${order} order generating "${sqlCol}"`, async () => {
          setupCatalogDbMock();

          const res = await request(app)
            .get(`/api/pd/admin/products?sort_by=${field}&sort_order=${order}`)
            .set('Authorization', `Bearer ${superAdminToken}`);

          expect(res.status).toBe(200);
          const dataCall = mockQuery.mock.calls.find((call) =>
            typeof call[0] === 'string' && call[0].includes('json_build_object'),
          );
          expect(dataCall[0]).toContain(`ORDER BY ${sqlCol}`);
        });
      }
    });

    describe('1.4 Universal Text Search (F4)', () => {
      it('executes parameterized ILIKE search across title, description, SKU, store name, tags, and interest_tags', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?search=ceramique')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('p.title ILIKE $1');
        expect(dataCall[0]).toContain('p.description ILIKE $1');
        expect(dataCall[0]).toContain('s.name ILIKE $1');
        expect(dataCall[0]).toContain('p.tags::text ILIKE $1');
        expect(dataCall[0]).toContain("array_to_string(p.interest_tags, ' ') ILIKE $1");
        expect(dataCall[0]).toContain('pv.sku ILIKE $1');
        expect(dataCall[1]).toContain('%ceramique%');
      });

      it('supports search query alias ?q= as alternative to ?search=', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?q=poterie')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[1]).toContain('%poterie%');
      });
    });

    describe('1.5 Multi-Faceted Filtering (F5)', () => {
      it('filters by status (published, pending_approval, draft, rejected, archived)', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?status=pending_approval')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('p.status = $1');
        expect(dataCall[1]).toContain('pending_approval');
      });

      it('filters by marketplace_category_id (and aliases categoryId / category_id)', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?marketplace_category_id=cat_123')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('p.marketplace_category_id = $1');
        expect(dataCall[1]).toContain('cat_123');
      });

      it('filters by store_id (and alias storeId)', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?store_id=store_456')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('p.store_id = $1');
        expect(dataCall[1]).toContain('store_456');
      });

      it('filters by product_type (physical, digital, service, serial)', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?product_type=digital')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('p.type = $1');
        expect(dataCall[1]).toContain('digital');
      });

      it('filters by stock_status=in_stock (quantity > 5)', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?stock_status=in_stock')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('p.inventory_quantity > 5');
      });

      it('filters by stock_status=low_stock (0 < quantity <= 5)', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?stock_status=low_stock')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('p.inventory_quantity > 0 AND p.inventory_quantity <= 5');
      });

      it('filters by stock_status=out_of_stock (quantity <= 0)', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?stock_status=out_of_stock')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('p.inventory_quantity <= 0');
      });

      it('filters by ai_tagged=tagged (has interest_tags)', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?ai_tagged=tagged')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('(p.interest_tags IS NOT NULL AND cardinality(p.interest_tags) > 0)');
      });

      it('filters by ai_tagged=untagged (null or empty interest_tags)', async () => {
        setupCatalogDbMock();

        const res = await request(app)
          .get('/api/pd/admin/products?ai_tagged=untagged')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[0]).toContain('(p.interest_tags IS NULL OR cardinality(p.interest_tags) = 0)');
      });
    });

    describe('1.6 Comprehensive Entity Hydration (F6)', () => {
      it('returns fully hydrated product records including store, categories, images, and variants', async () => {
        setupCatalogDbMock([mockProductRecord]);

        const res = await request(app)
          .get('/api/pd/admin/products')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const product = res.body.data[0];
        expect(product.id).toBe('prod_e0123456-789a-bcde-f012-3456789abcde');
        expect(product.title).toBe('Céramique de Nabeul Fait Main');
        expect(product.store).toEqual(mockProductRecord.store);
        expect(product.store.is_verified).toBe(true);
        expect(product.marketplace_category).toEqual(mockProductRecord.marketplace_category);
        expect(product.storefront_category).toEqual(mockProductRecord.storefront_category);
        expect(product.images).toHaveLength(2);
        expect(product.variants).toHaveLength(1);
        expect(product.variants_count).toBe(1);
        expect(product.tags).toEqual(['artisanat', 'ceramique', 'nabeul', 'decoration']);
        expect(product.interest_tags).toEqual(['poterie', 'artisanat-tunisien', 'fait-main']);
      });
    });

    describe('1.7 Summary Metrics Aggregation (F7)', () => {
      it('returns complete metrics header with 9 platform KPIs', async () => {
        setupCatalogDbMock([mockProductRecord], 48, mockCatalogMetrics);

        const res = await request(app)
          .get('/api/pd/admin/products')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.metrics).toEqual({
          total_products: 48,
          published_count: 32,
          pending_count: 6,
          draft_count: 4,
          rejected_count: 2,
          archived_count: 4,
          out_of_stock_count: 5,
          low_stock_count: 8,
          ai_tagged_count: 38,
        });
      });
    });

    describe('1.8 Product Tag Management API (F8)', () => {
      it('updates vendor tags and returns HTTP 200 with sanitized tags', async () => {
        const prodId = 'prod_e0123456-789a-bcde-f012-3456789abcde';
        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: prodId }] }) // check existence
          .mockResolvedValueOnce({
            rows: [
              {
                id: prodId,
                tags: ['artisanat', 'poterie-fine', 'nabeul'],
                interest_tags: ['artisanat-tunisien'],
                interest_tags_synced_at: '2026-08-15T12:00:00.000Z',
              },
            ],
          });

        const res = await request(app)
          .patch(`/api/pd/admin/products/${prodId}/tags`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            tags: ['Artisanat', 'Poterie Fine', 'Nabeul', 'Artisanat'], // with duplicates and casing
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(prodId);
        expect(res.body.message).toBe('Product tags updated successfully');

        // Verify update SQL parameter
        const updateCall = mockQuery.mock.calls[1];
        expect(updateCall[0]).toContain('tags = $2::jsonb');
        expect(updateCall[1][0]).toBe(prodId);
      });

      it('updates AI interest tags and sets interest_tags_synced_at timestamp', async () => {
        const prodId = 'prod_e0123456-789a-bcde-f012-3456789abcde';
        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: prodId }] })
          .mockResolvedValueOnce({
            rows: [
              {
                id: prodId,
                tags: ['artisanat'],
                interest_tags: ['decor-maison', 'art-arabe', 'tunisie-craft'],
                interest_tags_synced_at: '2026-08-16T12:00:00.000Z',
              },
            ],
          });

        const res = await request(app)
          .patch(`/api/pd/admin/products/${prodId}/tags`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            interest_tags: ['Decor Maison', 'Art Arabe', 'Tunisie Craft'],
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const updateCall = mockQuery.mock.calls[1];
        expect(updateCall[0]).toContain('interest_tags = $2::text[]');
        expect(updateCall[0]).toContain('interest_tags_synced_at = NOW()');
      });

      it('updates both vendor tags and AI interest tags in a single request', async () => {
        const prodId = 'prod_e0123456-789a-bcde-f012-3456789abcde';
        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: prodId }] })
          .mockResolvedValueOnce({
            rows: [
              {
                id: prodId,
                tags: ['fait-main'],
                interest_tags: ['poterie-nabeul'],
                interest_tags_synced_at: '2026-08-16T12:00:00.000Z',
              },
            ],
          });

        const res = await request(app)
          .patch(`/api/pd/admin/products/${prodId}/tags`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            tags: ['Fait Main'],
            interest_tags: ['Poterie Nabeul'],
          });

        expect(res.status).toBe(200);
        const updateCall = mockQuery.mock.calls[1];
        expect(updateCall[0]).toContain('tags = $2::jsonb');
        expect(updateCall[0]).toContain('interest_tags = $3::text[]');
      });
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases (Boundary Value Analysis & Security)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases & Security Validation', () => {
    describe('2.1 Pagination & Parameter Bounds', () => {
      it('rejects extreme limit > 100 with HTTP 400 validation error', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products?limit=101')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('PD_VALIDATION_ERROR');
      });

      it('rejects limit = 0 and negative limits with HTTP 400', async () => {
        const resZero = await request(app)
          .get('/api/pd/admin/products?limit=0')
          .set('Authorization', `Bearer ${superAdminToken}`);
        expect(resZero.status).toBe(400);

        const resNeg = await request(app)
          .get('/api/pd/admin/products?limit=-5')
          .set('Authorization', `Bearer ${superAdminToken}`);
        expect(resNeg.status).toBe(400);
      });

      it('rejects page = 0 and negative page numbers with HTTP 400', async () => {
        const resZero = await request(app)
          .get('/api/pd/admin/products?page=0')
          .set('Authorization', `Bearer ${superAdminToken}`);
        expect(resZero.status).toBe(400);

        const resNeg = await request(app)
          .get('/api/pd/admin/products?page=-1')
          .set('Authorization', `Bearer ${superAdminToken}`);
        expect(resNeg.status).toBe(400);
      });

      it('rejects non-numeric page or limit parameters with HTTP 400', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products?page=abc&limit=xyz')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('PD_VALIDATION_ERROR');
      });

      it('rejects search query exceeding 200 characters with HTTP 400', async () => {
        const longSearch = 'a'.repeat(201);
        const res = await request(app)
          .get(`/api/pd/admin/products?search=${longSearch}`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('PD_VALIDATION_ERROR');
      });
    });

    describe('2.2 Invalid Enum Options Validation', () => {
      it('rejects invalid status enum with HTTP 400', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products?status=invalid_status')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
      });

      it('rejects invalid product_type enum with HTTP 400', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products?product_type=crypto_token')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
      });

      it('rejects invalid stock_status enum with HTTP 400', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products?stock_status=infinitely_stocked')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
      });

      it('rejects invalid ai_tagged enum with HTTP 400', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products?ai_tagged=maybe_tagged')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
      });

      it('rejects invalid sort_by column with HTTP 400', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products?sort_by=password_hash')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
      });

      it('rejects invalid sort_order with HTTP 400', async () => {
        const res = await request(app)
          .get('/api/pd/admin/products?sort_order=sideways')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
      });
    });

    describe('2.3 SQL Injection Resistance & Special Characters', () => {
      it('safely handles SQL injection payload in search parameter without SQL manipulation', async () => {
        setupCatalogDbMock();

        const injectionPayload = "'; DROP TABLE pd_product; --";
        const res = await request(app)
          .get(`/api/pd/admin/products?search=${encodeURIComponent(injectionPayload)}`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        // Payload must be in parameters array, not string-concatenated in SQL
        expect(dataCall[1]).toContain(`%${injectionPayload.trim()}%`);
        expect(dataCall[0]).not.toContain('DROP TABLE');
      });

      it('safely handles UNION SELECT attempts in search query', async () => {
        setupCatalogDbMock();

        const unionPayload = "' UNION SELECT id, email, password_hash FROM pd_user --";
        const res = await request(app)
          .get(`/api/pd/admin/products?search=${encodeURIComponent(unionPayload)}`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[1]).toContain(`%${unionPayload.trim()}%`);
      });

      it('safely handles special SQL wildcards and metacharacters (%, _, \\, ", \')', async () => {
        setupCatalogDbMock();

        const metaSearch = '%_\\\'"';
        const res = await request(app)
          .get(`/api/pd/admin/products?search=${encodeURIComponent(metaSearch)}`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const dataCall = mockQuery.mock.calls.find((call) =>
          typeof call[0] === 'string' && call[0].includes('json_build_object'),
        );
        expect(dataCall[1]).toContain(`%${metaSearch.trim()}%`);
      });
    });

    describe('2.4 Tag PATCH Boundary & Edge Cases', () => {
      it('rejects empty body (neither tags nor interest_tags provided) with HTTP 400', async () => {
        const prodId = 'prod_e0123456-789a-bcde-f012-3456789abcde';
        const res = await request(app)
          .patch(`/api/pd/admin/products/${prodId}/tags`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('PD_VALIDATION_ERROR');
      });

      it('returns HTTP 404 when product is not found in database', async () => {
        const nonExistentId = 'prod_00000000-0000-0000-0000-000000000000';
        mockQuery.mockResolvedValueOnce({ rows: [] }); // not found

        const res = await request(app)
          .patch(`/api/pd/admin/products/${nonExistentId}/tags`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ tags: ['artisanat'] });

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('PD_PRODUCT_NOT_FOUND');
      });

      it('rejects tag string exceeding 100 characters with HTTP 400', async () => {
        const prodId = 'prod_e0123456-789a-bcde-f012-3456789abcde';
        const longTag = 't'.repeat(101);

        const res = await request(app)
          .patch(`/api/pd/admin/products/${prodId}/tags`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ tags: [longTag] });

        expect(res.status).toBe(400);
      });

      it('rejects tag array with more than 50 items with HTTP 400', async () => {
        const prodId = 'prod_e0123456-789a-bcde-f012-3456789abcde';
        const tooManyTags = Array.from({ length: 51 }, (_, i) => `tag_${i}`);

        const res = await request(app)
          .patch(`/api/pd/admin/products/${prodId}/tags`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ tags: tooManyTags });

        expect(res.status).toBe(400);
      });

      it('safely cleans and deduplicates whitespace and empty strings into empty array', async () => {
        const prodId = 'prod_e0123456-789a-bcde-f012-3456789abcde';
        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: prodId }] })
          .mockResolvedValueOnce({
            rows: [
              {
                id: prodId,
                tags: [],
                interest_tags: [],
                interest_tags_synced_at: '2026-08-16T12:00:00.000Z',
              },
            ],
          });

        const res = await request(app)
          .patch(`/api/pd/admin/products/${prodId}/tags`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ tags: ['   ', ''] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.tags).toEqual([]);
      });

      it('rejects non-array or non-string tag payloads with HTTP 400', async () => {
        const prodId = 'prod_e0123456-789a-bcde-f012-3456789abcde';
        const res = await request(app)
          .patch(`/api/pd/admin/products/${prodId}/tags`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ tags: 12345 as any });

        expect(res.status).toBe(400);
      });
    });

    describe('2.5 Empty Database & 0-Results Corner Case', () => {
      it('returns empty array with total=0 and total_pages=0 when no products match', async () => {
        setupCatalogDbMock([], 0, {
          total_products: 0,
          published_count: 0,
          pending_count: 0,
          draft_count: 0,
          rejected_count: 0,
          archived_count: 0,
          out_of_stock_count: 0,
          low_stock_count: 0,
          ai_tagged_count: 0,
        });

        const res = await request(app)
          .get('/api/pd/admin/products?status=rejected')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination).toMatchObject({
          page: 1,
          limit: 20,
          total: 0,
          total_pages: 0,
        });
        expect(res.body.metrics.total_products).toBe(0);
      });
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Combinations (Pairwise Testing)
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations', () => {
    it('combines Search + Category Filter + Price Asc Sorting + Pagination', async () => {
      setupCatalogDbMock();

      const res = await request(app)
        .get(
          '/api/pd/admin/products?search=tapis&marketplace_category_id=cat_artisanat_01&sort_by=price&sort_order=asc&page=3&limit=15',
        )
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const dataCall = mockQuery.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('json_build_object'),
      );

      // Verify all conditions combined
      expect(dataCall[0]).toContain('p.marketplace_category_id = $1');
      expect(dataCall[0]).toContain('p.title ILIKE $2');
      expect(dataCall[0]).toContain('ORDER BY p.price ASC');
      expect(dataCall[1]).toEqual([
        'cat_artisanat_01',
        '%tapis%',
        15, // limit
        30, // offset = (3-1)*15
      ]);
    });

    it('combines Status + Stock Status + Store Filter + AI Tagged Filter', async () => {
      setupCatalogDbMock();

      const res = await request(app)
        .get(
          '/api/pd/admin/products?status=published&stock_status=low_stock&store_id=store_medina_01&ai_tagged=tagged',
        )
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const dataCall = mockQuery.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('json_build_object'),
      );

      expect(dataCall[0]).toContain('p.status = $1');
      expect(dataCall[0]).toContain('p.store_id = $2');
      expect(dataCall[0]).toContain('p.inventory_quantity > 0 AND p.inventory_quantity <= 5');
      expect(dataCall[0]).toContain('(p.interest_tags IS NOT NULL AND cardinality(p.interest_tags) > 0)');
      expect(dataCall[1]).toContain('published');
      expect(dataCall[1]).toContain('store_medina_01');
    });

    it('combines Digital Product Type + Untagged AI + Title Sorting', async () => {
      setupCatalogDbMock();

      const res = await request(app)
        .get('/api/pd/admin/products?product_type=digital&ai_tagged=untagged&sort_by=title&sort_order=asc')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const dataCall = mockQuery.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('json_build_object'),
      );

      expect(dataCall[0]).toContain('p.type = $1');
      expect(dataCall[0]).toContain('(p.interest_tags IS NULL OR cardinality(p.interest_tags) = 0)');
      expect(dataCall[0]).toContain('ORDER BY p.title ASC');
      expect(dataCall[1]).toContain('digital');
    });
  });

  // =========================================================================
  // TIER 4: Real-World Application Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Operational Scenarios', () => {
    it('Scenario 1: Superadmin Full Catalog Audit Flow', async () => {
      // Step 1: Admin loads main products view, receives metrics overview
      setupCatalogDbMock([mockProductRecord], 48, mockCatalogMetrics);
      const overviewRes = await request(app)
        .get('/api/pd/admin/products')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(overviewRes.status).toBe(200);
      expect(overviewRes.body.metrics.total_products).toBe(48);
      expect(overviewRes.body.metrics.pending_count).toBe(6);
      expect(overviewRes.body.metrics.out_of_stock_count).toBe(5);

      // Step 2: Admin filters pending approval queue to review submissions
      const pendingProduct = { ...mockProductRecord, status: 'pending_approval' };
      setupCatalogDbMock([pendingProduct], 6);
      const pendingRes = await request(app)
        .get('/api/pd/admin/products?status=pending_approval&sort_by=created_at&sort_order=asc')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.pagination.total).toBe(6);
      expect(pendingRes.body.data[0].status).toBe('pending_approval');

      // Step 3: Admin inspects product variants and merchant identity
      const inspected = pendingRes.body.data[0];
      expect(inspected.store.name).toBe('Atelier Médina Nabeul');
      expect(inspected.store.is_verified).toBe(true);
      expect(inspected.variants[0].sku).toBe('NAB-VASE-BLU-M');
    });

    it('Scenario 2: AI Interest Tagging & Catalog Enrichment Workflow', async () => {
      const prodId = 'prod_e0123456-789a-bcde-f012-3456789abcde';

      // Step 1: Admin identifies untagged published products
      const untaggedProduct = { ...mockProductRecord, interest_tags: [], interest_tags_synced_at: null };
      setupCatalogDbMock([untaggedProduct], 10);

      const findUntaggedRes = await request(app)
        .get('/api/pd/admin/products?status=published&ai_tagged=untagged')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(findUntaggedRes.status).toBe(200);
      expect(findUntaggedRes.body.data[0].interest_tags).toEqual([]);

      // Step 2: Admin injects newly generated AI interest tags via Tag Studio
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: prodId }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: prodId,
              tags: ['artisanat', 'ceramique'],
              interest_tags: ['artisanat-tunisien', 'poterie-nabeul', 'decoration-orientale'],
              interest_tags_synced_at: '2026-08-16T12:30:00.000Z',
            },
          ],
        });

      const patchRes = await request(app)
        .patch(`/api/pd/admin/products/${prodId}/tags`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          interest_tags: ['Artisanat Tunisien', 'Poterie Nabeul', 'Décoration Orientale'],
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.interest_tags).toEqual([
        'artisanat-tunisien',
        'poterie-nabeul',
        'decoration-orientale',
      ]);
      expect(patchRes.body.data.interest_tags_synced_at).toBeDefined();

      // Step 3: Admin queries by tagged status and newly added tag
      const enrichedProduct = {
        ...mockProductRecord,
        interest_tags: ['artisanat-tunisien', 'poterie-nabeul', 'decoration-orientale'],
      };
      setupCatalogDbMock([enrichedProduct], 1);

      const verifyRes = await request(app)
        .get('/api/pd/admin/products?ai_tagged=tagged&search=poterie-nabeul')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data[0].interest_tags).toContain('poterie-nabeul');
    });

    it('Scenario 3: Low-Stock Triage & Live Storefront Link Verification', async () => {
      const lowStockProduct = {
        ...mockProductRecord,
        inventory_quantity: 3,
        variants: [{ ...mockProductRecord.variants[0], inventory_quantity: 3 }],
      };
      setupCatalogDbMock([lowStockProduct], 8);

      const res = await request(app)
        .get('/api/pd/admin/products?stock_status=low_stock&sort_by=inventory_quantity&sort_order=asc')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const product = res.body.data[0];
      expect(product.inventory_quantity).toBe(3);
      expect(product.inventory_quantity).toBeLessThanOrEqual(5);

      // Verify data needed for frontend storefront live link
      expect(product.store.subdomain).toBe('atelier-medina');
      expect(product.slug).toBe('ceramique-de-nabeul-fait-main');
    });
  });
});
