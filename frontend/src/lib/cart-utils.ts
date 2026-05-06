/**
 * Pure cart logic — no React dependency.
 * Used by CartContext and directly testable without jsdom/React.
 */

export interface CartItem {
  id: string;
  product_id: string;
  title: string;
  slug?: string | null;
  category?: string | null;
  marketplace_category_slug?: string | null;
  price: number;
  quantity: number;
  store_id: string;
  store_name: string;
  store_subdomain?: string | null;
  image_url: string | null;
  variant?: string;
}

export function generateCartItemId(product_id: string, variant?: string): string {
  return variant ? `${product_id}_${variant}` : product_id;
}

export function addItem(items: CartItem[], incoming: Omit<CartItem, 'id'>): CartItem[] {
  const id = generateCartItemId(incoming.product_id, incoming.variant);
  const existing = items.find((i) => i.id === id);
  if (existing) {
    return items.map((i) =>
      i.id === id ? { ...i, quantity: i.quantity + incoming.quantity } : i,
    );
  }
  return [...items, { ...incoming, id }];
}

export function removeItem(items: CartItem[], id: string): CartItem[] {
  return items.filter((i) => i.id !== id);
}

export function removeItemsByStore(items: CartItem[], storeId: string): CartItem[] {
  return items.filter((item) => item.store_id !== storeId);
}

export function updateItemQuantity(items: CartItem[], id: string, quantity: number): CartItem[] {
  if (quantity <= 0) {
    return items.filter((i) => i.id !== id);
  }
  return items.map((i) => (i.id === id ? { ...i, quantity } : i));
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getItemsByStore(items: CartItem[]): Record<string, { store_name: string; items: CartItem[] }> {
  const grouped: Record<string, { store_name: string; items: CartItem[] }> = {};
  for (const item of items) {
    if (!grouped[item.store_id]) {
      grouped[item.store_id] = { store_name: item.store_name, items: [] };
    }
    grouped[item.store_id].items.push(item);
  }
  return grouped;
}
