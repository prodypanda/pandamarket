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
      from: 1,
      to: 1,
      has_next: false,
      has_prev: false,
      next_page: null,
      prev_page: null,
    });

    // Check main query arguments
    const firstCallArgs = mocks.query.mock.calls[0];
    const sql = firstCallArgs[0] as string;
    const params = firstCallArgs[1] as unknown[];

    expect(sql).toContain('p.price >=');
    expect(sql).toContain('p.price <=');
    expect(sql).toContain('p.inventory_quantity > 0');
    expect(sql).toContain('p.price ASC, p.created_at DESC, p.id ASC');
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
      from: 11,
      to: 20,
      has_next: true,
      has_prev: true,
      next_page: 3,
      prev_page: 1,
    });
  });

  it('returns exact ranges and navigation for final and empty pages', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: Array.from({ length: 5 }, (_, i) => ({ id: `prod_${i + 41}` })), rowCount: 5 })
      .mockResolvedValueOnce({ rows: [{ count: '45' }], rowCount: 1 });

    const finalPage = await productService.listPublished({ page: 5, limit: 10 });
    expect(finalPage.meta).toMatchObject({
      page: 5,
      from: 41,
      to: 45,
      has_next: false,
      has_prev: true,
      next_page: null,
      prev_page: 4,
    });

    mocks.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

    const emptyPage = await productService.listPublished({ page: 1, limit: 10 });
    expect(emptyPage.meta).toMatchObject({
      page: 1,
      total: 0,
      total_pages: 0,
      from: 0,
      to: 0,
      has_next: false,
      has_prev: false,
      next_page: null,
      prev_page: null,
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

  it('uses the product id as a deterministic tie-breaker for default ordering', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mocks.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

    await productService.listPublished();

    expect(mocks.query.mock.calls[0][0] as string).toContain('p.created_at DESC, p.id ASC');
  });
});
