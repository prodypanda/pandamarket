import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildStorefrontProductUrl,
  fetchAllPublicProducts,
  fetchStorefrontProducts,
  PUBLIC_PRODUCT_PAGE_SIZE,
  STOREFRONT_MERCHANDISING_LIMIT,
} from './public-products';

describe('public product request helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps storefront scope and merchandising limit authoritative', () => {
    const url = new URL(buildStorefrontProductUrl('https://api.example.test', 'store_server', {
      store_id: 'store_attacker',
      limit: '1000',
      page: ['3', '4'],
      category: 'electronics',
      price_min: '10',
      in_stock: '1',
      sort: 'price_desc',
      q: 'phone',
      unknown: 'ignored',
    }));

    expect(url.searchParams.get('store_id')).toBe('store_server');
    expect(url.searchParams.get('limit')).toBe(String(STOREFRONT_MERCHANDISING_LIMIT));
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('category')).toBe('electronics');
    expect(url.searchParams.get('price_min')).toBe('10');
    expect(url.searchParams.get('in_stock')).toBe('1');
    expect(url.searchParams.get('sort')).toBe('price_desc');
    expect(url.searchParams.get('q')).toBe('phone');
    expect(url.searchParams.has('unknown')).toBe(false);
  });

  it('falls back to deterministic newest ordering for unsupported random sorting', () => {
    const url = new URL(buildStorefrontProductUrl('https://api.example.test', 'store_1', {
      sort: 'random',
    }));

    expect(url.searchParams.get('sort')).toBe('newest');
  });

  it('fetches the intentional storefront window and preserves response metadata', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'product_1' }], meta: { page: 1, limit: 24, total: 25 } }),
    } as Response);

    const result = await fetchStorefrontProducts<{ id: string }>('https://api.example.test', 'store_1', {
      q: 'phone',
    });

    expect(result).toEqual({
      data: [{ id: 'product_1' }],
      meta: { page: 1, limit: 24, total: 25 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`limit=${STOREFRONT_MERCHANDISING_LIMIT}`),
      {},
    );
  });

  it('walks every backend page for sitemap-sized product collections', async () => {
    const fetchMock = vi.mocked(fetch);
    const makeProducts = (start: number, count: number) =>
      Array.from({ length: count }, (_, index) => ({ id: `product_${start + index}` }));

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: makeProducts(1, PUBLIC_PRODUCT_PAGE_SIZE),
          meta: { page: 1, limit: 100, total: 205, total_pages: 3, has_next: true },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: makeProducts(101, PUBLIC_PRODUCT_PAGE_SIZE),
          meta: { page: 2, limit: 100, total: 205, total_pages: 3, has_next: true },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: makeProducts(201, 5),
          meta: { page: 3, limit: 100, total: 205, total_pages: 3, has_next: false },
        }),
      } as Response);

    const products = await fetchAllPublicProducts<{ id: string }>('https://api.example.test', {
      storeId: 'store_1',
    });

    expect(products).toHaveLength(205);
    expect(products[0]?.id).toBe('product_1');
    expect(products.at(-1)?.id).toBe('product_205');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining('page=1'),
      expect.stringContaining('page=2'),
      expect.stringContaining('page=3'),
    ]);
    for (const [url] of fetchMock.mock.calls) {
      expect(String(url)).toContain(`limit=${PUBLIC_PRODUCT_PAGE_SIZE}`);
      expect(String(url)).toContain('store_id=store_1');
    }
  });
});
