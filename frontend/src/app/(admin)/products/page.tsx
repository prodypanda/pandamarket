'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { fetchWithCsrf } from '@/lib/api';
import { getStorefrontUrl } from '@/lib/store-hosts';
import { getResizedImageUrl } from '@/lib/image-url';
import { useLocale } from '@/contexts/LocaleContext';
import {
  Package,
  Search,
  Table as TableIcon,
  Grid as GridIcon,
  Filter,
  Eye,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Tag,
  Boxes,
  Layers,
  FileText,
  Globe,
  Store,
  X,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  ArrowUpDown,
  ShoppingBag,
} from 'lucide-react';

// ─── Type Definitions ────────────────────────────────────────────────────────

interface StoreInfo {
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

interface CategoryOption {
  id: string;
  name: string;
  slug?: string;
  parent_name?: string | null;
}

interface ProductImage {
  id: string;
  product_id?: string;
  url: string;
  position?: number;
  is_thumbnail?: boolean;
  alt_text?: string | null;
}

interface ProductVariant {
  id: string;
  product_id?: string;
  sku?: string | null;
  title: string;
  price: number | string;
  inventory_quantity: number;
  options?: Record<string, unknown>;
  is_active?: boolean;
  created_at?: string;
}

interface ProductAttribute {
  name: string;
  value: string;
}

interface ProductRecord {
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

interface MetricsSummary {
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

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const { t, locale, dir } = useLocale();

  // Data state
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary>({
    total_products: 0,
    published_count: 0,
    pending_count: 0,
    draft_count: 0,
    rejected_count: 0,
    archived_count: 0,
    out_of_stock_count: 0,
    low_stock_count: 0,
    ai_tagged_count: 0,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [productType, setProductType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Interactive Drawer
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'variants' | 'specs' | 'seo' | 'store' | 'tags'>('overview');
  const [vendorTags, setVendorTags] = useState<string[]>([]);
  const [interestTags, setInterestTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [targetTagType, setTargetTagType] = useState<'vendor' | 'ai'>('vendor');
  const [savingTags, setSavingTags] = useState(false);
  const [tagSaveSuccess, setTagSaveSuccess] = useState(false);
  const [tagSaveError, setTagSaveError] = useState<string | null>(null);

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Fetch Categories ─────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        const res = await fetchWithCsrf('/api/pd/admin/categories');
        if (res.ok && active) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setCategories(json.data);
            return;
          }
        }
        // Fallback endpoint
        const fallbackRes = await fetchWithCsrf('/api/pd/marketplace-categories');
        if (fallbackRes.ok && active) {
          const fbJson = await fallbackRes.json();
          if (fbJson.data && Array.isArray(fbJson.data)) {
            setCategories(fbJson.data);
          }
        }
      } catch {
        // Ignored, category selector will rely on fallback options
      }
    }
    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  // ─── Fetch Catalog Data ───────────────────────────────────────────────────

