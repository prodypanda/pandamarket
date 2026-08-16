'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: number | string;
  [key: string]: any;
}

interface HubProductPaginationProps {
  style?: 'infinite' | 'load_more' | 'pagination' | 'none' | string;
  sortBy?: string;
  fetchUrl?: string;
  initialPage?: number;
  renderCard: (product: Product) => React.ReactNode;
  gridClassName?: string;
  initialProducts?: Product[];
  initialTotalPages?: number;
  /** Number of products to fetch per page/scroll load (default 12) */
  itemsPerLoad?: number;
  /** Number of columns at the largest breakpoint — used to build dynamic grid classes when provided */
  columns?: number;
}

/**
 * Map a columns number (2–8) to a responsive Tailwind grid class string.
 * Mobile always starts at 2 cols, then scales up through sm/md/lg/xl breakpoints.
 */
function columnsToGridClass(cols: number, gap: number = 4): string {
  const g = `gap-${gap}`;
  if (cols <= 2) return `grid grid-cols-2 ${g}`;
  if (cols === 3) return `grid grid-cols-2 ${g} sm:grid-cols-3`;
  if (cols === 4) return `grid grid-cols-2 ${g} sm:grid-cols-3 lg:grid-cols-4`;
  if (cols === 5) return `grid grid-cols-2 ${g} sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`;
  if (cols === 6) return `grid grid-cols-2 ${g} sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`;
  if (cols === 7) return `grid grid-cols-2 ${g} sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7`;
  return `grid grid-cols-2 ${g} sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8`;
}

export function HubProductPagination({
  style = 'none',
  sortBy = 'newest',
  fetchUrl = '/api/pd/products/public',
  initialPage = 2,
  renderCard,
  gridClassName,
  initialProducts = [],
  initialTotalPages = 1,
  itemsPerLoad = 12,
  columns,
}: HubProductPaginationProps) {
  // Flatten all products into a single list to avoid grid gaps between pages
  const [extraProducts, setExtraProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const currentPageRef = useRef(1);
  const extraCountRef = useRef(0);

  // For pagination mode, we need to replace the entire displayed set
  const [paginationProducts, setPaginationProducts] = useState<Product[]>([]);
  const [isPaginationMode] = useState(style === 'pagination');

  const resolvedGridClassName = columns
    ? columnsToGridClass(columns)
    : gridClassName || 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';

  const fetchPage = useCallback(async (pageNumber: number, replace: boolean = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: String(itemsPerLoad),
        sort: sortBy,
      });
      const res = await fetch(`${fetchUrl}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const newProducts: Product[] = data.data || [];
      const meta = data.meta || {};
      
      if (meta.total_pages) {
        setTotalPages(meta.total_pages);
      }
      
      if (newProducts.length < itemsPerLoad) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (replace) {
        // Pagination mode: replace entire set
        setPaginationProducts(newProducts);
        setCurrentPage(pageNumber);
        currentPageRef.current = pageNumber;
      } else {
        // Infinite / load_more: append to flat list
        if (newProducts.length > 0) {
          setExtraProducts((prev) => {
            const next = [...prev, ...newProducts];
            extraCountRef.current = next.length;
            return next;
          });
          setCurrentPage(pageNumber);
          currentPageRef.current = pageNumber;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [itemsPerLoad, sortBy, fetchUrl]);

  const handleLoadMore = useCallback(() => {
    const nextPageToFetch = extraCountRef.current === 0 ? initialPage : currentPageRef.current + 1;
    fetchPage(nextPageToFetch, false);
  }, [initialPage, fetchPage]);

  const handlePageClick = (pageNum: number) => {
    fetchPage(pageNum, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (style !== 'infinite' || !hasMore || loading) return;

    const el = triggerRef.current;
    if (!el) return;

    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) {
        handleLoadMore();
      }
    };

    observerRef.current = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observerRef.current.observe(el);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [style, hasMore, loading, handleLoadMore]);

  // Build the single flat product list
  const allProducts: Product[] = isPaginationMode
    ? (paginationProducts.length > 0 ? paginationProducts : initialProducts)
    : [...initialProducts, ...extraProducts];

  if (!style || style === 'none') {
    return initialProducts.length > 0 ? (
      <div className={resolvedGridClassName}>
        {initialProducts.map(renderCard)}
      </div>
    ) : null;
  }

  return (
    <div className="mt-4 w-full">
      {/* Single unified grid — no separate containers per page */}
      {allProducts.length > 0 && (
        <div className={resolvedGridClassName}>
          {allProducts.map(renderCard)}
        </div>
      )}

      {/* Pagination Controls */}
      {style === 'pagination' ? (
        <nav aria-label="Product pagination" className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageClick(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            aria-label="Previous page"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let start = Math.max(1, currentPage - 2);
            if (start + 4 > totalPages) {
              start = Math.max(1, totalPages - 4);
            }
            const pageNum = start + i;
            if (pageNum > totalPages) return null;
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageClick(pageNum)}
                disabled={loading}
                aria-label={`Page ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-colors ${
                  currentPage === pageNum
                    ? 'bg-[#ff6a00] text-white shadow-orange-950/20'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageClick(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || loading}
            aria-label="Next page"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </nav>
      ) : (
        /* Load More or Infinite */
        hasMore && (
          <div className="mt-8 flex w-full justify-center" ref={style === 'infinite' ? triggerRef : undefined}>
            {loading ? (
              <div className="flex flex-col items-center gap-2 animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="text-xs font-bold text-slate-400">Loading more products...</span>
              </div>
            ) : style === 'load_more' ? (
              <button
                onClick={handleLoadMore}
                className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-3.5 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-orange-50 hover:text-orange-600 hover:shadow-md hover:ring-orange-200"
              >
                <span className="relative z-10">Load More Products</span>
                <div className="absolute inset-0 z-0 h-full w-0 bg-orange-100/50 transition-all duration-300 group-hover:w-full" />
              </button>
            ) : null}
          </div>
        )
      )}
      
      {!hasMore && extraProducts.length > 0 && style !== 'pagination' && (
        <div className="mt-8 text-center text-sm font-bold text-slate-400">
          You&apos;ve reached the end of the catalog
        </div>
      )}
    </div>
  );
}
