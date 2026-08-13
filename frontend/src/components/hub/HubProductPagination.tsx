'use client';

import { useEffect, useState, useRef } from 'react';
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
}

export function HubProductPagination({
  style = 'none',
  sortBy = 'newest',
  fetchUrl = '/api/pd/products/public',
  initialPage = 2,
  renderCard,
  gridClassName = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  initialProducts = [],
  initialTotalPages = 1,
}: HubProductPaginationProps) {
  const [pages, setPages] = useState<Product[][]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchPage = async (pageNumber: number, replace: boolean = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: '12',
        sort: sortBy,
      });
      const res = await fetch(`${fetchUrl}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const newProducts = data.data || [];
      const meta = data.meta || {};
      
      if (meta.total_pages) {
        setTotalPages(meta.total_pages);
      }
      
      if (newProducts.length < 12) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (replace) {
        // Only keep the new products (for classic pagination)
        setPages([newProducts]);
        setCurrentPage(pageNumber);
      } else {
        if (newProducts.length > 0) {
          setPages((prev) => [...prev, newProducts]);
          setCurrentPage(pageNumber);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    // If it's the first click and pages is empty, fetch initialPage (which defaults to 2)
    // If pages is not empty, fetch next page.
    const nextPageToFetch = pages.length === 0 ? initialPage : currentPage + 1;
    fetchPage(nextPageToFetch, false);
  };

  const handlePageClick = (pageNum: number) => {
    fetchPage(pageNum, true);
    // Optionally scroll to top of grid
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (style === 'infinite' && hasMore && !loading) {
      const handleObserver = (entries: IntersectionObserverEntry[]) => {
        const target = entries[0];
        if (target.isIntersecting) {
          handleLoadMore();
        }
      };
      
      const el = document.getElementById('infinite-scroll-trigger');
      if (!el) return;
      
      observerRef.current = new IntersectionObserver(handleObserver, { threshold: 0.1 });
      observerRef.current.observe(el);
      
      return () => {
        if (observerRef.current) observerRef.current.disconnect();
      };
    }
  }, [style, hasMore, loading, currentPage, pages]);

  // Determine what to display for the FIRST page (initialProducts)
  // If style is 'pagination' AND we have clicked a page (so pages.length > 0), we DO NOT display initialProducts.
  const shouldDisplayInitial = !(style === 'pagination' && pages.length > 0);

  if (!style || style === 'none') {
    return initialProducts.length > 0 ? (
      <div className={gridClassName}>
        {initialProducts.map(renderCard)}
      </div>
    ) : null;
  }

  return (
    <div className="mt-4 w-full">
      {/* 1. Initial Products (Page 1) */}
      {initialProducts.length > 0 && shouldDisplayInitial && (
        <div className={`${gridClassName} mt-4`}>
          {initialProducts.map(renderCard)}
        </div>
      )}

      {/* 2. Fetched Pages */}
      {pages.map((pageData, i) => (
        <div key={i} className={`${gridClassName} mt-4`}>
          {pageData.map(renderCard)}
        </div>
      ))}

      {/* 3. Pagination Controls */}
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
          <div className="mt-8 flex w-full justify-center" id={style === 'infinite' ? 'infinite-scroll-trigger' : undefined}>
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
      
      {!hasMore && pages.length > 0 && style !== 'pagination' && (
        <div className="mt-8 text-center text-sm font-bold text-slate-400">
          You've reached the end of the catalog
        </div>
      )}
    </div>
  );
}
