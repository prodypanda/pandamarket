import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartProvider, useCart, CartItem } from '../contexts/CartContext';

// ---------------------------------------------------------------------------
// Helper: a tiny component that exposes CartContext values to the DOM so we
// can assert against them without `renderHook` (which triggers the React 19
// dual-instance bug in monorepo CI environments).
// ---------------------------------------------------------------------------

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

/**
 * Test harness component that renders cart state as data-testid attributes
 * and exposes action buttons so tests can drive the cart via fireEvent.
 */
function CartTestHarness() {
  const ctx = useCart();

  return (
    <div>
      <span data-testid="item-count">{ctx.getItemCount()}</span>
      <span data-testid="cart-total">{ctx.getCartTotal()}</span>
      <span data-testid="items-length">{ctx.items.length}</span>
      <span data-testid="items-json">{JSON.stringify(ctx.items)}</span>
      <span data-testid="grouped-json">{JSON.stringify(ctx.getItemsByStore())}</span>

      <button data-testid="add-item1" onClick={() => ctx.addToCart(sampleItem)}>Add1</button>
      <button data-testid="add-item2" onClick={() => ctx.addToCart(sampleItem2)}>Add2</button>
      <button data-testid="add-variant-L" onClick={() => ctx.addToCart({ ...sampleItem, variant: 'L' })}>AddL</button>
      <button data-testid="add-variant-XL" onClick={() => ctx.addToCart({ ...sampleItem, variant: 'XL' })}>AddXL</button>
      <button data-testid="remove-item1" onClick={() => ctx.removeFromCart('prod_001')}>Remove1</button>
      <button data-testid="update-qty-5" onClick={() => ctx.updateQuantity('prod_001', 5)}>Qty5</button>
      <button data-testid="update-qty-0" onClick={() => ctx.updateQuantity('prod_001', 0)}>Qty0</button>
      <button data-testid="clear" onClick={() => ctx.clearCart()}>Clear</button>
    </div>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <CartTestHarness />
    </CartProvider>,
  );
}

// Helpers to read values from the rendered harness
const itemCount = () => Number(screen.getByTestId('item-count').textContent);
const cartTotal = () => Number(screen.getByTestId('cart-total').textContent);
const itemsLength = () => Number(screen.getByTestId('items-length').textContent);
const items = (): CartItem[] => JSON.parse(screen.getByTestId('items-json').textContent || '[]');
const grouped = () => JSON.parse(screen.getByTestId('grouped-json').textContent || '{}');
const click = (id: string) => fireEvent.click(screen.getByTestId(id));

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty cart', () => {
    renderCart();
    expect(itemsLength()).toBe(0);
    expect(itemCount()).toBe(0);
    expect(cartTotal()).toBe(0);
  });

  it('adds an item to the cart', () => {
    renderCart();
    click('add-item1');
    expect(itemsLength()).toBe(1);
    expect(items()[0].title).toBe('Test Product');
    expect(items()[0].price).toBe(85.0);
    expect(itemCount()).toBe(1);
  });

  it('increments quantity when adding the same product', () => {
    renderCart();
    click('add-item1');
    click('add-item1');
    expect(itemsLength()).toBe(1);
    expect(items()[0].quantity).toBe(2);
    expect(itemCount()).toBe(2);
  });

  it('calculates cart total correctly', () => {
    renderCart();
    click('add-item1');
    click('add-item2');
    // 85 * 1 + 45.5 * 2 = 176
    expect(cartTotal()).toBe(176);
  });

  it('removes an item from the cart', () => {
    renderCart();
    click('add-item1');
    click('add-item2');
    expect(itemsLength()).toBe(2);
    click('remove-item1');
    expect(itemsLength()).toBe(1);
    expect(items()[0].title).toBe('Another Product');
  });

  it('updates item quantity', () => {
    renderCart();
    click('add-item1');
    click('update-qty-5');
    expect(items()[0].quantity).toBe(5);
    expect(cartTotal()).toBe(425);
  });

  it('removes item when quantity set to 0', () => {
    renderCart();
    click('add-item1');
    click('update-qty-0');
    expect(itemsLength()).toBe(0);
  });

  it('clears the entire cart', () => {
    renderCart();
    click('add-item1');
    click('add-item2');
    expect(itemsLength()).toBe(2);
    click('clear');
    expect(itemsLength()).toBe(0);
    expect(cartTotal()).toBe(0);
  });

  it('groups items by store', () => {
    renderCart();
    click('add-item1');
    click('add-item2');
    const g = grouped();
    expect(Object.keys(g)).toHaveLength(2);
    expect(g['store_001'].store_name).toBe('Test Store');
    expect(g['store_001'].items).toHaveLength(1);
    expect(g['store_002'].store_name).toBe('Another Store');
    expect(g['store_002'].items).toHaveLength(1);
  });

  it('handles variant-based cart item IDs', () => {
    renderCart();
    click('add-variant-L');
    click('add-variant-XL');
    // Same product, different variants = 2 separate items
    expect(itemsLength()).toBe(2);
  });

  it('useCart throws when used outside CartProvider', () => {
    // Verify the hook guard works by rendering without a provider.
    // We catch the React error boundary throw instead of using renderHook.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<CartTestHarness />);
    }).toThrow();
    spy.mockRestore();
  });
});
