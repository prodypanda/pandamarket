import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from '../services/product.service';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: vi.fn((cb: any) => cb({ query: mockQuery })),
}));

vi.mock('../db/redis', () => ({
  getRedis: vi.fn(() => null),
  withRedisTimeout: vi.fn(async (_p, fallback) => fallback),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('PLAN-B-07: Bundle cross-sell query jsonb compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries bundles containing product using jsonb_agg to avoid 500 error in DISTINCT', async () => {
    mockQuery.mockResolvedValue({
      rows: [],
      rowCount: 0,
    });
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'bundle_1',
          title: 'Pack Duo',
          slug: 'pack-duo',
          images: [{ id: 'img_1', url: 'https://example.com/pack.jpg' }],
        },
      ],
      rowCount: 1,
    });

    const result = await productService.getBundlesContainingProduct('prod_123');

    expect(mockQuery).toHaveBeenCalledTimes(3);
    const sql = mockQuery.mock.calls[0][0] as string;

    // Verify DISTINCT clause uses jsonb and NOT json (B-07)
    expect(sql).toContain("COALESCE(img.images, '[]'::jsonb) AS images");
    expect(sql).toContain('jsonb_agg');
    expect(sql).toContain('jsonb_build_object');
    expect(sql).not.toContain("'[]'::json)");
    expect(sql).not.toContain('json_agg(');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('bundle_1');
  });
});
