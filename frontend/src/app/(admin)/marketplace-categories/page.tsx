'use client';

import { fetchWithCsrf } from '@/lib/api';
import { MarketplaceAssetPicker } from '@/components/admin/MarketplaceAssetPicker';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Book,
  Car,
  ChevronDown,
  FolderTree,
  Gamepad,
  Headphones,
  Home as HomeIcon,
  ImageIcon,
  ImagePlus,
  Laptop,
  Layers,
  LayoutList,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Settings2,
  Shirt,
  Smartphone,
  Sparkles,
  Tags,
  Trash2,
  Tv,
  Utensils,
  Watch,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Icon library options for categories
const ICON_OPTIONS = [
  { name: 'Layers', comp: Layers },
  { name: 'Laptop', comp: Laptop },
  { name: 'Smartphone', comp: Smartphone },
  { name: 'Shirt', comp: Shirt },
  { name: 'Sparkles', comp: Sparkles },
  { name: 'Home', comp: HomeIcon },
  { name: 'Car', comp: Car },
  { name: 'Watch', comp: Watch },
  { name: 'Utensils', comp: Utensils },
  { name: 'Book', comp: Book },
  { name: 'Gamepad', comp: Gamepad },
  { name: 'Tv', comp: Tv },
  { name: 'Headphones', comp: Headphones },
  { name: 'Package', comp: Package },
];

