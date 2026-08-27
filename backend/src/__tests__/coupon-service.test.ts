import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockTransaction } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { couponService } from '../services/coupon.service';
import { PdValidationError } from '../errors';

describe('PLAN-M-04: Real Dynamic Coupon Engine (pd_coupon)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a valid percentage coupon and validates discount limits', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'cpn_123',
          store_id: 'store_1',
          code: 'SPRING20',
          discount_type: 'percentage',
          discount_value: 20,
          min_order_amount: 50,
          max_discount_amount: 30,
          usage_limit: 100,
          usage_count: 0,
          is_active: true,
        },
      ],
    });

    const coupon = await couponService.createCoupon({
      storeId: 'store_1',
      code: 'SPRING20',
      discountType: 'percentage',
      discountValue: 20,
      minOrderAmount: 50,
      maxDiscountAmount: 30,
      usageLimit: 100,
    });

    expect(coupon.code).toBe('SPRING20');
    expect(coupon.discount_value).toBe(20);

    // Reject percentage > 100
    await expect(
      couponService.createCoupon({
        code: 'INVALID150',
        discountType: 'percentage',
        discountValue: 150,
      }),
    ).rejects.toThrow(PdValidationError);
  });

  it('validates a percentage coupon correctly against subtotal and capped maximum discount', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'cpn_123',
          store_id: null, // platform-wide
          code: 'PROMO20',
          discount_type: 'percentage',
          discount_value: 20,
          min_order_amount: 50,
          max_discount_amount: 25,
          usage_limit: 50,
          usage_count: 5,
          starts_at: new Date('2026-01-01'),
          expires_at: new Date('2026-12-31'),
          is_active: true,
        },
      ],
    });

    const res = await couponService.validateCoupon('PROMO20', {
      subtotal: 200, // 20% of 200 = 40, but capped at 25
      shippingTotal: 7,
    });

    expect(res.valid).toBe(true);
    expect(res.discountAmount).toBe(25);
    expect(res.discountType).toBe('percentage');
  });

  it('rejects coupon when minimum subtotal requirement is not met', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'cpn_123',
          code: 'MIN80',
          discount_type: 'fixed_amount',
          discount_value: 10,
          min_order_amount: 80,
          usage_count: 0,
          is_active: true,
        },
      ],
    });

    const res = await couponService.validateCoupon('MIN80', {
      subtotal: 50, // < 80
    });

    expect(res.valid).toBe(false);
    expect(res.errorMessage).toContain('Montant minimum requis');
  });

  it('rejects coupon when usage limit is reached', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'cpn_123',
          code: 'LIMITED5',
          discount_type: 'fixed_amount',
          discount_value: 5,
          usage_limit: 10,
          usage_count: 10, // Full
          is_active: true,
        },
      ],
    });

    const res = await couponService.validateCoupon('LIMITED5', {
      subtotal: 100,
    });

    expect(res.valid).toBe(false);
    expect(res.errorMessage).toContain("Limite d'utilisation du code atteinte");
  });

  it('records redemption and increments usage count in transaction', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
    };
    mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

    await couponService.recordRedemption('cpn_123', 'order_456', 'usr_789', 15.5);

    expect(mockClient.query).toHaveBeenCalledTimes(2);
    expect(mockClient.query.mock.calls[0][0]).toContain('INSERT INTO pd_coupon_redemption');
    expect(mockClient.query.mock.calls[1][0]).toContain('UPDATE pd_coupon SET usage_count = usage_count + 1');
  });
});
