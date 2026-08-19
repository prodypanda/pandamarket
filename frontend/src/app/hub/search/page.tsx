'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  RotateCcw,
  Check,
  ShieldCheck,
  Store,
  Tag,
  Boxes,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '../../../contexts/LocaleContext';
import { getHubProductHref } from '../../../lib/product-links';
import { getSellerTypeLabel, getSellerTypeOptions } from '../../../lib/seller-type';
import { isAliExpressTheme } from '../../../lib/marketplace-theme';
import { SponsoredAdsRail } from '../../../components/hub/SponsoredAdsRail';
import { trackSearchPerformed } from '../../../lib/marketplace-analytics';
import { ProductImagePlaceholder } from '../../../components/ui/ProductImagePlaceholder';
import { WatermarkOverlay } from '../../../components/watermark/MarketplaceWatermark';
import { StoreInfoBadge } from '../../../components/hub/home-template-shared';

interface SearchProduct {
  id: string;
  store_id?: string;
  type?: string | null;
  title: string;
  price: number | string;
  compare_at_price?: number | string | null;
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
  store_seller_type?: string | null;
  store_is_verified?: boolean | null;
  store_score?: number | string | null;
  average_rating?: number;
  review_count?: number;
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
  marketplace_logo_light_url?: string;
  marketplace_logo_dark_url?: string;
  marketplace_theme?: 'panda' | 'aliexpress' | 'aliexpress2';
  hub_grid_columns?: number;
  hub_card_show_store_name?: boolean;
  hub_card_show_store_verified?: boolean;
  hub_card_show_store_score?: boolean;
  hub_search_grid_columns?: number;
  hub_search_items_per_page?: number;
  hub_search_sponsored_enabled?: boolean;
  hub_search_sponsored_columns?: number;
  hub_search_sponsored_count?: number;
  watermark_enabled?: boolean;
  watermark_type?: 'text' | 'image' | 'both';
  watermark_text?: string;
  watermark_image_url?: string;
  watermark_position?: string;
  watermark_opacity?: number;
  watermark_scale?: string;
  watermark_style?: string;
  watermark_show_on_gallery?: boolean;
  watermark_show_on_cards?: boolean;
  watermark_show_on_lightbox?: boolean;
  watermark_copy_protection?: boolean;
}

const GRID_COL_CLASSES: Record<number, string> = {
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  3: 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4',
  4: 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
  5: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5',
  6: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5',
};

const PRICE_PRESETS = [
  { label: '< 20 DT', min: '', max: '20' },
  { label: '20 – 50 DT', min: '20', max: '50' },
  { label: '50 – 100 DT', min: '50', max: '100' },
  { label: '> 100 DT', min: '100', max: '' },
];

