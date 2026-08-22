'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useStorefrontCatalogState } from '../../lib/storefront-catalog-state';
import {
  buildStorefrontProductUrl,
  STOREFRONT_MERCHANDISING_LIMIT,
  type PublicProductsResult,
  type StorefrontProductQuery,
} from '../../lib/public-products';
import {
  DEFAULT_STOREFRONT_PRODUCT_LOADING_MODE,
  normalizeStorefrontProductLoadingMode,
} from '../../lib/storefront-product-loading';
import {
  StorefrontProductLoadingContext,
  type StorefrontProductLoadingContextValue,
} from './StorefrontProductLoadingContext';
import type { StoreProduct } from '../themes/shared';
import type { StorefrontProductLoadingMode } from '@pandamarket/types';

interface StorefrontProductLoadingProviderProps {
  storeId: string;
  initialProducts: StoreProduct[];
  initialMeta?: PublicProductsResult<StoreProduct>['meta'];
  mode?: StorefrontProductLoadingMode | string | null;
  query?: StorefrontProductQuery;
  children: React.ReactNode;
}

interface ProductPagePayload extends PublicProductsResult<StoreProduct> {
  error?: { message?: string };
}

function uniqueProducts(products: StoreProduct[]): StoreProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (!product?.id || seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function pageFromMeta(meta: PublicProductsResult<StoreProduct>['meta'] | undefined, fallback = 1): number {
  const page = Number(meta?.page);
  return Number.isInteger(page) && page > 0 ? page : fallback;
}

function hasNextFromMeta(
  meta: PublicProductsResult<StoreProduct>['meta'] | undefined,
  page: number,
  itemCount: number,
): boolean {
  if (typeof meta?.has_next === 'boolean') return meta.has_next;
  const totalPages = Number(meta?.total_pages);
  if (Number.isInteger(totalPages) && totalPages > 0) return page < totalPages;
  return itemCount >= STOREFRONT_MERCHANDISING_LIMIT;
}

function getPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

function buttonStyle(active = false): React.CSSProperties {
  return {
    borderColor: active ? 'var(--tc-primary, currentColor)' : 'color-mix(in srgb, var(--tc-text, currentColor) 18%, transparent)',
    backgroundColor: active ? 'var(--tc-primary, currentColor)' : 'transparent',
    color: active ? 'var(--tc-bg, #fff)' : 'var(--tc-text, currentColor)',
  };
}

function StorefrontProductLoadingControls() {
  const context = React.useContext(StorefrontProductLoadingContext);
  const { update: updateCatalog } = useStorefrontCatalogState();
  const [observerSupported, setObserverSupported] = useState(false);

  useEffect(() => {
    setObserverSupported(typeof window !== 'undefined' && 'IntersectionObserver' in window);
  }, []);

  useEffect(() => {
    if (!context || context.mode !== 'infinite' || !observerSupported || !context.hasNextPage) return undefined;
    const sentinel = document.querySelector<HTMLElement>('[data-storefront-product-loading-sentinel]');
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !context.isLoading) {
          void context.loadNextPage();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [context, observerSupported]);

  if (!context) return null;

  const totalPages = Math.max(1, context.totalPages);
  const showPagination = context.mode === 'pagination' && totalPages > 1;
  const showContinuation = context.mode !== 'pagination' && (context.hasNextPage || context.error || context.isLoading);
  const showCompleted = context.mode !== 'pagination'
    && !context.hasNextPage
    && !context.error
    && !context.isLoading
    && context.products.length > 0;

  const selectPage = async (page: number) => {
    if (page === context.currentPage || context.isLoading) return;
    const loaded = await context.loadPage(page);
    if (loaded) updateCatalog({ page: page > 1 ? String(page) : null });
  };

  return (
    <div className="mt-10 flex flex-col items-center gap-3 border-t pt-6" style={{ borderColor: 'color-mix(in srgb, var(--tc-text, currentColor) 14%, transparent)' }}>
      <div className="sr-only" aria-live="polite">
        {context.isLoading
          ? 'Chargement des produits'
          : context.error
            ? context.error
            : `${context.products.length}${typeof context.totalProducts === 'number' ? ` sur ${context.totalProducts}` : ''} produits affichés`}
      </div>

      {showPagination && (
        <nav aria-label="Pagination des produits" className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => void selectPage(context.currentPage - 1)}
            disabled={context.currentPage <= 1 || context.isLoading}
            aria-label="Page précédente"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-40"
            style={buttonStyle()}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {getPageItems(context.currentPage, totalPages).map((item, index) => item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm" style={{ color: 'var(--tc-text, currentColor)' }} aria-hidden="true">…</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => void selectPage(item)}
              disabled={context.isLoading}
              aria-current={context.currentPage === item ? 'page' : undefined}
              aria-label={`Page ${item}`}
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-semibold transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-50"
              style={buttonStyle(context.currentPage === item)}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void selectPage(context.currentPage + 1)}
            disabled={context.currentPage >= totalPages || context.isLoading}
            aria-label="Page suivante"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-40"
            style={buttonStyle()}
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      {showContinuation && (
        <>
          <div data-storefront-product-loading-sentinel className="h-px w-full" aria-hidden="true" />
          {(context.mode === 'load_more' || !observerSupported || context.error) && (
            <button
              type="button"
              onClick={() => void (context.error ? context.retry() : context.loadNextPage())}
              disabled={context.isLoading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-55"
              style={buttonStyle()}
            >
              {context.isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : context.error ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : null}
              {context.isLoading ? 'Chargement…' : context.error ? 'Réessayer' : 'Charger plus de produits'}
            </button>
          )}
        </>
      )}

      {showCompleted && (
        <p className="text-sm opacity-65" style={{ color: 'var(--tc-text, currentColor)' }}>Tous les produits sont affichés.</p>
      )}

      {context.error && !showContinuation && (
        <button
          type="button"
          onClick={() => void context.retry()}
          disabled={context.isLoading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-55"
          style={buttonStyle()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Réessayer
        </button>
      )}
    </div>
  );
}

export function StorefrontProductLoadingProvider({
  storeId,
  initialProducts,
  initialMeta,
  mode,
  query = {},
  children,
}: StorefrontProductLoadingProviderProps) {
  const normalizedMode = normalizeStorefrontProductLoadingMode(mode || DEFAULT_STOREFRONT_PRODUCT_LOADING_MODE);
  const queryKey = JSON.stringify(query);
  const baseQuery = useMemo<StorefrontProductQuery>(() => {
    const nextQuery: StorefrontProductQuery = {};
    for (const [key, value] of Object.entries(query)) {
      if (key !== 'page') nextQuery[key] = value;
    }
    return nextQuery;
  }, [query]);
  const initialPage = pageFromMeta(initialMeta, Number(query.page) || 1);
  const [products, setProducts] = useState<StoreProduct[]>(() => uniqueProducts(initialProducts));
  const [meta, setMeta] = useState<PublicProductsResult<StoreProduct>['meta']>(initialMeta);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(() => hasNextFromMeta(initialMeta, initialPage, initialProducts.length));
  const lastRequestedPageRef = useRef(initialPage);

  useEffect(() => {
    setProducts(uniqueProducts(initialProducts));
    setMeta(initialMeta);
    setCurrentPage(initialPage);
    lastRequestedPageRef.current = initialPage;
    setError(null);
    setHasNextPage(hasNextFromMeta(initialMeta, initialPage, initialProducts.length));
  // queryKey is the intentional reset boundary for URL-driven filters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, storeId, normalizedMode]);

  const inFlightRef = useRef<Promise<void> | null>(null);
  const requestPage = useCallback(async (page: number, append: boolean): Promise<boolean> => {
    if (inFlightRef.current || page < 1) return false;
    lastRequestedPageRef.current = page;
    let succeeded = false;
    const request = (async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(buildStorefrontProductUrl('', storeId, { ...baseQuery, page: String(page) }), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => ({})) as ProductPagePayload;
      if (!response.ok) {
        throw new Error(payload.error?.message || 'Impossible de charger les produits.');
      }
      const nextProducts = Array.isArray(payload.data) ? payload.data : [];
      const nextMeta = payload.meta;
      setProducts((current) => append ? uniqueProducts([...current, ...nextProducts]) : uniqueProducts(nextProducts));
      setMeta(nextMeta);
      setCurrentPage(pageFromMeta(nextMeta, page));
      setHasNextPage(nextProducts.length > 0 && hasNextFromMeta(nextMeta, page, nextProducts.length));
      succeeded = true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les produits.');
    } finally {
      setIsLoading(false);
    }
    })();
    inFlightRef.current = request;
    try {
      await request;
    } finally {
      if (inFlightRef.current === request) inFlightRef.current = null;
    }
    return succeeded;
  }, [baseQuery, storeId]);

  const loadPage = useCallback((page: number) => requestPage(page, false), [requestPage]);
  const loadNextPage = useCallback(() => {
    if (!hasNextPage) return Promise.resolve(false);
    return requestPage(currentPage + 1, true);
  }, [currentPage, hasNextPage, requestPage]);
  const retry = useCallback(() => {
    const page = lastRequestedPageRef.current || (normalizedMode === 'pagination' ? currentPage : currentPage + 1);
    return requestPage(page, normalizedMode !== 'pagination');
  }, [currentPage, normalizedMode, requestPage]);

  const contextValue = useMemo<StorefrontProductLoadingContextValue>(() => ({
    products,
    mode: normalizedMode,
    currentPage,
    totalPages: Math.max(1, Number(meta?.total_pages) || 1),
    totalProducts: Number.isFinite(Number(meta?.total)) ? Number(meta?.total) : undefined,
    hasNextPage,
    isLoading,
    error,
    loadPage,
    loadNextPage,
    retry,
  }), [currentPage, error, hasNextPage, isLoading, loadNextPage, loadPage, meta?.total, meta?.total_pages, normalizedMode, products, retry]);

  const [productSection, setProductSection] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const section = document.getElementById('products');
    setProductSection(section);
    if (!section) {
      const frame = window.requestAnimationFrame(() => setProductSection(document.getElementById('products')));
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, []);

  return (
    <StorefrontProductLoadingContext.Provider value={contextValue}>
      {children}
      {productSection ? createPortal(<StorefrontProductLoadingControls />, productSection) : null}
    </StorefrontProductLoadingContext.Provider>
  );
}
