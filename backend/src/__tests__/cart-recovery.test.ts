import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockTransaction, mockEmailQueueAdd } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockTransaction: vi.fn(),
  mockEmailQueueAdd: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

vi.mock('../queues/email-queue', () => ({
  emailQueue: {
    add: mockEmailQueueAdd,
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

import { cartRecoveryService } from '../services/cart-recovery.service';

describe('PLAN-M-18: Automated Abandoned Cart Recovery Sequences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches Step 1 (2h reminder) for abandoned carts', async () => {
    // 1. SELECT step 1 carts
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'cart_123',
          customer_email: 'buyer@example.com',
          customer_phone: '+21620123456',
          user_id: 'usr_1',
          items: [{ product_id: 'p1', quantity: 1 }],
          updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        },
      ],
    });

    // 2. SELECT step 2 carts (none)
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const mockClient = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
    };
    mockTransaction.mockImplementation(async (cb) => cb(mockClient));

    const result = await cartRecoveryService.detectAndDispatchRecovery();
    expect(result.step1Dispatched).toBe(1);
    expect(result.step2Dispatched).toBe(0);

    // Verify email was enqueued with cart restoration link
    expect(mockEmailQueueAdd).toHaveBeenCalledWith(
      'abandoned_cart_reminder_step1',
      expect.objectContaining({
        to: 'buyer@example.com',
        template: 'abandoned_cart_reminder',
        variables: expect.objectContaining({
          cart_id: 'cart_123',
          restore_url: expect.stringContaining('/cart?restore=cart_123'),
        }),
      }),
    );
  });

  it('dispatches Step 2 (24h incentive discount) for persistent abandoned carts', async () => {
    // 1. SELECT step 1 carts (none)
    mockQuery.mockResolvedValueOnce({ rows: [] });

    // 2. SELECT step 2 carts
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'cart_456',
          customer_email: 'buyer2@example.com',
          customer_phone: '+21620123456',
          user_id: 'usr_2',
          items: [{ product_id: 'p2', quantity: 2 }],
          updated_at: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago
        },
      ],
    });

    const mockClient = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
    };
    mockTransaction.mockImplementation(async (cb) => cb(mockClient));

    const result = await cartRecoveryService.detectAndDispatchRecovery();
    expect(result.step1Dispatched).toBe(0);
    expect(result.step2Dispatched).toBe(1);

    // Verify discount coupon email was enqueued
    expect(mockEmailQueueAdd).toHaveBeenCalledWith(
      'abandoned_cart_reminder_step2',
      expect.objectContaining({
        to: 'buyer2@example.com',
        template: 'abandoned_cart_discount',
        variables: expect.objectContaining({
          coupon_code: 'REVIENS5',
          discount_percent: '5%',
        }),
      }),
    );
  });
});
