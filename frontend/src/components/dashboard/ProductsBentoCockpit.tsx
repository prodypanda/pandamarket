'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Check,
  ArrowUpRight,
  DollarSign,
  Layers,
  Tag,
  ChevronDown,
  ShoppingBag,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getResizedImageUrl } from '@/lib/image-url';

import type { Product, Category } from '@/app/hub/dashboard/products/page';

export type { Product, Category };

export interface ProductsBentoCockpitProps {
  products: Product[];
  loading: boolean;
  totalProducts: number;
  storeCounts: {
    total: number;
    published: number;
    draft: number;
    low_stock: number;
  };
  categories: Category[];
  onRefresh: () => Promise<void>;
  onEditProduct: (product: Product) => void;
  onCreateProduct: () => void;
  onDeleteProduct: (product: Product) => void;
  onStatusChange: (product: Product, status: string) => Promise<void>;
  onQuickAdjustStock: (product: Product, newQuantity: number) => Promise<void>;
  limits?: {
    maxProducts?: number;
    currentProducts?: number;
  };
  dir?: 'ltr' | 'rtl';
}

function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatPrice(price: unknown, currency = 'TND'): string {
  return `${toNumber(price).toFixed(3)} ${currency}`;
}

type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'title_asc';
type AlertTab = 'all' | 'out_of_stock' | 'low_stock';

