import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductStatus, ProductType, PaymentStatus, PaymentGateway } from '@pandamarket/types';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: vi.fn(async (cb: (c: { query: typeof mockQuery }) => unknown) => cb({ query: mockQuery })),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { orderService } from '../services/order.service';
import { PdConflictError, PdNotFoundError, PdValidationError } from '../errors';

describe('PLAN 04: Seller Order Editing Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addStoreOrderItem', () => {
    it('blocks item additions on already-shipped fulfillments', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: 'shipped' }],
      });

      await expect(
        orderService.addStoreOrderItem({
          orderId: 'ord_1',
          storeId: 'store_1',
          userId: 'usr_1',
          productId: 'prod_1',
          quantity: 1,
        }),
      ).rejects.toThrow(PdConflictError);
    });

    it('blocks item additions on already-captured online payment orders', async () => {
      // 1. fulfillment
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: 'preparing' }],
      });
      // 2. order
      mockQuery.mockResolvedValueOnce({
        rows: [{ payment_status: PaymentStatus.Captured, payment_gateway: PaymentGateway.Flouci }],
      });

      await expect(
        orderService.addStoreOrderItem({
          orderId: 'ord_1',
          storeId: 'store_1',
          userId: 'usr_1',
          productId: 'prod_1',
          quantity: 1,
        }),
      ).rejects.toThrow(PdConflictError);
    });

    it('blocks adding bundle products in v1', async () => {
      // 1. fulfillment
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: 'pending' }],
      });
      // 2. order
      mockQuery.mockResolvedValueOnce({
        rows: [{ payment_status: PaymentStatus.Pending, payment_gateway: PaymentGateway.Cod }],
      });
      // 3. product
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'prod_bundle',
            title: 'Pack Cadeau',
            price: '50.000',
            inventory_quantity: 10,
            status: ProductStatus.Published,
            type: ProductType.Bundle,
          },
        ],
      });

      await expect(
        orderService.addStoreOrderItem({
          orderId: 'ord_1',
          storeId: 'store_1',
          userId: 'usr_1',
          productId: 'prod_bundle',
          quantity: 1,
        }),
      ).rejects.toThrow(PdValidationError);
    });
  });

  describe('updateStoreOrderItemQuantity', () => {
    it('blocks increasing quantity on captured online payment orders', async () => {
      // 1. fulfillment
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: 'preparing' }],
      });
      // 2. order
      mockQuery.mockResolvedValueOnce({
        rows: [{ payment_status: PaymentStatus.Captured, payment_gateway: PaymentGateway.Konnect }],
      });
      // 3. item
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'oi_1',
            product_id: 'p_1',
            variant_id: null,
            quantity: 1,
            unit_price: '25.000',
            product_type: ProductType.Physical,
          },
        ],
      });

      await expect(
        orderService.updateStoreOrderItemQuantity({
          orderId: 'ord_1',
          storeId: 'store_1',
          itemId: 'oi_1',
          newQuantity: 3,
          userId: 'usr_1',
        }),
      ).rejects.toThrow(PdConflictError);
    });
  });

  describe('changeStoreOrderItemVariant', () => {
    it('throws PdNotFoundError if new variant does not exist', async () => {
      // 1. fulfillment
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: 'pending' }],
      });
      // 2. order
      mockQuery.mockResolvedValueOnce({
        rows: [{ payment_status: PaymentStatus.Pending, payment_gateway: PaymentGateway.Cod }],
      });
      // 3. item
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'oi_1',
            product_id: 'p_1',
            variant_id: 'var_old',
            quantity: 1,
            unit_price: '30.000',
            product_type: ProductType.Physical,
          },
        ],
      });
      // 4. new variant (not found)
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        orderService.changeStoreOrderItemVariant({
          orderId: 'ord_1',
          storeId: 'store_1',
          itemId: 'oi_1',
          newVariantId: 'var_invalid',
          userId: 'usr_1',
        }),
      ).rejects.toThrow(PdNotFoundError);
    });
  });
});
