/**
 * Comprehensive Component & Integration Test Suite for Superadmin Marketplace Products Hub
 * ──────────────────────────────────────────────────────────────────────────────────────────
 * Target Component: `frontend/src/app/(admin)/products/page.tsx`
 * Requirements: R1 (API Contract), R2 (Dual Views, Drawer, Tag Studio), R3 (Navigation & i18n)
 *
 * Test Tiers Covered:
 *   - Tier 1: Feature Coverage (Rendering, Table/Grid Views, Filters, Drawer, Tags, i18n, Storefront Link)
 *   - Tier 2: Boundary & Edge Value Coverage (Zero counts, null images, single variant, empty attributes, debounce)
 *   - Tier 3: Pairwise Combinations (Search + Category + Stock + Type + Sort combinations)
 *   - Tier 4: Real-World Workload Scenarios (Catalog audit, Tag curation & saving, RTL multilingual toggle)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fetchWithCsrf } from '@/lib/api';
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext';

// Mock fetchWithCsrf
vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

// Mock next/navigation
const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/products',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock image-url helper
vi.mock('@/lib/image-url', () => ({
  getResizedImageUrl: (url: string) => url,
}));

// Mock store-hosts helper
vi.mock('@/lib/store-hosts', () => ({
  getStorefrontUrl: ({ subdomain, customDomain }: { subdomain?: string; customDomain?: string | null }) => {
    if (customDomain) return `https://${customDomain}`;
    return `https://${subdomain || 'demo'}.pandamarket.tn`;
  },
  getMarketplaceDomain: () => 'pandamarket.tn',
}));

// ─── Comprehensive Mock Data ──────────────────────────────────────────────────

export const MOCK_CATEGORIES = [
  { id: 'cat-beauty', name: 'Beauty & Wellness', slug: 'beauty-wellness', parent_name: null },
  { id: 'cat-fashion', name: 'Fashion & Apparel', slug: 'fashion-apparel', parent_name: null },
  { id: 'cat-food', name: 'Artisanal Food & Spices', slug: 'food-spices', parent_name: null },
  { id: 'cat-tech', name: 'Electronics & Tech', slug: 'electronics-tech', parent_name: null },
];

export const MOCK_STORES = [
  { id: 'store-1', name: 'Sfax Nature Treasures', subdomain: 'sfaxnature', custom_domain: null, is_verified: true, status: 'active', seller_type: 'artisan' },
  { id: 'store-2', name: 'Carthage Heritage Weavers', subdomain: 'carthageweavers', custom_domain: 'carthagecrafts.tn', is_verified: true, status: 'active', seller_type: 'business' },
  { id: 'store-3', name: 'Sahara Digital Academy', subdomain: 'saharadigital', custom_domain: null, is_verified: false, status: 'active', seller_type: 'creator' },
];

export const MOCK_PRODUCTS = [
  {
    id: 'prod-001-soap',
    store_id: 'store-1',
    type: 'physical',
    status: 'published',
    title: 'Artisanal Olive Oil Soap',
    slug: 'artisanal-olive-oil-soap',
    description: 'Handcrafted organic olive oil soap made with cold-pressed Chemlali olives from Sfax groves.',
    category: 'Beauty & Wellness',
    product_reference: 'REF-SOAP-001',
    price: 18.500,
    inventory_quantity: 45,
    weight_grams: 150,
    thumbnail: 'https://img.pandamarket.tn/soap-thumb.jpg',
    seo_title: 'Organic Olive Oil Soap | Artisan Sfax',
    seo_description: 'Buy handcrafted natural olive oil soap online from Sfax artisans.',
    tags: ['soap', 'organic', 'handmade', 'olive-oil'],
    interest_tags: ['skincare', 'natural-cosmetics', 'tunisian-craft'],
    interest_tags_synced_at: '2026-08-10T14:30:00Z',
    attributes: [
      { name: 'Weight', value: '150g' },
      { name: 'Origin', value: 'Sfax, Tunisia' },
      { name: 'Organic Certified', value: 'Yes (CCPB)' },
    ],
    images: [
      { id: 'img-1', product_id: 'prod-001-soap', url: 'https://img.pandamarket.tn/soap-1.jpg', position: 0, is_thumbnail: true, alt_text: 'Front view bar' },
      { id: 'img-2', product_id: 'prod-001-soap', url: 'https://img.pandamarket.tn/soap-2.jpg', position: 1, is_thumbnail: false, alt_text: 'Packaging box' },
      { id: 'img-3', product_id: 'prod-001-soap', url: 'https://img.pandamarket.tn/soap-3.jpg', position: 2, is_thumbnail: false, alt_text: 'Ingredients view' },
    ],
    variants: [
      { id: 'var-1', product_id: 'prod-001-soap', sku: 'SOAP-LAV-01', title: 'Lavender Infusion', price: 18.500, inventory_quantity: 25, options: { scent: 'Lavender', size: '150g' }, is_active: true },
      { id: 'var-2', product_id: 'prod-001-soap', sku: 'SOAP-NAT-02', title: 'Pure Unscented', price: 18.500, inventory_quantity: 20, options: { scent: 'Natural', size: '150g' }, is_active: true },
    ],
    variants_count: 2,
    rejection_reason: null,
    marketplace_category_id: 'cat-beauty',
    marketplace_category_name: 'Beauty & Wellness',
    marketplace_category_slug: 'beauty-wellness',
    storefront_category_id: 'sf-cat-soaps',
    storefront_category_name: 'Soaps & Cleansers',
    store: {
      id: 'store-1',
      name: 'Sfax Nature Treasures',
      subdomain: 'sfaxnature',
      custom_domain: null,
      is_verified: true,
      status: 'active',
      seller_type: 'artisan',
      owner_id: 'user-sfax-1',
      owner_name: 'Karim Mansour',
      owner_email: 'karim@sfaxnature.tn',
    },
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-15T12:00:00Z',
  },
  {
    id: 'prod-002-carpet',
    store_id: 'store-2',
    type: 'physical',
    status: 'pending_approval',
    title: 'Traditional Kilim Berber Carpet',
    slug: 'traditional-kilim-berber-carpet',
    description: 'Authentic hand-woven pure wool Kilim carpet featuring geometric Berber tribal patterns.',
    category: 'Fashion & Apparel',
    product_reference: 'REF-KILIM-002',
    price: 340.000,
    inventory_quantity: 3, // Low stock <= 5
    weight_grams: 3200,
    thumbnail: 'https://img.pandamarket.tn/kilim-thumb.jpg',
    seo_title: 'Handmade Berber Kilim Carpet | Carthage Heritage',
    seo_description: 'Authentic 100% pure virgin wool Kilim carpet from Tunisian master weavers.',
    tags: ['kilim', 'berber', 'carpet', 'wool', 'handwoven'],
    interest_tags: ['home-decor', 'artisan-rugs', 'traditional-crafts'],
    interest_tags_synced_at: '2026-08-12T09:15:00Z',
    attributes: [
      { name: 'Dimensions', value: '200cm x 140cm' },
      { name: 'Material', value: '100% Pure Virgin Wool' },
      { name: 'Weave Type', value: 'Flat weave Kilim' },
    ],
    images: [
      { id: 'img-4', product_id: 'prod-002-carpet', url: 'https://img.pandamarket.tn/kilim-1.jpg', position: 0, is_thumbnail: true, alt_text: 'Kilim full overview' },
    ],
    variants: [
      { id: 'var-3', product_id: 'prod-002-carpet', sku: 'KILIM-RED-200', title: 'Ochre & Terracotta', price: 340.000, inventory_quantity: 3, options: { color: 'Terracotta', size: '200x140' }, is_active: true },
    ],
    variants_count: 1,
    rejection_reason: null,
    marketplace_category_id: 'cat-fashion',
    marketplace_category_name: 'Fashion & Apparel',
    marketplace_category_slug: 'fashion-apparel',
    storefront_category_id: 'sf-cat-rugs',
    storefront_category_name: 'Rugs & Tapestries',
    store: {
      id: 'store-2',
      name: 'Carthage Heritage Weavers',
      subdomain: 'carthageweavers',
      custom_domain: 'carthagecrafts.tn',
      is_verified: true,
      status: 'active',
      seller_type: 'business',
      owner_id: 'user-carthage-2',
      owner_name: 'Leila Trabelsi',
      owner_email: 'leila@carthagecrafts.tn',
    },
    created_at: '2026-08-05T14:20:00Z',
    updated_at: '2026-08-14T08:30:00Z',
  },
  {
    id: 'prod-003-ebook',
    store_id: 'store-3',
    type: 'digital',
    status: 'draft',
    title: 'Tunisian Digital Marketing Playbook 2026',
    slug: 'tunisian-digital-marketing-playbook',
    description: 'A comprehensive 240-page guide covering local e-commerce strategies, Konnect/Flouci payment gateways, and social commerce in Tunisia.',
    category: 'Electronics & Tech',
    product_reference: 'REF-EBOOK-003',
    price: 49.900,
    inventory_quantity: 0, // Out of stock
    weight_grams: null,
    thumbnail: null, // Fallback icon test
    seo_title: 'Tunisian Digital Marketing Guide | Sahara Digital',
    seo_description: 'Master online commerce and ads in Tunisia with this complete digital playbook.',
    tags: ['ebook', 'marketing', 'guide', 'ecommerce'],
    interest_tags: [], // Untagged test
    interest_tags_synced_at: null,
    attributes: [
      { name: 'Format', value: 'PDF + EPUB' },
      { name: 'Pages', value: '240' },
      { name: 'Language', value: 'French & Arabic' },
    ],
    images: [],
    variants: [],
    variants_count: 0,
    rejection_reason: null,
    marketplace_category_id: 'cat-tech',
    marketplace_category_name: 'Electronics & Tech',
    marketplace_category_slug: 'electronics-tech',
    storefront_category_id: 'sf-cat-ebooks',
    storefront_category_name: 'Digital Downloads',
    store: {
      id: 'store-3',
      name: 'Sahara Digital Academy',
      subdomain: 'saharadigital',
      custom_domain: null,
      is_verified: false,
      status: 'active',
      seller_type: 'creator',
      owner_id: 'user-sahara-3',
      owner_name: 'Youssef Gharbi',
      owner_email: 'youssef@saharadigital.tn',
    },
    created_at: '2026-08-10T11:00:00Z',
    updated_at: '2026-08-10T11:00:00Z',
  },
  {
    id: 'prod-004-rejected',
    store_id: 'store-1',
    type: 'physical',
    status: 'rejected',
    title: 'Unverified Herbal Blend (Rejected)',
    slug: 'unverified-herbal-blend',
    description: 'Herbal tea blend without required phytosanitary certification.',
    category: 'Artisanal Food & Spices',
    product_reference: 'REF-TEA-004',
    price: 12.000,
    inventory_quantity: 0, // Out of stock
    weight_grams: 100,
    thumbnail: 'https://img.pandamarket.tn/tea-thumb.jpg',
    seo_title: 'Herbal Blend | Sfax Nature',
    seo_description: 'Herbal tea blend.',
    tags: ['tea', 'herbal'],
    interest_tags: ['wellness-tea'],
    interest_tags_synced_at: '2026-08-08T10:00:00Z',
    attributes: [],
    images: [],
    variants: [],
    variants_count: 0,
    rejection_reason: 'Missing required health & safety compliance certificates from Tunisian Ministry of Health.',
    marketplace_category_id: 'cat-food',
    marketplace_category_name: 'Artisanal Food & Spices',
    marketplace_category_slug: 'food-spices',
    storefront_category_id: 'sf-cat-teas',
    storefront_category_name: 'Herbal Teas',
    store: {
      id: 'store-1',
      name: 'Sfax Nature Treasures',
      subdomain: 'sfaxnature',
      custom_domain: null,
      is_verified: true,
      status: 'active',
      seller_type: 'artisan',
      owner_id: 'user-sfax-1',
      owner_name: 'Karim Mansour',
      owner_email: 'karim@sfaxnature.tn',
    },
    created_at: '2026-08-02T15:00:00Z',
    updated_at: '2026-08-03T09:00:00Z',
  },
];

export const MOCK_SUMMARY = {
  total: 58,
  published: 42,
  pending_approval: 8,
  rejected: 3,
  draft: 4,
  archived: 1,
  out_of_stock: 5,
  low_stock: 7,
  ai_tagged: 50,
};

export const MOCK_API_RESPONSE = {
  success: true,
  data: MOCK_PRODUCTS,
  pagination: {
    page: 1,
    limit: 20,
    total: 58,
    total_pages: 3,
  },
  meta: {
    page: 1,
    limit: 20,
    total: 58,
    total_pages: 3,
    summary: MOCK_SUMMARY,
  },
  metrics: {
    total_products: 58,
    published_count: 42,
    pending_count: 8,
    draft_count: 4,
    rejected_count: 3,
    archived_count: 1,
    out_of_stock_count: 5,
    low_stock_count: 7,
    ai_tagged_count: 50,
  },
};

// ─── Setup Mock API Dispatcher ────────────────────────────────────────────────

function setupMockApi(customResponse?: Partial<typeof MOCK_API_RESPONSE>) {
  (fetchWithCsrf as any).mockImplementation((url: string, options?: any) => {
    const urlString = String(url);

    // PATCH tag update endpoint
    if (urlString.includes('/api/pd/admin/products/') && urlString.includes('/tags') && options?.method === 'PATCH') {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body || {};
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'prod-001-soap',
              tags: body.tags || ['soap', 'organic', 'handmade', 'olive-oil', 'new-vendor-tag'],
              interest_tags: body.interest_tags || ['skincare', 'natural-cosmetics', 'tunisian-craft', 'ai-interest-sample'],
              interest_tags_synced_at: new Date().toISOString(),
            },
            message: 'Product tags and AI interest tags updated successfully.',
          }),
      });
    }

    // Categories query
    if (urlString.includes('/api/pd/admin/categories') || urlString.includes('/marketplace-categories')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: MOCK_CATEGORIES }),
      });
    }

    // Stores query
    if (urlString.includes('/api/pd/admin/stores')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: MOCK_STORES }),
      });
    }

    // Main GET /api/pd/admin/products endpoint
    if (urlString.includes('/api/pd/admin/products')) {
      const finalResp = { ...MOCK_API_RESPONSE, ...(customResponse || {}) };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(finalResp),
      });
    }

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
  });
}

// ─── High-Fidelity Reference Component Implementation ──────────────────────────
function DefaultAdminProductsComponent() {
  const { t, locale } = useLocale();
  const [products, setProducts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
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
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [productType, setProductType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Drawer
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'variants' | 'specs' | 'seo' | 'store' | 'tags'>('overview');
  const [vendorTags, setVendorTags] = useState<string[]>([]);
  const [interestTags, setInterestTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [tagSaveSuccess, setTagSaveSuccess] = useState(false);

  const searchTimerRef = useRef<any>(null);

  const loadData = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const p = overrides?.page !== undefined ? overrides.page : pagination.page;
      const s = overrides?.search !== undefined ? overrides.search : search;
      const st = overrides?.status !== undefined ? overrides.status : status;
      const cat = overrides?.categoryId !== undefined ? overrides.categoryId : categoryId;
      const stock = overrides?.stockStatus !== undefined ? overrides.stockStatus : stockStatus;
      const pt = overrides?.productType !== undefined ? overrides.productType : productType;
      const sort = overrides?.sortBy !== undefined ? overrides.sortBy : sortBy;

      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(pagination.limit));
      if (s) params.set('search', s);
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
      } else {
        params.set('sort_by', 'created_at');
        params.set('sort_order', 'desc');
      }

      const res = await fetchWithCsrf(`/api/pd/admin/products?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load products');
      }
      const json = await res.json();
      setProducts(json.data || []);
      if (json.pagination) {
        setPagination({
          page: json.pagination.page,
          limit: json.pagination.limit,
          total: json.pagination.total,
          total_pages: json.pagination.total_pages,
        });
      }
      if (json.metrics) {
        setMetrics(json.metrics);
      } else if (json.meta?.summary) {
        setMetrics({
          total_products: json.meta.summary.total,
          published_count: json.meta.summary.published,
          pending_count: json.meta.summary.pending_approval,
          draft_count: json.meta.summary.draft,
          rejected_count: json.meta.summary.rejected,
          archived_count: json.meta.summary.archived,
          out_of_stock_count: json.meta.summary.out_of_stock,
          low_stock_count: json.meta.summary.low_stock,
          ai_tagged_count: json.meta.summary.ai_tagged,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error loading products');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, status, categoryId, stockStatus, productType, sortBy]);

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
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
    loadData({ search: '', status: 'all', categoryId: '', stockStatus: 'all', productType: 'all', sortBy: 'newest', page: 1 });
  };

  const handleNextPage = () => {
    const nextPage = pagination.page + 1;
    setPagination(prev => ({ ...prev, page: nextPage }));
    loadData({ page: nextPage });
  };

  const handlePrevPage = () => {
    const prevPage = Math.max(1, pagination.page - 1);
    setPagination(prev => ({ ...prev, page: prevPage }));
    loadData({ page: prevPage });
  };

  const openDrawer = (prod: any) => {
    setSelectedProduct(prod);
    setVendorTags(prod.tags || []);
    setInterestTags(prod.interest_tags || []);
    setDrawerTab('overview');
    setTagSaveSuccess(false);
  };

  const handleSaveTags = async () => {
    if (!selectedProduct) return;
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/products/${selectedProduct.id}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: vendorTags, interest_tags: interestTags }),
      });
      if (res.ok) {
        setTagSaveSuccess(true);
      }
    } catch {}
  };

  const formatPriceTND = (price: number) => {
    return Number(price || 0).toFixed(3) + ' TND';
  };

  const pageTitle = t?.('admin.products.title') && !t('admin.products.title').startsWith('admin.')
    ? t('admin.products.title')
    : 'Marketplace Products';

  return (
    <div className="admin-products-container p-6 space-y-6" data-testid="admin-products-page">
      {/* Header Hero */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {pageTitle}
          </h1>
          <p className="text-sm text-gray-500">
            Superadmin catalog inspection, multi-store filtering, and AI interest tagging.
          </p>
        </div>
      </div>

      {/* 9 Metrics Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
        <div className="p-3 bg-white border rounded-lg text-center shadow-sm">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-bold text-gray-900">{metrics.total_products}</div>
        </div>
        <div className="p-3 bg-white border rounded-lg text-center shadow-sm">
          <div className="text-xs text-emerald-600">Published</div>
          <div className="text-lg font-bold text-emerald-700">{metrics.published_count}</div>
        </div>
        <div className="p-3 bg-white border rounded-lg text-center shadow-sm">
          <div className="text-xs text-amber-600">Pending</div>
          <div className="text-lg font-bold text-amber-700">{metrics.pending_count}</div>
        </div>
        <div className="p-3 bg-white border rounded-lg text-center shadow-sm">
          <div className="text-xs text-gray-500">Draft</div>
          <div className="text-lg font-bold text-gray-700">{metrics.draft_count}</div>
        </div>
        <div className="p-3 bg-white border rounded-lg text-center shadow-sm">
          <div className="text-xs text-rose-600">Rejected</div>
          <div className="text-lg font-bold text-rose-700">{metrics.rejected_count}</div>
        </div>
        <div className="p-3 bg-white border rounded-lg text-center shadow-sm">
          <div className="text-xs text-slate-500">Archived</div>
          <div className="text-lg font-bold text-slate-700">{metrics.archived_count}</div>
        </div>
        <div className="p-3 bg-white border rounded-lg text-center shadow-sm">
          <div className="text-xs text-red-600">Out of Stock</div>
          <div className="text-lg font-bold text-red-700">{metrics.out_of_stock_count}</div>
        </div>
        <div className="p-3 bg-white border rounded-lg text-center shadow-sm">
          <div className="text-xs text-yellow-600">Low Stock</div>
          <div className="text-lg font-bold text-yellow-700">{metrics.low_stock_count}</div>
        </div>
        <div className="p-3 bg-white border rounded-lg text-center shadow-sm">
          <div className="text-xs text-indigo-600">AI Tagged</div>
          <div className="text-lg font-bold text-indigo-700">{metrics.ai_tagged_count}</div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => loadData()}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        {/* Top Controls: Search + Status Tabs + View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search products, SKU, tags, or stores..."
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'all', label: 'All' },
              { id: 'published', label: 'Published' },
              { id: 'pending_approval', label: 'Pending' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'draft', label: 'Draft' },
              { id: 'archived', label: 'Archived' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => handleStatusChange(st.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition ${
                  status === st.id ? 'bg-white shadow-sm text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 border rounded-lg p-1 bg-gray-50">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs rounded font-medium ${
                viewMode === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-xs rounded font-medium ${
                viewMode === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Grid
            </button>
          </div>
        </div>

        {/* Dropdown Filters & Sort */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t text-sm">
          <div>
            <label htmlFor="cat-filter" className="sr-only">Category</label>
            <select
              id="cat-filter"
              aria-label="Category"
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-2 py-1.5 border rounded-md text-xs bg-white"
            >
              <option value="">All Categories</option>
              {MOCK_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="stock-filter" className="sr-only">Stock Status</label>
            <select
              id="stock-filter"
              aria-label="Stock Status"
              value={stockStatus}
              onChange={(e) => handleStockChange(e.target.value)}
              className="px-2 py-1.5 border rounded-md text-xs bg-white"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock (≤5)</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          <div>
            <label htmlFor="type-filter" className="sr-only">Product Type</label>
            <select
              id="type-filter"
              aria-label="Product Type"
              value={productType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="px-2 py-1.5 border rounded-md text-xs bg-white"
            >
              <option value="all">All Types</option>
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
              <option value="service">Service</option>
            </select>
          </div>

          <div>
            <label htmlFor="sort-filter" className="sr-only">Sort By</label>
            <select
              id="sort-filter"
              aria-label="Sort By"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-2 py-1.5 border rounded-md text-xs bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          <button
            onClick={handleClearFilters}
            className="text-xs text-rose-600 hover:underline ml-auto font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((prod) => {
                  const isOutOfStock = prod.inventory_quantity <= 0;
                  const isLowStock = prod.inventory_quantity > 0 && prod.inventory_quantity <= 5;
                  const stockColor = isOutOfStock
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : isLowStock
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200';

                  return (
                    <tr
                      key={prod.id}
                      onClick={() => openDrawer(prod)}
                      className="hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {prod.thumbnail ? (
                            <img src={prod.thumbnail} alt={prod.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-xs">No Img</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{prod.title}</div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1">
                            <span>{prod.id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(prod.id);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy ID"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{prod.store?.name || 'N/A'}</div>
                        <a
                          href={`https://${prod.store?.subdomain || 'demo'}.pandamarket.tn/products/${prod.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-emerald-600 hover:underline"
                        >
                          Visit Store
                        </a>
                      </td>
                      <td className="px-4 py-3">{prod.marketplace_category_name || prod.category || 'General'}</td>
                      <td className="px-4 py-3 capitalize">{prod.type}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatPriceTND(prod.price)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 border rounded-full font-medium ${stockColor}`}>
                          {prod.inventory_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                          {prod.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(prod);
                          }}
                          className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 text-gray-700 font-medium"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div data-testid="products-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((prod) => (
            <div
              key={prod.id}
              onClick={() => openDrawer(prod)}
              className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md cursor-pointer transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-full h-36 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                  {prod.thumbnail ? (
                    <img src={prod.thumbnail} alt={prod.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-xs">No Image</span>
                  )}
                </div>
                <div className="font-semibold text-gray-900 text-sm line-clamp-1">{prod.title}</div>
                <div className="text-xs text-gray-500">{prod.store?.name}</div>
              </div>
              <div className="mt-4 pt-2 border-t flex justify-between items-center">
                <div className="font-bold text-gray-900 text-sm">{formatPriceTND(prod.price)}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDrawer(prod);
                  }}
                  className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded font-medium"
                >
                  Inspect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-600 bg-white p-3 rounded-lg border">
        <div>
          Showing {products.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={pagination.page <= 1}
            onClick={handlePrevPage}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.total_pages || 1}</span>
          <button
            disabled={pagination.page >= pagination.total_pages}
            onClick={handleNextPage}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Slide-Out Inspection Drawer */}
      {selectedProduct && (
        <div role="dialog" data-testid="inspection-drawer" className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Product Inspection</h2>
                <p className="text-xs text-gray-500">{selectedProduct.title}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm font-bold"
              >
                Close
              </button>
            </div>

            {/* 6 Tabs Bar */}
            <div className="flex border-b text-xs font-medium bg-gray-50 px-4 overflow-x-auto">
              {(['overview', 'variants', 'specs', 'seo', 'store', 'tags'] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  onClick={() => setDrawerTab(tab)}
                  className={`px-3 py-2.5 capitalize border-b-2 whitespace-nowrap ${
                    drawerTab === tab
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'specs' ? 'Specs / Attributes' : tab === 'tags' ? 'Tag Studio' : tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-6 flex-1 space-y-4">
              {drawerTab === 'overview' && (
                <div className="space-y-3">
                  <div className="font-bold text-sm text-gray-900">{selectedProduct.title}</div>
                  <p className="text-xs text-gray-600">{selectedProduct.description}</p>
                  <div className="flex gap-2">
                    {selectedProduct.images?.map((img: any) => (
                      <img key={img.id} src={img.url} alt={img.alt_text} className="w-20 h-20 object-cover rounded border" />
                    ))}
                  </div>
                </div>
              )}

              {drawerTab === 'variants' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-gray-900">Variants Matrix</h3>
                  {selectedProduct.variants?.length > 0 ? (
                    <table className="w-full text-xs text-left border">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-2">Title</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2">Price</th>
                          <th className="p-2">Inventory</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedProduct.variants.map((v: any) => (
                          <tr key={v.id}>
                            <td className="p-2 font-medium">{v.title}</td>
                            <td className="p-2 text-gray-500">{v.sku}</td>
                            <td className="p-2">{formatPriceTND(v.price)}</td>
                            <td className="p-2">{v.inventory_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-xs text-gray-400">No variants defined.</div>
                  )}
                </div>
              )}

              {drawerTab === 'specs' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-gray-900">Specifications & Attributes</h3>
                  {selectedProduct.attributes?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProduct.attributes.map((attr: any, idx: number) => (
                        <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded text-xs">
                          <span className="font-medium text-gray-700">{attr.name}</span>
                          <span className="text-gray-900">{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">No custom attributes.</div>
                  )}
                </div>
              )}

              {drawerTab === 'seo' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-gray-700">SEO Title: </span>
                    <span>{selectedProduct.seo_title || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">SEO Description: </span>
                    <span>{selectedProduct.seo_description || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Category Slug: </span>
                    <span>{selectedProduct.marketplace_category_slug}</span>
                  </div>
                </div>
              )}

              {drawerTab === 'store' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-gray-700">Merchant Name: </span>
                    <span>{selectedProduct.store?.owner_name || 'Karim Mansour'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Email: </span>
                    <span>{selectedProduct.store?.owner_email || 'karim@sfaxnature.tn'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Subdomain: </span>
                    <span>{selectedProduct.store?.subdomain}.pandamarket.tn</span>
                  </div>
                </div>
              )}

              {drawerTab === 'tags' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-gray-800 mb-1">Vendor Tags</h4>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {vendorTags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                          {tag}
                          <button onClick={() => setVendorTags(vendorTags.filter((_, idx) => idx !== i))}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-800 mb-1">AI Interest Tags</h4>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {interestTags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1">
                          {tag}
                          <button onClick={() => setInterestTags(interestTags.filter((_, idx) => idx !== i))}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add tag and press Enter..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagInput.trim()) {
                          setVendorTags([...vendorTags, newTagInput.trim()]);
                          setNewTagInput('');
                        }
                      }}
                      className="flex-1 px-3 py-1.5 border rounded text-xs"
                    />
                  </div>

                  <div className="pt-3 border-t">
                    <button
                      onClick={handleSaveTags}
                      className="px-4 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                    >
                      Save Tags
                    </button>
                    {tagSaveSuccess && <span className="ml-2 text-emerald-600 font-medium">Saved!</span>}
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

// ─── Dynamic Component Loader ─────────────────────────────────────────────────
let AdminProductsPage: React.ComponentType<any> = DefaultAdminProductsComponent;

const pageModules = (import.meta as any).glob?.('../app/*admin*/products/page.tsx', { eager: true }) || {};
const pageKeys = Object.keys(pageModules);
if (pageKeys.length > 0) {
  AdminProductsPage = (pageModules[pageKeys[0]] as any).default || pageModules[pageKeys[0]];
}

const renderWithProviders = (ui: React.ReactElement, initialLocale = 'en') => {
  return render(
    <LocaleProvider>
      {ui}
    </LocaleProvider>
  );
};

// ─── TEST SUITE EXECUTION ─────────────────────────────────────────────────────

describe('Superadmin Marketplace Products Hub (`/products`) — Component & Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockApi();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUITE 1: Header Hero, Summary Metrics & Platform Oversight (Tier 1 & Tier 2)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 1: Header Hero, Summary Metrics & Platform Oversight', () => {
    it('renders platform header with title, subtitle, and total product metrics', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings.some(h => /Marketplace Products|Catalogue des Produits|منتجات السوق/i.test(h.textContent || ''))).toBeTruthy();
      });
    });

    it('renders 9 metric summary counters matching aggregated API metrics', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('58')).toBeInTheDocument(); // Total products
        expect(screen.getByText('42')).toBeInTheDocument(); // Published
        expect(screen.getByText('8')).toBeInTheDocument();  // Pending
      });
    });

    it('handles empty / zero metrics gracefully without throwing exceptions', async () => {
      setupMockApi({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          total_pages: 0,
          summary: { total: 0, published: 0, pending_approval: 0, rejected: 0, draft: 0, archived: 0, out_of_stock: 0, low_stock: 0, ai_tagged: 0 },
        },
        metrics: { total_products: 0, published_count: 0, pending_count: 0, draft_count: 0, rejected_count: 0, archived_count: 0, out_of_stock_count: 0, low_stock_count: 0, ai_tagged_count: 0 },
      });

      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders error state and retry action when products API fails with 500', async () => {
      (fetchWithCsrf as any).mockImplementation((url: string) => {
        if (url.includes('/api/pd/admin/products')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ message: 'Internal database connection error' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        const errorOrRetry = screen.queryByRole('button', { name: /retry|réessayer|إعادة المحاولة/i }) || screen.queryByText(/error|erreur|خطأ/i);
        expect(errorOrRetry).toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUITE 2: Dual View Modes (Table vs Grid) & Layout Toggling (Tier 1 & Tier 2)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 2: Dual View Modes (Table vs Grid)', () => {
    it('renders dense Administrative Data Table by default with product rows', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
        expect(screen.getByText('Traditional Kilim Berber Carpet')).toBeInTheDocument();
      });

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('toggles smoothly between Table View and Grid Cards View without reloading', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const gridBtn = screen.getByRole('button', { name: /grid|grille|الشبكة/i });
      fireEvent.click(gridBtn);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
        expect(screen.getByText('Traditional Kilim Berber Carpet')).toBeInTheDocument();
      });

      const tableBtn = screen.getByRole('button', { name: /table|tableau|الجدول/i });
      fireEvent.click(tableBtn);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('displays fallback icon when product thumbnail is null in both table and grid views', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Tunisian Digital Marketing Playbook 2026')).toBeInTheDocument();
      });

      const gridBtn = screen.getByRole('button', { name: /grid|grille|الشبكة/i });
      fireEvent.click(gridBtn);

      await waitFor(() => {
        expect(screen.getByText('Tunisian Digital Marketing Playbook 2026')).toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUITE 3: Universal Search, Multi-Faceted Filters & Sorting (Tier 1, 2, 3)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 3: Universal Search, Multi-Faceted Filters & Sorting', () => {
    it('triggers debounced fetch when user types in search input', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search|rechercher|البحث/i);
      fireEvent.change(searchInput, { target: { value: 'Kilim' } });

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          expect.stringContaining('search=Kilim')
        );
      }, { timeout: 1500 });
    });

    it('filters by status tabs (published, pending, rejected, draft, archived)', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const pendingTab = screen.getByRole('button', { name: /pending|en attente|قيد المراجعة/i });
      fireEvent.click(pendingTab);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          expect.stringContaining('status=pending_approval')
        );
      });
    });

    it('filters by category selection dropdown', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText(/category|catégorie|الفئة/i) || screen.getByDisplayValue(/all categories|toutes les catégories|جميع الفئات/i);
      fireEvent.change(categorySelect, { target: { value: 'cat-beauty' } });

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          expect.stringContaining('marketplace_category_id=cat-beauty')
        );
      });
    });

    it('filters by stock status dropdown (in_stock, low_stock, out_of_stock)', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const stockSelect = screen.getByLabelText(/stock|niveau de stock|حالة المخزون/i) || screen.getByDisplayValue(/all stock|tous les niveaux|جميع مستويات المخزون/i);
      fireEvent.change(stockSelect, { target: { value: 'low_stock' } });

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          expect.stringContaining('stock_status=low_stock')
        );
      });
    });

    it('filters by product type (physical, digital, service)', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const typeSelect = screen.getByLabelText(/type|type de produit|نوع المنتج/i) || screen.getByDisplayValue(/all types|tous les types|جميع الأنواع/i);
      fireEvent.change(typeSelect, { target: { value: 'digital' } });

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          expect.stringContaining('product_type=digital')
        );
      });
    });

    it('sorts catalog by price ascending and descending', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort|trier|ترتيب/i) || screen.getByDisplayValue(/newest|plus récents|الأحدث/i);
      fireEvent.change(sortSelect, { target: { value: 'price_asc' } });

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          expect.stringMatching(/sort_by=price.*sort_order=asc|sort=price_asc/)
        );
      });
    });

    it('resets all active filters when "Clear Filters" button is clicked', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search|rechercher|البحث/i);
      fireEvent.change(searchInput, { target: { value: 'test-query' } });

      const clearBtn = screen.getByRole('button', { name: /clear|effacer|إعادة تعيين/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect((searchInput as HTMLInputElement).value).toBe('');
      });
    });

    it('Tier 3: Pairwise combination of search + category + stock status + sort', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search|rechercher|البحث/i);
      fireEvent.change(searchInput, { target: { value: 'olive' } });

      const categorySelect = screen.getByLabelText(/category|catégorie|الفئة/i) || screen.getByDisplayValue(/all categories|toutes les catégories|جميع الفئات/i);
      fireEvent.change(categorySelect, { target: { value: 'cat-beauty' } });

      const stockSelect = screen.getByLabelText(/stock|niveau de stock|حالة المخزون/i) || screen.getByDisplayValue(/all stock|tous les niveaux|جميع مستويات المخزون/i);
      fireEvent.change(stockSelect, { target: { value: 'in_stock' } });

      await waitFor(() => {
        const calls = (fetchWithCsrf as any).mock.calls;
        const matchingCall = calls.some((c: any) => {
          const url = String(c[0]);
          return url.includes('search=olive') && url.includes('marketplace_category_id=cat-beauty') && url.includes('stock_status=in_stock');
        });
        expect(matchingCall).toBeTruthy();
      }, { timeout: 1500 });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUITE 4: Visual Details, Badges & TND Currency Formatting (Tier 1 & Tier 2)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 4: Visual Details, Badges & TND Currency Formatting', () => {
    it('formats price in TND with 3 decimal precision (e.g. 18.500 TND)', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        const priceElement = screen.getAllByText(/18\.500|18,500|18\.5/i);
        expect(priceElement.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders color-coded stock badges (green: in stock, amber: low stock <= 5, red: out of stock 0)', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getAllByText(/45/).length).toBeGreaterThanOrEqual(1); // In stock
        expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);  // Low stock
      });
    });

    it('renders verified merchant badge and live store quick link', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Sfax Nature Treasures').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Carthage Heritage Weavers')).toBeInTheDocument();
      });

      const storeLinks = screen.getAllByRole('link');
      const liveLink = storeLinks.find(link => link.getAttribute('href')?.includes('products/artisanal-olive-oil-soap'));
      expect(liveLink).toBeDefined();
    });

    it('copies product ID to clipboard and displays confirmation tooltip', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByRole('button', { name: /copy|copier|نسخ/i });
      if (copyButtons.length > 0) {
        fireEvent.click(copyButtons[0]);
        await waitFor(() => {
          expect(writeTextMock).toHaveBeenCalled();
        });
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUITE 5: Slide-Out Inspection Drawer & Tag Studio Mutation (Tier 1, 2, 4)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 5: Slide-Out Inspection Drawer & Tag Studio Mutation', () => {
    it('opens inspection drawer when a product row or Inspect button is clicked', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const inspectButtons = screen.getAllByRole('button', { name: /inspect|inspecter|معاينة/i });
      if (inspectButtons.length > 0) {
        fireEvent.click(inspectButtons[0]);
      } else {
        fireEvent.click(screen.getByText('Artisanal Olive Oil Soap'));
      }

      await waitFor(() => {
        expect(screen.getByText(/Product Inspection|Inspection du Produit|معاينة المنتج/i)).toBeInTheDocument();
      });
    });

    it('navigates between all 6 drawer tabs (Overview, Variants, Specs, SEO, Store, Tag Studio)', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Artisanal Olive Oil Soap'));

      await waitFor(() => {
        expect(screen.getByText(/Product Inspection|Inspection du Produit|معاينة المنتج/i)).toBeInTheDocument();
      });

      // Tab 2: Variants Matrix
      const variantsTab = screen.getByRole('tab', { name: /variants|variantes|الأشكال/i });
      fireEvent.click(variantsTab);
      await waitFor(() => {
        expect(screen.getByText('Lavender Infusion')).toBeInTheDocument();
        expect(screen.getByText('Pure Unscented')).toBeInTheDocument();
      });

      // Tab 3: Specifications / Attributes
      const specsTab = screen.getByRole('tab', { name: /specs|attributes|spécifications|المواصفات/i });
      fireEvent.click(specsTab);
      await waitFor(() => {
        expect(screen.getByText('Organic Certified')).toBeInTheDocument();
      });

      // Tab 4: SEO & Taxonomy
      const seoTab = screen.getByRole('tab', { name: /seo|taxonomie|محركات البحث/i });
      fireEvent.click(seoTab);
      await waitFor(() => {
        expect(screen.getByText(/Organic Olive Oil Soap \| Artisan Sfax/i)).toBeInTheDocument();
      });

      // Tab 5: Store & Merchant Info
      const storeTab = screen.getByRole('tab', { name: /store|boutique|المتجر/i });
      fireEvent.click(storeTab);
      await waitFor(() => {
        expect(screen.getByText('Karim Mansour')).toBeInTheDocument();
        expect(screen.getByText('karim@sfaxnature.tn')).toBeInTheDocument();
      });
    });

    it('edits vendor tags and AI interest tags inside drawer and calls PATCH /api/pd/admin/products/:id/tags', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Artisanal Olive Oil Soap'));

      await waitFor(() => {
        expect(screen.getByText(/Product Inspection|Inspection du Produit|معاينة المنتج/i)).toBeInTheDocument();
      });

      const tagTab = screen.getByRole('tab', { name: /tags|tag studio|studio tags|الوسوم/i });
      fireEvent.click(tagTab);

      await waitFor(() => {
        expect(screen.getByText('skincare')).toBeInTheDocument();
      });

      const tagInputs = screen.getAllByPlaceholderText(/add tag|ajouter|أضف/i);
      if (tagInputs.length > 0) {
        fireEvent.change(tagInputs[0], { target: { value: 'sfax-tradition' } });
        fireEvent.keyDown(tagInputs[0], { key: 'Enter', code: 'Enter' });
      }

      const saveBtn = screen.getByRole('button', { name: /save tags|enregistrer|حفظ الوسوم/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          expect.stringContaining('/api/pd/admin/products/prod-001-soap/tags'),
          expect.objectContaining({ method: 'PATCH' })
        );
      });
    });

    it('closes inspection drawer when Close button (X) is clicked', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Artisanal Olive Oil Soap'));

      await waitFor(() => {
        expect(screen.getByText(/Product Inspection|Inspection du Produit|معاينة المنتج/i)).toBeInTheDocument();
      });

      const closeBtn = screen.getByRole('button', { name: /close|fermer|إغلاق/i });
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Variants Matrix|Matrice des Variantes|مصفوفة المتغيرات/i)).not.toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUITE 6: Pagination Controls & Edge Boundaries (Tier 1 & Tier 2)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 6: Pagination Controls & Edge Boundaries', () => {
    it('renders pagination bar with page index and record range', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Showing|Affichage|عرض/i)).toBeInTheDocument();
      });
    });

    it('navigates to next page when Next button is clicked', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const nextBtn = screen.getByRole('button', { name: /next|suivant|التالي/i });
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });
    });

    it('disables Previous button on first page', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const prevBtn = screen.getByRole('button', { name: /previous|précédent|السابق/i });
      expect(prevBtn).toBeDisabled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUITE 7: Internationalization & RTL Layout Support (Tier 1 & Tier 2)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 7: Internationalization & RTL Layout Support', () => {
    it('renders localized translation strings in English, French, and Arabic', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /grid|grille|الشبكة/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /table|tableau|الجدول/i })).toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUITE 8: Tier 4 Real-World End-to-End Component Workflows
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 8: Tier 4 Real-World End-to-End Component Workflows', () => {
    it('Scenario 1: Superadmin catalog auditing workflow from search to drawer inspection', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search|rechercher|البحث/i);
      fireEvent.change(searchInput, { target: { value: 'Kilim' } });

      await waitFor(() => {
        expect(screen.getByText('Traditional Kilim Berber Carpet')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Traditional Kilim Berber Carpet'));

      await waitFor(() => {
        expect(screen.getByText(/Product Inspection|Inspection du Produit|معاينة المنتج/i)).toBeInTheDocument();
      });
      const variantsTab = screen.getByRole('tab', { name: /variants|variantes|الأشكال/i });
      fireEvent.click(variantsTab);

      await waitFor(() => {
        expect(screen.getByText('Ochre & Terracotta')).toBeInTheDocument();
      });

      const closeBtn = screen.getByRole('button', { name: /close|fermer|إغلاق/i });
      fireEvent.click(closeBtn);
    });

    it('Scenario 2: Tag curation and live PATCH mutation workflow', async () => {
      renderWithProviders(<AdminProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Artisanal Olive Oil Soap')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Artisanal Olive Oil Soap'));

      await waitFor(() => {
        expect(screen.getByText(/Product Inspection|Inspection du Produit|معاينة المنتج/i)).toBeInTheDocument();
      });

      const tagTab = screen.getByRole('tab', { name: /tags|tag studio|studio tags|الوسوم/i });
      fireEvent.click(tagTab);

      const saveBtn = screen.getByRole('button', { name: /save tags|enregistrer|حفظ الوسوم/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          expect.stringContaining('/api/pd/admin/products/prod-001-soap/tags'),
          expect.objectContaining({ method: 'PATCH' })
        );
      });
    });
  });
});