export function ProductsBentoCockpit({
  products,
  loading,
  totalProducts,
  storeCounts,
  categories,
  onRefresh,
  onEditProduct,
  onCreateProduct,
  onDeleteProduct,
  onStatusChange,
  onQuickAdjustStock,
  limits,
  dir = 'ltr',
}: ProductsBentoCockpitProps) {
  const { t } = useLocale();

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft' | 'low_stock'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [alertTab, setAlertTab] = useState<AlertTab>('all');

  // Quick adjust stock modal state
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Keyboard escape listener for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && adjustTargetProduct && !adjustingStock) {
        setAdjustTargetProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adjustTargetProduct, adjustingStock]);

  const openAdjustModal = (product: Product) => {
    setAdjustTargetProduct(product);
    setAdjustQuantity(Math.max(0, toNumber(product.inventory_quantity)));
  };

  const closeAdjustModal = () => {
    if (!adjustingStock) {
      setAdjustTargetProduct(null);
    }
  };

  const handleConfirmStockAdjust = async () => {
    if (!adjustTargetProduct) return;
    setAdjustingStock(true);
    try {
      await onQuickAdjustStock(adjustTargetProduct, adjustQuantity);
      setAdjustTargetProduct(null);
    } finally {
      setAdjustingStock(false);
    }
  };

  const handleStatusToggle = async (product: Product) => {
    setStatusUpdatingId(product.id);
    try {
      const nextStatus = product.status === 'published' ? 'draft' : 'published';
      await onStatusChange(product, nextStatus);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // 1. Critical Inventory Alert Calculations
  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => toNumber(p.inventory_quantity) <= 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const q = toNumber(p.inventory_quantity);
      return q > 0 && q <= 5;
    });
  }, [products]);

  const urgentAlertProducts = useMemo(() => {
    if (alertTab === 'out_of_stock') return outOfStockProducts;
    if (alertTab === 'low_stock') return lowStockProducts;
    return [...outOfStockProducts, ...lowStockProducts];
  }, [alertTab, outOfStockProducts, lowStockProducts]);

  // 2. Top-Selling Catalog Velocity Calculations
  const { topVelocityProduct, velocityRunnersUp } = useMemo(() => {
    if (!products || products.length === 0) {
      return { topVelocityProduct: null, velocityRunnersUp: [] };
    }

    const scored = products.map((p) => {
      const price = toNumber(p.price);
      const stock = toNumber(p.inventory_quantity);
      const isPublished = p.status === 'published' ? 2 : 1;
      const metaSales =
        typeof p.metadata?.units_sold === 'number'
          ? p.metadata.units_sold
          : typeof p.metadata?.sales_count === 'number'
          ? p.metadata.sales_count
          : 0;
      const revenue =
        typeof p.metadata?.total_revenue === 'number'
          ? p.metadata.total_revenue
          : metaSales * price || price * (stock > 0 ? 3 : 1);

      const score = metaSales > 0 ? metaSales * 1000 + revenue : isPublished * 100 + price * 2;
      return { product: p, score, revenue, unitsSold: metaSales };
    });

    scored.sort((a, b) => b.score - a.score);

    return {
      topVelocityProduct: scored[0] || null,
      velocityRunnersUp: scored.slice(1, 4),
    };
  }, [products]);

  // 3. Search, Filter and Sort Products for the Visual Grid
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search term
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchTitle = (product.title || '').toLowerCase().includes(query);
        const matchRef = (product.product_reference || '').toLowerCase().includes(query);
        const matchDesc = (product.description || '').toLowerCase().includes(query);
        const matchCat = (product.marketplace_category_name || product.category || '').toLowerCase().includes(query);
        if (!matchTitle && !matchRef && !matchDesc && !matchCat) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const matchId = product.marketplace_category_id === selectedCategory || product.storefront_category_id === selectedCategory;
        const matchName = product.category === selectedCategory || product.marketplace_category_name === selectedCategory;
        if (!matchId && !matchName) return false;
      }

      // Status filter
      if (selectedStatus === 'published' && product.status !== 'published') return false;
      if (selectedStatus === 'draft' && product.status !== 'draft') return false;
      if (selectedStatus === 'low_stock') {
        const qty = toNumber(product.inventory_quantity);
        if (qty > 5) return false;
      }

      return true;
    });
  }, [products, search, selectedCategory, selectedStatus]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case 'price_asc':
        return list.sort((a, b) => toNumber(a.price) - toNumber(b.price));
      case 'price_desc':
        return list.sort((a, b) => toNumber(b.price) - toNumber(a.price));
      case 'stock_asc':
        return list.sort((a, b) => toNumber(a.inventory_quantity) - toNumber(b.inventory_quantity));
      case 'stock_desc':
        return list.sort((a, b) => toNumber(b.inventory_quantity) - toNumber(a.inventory_quantity));
      case 'title_asc':
        return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'recent':
      default:
        return list;
    }
  }, [filteredProducts, sortBy]);

  const isFiltered = search.trim() !== '' || selectedCategory !== 'all' || selectedStatus !== 'all';

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSortBy('recent');
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* 1. TOP STATS BAR & BENTO OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Products */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Références
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {totalProducts}
            </span>
            {limits?.maxProducts && limits.maxProducts > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                / {limits.maxProducts} max
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Catalogue actif PandaMarket
          </p>
        </div>

        {/* Published Products */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs transition-all hover:border-emerald-300 dark:hover:border-emerald-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              En Ligne & Publiés
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {storeCounts.published}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              visibles acheteurs
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Prêts pour la commande immédiate
          </p>
        </div>

        {/* Draft Products */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Brouillons & Préparation
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {storeCounts.draft}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              en cours d&apos;édition
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Masqués du storefront public
          </p>
        </div>

        {/* Stock Alerts (Low & Out) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border shadow-2xs transition-all ${
            outOfStockProducts.length > 0 || lowStockProducts.length > 0
              ? 'border-rose-200/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium uppercase tracking-wider ${
                outOfStockProducts.length > 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              Alertes Inventaire
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                outOfStockProducts.length > 0
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                outOfStockProducts.length > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {outOfStockProducts.length + lowStockProducts.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ({outOfStockProducts.length} rupture, {lowStockProducts.length} critique)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Action de réapprovisionnement requise
          </p>
        </div>
      </div>

      {/* 2. FEATURE 1: LOW-STOCK & OUT-OF-STOCK URGENT INVENTORY ALERT DECK */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Deck d&apos;Alerte Inventaire Urgent
                </h2>
                {outOfStockProducts.length + lowStockProducts.length > 0 && (
                  <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    {outOfStockProducts.length + lowStockProducts.length} critiques
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajustez vos stocks en 1 clic pour éviter les ruptures et pertes de commandes COD
              </p>
            </div>
          </div>

          {/* Filter Sub-Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => setAlertTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                alertTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tous ({outOfStockProducts.length + lowStockProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setAlertTab('out_of_stock')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                alertTab === 'out_of_stock'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              Ruptures ({outOfStockProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setAlertTab('low_stock')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                alertTab === 'low_stock'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              Stock Faible ({lowStockProducts.length})
            </button>
          </div>
        </div>

        {/* Content of Urgent Alert Deck */}
        <div className="mt-4">
          {urgentAlertProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200/80 dark:border-slate-800">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                Inventaire sain & approvisionné
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                Tous vos produits disposent actuellement d&apos;un stock supérieur à 5 unités. Vos acheteurs peuvent commander sans risque de rupture.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {urgentAlertProducts.slice(0, 6).map((product) => {
                const qty = toNumber(product.inventory_quantity);
                const isOutOfStock = qty <= 0;
                return (
                  <div
                    key={`alert-${product.id}`}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                      isOutOfStock
                        ? 'border-rose-200/80 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 hover:border-rose-300'
                        : 'border-amber-200/80 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={getResizedImageUrl(product.thumbnail, 'small')}
                        alt={product.title}
                        className="h-12 w-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              isOutOfStock
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {isOutOfStock ? 'Rupture immédiate' : `Stock faible: ${qty} rest.`}
                          </span>
                          {product.product_reference && (
                            <span className="text-[10px] text-slate-400 font-mono truncate">
                              {product.product_reference}
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {product.title}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Niveau: <strong className={isOutOfStock ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>{qty} unité(s)</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => openAdjustModal(product)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ajuster Stock</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. FEATURE 2 & 3: TOP-SELLING VELOCITY HERO SHOWCASE & PANDAADS LAUNCHER */}
      {topVelocityProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Velocity Hero (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            {/* Top decorative accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-linear-to-bl from-amber-400/10 via-rose-500/5 to-transparent rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    <span>Top Vélocité Catalogue</span>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Meilleure contribution aux ventes
                  </span>
                </div>

                {/* PandaAds Direct Shortcut */}
                <Link
                  href={`/hub/dashboard/ads?sponsor_product_id=${topVelocityProduct.product.id}&title=${encodeURIComponent(topVelocityProduct.product.title)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition shadow-2xs"
                  title="Booster avec PandaAds"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Booster avec PandaAds</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Hero product body */}
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                <div className="relative group shrink-0">
                  <img
                    src={getResizedImageUrl(topVelocityProduct.product.thumbnail, 'medium')}
                    alt={topVelocityProduct.product.title}
                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
                  />
                  <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm">
                    #1
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {topVelocityProduct.product.marketplace_category_name || topVelocityProduct.product.category || 'Général'}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        topVelocityProduct.product.status === 'published'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {topVelocityProduct.product.status === 'published' ? 'En ligne' : 'Brouillon'}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                    {topVelocityProduct.product.title}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-baseline gap-3">
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {formatPrice(topVelocityProduct.product.price)}
                    </span>
                    {topVelocityProduct.product.compare_at_price && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatPrice(topVelocityProduct.product.compare_at_price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stock health and velocity metrics */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                    Stock Disponible
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    {topVelocityProduct.product.inventory_quantity} unités
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                    Volume de Ventes
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {topVelocityProduct.unitsSold > 0 ? `${topVelocityProduct.unitsSold} vendus` : 'Actif'}
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                    Contribution CA
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    {formatPrice(topVelocityProduct.revenue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Card Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEditProduct(topVelocityProduct.product)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier la fiche</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAdjustModal(topVelocityProduct.product)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajuster stock</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                Mis à jour en temps réel
              </span>
            </div>
          </div>

          {/* Runners-up Side Showcase (1 col) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Produits à Fort Potentiel
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Accélérateurs</span>
              </div>

              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {velocityRunnersUp.map(({ product, revenue }, idx) => (
                  <div key={`runner-${product.id}`} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-4">
                        #{idx + 2}
                      </span>
                      <img
                        src={getResizedImageUrl(product.thumbnail, 'thumbnail')}
                        alt={product.title}
                        className="h-9 w-9 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {product.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {formatPrice(product.price)} • {product.inventory_quantity} en stock
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/hub/dashboard/ads?sponsor_product_id=${product.id}&title=${encodeURIComponent(product.title)}`}
                      className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 transition shrink-0"
                      title="Booster avec PandaAds"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* PandaAds banner teaser */}
            <div className="mt-4 p-3 rounded-xl bg-linear-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-200/80 dark:border-amber-900/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                  Boostez n&apos;importe quelle référence pour <strong>0.100 TND / clic</strong> via PandaAds
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FEATURE 5: SEARCH & FILTER TOOLBAR */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, référence SKU, catégorie..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters and Sorting controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'published' | 'draft' | 'low_stock')}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publié uniquement</option>
              <option value="draft">Brouillon uniquement</option>
              <option value="low_stock">Stock faible & rupture</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="recent">Ordre récent</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="stock_asc">Stock critique d&apos;abord</option>
              <option value="stock_desc">Stock décroissant</option>
              <option value="title_asc">Titre (A - Z)</option>
            </select>

            {/* Clear filters button */}
            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition"
                title="Réinitialiser les filtres"
              >
                <X className="w-3 h-3" />
                <span>Effacer</span>
              </button>
            )}

            {/* Refresh button */}
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Create Product Button */}
            <button
              type="button"
              onClick={onCreateProduct}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Produit</span>
            </button>
          </div>
        </div>

        {/* Results summary line */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Affichage de <strong>{sortedProducts.length}</strong> sur <strong>{totalProducts}</strong> produit(s)
          </span>
          {isFiltered && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Filtres actifs appliqués
            </span>
          )}
        </div>
      </div>

      {/* 5. FEATURE 4: VISUAL PRODUCT GRID */}
      {sortedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
            Aucun produit trouvé
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {isFiltered
              ? 'Aucun article ne correspond à vos critères de recherche. Essayez de réinitialiser vos filtres.'
              : 'Votre catalogue est actuellement vide. Créez votre première référence pour commencer à vendre.'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            {isFiltered ? (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs"
              >
                Réinitialiser les filtres
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreateProduct}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer un premier produit</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {sortedProducts.map((product) => {
            const qty = toNumber(product.inventory_quantity);
            const isOutOfStock = qty <= 0;
            const isLowStock = qty > 0 && qty <= 5;
            const isPublished = product.status === 'published';
            const isUpdating = statusUpdatingId === product.id;

            return (
              <div
                key={`grid-prod-${product.id}`}
                data-testid={`grid-product-${product.id}`}
                className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Product Thumbnail Top Card */}
                <div>
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={getResizedImageUrl(product.thumbnail, 'medium')}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Stock badge (top-right) */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                          <AlertCircle className="w-3 h-3" />
                          <span>Rupture (0)</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Stock {qty}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900/80 backdrop-blur-xs text-white shadow-xs">
                          {qty} en stock
                        </span>
                      )}
                    </div>

                    {/* Category pill (top-left) */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                        {product.marketplace_category_name || product.category || 'Standard'}
                      </span>
                    </div>

                    {/* 1-Click PandaAds Sponsor Shortcut Button (floating on image hover) */}
                    <div className="absolute bottom-2.5 right-2.5 z-10 opacity-95 group-hover:opacity-100 transition">
                      <Link
                        href={`/hub/dashboard/ads?sponsor_product_id=${product.id}&title=${encodeURIComponent(product.title)}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:from-amber-600 hover:to-orange-600 transition"
                        title="Booster ce produit via PandaAds"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Sponsoriser</span>
                      </Link>
                    </div>
                  </div>

                  {/* Product Details Section */}
                  <div className="p-4">
                    {/* Status Pill & SKU */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => void handleStatusToggle(product)}
                        disabled={isUpdating}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition border ${
                          isPublished
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700'
                        }`}
                        title="Cliquer pour basculer le statut"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{isUpdating ? '...' : isPublished ? 'Publié' : 'Brouillon'}</span>
                      </button>

                      {product.product_reference && (
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[110px]">
                          {product.product_reference}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className="mt-2 text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 min-h-[2.5rem] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                      onClick={() => onEditProduct(product)}
                    >
                      {product.title}
                    </h3>

                    {/* Price and Compare Price */}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {formatPrice(product.price)}
                      </span>
                      {product.compare_at_price && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatPrice(product.compare_at_price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* Quick Stock Adjust Button */}
                    <button
                      type="button"
                      onClick={() => openAdjustModal(product)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      title="Ajuster le stock"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Stock</span>
                    </button>

                    {/* Edit Drawer Trigger */}
                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs"
                      title="Modifier la fiche produit"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Éditer</span>
                    </button>
                  </div>

                  {/* Delete Trigger */}
                  <button
                    type="button"
                    onClick={() => onDeleteProduct(product)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Supprimer ce produit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. MODAL: QUICK ADJUST STOCK DIALOG (ACCESSIBLE CUSTOM MODAL) */}
      {adjustTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-adjust-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="quick-adjust-title" className="text-sm font-bold text-slate-900 dark:text-white">
                    Ajustement Rapide du Stock
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mise à jour directe de l&apos;inventaire
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAdjustModal}
                disabled={adjustingStock}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Product Summary */}
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <img
                src={getResizedImageUrl(adjustTargetProduct.thumbnail, 'small')}
                alt={adjustTargetProduct.title}
                className="h-11 w-11 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {adjustTargetProduct.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Stock actuel : <strong>{toNumber(adjustTargetProduct.inventory_quantity)} unités</strong>
                </p>
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nouvelle quantité d&apos;unités :
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity((prev) => Math.max(0, prev - 1))}
                    disabled={adjustQuantity <= 0 || adjustingStock}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={adjustingStock}
                    className="flex-1 py-2 text-center text-lg font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity((prev) => prev + 1)}
                    disabled={adjustingStock}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Incremental presets */}
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Ajouter rapidement :
                </span>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {[5, 10, 25, 50].map((inc) => (
                    <button
                      key={`preset-inc-${inc}`}
                      type="button"
                      onClick={() => setAdjustQuantity((prev) => prev + inc)}
                      disabled={adjustingStock}
                      className="py-1.5 rounded-lg text-xs font-semibold border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      +{inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct level presets */}
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Définir niveau fixe :
                </span>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity(0)}
                    disabled={adjustingStock}
                    className="py-1.5 rounded-lg text-xs font-semibold border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition"
                  >
                    0 (Rupture)
                  </button>
                  {[5, 10, 20].map((lvl) => (
                    <button
                      key={`preset-lvl-${lvl}`}
                      type="button"
                      onClick={() => setAdjustQuantity(lvl)}
                      disabled={adjustingStock}
                      className="py-1.5 rounded-lg text-xs font-semibold border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      {lvl} unités
                    </button>
                  ))}
                </div>
              </div>

              {/* Difference preview */}
              <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                Variation de stock :{' '}
                <strong
                  className={
                    adjustQuantity - toNumber(adjustTargetProduct.inventory_quantity) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {adjustQuantity - toNumber(adjustTargetProduct.inventory_quantity) >= 0
                    ? `+${adjustQuantity - toNumber(adjustTargetProduct.inventory_quantity)}`
                    : adjustQuantity - toNumber(adjustTargetProduct.inventory_quantity)}
                </strong>{' '}
                unités
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeAdjustModal}
                disabled={adjustingStock}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmStockAdjust()}
                disabled={adjustingStock}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs disabled:opacity-60"
              >
                {adjustingStock && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Enregistrer le stock</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
