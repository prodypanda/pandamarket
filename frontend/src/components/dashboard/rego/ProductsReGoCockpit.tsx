'use client';

import React, { Fragment, useState, useMemo } from 'react';
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
  Plus,
  Minus,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Check,
  ChevronDown,
  ArrowUpRight,
  DollarSign,
  Coins,
  Download,
  Tag,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  List,
  LayoutGrid,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getResizedImageUrl } from '@/lib/image-url';
import { getHubProductHref } from '@/lib/product-links';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from './ReGoPrimitives';
import type { Product, Category } from '@/app/hub/dashboard/products/page';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface ProductsReGoCockpitProps {
  products: Product[];
  loading: boolean;
  totalProducts: number;
  storeCounts: {
    total: number;
    published: number;
    draft: number;
    low_stock: number;
  };
  categories: Array<Pick<Category, 'id' | 'name'> & { level?: number }>;
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

  // View mode: dense table vs studio card grid
  viewMode: 'table' | 'grid';
  onViewModeChange: (v: 'table' | 'grid') => void;

  // Server-side filters (controlled by the page)
  search?: string;
  onSearchChange?: (v: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (v: string) => void;
  typeFilter?: string;
  onTypeFilterChange?: (v: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (v: string) => void;

  // Server pagination
  page?: number;
  totalPages?: number;
  limit?: number;
  onPageChange?: (p: number) => void;
  onLimitChange?: (l: number) => void;

  // Bulk selection & bulk actions
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (checked: boolean) => void;
  onBulkStatus?: (status: 'published' | 'draft' | 'archived') => void;
  onOpenBulkPrice?: () => void;
  onOpenBulkAiCategory?: () => void;
  onOpenBulkCategory?: () => void;
  onExportSelected?: () => void;
}

function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

const EMPTY_SELECTED_IDS: Set<string> = new Set();

function getProductTypeLabel(type?: string | null): string {
  switch (type) {
    case 'bundle':
      return 'Pack';
    case 'digital':
      return 'Numérique';
    case 'serial':
      return 'Licence';
    case 'service':
      return 'Prestation';
    default:
      return 'Physique';
  }
}

function getStatusChip(status: string): { status: 'ok' | 'warn' | 'err' | 'neutral' | 'info'; label: string } {
  switch (status) {
    case 'published':
    case 'active':
      return { status: 'ok', label: 'En vente' };
    case 'pending_approval':
      return { status: 'warn', label: 'En attente' };
    case 'rejected':
      return { status: 'err', label: 'Rejeté' };
    case 'archived':
      return { status: 'neutral', label: 'Archivé' };
    default:
      return { status: 'neutral', label: 'Brouillon' };
  }
}

export function ProductsReGoCockpit({
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
  viewMode,
  onViewModeChange,
  search = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  typeFilter = 'all',
  onTypeFilterChange,
  categoryFilter = 'all',
  onCategoryFilterChange,
  page = 1,
  totalPages = 1,
  limit = 20,
  onPageChange,
  onLimitChange,
  selectedIds = EMPTY_SELECTED_IDS,
  onToggleSelect,
  onToggleSelectAll,
  onBulkStatus,
  onOpenBulkPrice,
  onOpenBulkAiCategory,
  onOpenBulkCategory,
  onExportSelected,
}: ProductsReGoCockpitProps) {
  const { t } = useLocale();

  const [activeTab, setActiveTab] = useState<'all' | 'low_stock' | 'published'>('all');
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);

  // Stock Adjust Modal State
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [adjustingStock, setAdjustingStock] = useState(false);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const q = toNumber(p.inventory_quantity);
      return q <= 5;
    });
  }, [products]);

  // Collapsible stock deck — null means "auto": collapsed when there are no alerts
  const [stockDeckCollapsed, setStockDeckCollapsed] = useState<boolean | null>(null);
  const deckCollapsed = stockDeckCollapsed ?? lowStockProducts.length === 0;
  const toggleStockDeck = () => setStockDeckCollapsed(!deckCollapsed);

  // Inventory valuation
  const inventoryValuation = useMemo(() => {
    return products.reduce((sum, p) => {
      const price = toNumber(p.price);
      const stock = toNumber(p.inventory_quantity);
      return sum + price * stock;
    }, 0);
  }, [products]);

  // Quick-view tabs on the current server page — search/status/type/category
  // filters are owned by the page and applied server-side.
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (activeTab === 'low_stock') {
        const q = toNumber(product.inventory_quantity);
        if (q > 5) return false;
      } else if (activeTab === 'published') {
        if (product.status !== 'published' && product.status !== 'active') return false;
      }

      return true;
    });
  }, [products, activeTab]);

  const handleOpenStockModal = (product: Product) => {
    setStockModalProduct(product);
    setNewStockValue(toNumber(product.inventory_quantity));
  };

  const handleSaveStock = async () => {
    if (!stockModalProduct) return;
    setAdjustingStock(true);
    try {
      await onQuickAdjustStock(stockModalProduct, newStockValue);
      setStockModalProduct(null);
    } finally {
      setAdjustingStock(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingProduct(true);
    try {
      await onDeleteProduct(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setDeletingProduct(false);
    }
  };

  // ── Collapsible stock deck header (shared between expanded & collapsed layouts)
  const deckHeaderInner = (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
          Deck Alertes Stock ({lowStockProducts.length})
        </h3>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-extrabold">
          Seuil ≤ 5
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            deckCollapsed ? '' : 'rotate-180'
          }`}
        />
      </div>
    </>
  );

  // ── Stock alerts deck (left pane content, expanded state)
  const stockDeck = (
    <div className="space-y-4">
      <button
        type="button"
        onClick={toggleStockDeck}
        title={deckCollapsed ? 'Déployer le deck des alertes stock' : 'Replier le deck des alertes stock'}
        aria-expanded={!deckCollapsed}
        className="w-full flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer group"
      >
        {deckHeaderInner}
      </button>

      {lowStockProducts.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
          <p className="font-semibold">Niveaux de stocks optimaux !</p>
          <p className="text-[11px] mt-0.5">Aucun article ne risque la rupture immédiate.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
          {lowStockProducts.map((p) => {
            const stock = toNumber(p.inventory_quantity);
            const price = toNumber(p.price);
            const thumb = p.thumbnail || (p.images && p.images[0]?.url) || '';

            return (
              <div
                key={p.id}
                className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-700 transition shadow-2xs space-y-2"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {thumb ? (
                      <img src={getResizedImageUrl(thumb, 'thumbnail')} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-mono">SKU: {p.product_reference || '--'}</span>
                      <span>•</span>
                      <span className={`font-bold ${stock === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600'}`}>
                        {stock === 0 ? 'Rupture totale' : `${stock} en stock`}
                      </span>
                    </div>
                  </div>
                  <ReGoAmtBox amount={price} size="sm" />
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenStockModal(p)}
                    className="flex-1 py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-100 transition cursor-pointer text-center"
                  >
                    Ajuster stock
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditProduct(p)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Main working area (bulk bar + list header + table/grid views)
  const workingArea = (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-fg,#111111)] bg-[var(--rego-fg,#111111)] px-3.5 py-2 text-[var(--rego-bg,#ffffff)] shadow-lg">
          <div className="flex items-center gap-1.5 pe-2 me-1 border-e border-[var(--rego-border,#dedede)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-bold text-[11px]">
              {selectedIds.size}
            </span>
            <span className="text-xs font-medium hidden sm:inline">sélectionné(s)</span>
          </div>

          <button
            type="button"
            onClick={() => onBulkStatus?.('published')}
            title="Publier tous les produits sélectionnés"
            className="px-2.5 py-1 rounded-lg bg-[var(--rego-accent,#ad0505)] text-white text-xs font-medium hover:opacity-90 transition cursor-pointer"
          >
            Publier
          </button>
          <button
            type="button"
            onClick={() => onBulkStatus?.('draft')}
            title="Passer en brouillon"
            className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer"
          >
            Brouillon
          </button>
          <button
            type="button"
            onClick={() => onBulkStatus?.('archived')}
            title="Archiver"
            className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer hidden md:inline-block"
          >
            Archiver
          </button>

          <button
            type="button"
            onClick={() => onOpenBulkPrice?.()}
            title="Ajuster les prix en pourcentage ou montant fixe (ex: soldes)"
            className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer flex items-center gap-1.5"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Ajuster Prix</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenBulkAiCategory?.()}
            title="Classifier automatiquement les produits sélectionnés avec l'IA"
            className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Classifier IA</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenBulkCategory?.()}
            title="Assigner une catégorie Marketplace ou Vitrine à la sélection"
            className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer hidden lg:flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Catégories</span>
          </button>
          <button
            type="button"
            onClick={() => onExportSelected?.()}
            title="Exporter les produits sélectionnés en CSV"
            className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer hidden sm:flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleSelectAll?.(false)}
            title="Désélectionner tout"
            className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Désélectionner</span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={products.length > 0 && products.every((p) => selectedIds.has(p.id))}
            onChange={(e) => onToggleSelectAll?.(e.target.checked)}
            className="w-4 h-4 accent-[var(--rego-accent,#ad0505)] cursor-pointer"
            title="Sélectionner tous les produits de la page"
          />
          <Package className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {viewMode === 'table'
              ? `Registre des Articles (${filteredProducts.length})`
              : `Grille des Articles (${filteredProducts.length})`}
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          PandaMarket Catalogue
        </span>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold">Aucun produit trouvé</p>
          <p className="text-[11px] mt-0.5">Modifiez votre recherche ou ajoutez un nouveau produit.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* VUE TABLEAU DENSE */
        <div className="overflow-auto max-h-[620px] rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="sticky top-0 z-10 bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] uppercase font-bold tracking-wider text-[10px]">
                <th className="py-2.5 ps-3 pe-2 w-10">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && products.every((p) => selectedIds.has(p.id))}
                    onChange={(e) => onToggleSelectAll?.(e.target.checked)}
                    className="w-4 h-4 accent-[var(--rego-accent,#ad0505)] cursor-pointer"
                    title="Sélectionner tous les produits de la page"
                  />
                </th>
                <th className="py-2.5 px-3">Visuel &amp; Produit</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Prix</th>
                <th className="py-2.5 px-3">Stock</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-3">Catégories</th>
                <th className="py-2.5 px-3 pe-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
              {filteredProducts.map((p) => {
                const stock = toNumber(p.inventory_quantity);
                const price = toNumber(p.price);
                const thumb = p.thumbnail || (p.images && p.images[0]?.url) || '';
                const isLive = p.status === 'published' || p.status === 'active';
                const statusChip = getStatusChip(p.status);
                const isSelected = selectedIds.has(p.id);

                return (
                  <tr
                    key={p.id}
                    onClick={() => setInspectProduct(p)}
                    className={`cursor-pointer transition-colors hover:bg-[var(--rego-surface,#f5f5f5)]/50 ${
                      isSelected ? 'bg-[var(--rego-accent-soft,rgba(173,5,5,0.06))]' : ''
                    }`}
                  >
                    <td className="py-2.5 ps-3 pe-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-[var(--rego-accent,#ad0505)] cursor-pointer"
                        title="Sélectionner le produit"
                      />
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                          {thumb ? (
                            <img src={getResizedImageUrl(thumb, 'thumbnail')} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                            {p.title}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            SKU: {p.product_reference || '--'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {getProductTypeLabel(p.type)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <ReGoAmtBox amount={price} size="sm" />
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          stock === 0
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            : stock <= 5
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {stock === 0 ? 'Rupture' : `${stock} en stock`}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <ReGoStatusChip
                        status={isLive ? 'ok' : statusChip.status}
                        label={isLive ? 'En vente' : statusChip.label}
                        size="xs"
                      />
                    </td>

                    <td className="py-2.5 px-3 max-w-[180px]">
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                        {p.marketplace_category_name || p.category || 'Non classé'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {p.storefront_category_name || 'Vitrine générale'}
                      </p>
                    </td>

                    <td className="py-2.5 px-3 pe-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={getHubProductHref(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Voir en boutique"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenStockModal(p)}
                          title="Ajuster le stock"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditProduct(p)}
                          title="Modifier le produit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#ad0505] hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onStatusChange(p, isLive ? 'draft' : 'published')}
                          title={isLive ? 'Dépublier (passer en brouillon)' : 'Publier en boutique'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                        >
                          {isLive ? <Eye className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          title="Supprimer le produit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* VUE GRILLE STUDIO */
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            deckCollapsed ? 'xl:grid-cols-3' : ''
          } gap-3 max-h-[620px] overflow-y-auto pr-1`}
        >
          {filteredProducts.map((p) => {
            const stock = toNumber(p.inventory_quantity);
            const price = toNumber(p.price);
            const thumb = p.thumbnail || (p.images && p.images[0]?.url) || '';
            const isLive = p.status === 'published' || p.status === 'active';

            return (
              <div
                key={p.id}
                onClick={() => setInspectProduct(p)}
                className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs flex flex-col justify-between gap-3 ${
                  selectedIds.has(p.id)
                    ? 'border-[var(--rego-accent,#ad0505)]'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => onToggleSelect?.(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 mt-4 accent-[var(--rego-accent,#ad0505)] cursor-pointer shrink-0"
                    title="Sélectionner le produit"
                  />
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {thumb ? (
                      <img src={getResizedImageUrl(thumb, 'thumbnail')} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                      <span className="font-mono text-slate-500 dark:text-slate-400">SKU: {p.product_reference || '--'}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <ReGoStatusChip
                        status={isLive ? 'ok' : 'neutral'}
                        label={isLive ? 'En vente' : 'Brouillon'}
                        size="xs"
                      />
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        stock === 0
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                          : stock <= 5
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        Stock: {stock}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <ReGoAmtBox amount={price} size="sm" />
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={getHubProductHref(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Voir en boutique"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenStockModal(p)}
                      title="Ajuster le stock"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditProduct(p)}
                      title="Modifier le produit"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#ad0505] hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onStatusChange(p, isLive ? 'draft' : 'published')}
                      title={isLive ? 'Dépublier (passer en brouillon)' : 'Publier en boutique'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                    >
                      {isLive ? <Eye className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      title="Supprimer le produit"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* LAYER 4: Telemetry & KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ReGoKpiHero
          label="Total Catalogue"
          value={totalProducts}
          hint={
            limits?.maxProducts != null && limits.maxProducts !== -1
              ? `Quota formule : ${limits.currentProducts ?? totalProducts}/${limits.maxProducts}`
              : `${storeCounts.published} publiés en boutique`
          }
          icon={Package}
        />
        <ReGoKpiHero
          label="Valeur du Stock"
          value={<ReGoAmtBox amount={inventoryValuation} size="md" />}
          hint="Valorisation prix × quantité"
          icon={DollarSign}
        />
        <ReGoKpiHero
          label="Alertes Stock Critique"
          value={lowStockProducts.length}
          delta={lowStockProducts.length > 0 ? "Réappro requis" : "Stock sain"}
          deltaType={lowStockProducts.length === 0 ? "increase" : "decrease"}
          icon={AlertTriangle}
        />
        <ReGoKpiHero
          label="Taux de Disponibilité"
          value={`${totalProducts > 0 ? Math.round(((totalProducts - lowStockProducts.length) / totalProducts) * 100) : 100}%`}
          hint="Articles immédiatement expédiables"
          icon={CheckCircle2}
        />
      </div>

      {/* LAYER 3 (Conditional): Low stock alert banner */}
      {lowStockProducts.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <span>{lowStockProducts.length} article(s) sous le seuil d&apos;alerte de réapprovisionnement</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-extrabold uppercase">
                  Ajuster
                </span>
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Ajustez directement le stock en 1-clic pour éviter les annulations de commandes clients.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('low_stock')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <span>Voir les articles critiques</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LAYER 5: Control Bar & Filter Toolbar */}
      <ReGoCard className="p-3 sm:p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#ad0505] text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tous ({totalProducts})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('published')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'published'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              En Vente ({storeCounts.published})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('low_stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'low_stock'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Stock Critique ({lowStockProducts.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange?.(e.target.value)}
              className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] focus:outline-none cursor-pointer"
              title="Filtrer par statut"
            >
              <option value="all">Tous les Statuts</option>
              <option value="published">Publiés</option>
              <option value="draft">Brouillons</option>
              <option value="archived">Archivés</option>
              <option value="pending_approval">En attente</option>
              <option value="low_stock">Stock Faible (≤5)</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange?.(e.target.value)}
              className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] focus:outline-none cursor-pointer"
              title="Filtrer par type"
            >
              <option value="all">Tous les Types</option>
              <option value="physical">Physique</option>
              <option value="bundle">Pack Promo (Lot)</option>
              <option value="digital">Numérique</option>
              <option value="serial">Licence / Série</option>
              <option value="service">Prestation</option>
            </select>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => onCategoryFilterChange?.(e.target.value)}
                className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] focus:outline-none cursor-pointer max-w-[160px]"
                title="Filtrer par catégorie"
              >
                <option value="all">Toutes les Catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.level && c.level > 0 ? `${'\u00A0\u00A0'.repeat(c.level)}└─ ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* View Mode Toggle (Dense table vs studio grid) */}
            <div className="flex items-center rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onViewModeChange('table')}
                title="Vue Tableau Dense"
                aria-label="Vue Tableau Dense"
                aria-pressed={viewMode === 'table'}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]'
                    : 'text-[var(--rego-ink-3,#949494)] hover:text-[var(--rego-ink-2,#737373)]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                title="Vue Grille Studio"
                aria-label="Vue Grille Studio"
                aria-pressed={viewMode === 'grid'}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]'
                    : 'text-[var(--rego-ink-3,#949494)] hover:text-[var(--rego-ink-2,#737373)]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Rechercher par nom, SKU, catégorie..."
                className="w-full ps-9 pe-8 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] focus:outline-none focus:ring-2 focus:ring-[var(--rego-accent,#ad0505)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)] hover:text-[var(--rego-ink-2,#737373)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onCreateProduct}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ad0505] hover:bg-[#8f0404] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nouveau Produit</span>
            </button>

            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </ReGoCard>

      {/* LAYER 6: Main Operational Working Area */}
      {deckCollapsed ? (
        <div className="space-y-4">
          {/* Deck replié : en-tête seul (carte fine pleine largeur) + zone de travail pleine largeur */}
          <button
            type="button"
            onClick={toggleStockDeck}
            title="Déployer le deck des alertes stock"
            aria-expanded={false}
            className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] px-4 py-2.5 flex items-center justify-between gap-3 transition-all hover:border-amber-400/70 dark:hover:border-amber-700/60 cursor-pointer"
          >
            {deckHeaderInner}
          </button>
          <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] p-4">
            {workingArea}
          </div>
        </div>
      ) : (
        <ReGoSplitCard left={stockDeck} right={workingArea} />
      )}

      {/* Pagination Footer */}
      <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-4 py-3 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-[var(--rego-ink-2,#737373)]">
            Affichage {totalProducts === 0 ? 0 : (page - 1) * limit + 1} à {Math.min(page * limit, totalProducts)} sur {totalProducts} références
          </span>
          <div className="flex items-center gap-1.5 ps-3 border-s border-[var(--rego-border,#dedede)]">
            <span className="text-[11px] text-[var(--rego-ink-3,#949494)]">Par page :</span>
            <select
              value={limit}
              onChange={(e) => {
                onLimitChange?.(Number(e.target.value));
                onPageChange?.(1);
              }}
              className="px-2 py-0.5 rounded-lg border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 transition cursor-pointer"
          >
            Précédent
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((pNum) => pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 2)
            .map((pNum, idx, arr) => {
              const prevNum = arr[idx - 1];
              const showEllipsis = prevNum && pNum - prevNum > 1;
              return (
                <Fragment key={pNum}>
                  {showEllipsis && <span className="px-1 text-[var(--rego-ink-3,#949494)]">...</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange?.(pNum)}
                    disabled={loading}
                    className={`h-7 w-7 rounded-lg font-medium text-xs flex items-center justify-center transition cursor-pointer ${
                      page === pNum
                        ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                        : 'border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                    }`}
                  >
                    {pNum}
                  </button>
                </Fragment>
              );
            })}

          <button
            type="button"
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 transition cursor-pointer"
          >
            Suivant
          </button>
        </div>
      </div>

      {/* Stock Adjust Modal */}
      <ReGoModal
        isOpen={Boolean(stockModalProduct)}
        onClose={() => setStockModalProduct(null)}
        title="Ajustement Rapide du Stock"
      >
        {stockModalProduct && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Modifier la quantité en stock pour <span className="font-bold text-slate-900 dark:text-white">{stockModalProduct.title}</span>.
            </p>
            <div className="flex items-center justify-center gap-3 py-3">
              <button
                type="button"
                onClick={() => setNewStockValue(Math.max(0, newStockValue - 1))}
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="0"
                value={newStockValue}
                onChange={(e) => setNewStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 text-center font-mono text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 focus:ring-2 focus:ring-[#ad0505] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setNewStockValue(newStockValue + 1)}
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleSaveStock()}
                disabled={adjustingStock}
                className="flex-1 py-2.5 rounded-xl bg-[#ad0505] hover:bg-[#8f0404] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {adjustingStock ? 'Enregistrement...' : 'Valider'}
              </button>
            </div>
          </div>
        )}
      </ReGoModal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        title="Supprimer le produit"
        description={`Voulez-vous vraiment supprimer « ${deleteTarget?.title || ''} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        loading={deletingProduct}
      />

      {/* Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(inspectProduct)}
        onClose={() => setInspectProduct(null)}
        title={inspectProduct ? (inspectProduct.title || 'Détails du produit') : ''}
        subtitle={inspectProduct ? `SKU: ${inspectProduct.product_reference || '--'}` : ''}
      >
        {inspectProduct && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Informations Financières
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Prix unitaire</span>
                <ReGoAmtBox amount={toNumber(inspectProduct.price)} size="md" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Quantité en stock</span>
                <span className="text-xs font-bold">{toNumber(inspectProduct.inventory_quantity)} unités</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onEditProduct(inspectProduct);
                  setInspectProduct(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#ad0505] hover:bg-[#8f0404] text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier la fiche</span>
              </button>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
