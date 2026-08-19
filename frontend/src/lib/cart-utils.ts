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

export function generateCartItemId(product_id: string, variant?: string, variant_id?: string): string {
  const suffix = variant_id || variant;
  return suffix ? `${product_id}_${suffix}` : product_id;
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

export function getWholesalePricingFromMetadata(metadata?: Record<string, unknown> | string | null): WholesalePricing | null {
  if (!metadata) return null;
  let parsed: unknown = metadata;
  if (typeof metadata === 'string') {
    try {
      parsed = JSON.parse(metadata);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const rawPricing = ((parsed as Record<string, unknown>).wholesale_pricing ?? parsed) as Record<string, unknown>;
  if (!rawPricing || typeof rawPricing !== 'object') return null;

  const priceTiers =
    rawPricing.price_tiers ||
    rawPricing.tiers ||
    (parsed as Record<string, unknown>).wholesale_tiers;

  if (!Array.isArray(priceTiers) || priceTiers.length === 0) {
    return null;
  }

  const validTiers: WholesalePriceTier[] = priceTiers
    .map((tier: { min_quantity?: number | string; unit_price?: number | string }) => ({
      min_quantity: Number(tier?.min_quantity || 0),
      unit_price: Number(tier?.unit_price || 0),
    }))
    .filter((tier) => tier.min_quantity > 0 && tier.unit_price > 0)
    .sort((a, b) => a.min_quantity - b.min_quantity);

  if (validTiers.length === 0) return null;

  const minQuantity = Number(rawPricing.min_quantity) || validTiers[0].min_quantity;

  return {
    enabled: rawPricing.enabled !== false,
    min_quantity: minQuantity,
    price_tiers: validTiers,
  };
}

export function getCartItemUnitPrice(item: CartItem, quantity = item.quantity): number {
  const basePrice = Number.isFinite(item.base_price) ? Number(item.base_price) : item.price;
  return getWholesaleUnitPrice(basePrice, quantity, item.seller_type, item.wholesale_pricing);
}

export function getCartLineTotal(item: CartItem): number {
  return getCartItemUnitPrice(item) * item.quantity;
}

export function addItem(items: CartItem[], incoming: Omit<CartItem, 'id'>): CartItem[] {
  const id = generateCartItemId(incoming.product_id, incoming.variant, incoming.variant_id);
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

export function normalizeStoreKey(item: CartItem): string {
  return (item.store_id || item.store_subdomain || item.store_name || 'unknown_store').trim();
}

export function removeItemsByStore(items: CartItem[], storeId: string): CartItem[] {
  const target = storeId.trim();
  return items.filter((item) => normalizeStoreKey(item) !== target && item.store_id !== target && item.store_subdomain !== target);
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
    const key = normalizeStoreKey(item);
    if (!grouped[key]) {
      grouped[key] = { store_name: item.store_name || 'Boutique Partenaire', items: [] };
    }
    grouped[key].items.push(item);
  }
  return grouped;
}

export function isCartItemShippable(item: CartItem): boolean {
  return !item.product_type || item.product_type === 'physical';
}

export function getShippableStoreCount(items: CartItem[]): number {
  return new Set(items.filter(isCartItemShippable).map(normalizeStoreKey)).size;
}

export function getStoreShippingTotal(items: CartItem[], shippingPerStore: number): number {
  return items.some(isCartItemShippable) ? shippingPerStore : 0;
}

export function getShippingTotalForItems(items: CartItem[], shippingPerStore: number): number {
  return getShippableStoreCount(items) * shippingPerStore;
}