  const loadData = useCallback(
    async (overrides?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      categoryId?: string;
      stockStatus?: string;
      productType?: string;
      sortBy?: string;
    }) => {
      setLoading(true);
      setError(null);

      try {
        const p = overrides?.page !== undefined ? overrides.page : pagination.page;
        const l = overrides?.limit !== undefined ? overrides.limit : pagination.limit;
        const s = overrides?.search !== undefined ? overrides.search : search;
        const st = overrides?.status !== undefined ? overrides.status : status;
        const cat = overrides?.categoryId !== undefined ? overrides.categoryId : categoryId;
        const stock = overrides?.stockStatus !== undefined ? overrides.stockStatus : stockStatus;
        const pt = overrides?.productType !== undefined ? overrides.productType : productType;
        const sort = overrides?.sortBy !== undefined ? overrides.sortBy : sortBy;

        const params = new URLSearchParams();
        params.set('page', String(p));
        params.set('limit', String(l));
        if (s && s.trim()) params.set('search', s.trim());
        if (st && st !== 'all') params.set('status', st);
        if (cat) params.set('marketplace_category_id', cat);
        if (stock && stock !== 'all') params.set('stock_status', stock);
        if (pt && pt !== 'all') params.set('product_type', pt);

        if (sort === 'price_asc') {
          params.set('sort_by', 'price');
          params.set('sort_order', 'asc');
        } else if (sort === 'price_desc') {
          params.set('sort_by', 'price');
          params.set('sort_order', 'desc');
        } else if (sort === 'oldest') {
          params.set('sort_by', 'created_at');
          params.set('sort_order', 'asc');
        } else {
          params.set('sort_by', 'created_at');
          params.set('sort_order', 'desc');
        }

        const res = await fetchWithCsrf(`/api/pd/admin/products?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || t('admin.products.loadError') || 'Failed to load products');
        }

        const json = await res.json();
        const records: ProductRecord[] = json.data || [];
        setProducts(records);

        if (json.pagination) {
          setPagination({
            page: json.pagination.page,
            limit: json.pagination.limit,
            total: json.pagination.total,
            total_pages: json.pagination.total_pages || Math.ceil((json.pagination.total || 0) / json.pagination.limit) || 1,
          });
        } else if (json.meta) {
          setPagination({
            page: json.meta.page,
            limit: json.meta.limit,
            total: json.meta.total,
            total_pages: json.meta.total_pages || Math.ceil((json.meta.total || 0) / json.meta.limit) || 1,
          });
        }

        if (json.metrics) {
          setMetrics({
            total_products: json.metrics.total_products ?? 0,
            published_count: json.metrics.published_count ?? 0,
            pending_count: json.metrics.pending_count ?? 0,
            draft_count: json.metrics.draft_count ?? 0,
            rejected_count: json.metrics.rejected_count ?? 0,
            archived_count: json.metrics.archived_count ?? 0,
            out_of_stock_count: json.metrics.out_of_stock_count ?? 0,
            low_stock_count: json.metrics.low_stock_count ?? 0,
            ai_tagged_count: json.metrics.ai_tagged_count ?? 0,
          });
        } else if (json.meta?.summary) {
          setMetrics({
            total_products: json.meta.summary.total ?? 0,
            published_count: json.meta.summary.published ?? 0,
            pending_count: json.meta.summary.pending_approval ?? 0,
            draft_count: json.meta.summary.draft ?? 0,
            rejected_count: json.meta.summary.rejected ?? 0,
            archived_count: json.meta.summary.archived ?? 0,
            out_of_stock_count: json.meta.summary.out_of_stock ?? 0,
            low_stock_count: json.meta.summary.low_stock ?? 0,
            ai_tagged_count: json.meta.summary.ai_tagged ?? 0,
          });
        }
      } catch (err: any) {
        setError(err.message || 'Error loading products');
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, search, status, categoryId, stockStatus, productType, sortBy, t],
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      loadData({ search: val, page: 1 });
    }, 400);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    loadData({ status: newStatus, page: 1 });
  };

  const handleCategoryChange = (newCat: string) => {
    setCategoryId(newCat);
    loadData({ categoryId: newCat, page: 1 });
  };

  const handleStockChange = (newStock: string) => {
    setStockStatus(newStock);
    loadData({ stockStatus: newStock, page: 1 });
  };

  const handleTypeChange = (newType: string) => {
    setProductType(newType);
    loadData({ productType: newType, page: 1 });
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    loadData({ sortBy: newSort, page: 1 });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setCategoryId('');
    setStockStatus('all');
    setProductType('all');
    setSortBy('newest');
    loadData({
      search: '',
      status: 'all',
      categoryId: '',
      stockStatus: 'all',
      productType: 'all',
      sortBy: 'newest',
      page: 1,
    });
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.total_pages) {
      const nextPage = pagination.page + 1;
      setPagination((prev) => ({ ...prev, page: nextPage }));
      loadData({ page: nextPage });
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      const prevPage = pagination.page - 1;
      setPagination((prev) => ({ ...prev, page: prevPage }));
      loadData({ page: prevPage });
    }
  };

  // ─── Drawer & Tag Studio ──────────────────────────────────────────────────

  const openDrawer = (prod: ProductRecord) => {
    setSelectedProduct(prod);
    setVendorTags(Array.isArray(prod.tags) ? [...prod.tags] : []);
    setInterestTags(Array.isArray(prod.interest_tags) ? [...prod.interest_tags] : []);
    setDrawerTab('overview');
    setTagSaveSuccess(false);
    setTagSaveError(null);
    setNewTagInput('');
  };

  const closeDrawer = () => {
    setSelectedProduct(null);
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (targetTagType === 'vendor') {
      if (!vendorTags.includes(trimmed)) {
        setVendorTags([...vendorTags, trimmed]);
      }
    } else {
      if (!interestTags.includes(trimmed)) {
        setInterestTags([...interestTags, trimmed]);
      }
    }
    setNewTagInput('');
  };

  const handleRemoveVendorTag = (index: number) => {
    setVendorTags(vendorTags.filter((_, i) => i !== index));
  };

  const handleRemoveInterestTag = (index: number) => {
    setInterestTags(interestTags.filter((_, i) => i !== index));
  };

  const handleSaveTags = async () => {
    if (!selectedProduct) return;
    setSavingTags(true);
    setTagSaveSuccess(false);
    setTagSaveError(null);

    try {
      const res = await fetchWithCsrf(`/api/pd/admin/products/${selectedProduct.id}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: vendorTags,
          interest_tags: interestTags,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || t('admin.products.drawer.tags.error') || 'Failed to save tags');
      }

      const json = await res.json();
      setTagSaveSuccess(true);

      // Update product in local state
      const updatedTags = json.data?.tags || vendorTags;
      const updatedInterestTags = json.data?.interest_tags || interestTags;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, tags: updatedTags, interest_tags: updatedInterestTags }
            : p,
        ),
      );
      setSelectedProduct((prev) =>
        prev ? { ...prev, tags: updatedTags, interest_tags: updatedInterestTags } : null,
      );
    } catch (err: any) {
      setTagSaveError(err.message || 'Error saving tags');
    } finally {
      setSavingTags(false);
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatPriceTND = (price: number | string) => {
    const num = Number(price || 0);
    return `${num.toFixed(3)} TND`;
  };

  const getProductCategoryName = (prod: ProductRecord) => {
    return (
      prod.marketplace_category?.name ||
      prod.marketplace_category_name ||
      prod.category ||
      'General'
    );
  };

  const getProductType = (prod: ProductRecord) => {
    return prod.type || prod.product_type || 'physical';
  };

  const getAttributesList = (prod: ProductRecord): Array<{ name: string; value: string }> => {
    if (!prod.attributes) return [];
    if (Array.isArray(prod.attributes)) {
      return prod.attributes.map((attr: any) => ({
        name: attr.name || attr.key || 'Attribute',
        value: String(attr.value ?? ''),
      }));
    }
    if (typeof prod.attributes === 'object') {
      return Object.entries(prod.attributes).map(([k, v]) => ({
        name: k,
        value: typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''),
      }));
    }
    return [];
  };

  const getStoreUrl = (prod: ProductRecord) => {
    const base = getStorefrontUrl({
      subdomain: prod.store?.subdomain,
      customDomain: prod.store?.custom_domain,
    });
    return `${base}/products/${prod.slug}`;
  };

  const pageTitle =
    t('admin.products.title') && !t('admin.products.title').startsWith('admin.')
      ? t('admin.products.title')
      : 'Marketplace Products';

  const pageSubtitle =
    t('admin.products.subtitle') && !t('admin.products.subtitle').startsWith('admin.')
      ? t('admin.products.subtitle')
      : 'Superadmin catalog inspection, multi-store filtering, and AI interest tagging.';

  return (
    <div
      className="admin-products-container min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto"
      data-testid="admin-products-page"
      dir={dir}
    >
      {/* ─── Hero Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-red-50 text-[#B91C1C]">
              <Package className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900" data-testid="admin-products-header">
              {pageTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            {pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('common.retry') || 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ─── 9 Metrics Summary Counters ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5 sm:gap-3">
        {/* 1. Total */}
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center space-y-1 hover:border-slate-300 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {t('admin.products.metrics.total') || 'Total'}
          </div>
          <div className="text-xl font-black text-slate-900">{metrics.total_products}</div>
        </div>

        {/* 2. Published */}
        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 shadow-xs text-center space-y-1 hover:border-emerald-300 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            {t('admin.products.metrics.published') || 'Published'}
          </div>
          <div className="text-xl font-black text-emerald-800">{metrics.published_count}</div>
        </div>

        {/* 3. Pending */}
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 shadow-xs text-center space-y-1 hover:border-amber-300 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            {t('admin.products.metrics.pending') || 'Pending'}
          </div>
          <div className="text-xl font-black text-amber-800">{metrics.pending_count}</div>
        </div>

        {/* 4. Draft */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-xs text-center space-y-1 hover:border-slate-300 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {t('admin.products.metrics.draft') || 'Draft'}
          </div>
          <div className="text-xl font-black text-slate-700">{metrics.draft_count}</div>
        </div>

        {/* 5. Rejected */}
        <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80 shadow-xs text-center space-y-1 hover:border-rose-300 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
            {t('admin.products.metrics.rejected') || 'Rejected'}
          </div>
          <div className="text-xl font-black text-rose-800">{metrics.rejected_count}</div>
        </div>

        {/* 6. Archived */}
        <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-300/70 shadow-xs text-center space-y-1 hover:border-slate-400 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {t('admin.products.metrics.archived') || 'Archived'}
          </div>
          <div className="text-xl font-black text-slate-700">{metrics.archived_count}</div>
        </div>

        {/* 7. Out of Stock */}
        <div className="p-3 bg-red-50/80 rounded-xl border border-red-200/80 shadow-xs text-center space-y-1 hover:border-red-300 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-700">
            {t('admin.products.metrics.outOfStock') || 'Out of Stock'}
          </div>
          <div className="text-xl font-black text-red-800">{metrics.out_of_stock_count}</div>
        </div>

        {/* 8. Low Stock */}
        <div className="p-3 bg-yellow-50/80 rounded-xl border border-yellow-200/80 shadow-xs text-center space-y-1 hover:border-yellow-300 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-yellow-700">
            {t('admin.products.metrics.lowStock') || 'Low Stock'}
          </div>
          <div className="text-xl font-black text-yellow-800">{metrics.low_stock_count}</div>
        </div>

        {/* 9. AI Tagged */}
        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200/80 shadow-xs text-center space-y-1 hover:border-indigo-300 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>{t('admin.products.metrics.aiTagged') || 'AI Tagged'}</span>
          </div>
          <div className="text-xl font-black text-indigo-800">{metrics.ai_tagged_count}</div>
        </div>
      </div>

      {/* ─── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-red-800 text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shrink-0"
          >
            {t('common.retry') || 'Retry'}
          </button>
        </div>
      )}

      {/* ─── Universal Search, Filters & View Toggle Bar ─────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Row 1: Search + Status Tabs + View Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Universal Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={
                t('admin.products.search.placeholder') ||
                'Search products, SKU, tags, or stores...'
              }
              className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:border-[#B91C1C] transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: t('admin.products.statusTabs.all') || 'All' },
              { id: 'published', label: t('admin.products.statusTabs.published') || 'Published' },
              { id: 'pending_approval', label: t('admin.products.statusTabs.pending') || 'Pending' },
              { id: 'rejected', label: t('admin.products.statusTabs.rejected') || 'Rejected' },
              { id: 'draft', label: t('admin.products.statusTabs.draft') || 'Draft' },
              { id: 'archived', label: t('admin.products.statusTabs.archived') || 'Archived' },
            ].map((tab) => {
              const active = status === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusChange(tab.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end lg:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{t('admin.products.viewMode.table') || 'Table'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GridIcon className="w-3.5 h-3.5" />
              <span>{t('admin.products.viewMode.grid') || 'Grid'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category, Stock, Type, Sort Dropdowns & Clear Button */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100 text-xs font-medium">
          {/* Category Dropdown */}
          <div className="min-w-[140px]">
            <label htmlFor="cat-filter" className="sr-only">
              {t('admin.products.filters.category') || 'Category'}
            </label>
            <select
              id="cat-filter"
              aria-label={t('admin.products.filters.category') || 'Category'}
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100/80 focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            >
              <option value="">{t('admin.products.filters.allCategories') || 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Dropdown */}
          <div className="min-w-[140px]">
            <label htmlFor="stock-filter" className="sr-only">
              {t('admin.products.filters.stockStatus') || 'Stock Status'}
            </label>
            <select
              id="stock-filter"
              aria-label={t('admin.products.filters.stockStatus') || 'Stock Status'}
              value={stockStatus}
              onChange={(e) => handleStockChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100/80 focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            >
              <option value="all">{t('admin.products.filters.allStock') || 'All Stock Levels'}</option>
              <option value="in_stock">{t('admin.products.filters.inStock') || 'In Stock'}</option>
              <option value="low_stock">{t('admin.products.filters.lowStock') || 'Low Stock (≤5)'}</option>
              <option value="out_of_stock">{t('admin.products.filters.outOfStock') || 'Out of Stock'}</option>
            </select>
          </div>

          {/* Product Type Dropdown */}
          <div className="min-w-[130px]">
            <label htmlFor="type-filter" className="sr-only">
              {t('admin.products.filters.productType') || 'Product Type'}
            </label>
            <select
              id="type-filter"
              aria-label={t('admin.products.filters.productType') || 'Product Type'}
              value={productType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100/80 focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            >
              <option value="all">{t('admin.products.filters.allTypes') || 'All Types'}</option>
              <option value="physical">{t('admin.products.filters.physical') || 'Physical'}</option>
              <option value="digital">{t('admin.products.filters.digital') || 'Digital'}</option>
              <option value="service">{t('admin.products.filters.service') || 'Service'}</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="min-w-[140px]">
            <label htmlFor="sort-filter" className="sr-only">
              {t('admin.products.filters.sortBy') || 'Sort By'}
            </label>
            <select
              id="sort-filter"
              aria-label={t('admin.products.filters.sortBy') || 'Sort By'}
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100/80 focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            >
              <option value="newest">{t('admin.products.filters.newest') || 'Newest First'}</option>
              <option value="price_asc">{t('admin.products.filters.priceAsc') || 'Price: Low to High'}</option>
              <option value="price_desc">{t('admin.products.filters.priceDesc') || 'Price: High to Low'}</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <button
            type="button"
            onClick={handleClearFilters}
            className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 rounded transition-colors"
          >
            {t('admin.products.filters.clearFilters') || 'Clear Filters'}
          </button>
        </div>
      </div>

      {/* ─── Catalog Display: Table vs Grid ─────────────────────────────────── */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/90 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3.5">{t('admin.products.table.product') || 'Product'}</th>
                  <th className="px-4 py-3.5">{t('admin.products.table.store') || 'Store'}</th>
                  <th className="px-4 py-3.5">{t('admin.products.table.category') || 'Category'}</th>
                  <th className="px-4 py-3.5">{t('admin.products.table.type') || 'Type'}</th>
                  <th className="px-4 py-3.5">{t('admin.products.table.price') || 'Price'}</th>
                  <th className="px-4 py-3.5">{t('admin.products.table.stock') || 'Stock'}</th>
                  <th className="px-4 py-3.5">{t('admin.products.table.status') || 'Status'}</th>
                  <th className="px-4 py-3.5 text-right">{t('admin.products.table.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Boxes className="w-8 h-8 text-slate-300" />
                        <span>{t('admin.products.table.noProducts') || 'No products found matching your filters.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => {
                    const isOutOfStock = prod.inventory_quantity <= 0;
                    const isLowStock = prod.inventory_quantity > 0 && prod.inventory_quantity <= 5;
                    const stockClass = isOutOfStock
                      ? 'text-red-700 bg-red-50 border-red-200'
                      : isLowStock
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200';

                    const imagesCount = (prod.images && prod.images.length) || 0;

                    return (
                      <tr
                        key={prod.id}
                        onClick={() => openDrawer(prod)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        {/* Product Thumbnail & Title & ID */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center group">
                              {prod.thumbnail ? (
                                <img
                                  src={getResizedImageUrl(prod.thumbnail)}
                                  alt={prod.title}
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">
                                  {t('admin.products.table.noImage') || 'No Img'}
                                </span>
                              )}
                              {imagesCount > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 bg-slate-900/80 text-white text-[9px] font-black px-1 rounded">
                                  {imagesCount}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                                {prod.title}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                                <span className="truncate max-w-[120px] font-mono">{prod.id}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyId(prod.id, e)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                  title={t('admin.products.table.copyId') || 'Copy ID'}
                                >
                                  {copiedId === prod.id ? (
                                    <span className="text-[10px] font-bold text-emerald-600">
                                      {t('admin.products.table.copied') || 'Copied!'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-500 hover:underline">
                                      {t('admin.products.table.copyId') || 'Copy'}
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Store & Live Link */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span>{prod.store?.name || 'N/A'}</span>
                            {prod.store?.is_verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Verified Merchant" />
                            )}
                          </div>
                          <a
                            href={getStoreUrl(prod)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B91C1C] hover:underline pt-0.5"
                          >
                            <span>{t('admin.products.table.visitStore') || 'Visit Store'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {getProductCategoryName(prod)}
                          </span>
                        </td>

                        {/* Product Type */}
                        <td className="px-4 py-3">
                          <span className="capitalize text-[11px] font-bold text-slate-600">
                            {getProductType(prod)}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3">
                          <span className="font-black text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                            {formatPriceTND(prod.price)}
                          </span>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-black border ${stockClass}`}
                          >
                            {prod.inventory_quantity}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              prod.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : prod.status === 'pending_approval'
                                ? 'bg-amber-100 text-amber-800'
                                : prod.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : prod.status === 'archived'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {prod.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDrawer(prod);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('admin.products.table.inspect') || 'Inspect'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── Grid View ──────────────────────────────────────────────────────── */
        <div
          data-testid="products-grid"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {products.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
              <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <span>{t('admin.products.table.noProducts') || 'No products found matching your filters.'}</span>
            </div>
          ) : (
            products.map((prod) => {
              const isOutOfStock = prod.inventory_quantity <= 0;
              const isLowStock = prod.inventory_quantity > 0 && prod.inventory_quantity <= 5;
              const stockClass = isOutOfStock
                ? 'text-red-700 bg-red-50 border-red-200'
                : isLowStock
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200';

              const imagesCount = (prod.images && prod.images.length) || 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => openDrawer(prod)}
                  className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 p-4 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Thumbnail with hover zoom */}
                    <div className="relative w-full h-44 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                      {prod.thumbnail ? (
                        <img
                          src={getResizedImageUrl(prod.thumbnail)}
                          alt={prod.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-xs font-bold">
                            {t('admin.products.table.noImage') || 'No Image'}
                          </span>
                        </div>
                      )}

                      {/* Image count badge */}
                      {imagesCount > 1 && (
                        <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                          +{imagesCount - 1}
                        </span>
                      )}

                      {/* Status Pill on thumbnail */}
                      <span
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-xs ${
                          prod.status === 'published'
                            ? 'bg-emerald-600 text-white'
                            : prod.status === 'pending_approval'
                            ? 'bg-amber-500 text-white'
                            : prod.status === 'rejected'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {prod.status}
                      </span>
                    </div>

                    {/* Product Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-500">
                        <span className="truncate">{getProductCategoryName(prod)}</span>
                        <span className="capitalize">{getProductType(prod)}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-[#B91C1C] transition-colors">
                        {prod.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                        <div className="flex items-center gap-1 font-medium truncate">
                          <span>{prod.store?.name}</span>
                          {prod.store?.is_verified && (
                            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stockClass}`}>
                          {prod.inventory_quantity} in stock
                        </span>
                      </div>
                    </div>

                    {/* Tag Chips Preview */}
                    {((prod.tags && prod.tags.length > 0) || (prod.interest_tags && prod.interest_tags.length > 0)) && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {prod.tags?.slice(0, 2).map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                        {prod.interest_tags?.slice(0, 2).map((it, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-medium flex items-center gap-0.5"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            {it}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="font-black text-slate-900 text-sm">
                      {formatPriceTND(prod.price)}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrawer(prod);
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{t('admin.products.table.inspect') || 'Inspect'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Responsive Pagination Controls ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-semibold text-slate-600 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          {t('admin.products.pagination.showing', {
            start: products.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0,
            end: Math.min(pagination.page * pagination.limit, pagination.total),
            total: pagination.total,
          }) ||
            `Showing ${products.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to ${Math.min(
              pagination.page * pagination.limit,
              pagination.total,
            )} of ${pagination.total} records`}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={handlePrevPage}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{t('admin.products.pagination.previous') || 'Previous'}</span>
          </button>

          <span className="px-2 py-1 font-bold text-slate-800">
            {t('admin.products.pagination.pageOf', {
              page: pagination.page,
              total_pages: pagination.total_pages || 1,
            }) || `Page ${pagination.page} of ${pagination.total_pages || 1}`}
          </span>

          <button
            type="button"
            disabled={pagination.page >= pagination.total_pages}
            onClick={handleNextPage}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all"
          >
            <span>{t('admin.products.pagination.next') || 'Next'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Interactive Slide-Out Inspection Drawer ─────────────────────────── */}
      {selectedProduct && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="inspection-drawer"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200"
        >
          <div
            className={`w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in ${
              dir === 'rtl' ? 'slide-in-from-left' : 'slide-in-from-right'
            } duration-300`}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/90">
              <div className="space-y-0.5 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-50 text-[#B91C1C]">
                    <Package className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-black text-slate-900 truncate">
                    {t('admin.products.drawer.title') || 'Product Inspection'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">{selectedProduct.title}</p>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 font-bold transition-all text-xs flex items-center gap-1"
                title={t('admin.products.drawer.close') || 'Close'}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">{t('admin.products.drawer.close') || 'Close'}</span>
              </button>
            </div>

            {/* 6 Tabs Navigation Bar */}
            <div className="flex border-b border-slate-200 text-xs font-bold bg-slate-50 px-4 overflow-x-auto no-scrollbar">
              {[
                { id: 'overview', label: t('admin.products.drawer.tabs.overview') || 'Overview', icon: FileText },
                { id: 'variants', label: t('admin.products.drawer.tabs.variants') || 'Variants', icon: Layers },
                { id: 'specs', label: t('admin.products.drawer.tabs.specs') || 'Specs / Attributes', icon: Boxes },
                { id: 'seo', label: t('admin.products.drawer.tabs.seo') || 'SEO & Taxonomy', icon: Globe },
                { id: 'store', label: t('admin.products.drawer.tabs.store') || 'Store Info', icon: Store },
                { id: 'tags', label: t('admin.products.drawer.tabs.tags') || 'Tag Studio', icon: Sparkles },
              ].map((tab) => {
                const active = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setDrawerTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-3 border-b-2 whitespace-nowrap transition-all ${
                      active
                        ? 'border-[#B91C1C] text-[#B91C1C] font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body Panel */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Tab 1: Overview & Gallery */}
              {drawerTab === 'overview' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h3 className="font-black text-slate-900 text-base">{selectedProduct.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {selectedProduct.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Summary Badges Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        {t('admin.products.drawer.overview.price') || 'Price'}
                      </div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">
                        {formatPriceTND(selectedProduct.price)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        {t('admin.products.drawer.overview.inventory') || 'Inventory Quantity'}
                      </div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">
                        {selectedProduct.inventory_quantity} units
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        {t('admin.products.drawer.overview.productType') || 'Product Type'}
                      </div>
                      <div className="font-bold text-slate-800 capitalize mt-0.5">
                        {getProductType(selectedProduct)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Status</div>
                      <div className="font-bold text-slate-800 capitalize mt-0.5">
                        {selectedProduct.status}
                      </div>
                    </div>
                  </div>

                  {/* Rejection reason alert */}
                  {selectedProduct.status === 'rejected' && selectedProduct.rejection_reason && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>{t('admin.products.drawer.overview.rejectionReason') || 'Rejection Reason'}</span>
                      </div>
                      <p className="text-xs text-rose-700 font-medium">{selectedProduct.rejection_reason}</p>
                    </div>
                  )}

                  {/* Gallery */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      {t('admin.products.drawer.overview.gallery') || 'Gallery Previews'}
                    </h4>
                    {selectedProduct.images && selectedProduct.images.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {selectedProduct.images.map((img) => (
                          <div
                            key={img.id}
                            className="relative aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200 group"
                          >
                            <img
                              src={getResizedImageUrl(img.url)}
                              alt={img.alt_text || selectedProduct.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            {img.is_thumbnail && (
                              <span className="absolute top-1 left-1 bg-[#B91C1C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                Thumbnail
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200">
                        No gallery images uploaded.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Variants Breakdown Table */}
              {drawerTab === 'variants' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-slate-900">
                      {t('admin.products.drawer.variants.title') || 'Variants Matrix'}
                    </h3>
                    <span className="text-xs font-bold text-slate-500">
                      {selectedProduct.variants?.length || 0} variant(s)
                    </span>
                  </div>

                  {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-3">{t('admin.products.drawer.variants.thTitle') || 'Title'}</th>
                            <th className="p-3">{t('admin.products.drawer.variants.thSku') || 'SKU'}</th>
                            <th className="p-3">{t('admin.products.drawer.variants.thPrice') || 'Price'}</th>
                            <th className="p-3">{t('admin.products.drawer.variants.thInventory') || 'Inventory'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedProduct.variants.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">{v.title}</td>
                              <td className="p-3 font-mono text-slate-500 text-[11px]">{v.sku || '—'}</td>
                              <td className="p-3 font-black text-slate-900">{formatPriceTND(v.price)}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-800 text-[11px]">
                                  {v.inventory_quantity}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
                      {t('admin.products.drawer.variants.noVariants') || 'No variants defined.'}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Specifications & Attributes */}
              {drawerTab === 'specs' && (
                <div className="space-y-4">
                  <h3 className="font-black text-sm text-slate-900">
                    {t('admin.products.drawer.specs.title') || 'Specifications & Attributes'}
                  </h3>

                  {getAttributesList(selectedProduct).length > 0 ? (
                    <div className="space-y-2">
                      {getAttributesList(selectedProduct).map((attr, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                        >
                          <span className="font-bold text-slate-700">{attr.name}</span>
                          <span className="font-semibold text-slate-900">{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
                      {t('admin.products.drawer.specs.noSpecs') || 'No custom attributes.'}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: SEO & Taxonomy */}
              {drawerTab === 'seo' && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {t('admin.products.drawer.seo.seoTitle') || 'SEO Title:'}
                      </span>
                      <span className="font-medium text-slate-900">
                        {selectedProduct.seo_title || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {t('admin.products.drawer.seo.seoDescription') || 'SEO Description:'}
                      </span>
                      <span className="font-medium text-slate-900">
                        {selectedProduct.seo_description || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {t('admin.products.drawer.seo.categorySlug') || 'Category Slug:'}
                      </span>
                      <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border">
                        {selectedProduct.marketplace_category_slug || selectedProduct.marketplace_category?.slug || 'n/a'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {t('admin.products.drawer.seo.productSlug') || 'Product Slug:'}
                      </span>
                      <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border">
                        {selectedProduct.slug}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Store Info */}
              {drawerTab === 'store' && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {t('admin.products.drawer.store.merchantName') || 'Merchant Name:'}
                      </span>
                      <span className="font-medium text-slate-900">
                        {selectedProduct.store?.owner_name || 'Karim Mansour'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {t('admin.products.drawer.store.email') || 'Email:'}
                      </span>
                      <span className="font-medium text-slate-900">
                        {selectedProduct.store?.owner_email || 'karim@sfaxnature.tn'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {t('admin.products.drawer.store.subdomain') || 'Subdomain:'}
                      </span>
                      <span className="font-mono text-slate-900">
                        {selectedProduct.store?.subdomain}.pandamarket.tn
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Store Name:</span>
                      <span className="font-medium text-slate-900">
                        {selectedProduct.store?.name}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Verified:</span>
                      <span className="font-bold text-emerald-700">
                        {selectedProduct.store?.is_verified ? 'Yes (Verified Merchant)' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Tag Studio */}
              {drawerTab === 'tags' && (
                <div className="space-y-5 text-xs">
                  {/* Vendor Tags Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t('admin.products.drawer.tags.vendorTags') || 'Vendor Tags'}</span>
                      </h4>
                      <span className="text-[11px] text-slate-400 font-bold">{vendorTags.length} tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[48px]">
                      {vendorTags.length === 0 ? (
                        <span className="text-slate-400 text-xs">No vendor tags added.</span>
                      ) : (
                        vendorTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-xs"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveVendorTag(idx)}
                              className="text-emerald-600 hover:text-emerald-900 font-black ml-0.5"
                              title="Remove tag"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* AI Interest Tags Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{t('admin.products.drawer.tags.aiTags') || 'AI Interest Tags'}</span>
                      </h4>
                      <span className="text-[11px] text-slate-400 font-bold">{interestTags.length} tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[48px]">
                      {interestTags.length === 0 ? (
                        <span className="text-slate-400 text-xs">No AI interest tags assigned.</span>
                      ) : (
                        interestTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full font-bold text-xs"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveInterestTag(idx)}
                              className="text-indigo-600 hover:text-indigo-900 font-black ml-0.5"
                              title="Remove tag"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Add Tag Controls */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                      <span>Add to:</span>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="targetTagType"
                          value="vendor"
                          checked={targetTagType === 'vendor'}
                          onChange={() => setTargetTagType('vendor')}
                          className="text-[#B91C1C] focus:ring-[#B91C1C]"
                        />
                        <span>Vendor Tags</span>
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="targetTagType"
                          value="ai"
                          checked={targetTagType === 'ai'}
                          onChange={() => setTargetTagType('ai')}
                          className="text-indigo-600 focus:ring-indigo-600"
                        />
                        <span>AI Interest Tags</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder={
                          t('admin.products.drawer.tags.addTagPlaceholder') ||
                          'Add tag and press Enter...'
                        }
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:border-[#B91C1C]"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shrink-0"
                      >
                        <Plus className="w-4 h-4 inline-block mr-1" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback and Save Button */}
                  <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={savingTags}
                      onClick={handleSaveTags}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-all flex items-center gap-1.5"
                    >
                      {savingTags ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {savingTags
                          ? t('admin.products.drawer.tags.saving') || 'Saving...'
                          : t('admin.products.drawer.tags.saveTags') || 'Save Tags'}
                      </span>
                    </button>

                    {tagSaveSuccess && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('admin.products.drawer.tags.saved') || 'Saved!'}</span>
                      </span>
                    )}

                    {tagSaveError && (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-xs bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{tagSaveError}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
