import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted Mocks ─────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getCategorySubtreeIds: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mocks.query,
  transaction: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../services/category.service', () => ({
  categoryService: {
    getCategorySubtreeIds: mocks.getCategorySubtreeIds,
  },
}));

vi.mock('../services/subscription.service', () => ({
  subscriptionService: {},
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {},
}));

import { productService } from '../services/product.service';

describe('ProductService — Catalog Filters & Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds query with price range filters and stock constraint', async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'prod_1',
          title: 'Produit 1',
          price: 50,
          inventory_quantity: 10,
          in_stock: true,
          stock_status: 'in_stock',
        },
      ],
      rowCount: 1,
    });
    mocks.query.mockResolvedValueOnce({
      rows: [{ count: '1' }],
      rowCount: 1,
    });

    const result = await productService.listPublished({
      priceMin: 20,
      priceMax: 100,
      inStockOnly: true,
      sortBy: 'price_asc',
    });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    });

    // Check main query arguments
    const firstCallArgs = mocks.query.mock.calls[0];
    const sql = firstCallArgs[0] as string;
    const params = firstCallArgs[1] as unknown[];

    expect(sql).toContain('p.price >=');
    expect(sql).toContain('p.price <=');
    expect(sql).toContain('p.inventory_quantity > 0');
    expect(sql).toContain('p.price ASC');
    expect(params).toContain(20);
    expect(params).toContain(100);
  });

  it('correctly calculates has_next and has_prev pagination metadata', async () => {
    mocks.query.mockResolvedValueOnce({
      rows: Array.from({ length: 10 }, (_, i) => ({
        id: `prod_${i + 1}`,
        title: `Product ${i + 1}`,
        price: 10,
      })),
      rowCount: 10,
    });
    mocks.query.mockResolvedValueOnce({
      rows: [{ count: '45' }],
      rowCount: 1,
    });

    const result = await productService.listPublished({
      page: 2,
      limit: 10,
    });

    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 45,
      total_pages: 5,
      has_next: true,
      has_prev: true,
    });
  });

  it('applies tag and search query parameters in SQL where clause', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mocks.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

    await productService.listPublished({
      tag: 'electronique',
      q: 'smartphone',
      sortBy: 'popular',
    });

    const sql = mocks.query.mock.calls[0][0] as string;
    const params = mocks.query.mock.calls[0][1] as unknown[];

    expect(sql).toContain('= ANY(p.tags)');
    expect(sql).toContain('p.title ILIKE');
    expect(sql).toContain('p.inventory_quantity DESC');
    expect(params).toContain('electronique');
    expect(params).toContain('%smartphone%');
  });
});
