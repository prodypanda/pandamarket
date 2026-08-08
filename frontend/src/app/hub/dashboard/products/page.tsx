'use client';

import { fetchWithCsrf } from '@/lib/api';
import { ProductDescriptionEditor } from '@/components/product/ProductDescription';
import { updateOnboardingStep } from '@/lib/onboarding';
import { getHubProductHref } from '@/lib/product-links';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Copy,
  Download,
  Edit3,
  Eye,
  FileCode,
  FileText,
  Filter,
  Image as ImageIcon,
  Images,
  Info,
  Key,
  Layers,
  Link as LinkIcon,
  Loader2,
  Lock,
  Megaphone,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Shield,
  ShoppingBag,
  Sparkles,
  Tag,
  Tags,
  Trash2,
  TrendingUp,
  Upload,
  Wand2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../../../../contexts/LocaleContext';

// =========================================================================
// TYPES & DATA STRUCTURES
// =========================================================================

interface ProductImage {
  id: string;
  url: string;
  alt_text?: string | null;
  position: number;
  is_thumbnail: boolean;
}

interface ProductAttribute {
  name: string;
  value: string;
}

interface WholesalePriceTier {
  min_quantity: number;
  unit_price: number;
}

interface WholesalePricing {
  enabled?: boolean;
  min_quantity?: number;
  price_tiers?: WholesalePriceTier[];
}

interface WholesalePriceTierForm {
  min_quantity: string;
  unit_price: string;
}

interface ProductVariant {
  id?: string;
  sku?: string | null;
  title: string;
  price: string | number;
  inventory_quantity: number;
  options?: Record<string, string>;
}

interface ProductVariantForm {
  id?: string;
  sku: string;
  title: string;
  price: string;
  inventory_quantity: string;
  option_name: string;
  option_value: string;
}