function SearchContent() {
  const { t, locale } = useLocale();
  const sellerTypeOptions = getSellerTypeOptions(t);
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
  const [sellerType, setSellerType] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings>({});

  const isAliExpress = isAliExpressTheme(marketplaceSettings.marketplace_theme);
  const isAliExpress2 = marketplaceSettings.marketplace_theme === 'aliexpress2';
  const accentText = isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]';
  const accentBg = isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]';
  const accentRing = isAliExpress
    ? 'focus:border-[#ff4747] focus:ring-[#ff4747]/15'
    : 'focus:border-[#16C784] focus:ring-[#16C784]/15';
  const checkboxAccent = isAliExpress ? 'text-[#ff4747] focus:ring-[#ff4747]' : 'text-[#16C784] focus:ring-[#16C784]';

  // Configurable Grid Density from Superadmin Settings
  const columnsCount = Math.min(
    6,
    Math.max(2, Number(marketplaceSettings.hub_search_grid_columns || marketplaceSettings.hub_grid_columns || 5)),
  );
  const gridClasses = GRID_COL_CLASSES[columnsCount] || GRID_COL_CLASSES[5];
  const limit = Math.max(6, Math.min(100, Number(marketplaceSettings.hub_search_items_per_page || 20)));

  useEffect(() => {
    let active = true;
    async function fetchCategories() {
      try {
        const res = await fetchWithCsrf(`/api/pd/categories?locale=${encodeURIComponent(locale)}`);
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
  }, [locale]);

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
      if (sellerType) {
        params.set('seller_type', sellerType);
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
        trackSearchPerformed(query, data.estimatedTotalHits || data.total || 0);
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
  }, [query, page, limit, selectedCategories, priceMin, priceMax, productType, sellerType, verifiedOnly, sortBy]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const totalPages = Math.ceil(totalHits / limit);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? [] : [cat]));
    setPage(1);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceMin('');
    setPriceMax('');
    setProductType('');
    setSellerType('');
    setVerifiedOnly(false);
    setPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (priceMin || priceMax) count += 1;
    if (productType) count += 1;
    if (sellerType) count += 1;
    if (verifiedOnly) count += 1;
    return count;
  }, [selectedCategories, priceMin, priceMax, productType, sellerType, verifiedOnly]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) {
      return showAllCategories ? categories : categories.slice(0, 6);
    }
    const q = categorySearchQuery.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearchQuery, showAllCategories]);

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

  const renderFilterSidebarContent = () => (
    <div className="space-y-4 text-xs">
      {/* Category Section */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Boxes className="h-3.5 w-3.5 text-slate-400" />
            {t('product.category')}
          </h3>
          {selectedCategories.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategories([])}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              Effacer
            </button>
          )}
        </div>

        {categories.length > 6 && (
          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Chercher catégorie..."
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-[11px] outline-none transition-colors focus:border-slate-400 focus:bg-white"
            />
            {categorySearchQuery && (
              <button
                type="button"
                onClick={() => setCategorySearchQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        <div className="space-y-1">
          {filteredCategories.map((cat) => {
            const isSelected = selectedCategories.includes(cat.slug);
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => toggleCategory(cat.slug)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? isAliExpress
                      ? 'bg-orange-50 text-[#ff4747] font-bold border border-orange-200/80 shadow-xs'
                      : 'bg-emerald-50 text-[#0f9f6e] font-bold border border-emerald-200/80 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`h-3.5 w-3.5 shrink-0 rounded flex items-center justify-center border transition-colors ${
                      isSelected
                        ? isAliExpress
                          ? 'border-[#ff4747] bg-[#ff4747] text-white'
                          : 'border-[#16C784] bg-[#16C784] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                  <span className="truncate text-xs">{cat.name}</span>
                </div>
                {typeof cat.product_count === 'number' && cat.product_count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                      isSelected ? 'bg-white/80 text-slate-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {cat.product_count}
                  </span>
                )}
              </button>
            );
          })}

          {categories.length > 6 && !categorySearchQuery && (
            <button
              type="button"
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="mt-1 w-full text-center text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              {showAllCategories ? '− Afficher moins' : `+ Voir tout (${categories.length})`}
            </button>
          )}

          {categories.length === 0 && (
            <p className="py-2 text-center text-xs text-slate-400">{t('common.noResults')}</p>
          )}
        </div>
      </div>

      {/* Price Range Section */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            {t('search.priceRange')}
          </h3>
          {(priceMin || priceMax) && (
            <button
              type="button"
              onClick={() => {
                setPriceMin('');
                setPriceMax('');
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          {PRICE_PRESETS.map((preset) => {
            const isActive = priceMin === preset.min && priceMax === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  if (isActive) {
                    setPriceMin('');
                    setPriceMax('');
                  } else {
                    setPriceMin(preset.min);
                    setPriceMax(preset.max);
                    setPage(1);
                  }
                }}
                className={`py-1 px-2 rounded-lg text-[10px] font-bold transition-all text-center ${
                  isActive
                    ? isAliExpress
                      ? 'bg-[#ff4747] text-white shadow-xs'
                      : 'bg-[#16C784] text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => {
                setPriceMin(e.target.value);
                setPage(1);
              }}
              className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-400 ${accentRing}`}
            />
            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-300 pointer-events-none">DT</span>
          </div>
          <span className="text-slate-300 font-bold">—</span>
          <div className="relative flex-1">
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => {
                setPriceMax(e.target.value);
                setPage(1);
              }}
              className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-400 ${accentRing}`}
            />
            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-300 pointer-events-none">DT</span>
          </div>
        </div>
      </div>

      {/* Product Type Section */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
          Type de Produit
        </h3>
        <div className="grid grid-cols-2 gap-1">
          {[
            { value: '', label: 'Tous' },
            { value: 'bundle', label: '📦 Pack Promo' },
            { value: 'physical', label: 'Physique' },
            { value: 'digital', label: 'Numérique' },
            { value: 'serial', label: 'Licence' },
            { value: 'service', label: 'Service' },
          ].map((type) => {
            const isSelected = productType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  setProductType(type.value);
                  setPage(1);
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition-all ${
                  isSelected
                    ? isAliExpress
                      ? 'bg-orange-50 text-[#ff4747] border border-orange-200 font-black'
                      : 'bg-emerald-50 text-[#0f9f6e] border border-emerald-200 font-black'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vendor & Trust Section */}
      <div>
        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5 text-slate-400" />
          {t('product.vendor')}
        </h3>

        <select
          value={sellerType}
          onChange={(event) => {
            setSellerType(event.target.value);
            setPage(1);
          }}
          className={`mb-3 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400 ${accentRing}`}
        >
          <option value="">{t('sellerTypes.all')}</option>
          {sellerTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Verified Seller Toggle */}
        <label className="flex items-center justify-between gap-2 cursor-pointer rounded-xl border border-slate-100 bg-slate-50/50 p-2 hover:bg-slate-100/60 transition-colors">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-500 shrink-0" />
            <span className="text-xs font-bold text-slate-700">{t('search.verifiedOnly')}</span>
          </div>
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => {
              setVerifiedOnly(e.target.checked);
              setPage(1);
            }}
            className={`w-4 h-4 rounded border-slate-300 ${checkboxAccent}`}
          />
        </label>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isAliExpress ? 'bg-[#f5f5f5]' : 'bg-[#F8FAFC]'}`}>
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
        marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
        marketplaceTheme={marketplaceSettings.marketplace_theme}
      />

      {/* Hero Banner Header */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 sm:p-8 text-white shadow-xl ${
              isAliExpress
                ? 'from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] shadow-orange-900/10'
                : 'from-slate-950 via-slate-900 to-[#16C784] shadow-slate-900/10'
            }`}
          >
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
                  <Search className="w-3.5 h-3.5" />
                  {t('nav.explore')}
                </div>
                <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
                  {query ? (
                    <>{t('search.resultsFor', { count: totalHits, query })}</>
                  ) : (
                    t('search.title')
                  )}
                </h1>
                <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-white/80">
                  {t('search.filters')} · {t('product.category')} · {t('search.priceRange')} · {t('product.vendor')}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-5 py-3.5 backdrop-blur border border-white/20">
                <Sparkles className="h-6 w-6 text-amber-300 shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-black leading-tight">{totalHits}</p>
                  <p className="text-[11px] text-white/80 uppercase font-bold tracking-wider">{t('dashboard.sidebar.products')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Active Filter Chips & Sort Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              {loading ? t('common.loading') : `${totalHits} résultat${totalHits > 1 ? 's' : ''}`}
            </span>

            {/* Active filter badges */}
            {selectedCategories.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs">
                Catégorie: {selectedCategories[0]}
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {(priceMin || priceMax) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs">
                Prix: {priceMin || '0'} – {priceMax || '∞'} DT
                <button
                  type="button"
                  onClick={() => {
                    setPriceMin('');
                    setPriceMax('');
                  }}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {productType && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs">
                Type: {productType}
                <button
                  type="button"
                  onClick={() => setProductType('')}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {sellerType && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs">
                Vendeur: {sellerType}
                <button
                  type="button"
                  onClick={() => setSellerType('')}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {verifiedOnly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-1 text-xs font-bold text-sky-700 shadow-2xs">
                <ShieldCheck className="h-3 w-3" /> Vérifié
                <button
                  type="button"
                  onClick={() => setVerifiedOnly(false)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition-colors underline ml-1"
              >
                <RotateCcw className="h-3 w-3" /> Tout effacer
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-white bg-white shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t('search.filters')}
              {activeFiltersCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:ring-2 outline-none shadow-2xs ${accentRing}`}
              >
                <option value="relevance">{t('search.sortOptions.relevance')}</option>
                <option value="price_asc">{t('search.sortOptions.priceAsc')}</option>
                <option value="price_desc">{t('search.sortOptions.priceDesc')}</option>
                <option value="date">{t('search.sortOptions.newest')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-7">
          {/* Desktop Fixed-Height Sidebar with Styled Scrollbar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-700" />
                  <h2 className="font-black text-slate-900 text-sm">{t('search.filters')}</h2>
                  {activeFiltersCount > 0 && (
                    <span className="rounded-full bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.2">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 transition-colors"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {/* Scrollable container with styled scrollbar */}
              <div className="max-h-[calc(100vh-13rem)] overflow-y-auto overscroll-contain pr-1.5 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                {renderFilterSidebarContent()}
              </div>
            </div>
          </aside>

          {/* Mobile Filter Sheet Modal */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowMobileFilters(false)} />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-700" />
                    <h2 className="font-bold text-slate-900 text-base">{t('search.filters')}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="p-1 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <div className="overflow-y-auto overscroll-contain py-4 flex-1 pr-1">
                  {renderFilterSidebarContent()}
                </div>
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50"
                  >
                    Tout effacer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className={`flex-[2] py-2.5 ${accentBg} text-white font-bold rounded-xl text-xs transition-colors shadow-md ${
                      isAliExpress ? 'hover:bg-[#e63f00]' : 'hover:bg-[#14b876]'
                    }`}
                  >
                    Afficher les {totalHits} résultats
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Grid Area */}
          <div className="flex-1 min-w-0">
            <SponsoredAdsRail
              placement="search.top_results"
              title="Sponsored results"
              locale="all"
              category={selectedCategories[0]}
              columns={marketplaceSettings.hub_search_sponsored_columns || 4}
              limit={marketplaceSettings.hub_search_sponsored_count || 6}
              enabled={marketplaceSettings.hub_search_sponsored_enabled !== false}
              compact={true}
            />

            {loading ? (
              <div className={gridClasses}>
                {Array.from({ length: limit }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs animate-pulse">
                    <div className="aspect-square bg-slate-100" />
                    <div className="p-3.5 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                      <div className="h-4 bg-slate-100 rounded" />
                      <div className="h-4 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 text-center py-20 px-6 shadow-sm">
                <Search className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">{t('search.noResults', { query })}</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                  {t('search.noResultsSubtitle')}
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Dynamically Configured Grid per Superadmin Settings */}
                <div className={gridClasses}>
                  {results.map((product) => {
                    const discountPercent =
                      Number(product.compare_at_price) > Number(product.price)
                        ? Math.round(
                            ((Number(product.compare_at_price) - Number(product.price)) /
                              Number(product.compare_at_price)) *
                              100,
                          )
                        : 0;

                    return (
                      <Link
                        key={product.id}
                        href={getHubProductHref(product)}
                        className={`group bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 block ${
                          isAliExpress2
                            ? 'hover:border-orange-200/80'
                            : isAliExpress
                              ? 'hover:border-orange-200'
                              : 'hover:border-emerald-200'
                        }`}
                      >
                        <div className="aspect-square bg-slate-50 relative overflow-hidden">
                          {product.type === 'bundle' ? (
                            <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                              📦 Pack Promo
                            </span>
                          ) : product.category ? (
                            <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs backdrop-blur-xs">
                              {product.category}
                            </span>
                          ) : null}
                          {getProductImage(product) ? (
                            <div
                              aria-label={product.title}
                              role="img"
                              className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                              style={{
                                backgroundImage: `url(${getResizedImageUrl(getProductImage(product), 'medium')})`,
                              }}
                            />
                          ) : (
                            <ProductImagePlaceholder
                              theme={isAliExpress ? 'aliexpress' : 'default'}
                              altText={product.title}
                            />
                          )}
                          <WatermarkOverlay
                            settings={marketplaceSettings}
                            storeName={product.store_name}
                            viewType="card"
                          />
                        </div>

                        <div className="p-3">
                          <h3
                            className={`font-bold text-slate-900 text-xs mb-1 line-clamp-2 leading-snug transition-colors ${
                              isAliExpress ? 'group-hover:text-[#ff4747]' : 'group-hover:text-[#16C784]'
                            }`}
                          >
                            {product.title}
                          </h3>

                          <StoreInfoBadge
                            product={product as any}
                            marketplaceSettings={marketplaceSettings}
                            className="mb-1.5"
                          />

                          <div className="mb-2 flex flex-wrap items-center gap-1">
                            {product.type && (
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                {product.type}
                              </span>
                            )}
                            {discountPercent > 0 && (
                              <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                                -{discountPercent}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between gap-1">
                            <div>
                              <p className={`font-black text-sm ${accentText}`}>{formatPrice(product.price)}</p>
                              {Number(product.compare_at_price) > Number(product.price) && (
                                <p className="text-[10px] font-bold text-slate-400 line-through">
                                  {formatPrice(product.compare_at_price!)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Localized Compact Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-10">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
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
                          type="button"
                          onClick={() => setPage(pageNum)}
                          className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                            page === pageNum
                              ? `${accentBg} text-white shadow-md ${
                                  isAliExpress ? 'shadow-orange-900/20' : 'shadow-emerald-900/20'
                                }`
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
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
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <SearchContent />
    </Suspense>
  );
}
