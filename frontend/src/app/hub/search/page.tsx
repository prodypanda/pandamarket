'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { Search, Filter, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '../../../contexts/LocaleContext';
import { getHubProductHref } from '../../../lib/product-links';

interface SearchProduct {
  id: string;
  type?: string | null;
  title: string;
  price: number | string;
  slug?: string | null;
  product_reference?: string | null;
  category?: string;
  marketplace_category_slug?: string | null;
  tags?: string[];
  attributes?: { name: string; value: string }[];
  images?: Array<string | { url: string }>;
  thumbnail?: string | null;
  store_name?: string;
  store_subdomain?: string | null;
  rating?: number;
}

interface SearchResult {
  hits?: SearchProduct[];
  data?: SearchProduct[];
  estimatedTotalHits?: number;
  total?: number;
}

interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  is_default?: boolean;
  product_count?: number;
}

interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_logo_url?: string;
  marketplace_theme?: 'panda' | 'aliexpress';
}

function SearchContent() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  const [results, setResults] = useState<SearchProduct[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryParam ? [categoryParam] : [],
  );
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [productType, setProductType] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings>({});

  const limit = 20;
  const isAliExpress = marketplaceSettings.marketplace_theme === 'aliexpress';
  const accentText = isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]';
  const accentBg = isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]';
  const accentRing = isAliExpress ? 'focus:border-[#ff4747] focus:ring-[#ff4747]/15' : 'focus:border-[#16C784] focus:ring-[#16C784]/15';
  const checkboxAccent = isAliExpress ? 'text-[#ff4747] focus:ring-[#ff4747]' : 'text-[#16C784] focus:ring-[#16C784]';

  useEffect(() => {
    let active = true;
    async function fetchCategories() {
      try {
        const res = await fetchWithCsrf('/api/pd/categories');
        if (!res.ok) return;
        const data = await res.json();
        if (active) setCategories((data.data || []).filter((category: MarketplaceCategory) => !category.is_default));
      } catch {
        if (active) setCategories([]);
      }
    }
    fetchCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchMarketplaceSettings() {
      try {
        const res = await fetch('/api/pd/marketplace/settings');
        if (!res.ok) return;
        const data = await res.json();
        if (active) setMarketplaceSettings(data.data || {});
      } catch {
        if (active) setMarketplaceSettings({});
      }
    }
    fetchMarketplaceSettings();
    return () => {
      active = false;
    };
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({
        q: query,
        limit: String(limit),
        offset: String(offset),
      });
      if (selectedCategories.length > 0) {
        params.set('category', selectedCategories[0]);
      }
      if (priceMin.trim()) {
        params.set('price_min', priceMin.trim());
      }
      if (priceMax.trim()) {
        params.set('price_max', priceMax.trim());
      }
      if (productType) {
        params.set('type', productType);
      }
      if (verifiedOnly) {
        params.set('verified', 'true');
      }
      if (sortBy !== 'relevance') {
        params.set('sort', sortBy);
      }
      const res = await fetchWithCsrf(`/api/pd/search?${params.toString()}`);
      if (res.ok) {
        const data: SearchResult = await res.json();
        setResults(data.hits || data.data || []);
        setTotalHits(data.estimatedTotalHits || data.total || 0);
      } else {
        setResults([]);
        setTotalHits(0);
      }
    } catch {
      setResults([]);
      setTotalHits(0);
    } finally {
      setLoading(false);
    }
  }, [query, page, selectedCategories, priceMin, priceMax, productType, verifiedOnly, sortBy]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const totalPages = Math.ceil(totalHits / limit);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? [] : [cat]));
    setPage(1);
  };

  const formatPrice = (price: SearchProduct['price']) => {
    const amount = Number(price);
    return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} ${t('common.currency')}`;
  };

  const getProductImage = (product: SearchProduct) => {
    const firstImage = product.images?.[0];
    if (typeof firstImage === 'string') return firstImage;
    if (firstImage?.url) return firstImage.url;
    return product.thumbnail || '';
  };

  const renderFilterSidebar = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">{t('product.category')}</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat.id} className={`flex items-start gap-3 cursor-pointer rounded-2xl border border-gray-100 p-3 transition-colors ${
              isAliExpress ? 'hover:border-orange-200 hover:bg-orange-50/70' : 'hover:border-[#16C784]/30 hover:bg-[#16C784]/5'
            }`}>
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.slug)}
                onChange={() => toggleCategory(cat.slug)}
                className={`mt-1 w-4 h-4 rounded border-gray-300 ${checkboxAccent}`}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-800">{cat.name}</span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {cat.product_count || 0} products
                </span>
              </span>
            </label>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-gray-500">{t('common.noResults')}</p>
          )}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">{t('search.priceRange')}</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 outline-none ${accentRing}`}
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 outline-none ${accentRing}`}
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Product type</h3>
        <select
          value={productType}
          onChange={(event) => {
            setProductType(event.target.value);
            setPage(1);
          }}
          className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-1 ${accentRing}`}
        >
          <option value="">All types</option>
          <option value="physical">Physical</option>
          <option value="digital">Digital</option>
          <option value="serial">Serial/license</option>
          <option value="service">Service</option>
        </select>
      </div>

      {/* Verified */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">{t('product.vendor')}</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className={`w-4 h-4 rounded border-gray-300 ${checkboxAccent}`}
          />
          <span className="text-sm text-gray-700">{t('search.verifiedOnly')}</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isAliExpress ? 'bg-[#f5f5f5]' : 'bg-gray-50'}`}>
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceTheme={marketplaceSettings.marketplace_theme}
      />

      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 sm:p-8 text-white ${
            isAliExpress ? 'from-[#ff4747] via-[#ff5f2e] to-[#ff8a00]' : 'from-slate-950 via-slate-900 to-[#16C784]'
          }`}>
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80">
                  <Search className="w-4 h-4" />
                  {t('nav.explore')}
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  {query ? (
                    <>{t('search.resultsFor', { count: totalHits, query })}</>
                  ) : (
                    t('search.title')
                  )}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-white/75">
                  {t('search.filters')} · {t('product.category')} · {t('search.priceRange')} · {t('product.vendor')}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                <p className="text-2xl font-black">{totalHits}</p>
                <p className="text-xs text-white/70">{t('dashboard.sidebar.products')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <p className="text-sm font-medium text-gray-500">
            {loading ? t('common.loading') : `${totalHits} ${t('dashboard.sidebar.products')}`}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white bg-white"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t('search.filters')}
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white focus:ring-4 outline-none ${accentRing}`}
            >
              <option value="relevance">{t('search.sortOptions.relevance')}</option>
              <option value="price_asc">{t('search.sortOptions.priceAsc')}</option>
              <option value="price_desc">{t('search.sortOptions.priceDesc')}</option>
              <option value="date">{t('search.sortOptions.newest')}</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-700" />
                <h2 className="font-bold text-gray-900">{t('search.filters')}</h2>
              </div>
              {renderFilterSidebar()}
            </div>
          </aside>

          {/* Mobile Filter Overlay */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 text-lg">{t('search.filters')}</h2>
                  <button onClick={() => setShowMobileFilters(false)}>
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {renderFilterSidebar()}
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className={`w-full mt-6 py-3 ${accentBg} text-white font-bold rounded-2xl transition-colors ${isAliExpress ? 'hover:bg-[#e63f00]' : 'hover:bg-[#14b876]'}`}
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          )}

          {/* Results Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                    <div className="aspect-square bg-gray-100 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      <div className="h-5 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 text-center py-20 shadow-sm">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('search.noResults', { query })}</h3>
                <p className="text-gray-500">
                  {t('search.noResultsSubtitle')}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={getHubProductHref(product)}
                      className="bg-white rounded-3xl border border-gray-100 overflow-hidden group hover:shadow-2xl hover:shadow-slate-900/10 hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        {product.category && (
                          <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-gray-700 shadow-sm">
                            {product.category}
                          </span>
                        )}
                        {getProductImage(product) ? (
                          <img
                            src={getProductImage(product)}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Search className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className={`font-bold text-gray-900 text-sm mb-1 line-clamp-2 transition-colors ${isAliExpress ? 'group-hover:text-[#ff4747]' : 'group-hover:text-[#16C784]'}`}>
                          {product.title}
                        </h3>
                        {product.store_name && (
                          <p className="text-xs text-gray-500 mb-2">{product.store_name}</p>
                        )}
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {product.type && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                              {product.type}
                            </span>
                          )}
                          {product.product_reference && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isAliExpress ? 'bg-orange-50 text-[#ff4747]' : 'bg-emerald-50 text-[#0f9f6e]'}`}>
                              Ref: {product.product_reference}
                            </span>
                          )}
                        </div>
                        {product.tags && product.tags.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {product.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className={`font-black ${accentText}`}>{formatPrice(product.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                            page === pageNum
                              ? `${accentBg} text-white shadow-lg ${isAliExpress ? 'shadow-orange-900/20' : 'shadow-[#16C784]/20'}`
                              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <HubFooter {...marketplaceSettings} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <SearchContent />
    </Suspense>
  );
}
