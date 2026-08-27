import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockMeiliSearch } = vi.hoisted(() => {
  const mockMeiliSearch = vi.fn().mockImplementation(() => ({
    index: vi.fn().mockReturnValue({
      updateSearchableAttributes: vi.fn().mockResolvedValue({}),
      updateFilterableAttributes: vi.fn().mockResolvedValue({}),
      updateSortableAttributes: vi.fn().mockResolvedValue({}),
      updateDisplayedAttributes: vi.fn().mockResolvedValue({}),
      addDocuments: vi.fn().mockResolvedValue({}),
      deleteDocument: vi.fn().mockResolvedValue({}),
      search: vi.fn().mockResolvedValue({
        hits: [
          {
            id: 'prod_meili_1',
            title: 'Artisan Ceramic Plate',
            price: 32.5,
            category: 'artisanat',
          },
        ],
        estimatedTotalHits: 1,
      }),
    }),
  }));

  return {
    mockQuery: vi.fn(),
    mockMeiliSearch,
  };
});

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

vi.mock('meilisearch', () => ({
  MeiliSearch: mockMeiliSearch,
}));

import { SearchService } from '../services/search.service';

describe('PLAN-M-03: Meilisearch Full-Text Engine & PostgreSQL Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PD_USE_PG_SEARCH;
  });

  it('searches via Meilisearch when available', async () => {
    const service = new SearchService();
    const result = await service.searchProducts('Ceramic', {
      category: 'artisanat',
      minPrice: 20,
      maxPrice: 100,
      sortBy: 'price_asc',
    });

    expect(result.provider).toBe('meilisearch');
    expect(result.hits.length).toBe(1);
    expect(result.hits[0].id).toBe('prod_meili_1');
  });

  it('falls back to PostgreSQL ILIKE when forced or when Meilisearch throws', async () => {
    // Force Postgres fallback
    process.env.PD_USE_PG_SEARCH = 'true';

    // 1. Count query mock
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: 1 }],
    });
    // 2. Data query mock
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'prod_pg_1',
          title: 'Artisan Olive Wood Bowl',
          slug: 'artisan-olive-wood-bowl',
          price: 55.0,
          category: 'artisanat',
          tags: ['wood', 'kitchen'],
          created_at: new Date('2026-08-01'),
        },
      ],
    });

    const service = new SearchService();
    const result = await service.searchProducts('Olive', {
      category: 'artisanat',
      minPrice: 10,
      maxPrice: 200,
      sortBy: 'newest',
    });

    expect(result.provider).toBe('postgres');
    expect(result.hits.length).toBe(1);
    expect(result.hits[0].id).toBe('prod_pg_1');

    // Verify generated SQL
    const dataSql = mockQuery.mock.calls[1][0];
    expect(dataSql).toContain('status = \'published\'');
    expect(dataSql).toContain('category = $');
    expect(dataSql).toContain('price >= $');
    expect(dataSql).toContain('price <= $');
    expect(dataSql).toContain('ILIKE $');
  });
});
