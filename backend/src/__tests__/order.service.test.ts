import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentGateway, ProductStatus, ProductType, SellerType, StoreStatus } from '@pandamarket/types';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  clientQuery: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mocks.query,
  transaction: mocks.transaction,
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'pd_order_new'),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    hubDomain: 'http://localhost:3000',
  },
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: mocks.getSettings,
  },
}));

vi.mock('../services/shipping.service', () => ({
  shippingService: {
    getConfiguredZones: vi.fn(),
  },
}));

describe('OrderService storefront checkout visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) => callback({ query: mocks.clientQuery }));
  });

  it('rejects checkout when the product store is not publicly verified', async () => {
    const { OrderService } = await import('../services/order.service');
    const orderService = new OrderService();

    mocks.clientQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'pd_product_1',
          store_id: 'pd_store_1',
          title: 'Hidden Product',
          price: '10.000',
          inventory_quantity: 10,
          status: ProductStatus.Published,
          type: ProductType.Physical,
          metadata: {},
          seller_type: SellerType.Retailer,
          store_status: StoreStatus.Maintenance,
          store_is_verified: true,
        },
      ],
      rowCount: 1,
    });

    await expect(orderService.checkout({
      store_id: 'pd_store_1',
      items: [{ product_id: 'pd_product_1', quantity: 1 }],
      payment_gateway: PaymentGateway.Cod,
    })).rejects.toThrow('Product is not available');

    expect(mocks.clientQuery).toHaveBeenCalledWith(
      expect.stringContaining('s.status AS store_status'),
      ['pd_product_1'],
    );
    expect(mocks.clientQuery).toHaveBeenCalledTimes(1);
  });
});
