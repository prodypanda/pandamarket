'use client';

import { fetchWithCsrf } from '@/lib/api';
import { MarketplaceAssetPicker } from '@/components/admin/MarketplaceAssetPicker';
import { AlertTriangle, ImageIcon, ImagePlus, Loader2, Plus, Save, Tags, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Category {
  id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
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
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteWarning, setDeleteWarning] = useState<Category | null>(null);
  const [assetPickerTarget, setAssetPickerTarget] = useState<'new' | string | null>(null);

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

  const createCategory = async () => {
    if (!name.trim()) return;
    setError('');
    setSuccess('');
    setSavingId('new');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/marketplace-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          name_fr: name.trim(),
          name_ar: nameAr.trim() || undefined,
          name_en: nameEn.trim() || undefined,
          description_fr: longDescription.trim() || shortDescription.trim() || undefined,
          description_ar: descriptionAr.trim() || undefined,
          description_en: descriptionEn.trim() || undefined,
          parent_id: parentId || null,
          short_description: shortDescription.trim() || undefined,
          long_description: longDescription.trim() || undefined,
          image_url: imageUrl.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to create category'));
      setName('');
      setNameAr('');
      setNameEn('');
      setParentId('');
      setShortDescription('');
      setLongDescription('');
      setDescriptionAr('');
      setDescriptionEn('');
      setImageUrl('');
      setSuccess('Marketplace category created.');
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
      setSuccess('Category updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
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
    } else if (assetPickerTarget) {
      setCategories((current) =>
        current.map((item) => (item.id === assetPickerTarget ? { ...item, image_url: url } : item)),
      );
    }
    setAssetPickerTarget(null);
  };

  return (
    <div className="space-y-8">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-8 text-white shadow-2xl shadow-slate-950/20">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-amber-500/20 blur-[80px] animate-pulse" />
        <div className="absolute right-48 top-20 h-48 w-48 rounded-full bg-amber-300/20 blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-100 backdrop-blur-md">
              <Tags className="h-3.5 w-3.5" />
              Taxonomy Management
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Marketplace Categories</h1>
            <p className="mt-4 text-sm font-medium leading-relaxed text-white/75">
              Manage the central Hub categories. These determine how products are organized and discovered across the entire PandaMarket ecosystem.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-md shadow-lg">
              <div className="rounded-full bg-amber-500/20 p-2 text-amber-100">
                <Tags className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{categories.length}</p>
                <p className="text-xs font-medium text-amber-100">Active Categories</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">{success}</div>}

      <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white p-6 shadow-2xl shadow-slate-200/50">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[#B91C1C]">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Add New Category</h2>
            <p className="text-sm font-medium text-slate-500">Create a new top-level classification.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Nom / Name (FR)</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex. Électronique, Smartphones"
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none transition-all font-medium text-slate-900"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">اسم القسم (العربية AR)</label>
            <input
              type="text"
              dir="rtl"
              value={nameAr}
              onChange={(event) => setNameAr(event.target.value)}
              placeholder="مثال: الإلكترونيات، الهواتف"
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none transition-all font-medium text-slate-900"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Name (EN)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(event) => setNameEn(event.target.value)}
              placeholder="e.g. Electronics, Smartphones"
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none transition-all font-medium text-slate-900"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Parent Category (Optional)</label>
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none transition-all font-medium text-slate-900 cursor-pointer"
            >
              <option value="">None (Top-Level Category)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_name ? `└─ ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Short Description</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
              placeholder="Brief summary for listings"
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none transition-all text-sm text-slate-700"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Description (FR / Default)</label>
            <textarea
              value={longDescription}
              onChange={(event) => setLongDescription(event.target.value)}
              placeholder="Description détaillée en français pour le SEO et les en-têtes de rayon..."
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none resize-none transition-all text-sm text-slate-700"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">الوصف (العربية AR)</label>
            <textarea
              dir="rtl"
              value={descriptionAr}
              onChange={(event) => setDescriptionAr(event.target.value)}
              placeholder="وصف تفصيلي باللغة العربية للقسم..."
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none resize-none transition-all text-sm text-slate-700"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Description (EN)</label>
            <textarea
              value={descriptionEn}
              onChange={(event) => setDescriptionEn(event.target.value)}
              placeholder="Detailed description in English..."
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none resize-none transition-all text-sm text-slate-700"
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Hero Image</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none transition-all text-sm text-slate-700"
              />
              <button
                type="button"
                onClick={() => setAssetPickerTarget('new')}
                className="inline-flex items-center justify-center px-5 py-3 border-2 border-amber-100 text-[#B91C1C] font-bold rounded-xl hover:bg-amber-50 hover:border-amber-200 transition-all"
              >
                <ImagePlus className="w-5 h-5 mr-2" />
                Gallery
              </button>
            </div>
          </div>
          <div className="md:col-span-2 pt-2">
            <button
              type="button"
              onClick={createCategory}
              disabled={savingId === 'new' || !name.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-[#B91C1C] text-white font-black rounded-xl hover:-translate-y-0.5 hover:bg-[#991B1B] hover:shadow-lg hover:shadow-red-900/25 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {savingId === 'new' ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
              Publish Category
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200/60 bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-10 h-10 text-[#B91C1C] animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Category Details</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Inventory</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Order</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex gap-5">
                        <div className="relative shrink-0">
                          {category.image_url ? (
                            <img src={category.image_url} alt={category.name} className="h-24 w-24 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                          ) : (
                            <div className="h-24 w-24 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center shadow-sm">
                              <ImageIcon className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setAssetPickerTarget(category.id)}
                            className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-md ring-1 ring-slate-200 transition-all hover:bg-[#B91C1C] hover:text-white hover:ring-[#B91C1C] opacity-0 group-hover:opacity-100"
                            title="Update Image"
                          >
                            <ImagePlus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex-1 space-y-2.5 min-w-[300px]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              {category.parent_name && <span className="text-amber-700 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">└─ Subcategory of {category.parent_name}</span>}
                              <input
                                type="text"
                                value={category.name}
                                disabled={category.is_default}
                                onChange={(event) =>
                                  setCategories((current) =>
                                    current.map((item) =>
                                      item.id === category.id ? { ...item, name: event.target.value } : item,
                                    ),
                                  )
                                }
                                className="w-full px-3 py-1.5 border border-transparent hover:border-slate-300 focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 bg-transparent rounded-lg text-lg font-black text-slate-900 transition-all disabled:opacity-60 outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={category.parent_id || ''}
                                onChange={(e) => {
                                  const val = e.target.value || null;
                                  setCategories((current) =>
                                    current.map((item) => (item.id === category.id ? { ...item, parent_id: val } : item)),
                                  );
                                  updateCategory(category, { parent_id: val });
                                }}
                                className="text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-2 py-1 bg-white hover:bg-slate-50 cursor-pointer outline-none"
                              >
                                <option value="">Top-Level (No Parent)</option>
                                {categories.filter((c) => c.id !== category.id).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.parent_name ? `└─ ${c.name}` : c.name}
                                  </option>
                                ))}
                              </select>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md shrink-0">/{category.slug}</p>
                            </div>
                          </div>
                          
                          <input
                            type="text"
                            value={category.short_description || category.description || ''}
                            onChange={(event) =>
                              setCategories((current) =>
                                current.map((item) =>
                                  item.id === category.id ? { ...item, short_description: event.target.value, description: event.target.value } : item,
                                ),
                              )
                            }
                            placeholder="Add a short summary..."
                            className="w-full px-3 py-1.5 border border-transparent hover:border-slate-300 focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 bg-transparent rounded-lg text-sm text-slate-500 transition-all outline-none"
                          />
                          <textarea
                            value={category.long_description || ''}
                            onChange={(event) =>
                              setCategories((current) =>
                                current.map((item) =>
                                  item.id === category.id ? { ...item, long_description: event.target.value } : item,
                                ),
                              )
                            }
                            placeholder="Add detailed description..."
                            rows={2}
                            className="w-full px-3 py-1.5 border border-transparent hover:border-slate-300 focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 bg-transparent rounded-lg text-xs text-slate-500 transition-all resize-none outline-none"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="inline-flex flex-col items-center justify-center rounded-xl bg-slate-100/50 px-4 py-3 border border-slate-200/50">
                        <span className="text-xl font-black text-slate-700">{category.product_count}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Items</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <input
                        type="number"
                        value={category.position}
                        onChange={(event) =>
                          setCategories((current) =>
                            current.map((item) =>
                              item.id === category.id ? { ...item, position: parseInt(event.target.value, 10) || 0 } : item,
                            ),
                          )
                        }
                        className="w-20 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none transition-all text-center"
                      />
                    </td>
                    <td className="px-6 py-5 align-top">
                      {category.is_default ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#B91C1C] shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateCategory(category, { is_active: !category.is_active })}
                          disabled={savingId === category.id}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-sm transition-all hover:-translate-y-0.5 ${
                            category.is_active 
                              ? 'border-emerald-200 bg-amber-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-red-900/20' 
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${category.is_active ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
                          {category.is_active ? 'Active' : 'Inactive'}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-5 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => updateCategory(category, {
                            name: category.name,
                            short_description: category.short_description || undefined,
                            long_description: category.long_description || undefined,
                            image_url: category.image_url || null,
                            position: category.position,
                          })}
                          disabled={savingId === category.id}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:bg-amber-50 hover:text-[#B91C1C] hover:ring-amber-200"
                          title="Save Changes"
                        >
                          {savingId === category.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(category)}
                          disabled={category.is_default || deletingId === category.id}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 hover:ring-red-200 disabled:opacity-40 disabled:hover:translate-y-0"
                          title={category.is_default ? 'Default category cannot be deleted' : 'Delete'}
                        >
                          {deletingId === category.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteWarning && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-50 text-amber-600"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete marketplace category?</h2>
                <p className="text-sm text-gray-600 mt-1">
                  This category contains <strong>{deleteWarning.product_count}</strong> product(s). If you confirm, all products inside it will be moved to <strong>Non categorized products</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteWarning(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={deletingId === deleteWarning.id} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deletingId === deleteWarning.id ? 'Deleting...' : 'Confirm delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MarketplaceAssetPicker
        open={assetPickerTarget !== null}
        title="Marketplace category images"
        type="image"
        onClose={() => setAssetPickerTarget(null)}
        onSelect={selectCategoryImage}
      />
    </div>
  );
}
