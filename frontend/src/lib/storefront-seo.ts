import { getStorefrontWebsiteHref } from './storefront-url';

export interface StorefrontSeoStore {
  id: string;
  name: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  description?: string | null;
  product_count?: number | string | null;
  status?: string | null;
  is_verified?: boolean | null;
  settings?: {
    logo_url?: string | null;
    logo_light_url?: string | null;
    logo_dark_url?: string | null;
    store_description?: string | null;
    description?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    social?: Record<string, string | null> | null;
    [key: string]: unknown;
  };
}

export interface StorefrontSeoProduct {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  price: number | string;
  currency?: string | null;
  thumbnail?: string | null;
  images?: Array<{ url: string } | string>;
  type?: string | null;
  inventory_quantity?: number | null;
  status?: string | null;
}

export function isPublicStore(store: StorefrontSeoStore | null | undefined): boolean {
  return store?.status === 'verified' && store.is_verified === true;
}

export function isEmptyStore(store: StorefrontSeoStore | null | undefined): boolean {
  return Boolean(
    store
      && store.product_count !== null
      && store.product_count !== undefined
      && Number(store.product_count) === 0,
  );
}

export type StorefrontSearchParams = Record<string, string | string[] | undefined>;

export function hasStorefrontQueryParams(searchParams?: StorefrontSearchParams): boolean {
  return Object.values(searchParams || {}).some((value) => {
    if (Array.isArray(value)) return value.some((item) => Boolean(item?.trim()));
    return Boolean(value?.trim());
  });
}

export function getStorefrontCanonicalUrl(
  storeHost: string,
  store: StorefrontSeoStore,
  path = '/',
): string {
  const base = getStorefrontWebsiteHref({
    customDomain: store.custom_domain,
    subdomain: store.subdomain,
    storeHost,
  }).replace(/\/+$/, '');
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '/';
  return `${base}${normalizedPath === '/' ? '/' : normalizedPath}`;
}

export function getStorefrontOrganizationJsonLd(
  store: StorefrontSeoStore,
  canonicalUrl: string,
): Record<string, unknown> {
  const logo = store.settings?.logo_light_url || store.settings?.logo_url || store.settings?.logo_dark_url;
  const sameAs = Object.values(store.settings?.social || {}).filter((value): value is string => Boolean(value));
  const address = [store.settings?.address, store.settings?.city, store.settings?.country].filter(Boolean).join(', ');

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${canonicalUrl}#organization`,
    name: store.name,
    url: canonicalUrl,
    ...(logo ? { logo } : {}),
    ...(store.description || store.settings?.store_description || store.settings?.description
      ? { description: store.description || store.settings?.store_description || store.settings?.description }
      : {}),
    ...(store.settings?.contact_email ? { email: store.settings.contact_email } : {}),
    ...(store.settings?.contact_phone ? { telephone: store.settings.contact_phone } : {}),
    ...(address ? { address: { '@type': 'PostalAddress', streetAddress: address } } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function getStorefrontProductJsonLd(
  store: StorefrontSeoStore,
  product: StorefrontSeoProduct,
  canonicalUrl: string,
): Record<string, unknown> {
  const imageUrls = (product.images || [])
    .map((image) => (typeof image === 'string' ? image : image.url))
    .filter(Boolean);
  const price = Number(product.price);
  const inStock = product.inventory_quantity === undefined || product.inventory_quantity === null || product.inventory_quantity > 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalUrl}#product`,
    name: product.title,
    url: canonicalUrl,
    ...(product.description ? { description: product.description.slice(0, 5000) } : {}),
    ...(imageUrls.length > 0 ? { image: imageUrls } : product.thumbnail ? { image: [product.thumbnail] } : {}),
    brand: { '@type': 'Organization', name: store.name },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      price: Number.isFinite(price) ? price.toFixed(3) : '0.000',
      priceCurrency: product.currency || 'TND',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: store.name },
    },
  };
}

export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
