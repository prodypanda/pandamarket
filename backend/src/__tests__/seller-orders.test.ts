import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockListByStore, mockGetStoreOrderDetail, mockFulfill } = vi.hoisted(() => ({
  mockListByStore: vi.fn(),
  mockGetStoreOrderDetail: vi.fn(),
  mockFulfill: vi.fn(),
}));

vi.mock('../services/order.service', () => ({
  orderService: {
    listByStore: mockListByStore,
    getStoreOrderDetail: mockGetStoreOrderDetail,
    fulfill: mockFulfill,
  },
}));

vi.mock('../db/pool', () => ({
  query: vi.fn().mockResolvedValue({ rows: [{ id: 'store_test_1' }] }),
}));

vi.mock('../services/seller-broadcast.service', () => ({
  sellerBroadcastService: {},
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('PLAN-M-08: Dedicated Seller Order Management & Fulfillment Pipeline API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists paginated seller orders with filters', async () => {
    mockListByStore.mockResolvedValueOnce({
      data: [
        {
          id: 'ord_1',
          total: 85.5,
          status: 'pending',
          created_at: '2026-08-20T10:00:00.000Z',
          items: [{ title: 'Artisan Vase', quantity: 2, unit_price: 40 }],
        },
      ],
      meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
    });

    const res = await mockListByStore('store_test_1', {
      page: 1,
      limit: 20,
      status: 'pending',
      dateFrom: '2026-08-01',
    });

    expect(res.data.length).toBe(1);
    expect(res.data[0].id).toBe('ord_1');
    expect(res.meta.total).toBe(1);
  });

  it('retrieves detailed seller order items and customer delivery info', async () => {
    mockGetStoreOrderDetail.mockResolvedValueOnce({
      id: 'ord_1',
      store_id: 'store_test_1',
      customer_name: 'Ahmed Ben Salah',
      shipping_address: { city: 'Tunis', postal_code: '1001' },
      items: [{ title: 'Artisan Vase', quantity: 2 }],
      fulfillment_status: 'pending',
    });

    const order = await mockGetStoreOrderDetail('ord_1', 'store_test_1');
    expect(order.id).toBe('ord_1');
    expect(order.customer_name).toBe('Ahmed Ben Salah');
  });

  it('fulfills seller order with carrier and tracking information', async () => {
    mockFulfill.mockResolvedValueOnce(undefined);

    await mockFulfill({
      order_id: 'ord_1',
      store_id: 'store_test_1',
      tracking_number: 'TRK_ARAMEX_889900',
      carrier: 'Aramex Tunisia',
    });

    expect(mockFulfill).toHaveBeenCalledWith({
      order_id: 'ord_1',
      store_id: 'store_test_1',
      tracking_number: 'TRK_ARAMEX_889900',
      carrier: 'Aramex Tunisia',
    });
  });
});
