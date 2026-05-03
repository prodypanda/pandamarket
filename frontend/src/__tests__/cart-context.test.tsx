import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart, CartItem } from '../contexts/CartContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

const sampleItem: Omit<CartItem, 'id'> = {
  product_id: 'prod_001',
  title: 'Test Product',
  price: 85.0,
  quantity: 1,
  store_id: 'store_001',
  store_name: 'Test Store',
  image_url: null,
};

const sampleItem2: Omit<CartItem, 'id'> = {
  product_id: 'prod_002',
  title: 'Another Product',
  price: 45.5,
  quantity: 2,
  store_id: 'store_002',
  store_name: 'Another Store',
  image_url: null,
};

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.getItemCount()).toBe(0);
    expect(result.current.getCartTotal()).toBe(0);
  });

  it('adds an item to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(sampleItem); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe('Test Product');
    expect(result.current.items[0].price).toBe(85.0);
    expect(result.current.getItemCount()).toBe(1);
  });

  it('increments quantity when adding the same product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(sampleItem); });
    act(() => { result.current.addToCart(sampleItem); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.getItemCount()).toBe(2);
  });

  it('calculates cart total correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(sampleItem); });
    act(() => { result.current.addToCart(sampleItem2); });
    // 85 * 1 + 45.5 * 2 = 176
    expect(result.current.getCartTotal()).toBe(176);
  });

  it('removes an item from the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(sampleItem); });
    act(() => { result.current.addToCart(sampleItem2); });
    expect(result.current.items).toHaveLength(2);
    act(() => { result.current.removeFromCart('prod_001'); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe('Another Product');
  });

  it('updates item quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(sampleItem); });
    act(() => { result.current.updateQuantity('prod_001', 5); });
    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.getCartTotal()).toBe(425);
  });

  it('removes item when quantity set to 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(sampleItem); });
    act(() => { result.current.updateQuantity('prod_001', 0); });
    expect(result.current.items).toHaveLength(0);
  });

  it('clears the entire cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(sampleItem); });
    act(() => { result.current.addToCart(sampleItem2); });
    expect(result.current.items).toHaveLength(2);
    act(() => { result.current.clearCart(); });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.getCartTotal()).toBe(0);
  });

  it('groups items by store', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(sampleItem); });
    act(() => { result.current.addToCart(sampleItem2); });
    const grouped = result.current.getItemsByStore();
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['store_001'].store_name).toBe('Test Store');
    expect(grouped['store_001'].items).toHaveLength(1);
    expect(grouped['store_002'].store_name).toBe('Another Store');
    expect(grouped['store_002'].items).toHaveLength(1);
  });

  it('handles variant-based cart item IDs', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart({ ...sampleItem, variant: 'L' }); });
    act(() => { result.current.addToCart({ ...sampleItem, variant: 'XL' }); });
    // Same product, different variants = 2 separate items
    expect(result.current.items).toHaveLength(2);
  });

  it('throws when useCart is used outside CartProvider', () => {
    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart must be used within a CartProvider');
  });
});
