import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  listPublished: vi.fn(),
}));

vi.mock('../services/product.service', () => ({
  productService: {
    listPublished: mocks.listPublished,
    searchPublished: vi.fn(),
  },
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: vi.fn().mockResolvedValue({ catalog_default_sort: 'newest' }),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import searchRouter from '../api/search.route';
import express from 'express';
import request from 'supertest';

const app = express();
app.use(express.json());
app.use('/api/v1/search', searchRouter);

describe('Storefront Search API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for storefront search if store_id is missing', async () => {
    const res = await request(app).get('/api/v1/search/storefront');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'store_id parameter is required' });
  });

  it('calls productService.listPublished with store_id and search parameters', async () => {
    mocks.listPublished.mockResolvedValueOnce({
      products: [
        { id: 'prod_1', title: 'Panda Mug', price: 15 },
      ],
      total: 1,
      page: 1,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    });

    const res = await request(app)
      .get('/api/v1/search/storefront')
      .query({ store_id: 'str_123', q: 'Panda', page: '1', limit: '10' });

    expect(res.status).toBe(200);
    expect(mocks.listPublished).toHaveBeenCalledWith({
      storeId: 'str_123',
      q: 'Panda',
      page: 1,
      limit: 10,
      category: undefined,
      priceMin: undefined,
      priceMax: undefined,
      productType: undefined,
      sortBy: 'newest',
    });
    expect(res.body.products).toHaveLength(1);
  });

  it('returns autocomplete suggestions for storefront suggest endpoint', async () => {
    mocks.listPublished.mockResolvedValueOnce({
      products: [
        { id: 'prod_1', title: 'Panda T-Shirt', slug: 'panda-tshirt', category: 'clothing', price: 25, thumbnail: 'https://img.com/1.png' },
      ],
    });

    const res = await request(app)
      .get('/api/v1/search/storefront/suggest')
      .query({ store_id: 'str_123', q: 'Pan' });

    expect(res.status).toBe(200);
    expect(res.body.suggestions).toEqual([
      {
        id: 'prod_1',
        title: 'Panda T-Shirt',
        slug: 'panda-tshirt',
        category: 'clothing',
        price: 25,
        thumbnail: 'https://img.com/1.png',
      },
    ]);
  });

  it('returns empty suggestions array if search term is shorter than 2 characters', async () => {
    const res = await request(app)
      .get('/api/v1/search/storefront/suggest')
      .query({ store_id: 'str_123', q: 'P' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ suggestions: [] });
    expect(mocks.listPublished).not.toHaveBeenCalled();
  });
});
