/**
 * Shared public-product request helpers.
 *
 * Storefront merchandising and sitemap generation intentionally use different
 * windows: storefront surfaces render a small, predictable product window,
 * while crawlers walk the backend's maximum page size until all products are
 * collected.
 */

export const STOREFRONT_MERCHANDISING_LIMIT = 24;
export const PUBLIC_PRODUCT_PAGE_SIZE = 100;

export const STOREFRONT_CATALOG_QUERY_KEYS = [
  'category',
  'marketplace_category_id',
  'storefront_category_id',
  'price_min',
  'price_max',
  'in_stock',
  'type',
  'tag',
  'discounted',
  'seller_type',
  'sort',
  'q',
] as const;

const STOREFRONT_SORT_VALUES = new Set([
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'title_asc',
  'title_desc',
  'popular',
  'best_sellers',
]);

type QueryValue = string | string[] | undefined;

export interface StorefrontProductQuery {
  [key: string]: QueryValue;
}

interface NextFetchInit extends RequestInit {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
}

interface PublicProductPage<T> {
  data?: T[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
    from?: number;
    to?: number;
    has_next?: boolean;
    has_prev?: boolean;
    next_page?: number | null;
    prev_page?: number | null;
  };
}

export interface PublicProductsResult<T> {
  data: T[];
  meta?: PublicProductPage<T>['meta'];
}

function firstQueryValue(value: QueryValue): string | undefined {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized?.trim() || undefined;
}

function normalizePage(value: QueryValue): string | undefined {
  const parsed = Number.parseInt(firstQueryValue(value) || '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : undefined;
}

/**
 * Build a storefront catalog request without allowing URL state to replace
 * server-owned tenant scope or the intentional merchandising window.
 */
export function buildStorefrontProductUrl(
  backendUrl: string,
  storeId: string,
  query: StorefrontProductQuery = {},
): string {
  const params = new URLSearchParams({
    store_id: storeId,
    limit: String(STOREFRONT_MERCHANDISING_LIMIT),
    sort: STOREFRONT_SORT_VALUES.has(firstQueryValue(query.sort) || '')
      ? firstQueryValue(query.sort) as string
      : 'newest',
  });

  for (const key of STOREFRONT_CATALOG_QUERY_KEYS) {
    if (key === 'sort' || key === 'q') continue;
    const value = firstQueryValue(query[key]);
    if (value) params.set(key, value);
  }

  const search = firstQueryValue(query.q) || firstQueryValue(query.search);
  if (search) params.set('q', search);

  const page = normalizePage(query.page);
  if (page) params.set('page', page);

  return `${backendUrl}/api/pd/products/public?${params.toString()}`;
}

/**
 * Fetch the intentional first-page merchandising window used by storefront
 * home, preview, and Page Builder surfaces.
 */
export async function fetchStorefrontProducts<T>(
  backendUrl: string,
  storeId: string,
  query: StorefrontProductQuery = {},
  fetchInit: NextFetchInit = {},
): Promise<PublicProductsResult<T>> {
  try {
    const response = await fetch(buildStorefrontProductUrl(backendUrl, storeId, query), fetchInit);
    if (!response.ok) return { data: [] };

    const payload = await response.json() as PublicProductPage<T>;
    return {
      data: Array.isArray(payload.data) ? payload.data : [],
      meta: payload.meta,
    };
  } catch {
    return { data: [] };
  }
}

/**
 * Walk every public-product page. The backend clamps limits to 100, so callers
 * must use the response metadata rather than assuming a larger request worked.
 */
export async function fetchAllPublicProducts<T>(
  backendUrl: string,
  query: { storeId?: string; sort?: string } = {},
  fetchInit: NextFetchInit = {},
): Promise<T[]> {
  const products: T[] = [];
  const maxPages = 10_000;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PUBLIC_PRODUCT_PAGE_SIZE),
      sort: query.sort || 'newest',
    });
    if (query.storeId) params.set('store_id', query.storeId);

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/api/pd/products/public?${params.toString()}`, fetchInit);
    } catch {
      break;
    }
    if (!response.ok) break;

    let payload: PublicProductPage<T>;
    try {
      payload = await response.json() as PublicProductPage<T>;
    } catch {
      break;
    }

    const pageProducts = Array.isArray(payload.data) ? payload.data : [];
    products.push(...pageProducts);

    const totalPages = Number(payload.meta?.total_pages);
    const hasNext = payload.meta?.has_next === true
      || (Number.isInteger(totalPages) && totalPages > page)
      || (!payload.meta && pageProducts.length === PUBLIC_PRODUCT_PAGE_SIZE);
    if (!hasNext || pageProducts.length === 0) break;
  }

  return products;
}
