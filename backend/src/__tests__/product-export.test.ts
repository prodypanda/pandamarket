import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { productService } from '../services/product.service';
import { ProductType, ProductStatus } from '@pandamarket/types';

describe('PLAN-B-29: Server-side Product Filtering & CSV Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by type, categoryId, and status in SQL queries', async () => {
    // 1. storeCounts query
    mockQuery.mockResolvedValueOnce({
      rows: [{ total: '10', published: '8', draft: '2', low_stock: '1' }],
    });
    // 2. data query
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'prod_1',
          store_id: 'store_123',
          title: 'Handmade Pottery Vase',
          type: ProductType.Physical,
          status: ProductStatus.Published,
          price: '45.000',
          inventory_quantity: 12,
        },
      ],
    });
    // 3. count query
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: '1' }],
    });
    // 4. attachVariants - variants query
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });
    // 5. attachVariants - bundle items query
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    const result = await productService.listByStore('store_123', {
      type: ProductType.Physical,
      categoryId: 'cat_ceramics',
      status: ProductStatus.Published,
      search: 'Pottery',
    });

    expect(result.data.length).toBe(1);
    expect(result.meta.total).toBe(1);

    // Verify SQL includes filter parameters
    const dataSql = mockQuery.mock.calls[1][0];
    expect(dataSql).toContain('p.type = $');
    expect(dataSql).toContain('(p.marketplace_category_id = $');
    expect(dataSql).toContain('p.status = $');
    expect(dataSql).toContain('ILIKE $');
  });
});
