'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  RefreshCw,
  Eye,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Store,
  Tag,
  Boxes,
  FileText,
  Globe,
  SlidersHorizontal,
  X,
  Plus,
  Loader2,
  Image as ImageIcon,
  DollarSign,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface StoreInfo {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  is_verified?: boolean;
  status?: string;
  seller_type?: string;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  slug?: string;
  parent_name?: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  position?: number;
  is_thumbnail?: boolean;
  alt_text?: string | null;
}

export interface ProductVariant {
  id: string;
  sku?: string | null;
  title: string;
  price: number | string;
  inventory_quantity: number;
  options?: Record<string, unknown>;
  is_active?: boolean;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface ProductRecord {
  id: string;
  store_id: string;
  product_type?: string;
  type?: string;
  status: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: string;
  product_reference?: string | null;
  price: number | string;
  inventory_quantity: number;
  weight_grams?: number | null;
  thumbnail?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  tags?: string[];
  interest_tags?: string[];
  interest_tags_synced_at?: string | null;
  attributes?: ProductAttribute[] | Record<string, unknown> | Array<{ name?: string; value?: string; key?: string }> | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
  variants_count?: number;
  rejection_reason?: string | null;
  marketplace_category_id?: string;
  marketplace_category_name?: string;
  marketplace_category_slug?: string;
  marketplace_category?: { id: string; name: string; slug: string } | null;
  storefront_category_id?: string;
  storefront_category_name?: string;
  store?: StoreInfo;
  created_at?: string;
  updated_at?: string;
}

export interface MetricsSummary {
  total_products: number;
  published_count: number;
  pending_count: number;
  draft_count: number;
  rejected_count: number;
  archived_count: number;
  out_of_stock_count: number;
  low_stock_count: number;
  ai_tagged_count: number;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface AdminReGoProductsProps {
  products: ProductRecord[];
  categories: CategoryOption[];
  metrics: MetricsSummary;
  pagination: PaginationState;
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  categoryId: string;
  onCategoryChange: (val: string) => void;
  stockStatus: string;
  onStockChange: (val: string) => void;
  productType: string;
  onTypeChange: (val: string) => void;
  sortBy: string;
  onSortChange: (val: string) => void;
  onClearFilters: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onSelectProduct: (p: ProductRecord) => void;
  selectedProduct: ProductRecord | null;
  onCloseDrawer: () => void;
  onRefresh: () => void;
  onCopyId: (id: string, e: React.MouseEvent) => void;
  copiedId: string | null;
  vendorTags: string[];
  interestTags: string[];
  targetTagType: 'vendor' | 'ai';
  onTargetTagTypeChange: (type: 'vendor' | 'ai') => void;
  newTagInput: string;
  onNewTagInputChange: (val: string) => void;
  onAddTag: () => void;
  onRemoveVendorTag: (index: number) => void;
  onRemoveInterestTag: (index: number) => void;
  onSaveTags: () => Promise<void>;
  savingTags: boolean;
  tagSaveSuccess: boolean;
  tagSaveError: string | null;
  drawerTab: 'overview' | 'variants' | 'specs' | 'seo' | 'store' | 'tags';
  onDrawerTabChange: (tab: 'overview' | 'variants' | 'specs' | 'seo' | 'store' | 'tags') => void;
}

function toNumber(val: unknown): number {
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : 0;
}

export function AdminReGoProducts({
  products,
  categories,
  metrics,
  pagination,
  loading,
  error,
  search,
  onSearchChange,
  status,
  onStatusChange,
  categoryId,
  onCategoryChange,
  stockStatus,
  onStockChange,
  productType,
  onTypeChange,
  sortBy,
  onSortChange,
  onClearFilters,
  onNextPage,
  onPrevPage,
  onSelectProduct,
  selectedProduct,
  onCloseDrawer,
  onRefresh,
  onCopyId,
  copiedId,
  vendorTags,
  interestTags,
  targetTagType,
  onTargetTagTypeChange,
  newTagInput,
  onNewTagInputChange,
  onAddTag,
  onRemoveVendorTag,
  onRemoveInterestTag,
  onSaveTags,
  savingTags,
  tagSaveSuccess,
  tagSaveError,
  drawerTab,
  onDrawerTabChange,
}: AdminReGoProductsProps) {
  const getProductCategoryName = (prod: ProductRecord) => {
    return (
      prod.marketplace_category?.name ||
      prod.marketplace_category_name ||
      prod.category ||
      'Sans catégorie'
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Modération & Catalogue Produits Global
              </h1>
              <ReGoStatusChip
                status="neutral"
                label={`${metrics.total_products} articles`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Supervision des fiches articles de la place de marché · Contrôle qualité, modération et détection de conformité
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* 2. Error banner */}
      {error && (
        <div className="rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Telemetry KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ReGoKpiHero
          label="Total Articles"
          value={metrics.total_products}
          hint={`${metrics.published_count} fiches en ligne`}
          accent
          icon={Package}
        />
        <ReGoKpiHero
          label="Articles Publiés"
          value={metrics.published_count}
          hint="Disponibles à l'achat"
          icon={CheckCircle2}
        />
        <ReGoKpiHero
          label="En Attente / Brouillon"
          value={metrics.pending_count + metrics.draft_count}
          hint={`${metrics.pending_count} en modération, ${metrics.draft_count} brouillons`}
          icon={SlidersHorizontal}
        />
        <ReGoKpiHero
          label="Rupture & Stock Bas"
          value={metrics.out_of_stock_count + metrics.low_stock_count}
          hint={`${metrics.out_of_stock_count} épuisés, ${metrics.low_stock_count} alertes`}
          icon={Boxes}
        />
      </div>

      {/* 4. Filter Toolbar */}
      <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3.5 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher article, SKU, référence..."
              className="w-full ps-9 pe-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] focus:border-[var(--rego-accent,#ad0505)] outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] focus:border-[var(--rego-accent,#ad0505)] outline-none cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publié</option>
              <option value="pending_approval">En attente</option>
              <option value="draft">Brouillon</option>
              <option value="rejected">Rejeté</option>
              <option value="archived">Archivé</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              value={categoryId}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] focus:border-[var(--rego-accent,#ad0505)] outline-none cursor-pointer"
            >
              <option value="">Toutes catégories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.parent_name ? `${cat.parent_name} > ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div className="lg:col-span-2">
            <select
              value={stockStatus}
              onChange={(e) => onStockChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] focus:border-[var(--rego-accent,#ad0505)] outline-none cursor-pointer"
            >
              <option value="all">Tous stocks</option>
              <option value="in_stock">En stock</option>
              <option value="low_stock">Stock faible (≤ 5)</option>
              <option value="out_of_stock">Rupture de stock</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] focus:border-[var(--rego-accent,#ad0505)] outline-none cursor-pointer"
            >
              <option value="newest">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </div>
        </div>

        {(search || status !== 'all' || categoryId || stockStatus !== 'all' || sortBy !== 'newest') && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--rego-border,#dedede)]/60 text-xs">
            <span className="text-[var(--rego-ink-2,#737373)]">
              Filtres actifs appliqués ({pagination.total} résultat{pagination.total > 1 ? 's' : ''})
            </span>
            <button
              type="button"
              onClick={onClearFilters}
              className="text-[var(--rego-accent,#ad0505)] hover:underline font-bold cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* 5. Main Products Table */}
      <ReGoCard noPadding>
        {loading ? (
          <div className="p-12 text-center text-[var(--rego-ink-2,#737373)]">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[var(--rego-accent,#ad0505)]" />
            <p className="text-xs font-bold mt-2">Chargement du catalogue...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-[var(--rego-ink-2,#737373)] space-y-2">
            <Package className="w-10 h-10 mx-auto text-[var(--rego-ink-3,#949494)]" />
            <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              Aucun produit ne correspond à ces critères
            </h3>
            <p className="text-xs text-[var(--rego-ink-2,#737373)]">
              Modifiez votre recherche ou réinitialisez les filtres pour afficher l&apos;ensemble du catalogue.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-[var(--rego-border,#dedede)] text-[11px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                    <th className="px-3 py-2.5">Article & SKU</th>
                    <th className="px-3 py-2.5">Boutique Marchande</th>
                    <th className="px-3 py-2.5">Catégorie</th>
                    <th className="px-3 py-2.5">Prix & Stock</th>
                    <th className="px-3 py-2.5">Statut</th>
                    <th className="px-3 py-2.5">Tags & IA</th>
                    <th className="px-3 py-2.5 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                  {products.map((prod) => {
                    const priceNum = toNumber(prod.price);
                    const isOutOfStock = prod.inventory_quantity <= 0;
                    const isLowStock = prod.inventory_quantity > 0 && prod.inventory_quantity <= 5;
                    const vendorTagCount = Array.isArray(prod.tags) ? prod.tags.length : 0;
                    const aiTagCount = Array.isArray(prod.interest_tags) ? prod.interest_tags.length : 0;

                    return (
                      <tr
                        key={prod.id}
                        className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors"
                      >
                        {/* 1. Article & SKU */}
                        <td className="px-3 py-2.5 max-w-[260px]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] overflow-hidden bg-slate-50 dark:bg-slate-900 shrink-0 flex items-center justify-center">
                              {prod.thumbnail ? (
                                <img
                                  src={prod.thumbnail}
                                  alt={prod.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-[var(--rego-fg,#111111)] truncate" title={prod.title}>
                                {prod.title}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[var(--rego-ink-2,#737373)] font-mono">
                                <span>{prod.product_reference || prod.slug}</span>
                                {prod.variants_count !== undefined && prod.variants_count > 1 && (
                                  <span className="text-[10px] px-1 rounded bg-slate-100 dark:bg-slate-800 font-sans">
                                    {prod.variants_count} var.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Boutique */}
                        <td className="px-3 py-2.5">
                          {prod.store ? (
                            <div>
                              <div className="font-bold text-xs text-[var(--rego-fg,#111111)] flex items-center gap-1">
                                <Store className="w-3 h-3 text-[var(--rego-accent,#ad0505)]" />
                                <span className="truncate">{prod.store.name}</span>
                              </div>
                              <span className="text-[10px] text-[var(--rego-ink-3,#949494)] font-mono block">
                                {prod.store.subdomain}.pandamarket.tn
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--rego-ink-3,#949494)]">Non assignée</span>
                          )}
                        </td>

                        {/* 3. Catégorie */}
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-[var(--rego-fg,#111111)] font-medium">
                            {getProductCategoryName(prod)}
                          </span>
                        </td>

                        {/* 4. Prix & Stock */}
                        <td className="px-3 py-2.5">
                          <ReGoAmtBox amount={priceNum} size="sm" />
                          <div className="mt-0.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isOutOfStock
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                  : isLowStock
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                  : 'text-[var(--rego-ink-2,#737373)]'
                              }`}
                            >
                              {isOutOfStock
                                ? 'Épuisé'
                                : `${prod.inventory_quantity} en stock`}
                            </span>
                          </div>
                        </td>

                        {/* 5. Statut */}
                        <td className="px-3 py-2.5">
                          <ReGoStatusChip
                            status={
                              prod.status === 'published'
                                ? 'ok'
                                : prod.status === 'pending_approval'
                                ? 'warn'
                                : prod.status === 'draft'
                                ? 'neutral'
                                : 'err'
                            }
                            label={
                              prod.status === 'published'
                                ? 'Publié'
                                : prod.status === 'pending_approval'
                                ? 'En attente'
                                : prod.status === 'draft'
                                ? 'Brouillon'
                                : prod.status === 'rejected'
                                ? 'Rejeté'
                                : 'Archivé'
                            }
                            size="xs"
                          />
                        </td>

                        {/* 6. Tags & IA */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {vendorTagCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                <Tag className="w-2.5 h-2.5" />
                                {vendorTagCount}
                              </span>
                            )}
                            {aiTagCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                <Sparkles className="w-2.5 h-2.5" />
                                {aiTagCount} IA
                              </span>
                            )}
                            {vendorTagCount === 0 && aiTagCount === 0 && (
                              <span className="text-[11px] text-[var(--rego-ink-3,#949494)]">Sans tags</span>
                            )}
                          </div>
                        </td>

                        {/* 7. Actions */}
                        <td className="px-3 py-2.5 text-end">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectProduct(prod)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspecter</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => onCopyId(prod.id, e)}
                              title="Copier l'identifiant produit"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              {copiedId === prod.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <Link
                              href={`/hub/products/${prod.id}`}
                              target="_blank"
                              title="Voir la fiche sur la marketplace"
                              className="p-1 rounded text-slate-400 hover:text-[var(--rego-accent,#ad0505)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--rego-border,#dedede)] text-xs text-[var(--rego-ink-2,#737373)]">
              <button
                type="button"
                onClick={onPrevPage}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>

              <span className="font-mono text-[11px]">
                Page <strong>{pagination.page}</strong> sur <strong>{pagination.total_pages}</strong> ({pagination.total} articles)
              </span>

              <button
                type="button"
                onClick={onNextPage}
                disabled={pagination.page >= pagination.total_pages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
              >
                <span>Suivant</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </ReGoCard>

      {/* 6. Product Detail ReGoDrawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedProduct)}
        onClose={onCloseDrawer}
        title={selectedProduct?.title || 'Fiche Produit'}
        subtitle={`Réf: ${selectedProduct?.product_reference || selectedProduct?.id || ''}`}
        width="max-w-2xl"
      >
        {selectedProduct && (
          <div className="space-y-5">
            {/* Drawer Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--rego-border,#dedede)] pb-2 overflow-x-auto text-xs">
              {(
                [
                  { key: 'overview', label: 'Aperçu Fiche' },
                  { key: 'tags', label: 'Tags & IA' },
                  { key: 'variants', label: 'Variantes' },
                  { key: 'specs', label: 'Attributs' },
                  { key: 'seo', label: 'SEO' },
                  { key: 'store', label: 'Boutique' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onDrawerTabChange(tab.key)}
                  className={`px-3 py-1.5 rounded-[var(--rego-r,6px)] font-bold transition-all cursor-pointer ${
                    drawerTab === tab.key
                      ? 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {drawerTab === 'overview' && (
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-24 h-24 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] overflow-hidden bg-slate-50 dark:bg-slate-900 shrink-0">
                    {selectedProduct.thumbnail ? (
                      <img
                        src={selectedProduct.thumbnail}
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
                      {selectedProduct.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <ReGoAmtBox amount={toNumber(selectedProduct.price)} size="md" />
                      <ReGoStatusChip
                        status={selectedProduct.status === 'published' ? 'ok' : 'warn'}
                        label={selectedProduct.status}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs text-[var(--rego-ink-2,#737373)] font-mono">
                      Quantité : <strong>{selectedProduct.inventory_quantity}</strong> en stock
                    </p>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div className="rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] p-3 text-xs text-[var(--rego-fg,#111111)] whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedProduct.description}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] p-2.5">
                    <span className="text-[10px] text-[var(--rego-ink-3,#949494)] uppercase font-bold block">
                      Catégorie
                    </span>
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      {getProductCategoryName(selectedProduct)}
                    </span>
                  </div>
                  <div className="rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] p-2.5">
                    <span className="text-[10px] text-[var(--rego-ink-3,#949494)] uppercase font-bold block">
                      Poids
                    </span>
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      {selectedProduct.weight_grams ? `${selectedProduct.weight_grams} g` : 'Non renseigné'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Tags & IA */}
            {drawerTab === 'tags' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-1 rounded-[var(--rego-r,6px)] bg-[var(--rego-surface,#f5f5f5)]">
                  <button
                    type="button"
                    onClick={() => onTargetTagTypeChange('vendor')}
                    className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer ${
                      targetTagType === 'vendor'
                        ? 'bg-white dark:bg-slate-900 shadow-2xs text-[var(--rego-fg,#111111)]'
                        : 'text-[var(--rego-ink-2,#737373)]'
                    }`}
                  >
                    Tags Marchand ({vendorTags.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => onTargetTagTypeChange('ai')}
                    className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer ${
                      targetTagType === 'ai'
                        ? 'bg-white dark:bg-slate-900 shadow-2xs text-[var(--rego-accent,#ad0505)]'
                        : 'text-[var(--rego-ink-2,#737373)]'
                    }`}
                  >
                    Tags IA / Centres d&apos;Intérêt ({interestTags.length})
                  </button>
                </div>

                {/* Add tag form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => onNewTagInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
                    placeholder="Nouveau tag..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={onAddTag}
                    className="px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-slate-900 text-white text-xs font-bold hover:bg-black cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Tag Pills Display */}
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {targetTagType === 'vendor' ? (
                    vendorTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-1 rounded"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveVendorTag(idx)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    interestTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveInterestTag(idx)}
                          className="text-indigo-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Save tags button */}
                <div className="pt-2 border-t border-[var(--rego-border,#dedede)] flex items-center justify-between">
                  {tagSaveSuccess && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Enregistré !
                    </span>
                  )}
                  {tagSaveError && (
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">{tagSaveError}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void onSaveTags()}
                    disabled={savingTags}
                    className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:bg-[var(--rego-accent-dark,#880404)] disabled:opacity-50 cursor-pointer"
                  >
                    {savingTags ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Enregistrer les tags</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Variants */}
            {drawerTab === 'variants' && (
              <div className="space-y-3">
                {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                  <div className="divide-y divide-[var(--rego-border,#dedede)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)] overflow-hidden">
                    {selectedProduct.variants.map((v) => (
                      <div key={v.id} className="p-3 text-xs flex items-center justify-between bg-white dark:bg-slate-900">
                        <div>
                          <div className="font-bold text-[var(--rego-fg,#111111)]">{v.title}</div>
                          <div className="text-[10px] text-[var(--rego-ink-3,#949494)] font-mono">
                            SKU: {v.sku || 'N/A'}
                          </div>
                        </div>
                        <div className="text-end">
                          <ReGoAmtBox amount={toNumber(v.price)} size="sm" />
                          <span className="text-[10px] text-[var(--rego-ink-2,#737373)] block">
                            {v.inventory_quantity} en stock
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--rego-ink-2,#737373)] text-center py-6">
                    Cet article ne possède pas de déclinaisons de variantes.
                  </p>
                )}
              </div>
            )}

            {/* Tab: Specs / Attributes */}
            {drawerTab === 'specs' && (
              <div className="space-y-3">
                {(() => {
                  const attrs = selectedProduct.attributes;
                  const entries: Array<{ name: string; value: string }> = [];
                  if (Array.isArray(attrs)) {
                    for (const a of attrs) {
                      if (a && typeof a === 'object' && 'name' in (a as object)) {
                        const obj = a as { name?: unknown; key?: unknown; value?: unknown };
                        entries.push({ name: String(obj.name ?? obj.key ?? ''), value: String(obj.value ?? '') });
                      }
                    }
                  } else if (attrs && typeof attrs === 'object') {
                    for (const [k, v] of Object.entries(attrs as Record<string, unknown>)) {
                      entries.push({ name: k, value: String(v ?? '') });
                    }
                  }

                  if (entries.length === 0) {
                    return (
                      <p className="text-xs text-[var(--rego-ink-2,#737373)] text-center py-6">
                        Aucun attribut technique déclaré pour cet article.
                      </p>
                    );
                  }

                  return (
                    <div className="divide-y divide-[var(--rego-border,#dedede)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)] overflow-hidden">
                      {entries.map((attr, idx) => (
                        <div key={`${attr.name}-${idx}`} className="p-3 text-xs flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                          <span className="font-bold text-[var(--rego-ink-2,#737373)]">{attr.name}</span>
                          <span className="font-semibold text-[var(--rego-fg,#111111)] text-end">{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tab: Store */}
            {drawerTab === 'store' && (
              <div className="space-y-3">
                {selectedProduct.store ? (
                  <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[var(--rego-fg,#111111)]">
                        {selectedProduct.store.name}
                      </span>
                      <ReGoStatusChip
                        status={selectedProduct.store.is_verified ? 'ok' : 'neutral'}
                        label={selectedProduct.store.is_verified ? 'Vérifiée' : 'Standard'}
                        size="xs"
                      />
                    </div>
                    <div className="text-[11px] text-[var(--rego-ink-2,#737373)] font-mono">
                      Domaine : {selectedProduct.store.subdomain}.pandamarket.tn
                    </div>
                    {selectedProduct.store.owner_email && (
                      <div className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                        Propriétaire : {selectedProduct.store.owner_email}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--rego-ink-2,#737373)] text-center py-6">
                    Information boutique non disponible.
                  </p>
                )}
              </div>
            )}

            {/* Tab: SEO */}
            {drawerTab === 'seo' && (
              <div className="space-y-3 text-xs">
                <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] p-3">
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-3,#949494)] block">
                    Titre SEO
                  </span>
                  <p className="font-bold text-[var(--rego-fg,#111111)] mt-1">
                    {selectedProduct.seo_title || selectedProduct.title}
                  </p>
                </div>
                <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] p-3">
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-3,#949494)] block">
                    Méta-description
                  </span>
                  <p className="text-[var(--rego-ink-2,#737373)] mt-1">
                    {selectedProduct.seo_description || 'Non renseignée'}
                  </p>
                </div>
                <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] p-3">
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-3,#949494)] block">
                    Slug URL
                  </span>
                  <p className="font-mono text-[11px] text-[var(--rego-accent,#ad0505)] mt-1">
                    /hub/products/{selectedProduct.slug}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
