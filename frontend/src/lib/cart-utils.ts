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
  base_price?: number;
  quantity: number;
  store_id: string;
  store_name: string;
  store_subdomain?: string | null;
  seller_type?: string | null;
  wholesale_pricing?: WholesalePricing | null;
  product_type?: string | null;
  image_url: string | null;
  variant_id?: string;
  variant?: string;
}

export interface WholesalePriceTier {
  min_quantity: number;
  unit_price: number;
}

export interface WholesalePricing {
  enabled?: boolean;
  min_quantity?: number;
  price_tiers?: WholesalePriceTier[];
}

export function generateCartItemId(product_id: string, variant?: string): string {
  return variant ? `${product_id}_${variant}` : product_id;
}

export function getMinimumQuantityForSeller(sellerType?: string | null, wholesalePricing?: WholesalePricing | null): number {
  if (sellerType !== 'wholesaler') return 1;
  const minQuantity = Number(wholesalePricing?.min_quantity);
  return Number.isInteger(minQuantity) && minQuantity > 1 ? minQuantity : 1;
}

export function getWholesaleUnitPrice(basePrice: number, quantity: number, sellerType?: string | null, wholesalePricing?: WholesalePricing | null): number {
  if ((sellerType !== 'wholesaler' && sellerType !== 'hybrid') || !wholesalePricing?.enabled || !Array.isArray(wholesalePricing.price_tiers)) {
    return basePrice;
  }
  const tiers = wholesalePricing.price_tiers
    .map((tier) => ({
      min_quantity: Number(tier.min_quantity),
      unit_price: Number(tier.unit_price),
    }))
    .filter((tier) => Number.isInteger(tier.min_quantity) && tier.min_quantity > 0 && Number.isFinite(tier.unit_price) && tier.unit_price >= 0)
    .sort((a, b) => a.min_quantity - b.min_quantity);

  const activeTier = tiers.filter((tier) => quantity >= tier.min_quantity).at(-1);
  return activeTier ? activeTier.unit_price : basePrice;
}

export function getWholesalePricingFromMetadata(metadata?: Record<string, unknown> | null): WholesalePricing | null {
  const pricing = metadata?.wholesale_pricing as WholesalePricing | undefined;
  if (!pricing?.enabled || !Array.isArray(pricing.price_tiers)) {
    return null;
  }
  return pricing;
}

export function getCartItemUnitPrice(item: CartItem, quantity = item.quantity): number {
  const basePrice = Number.isFinite(item.base_price) ? Number(item.base_price) : item.price;
  return getWholesaleUnitPrice(basePrice, quantity, item.seller_type, item.wholesale_pricing);
}

export function getCartLineTotal(item: CartItem): number {
  return getCartItemUnitPrice(item) * item.quantity;
}

export function addItem(items: CartItem[], incoming: Omit<CartItem, 'id'>): CartItem[] {
  const id = generateCartItemId(incoming.product_id, incoming.variant);
  const existing = items.find((i) => i.id === id);
  if (existing) {
    return items.map((i) =>
      i.id === id
        ? (() => {
          const quantity = i.quantity + incoming.quantity;
          const nextItem = { ...i, quantity, base_price: i.base_price ?? i.price };
          return { ...nextItem, price: getCartItemUnitPrice(nextItem) };
        })()
        : i,
    );
  }
  const item = { ...incoming, id, base_price: incoming.base_price ?? incoming.price };
  const quantity = Math.max(getMinimumQuantityForSeller(item.seller_type, item.wholesale_pricing), item.quantity);
  const nextItem = { ...item, quantity };
  return [...items, { ...nextItem, price: getCartItemUnitPrice(nextItem) }];
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
  return items.map((i) => {
    if (i.id !== id) return i;
    const nextQuantity = Math.max(getMinimumQuantityForSeller(i.seller_type, i.wholesale_pricing), quantity);
    const nextItem = { ...i, quantity: nextQuantity };
    return { ...nextItem, price: getCartItemUnitPrice(nextItem) };
  });
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + getCartLineTotal(item), 0);
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

export function isCartItemShippable(item: CartItem): boolean {
  return !item.product_type || item.product_type === 'physical';
}

export function getShippableStoreCount(items: CartItem[]): number {
  return new Set(items.filter(isCartItemShippable).map((item) => item.store_id)).size;
}

export function getStoreShippingTotal(items: CartItem[], shippingPerStore: number): number {
  return items.some(isCartItemShippable) ? shippingPerStore : 0;
}

export function getShippingTotalForItems(items: CartItem[], shippingPerStore: number): number {
  return getShippableStoreCount(items) * shippingPerStore;
}
