import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductType, ProductStatus } from '@pandamarket/types';
import { ProductService } from '../services/product.service.js';
import { PdValidationError } from '../errors/index.js';
import { notificationBatchService } from '../services/notification-batch.service.js';

// Mock dependencies
const mockQuery = vi.fn();
vi.mock('../db/pool.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  transaction: vi.fn(async (cb) => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [{ id: 'prod_test_123' }], rowCount: 1 }),
    };
    return cb(mockClient);
  }),
}));

vi.mock('../services/subscription.service.js', () => ({
  subscriptionService: {
    assertCanCreateProduct: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/marketplace-analytics-event.service.js', () => ({
  marketplaceAnalyticsEventService: {
    insertMarketplaceEvent: vi.fn(),
  },
}));

vi.mock('../services/notification-batch.service.js', () => ({
  notificationBatchService: {
    ingestEvent: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/ai-product-tagger.service.js', () => ({
  aiProductTaggerService: {
    queueProductTagging: vi.fn().mockResolvedValue(true),
  },
}));

describe('ProductService - Discount and Compare-At Price', () => {
  let service: ProductService;

  beforeEach(() => {
    service = new ProductService();
    vi.clearAllMocks();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('Validation on Create', () => {
    it('rejects product creation when compare_at_price <= price', async () => {
      await expect(
        service.create({
          store_id: 'str_1',
          type: ProductType.Physical,
          title: 'Test Discount Product',
          price: 50,
          compare_at_price: 40,
        }),
      ).rejects.toThrow(PdValidationError);
    });

    it('rejects product creation when compare_at_price == price', async () => {
      await expect(
        service.create({
          store_id: 'str_1',
          type: ProductType.Physical,
          title: 'Test Equal Price',
          price: 50,
          compare_at_price: 50,
        }),
      ).rejects.toThrow(PdValidationError);
    });

    it('rejects variant creation when variant compare_at_price <= variant price', async () => {
      await expect(
        service.create({
          store_id: 'str_1',
          type: ProductType.Physical,
          title: 'Test Variant Product',
          price: 50,
          variants: [
            {
              title: 'Size M',
              price: 60,
              compare_at_price: 55,
              inventory_quantity: 10,
            },
          ],
        }),
      ).rejects.toThrow(PdValidationError);
    });

    it('accepts product creation when compare_at_price > price', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'prod_test_123',
              store_id: 'str_1',
              type: ProductType.Physical,
              status: ProductStatus.Published,
              title: 'Great Discount Product',
              price: '39.900',
              compare_at_price: '59.900',
              inventory_quantity: 10,
              tags: [],
              attributes: [],
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        });

      const result = await service.create({
        store_id: 'str_1',
        type: ProductType.Physical,
        title: 'Great Discount Product',
        price: 39.9,
        compare_at_price: 59.9,
        store_is_verified: true,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('prod_test_123');
    });
  });

  describe('Validation & Price-drop on Update', () => {
    it('rejects product update when compare_at_price <= current price', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'prod_test_123',
            store_id: 'str_1',
            price: '50.000',
            compare_at_price: null,
            status: ProductStatus.Published,
            title: 'Existing Product',
          },
        ],
        rowCount: 1,
      });

      await expect(
        service.update('prod_test_123', {
          compare_at_price: 45,
        }),
      ).rejects.toThrow(PdValidationError);
    });

    it('triggers price_drop notification when compare_at_price is introduced with price drop', async () => {
      const oldProd = {
        id: 'prod_test_123',
        store_id: 'str_1',
        price: '50.000',
        compare_at_price: null,
        status: ProductStatus.Published,
        title: 'Existing Product',
        store_name: 'Super Shop',
      };
      const updatedProd = {
        ...oldProd,
        price: '35.000',
        compare_at_price: '50.000',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [oldProd], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedProd], rowCount: 1 });

      await service.update('prod_test_123', {
        price: 35,
        compare_at_price: 50,
      });

      expect(notificationBatchService.ingestEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'price_drop',
          productId: 'prod_test_123',
          price: 35,
          oldPrice: 50,
        }),
      );
    });
  });

  describe('Batch Operations - apply_discount and clear_discount', () => {
    it('successfully applies percentage discount in batch', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { id: 'prod_1', price: '100.000', inventory_quantity: 5 },
            { id: 'prod_2', price: '200.000', inventory_quantity: 8 },
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 'prod_1', price: '100.000', compare_at_price: null },
            { id: 'prod_2', price: '200.000', compare_at_price: null },
          ],
          rowCount: 2,
        });

      const res = await service.batchUpdate('str_1', {
        product_ids: ['prod_1', 'prod_2'],
        action: {
          type: 'apply_discount',
          mode: 'percent',
          value: 20,
        },
      });

      expect(res.affected_count).toBe(2);
      expect(res.message).toContain('Remise');
    });

    it('successfully clears discounts in batch', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'prod_1', price: '80.000', inventory_quantity: 5 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        });

      const res = await service.batchUpdate('str_1', {
        product_ids: ['prod_1'],
        action: {
          type: 'clear_discount',
        },
      });

      expect(res.affected_count).toBe(1);
      expect(res.message).toContain('supprimées');
    });
  });
});
