'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

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
}

export function HubProductPagination({
  style = 'none',
  sortBy = 'newest',
  fetchUrl = '/api/pd/products/public',
  initialPage = 2,
  renderCard,
  gridClassName = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4',
}: HubProductPaginationProps) {
  const [pages, setPages] = useState<Product[][]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  if (!style || style === 'none') {
    return null;
  }

  const fetchPage = async (pageNumber: number) => {
    if (loading || !hasMore) return;
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
      if (newProducts.length < 12) {
        setHasMore(false);
      }
      if (newProducts.length > 0) {
        setPages((prev) => [...prev, newProducts]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (style === 'infinite') {
      const handleScroll = () => {
        if (
          window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 800
        ) {
          if (!loading && hasMore) {
            fetchPage(page);
            setPage((p) => p + 1);
          }
        }
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [style, loading, hasMore, page]);

  const handleLoadMore = () => {
    fetchPage(page);
    setPage((p) => p + 1);
  };

  return (
    <div className="mt-4 w-full">
      {pages.map((pageData, i) => (
        <div key={i} className={`${gridClassName} mt-4`}>
          {pageData.map(renderCard)}
        </div>
      ))}

      {hasMore && (
        <div className="mt-8 flex w-full justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <span className="text-xs font-bold text-slate-400">Loading more products...</span>
            </div>
          ) : style === 'load_more' || style === 'pagination' ? (
            <button
              onClick={handleLoadMore}
              className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-3.5 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-orange-50 hover:text-orange-600 hover:shadow-md hover:ring-orange-200"
            >
              <span className="relative z-10">Load More Products</span>
              <div className="absolute inset-0 z-0 h-full w-0 bg-orange-100/50 transition-all duration-300 group-hover:w-full" />
            </button>
          ) : null}
        </div>
      )}
      
      {!hasMore && pages.length > 0 && (
        <div className="mt-12 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
          You've reached the end of the catalog
        </div>
      )}
    </div>
  );
}
