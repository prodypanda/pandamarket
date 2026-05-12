export type SellerTypeValue = 'wholesaler' | 'retailer' | 'hybrid';

type TranslateFn = (key: string) => string;

const sellerTypeLabels: Record<SellerTypeValue, string> = {
  retailer: 'Retailer',
  wholesaler: 'Wholesaler',
  hybrid: 'Hybrid',
};

export const sellerTypeValues: SellerTypeValue[] = ['retailer', 'wholesaler', 'hybrid'];

export function isSellerTypeValue(value?: string | null): value is SellerTypeValue {
  if (value === 'wholesaler' || value === 'retailer' || value === 'hybrid') {
    return true;
  }
  return false;
}

function translateOrFallback(t: TranslateFn | undefined, key: string, fallback: string): string {
  if (!t) return fallback;
  const translated = t(key);
  return translated === key ? fallback : translated;
}

export function getSellerTypeLabel(value?: string | null, t?: TranslateFn): string {
  const sellerType = isSellerTypeValue(value) ? value : 'retailer';
  return translateOrFallback(t, `sellerTypes.options.${sellerType}`, sellerTypeLabels[sellerType]);
}

export function getSellerTypeDescription(value: SellerTypeValue, t?: TranslateFn): string {
  return translateOrFallback(t, `sellerTypes.descriptions.${value}`, '');
}

export function getSellerTypeOptions(t?: TranslateFn): { value: SellerTypeValue; label: string; description: string }[] {
  return sellerTypeValues.map((value) => ({
    value,
    label: getSellerTypeLabel(value, t),
    description: getSellerTypeDescription(value, t),
  }));
}
