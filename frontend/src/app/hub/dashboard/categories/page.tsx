'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { ImageIcon, Loader2, Plus, Save, Tags, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  description?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  image_url?: string | null;
  is_default: boolean;
  is_active: boolean;
  position: number;
  product_count: number;
}

const emptyForm = {
  name: '',
  parent_id: '',
  short_description: '',
  long_description: '',
  image_url: '',
};

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export default function StorefrontCategoriesPage() {
  const { t, locale } = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/categories', { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.categories.failedToLoad')));
      const data = await res.json();
      setCategories(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.categories.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const uploadImage = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) throw new Error(t('dashboardPages.categories.invalidImageType'));
    if (file.size > 10 * 1024 * 1024) throw new Error(t('dashboardPages.categories.imageTooLarge'));

    const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ filename: file.name, content_type: file.type, purpose: 'product_image' }),
    });
    if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, t('dashboardPages.categories.failedToPrepareUpload')));
    const data = await presignRes.json();
    if (!data.upload_url || !data.public_url) throw new Error(t('dashboardPages.categories.noUploadUrl'));

    const uploadRes = await fetch(data.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(t('dashboardPages.categories.imageUploadFailed'));
    return data.public_url as string;
  };

  const handleNewImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const url = await uploadImage(file);
      setForm((current) => ({ ...current, image_url: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.categories.imageUploadFailed'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRowImageUpload = async (category: Category, file: File | null) => {
    if (!file) return;
    setSavingId(category.id);
    setError('');
    try {
      const url = await uploadImage(file);
      await updateCategory({ ...category, image_url: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.categories.imageUploadFailed'));
    } finally {
      setSavingId(null);
    }
  };

  const createCategory = async () => {
    if (!form.name.trim()) return;
    setError('');
    setSuccess('');
    setSavingId('new');
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          parent_id: form.parent_id || null,
          short_description: form.short_description.trim() || undefined,
          long_description: form.long_description.trim() || undefined,
          image_url: form.image_url.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.categories.failedToCreate')));
      setForm(emptyForm);
      setSuccess(t('dashboardPages.categories.categoryCreated'));
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.categories.failedToCreate'));
    } finally {
      setSavingId(null);
    }
  };

  const updateCategory = async (category: Category) => {
    setError('');
    setSuccess('');
    setSavingId(category.id);
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: category.name,
          parent_id: category.parent_id || null,
          short_description: category.short_description || '',
          long_description: category.long_description || '',
          image_url: category.image_url || null,
          is_active: category.is_active,
          position: category.position,
        }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.categories.failedToUpdate')));
      const data = await res.json();
      setCategories((current) => current.map((item) => (item.id === category.id ? { ...item, ...data.category } : item)));
      setSuccess(t('dashboardPages.categories.categoryUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.categories.failedToUpdate'));
    } finally {
      setSavingId(null);
    }
  };

  const deleteCategory = async (category: Category) => {
    if (category.is_default) return;
    if (!window.confirm(t('dashboardPages.categories.deleteConfirm', { name: category.name }))) return;
    setSavingId(category.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/categories/${category.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.categories.failedToDelete')));
      const data = await res.json();
      setSuccess(t('dashboardPages.categories.categoryDeleted', { count: data.reassigned_products || 0 }));
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.categories.failedToDelete'));
    } finally {
      setSavingId(null);
    }
  };

  const topLevelCount = categories.filter((category) => !category.parent_id).length;
  const childCount = categories.filter((category) => category.parent_id).length;
  const activeCount = categories.filter((category) => category.is_active).length;
  const assignedProductCount = categories.reduce((total, category) => total + (category.product_count || 0), 0);

  // Locale-aware date formatter (ar-TN / en-US / fr-TN).
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  void dateLocale; // no dates on this page yet; reserved for future use.

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-[#B91C1C] via-[#13b777] to-slate-950 p-6 sm:p-8 text-white shadow-xl shadow-amber-900/10">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-16 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/90">
              <Tags className="w-4 h-4" />
              {t('dashboardPages.categories.storefrontTaxonomy')}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t('dashboardPages.categories.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">
              {t('dashboardPages.categories.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:min-w-[520px]">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-black">{categories.length}</p>
              <p className="text-xs text-white/75">{t('dashboardPages.categories.total')}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-black">{topLevelCount}</p>
              <p className="text-xs text-white/75">{t('dashboardPages.categories.topLevel')}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-black">{childCount}</p>
              <p className="text-xs text-white/75">{t('dashboardPages.categories.subcategories')}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-black">{assignedProductCount}</p>
              <p className="text-xs text-white/75">{t('dashboardPages.categories.products')}</p>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">{success}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,420px)_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">{t('dashboardPages.categories.addNewCategoryHeading')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('dashboardPages.categories.addNewCategorySubtitle')}</p>
          </div>
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-2xl border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center">
              {form.image_url ? <img src={form.image_url} alt={t('dashboardPages.categories.title')} className="w-full h-full object-cover" /> : <ImageIcon className="w-10 h-10 text-gray-300" />}
            </div>
            <div className="flex gap-2">
              <label className="inline-flex flex-1 items-center justify-center px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
                {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#B91C1C]" /> : <Upload className="w-4 h-4 mr-2 text-[#B91C1C]" />}
                {t('dashboardPages.categories.uploadPicture')}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage} onChange={(event) => handleNewImageUpload(event.target.files?.[0] || null)} className="hidden" />
              </label>
              {form.image_url && (
                <button type="button" onClick={() => setForm((current) => ({ ...current, image_url: '' }))} className="inline-flex items-center justify-center px-3 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">{t('dashboardPages.categories.name')}</label>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('dashboardPages.categories.namePlaceholder')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">{t('dashboardPages.categories.parent')}</label>
              <select value={form.parent_id} onChange={(event) => setForm((current) => ({ ...current, parent_id: event.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none bg-white">
              <option value="">{t('dashboardPages.categories.topLevel')}</option>
              {categories.filter((category) => !category.parent_id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">{t('dashboardPages.categories.shortDescription')}</label>
              <input value={form.short_description} onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))} placeholder={t('dashboardPages.categories.shortDescriptionPlaceholder')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">{t('dashboardPages.categories.longDescription')}</label>
              <textarea value={form.long_description} onChange={(event) => setForm((current) => ({ ...current, long_description: event.target.value }))} placeholder={t('dashboardPages.categories.longDescriptionPlaceholder')} rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none resize-none" />
            </div>
            <input value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} placeholder={t('dashboardPages.categories.pictureUrl')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none" />
            <button type="button" onClick={createCategory} disabled={savingId === 'new' || !form.name.trim()} className="inline-flex items-center justify-center px-4 py-3 bg-[#B91C1C] text-white font-bold rounded-xl hover:bg-[#991B1B] shadow-lg shadow-[#B91C1C]/20 disabled:opacity-50 disabled:shadow-none">
              {savingId === 'new' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {t('dashboardPages.categories.addCategory')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-4">
            <div>
              <h2 className="font-bold text-gray-900">{t('dashboardPages.categories.categoryLibrary')}</h2>
              <p className="text-sm text-gray-500">{t('dashboardPages.categories.activeCategoriesReady', { count: activeCount })}</p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 border border-gray-200">
              {t('dashboardPages.categories.defaultCategoryProtected')}
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-[#B91C1C] animate-spin" /></div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Tags className="w-12 h-12 text-gray-300 mb-3" />
              <p className="font-semibold text-gray-900">{t('dashboardPages.categories.noCategories')}</p>
              <p className="text-sm text-gray-500">{t('dashboardPages.categories.noCategoriesHint')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((category) => (
                <div key={category.id} className="p-5 grid grid-cols-1 lg:grid-cols-[132px_1fr_auto] gap-5 hover:bg-gray-50/40 transition-colors">
                <div>
                  <div className="aspect-square rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                    {category.image_url ? <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-gray-300" />}
                  </div>
                  <label className="mt-2 inline-flex w-full items-center justify-center px-2 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
                    {t('dashboardPages.categories.upload')}
                    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={savingId === category.id} onChange={(event) => handleRowImageUpload(category, event.target.files?.[0] || null)} className="hidden" />
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={category.name} disabled={category.is_default} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item))} className="px-3 py-2 border border-gray-300 rounded-xl font-semibold disabled:bg-gray-50 disabled:text-gray-500" />
                  <select value={category.parent_id || ''} disabled={category.is_default} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, parent_id: event.target.value || null } : item))} className="px-3 py-2 border border-gray-300 rounded-xl disabled:bg-gray-50 bg-white">
                    <option value="">{t('dashboardPages.categories.topLevel')}</option>
                    {categories.filter((item) => !item.parent_id && item.id !== category.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <input value={category.short_description || ''} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, short_description: event.target.value } : item))} placeholder={t('dashboardPages.categories.shortDescription')} className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-xl" />
                  <textarea value={category.long_description || ''} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, long_description: event.target.value } : item))} placeholder={t('dashboardPages.categories.longDescription')} rows={3} className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-xl resize-none" />
                  <input value={category.image_url || ''} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, image_url: event.target.value } : item))} placeholder={t('dashboardPages.categories.pictureUrl')} className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-xl" />
                  <div className="md:col-span-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="rounded-full bg-gray-100 px-2 py-1 font-mono">/{category.slug}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">{t('dashboardPages.categories.productCount', { count: category.product_count })}</span>
                    {category.is_default && <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">{t('dashboardPages.categories.default')}</span>}
                  </div>
                </div>
                <div className="flex lg:flex-col gap-2 justify-end">
                  {!category.is_default && (
                    <button type="button" onClick={() => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, is_active: !item.is_active } : item))} className={`px-3 py-2 rounded-xl text-xs font-semibold ${category.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {category.is_active ? t('dashboardPages.categories.active') : t('dashboardPages.categories.inactive')}
                    </button>
                  )}
                  <button type="button" onClick={() => updateCategory(category)} disabled={savingId === category.id} className="inline-flex items-center justify-center px-3 py-2 bg-[#B91C1C] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                    {savingId === category.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  {!category.is_default && (
                    <button type="button" onClick={() => deleteCategory(category)} disabled={savingId === category.id} className="inline-flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
