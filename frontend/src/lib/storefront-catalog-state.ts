'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation';

export const DEFAULT_CATALOG_SORT = 'newest';

export const CATALOG_SORT_VALUES = [
  DEFAULT_CATALOG_SORT,
  'oldest',
  'price_asc',
  'price_desc',
  'title_asc',
  'popular',
] as const;

export type CatalogSort = (typeof CATALOG_SORT_VALUES)[number];
export type CatalogQueryKey = 'category' | 'sort' | 'price_min' | 'price_max' | 'in_stock' | 'q' | 'page';
export type CatalogQueryUpdates = Partial<Record<CatalogQueryKey, string | null | undefined>>;

export interface StorefrontCatalogState {
  category?: string;
  sort: CatalogSort;
  priceMin?: string;
  priceMax?: string;
  inStock: boolean;
  q?: string;
  page: number;
}

function normalizeText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function normalizeCatalogPage(value: string | number | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value || '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizeCatalogSort(value: string | null | undefined): CatalogSort {
  return CATALOG_SORT_VALUES.includes(value as CatalogSort)
    ? (value as CatalogSort)
    : DEFAULT_CATALOG_SORT;
}

export function parseCatalogState(searchParams: URLSearchParams | ReadonlyURLSearchParams): StorefrontCatalogState {
  return {
    category: normalizeText(searchParams.get('category')),
    sort: normalizeCatalogSort(normalizeText(searchParams.get('sort'))),
    priceMin: normalizeText(searchParams.get('price_min')),
    priceMax: normalizeText(searchParams.get('price_max')),
    inStock: searchParams.get('in_stock') === '1' || searchParams.get('in_stock') === 'true',
    q: normalizeText(searchParams.get('q')),
    page: normalizeCatalogPage(searchParams.get('page')),
  };
}

function setOrDelete(params: URLSearchParams, key: string, value: string | null | undefined): void {
  const normalized = normalizeText(value);
  if (normalized) {
    params.set(key, normalized);
  } else {
    params.delete(key);
  }
}

/**
 * Applies catalog changes while preserving unrelated query parameters.
 * Any filter change resets pagination unless the caller explicitly supplies page.
 */
export function updateCatalogSearchParams(
  current: URLSearchParams | ReadonlyURLSearchParams,
  updates: CatalogQueryUpdates,
): URLSearchParams {
  const params = new URLSearchParams(current.toString());
  const updateKeys = Object.keys(updates) as CatalogQueryKey[];
  const hasExplicitPage = Object.prototype.hasOwnProperty.call(updates, 'page');

  for (const key of updateKeys) {
    const value = updates[key];

    switch (key) {
      case 'sort': {
        const sort = normalizeCatalogSort(value);
        if (value === null || value === undefined || sort === DEFAULT_CATALOG_SORT) {
          params.delete('sort');
        } else {
          params.set('sort', sort);
        }
        break;
      }
      case 'in_stock':
        if (value === '1' || value === 'true') params.set('in_stock', '1');
        else params.delete('in_stock');
        break;
      case 'page': {
        const page = value === null || value === undefined ? 1 : normalizeCatalogPage(value);
        if (page <= 1) params.delete('page');
        else params.set('page', String(page));
        break;
      }
      default:
        setOrDelete(params, key, value);
    }
  }

  if (updateKeys.length > 0 && !hasExplicitPage) {
    params.delete('page');
  }

  return params;
}

export function serializeCatalogState(
  state: StorefrontCatalogState,
  baseParams: URLSearchParams | ReadonlyURLSearchParams = new URLSearchParams(),
): URLSearchParams {
  return updateCatalogSearchParams(baseParams, {
    category: state.category,
    sort: state.sort,
    price_min: state.priceMin,
    price_max: state.priceMax,
    in_stock: state.inStock ? '1' : null,
    q: state.q,
    page: state.page > 1 ? String(state.page) : null,
  });
}

export function buildCatalogUrl(
  pathname: string,
  current: URLSearchParams | ReadonlyURLSearchParams,
  updates: CatalogQueryUpdates,
): string {
  const params = updateCatalogSearchParams(current, updates);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function useStorefrontCatalogState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const state = useMemo(
    () => parseCatalogState(new URLSearchParams(searchParamsString)),
    [searchParamsString],
  );

  const update = useCallback(
    (updates: CatalogQueryUpdates, targetPath = pathname) => {
      const current = new URLSearchParams(searchParamsString);
      const nextParams = updateCatalogSearchParams(current, updates);
      const query = nextParams.toString();
      router.push(query ? `${targetPath}?${query}` : targetPath, { scroll: false });
      return parseCatalogState(nextParams);
    },
    [pathname, router, searchParamsString],
  );

  return { state, update };
}

/**
 * Shared theme-facing adapter. Search remains a local draft until the header
 * submits it; category changes are committed immediately to the URL.
 */
export function useStorefrontCatalogFilters() {
  const { state } = useStorefrontCatalogState();
  const [searchQuery, setSearchQuery] = useState(state.q || '');
  const [activeCategory, setActiveCategoryState] = useState(state.category || '');

  useEffect(() => {
    setSearchQuery(state.q || '');
    setActiveCategoryState(state.category || '');
  }, [state.category, state.q]);

  const setActiveCategory = useCallback(
    (category: string) => {
      const normalized = category.trim();
      setActiveCategoryState(normalized);
    },
    [],
  );

  return {
    state,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
  };
}
