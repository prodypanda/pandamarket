import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockTransaction } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: vi.fn().mockResolvedValue({
      reviews_enabled: true,
      review_auto_publish: true,
    }),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { reviewService } from '../services/review.service';
import { PdValidationError } from '../errors';

describe('PLAN-M-16: Verified Customer Review Media Attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates review with attached media URLs', async () => {
    // 1. SELECT product store_id
    mockQuery.mockResolvedValueOnce({
      rows: [{ store_id: 'store_1' }],
    });
    // 2. SELECT verified purchase
    mockQuery.mockResolvedValueOnce({
      rows: [{ '?column?': 1 }],
    });

    const mockClient = {
      query: vi.fn()
        // INSERT review
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rev_123',
              product_id: 'prod_1',
              customer_id: 'cust_1',
              store_id: 'store_1',
              rating: 5,
              status: 'published',
            },
          ],
        })
        // INSERT review media 1
        .mockResolvedValueOnce({ rowCount: 1 })
        // INSERT review media 2
        .mockResolvedValueOnce({ rowCount: 1 })
        // Aggregate rating queries
        .mockResolvedValueOnce({ rows: [{ average_rating: '5.0', review_count: '1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rowCount: 1 }),
    };

    mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

    const result = await reviewService.create({
      product_id: 'prod_1',
      customer_id: 'cust_1',
      rating: 5,
      title: 'Magnifique produit !',
      body: 'Qualité artisanale exceptionnelle',
      media_urls: ['https://cdn.pandamarket.tn/reviews/p1.webp', 'https://cdn.pandamarket.tn/reviews/p2.webp'],
    });

    expect(result.id).toBe('rev_123');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pd_review_media'),
      expect.arrayContaining(['https://cdn.pandamarket.tn/reviews/p1.webp']),
    );
  });

  it('rejects review creation when more than 3 media files are attached', async () => {
    await expect(
      reviewService.create({
        product_id: 'prod_1',
        customer_id: 'cust_1',
        rating: 5,
        media_urls: ['m1.jpg', 'm2.jpg', 'm3.jpg', 'm4.jpg'], // > 3
      }),
    ).rejects.toThrow(PdValidationError);
  });

  it('attaches media to existing review with quota limit enforcement', async () => {
    // 1. SELECT review check
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'rev_123', customer_id: 'cust_1' }],
    });
    // 2. Count media check (currently 1)
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: '1' }],
    });
    // 3. INSERT media
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'revmed_1',
          review_id: 'rev_123',
          media_url: 'https://cdn.pandamarket.tn/reviews/extra.webp',
          status: 'approved',
        },
      ],
    });

    const media = await reviewService.addReviewMedia('rev_123', 'cust_1', 'https://cdn.pandamarket.tn/reviews/extra.webp');
    expect(media.id).toBe('revmed_1');
  });
});
