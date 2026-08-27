import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

const { mockFetchWithCsrf } = vi.hoisted(() => ({
  mockFetchWithCsrf: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: mockFetchWithCsrf,
}));

vi.mock('../lib/marketplace-analytics', () => ({
  trackAddToCart: vi.fn(),
}));

import { CartProvider, useCart } from '../contexts/CartContext';

describe('PLAN-B-11: Centralized Cart & Coupon Calculation Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('updates discount and shipping totals from server response on sync', async () => {
    mockFetchWithCsrf.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          subtotal: 100.0,
          discount_amount: 10.0,
          shipping_total: 8.0,
          combined_shipping_savings: 3.0,
          total: 98.0,
        },
      }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );

    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      result.current.addToCart({
        product_id: 'prod_1',
        title: 'Panda Shoes',
        price: 50.0,
        quantity: 2,
        store_id: 'store_1',
        store_name: 'Store 1',
        image_url: 'https://example.com/item.jpg',
      });
    });

    // Manually trigger sync
    await act(async () => {
      await result.current.syncToServer();
    });

    expect(result.current.discountAmount).toBe(10.0);
    expect(result.current.shippingTotal).toBe(8.0);
    expect(result.current.combinedShippingSavings).toBe(3.0);
  });

  it('applies valid coupon via server validation and sets discount amount', async () => {
    mockFetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          discount_amount: 15.0,
          shipping_total: 7.0,
          combined_shipping_savings: 0,
        },
      }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );

    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      result.current.addToCart({
        product_id: 'prod_1',
        title: 'Panda Jacket',
        price: 100.0,
        quantity: 1,
        store_id: 'store_1',
        store_name: 'Store 1',
        image_url: 'https://example.com/item.jpg',
      });
    });

    let couponResult: any;
    await act(async () => {
      couponResult = await result.current.applyCoupon('SUPER15');
    });

    expect(couponResult.success).toBe(true);
    expect(couponResult.discount).toBe(15.0);
    expect(result.current.couponCode).toBe('SUPER15');
    expect(result.current.discountAmount).toBe(15.0);
  });

  it('rejects invalid coupon and does not apply discount', async () => {
    mockFetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          discount_amount: 0,
          shipping_total: 7.0,
        },
      }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );

    const { result } = renderHook(() => useCart(), { wrapper });

    let couponResult: any;
    await act(async () => {
      couponResult = await result.current.applyCoupon('INVALID_COUPON_XYZ');
    });

    expect(couponResult.success).toBe(false);
    expect(couponResult.message).toContain('invalide');
    expect(result.current.couponCode).toBeNull();
  });
});
