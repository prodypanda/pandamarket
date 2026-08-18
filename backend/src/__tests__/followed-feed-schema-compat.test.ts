import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, getBuyerSubscriptionsMock, getRecommendationsMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getBuyerSubscriptionsMock: vi.fn(),
  getRecommendationsMock: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: queryMock,
  transaction: vi.fn(),
}));

vi.mock('../middlewares', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'buyer-1', role: 'customer', store_id: null };
    next();
  },
  optionalAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'buyer-1', role: 'customer', store_id: null };
    next();
  },
  asyncHandler: (handler: any) => (req: any, res: any, next: any) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  },
}));

vi.mock('../services/store-subscription.service', () => ({
  storeSubscriptionService: {
    getBuyerSubscriptions: getBuyerSubscriptionsMock,
  },
}));

vi.mock('../services/buyer-interest.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/buyer-interest.service')>();
  return {
    ...actual,
    buyerInterestService: {
      getRecommendations: getRecommendationsMock,
    },
  };
});

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getPublicSettings: vi.fn(),
    getSettings: vi.fn(),
  },
}));

vi.mock('../middlewares/maintenance.middleware', () => ({
  getRequestIp: vi.fn(() => '127.0.0.1'),
  isMaintenanceAllowedIp: vi.fn(() => true),
}));

import buyerRouter from '../api/buyer.route';
import marketplaceRouter from '../api/marketplace.route';
import { BuyerInterestService } from '../services/buyer-interest.service';

describe('followed feed production schema compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads followed-store timeline data using production product and image columns', async () => {
    getBuyerSubscriptionsMock.mockResolvedValue({
      subscriptions: [
        {
          subscription_id: 'sub-1',
          store_id: 'store-1',
          store_name: 'Store One',
          store_subdomain: 'store-one',
          store_logo_url: '',
          notify_price_drops: true,
          notify_new_products: true,
          is_verified_buyer: true,
          unread_updates_count: 1,
          latest_products: [],
          subscribed_at: new Date('2026-08-16T00:00:00.000Z'),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    });
    queryMock.mockResolvedValue({
      rows: [
        {
          id: 'product-1',
          store_id: 'store-1',
          store_name: 'Store One',
          title: 'Product One',
          price: '42.000',
          compare_at_price: null,
          interest_tags: ['artisanat'],
          created_at: new Date(),
          updated_at: new Date(),
          image_url: '/pd-product-images/product-1.jpg',
        },
      ],
    });

    const app = express();
    app.use('/api/pd/buyer', buyerRouter);

    const response = await request(app).get('/api/pd/buyer/subscriptions');

    expect(response.status).toBe(200);
    expect(response.body.followed_stores[0].subdomain).toBe('store-one');
    expect(response.body.timeline_products[0].image_url).toBe('/pd-product-images/product-1.jpg');

    const sql = queryMock.mock.calls.map((c: any) => String(c[0])).join('\n');
    expect(sql).toContain('p.compare_at_price');
    expect(sql).toContain('SELECT url FROM pd_product_image');
    expect(sql).not.toContain('SELECT image_url FROM pd_product_image');
  });

  it('passes the authenticated buyer into interest recommendations', async () => {
    getRecommendationsMock.mockResolvedValue({
      recommended_products: [],
      similar_stores: [],
    });

    const app = express();
    app.use('/api/pd/marketplace', marketplaceRouter);

    const response = await request(app).get('/api/pd/marketplace/recommendations/buyer-interests');

    expect(response.status).toBe(200);
    expect(getRecommendationsMock).toHaveBeenCalledWith('buyer-1', false);
  });

  it('queries recommendations with pd_store.subdomain and pd_product_image.url', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'product-1',
            store_id: 'store-1',
            store_name: 'Store One',
            store_subdomain: 'store-one',
            title: 'Product One',
            slug: 'product-one',
            price: '42.000',
            compare_at_price: null,
            interest_tags: ['artisanat'],
            created_at: new Date(),
            category: 'Artisanat',
            marketplace_category_slug: 'artisanat',
            thumbnail: '/pd-product-images/product-1.jpg',
            image_url: '/pd-product-images/product-1.jpg',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'store-1',
            name: 'Store One',
            subdomain: 'store-one',
            subscribers_count: 3,
          },
        ],
      });

    const service = new BuyerInterestService();
    const result = await service.getRecommendations('buyer-1');

    expect(result.recommended_products[0].store_subdomain).toBe('store-one');
    expect(result.similar_stores[0].subdomain).toBe('store-one');

    const productSql = String(queryMock.mock.calls[1][0]);
    const storeSql = String(queryMock.mock.calls[2][0]);
    expect(productSql).toContain('s.subdomain AS store_subdomain');
    expect(productSql).toContain('p.compare_at_price');
    expect(productSql).toContain('SELECT url FROM pd_product_image');
    expect(productSql).not.toContain('s.slug');
    expect(storeSql).toContain('s.subdomain');
    expect(storeSql).not.toContain('s.slug');
  });
});
