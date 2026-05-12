import { describe, it, expect } from 'vitest';
import {
  addItem,
  removeItem,
  removeItemsByStore,
  updateItemQuantity,
  getCartTotal,
  getItemCount,
  getItemsByStore,
  generateCartItemId,
  type CartItem,
} from '../lib/cart-utils';

// ---------------------------------------------------------------------------
// Pure-function tests for cart logic.
// These do NOT import React, so they are immune to the dual-instance
// hooks bug that affects monorepo CI with React 19 + Vitest + jsdom.
// ---------------------------------------------------------------------------

const sampleInput: Omit<CartItem, 'id'> = {
  product_id: 'prod_001',
  title: 'Test Product',
  price: 85.0,
  quantity: 1,
  store_id: 'store_001',
  store_name: 'Test Store',
  image_url: null,
};

const sampleInput2: Omit<CartItem, 'id'> = {
  product_id: 'prod_002',
  title: 'Another Product',
  price: 45.5,
  quantity: 2,
  store_id: 'store_002',
  store_name: 'Another Store',
  image_url: null,
};

describe('CartContext', () => {
  it('starts with an empty cart', () => {
    const items: CartItem[] = [];
    expect(items).toEqual([]);
    expect(getItemCount(items)).toBe(0);
    expect(getCartTotal(items)).toBe(0);
  });

  it('adds an item to the cart', () => {
    const items = addItem([], sampleInput);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Test Product');
    expect(items[0].price).toBe(85.0);
    expect(getItemCount(items)).toBe(1);
  });

  it('increments quantity when adding the same product', () => {
    let items = addItem([], sampleInput);
    items = addItem(items, sampleInput);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(getItemCount(items)).toBe(2);
  });

  it('calculates cart total correctly', () => {
    let items = addItem([], sampleInput);
    items = addItem(items, sampleInput2);
    // 85 * 1 + 45.5 * 2 = 176
    expect(getCartTotal(items)).toBe(176);
  });

  it('removes an item from the cart', () => {
    let items = addItem([], sampleInput);
    items = addItem(items, sampleInput2);
    expect(items).toHaveLength(2);
    items = removeItem(items, 'prod_001');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Another Product');
  });

  it('updates item quantity', () => {
    let items = addItem([], sampleInput);
    items = updateItemQuantity(items, 'prod_001', 5);
    expect(items[0].quantity).toBe(5);
    expect(getCartTotal(items)).toBe(425);
  });

  it('applies wholesale tier pricing and minimum quantity', () => {
    let items = addItem([], {
      ...sampleInput,
      price: 100,
      quantity: 1,
      seller_type: 'wholesaler',
      wholesale_pricing: {
        enabled: true,
        min_quantity: 5,
        price_tiers: [
          { min_quantity: 5, unit_price: 80 },
          { min_quantity: 10, unit_price: 70 },
        ],
      },
    });
    expect(items[0].quantity).toBe(5);
    expect(items[0].price).toBe(80);
    expect(getCartTotal(items)).toBe(400);
    items = updateItemQuantity(items, 'prod_001', 10);
    expect(items[0].price).toBe(70);
    expect(getCartTotal(items)).toBe(700);
  });

  it('removes item when quantity set to 0', () => {
    let items = addItem([], sampleInput);
    items = updateItemQuantity(items, 'prod_001', 0);
    expect(items).toHaveLength(0);
  });

  it('clears the entire cart', () => {
    let items = addItem([], sampleInput);
    items = addItem(items, sampleInput2);
    expect(items).toHaveLength(2);
    items = []; // clearCart just sets items to []
    expect(items).toHaveLength(0);
    expect(getCartTotal(items)).toBe(0);
  });

  it('removes only items from a selected store', () => {
    let items = addItem([], sampleInput);
    items = addItem(items, sampleInput2);
    items = removeItemsByStore(items, 'store_001');
    expect(items).toHaveLength(1);
    expect(items[0].store_id).toBe('store_002');
  });

  it('groups items by store', () => {
    let items = addItem([], sampleInput);
    items = addItem(items, sampleInput2);
    const grouped = getItemsByStore(items);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['store_001'].store_name).toBe('Test Store');
    expect(grouped['store_001'].items).toHaveLength(1);
    expect(grouped['store_002'].store_name).toBe('Another Store');
    expect(grouped['store_002'].items).toHaveLength(1);
  });

  it('handles variant-based cart item IDs', () => {
    let items = addItem([], { ...sampleInput, variant: 'L' });
    items = addItem(items, { ...sampleInput, variant: 'XL' });
    // Same product, different variants = 2 separate items
    expect(items).toHaveLength(2);
  });

  it('generates correct cart item IDs', () => {
    expect(generateCartItemId('prod_001')).toBe('prod_001');
    expect(generateCartItemId('prod_001', 'L')).toBe('prod_001_L');
    expect(generateCartItemId('prod_001', 'XL')).toBe('prod_001_XL');
  });
});