interface Category {
  id: string;
  parent_id?: string | null;
  name: string;
  name_fr?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  slug: string;
  description?: string | null;
  description_fr?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  image_url?: string | null;
  icon?: string | null;
  banner_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_default: boolean;
  is_active: boolean;
  position: number;
  product_count: number;
  parent_name?: string | null;
  parent_slug?: string | null;
  children?: Category[];
}

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export default function MarketplaceCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteWarning, setDeleteWarning] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [assetPickerTarget, setAssetPickerTarget] = useState<'new' | 'edit_image' | 'edit_banner' | string | null>(null);

  // View mode & Filters
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'root' | 'sub'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});

  // Language tabs for Form & Modal
  const [formLang, setFormLang] = useState<'fr' | 'ar' | 'en'>('fr');
  const [editLang, setEditLang] = useState<'fr' | 'ar' | 'en'>('fr');

  // Create category form state
  const [nameFr, setNameFr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [icon, setIcon] = useState('Layers');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/marketplace-categories', { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to load categories'));
      const data = await res.json();
      setCategories(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Compute Statistics
  const stats = useMemo(() => {
    const total = categories.length;
    const rootCount = categories.filter((c) => !c.parent_id).length;
    const subCount = categories.filter((c) => !!c.parent_id).length;
    const activeCount = categories.filter((c) => c.is_active).length;
    const totalProducts = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);
    const fullyLocalized = categories.filter((c) => c.name_fr && c.name_ar && c.name_en).length;
    const locPercent = total > 0 ? Math.round((fullyLocalized / total) * 100) : 0;

    return { total, rootCount, subCount, activeCount, totalProducts, locPercent };
  }, [categories]);

  // Category Tree Hierarchy
  const categoryTree = useMemo(() => {
    const parentMap = new Map<string, Category>();
    const roots: Category[] = [];

    categories.forEach((cat) => {
      parentMap.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      const node = parentMap.get(cat.id)!;
      if (cat.parent_id && parentMap.has(cat.parent_id)) {
        parentMap.get(cat.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots.sort((a, b) => (a.is_default ? -1 : 0) || a.position - b.position);
  }, [categories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (typeFilter === 'root' && c.parent_id) return false;
      if (typeFilter === 'sub' && !c.parent_id) return false;
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'inactive' && c.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (
          c.name?.toLowerCase().includes(q) ||
          c.name_fr?.toLowerCase().includes(q) ||
          c.name_ar?.toLowerCase().includes(q) ||
          c.name_en?.toLowerCase().includes(q) ||
          c.slug?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
        );
        if (!matchesName) return false;
      }

      return true;
    });
  }, [categories, searchQuery, typeFilter, statusFilter]);

  const createCategory = async () => {
    const primaryName = nameFr.trim() || nameEn.trim() || nameAr.trim();
    if (!primaryName) return;
    setError('');
    setSuccess('');
    setSavingId('new');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/marketplace-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: primaryName,
          name_fr: nameFr.trim() || primaryName,
          name_ar: nameAr.trim() || undefined,
          name_en: nameEn.trim() || undefined,
          description_fr: descFr.trim() || shortDescription.trim() || undefined,
          description_ar: descAr.trim() || undefined,
          description_en: descEn.trim() || undefined,
          parent_id: parentId || null,
          short_description: shortDescription.trim() || undefined,
          long_description: descFr.trim() || undefined,
          image_url: imageUrl.trim() || null,
          icon: icon || 'Layers',
        }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to create category'));
      setNameFr('');
      setNameAr('');
      setNameEn('');
      setParentId('');
      setShortDescription('');
      setDescFr('');
      setDescAr('');
      setDescEn('');
      setImageUrl('');
      setIcon('Layers');
      setSuccess('Marketplace category created successfully.');
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSavingId(null);
    }
  };

  const updateCategory = async (category: Category, patch: Partial<Category>) => {
    setError('');
    setSuccess('');
    setSavingId(category.id);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/marketplace-categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to update category'));
      const data = await res.json();
      setCategories((current) => current.map((item) => (item.id === category.id ? { ...item, ...data.category } : item)));
      setSuccess(`Category "${category.name}" updated successfully.`);
      if (editingCategory?.id === category.id) {
        setEditingCategory(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSavingId(null);
    }
  };

  const movePosition = async (category: Category, direction: 'up' | 'down') => {
    const siblings = categories.filter((c) => c.parent_id === (category.parent_id || null));
    siblings.sort((a, b) => a.position - b.position);
    const currentIndex = siblings.findIndex((c) => c.id === category.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const otherCategory = siblings[targetIndex];
    const newPos = otherCategory.position;
    const oldPos = category.position;

    setSavingId(category.id);
    try {
      await fetchWithCsrf('/api/pd/admin/marketplace-categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: [
            { id: category.id, position: newPos },
            { id: otherCategory.id, position: oldPos },
          ],
        }),
      });
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder category');
    } finally {
      setSavingId(null);
    }
  };

  const requestDelete = async (category: Category) => {
    if (category.is_default) return;
    setError('');
    setSuccess('');
    setDeletingId(category.id);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/marketplace-categories/${category.id}/delete-impact`, { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to inspect category'));
      const impact = await res.json();
      setDeleteWarning({ ...category, product_count: impact.product_count ?? category.product_count });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to inspect category');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteWarning) return;
    setDeletingId(deleteWarning.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/marketplace-categories/${deleteWarning.id}?confirm=true`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to delete category'));
      const data = await res.json();
      setSuccess(`Category deleted. ${data.reassigned_products || 0} product(s) moved to Non categorized products.`);
      setDeleteWarning(null);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  const selectCategoryImage = (url: string) => {
    if (assetPickerTarget === 'new') {
      setImageUrl(url);
    } else if (assetPickerTarget === 'edit_image' && editingCategory) {
      setEditingCategory({ ...editingCategory, image_url: url });
    } else if (assetPickerTarget === 'edit_banner' && editingCategory) {
      setEditingCategory({ ...editingCategory, banner_url: url });
    } else if (assetPickerTarget) {
      setCategories((current) =>
        current.map((item) => (item.id === assetPickerTarget ? { ...item, image_url: url } : item)),
      );
    }
    setAssetPickerTarget(null);
  };

  const toggleParentCollapse = (id: string) => {
    setCollapsedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-8 text-white shadow-2xl shadow-slate-950/20">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-amber-500/20 blur-[80px] animate-pulse" />
        <div className="absolute right-48 top-20 h-48 w-48 rounded-full bg-amber-300/20 blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-100 backdrop-blur-md">
              <Tags className="h-3.5 w-3.5" />
              Taxonomy & Department Management
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Marketplace Categories</h1>
            <p className="mt-4 text-sm font-medium leading-relaxed text-white/80">
              Configure top-level departments, subcategories, Lucide icons, and multilingual translations (FR, AR, EN) for the PandaMarket Hub & Storefronts.
            </p>
          </div>

          {/* Top Analytics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:items-center lg:gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-2xl font-black text-white">{stats.total}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-100/70">Total Categories</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-2xl font-black text-amber-300">{stats.rootCount}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-100/70">Departments</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-2xl font-black text-amber-200">{stats.subCount}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-100/70">Subcategories</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-2xl font-black text-emerald-300">{stats.locPercent}%</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-100/70">FR/AR/EN Ready</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800 border border-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-800"><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 border border-emerald-200">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-800"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Add New Category Panel */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-200/50">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-[#B91C1C] shadow-sm">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Add New Category / Department</h2>
              <p className="text-xs font-semibold text-slate-500">Create top-level departments or sub-categories with multilingual metadata.</p>
            </div>
          </div>

          {/* Form Language Tab Selector */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFormLang('fr')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                formLang === 'fr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇫🇷 French (Default)
            </button>
            <button
              type="button"
              onClick={() => setFormLang('ar')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                formLang === 'ar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇸🇦 العربية
            </button>
            <button
              type="button"
              onClick={() => setFormLang('en')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                formLang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Dynamic Language Title Inputs */}
          {formLang === 'fr' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nom de la catégorie (FR 🇫🇷)</label>
              <input
                type="text"
                value={nameFr}
                onChange={(e) => setNameFr(e.target.value)}
                placeholder="ex. Électronique & High-Tech"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
              />
            </div>
          )}
          {formLang === 'ar' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">اسم القسم (العربية AR 🇸🇦)</label>
              <input
                type="text"
                dir="rtl"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: الإلكترونيات والتكنولوجيا"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
              />
            </div>
          )}
          {formLang === 'en' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category Name (EN 🇬🇧)</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Electronics & High-Tech"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
              />
            </div>
          )}

          {/* Parent Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Parent Department</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="">None (Top-Level Department)</option>
              {categoryTree.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  📁 {parent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Icon Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Lucide Category Icon</label>
            <div className="flex gap-2">
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.name} value={opt.name}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Language Description Inputs */}
          {formLang === 'fr' && (
            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Description (FR 🇫🇷)</label>
              <textarea
                value={descFr}
                onChange={(e) => setDescFr(e.target.value)}
                placeholder="Description détaillée du rayon en français..."
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
              />
            </div>
          )}
          {formLang === 'ar' && (
            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">الوصف (العربية AR 🇸🇦)</label>
              <textarea
                dir="rtl"
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                placeholder="وصف تفصيلي باللغة العربية للقسم..."
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
              />
            </div>
          )}
          {formLang === 'en' && (
            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Description (EN 🇬🇧)</label>
              <textarea
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                placeholder="Detailed description in English..."
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
              />
            </div>
          )}

          {/* Hero Image Selector */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Department Image URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
              />
              <button
                type="button"
                onClick={() => setAssetPickerTarget('new')}
                className="inline-flex items-center rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-[#B91C1C] transition-all hover:bg-amber-100"
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Gallery
              </button>
            </div>
          </div>

          <div className="flex items-end md:col-span-1">
            <button
              type="button"
              onClick={createCategory}
              disabled={savingId === 'new' || (!nameFr.trim() && !nameAr.trim() && !nameEn.trim())}
              className="w-full inline-flex items-center justify-center rounded-xl bg-[#B91C1C] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-red-900/20 transition-all hover:-translate-y-0.5 hover:bg-[#991B1B] disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {savingId === 'new' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
              Publish Category
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, View Modes */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Search Input */}
        <div className="relative min-w-[280px] flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by FR, AR, EN name or slug..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none hover:bg-white"
          >
            <option value="all">All Types</option>
            <option value="root">Departments Only</option>
            <option value="sub">Subcategories Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none hover:bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                viewMode === 'tree' ? 'bg-white text-[#B91C1C] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FolderTree className="h-4 w-4" />
              Tree View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                viewMode === 'table' ? 'bg-white text-[#B91C1C] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Main Categories Display Container */}
      <div className="rounded-[2.5rem] border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-200/40">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-[#B91C1C]" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-20 text-center text-xs font-semibold text-slate-400">
            No categories found matching criteria.
          </div>
        ) : viewMode === 'tree' ? (
          /* TREE VIEW 🌳 */
          <div className="space-y-6">
            {categoryTree.map((root) => {
              const matchesFilter = filteredCategories.some((c) => c.id === root.id || c.parent_id === root.id);
              if (!matchesFilter && searchQuery.trim()) return null;

              const isCollapsed = collapsedParents[root.id];

              return (
                <div key={root.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/50 shadow-sm transition-all hover:border-orange-200">
                  {/* Department Parent Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleParentCollapse(root.id)}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <ChevronDown className={`h-5 w-5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      </button>

                      {/* Image Thumbnail */}
                      <div className="relative shrink-0">
                        {root.image_url ? (
                          <img src={root.image_url} alt={root.name} className="h-14 w-14 rounded-2xl border border-slate-200 object-cover shadow-sm" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-400">
                            <Layers className="h-6 w-6" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setAssetPickerTarget(root.id)}
                          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow-md ring-1 ring-slate-200 hover:bg-[#B91C1C] hover:text-white"
                          title="Change Image"
                        >
                          <ImagePlus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Title & Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900">{root.name}</h3>
                          {root.is_default && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#B91C1C]">
                              Default
                            </span>
                          )}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-500">
                            /{root.slug}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                          {root.name_fr && <span className="text-slate-600">🇫🇷 {root.name_fr}</span>}
                          {root.name_ar && <span className="text-slate-600">🇸🇦 {root.name_ar}</span>}
                          {root.name_en && <span className="text-slate-600">🇬🇧 {root.name_en}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Products Counter */}
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-1.5 text-center">
                        <p className="text-sm font-black text-slate-800">{root.product_count}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Products</p>
                      </div>

                      {/* Move Position Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => movePosition(root, 'up')}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Move Up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePosition(root, 'down')}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Move Down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Status Toggle */}
                      {!root.is_default && (
                        <button
                          type="button"
                          onClick={() => updateCategory(root, { is_active: !root.is_active })}
                          className={`rounded-full border px-3 py-1 text-xs font-extrabold transition-all ${
                            root.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'
                          }`}
                        >
                          {root.is_active ? 'Active' : 'Inactive'}
                        </button>
                      )}

                      {/* Quick Add Subcategory */}
                      <button
                        type="button"
                        onClick={() => {
                          setParentId(root.id);
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-[#ff6a00] hover:bg-orange-100 transition-colors"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add Sub
                      </button>

                      {/* Edit Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => setEditingCategory(root)}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50 hover:text-[#B91C1C]"
                        title="Edit Metadata"
                      >
                        <Settings2 className="h-4 w-4" />
                      </button>

                      {/* Delete Trigger */}
                      {!root.is_default && (
                        <button
                          type="button"
                          onClick={() => requestDelete(root)}
                          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete Department"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategories Branch List */}
                  {!isCollapsed && root.children && root.children.length > 0 && (
                    <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/70 pl-8">
                      {root.children.map((sub) => (
                        <div key={sub.id} className="flex flex-wrap items-center justify-between gap-4 p-4 pr-5 transition-colors hover:bg-white/80">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-bold text-slate-300">└──</span>
                            <div className="shrink-0">
                              {sub.image_url ? (
                                <img src={sub.image_url} alt={sub.name} className="h-10 w-10 rounded-xl border border-slate-200 object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-300">
                                  <Tags className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">{sub.name}</span>
                                <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[10px] font-mono text-slate-500">
                                  /{sub.slug}
                                </span>
                              </div>
                              <div className="mt-0.5 flex gap-2 text-[11px] font-medium text-slate-400">
                                {sub.name_fr && <span>🇫🇷 {sub.name_fr}</span>}
                                {sub.name_ar && <span>🇸🇦 {sub.name_ar}</span>}
                                {sub.name_en && <span>🇬🇧 {sub.name_en}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-extrabold text-slate-600">{sub.product_count} products</span>

                            <div className="flex items-center gap-0.5">
                              <button type="button" onClick={() => movePosition(sub, 'up')} className="p-1 text-slate-400 hover:text-slate-700"><ArrowUp className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => movePosition(sub, 'down')} className="p-1 text-slate-400 hover:text-slate-700"><ArrowDown className="h-3.5 w-3.5" /></button>
                            </div>

                            <button
                              type="button"
                              onClick={() => updateCategory(sub, { is_active: !sub.is_active })}
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                sub.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'
                              }`}
                            >
                              {sub.is_active ? 'Active' : 'Inactive'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingCategory(sub)}
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-[#B91C1C]"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => requestDelete(sub)}
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* DENSE TABLE VIEW 📋 */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Category Details</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Parent</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Inventory</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="shrink-0">
                          {category.image_url ? (
                            <img src={category.image_url} alt={category.name} className="h-12 w-12 rounded-xl object-cover border border-slate-200" />
                          ) : (
                            <div className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-300">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{category.name}</p>
                          <p className="text-xs font-mono text-slate-400">/{category.slug}</p>
                          <div className="mt-0.5 flex gap-2 text-[11px] text-slate-500">
                            {category.name_fr && <span>FR: {category.name_fr}</span>}
                            {category.name_ar && <span>AR: {category.name_ar}</span>}
                            {category.name_en && <span>EN: {category.name_en}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {category.parent_name ? (
                        <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-800 border border-amber-200">
                          └─ {category.parent_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">Top-Level</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-700">
                      {category.product_count}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => updateCategory(category, { is_active: !category.is_active })}
                        disabled={category.is_default}
                        className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
                          category.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCategory(category)}
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-[#B91C1C]"
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                        {!category.is_default && (
                          <button
                            type="button"
                            onClick={() => requestDelete(category)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprehensive Category Edit Drawer / Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#B91C1C]">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Edit Category — {editingCategory.name}</h3>
                  <p className="text-xs font-semibold text-slate-400">Update multilingual names, descriptions, icon, and SEO.</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditingCategory(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Language Selector */}
            <div className="mb-4 flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setEditLang('fr')}
                className={`flex-1 rounded-xl py-1.5 text-center text-xs font-extrabold ${
                  editLang === 'fr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                🇫🇷 French
              </button>
              <button
                type="button"
                onClick={() => setEditLang('ar')}
                className={`flex-1 rounded-xl py-1.5 text-center text-xs font-extrabold ${
                  editLang === 'ar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                🇸🇦 Arabic
              </button>
              <button
                type="button"
                onClick={() => setEditLang('en')}
                className={`flex-1 rounded-xl py-1.5 text-center text-xs font-extrabold ${
                  editLang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                🇬🇧 English
              </button>
            </div>

            <div className="space-y-4">
              {/* Localized Name */}
              {editLang === 'fr' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nom (FR 🇫🇷)</label>
                  <input
                    type="text"
                    value={editingCategory.name_fr || editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name_fr: e.target.value, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C]"
                  />
                </div>
              )}
              {editLang === 'ar' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">الاسم (العربية AR 🇸🇦)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={editingCategory.name_ar || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name_ar: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C]"
                  />
                </div>
              )}
              {editLang === 'en' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Name (EN 🇬🇧)</label>
                  <input
                    type="text"
                    value={editingCategory.name_en || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name_en: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-900 outline-none focus:border-[#B91C1C]"
                  />
                </div>
              )}

              {/* Localized Description */}
              {editLang === 'fr' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Description (FR 🇫🇷)</label>
                  <textarea
                    rows={3}
                    value={editingCategory.description_fr || editingCategory.long_description || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, description_fr: e.target.value, long_description: e.target.value })}
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#B91C1C]"
                  />
                </div>
              )}
              {editLang === 'ar' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">الوصف (العربية AR 🇸🇦)</label>
                  <textarea
                    dir="rtl"
                    rows={3}
                    value={editingCategory.description_ar || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, description_ar: e.target.value })}
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#B91C1C]"
                  />
                </div>
              )}
              {editLang === 'en' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Description (EN 🇬🇧)</label>
                  <textarea
                    rows={3}
                    value={editingCategory.description_en || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, description_en: e.target.value })}
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#B91C1C]"
                  />
                </div>
              )}

              {/* Parent & Icon Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Parent Category</label>
                  <select
                    value={editingCategory.parent_id || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, parent_id: e.target.value || null })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 outline-none focus:border-[#B91C1C]"
                  >
                    <option value="">None (Top-Level)</option>
                    {categories.filter((c) => c.id !== editingCategory.id).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Lucide Icon</label>
                  <select
                    value={editingCategory.icon || 'Layers'}
                    onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 outline-none focus:border-[#B91C1C]"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hero Image */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Hero Image URL</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="url"
                    value={editingCategory.image_url || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, image_url: e.target.value })}
                    className="flex-1 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#B91C1C]"
                  />
                  <button
                    type="button"
                    onClick={() => setAssetPickerTarget('edit_image')}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-[#B91C1C]"
                  >
                    Gallery
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updateCategory(editingCategory, editingCategory)}
                  disabled={savingId === editingCategory.id}
                  className="inline-flex items-center rounded-xl bg-[#B91C1C] px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-[#991B1B]"
                >
                  {savingId === editingCategory.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save All Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Impact Warning Modal */}
      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-xs">
          <div className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Delete category "{deleteWarning.name}"?</h3>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  This category currently contains <strong>{deleteWarning.product_count}</strong> product(s). If deleted, all products will be re-assigned to <strong>Non categorized products</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setDeleteWarning(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={deletingId === deleteWarning.id} className="rounded-xl bg-red-600 px-5 py-2 text-xs font-black text-white hover:bg-red-700">
                {deletingId === deleteWarning.id ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery Asset Picker */}
      <MarketplaceAssetPicker
        open={assetPickerTarget !== null}
        title="Marketplace category assets"
        type="image"
        onClose={() => setAssetPickerTarget(null)}
        onSelect={selectCategoryImage}
      />
    </div>
  );
}
