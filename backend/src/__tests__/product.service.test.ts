import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'pd_product_new'),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/subscription.service', () => ({
  subscriptionService: {
    getLimits: vi.fn(),
  },
}));

import { query } from '../db/pool';
import { ProductService } from '../services/product.service';

const mockQuery = vi.mocked(query);

describe('ProductService public storefront visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires stores to be published and verified when loading a public product slug', async () => {
    const productService = new ProductService();

    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await expect(productService.getPublishedByStoreSlug('pd_store_1', 'sample-product')).rejects.toThrow('Product not found');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("s.status = 'verified' AND COALESCE(s.is_verified, false) = true"),
      expect.any(Array),
    );
  });

  it('requires stores to be published and verified when listing public products', async () => {
    const productService = new ProductService();

    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never);

    await productService.listPublished({ limit: 10 });

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("s.status = 'verified' AND COALESCE(s.is_verified, false) = true"),
      expect.any(Array),
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("s.status = 'verified' AND COALESCE(s.is_verified, false) = true"),
      expect.any(Array),
    );
  });

  it('requires stores to be published and verified when searching public products', async () => {
    const productService = new ProductService();

    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never);

    await productService.searchPublished({ query: 'panda', limit: 10 });

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("s.status = 'verified' AND COALESCE(s.is_verified, false) = true"),
      expect.any(Array),
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("s.status = 'verified' AND COALESCE(s.is_verified, false) = true"),
      expect.any(Array),
    );
  });
});
