'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export interface CatalogFilterState {
  category?: string;
  priceMin?: string;
  priceMax?: string;
  inStock?: boolean;
  sort?: string;
  page?: number;
  q?: string;
}

export interface CatalogPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
}

interface CatalogControlsProps {
  categories?: string[];
  meta?: CatalogPaginationMeta;
  accentColor?: string;
  secondaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  onFilterChange?: (filters: CatalogFilterState) => void;
  children?: React.ReactNode;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'title_asc', label: 'Nom A-Z' },
  { value: 'popular', label: 'Populaires' },
];

export function CatalogControls({
  categories = [],
  meta,
  accentColor = '#16C784',
  secondaryColor = '#f8fafc',
  textColor = '#0f172a',
  backgroundColor = '#ffffff',
  onFilterChange,
  children,
}: CatalogControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState(searchParams.get('price_min') || '');
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get('price_max') || '');

  const activeCategory = searchParams.get('category') || undefined;
  const activeSort = searchParams.get('sort') || 'newest';
  const activeMinPrice = searchParams.get('price_min') || undefined;
  const activeMaxPrice = searchParams.get('price_max') || undefined;
  const activeInStock = searchParams.get('in_stock') === '1' || searchParams.get('in_stock') === 'true';
  const activeQuery = searchParams.get('q') || undefined;
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const hasActiveFilters =
    Boolean(activeCategory) ||
    Boolean(activeMinPrice) ||
    Boolean(activeMaxPrice) ||
    activeInStock ||
    Boolean(activeQuery);

  const updateQueryParams = (updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    // Reset page to 1 on filter changes if page wasn't explicitly updated
    if (!('page' in updates)) {
      params.delete('page');
    }

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(targetUrl, { scroll: false });

    // Trigger optional callback for parent analytics
    if (onFilterChange) {
      onFilterChange({
        category: params.get('category') || undefined,
        priceMin: params.get('price_min') || undefined,
        priceMax: params.get('price_max') || undefined,
        inStock: params.get('in_stock') === '1',
        sort: params.get('sort') || undefined,
        page: parseInt(params.get('page') || '1', 10),
        q: params.get('q') || undefined,
      });
    }
  };

  const handlePriceApply = () => {
    updateQueryParams({
      price_min: minPriceInput.trim() || null,
      price_max: maxPriceInput.trim() || null,
    });
  };

  const handleClearAll = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    const params = new URLSearchParams(searchParams.toString());
    ['category', 'price_min', 'price_max', 'in_stock', 'q', 'page'].forEach((k) => params.delete(k));
    const targetUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(targetUrl, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Sort Bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 shadow-sm border border-slate-200/60"
        style={{ backgroundColor: secondaryColor, color: textColor }}
      >
        {/* Mobile Filter Drawer Button */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex lg:hidden items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <SlidersHorizontal className="h-4 w-4" style={{ color: accentColor }} />
          <span>Filtres</span>
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B91C1C] text-[10px] font-bold text-white">
              !
            </span>
          )}
        </button>

        {/* Results Counter */}
        <div className="text-xs font-semibold text-slate-500">
          {meta ? (
            <span>
              Affichage de <strong className="text-slate-800">{meta.total}</strong> produit{meta.total !== 1 ? 's' : ''}
            </span>
          ) : (
            <span>Produits du catalogue</span>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold hidden sm:inline">Trier par :</span>
          <select
            value={activeSort}
            onChange={(e) => updateQueryParams({ sort: e.target.value })}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-400">Filtres actifs :</span>

          {activeCategory && (
            <button
              type="button"
              onClick={() => updateQueryParams({ category: null })}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition shadow-2xs"
            >
              <span>Catégorie: {activeCategory}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {(activeMinPrice || activeMaxPrice) && (
            <button
              type="button"
              onClick={() => {
                setMinPriceInput('');
                setMaxPriceInput('');
                updateQueryParams({ price_min: null, price_max: null });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition shadow-2xs"
            >
              <span>
                Prix: {activeMinPrice || '0'} DT - {activeMaxPrice || '∞'} DT
              </span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {activeInStock && (
            <button
              type="button"
              onClick={() => updateQueryParams({ in_stock: null })}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition shadow-2xs"
            >
              <span>En stock uniquement</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {activeQuery && (
            <button
              type="button"
              onClick={() => updateQueryParams({ q: null })}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition shadow-2xs"
            >
              <span>Recherche: &quot;{activeQuery}&quot;</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-bold text-[#B91C1C] hover:underline ml-1"
          >
            Réinitialiser tout
          </button>
        </div>
      )}

      {/* Main Content (Product Grid from parent theme) */}
      {children}

      {/* Pagination Bar */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            type="button"
            disabled={!meta.has_prev && currentPage <= 1}
            onClick={() => updateQueryParams({ page: String(currentPage - 1) })}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Précédent</span>
          </button>

          <div className="flex items-center gap-1 px-3 text-xs font-bold text-slate-600">
            <span>Page <strong className="text-slate-900">{meta.page}</strong> sur {meta.total_pages}</span>
          </div>

          <button
            type="button"
            disabled={!meta.has_next && currentPage >= meta.total_pages}
            onClick={() => updateQueryParams({ page: String(currentPage + 1) })}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
          >
            <span>Suivant</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mobile Filter Drawer Modal */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs transition-opacity lg:hidden">
          <div className="w-full max-w-xs bg-white h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Filter className="h-4 w-4 text-[#B91C1C]" />
                  <span>Filtres du catalogue</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Catégories</h4>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        updateQueryParams({ category: null });
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold ${
                        !activeCategory ? 'bg-[#B91C1C]/10 text-[#B91C1C]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Toutes les catégories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          updateQueryParams({ category: cat });
                          setMobileDrawerOpen(false);
                        }}
                        className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold ${
                          activeCategory === cat
                            ? 'bg-[#B91C1C]/10 text-[#B91C1C]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Filter */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tranche de prix (DT)</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handlePriceApply();
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Appliquer le prix
                </button>
              </div>

              {/* In Stock toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-3 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeInStock}
                    onChange={(e) => {
                      updateQueryParams({ in_stock: e.target.checked ? '1' : null });
                      setMobileDrawerOpen(false);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                  />
                  <span>En stock uniquement</span>
                </label>
              </div>
            </div>

            <div className="pt-6 border-t">
              <button
                type="button"
                onClick={() => {
                  handleClearAll();
                  setMobileDrawerOpen(false);
                }}
                className="w-full rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Effacer les filtres
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