interface Product {
  id: string;
  type?: string;
  title: string;
  slug?: string;
  description?: string | null;
  category?: string | null;
  product_reference?: string | null;
  marketplace_category_id?: string | null;
  storefront_category_id?: string | null;
  marketplace_category_name?: string | null;
  marketplace_category_slug?: string | null;
  storefront_category_name?: string | null;
  store_subdomain?: string | null;
  price: string | number;
  status: string;
  inventory_quantity: number;
  thumbnail?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  tags?: string[];
  attributes?: ProductAttribute[];
  metadata?: {
    wholesale_pricing?: WholesalePricing;
  } & Record<string, unknown>;
  images?: ProductImage[];
  max_downloads?: number | null;
  download_expires_hours?: number | null;
  digital_file_key?: string | null;
  digital_file_name?: string | null;
  digital_file_content_type?: string | null;
  digital_file_size?: string | number | null;
  variants?: ProductVariant[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  parent_name?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  product_count?: number;
}

interface MediaItem {
  url: string;
  product_id: string;
  product_title: string;
  alt_text?: string | null;
  is_thumbnail?: boolean;
}

interface ProductForm {
  type: string;
  title: string;
  slug: string;
  product_reference: string;
  price: string;
  marketplace_category_id: string;
  storefront_category_id: string;
  inventory_quantity: string;
  description: string;
  thumbnail: string;
  gallery_images: string[];
  seo_title: string;
  seo_description: string;
  tags: string;
  attributes: ProductAttribute[];
  max_downloads: string;
  download_expires_hours: string;
  digital_file_key: string;
  digital_file_name: string;
  digital_file_content_type: string;
  digital_file_size: string;
  license_keys: string;
  wholesale_min_quantity: string;
  wholesale_price_tiers: WholesalePriceTierForm[];
  variants: ProductVariantForm[];
  status: string;
}

type DrawerTab = 'general' | 'pricing' | 'taxonomy' | 'description' | 'media' | 'seo' | 'digital';

const emptyForm: ProductForm = {
  type: 'physical',
  title: '',
  slug: '',
  product_reference: '',
  price: '',
  marketplace_category_id: '',
  storefront_category_id: '',
  inventory_quantity: '10',
  description: '',
  thumbnail: '',
  gallery_images: [],
  seo_title: '',
  seo_description: '',
  tags: '',
  attributes: [],
  max_downloads: '5',
  download_expires_hours: '72',
  digital_file_key: '',
  digital_file_name: '',
  digital_file_content_type: '',
  digital_file_size: '',
  license_keys: '',
  wholesale_min_quantity: '2',
  wholesale_price_tiers: [{ min_quantity: '2', unit_price: '' }],
  variants: [],
  status: 'published',
};

const STUDIO_PRESETS = [
  { id: 'marbre', name: 'Marbre Blanc', icon: '🏛️', desc: 'Plateau en marbre carrare avec reflets doux' },
  { id: 'gradient', name: 'Gradient Studio', icon: '🎨', desc: 'Fond épuré avec dégradé de lumière diffuse' },
  { id: 'bois', name: 'Chêne Massif', icon: '🪵', desc: 'Table en bois naturel avec ombres réalistes' },
  { id: 'sable', name: 'Sable du Désert', icon: '🏖️', desc: 'Texture minérale chaude de style lifestyle' },
];

function formatPrice(price: string | number) {
  const amount = Number(price);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} TND`;
}

function normalizePermalink(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseLicenseKeys(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((key) => key.trim())
        .filter(Boolean),
    ),
  );
}

function parseWholesalePriceTiers(tiers: WholesalePriceTierForm[]): WholesalePriceTier[] {
  return tiers
    .map((tier) => ({
      min_quantity: Number(tier.min_quantity),
      unit_price: Number(tier.unit_price),
    }))
    .filter((tier) => Number.isInteger(tier.min_quantity) && tier.min_quantity >= 2 && Number.isFinite(tier.unit_price) && tier.unit_price >= 0)
    .sort((a, b) => a.min_quantity - b.min_quantity);
}

function parseProductVariants(variants: ProductVariantForm[]) {
  return variants
    .map((variant) => {
      const options: Record<string, string> = {};
      if (variant.option_name.trim() && variant.option_value.trim()) {
        options[variant.option_name.trim()] = variant.option_value.trim();
      }
      return {
        id: variant.id,
        sku: variant.sku.trim() || null,
        title: variant.title.trim(),
        price: Number(variant.price),
        inventory_quantity: Number(variant.inventory_quantity || 0),
        options,
      };
    })
    .filter((variant) => variant.title || variant.sku || Object.keys(variant.options).length > 0);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return { label: 'Publié', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' };
    case 'pending_approval':
      return { label: 'En attente', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' };
    case 'draft':
      return { label: 'Brouillon', badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' };
    case 'rejected':
      return { label: 'Rejeté', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300' };
    case 'archived':
      return { label: 'Archivé', badge: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400' };
    default:
      return { label: status, badge: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
}

function getTypeBadge(type?: string) {
  switch (type) {
    case 'digital':
      return { label: 'Numérique', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' };
    case 'serial':
      return { label: 'Licence / Clé', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' };
    case 'service':
      return { label: 'Prestation', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300' };
    default:
      return { label: 'Physique', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' };
  }
}

async function getErrorMessage(res: Response, fallback = 'Échec de la requête') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function syncFirstProductOnboarding(productTotal: number, currentProducts: Product[]) {
  const primaryProduct = currentProducts[0] || null;
  updateOnboardingStep('first_product', {
    completed: productTotal > 0,
    metadata: {
      product_count: productTotal,
      first_product_id: primaryProduct?.id || null,
      first_product_title: primaryProduct?.title || null,
      first_product_status: primaryProduct?.status || null,
      first_product_price: primaryProduct?.price || null,
      first_product_inventory: primaryProduct?.inventory_quantity || null,
      has_thumbnail: Boolean(primaryProduct?.thumbnail),
      category: primaryProduct?.marketplace_category_name || primaryProduct?.category || null,
      storefront_category: primaryProduct?.storefront_category_name || null,
      updated_from: 'products_page',
    },
  }).catch(() => undefined);
}

// =========================================================================
// MAIN PRODUCTS PAGE COMPONENT
// =========================================================================

export default function ProductsPage() {
  const { t, locale } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('general');
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDigitalFile, setUploadingDigitalFile] = useState(false);
  const [compressingImages, setCompressingImages] = useState(false);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [enhancingDescription, setEnhancingDescription] = useState(false);

  // Categories
  const [marketplaceCategories, setMarketplaceCategories] = useState<Category[]>([]);
  const [storefrontCategories, setStorefrontCategories] = useState<Category[]>([]);
  const [newStorefrontCategory, setNewStorefrontCategory] = useState('');
  const [newStorefrontParent, setNewStorefrontParent] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Media Picker
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'thumbnail' | 'gallery'>('thumbnail');

  // Pagination & Stats
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sellerType, setSellerType] = useState<'retailer' | 'wholesaler' | 'hybrid'>('retailer');
  const [marketplaceName, setMarketplaceName] = useState('PandaMarket');
  const isWholesaleSeller = sellerType === 'wholesaler' || sellerType === 'hybrid';

  // AI Smart Fill & Photo Studio
  const [smartFillLoading, setSmartFillLoading] = useState(false);
  const [showSmartFillModal, setShowSmartFillModal] = useState(false);
  const [smartFillSuggestions, setSmartFillSuggestions] = useState<{
    suggested_title: string;
    suggested_description: string;
    suggested_hub_category_name: string;
    suggested_hub_subcategory_name: string;
    suggested_storefront_category: string;
    suggested_storefront_subcategory: string;
  } | null>(null);
  const [photoStudioLoading, setPhotoStudioLoading] = useState(false);

  // -----------------------------------------------------------------------
  // DATA FETCHING
  // -----------------------------------------------------------------------

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const nextSellerType = data.store?.seller_type;
        if (nextSellerType === 'wholesaler' || nextSellerType === 'hybrid' || nextSellerType === 'retailer') {
          setSellerType(nextSellerType);
        }
      }
    } catch {
      setSellerType('retailer');
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/products?page=${page}&limit=20`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const nextProducts = Array.isArray(data.data) ? (data.data as Product[]) : [];
        const nextTotal = Number(data.meta?.total || 0);
        setProducts(nextProducts);
        setTotalPages(data.meta?.total_pages || 1);
        setTotalProducts(nextTotal);
        if (page === 1) {
          syncFirstProductOnboarding(nextTotal, nextProducts);
        }
      } else {
        setError(await getErrorMessage(res, 'Impossible de charger le catalogue'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchCategories = useCallback(async () => {
    try {
      const [marketplaceRes, storefrontRes] = await Promise.all([
        fetchWithCsrf(`/api/pd/categories?locale=${locale}`, { credentials: 'include' }),
        fetchWithCsrf('/api/pd/stores/me/categories', { credentials: 'include' }),
      ]);
      if (marketplaceRes.ok) {
        const data = await marketplaceRes.json();
        setMarketplaceCategories(data.data || []);
      }
      if (storefrontRes.ok) {
        const data = await storefrontRes.json();
        setStorefrontCategories(data.data || []);
      }
    } catch {
      setError('Impossible de charger les catégories');
    }
  }, [locale]);

  const fetchMediaItems = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/media?limit=100', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchStore();
    fetchCategories();
    fetchMediaItems();
  }, [fetchStore, fetchCategories, fetchMediaItems]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === '1' || params.get('new') === '1') {
      setShowDrawer(true);
    }
    const editId = params.get('edit');
    if (editId) {
      if (editingProduct?.id === editId) return;
      const existingProduct = products.find((p) => p.id === editId);
      if (existingProduct) {
        startEdit(existingProduct);
      }
    }
  }, [products, editingProduct]);

  // -----------------------------------------------------------------------
  // PRODUCT COMPUTATIONS & KPI METRICS
  // -----------------------------------------------------------------------

  const publishedCount = useMemo(() => products.filter((p) => p.status === 'published').length, [products]);
  const draftCount = useMemo(() => products.filter((p) => p.status === 'draft' || p.status === 'pending_approval').length, [products]);
  const lowStockCount = useMemo(() => products.filter((p) => p.inventory_quantity <= 5).length, [products]);
  const totalStockCount = useMemo(() => products.reduce((acc, p) => acc + (p.inventory_quantity || 0), 0), [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(term);
        const matchesSku = p.product_reference?.toLowerCase().includes(term);
        const matchesCategory = p.marketplace_category_name?.toLowerCase().includes(term) || p.storefront_category_name?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesSku && !matchesCategory) return false;
      }
      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'low_stock') {
          if (p.inventory_quantity > 5) return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }
      // Type
      if (typeFilter !== 'all' && (p.type || 'physical') !== typeFilter) {
        return false;
      }
      // Category
      if (categoryFilter !== 'all' && p.marketplace_category_id !== categoryFilter && p.storefront_category_id !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [products, search, statusFilter, typeFilter, categoryFilter]);

  // -----------------------------------------------------------------------
  // AI SMART FILL & PHOTO STUDIO HANDLERS
  // -----------------------------------------------------------------------

  const handleSmartFill = async () => {
    if (!form.title && !form.description && !form.thumbnail) {
      setError("Veuillez d'abord saisir un titre, une description ou ajouter une image.");
      return;
    }

    setSmartFillLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/ai/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          image_url: form.thumbnail,
          language: locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Génération intelligente échouée.');

      setSmartFillSuggestions(data.suggestions);
      setShowSmartFillModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération IA.');
    } finally {
      setSmartFillLoading(false);
    }
  };

  const applySmartFillItem = (field: 'title' | 'description' | 'hub_category' | 'storefront_category') => {
    if (!smartFillSuggestions) return;
    setForm((prev) => {
      const next = { ...prev };
      if (field === 'title') next.title = smartFillSuggestions.suggested_title;
      if (field === 'description') next.description = smartFillSuggestions.suggested_description;
      if (field === 'hub_category') {
        const found = marketplaceCategories.find((c) =>
          c.name.toLowerCase().includes(smartFillSuggestions.suggested_hub_category_name.toLowerCase()),
        );
        if (found) next.marketplace_category_id = found.id;
      }
      if (field === 'storefront_category') {
        const found = storefrontCategories.find((c) =>
          c.name.toLowerCase().includes(smartFillSuggestions.suggested_storefront_category.toLowerCase()),
        );
        if (found) next.storefront_category_id = found.id;
      }
      return next;
    });
  };

  const applyAllSmartFill = () => {
    if (!smartFillSuggestions) return;
    applySmartFillItem('title');
    applySmartFillItem('description');
    applySmartFillItem('hub_category');
    applySmartFillItem('storefront_category');
    setShowSmartFillModal(false);
    setSuccess('Toutes les informations suggérées par l’IA ont été appliquées avec succès !');
  };

  const handlePhotoStudioReplaceBackground = async (preset: string) => {
    if (!form.thumbnail) {
      setError("Veuillez d'abord importer une image principale de produit avant d'utiliser le Studio Photo.");
      return;
    }

    setPhotoStudioLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/ai/photo-studio/replace-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          image_url: form.thumbnail,
          preset,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Remplacement de fond échoué.');

      setSuccess(`Fond studio "${preset}" appliqué avec succès par l'IA !`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur Studio Photo.');
    } finally {
      setPhotoStudioLoading(false);
    }
  };

  const handlePhotoStudioGenerateGallery = async () => {
    if (!form.title) {
      setError('Veuillez renseigner un titre de produit avant de générer la galerie photo.');
      return;
    }

    setPhotoStudioLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/ai/photo-studio/generate-gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_title: form.title,
          image_url: form.thumbnail || undefined,
          style: 'lifestyle',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Génération de la galerie échouée.');

      if (Array.isArray(data.gallery_images)) {
        setForm((prev) => ({
          ...prev,
          gallery_images: Array.from(new Set([...prev.gallery_images, ...data.gallery_images])).slice(0, 8),
        }));
        setSuccess("2 nouvelles photos de galerie et mockups publicitaires générées par l'IA !");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de génération de galerie.');
    } finally {
      setPhotoStudioLoading(false);
    }
  };

  const handlePhotoStudioEnhance = async () => {
    if (!form.thumbnail) {
      setError("Veuillez d'abord importer une image de produit.");
      return;
    }

    setPhotoStudioLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/ai/photo-studio/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ image_url: form.thumbnail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Sublimation d'image échouée.");

      setSuccess("Éclairage, balance des blancs et résolution 4K sublimés par l'IA !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'amélioration d'image.");
    } finally {
      setPhotoStudioLoading(false);
    }
  };

  const handleEnhanceDescription = async () => {
    const title = form.title.trim();
    if (!title) {
      setError("Saisissez un titre de produit avant d'enrichir la description.");
      return;
    }
    setError('');
    setSuccess('');
    setEnhancingDescription(true);
    try {
      const marketCategory = marketplaceCategories.find((category) => category.id === form.marketplace_category_id)?.name;
      const res = await fetchWithCsrf('/api/pd/ai/product-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: editingProduct?.id,
          title,
          current_description: form.description.trim() || undefined,
          category: marketCategory || undefined,
          attributes: form.attributes
            .map((attribute) => ({ name: attribute.name.trim(), value: attribute.value.trim() }))
            .filter((attribute) => attribute.name && attribute.value),
          language: locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr',
          tone: 'friendly',
        }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Échec d'enrichissement IA de la description"));
      }
      const data = await res.json();
      const description = data.description?.description_html;
      if (!description) throw new Error("Aucune description HTML renvoyée par l'IA.");
      setForm((current) => ({ ...current, description }));
      setSuccess("Fiche produit enrichie par l'IA avec succès !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec d'enrichissement de la description");
    } finally {
      setEnhancingDescription(false);
    }
  };

  // -----------------------------------------------------------------------
  // DRAWER & FORM MANAGEMENT
  // -----------------------------------------------------------------------

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setShowDrawer(false);
    setDrawerTab('general');
    setSuccess('');
    setError('');
  };

  const startEdit = (product: Product) => {
    const thumbnailImage = product.images?.find((image) => image.is_thumbnail);
    const wholesalePricing = product.metadata?.wholesale_pricing;
    setEditingProduct(product);
    setForm({
      type: product.type || 'physical',
      title: product.title,
      slug: product.slug || '',
      product_reference: product.product_reference || '',
      price: String(product.price),
      marketplace_category_id: product.marketplace_category_id || '',
      storefront_category_id: product.storefront_category_id || '',
      inventory_quantity: String(product.inventory_quantity ?? 0),
      description: product.description || '',
      thumbnail: thumbnailImage?.url || product.thumbnail || '',
      gallery_images: (product.images || []).filter((image) => !image.is_thumbnail).map((image) => image.url),
      seo_title: product.seo_title || '',
      seo_description: product.seo_description || '',
      tags: (product.tags || []).join(', '),
      attributes: product.attributes || [],
      max_downloads: String(product.max_downloads ?? 5),
      download_expires_hours: String(product.download_expires_hours ?? 72),
      digital_file_key: product.digital_file_key || '',
      digital_file_name: product.digital_file_name || '',
      digital_file_content_type: product.digital_file_content_type || '',
      digital_file_size: product.digital_file_size ? String(product.digital_file_size) : '',
      license_keys: '',
      wholesale_min_quantity: String(wholesalePricing?.min_quantity ?? 2),
      wholesale_price_tiers: wholesalePricing?.price_tiers?.length
        ? wholesalePricing.price_tiers.map((tier) => ({
            min_quantity: String(tier.min_quantity),
            unit_price: String(tier.unit_price),
          }))
        : [{ min_quantity: String(wholesalePricing?.min_quantity ?? 2), unit_price: '' }],
      variants: (product.variants || []).map((variant) => {
        const firstOption = Object.entries(variant.options || {})[0];
        return {
          id: variant.id,
          sku: variant.sku || '',
          title: variant.title,
          price: String(variant.price),
          inventory_quantity: String(variant.inventory_quantity ?? 0),
          option_name: firstOption?.[0] || '',
          option_value: firstOption?.[1] || '',
        };
      }),
      status: product.status,
    });
    setDrawerTab('general');
    setShowDrawer(true);
  };

  // Upload helpers
  const uploadProductFile = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Veuillez importer une image JPG, PNG ou WebP.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("L'image ne doit pas dépasser 10 Mo.");
    }

    const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type,
        purpose: 'product_image',
      }),
    });

    if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, "Échec de préparation de l'image"));

    const data = await presignRes.json();
    const uploadUrl = data.upload_url as string | undefined;
    const publicUrl = data.public_url as string | undefined;

    if (!uploadUrl || !publicUrl) throw new Error("URL de téléversement manquante");

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadRes.ok) throw new Error("Échec de l'envoi de l'image.");
    return publicUrl;
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setError('');
    setSuccess('');
    setUploadingImage(true);
    try {
      const publicUrl = await uploadProductFile(file);
      setForm((current) => ({ ...current, thumbnail: publicUrl }));
      await fetchMediaItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de téléversement d'image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    setSuccess('');
    setUploadingImage(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadProductFile(file));
      }
      setForm((current) => ({
        ...current,
        gallery_images: [...current.gallery_images, ...urls],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de téléversement de la galerie');
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProductImage = async (productId: string, thumbnail: string) => {
    if (!thumbnail.trim()) return;
    await fetchWithCsrf(`/api/pd/stores/me/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        url: thumbnail.trim(),
        alt_text: form.title.trim(),
        is_thumbnail: true,
      }),
    });
  };

  const saveGalleryImages = async (productId: string) => {
    const existingUrls = new Set((editingProduct?.images || []).filter((image) => !image.is_thumbnail).map((image) => image.url));
    const newUrls = form.gallery_images.filter((url) => url.trim() && !existingUrls.has(url.trim()));
    for (const url of newUrls) {
      await fetchWithCsrf(`/api/pd/stores/me/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: url.trim(),
          alt_text: form.title.trim(),
          is_thumbnail: false,
        }),
      });
    }
  };

  const deleteRemovedGalleryImages = async (productId: string) => {
    const keptUrls = new Set(form.gallery_images.map((url) => url.trim()).filter(Boolean));
    const removedImages = (editingProduct?.images || []).filter((image) => !image.is_thumbnail && !keptUrls.has(image.url));
    for (const image of removedImages) {
      await fetchWithCsrf(`/api/pd/stores/me/products/${productId}/images/${image.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    }
  };

  // Save product handler
  const handleSave = async () => {
    setError('');
    setSuccess('');
    const price = Number(form.price);
    const inventory = Number(form.inventory_quantity || 0);
    const maxDownloads = Number(form.max_downloads || 5);
    const downloadExpiresHours = Number(form.download_expires_hours || 72);
    const licenseKeys = parseLicenseKeys(form.license_keys);
    const wholesaleMinQuantity = Number(form.wholesale_min_quantity || 0);
    const wholesalePriceTiers = parseWholesalePriceTiers(form.wholesale_price_tiers);
    const variants = parseProductVariants(form.variants);

    if (!form.title.trim()) {
      setError('Le titre du produit est obligatoire.');
      setDrawerTab('general');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError('Le prix doit être un nombre positif valide.');
      setDrawerTab('pricing');
      return;
    }

    const attributes = form.attributes
      .map((attribute) => ({ name: attribute.name.trim(), value: attribute.value.trim() }))
      .filter((attribute) => attribute.name || attribute.value);

    setCreating(true);
    try {
      const isEditing = Boolean(editingProduct);
      const res = await fetchWithCsrf(isEditing ? `/api/pd/stores/me/products/${editingProduct!.id}` : '/api/pd/stores/me/products', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          product_reference: form.product_reference.trim() || null,
          marketplace_category_id: form.marketplace_category_id || null,
          storefront_category_id: form.storefront_category_id || null,
          price,
          inventory_quantity: Number.isFinite(inventory) && inventory >= 0 ? inventory : 0,
          thumbnail: form.thumbnail.trim() || null,
          seo_title: form.seo_title.trim() || null,
          seo_description: form.seo_description.trim() || null,
          tags: parseTags(form.tags),
          attributes,
          max_downloads: Number.isFinite(maxDownloads) && maxDownloads > 0 ? maxDownloads : 5,
          download_expires_hours: Number.isFinite(downloadExpiresHours) && downloadExpiresHours > 0 ? downloadExpiresHours : 72,
          digital_file_key: form.digital_file_key || null,
          digital_file_name: form.digital_file_name || null,
          digital_file_content_type: form.digital_file_content_type || null,
          digital_file_size: form.digital_file_size ? Number(form.digital_file_size) : null,
          license_keys: form.type === 'serial' ? licenseKeys : undefined,
          wholesale_min_quantity: isWholesaleSeller ? wholesaleMinQuantity : undefined,
          wholesale_price_tiers: isWholesaleSeller ? wholesalePriceTiers : undefined,
          variants,
          status: form.status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const productId = data.product?.id || editingProduct?.id;
        const thumbnailChanged = form.thumbnail.trim() !== (editingProduct?.thumbnail || '').trim();
        if (productId && form.thumbnail.trim() && (!editingProduct || thumbnailChanged)) {
          await saveProductImage(productId, form.thumbnail);
        }
        if (productId) {
          await deleteRemovedGalleryImages(productId);
          await saveGalleryImages(productId);
        }
        resetForm();
        await fetchProducts();
        setSuccess(isEditing ? 'Produit mis à jour avec succès.' : 'Nouveau produit créé avec succès.');
      } else {
        setError(await getErrorMessage(res, isEditing ? 'Échec de mise à jour' : 'Échec de création'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce produit ?')) return;
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setProducts((current) => current.filter((product) => product.id !== productId));
        setTotalProducts((current) => Math.max(0, current - 1));
        setSuccess('Produit supprimé avec succès.');
      } else {
        setError(await getErrorMessage(res, 'Échec de suppression'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  };

  const handleStatusChange = async (product: Product, status: string) => {
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const data = await res.json();
        setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, ...data.product } : item)));
        setSuccess(`Statut mis à jour : ${status}`);
      } else {
        setError(await getErrorMessage(res, 'Impossible de modifier le statut'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. MINIMALIST KPI & COMMAND HEADER */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-[#B91C1C] text-white shadow-md shadow-red-500/20">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#B91C1C]">
                  Studio Catalogue Vendeur
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Stock Total: <strong className="text-slate-800 dark:text-slate-200">{totalStockCount}</strong> unités
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Gestion des Produits & Studio IA
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Créez et enrichissez votre catalogue avec classification Hub, SEO et retouche photo IA.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowDrawer(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-xs font-black text-white hover:bg-[#991B1B] shadow-sm shadow-red-500/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              Nouveau Produit
            </button>
            <button
              type="button"
              onClick={() => void fetchProducts()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#B91C1C]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50/90 dark:bg-red-950/30 p-3 text-xs font-bold text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {success && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/30 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="p-1 hover:bg-emerald-100 rounded">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* KPI Metric Pills */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Références</span>
            <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{totalProducts}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Publiés & En Ligne</span>
            <p className="mt-1 text-xl font-black text-emerald-900 dark:text-emerald-300">{publishedCount}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brouillons & Attente</span>
            <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{draftCount}</p>
          </div>
          <div
            onClick={() => setStatusFilter((curr) => (curr === 'low_stock' ? 'all' : 'low_stock'))}
            className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
              statusFilter === 'low_stock'
                ? 'bg-amber-100 dark:bg-amber-900/60 border-amber-300 ring-2 ring-amber-400'
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 hover:border-amber-200'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Alertes Stock Faible</span>
            <p className="mt-1 text-xl font-black text-amber-900 dark:text-amber-300">{lowStockCount}</p>
          </div>
        </div>
      </div>

      {/* 2. CATALOG SEARCH & MODULAR FILTER BAR */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, SKU, catégorie..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-[#B91C1C]"
          >
            <option value="all">Tous les Statuts</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
            <option value="pending_approval">En attente</option>
            <option value="low_stock">Stock Faible (≤5)</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-[#B91C1C]"
          >
            <option value="all">Tous les Types</option>
            <option value="physical">Physique</option>
            <option value="digital">Numérique</option>
            <option value="serial">Licence / Série</option>
            <option value="service">Prestation</option>
          </select>
        </div>
      </div>

      {/* 3. PRODUCT CATALOG DATA TABLE */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-xs font-semibold text-slate-400">
            <Loader2 className="w-8 h-8 text-[#B91C1C] animate-spin mb-2" />
            <span>Chargement du catalogue...</span>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-600 dark:text-slate-300">Aucun produit ne correspond à vos critères.</p>
            <p>Créez un nouveau produit ou modifiez vos filtres de recherche.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3.5 pl-6 pr-3">Visuel & Produit</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Prix Unitaire</th>
                  <th className="py-3.5 px-3">Stock Dispo</th>
                  <th className="py-3.5 px-3">Statut</th>
                  <th className="py-3.5 px-3">Catégories Hub & Vitrine</th>
                  <th className="py-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {visibleProducts.map((product) => {
                  const statusMeta = getStatusBadge(product.status);
                  const typeMeta = getTypeBadge(product.type);
                  const isLowStock = product.inventory_quantity <= 5;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                      {/* Product & Visual */}
                      <td className="py-3 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 flex-shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                            {product.thumbnail ? (
                              <img src={product.thumbnail} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs group-hover:text-[#B91C1C] transition-colors">
                              {product.title}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">
                              {product.product_reference || product.slug || product.id.slice(-8)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${typeMeta.color}`}>
                          {typeMeta.label}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white text-sm">
                        {formatPrice(product.price)}
                      </td>

                      {/* Inventory Stock */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isLowStock
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {product.inventory_quantity} en stock
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <select
                          value={product.status}
                          onChange={(e) => handleStatusChange(product, e.target.value)}
                          className={`text-[11px] font-bold border rounded-lg px-2 py-1 outline-none ${statusMeta.badge}`}
                        >
                          <option value="published">Publié</option>
                          <option value="draft">Brouillon</option>
                          <option value="archived">Archivé</option>
                        </select>
                      </td>

                      {/* Categories */}
                      <td className="py-3 px-3 text-[11px] text-slate-500 space-y-0.5 max-w-[200px] truncate">
                        <p className="truncate font-semibold text-slate-700 dark:text-slate-300">
                          🌐 {product.marketplace_category_name || product.category || 'Non classé'}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                          🏪 {product.storefront_category_name || 'Vitrine générale'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={getHubProductHref(product)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Voir en boutique"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          {product.status === 'published' && (
                            <a
                              href={`/hub/dashboard/ads?product_id=${encodeURIComponent(product.id)}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Sponsoriser / Campagne Ads"
                            >
                              <Megaphone className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            title="Modifier dans le Studio"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-800/30">
          <span>
            Page {page} sur {totalPages} · {totalProducts} références totales
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((c) => Math.max(1, c - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODULAR PRODUCT STUDIO DRAWER (THE CORE WORKSPACE) */}
      {/* ========================================================================= */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-500 to-[#B91C1C] text-white shadow-md shadow-red-500/20">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    {editingProduct ? 'Modifier le Produit' : 'Créer un Nouveau Produit'}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Studio d’édition modulaire et enrichissement IA</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSmartFill()}
                  disabled={smartFillLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-purple-500/20 hover:scale-105 transition-all disabled:opacity-50"
                  title="L'IA analyse vos mots-clés et remplit automatiquement le titre, la description et la catégorisation !"
                >
                  {smartFillLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-yellow-300" />}
                  <span>Assistant Magique IA</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modular Drawer Tab Navigation */}
            <div className="flex items-center gap-1 overflow-x-auto px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 no-scrollbar">
              {[
                { id: 'general', label: '1. Fiche & Type', icon: Package },
                { id: 'pricing', label: '2. Prix & Stock', icon: Coins },
                { id: 'taxonomy', label: '3. Catégories', icon: Tag },
                { id: 'description', label: '4. Description HTML', icon: FileText },
                { id: 'media', label: '5. Studio Photo IA', icon: ImageIcon },
                { id: 'seo', label: '6. SEO & Tags', icon: GlobeIcon },
                { id: 'digital', label: '7. Fichiers Digitaux', icon: Download },
              ].map((tab) => {
                const isActive = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id as DrawerTab)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body Tabs */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: GENERAL INFO */}
              {drawerTab === 'general' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Titre du Produit *
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                        placeholder="Ex: Montre Chronographe Automatique en Cuir"
                        className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Permalien / Slug URL
                      </label>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={(e) => setForm((c) => ({ ...c, slug: normalizePermalink(e.target.value) }))}
                        placeholder={normalizePermalink(form.title) || 'auto-genere-depuis-titre'}
                        className="w-full px-4 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Référence SKU / Code Article
                      </label>
                      <input
                        type="text"
                        value={form.product_reference}
                        onChange={(e) => setForm((c) => ({ ...c, product_reference: e.target.value }))}
                        placeholder="SKU-2026-X01"
                        className="w-full px-4 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Famille de Produit
                      </label>
                      <select
                        value={form.type}
                        onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}
                        className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                      >
                        <option value="physical">Physique (Colis & Livraison)</option>
                        <option value="digital">Numérique (Téléchargement)</option>
                        <option value="serial">Licence / Numéro de série</option>
                        <option value="service">Prestation de service</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Statut de Publication
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}
                        className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                      >
                        <option value="published">Publié (En ligne)</option>
                        <option value="draft">Brouillon</option>
                        <option value="archived">Archivé</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING & STOCK & VARIANTS */}
              {drawerTab === 'pricing' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Prix Unitaire TTC (TND) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={form.price}
                        onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))}
                        placeholder="0.000"
                        className="w-full px-4 py-2.5 text-sm font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                      />
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Quantité en Stock Initial
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.inventory_quantity}
                        onChange={(e) => setForm((c) => ({ ...c, inventory_quantity: e.target.value }))}
                        placeholder="10"
                        className="w-full px-4 py-2.5 text-sm font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                      />
                    </div>
                  </div>

                  {/* Wholesale Pricing Tiers */}
                  {isWholesaleSeller && (
                    <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-amber-900 dark:text-amber-300">
                          📦 Paliers de Prix de Gros (B2B Wholesale)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((c) => ({
                              ...c,
                              wholesale_price_tiers: [...c.wholesale_price_tiers, { min_quantity: '10', unit_price: '' }],
                            }))
                          }
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          + Ajouter un palier
                        </button>
                      </div>
                      <div className="space-y-2">
                        {form.wholesale_price_tiers.map((tier, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <input
                              type="number"
                              placeholder="Qté min"
                              value={tier.min_quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((c) => ({
                                  ...c,
                                  wholesale_price_tiers: c.wholesale_price_tiers.map((t, i) =>
                                    i === idx ? { ...t, min_quantity: val } : t,
                                  ),
                                }));
                              }}
                              className="w-28 px-3 py-1.5 text-xs font-bold rounded-lg border border-amber-200 bg-white"
                            />
                            <span className="text-xs text-slate-400">unités &rarr;</span>
                            <input
                              type="number"
                              step="0.001"
                              placeholder="Prix unitaire TND"
                              value={tier.unit_price}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((c) => ({
                                  ...c,
                                  wholesale_price_tiers: c.wholesale_price_tiers.map((t, i) =>
                                    i === idx ? { ...t, unit_price: val } : t,
                                  ),
                                }));
                              }}
                              className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-amber-200 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setForm((c) => ({
                                  ...c,
                                  wholesale_price_tiers: c.wholesale_price_tiers.filter((_, i) => i !== idx),
                                }))
                              }
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Variants Table */}
                  <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                        🎨 Variantes de Déclinaison (Taille, Couleur, Format)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((c) => ({
                            ...c,
                            variants: [
                              ...c.variants,
                              {
                                sku: '',
                                title: '',
                                price: c.price || '0',
                                inventory_quantity: '5',
                                option_name: 'Taille',
                                option_value: 'M',
                              },
                            ],
                          }))
                        }
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300"
                      >
                        + Ajouter une variante
                      </button>
                    </div>

                    {form.variants.length > 0 && (
                      <div className="space-y-2">
                        {form.variants.map((variant, idx) => (
                          <div key={idx} className="grid grid-cols-5 gap-2 items-center text-xs">
                            <input
                              type="text"
                              placeholder="Titre variante (ex: Noir / L)"
                              value={variant.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((c) => ({
                                  ...c,
                                  variants: c.variants.map((v, i) => (i === idx ? { ...v, title: val } : v)),
                                }));
                              }}
                              className="col-span-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                            <input
                              type="number"
                              step="0.001"
                              placeholder="Prix"
                              value={variant.price}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((c) => ({
                                  ...c,
                                  variants: c.variants.map((v, i) => (i === idx ? { ...v, price: val } : v)),
                                }));
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                            <input
                              type="number"
                              placeholder="Stock"
                              value={variant.inventory_quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((c) => ({
                                  ...c,
                                  variants: c.variants.map((v, i) => (i === idx ? { ...v, inventory_quantity: val } : v)),
                                }));
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setForm((c) => ({
                                  ...c,
                                  variants: c.variants.filter((_, i) => i !== idx),
                                }))
                              }
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded justify-self-end"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: TAXONOMY & CATEGORIES */}
              {drawerTab === 'taxonomy' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        🌐 Catégorie Principale PandaMarket Hub
                      </label>
                      <select
                        value={form.marketplace_category_id}
                        onChange={(e) => setForm((c) => ({ ...c, marketplace_category_id: e.target.value }))}
                        className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                      >
                        <option value="">Non catégorisé sur le Hub</option>
                        {marketplaceCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.parent_name ? `└─ ${cat.name}` : cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        🏪 Catégorie Vitrine de Votre Boutique
                      </label>
                      <select
                        value={form.storefront_category_id}
                        onChange={(e) => setForm((c) => ({ ...c, storefront_category_id: e.target.value }))}
                        className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                      >
                        <option value="">Non catégorisé sur la boutique</option>
                        {storefrontCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Add Storefront Category in 1-Click */}
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex items-center gap-3">
                    <input
                      type="text"
                      value={newStorefrontCategory}
                      onChange={(e) => setNewStorefrontCategory(e.target.value)}
                      placeholder="Ajouter une nouvelle catégorie vitrine..."
                      className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newStorefrontCategory.trim()) return;
                        setCreatingCategory(true);
                        try {
                          const res = await fetchWithCsrf('/api/pd/stores/me/categories', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ name: newStorefrontCategory.trim() }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setStorefrontCategories((curr) => [...curr, data.category]);
                            setForm((curr) => ({ ...curr, storefront_category_id: data.category.id }));
                            setNewStorefrontCategory('');
                            setSuccess('Catégorie vitrine créée et sélectionnée !');
                          }
                        } catch {}
                        setCreatingCategory(false);
                      }}
                      disabled={creatingCategory || !newStorefrontCategory.trim()}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black disabled:opacity-50"
                    >
                      {creatingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : '+ Créer'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: DESCRIPTION & HTML EDITOR */}
              {drawerTab === 'description' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                        Description Commerciale & Fiche HTML
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">Structurez vos titres H3, paragraphes et listes à puces</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleEnhanceDescription()}
                      disabled={enhancingDescription || !form.title}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      {enhancingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Sublimer avec l&apos;IA
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <ProductDescriptionEditor
                      value={form.description}
                      onChange={(val) => setForm((c) => ({ ...c, description: val }))}
                      placeholder="Décrivez les atouts majeurs, la composition et les conseils d'utilisation..."
                    />
                  </div>

                  {/* Attributes & Technical Specs */}
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                        📋 Attributs & Caractéristiques Techniques
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm((c) => ({ ...c, attributes: [...c.attributes, { name: '', value: '' }] }))}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300"
                      >
                        + Ajouter un attribut
                      </button>
                    </div>

                    {form.attributes.length > 0 && (
                      <div className="space-y-2">
                        {form.attributes.map((attr, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Propriété (ex: Matière)"
                              value={attr.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((c) => ({
                                  ...c,
                                  attributes: c.attributes.map((a, i) => (i === idx ? { ...a, name: val } : a)),
                                }));
                              }}
                              className="w-1/3 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                            />
                            <input
                              type="text"
                              placeholder="Valeur (ex: 100% Cuir Véritable)"
                              value={attr.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((c) => ({
                                  ...c,
                                  attributes: c.attributes.map((a, i) => (i === idx ? { ...a, value: val } : a)),
                                }));
                              }}
                              className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setForm((c) => ({
                                  ...c,
                                  attributes: c.attributes.filter((_, i) => i !== idx),
                                }))
                              }
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: PHOTO STUDIO & AI GENERATOR */}
              {drawerTab === 'media' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Main Thumbnail Section */}
                  <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                          Image Principale / Vignette Produit
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">Photo de couverture affichée sur la marketplace</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMediaPickerTarget('thumbnail');
                            setShowMediaPicker(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                        >
                          Médiathèque
                        </button>
                        <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black shadow-sm">
                          {uploadingImage ? 'Envoi...' : 'Téléverser'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => void handleImageUpload(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {form.thumbnail ? (
                          <img src={form.thumbnail} alt="Vignette" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200">Format recommandé : JPG / PNG / WebP</p>
                        <p className="text-slate-400">Dimensions optimales : 1000x1000px avec fond neutre.</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Photo Studio Presets */}
                  <div className="p-5 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <h4 className="text-xs font-black uppercase text-purple-900 dark:text-purple-300">
                          Studio Photo IA & Décors Publicitaires
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handlePhotoStudioEnhance()}
                          disabled={photoStudioLoading || !form.thumbnail}
                          className="px-3 py-1 text-[11px] font-bold rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 shadow-sm disabled:opacity-50"
                        >
                          {photoStudioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '✨ Sublimer 4K'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handlePhotoStudioGenerateGallery()}
                          disabled={photoStudioLoading || !form.title}
                          className="px-3 py-1 text-[11px] font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50"
                        >
                          {photoStudioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '🎨 Générer Mockups'}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed font-medium">
                      Détourez et intégrez instantanément votre produit dans un décor studio haut de gamme en 1 clic :
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {STUDIO_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={photoStudioLoading || !form.thumbnail}
                          onClick={() => void handlePhotoStudioReplaceBackground(preset.id)}
                          className="p-3 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-slate-800 text-left hover:border-purple-400 hover:shadow-md transition-all disabled:opacity-50 space-y-1"
                        >
                          <span className="text-xl">{preset.icon}</span>
                          <p className="font-black text-xs text-slate-900 dark:text-white">{preset.name}</p>
                          <p className="text-[10px] text-slate-400 leading-tight">{preset.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Image Gallery */}
                  <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                        Galerie Multi-Photos & Vues Supplémentaires ({form.gallery_images.length})
                      </span>
                      <label className="cursor-pointer px-3 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
                        + Ajouter des photos
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => void handleGalleryUpload(e.target.files)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {form.gallery_images.map((url, idx) => (
                        <div key={idx} className="relative group h-20 w-20 rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <img src={url} alt="Galerie" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((c) => ({
                                ...c,
                                gallery_images: c.gallery_images.filter((_, i) => i !== idx),
                              }))
                            }
                            className="absolute top-1 right-1 p-1 rounded-md bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: SEO & SEARCH */}
              {drawerTab === 'seo' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                        Optimisation pour les Moteurs de Recherche (SEO)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">Balises méta et mots-clés de recherche</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const title = form.title.trim();
                        if (!title) return;
                        const cat = marketplaceCategories.find((c) => c.id === form.marketplace_category_id)?.name;
                        setForm((c) => ({
                          ...c,
                          seo_title: `${title}${cat ? ` | ${cat}` : ''}`.slice(0, 60),
                          seo_description: `Découvrez ${title} sur PandaMarket. Qualité certifiée et livraison rapide.`.slice(0, 160),
                        }));
                        setSuccess('Méta-données SEO générées !');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                      Générer SEO
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Titre SEO (Balise Meta Title) - Max 60 caractères
                      </label>
                      <input
                        type="text"
                        value={form.seo_title}
                        onChange={(e) => setForm((c) => ({ ...c, seo_title: e.target.value }))}
                        placeholder="Ex: Montre Homme Automatique Luxe | Horlogerie PandaMarket"
                        className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Description SEO (Meta Description) - Max 160 caractères
                      </label>
                      <textarea
                        rows={3}
                        value={form.seo_description}
                        onChange={(e) => setForm((c) => ({ ...c, seo_description: e.target.value }))}
                        placeholder="Texte accrocheur incitant au clic dans les résultats Google..."
                        className="w-full p-3 text-xs font-medium rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mots-Clés & Tags de Recherche (Séparés par des virgules)
                      </label>
                      <input
                        type="text"
                        value={form.tags}
                        onChange={(e) => setForm((c) => ({ ...c, tags: e.target.value }))}
                        placeholder="montre, automatique, cuir, luxe, suisse"
                        className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: DIGITAL DELIVERABLES */}
              {drawerTab === 'digital' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800">
                      Téléchargements Numériques & Fichiers Sécurisés
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Téléchargements Max Autorisés</label>
                        <input
                          type="number"
                          value={form.max_downloads}
                          onChange={(e) => setForm((c) => ({ ...c, max_downloads: e.target.value }))}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Expiration du Lien (Heures)</label>
                        <input
                          type="number"
                          value={form.download_expires_hours}
                          onChange={(e) => setForm((c) => ({ ...c, download_expires_hours: e.target.value }))}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Clés de Licence / Numéros de Série (Une clé par ligne)
                      </label>
                      <textarea
                        rows={4}
                        value={form.license_keys}
                        onChange={(e) => setForm((c) => ({ ...c, license_keys: e.target.value }))}
                        placeholder="XXXX-YYYY-ZZZZ-0001&#10;XXXX-YYYY-ZZZZ-0002"
                        className="w-full p-3 font-mono text-xs font-bold rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Sticky Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={creating}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#B91C1C] text-white text-xs font-black hover:bg-[#991B1B] shadow-md shadow-red-500/20 disabled:opacity-50 transition-all"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{editingProduct ? 'Enregistrer les Modifications' : 'Créer et Publier le Produit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. AI SMART FILL REVIEW MODAL */}
      {/* ========================================================================= */}
      {showSmartFillModal && smartFillSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-3xl border border-purple-200 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-purple-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Suggestions IA Prêtes à Valider</h3>
                  <p className="text-xs text-slate-400 font-medium">Examinez les propositions et appliquez-les en un clic</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmartFillModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Suggested Title */}
              <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-purple-900 dark:text-purple-300 text-[10px]">
                    📌 Titre Commercial Optimisé
                  </span>
                  <button
                    type="button"
                    onClick={() => applySmartFillItem('title')}
                    className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-700"
                  >
                    Appliquer le titre
                  </button>
                </div>
                <p className="p-3 rounded-xl bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-purple-100 dark:border-purple-900">
                  {smartFillSuggestions.suggested_title}
                </p>
              </div>

              {/* Suggested HTML Description */}
              <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-purple-900 dark:text-purple-300 text-[10px]">
                    📄 Fiche Description HTML Enrichie
                  </span>
                  <button
                    type="button"
                    onClick={() => applySmartFillItem('description')}
                    className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-700"
                  >
                    Appliquer la description
                  </button>
                </div>
                <div
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-purple-100 dark:border-purple-900 max-h-40 overflow-y-auto leading-relaxed prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: smartFillSuggestions.suggested_description }}
                />
              </div>

              {/* Suggested Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black uppercase text-purple-900 text-[10px]">🌐 Catégorie Hub</span>
                    <button
                      type="button"
                      onClick={() => applySmartFillItem('hub_category')}
                      className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px]"
                    >
                      Appliquer
                    </button>
                  </div>
                  <p className="p-2.5 rounded-lg bg-white font-bold text-slate-800">
                    {smartFillSuggestions.suggested_hub_category_name}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black uppercase text-purple-900 text-[10px]">🏪 Catégorie Vitrine</span>
                    <button
                      type="button"
                      onClick={() => applySmartFillItem('storefront_category')}
                      className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px]"
                    >
                      Appliquer
                    </button>
                  </div>
                  <p className="p-2.5 rounded-lg bg-white font-bold text-slate-800">
                    {smartFillSuggestions.suggested_storefront_category}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-purple-100 pt-4">
              <button
                type="button"
                onClick={() => void handleSmartFill()}
                disabled={smartFillLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                {smartFillLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-600" />}
                Régénérer d&apos;autres propositions
              </button>

              <button
                type="button"
                onClick={applyAllSmartFill}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-md shadow-purple-600/20 hover:scale-105 transition-all"
              >
                <Check className="w-4 h-4 text-yellow-300" />
                Tout Valider & Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MEDIA PICKER MODAL */}
      {/* ========================================================================= */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Médiathèque Boutique</h3>
                <p className="text-xs text-slate-400 font-medium">Réutilisez une photo déjà téléversée</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {mediaItems.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 font-semibold">
                  Aucune photo enregistrée dans la médiathèque.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {mediaItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (mediaPickerTarget === 'thumbnail') {
                          setForm((c) => ({ ...c, thumbnail: item.url }));
                        } else {
                          setForm((c) => ({ ...c, gallery_images: [...c.gallery_images, item.url] }));
                        }
                        setShowMediaPicker(false);
                      }}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-[#B91C1C] transition-all bg-slate-100"
                    >
                      <img src={item.url} alt="Media" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobeIcon(props: { className?: string }) {
  return <Tag {...props} />;
}
