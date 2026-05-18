'use client';

import { fetchWithCsrf } from '@/lib/api';
import { ProductDescriptionEditor } from '@/components/product/ProductDescription';
import { updateOnboardingStep } from '@/lib/onboarding';
import { getHubProductHref } from '@/lib/product-links';
import { Edit3, Eye, ImageIcon, Images, Loader2, Package, Plus, Search, Sparkles, Tags, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../../../../contexts/LocaleContext';

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

const emptyForm: ProductForm = {
  type: 'physical',
  title: '',
  slug: '',
  product_reference: '',
  price: '',
  marketplace_category_id: '',
  storefront_category_id: '',
  inventory_quantity: '0',
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

function formatPrice(price: string | number) {
  const amount = Number(price);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} TND`;
}

function formatFileSize(size: string | number) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  return Array.from(new Set(value
    .split(/\r?\n/)
    .map((key) => key.trim())
    .filter(Boolean)));
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

function getStatusColor(status: string) {
  switch (status) {
    case 'published':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'pending_approval':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'draft':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'archived':
      return 'bg-slate-50 text-slate-600 border-slate-200';
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

async function getErrorMessage(res: Response, fallback = 'Request failed') {
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
      first_product_price: primaryProduct?.price ?? null,
      first_product_inventory: primaryProduct?.inventory_quantity ?? null,
      has_thumbnail: Boolean(primaryProduct?.thumbnail),
      category: primaryProduct?.marketplace_category_name || primaryProduct?.category || null,
      storefront_category: primaryProduct?.storefront_category_name || null,
      updated_from: 'products_page',
    },
  }).catch(() => undefined);
}

export default function ProductsPage() {
  const { t } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDigitalFile, setUploadingDigitalFile] = useState(false);
  const [compressingImages, setCompressingImages] = useState(false);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [enhancingDescription, setEnhancingDescription] = useState(false);
  const [marketplaceCategories, setMarketplaceCategories] = useState<Category[]>([]);
  const [storefrontCategories, setStorefrontCategories] = useState<Category[]>([]);
  const [newStorefrontCategory, setNewStorefrontCategory] = useState('');
  const [newStorefrontParent, setNewStorefrontParent] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'thumbnail' | 'gallery'>('thumbnail');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sellerType, setSellerType] = useState<'retailer' | 'wholesaler' | 'hybrid'>('retailer');
  const [marketplaceName, setMarketplaceName] = useState('PandaMarket');
  const isWholesaleSeller = sellerType === 'wholesaler' || sellerType === 'hybrid';

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
        setError(await getErrorMessage(res, 'Failed to load products'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchCategories = useCallback(async () => {
    try {
      const [marketplaceRes, storefrontRes] = await Promise.all([
        fetchWithCsrf('/api/pd/categories', { credentials: 'include' }),
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
      setError('Failed to load product categories');
    }
  }, []);

  const fetchMediaItems = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/media?limit=100', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.data || []);
      }
    } catch {
      // ignore media picker failures
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === '1' || params.get('new') === '1') {
      setShowCreate(true);
    }
  }, []);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchMediaItems();
  }, [fetchMediaItems]);

  useEffect(() => {
    let active = true;
    async function fetchMarketplaceSettings() {
      try {
        const res = await fetchWithCsrf('/api/pd/marketplace/settings', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setMarketplaceName(data.data?.marketplace_name || 'PandaMarket');
      } catch {
        if (active) setMarketplaceName('PandaMarket');
      }
    }
    fetchMarketplaceSettings();
    return () => {
      active = false;
    };
  }, []);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      [product.title, product.category, product.marketplace_category_name, product.storefront_category_name, product.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [products, search]);

  const publishedCount = products.filter((product) => product.status === 'published').length;
  const draftCount = products.filter((product) => product.status === 'draft').length;
  const lowStockCount = products.filter((product) => product.inventory_quantity < 10).length;
  const inventoryCount = products.reduce((total, product) => total + (product.inventory_quantity || 0), 0);

  const saveProductImage = async (productId: string, thumbnail: string) => {
    if (!thumbnail.trim()) return;
    const imageRes = await fetchWithCsrf(`/api/pd/stores/me/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        url: thumbnail.trim(),
        alt_text: form.title.trim(),
        is_thumbnail: true,
      }),
    });
    if (!imageRes.ok) {
      throw new Error(await getErrorMessage(imageRes, 'Failed to save product image'));
    }
  };

  const uploadProductFile = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Please upload a JPG, PNG, or WebP image.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Product image must be smaller than 10 MB.');
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

    if (!presignRes.ok) {
      throw new Error(await getErrorMessage(presignRes, 'Failed to prepare image upload'));
    }

    const data = await presignRes.json();
    const uploadUrl = data.upload_url as string | undefined;
    const publicUrl = data.public_url as string | undefined;

    if (!uploadUrl || !publicUrl) {
      throw new Error('Upload URL was not returned by the server.');
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error('Image upload failed.');
    }

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
      setError(err instanceof Error ? err.message : 'Image upload failed');
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
      setError(err instanceof Error ? err.message : 'Gallery upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDigitalFileUpload = async (file: File | null) => {
    if (!file) return;
    setError('');
    setSuccess('');
    setUploadingDigitalFile(true);
    try {
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('Digital file must be smaller than 100 MB.');
      }
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          purpose: 'digital_product',
          file_size: file.size,
        }),
      });
      if (!presignRes.ok) {
        throw new Error(await getErrorMessage(presignRes, 'Failed to prepare digital file upload'));
      }
      const data = await presignRes.json();
      const uploadUrl = data.upload_url as string | undefined;
      const fileKey = data.file_key as string | undefined;
      if (!uploadUrl || !fileKey) {
        throw new Error('Upload URL was not returned by the server.');
      }
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error('Digital file upload failed.');
      }
      setForm((current) => ({
        ...current,
        digital_file_key: fileKey,
        digital_file_name: file.name,
        digital_file_content_type: file.type || 'application/octet-stream',
        digital_file_size: String(file.size),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Digital file upload failed');
    } finally {
      setUploadingDigitalFile(false);
    }
  };

  const saveGalleryImages = async (productId: string) => {
    const existingUrls = new Set((editingProduct?.images || []).filter((image) => !image.is_thumbnail).map((image) => image.url));
    const newUrls = form.gallery_images.filter((url) => url.trim() && !existingUrls.has(url.trim()));
    for (const url of newUrls) {
      const imageRes = await fetchWithCsrf(`/api/pd/stores/me/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: url.trim(),
          alt_text: form.title.trim(),
          is_thumbnail: false,
        }),
      });
      if (!imageRes.ok) {
        throw new Error(await getErrorMessage(imageRes, 'Failed to save gallery image'));
      }
    }
  };

  const deleteRemovedGalleryImages = async (productId: string) => {
    const keptUrls = new Set(form.gallery_images.map((url) => url.trim()).filter(Boolean));
    const removedImages = (editingProduct?.images || []).filter((image) => !image.is_thumbnail && !keptUrls.has(image.url));
    for (const image of removedImages) {
      const res = await fetchWithCsrf(`/api/pd/stores/me/products/${productId}/images/${image.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Failed to remove gallery image'));
      }
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setShowCreate(false);
    setSuccess('');
  };

  const openMediaPicker = (target: 'thumbnail' | 'gallery') => {
    setMediaPickerTarget(target);
    setShowMediaPicker(true);
    void fetchMediaItems();
  };

  const selectMediaItem = (url: string) => {
    setForm((current) => {
      if (mediaPickerTarget === 'thumbnail') {
        return { ...current, thumbnail: url };
      }
      return current.gallery_images.includes(url)
        ? current
        : { ...current, gallery_images: [...current.gallery_images, url] };
    });
    setShowMediaPicker(false);
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
    setShowCreate(true);
  };

  const updateAttribute = (index: number, patch: Partial<ProductAttribute>) => {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, ...patch } : attribute,
      ),
    }));
  };

  const addAttribute = () => {
    setForm((current) => ({
      ...current,
      attributes: [...current.attributes, { name: '', value: '' }],
    }));
  };

  const removeAttribute = (index: number) => {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.filter((_, attributeIndex) => attributeIndex !== index),
    }));
  };

  const updateWholesaleTier = (index: number, patch: Partial<WholesalePriceTierForm>) => {
    setForm((current) => ({
      ...current,
      wholesale_price_tiers: current.wholesale_price_tiers.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, ...patch } : tier,
      ),
    }));
  };

  const addWholesaleTier = () => {
    setForm((current) => {
      const lastQuantity = Number(current.wholesale_price_tiers.at(-1)?.min_quantity || current.wholesale_min_quantity || 1);
      return {
        ...current,
        wholesale_price_tiers: [
          ...current.wholesale_price_tiers,
          { min_quantity: String(Number.isFinite(lastQuantity) ? lastQuantity + 1 : 2), unit_price: '' },
        ],
      };
    });
  };

  const removeWholesaleTier = (index: number) => {
    setForm((current) => ({
      ...current,
      wholesale_price_tiers: current.wholesale_price_tiers.filter((_, tierIndex) => tierIndex !== index),
    }));
  };

  const updateVariant = (index: number, patch: Partial<ProductVariantForm>) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant,
      ),
    }));
  };

  const addVariant = () => {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          sku: '',
          title: '',
          price: current.price || '0',
          inventory_quantity: '0',
          option_name: current.variants[0]?.option_name || 'Size',
          option_value: '',
        },
      ],
    }));
  };

  const removeVariant = (index: number) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  };

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
      setError('Product title is required');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError('Product price must be a valid positive number');
      return;
    }

    if ((form.type === 'digital' || form.type === 'serial') && form.status !== 'draft' && !form.digital_file_key) {
      setError('Downloadable products require a file before publishing.');
      return;
    }

    if (form.type === 'serial' && form.status !== 'draft' && !editingProduct && licenseKeys.length === 0) {
      setError('Serial products require at least one license key before publishing.');
      return;
    }

    if (isWholesaleSeller) {
      if (!Number.isInteger(wholesaleMinQuantity) || wholesaleMinQuantity < 2) {
        setError('Wholesale minimum quantity must be at least 2.');
        return;
      }
      if (wholesalePriceTiers.length === 0) {
        setError('Add at least one wholesale price tier.');
        return;
      }
      if (wholesalePriceTiers.some((tier) => tier.min_quantity < wholesaleMinQuantity)) {
        setError('Wholesale tiers must start at or above the minimum wholesale quantity.');
        return;
      }
    }

    const attributes = form.attributes
      .map((attribute) => ({ name: attribute.name.trim(), value: attribute.value.trim() }))
      .filter((attribute) => attribute.name || attribute.value);

    if (attributes.some((attribute) => !attribute.name || !attribute.value)) {
      setError('Each product attribute must include both a name and a value');
      return;
    }

    if (variants.some((variant) => !variant.title || !Number.isFinite(variant.price) || variant.price < 0 || !Number.isInteger(variant.inventory_quantity) || variant.inventory_quantity < 0)) {
      setError('Each variation must include a name, valid price, and non-negative stock.');
      return;
    }

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
        setSuccess(isEditing ? 'Product updated successfully.' : 'Product created successfully.');
      } else {
        setError(await getErrorMessage(res, isEditing ? 'Failed to update product' : 'Failed to create product'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateStorefrontCategory = async () => {
    if (!newStorefrontCategory.trim()) return;
    setError('');
    setSuccess('');
    setCreatingCategory(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newStorefrontCategory.trim(),
          parent_id: newStorefrontParent || null,
        }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Failed to create storefront category'));
      }
      const data = await res.json();
      setStorefrontCategories((current) => [...current, data.category]);
      setForm((current) => ({ ...current, storefront_category_id: data.category.id }));
      setNewStorefrontCategory('');
      setNewStorefrontParent('');
      setSuccess('Storefront category created and selected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create storefront category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCompressImages = async () => {
    const urls = [form.thumbnail, ...form.gallery_images].map((url) => url.trim()).filter(Boolean);
    if (!urls.length) {
      setError('Upload at least one image before requesting compression.');
      return;
    }
    setError('');
    setSuccess('');
    setCompressingImages(true);
    try {
      for (const url of urls) {
        const res = await fetchWithCsrf('/api/pd/ai/compress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            image_url: url,
            product_id: editingProduct?.id,
          }),
        });
        if (!res.ok) {
          throw new Error(await getErrorMessage(res, 'Failed to queue image compression'));
        }
      }
      setSuccess('Image compression queued. Check the AI dashboard/history for compressed outputs.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue image compression');
    } finally {
      setCompressingImages(false);
    }
  };

  const handleGenerateSeo = async () => {
    setError('');
    setSuccess('');
    if (editingProduct?.id) {
      setGeneratingSeo(true);
      try {
        const res = await fetchWithCsrf('/api/pd/ai/seo-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ product_id: editingProduct.id, language: 'fr' }),
        });
        if (!res.ok) {
          throw new Error(await getErrorMessage(res, 'Failed to queue SEO generation'));
        }
        setSuccess('SEO generation queued. The product SEO fields will update when the AI job completes.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to queue SEO generation');
      } finally {
        setGeneratingSeo(false);
      }
      return;
    }

    const title = form.title.trim();
    if (!title) {
      setError('Enter a product title before generating SEO fields.');
      return;
    }
    const marketCategory = marketplaceCategories.find((category) => category.id === form.marketplace_category_id)?.name;
    const seoTitle = `${title}${marketCategory ? ` | ${marketCategory}` : ''}`.slice(0, 70);
    const seoDescription = (form.description.trim() || `Découvrez ${title} sur ${marketplaceName}.`).slice(0, 160);
    setForm((current) => ({
      ...current,
      seo_title: current.seo_title || seoTitle,
      seo_description: current.seo_description || seoDescription,
    }));
    setSuccess('SEO fields generated locally. Save the product to keep them.');
  };

  const handleEnhanceDescription = async () => {
    const title = form.title.trim();
    if (!title) {
      setError('Enter a product title before enhancing the description.');
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
          language: 'fr',
          tone: 'friendly',
        }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Failed to enhance product description'));
      }
      const data = await res.json();
      const description = data.description?.description_html;
      if (!description) throw new Error('AI did not return a product description.');
      setForm((current) => ({ ...current, description }));
      setSuccess('Product description enhanced with AI. Review it, then save the product.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance product description');
    } finally {
      setEnhancingDescription(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Delete this product?')) return;
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await fetchProducts();
      } else {
        setError(await getErrorMessage(res, 'Failed to delete product'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
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
        setProducts((current) =>
          current.map((item) => (item.id === product.id ? { ...item, ...data.product } : item)),
        );
        await fetchProducts();
      } else {
        setError(await getErrorMessage(res, 'Failed to update product status'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-slate-950 via-slate-900 to-[#B91C1C] p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#B91C1C]/30 blur-3xl" />
        <div className="absolute -bottom-24 left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80">
              <Package className="w-4 h-4" />
              Product studio
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Products</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
              Build your catalog with Hub categories, storefront taxonomy, image gallery, SEO tools, and media reuse.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:min-w-[560px]">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-black">{totalProducts}</p>
              <p className="text-xs text-white/70">Products</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-black">{publishedCount}</p>
              <p className="text-xs text-white/70">Published</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-black">{draftCount}</p>
              <p className="text-xs text-white/70">Drafts</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-black">{lowStockCount}</p>
              <p className="text-xs text-white/70">Low stock</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => (showCreate ? resetForm() : setShowCreate(true))}
          className="relative mt-6 inline-flex items-center px-5 py-3 bg-white text-slate-950 font-bold rounded-2xl shadow-lg shadow-black/10 hover:bg-amber-50 hover:-translate-y-0.5 transition-all"
        >
          {showCreate ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {showCreate ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">
          {success}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm text-amber-800 shadow-sm">
        Only products with status <strong>published</strong> appear in the Hub and public storefront. If your store is not verified, publishing sends the product to <strong>pending approval</strong> until an admin approves it. Current stock across this page: <strong>{inventoryCount}</strong> units.
      </div>

      {showCreate && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-amber-50/50 px-6 py-5">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                {editingProduct ? 'Edit product' : 'New product'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">Complete each block to publish a clean product page in the Hub and your storefront.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 border border-gray-200">
              {editingProduct ? 'Editing existing item' : 'Drafting new item'}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Product title</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Example: Handmade leather bag"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Product permalink</label>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: normalizePermalink(event.target.value) }))}
                placeholder={normalizePermalink(form.title) || 'auto-generated-from-title'}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty to generate it from the product title. If it already exists, {marketplaceName} adds a number.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Price</label>
              <input
                type="number"
                value={form.price}
                min="0"
                step="0.001"
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                placeholder="0.000"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Product type</label>
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
              >
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
                <option value="serial">Serial/license</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Product reference</label>
              <input
                type="text"
                value={form.product_reference}
                onChange={(event) => setForm((current) => ({ ...current, product_reference: event.target.value }))}
                placeholder="SKU, supplier ref, serial family..."
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Marketplace category</label>
              <select
                value={form.marketplace_category_id}
                onChange={(event) => setForm((current) => ({ ...current, marketplace_category_id: event.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
              >
                <option value="">Non categorized products</option>
                {marketplaceCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.is_default ? ' (default)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Used by the {marketplaceName} Hub. Managed by the super admin.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Inventory</label>
              <input
                type="number"
                value={form.inventory_quantity}
                min="0"
                onChange={(event) => setForm((current) => ({ ...current, inventory_quantity: event.target.value }))}
                placeholder="Inventory"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none"
              />
            </div>
            <div className="md:col-span-2 rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-amber-50/60 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    Variations
                  </div>
                  <h3 className="mt-3 text-lg font-black text-gray-900">Product variations</h3>
                  <p className="mt-1 text-sm font-semibold text-gray-600">
                    Add sellable choices like size, color, pack, or material. Each variation can have its own SKU, price, and stock.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#B91C1C]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add variation
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {form.variants.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-indigo-200 bg-white px-5 py-8 text-center">
                    <p className="font-bold text-gray-700">No variations yet.</p>
                    <p className="mt-1 text-sm text-gray-500">Use variations when one product has multiple choices, prices, or stock levels.</p>
                  </div>
                ) : (
                  form.variants.map((variant, index) => (
                    <div key={`${variant.id || 'new'}-${index}`} className="rounded-2xl border border-white bg-white p-4 shadow-sm ring-1 ring-gray-100">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                          Variation #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                        <input
                          type="text"
                          value={variant.title}
                          onChange={(event) => updateVariant(index, { title: event.target.value })}
                          placeholder="Label, e.g. Large / Red"
                          className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/15"
                        />
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(event) => updateVariant(index, { sku: event.target.value })}
                          placeholder="SKU"
                          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/15"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={variant.price}
                          onChange={(event) => updateVariant(index, { price: event.target.value })}
                          placeholder="Price"
                          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/15"
                        />
                        <input
                          type="number"
                          min="0"
                          value={variant.inventory_quantity}
                          onChange={(event) => updateVariant(index, { inventory_quantity: event.target.value })}
                          placeholder="Stock"
                          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/15"
                        />
                        <div className="grid grid-cols-2 gap-2 md:col-span-6">
                          <input
                            type="text"
                            value={variant.option_name}
                            onChange={(event) => updateVariant(index, { option_name: event.target.value })}
                            placeholder="Option name, e.g. Size"
                            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/15"
                          />
                          <input
                            type="text"
                            value={variant.option_value}
                            onChange={(event) => updateVariant(index, { option_value: event.target.value })}
                            placeholder="Option value, e.g. XL"
                            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/15"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {isWholesaleSeller && (
              <div className="md:col-span-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-5 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{t('productWholesale.title')}</h3>
                    <p className="mt-1 text-xs text-gray-600">
                      {sellerType === 'hybrid'
                        ? t('productWholesale.hybridDescription')
                        : t('productWholesale.wholesalerDescription')}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-amber-700">
                    {sellerType}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {sellerType === 'hybrid' ? t('productWholesale.minimumWholesaleQuantity') : t('productWholesale.minimumOrderQuantity')}
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={form.wholesale_min_quantity}
                      onChange={(event) => setForm((current) => ({ ...current, wholesale_min_quantity: event.target.value }))}
                      className="w-full px-4 py-3 border border-amber-200 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {sellerType === 'hybrid' ? t('productWholesale.hybridMinimumHelp') : t('productWholesale.wholesalerMinimumHelp')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">{t('productWholesale.oneQuantityPrice')}</label>
                    <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-gray-900">
                      {Number(form.price || 0).toFixed(3)} TND
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{t('productWholesale.basePriceHelp')}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-gray-800">{t('productWholesale.priceTiers')}</label>
                    <button
                      type="button"
                      onClick={addWholesaleTier}
                      className="inline-flex items-center rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t('productWholesale.addTier')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.wholesale_price_tiers.map((tier, index) => (
                      <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <input
                          type="number"
                          min="2"
                          value={tier.min_quantity}
                          onChange={(event) => updateWholesaleTier(index, { min_quantity: event.target.value })}
                          placeholder={t('productWholesale.quantityFrom')}
                          className="px-4 py-3 border border-amber-200 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={tier.unit_price}
                          onChange={(event) => updateWholesaleTier(index, { unit_price: event.target.value })}
                          placeholder={t('productWholesale.unitPrice')}
                          className="px-4 py-3 border border-amber-200 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeWholesaleTier(index)}
                          disabled={form.wholesale_price_tiers.length <= 1}
                          className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-white px-4 py-3 text-gray-500 hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Tags className="w-4 h-4 text-[#B91C1C]" />
                <h3 className="font-bold text-gray-900">Category mapping</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Storefront category</label>
                  <select
                    value={form.storefront_category_id}
                    onChange={(event) => setForm((current) => ({ ...current, storefront_category_id: event.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                  >
                    <option value="">Non categorized products</option>
                    {storefrontCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.parent_id ? '— ' : ''}{category.name}{category.is_default ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Used inside your storefront. If empty, the product goes to your default category.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Add storefront category/subcategory</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newStorefrontCategory}
                      onChange={(event) => setNewStorefrontCategory(event.target.value)}
                      placeholder="New category name"
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                    />
                    <select
                      value={newStorefrontParent}
                      onChange={(event) => setNewStorefrontParent(event.target.value)}
                      className="px-3 py-2.5 border border-gray-300 rounded-xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                    >
                      <option value="">Top level</option>
                      {storefrontCategories.filter((category) => !category.parent_id).map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleCreateStorefrontCategory}
                      disabled={creatingCategory || !newStorefrontCategory.trim()}
                      className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {creatingCategory ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            {(form.type === 'digital' || form.type === 'serial') && (
              <div className="md:col-span-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Digital delivery file</label>
                    <p className="text-xs text-gray-500">Upload the private file customers can download after captured payment.</p>
                  </div>
                  <label className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-amber-50 cursor-pointer transition-colors">
                    {uploadingDigitalFile ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#B91C1C]" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2 text-[#B91C1C]" />
                    )}
                    {uploadingDigitalFile ? 'Uploading...' : 'Upload digital file'}
                    <input
                      type="file"
                      accept="application/pdf,application/zip,application/x-zip-compressed,application/octet-stream,text/plain"
                      disabled={uploadingDigitalFile}
                      onChange={(event) => handleDigitalFileUpload(event.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
                {form.digital_file_key ? (
                  <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{form.digital_file_name || 'Digital file attached'}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(form.digital_file_size)} {form.digital_file_content_type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({
                        ...current,
                        digital_file_key: '',
                        digital_file_name: '',
                        digital_file_content_type: '',
                        digital_file_size: '',
                      }))}
                      className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-amber-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                    No digital file attached.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Max downloads per order</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={form.max_downloads}
                      onChange={(event) => setForm((current) => ({ ...current, max_downloads: event.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Download link expiry hours</label>
                    <input
                      type="number"
                      min="1"
                      max="8760"
                      value={form.download_expires_hours}
                      onChange={(event) => setForm((current) => ({ ...current, download_expires_hours: event.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                    />
                  </div>
                </div>
                {form.type === 'serial' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">License keys</label>
                    <textarea
                      value={form.license_keys}
                      onChange={(event) => setForm((current) => ({ ...current, license_keys: event.target.value }))}
                      rows={6}
                      placeholder="One license key per line"
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white font-mono text-sm"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Existing keys are not displayed. Add new unused keys here when creating or replenishing a serial product.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="w-full lg:w-40">
                  <div className="aspect-square rounded-2xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center shadow-inner">
                    {form.thumbnail ? (
                      <img src={form.thumbnail} alt="Product preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Product picture</label>
                    <p className="text-xs text-gray-500">Upload a JPG, PNG, or WebP image, or paste an existing image URL.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                      {uploadingImage ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#B91C1C]" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2 text-[#B91C1C]" />
                      )}
                      {uploadingImage ? 'Uploading...' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingImage}
                        onChange={(event) => handleImageUpload(event.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openMediaPicker('thumbnail')}
                      className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Images className="w-4 h-4 mr-2 text-[#B91C1C]" />
                      Choose from library
                    </button>
                    {form.thumbnail && (
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, thumbnail: '' }))}
                        className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={form.thumbnail}
                    onChange={(event) => setForm((current) => ({ ...current, thumbnail: event.target.value }))}
                    placeholder="Or paste a thumbnail image URL"
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Gallery images</label>
                  <p className="text-xs text-gray-500">Add extra product images for the product gallery.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Images className="w-4 h-4 mr-2 text-[#B91C1C]" />
                    Upload gallery
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploadingImage}
                      onChange={(event) => handleGalleryUpload(event.target.files)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => openMediaPicker('gallery')}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Images className="w-4 h-4 mr-2 text-[#B91C1C]" />
                    Choose existing
                  </button>
                  <button
                    type="button"
                    onClick={handleCompressImages}
                    disabled={compressingImages || uploadingImage}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {compressingImages ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#B91C1C]" /> : <Sparkles className="w-4 h-4 mr-2 text-[#B91C1C]" />}
                    Compress images
                  </button>
                </div>
              </div>
              {form.gallery_images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {form.gallery_images.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative aspect-square rounded-2xl border border-gray-200 bg-white overflow-hidden group shadow-sm">
                      <img src={url} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({
                          ...current,
                          gallery_images: current.gallery_images.filter((_, imageIndex) => imageIndex !== index),
                        }))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-white/90 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  No gallery images yet.
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="block text-sm font-semibold text-gray-800">Product description</label>
                <button
                  type="button"
                  onClick={handleEnhanceDescription}
                  disabled={enhancingDescription || !form.title.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-[#B91C1C] transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enhancingDescription ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Enhance with AI
                </button>
              </div>
              <ProductDescriptionEditor
                value={form.description}
                onChange={(description) => setForm((current) => ({ ...current, description }))}
                placeholder="Description"
              />
            </div>
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Tags className="w-4 h-4 text-[#B91C1C]" />
                <h3 className="font-bold text-gray-900">Product metadata</h3>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Tags</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="Comma separated tags: handmade, leather, gift"
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                />
                <p className="mt-1 text-xs text-gray-500">Tags improve Hub search and filtering.</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-gray-800">Attributes</label>
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5 text-[#B91C1C]" />
                    Add attribute
                  </button>
                </div>
                {form.attributes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
                    No custom attributes yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.attributes.map((attribute, index) => (
                      <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <input
                          type="text"
                          value={attribute.name}
                          onChange={(event) => updateAttribute(index, { name: event.target.value })}
                          placeholder="Name, e.g. Material"
                          className="px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                        />
                        <input
                          type="text"
                          value={attribute.value}
                          onChange={(event) => updateAttribute(index, { value: event.target.value })}
                          placeholder="Value, e.g. Genuine leather"
                          className="px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttribute(index)}
                          className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-500 hover:border-red-200 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">SEO</label>
                  <p className="text-xs text-gray-500">Generate or edit SEO metadata for marketplace and storefront pages.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSeo}
                  disabled={generatingSeo}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {generatingSeo ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#B91C1C]" /> : <Sparkles className="w-4 h-4 mr-2 text-[#B91C1C]" />}
                  SEO Automatique
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">SEO title</label>
                  <input
                    type="text"
                    value={form.seo_title}
                    maxLength={200}
                    onChange={(event) => setForm((current) => ({ ...current, seo_title: event.target.value }))}
                    placeholder="SEO title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">SEO description</label>
                  <input
                    type="text"
                    value={form.seo_description}
                    maxLength={300}
                    onChange={(event) => setForm((current) => ({ ...current, seo_description: event.target.value }))}
                    placeholder="SEO description"
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/15 outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">Images, category mapping, and SEO metadata will be saved together.</p>
            <button
              type="button"
              onClick={handleSave}
              disabled={creating || uploadingImage}
              className="inline-flex items-center justify-center px-6 py-3 bg-[#B91C1C] text-white font-bold rounded-2xl hover:bg-[#991B1B] shadow-lg shadow-[#B91C1C]/20 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {uploadingImage ? 'Uploading image...' : creating ? 'Saving...' : editingProduct ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row gap-4 justify-between lg:items-center bg-gray-50/70">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#B91C1C]/15 focus:border-[#B91C1C] outline-none transition-all bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#B91C1C] animate-spin" />
              <span className="ml-2 text-gray-500">Loading products...</span>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500">No products found for this store.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold">Product Name</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Inventory</th>
                  <th className="px-6 py-4 font-semibold">Categories</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-amber-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-14 w-14 flex-shrink-0 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                          {product.thumbnail ? (
                            <img src={product.thumbnail} alt={product.title} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-[#B91C1C] transition-colors">
                            {product.title}
                          </div>
                          <div className="text-xs text-gray-400">{product.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatPrice(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(product.status)}`}>
                        {product.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className={product.inventory_quantity < 10 ? 'text-red-600 font-medium' : ''}>
                        {product.inventory_quantity} in stock
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase">Hub</span>{' '}
                          <span>{product.marketplace_category_name || product.category || 'Non categorized products'}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase">Store</span>{' '}
                          <span>{product.storefront_category_name || 'Non categorized products'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={getHubProductHref(product)}
                          target="_blank"
                          className="p-2 text-gray-400 hover:text-[#B91C1C] hover:bg-[#B91C1C]/5 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <select
                          value={product.status}
                          onChange={(event) => handleStatusChange(product, event.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="archived">Archived</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages} · {totalProducts} products
          </span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showMediaPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Media library</h2>
                <p className="text-sm text-gray-500">Choose an already uploaded product image.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {mediaItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {mediaItems.map((item) => (
                    <button
                      type="button"
                      key={`${item.url}-${item.product_id}`}
                      onClick={() => selectMediaItem(item.url)}
                      className="text-left rounded-2xl border border-gray-200 overflow-hidden bg-white hover:border-[#B91C1C] hover:shadow-md transition-all"
                    >
                      <div className="aspect-square bg-gray-100">
                        <img src={item.url} alt={item.alt_text || item.product_title} className="h-full w-full object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-700 truncate">{item.product_title}</p>
                        <p className="text-[10px] text-gray-400">{item.is_thumbnail ? 'Thumbnail' : 'Gallery image'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <Images className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p>No uploaded product images yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


