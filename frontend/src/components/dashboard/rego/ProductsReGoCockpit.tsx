'use client';

import React, { useState, useMemo } from 'react';
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
  ArrowUpRight,
  DollarSign,
  Tag,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getResizedImageUrl } from '@/lib/image-url';
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
}: ProductsReGoCockpitProps) {
  const { t } = useLocale();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
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

  // Inventory valuation
  const inventoryValuation = useMemo(() => {
    return products.reduce((sum, p) => {
      const price = toNumber(p.price);
      const stock = toNumber(p.inventory_quantity);
      return sum + price * stock;
    }, 0);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (activeTab === 'low_stock') {
        const q = toNumber(product.inventory_quantity);
        if (q > 5) return false;
      } else if (activeTab === 'published') {
        if (product.status !== 'published' && product.status !== 'active') return false;
      }

      if (selectedStatus !== 'all') {
        if (selectedStatus === 'published' && product.status !== 'published' && product.status !== 'active') return false;
        if (selectedStatus === 'draft' && product.status !== 'draft') return false;
        if (selectedStatus === 'archived' && product.status !== 'archived') return false;
      }

      if (selectedCategory !== 'all' && product.marketplace_category_id !== selectedCategory && product.storefront_category_id !== selectedCategory) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = (product.title || '').toLowerCase().includes(q);
        const skuMatch = (product.product_reference || '').toLowerCase().includes(q);
        if (!titleMatch && !skuMatch) return false;
      }

      return true;
    });
  }, [products, activeTab, selectedStatus, selectedCategory, search]);

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
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              title="Filtrer par statut"
            >
              <option value="all">Tous statuts</option>
              <option value="published">En vente</option>
              <option value="draft">Brouillons</option>
              <option value="archived">Archivés</option>
            </select>

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[160px]"
                title="Filtrer par catégorie"
              >
                <option value="all">Toutes catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, SKU..."
                className="w-full ps-9 pe-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#ad0505]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"
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
      <ReGoSplitCard
        left={
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Deck Alertes Stock ({lowStockProducts.length})
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-extrabold">
                Seuil ≤ 5
              </span>
            </div>

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
        }
        right={
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Grille des Articles ({filteredProducts.length})
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const stock = toNumber(p.inventory_quantity);
                  const price = toNumber(p.price);
                  const thumb = p.thumbnail || (p.images && p.images[0]?.url) || '';
                  const isLive = p.status === 'published' || p.status === 'active';

                  return (
                    <div
                      key={p.id}
                      onClick={() => setInspectProduct(p)}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
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
        }
      />

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
