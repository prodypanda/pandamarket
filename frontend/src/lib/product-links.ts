export interface ProductLinkData {
  id: string;
  title?: string | null;
  slug?: string | null;
  category?: string | null;
  marketplace_category_slug?: string | null;
  store_subdomain?: string | null;
}

export function getHubProductHref(product: ProductLinkData): string {
  return `/hub/products/${encodeURIComponent(product.id)}`;
}
