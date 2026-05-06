'use client';

import { fetchWithCsrf } from '@/lib/api';
import { MarketplaceAssetPicker } from '@/components/admin/MarketplaceAssetPicker';
import { AlertTriangle, ImageIcon, ImagePlus, Loader2, Plus, Save, Tags, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  image_url?: string | null;
  is_default: boolean;
  is_active: boolean;
  position: number;
  product_count: number;
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
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
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
          short_description: shortDescription.trim() || undefined,
          long_description: longDescription.trim() || undefined,
          image_url: imageUrl.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to create category'));
      setName('');
      setShortDescription('');
      setLongDescription('');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Categories</h1>
          <p className="text-gray-500 mt-1">Manage Hub categories used by products across PandaMarket.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#16C784]/10 text-[#0f9f6e] rounded-lg text-sm font-medium">
          <Tags className="w-4 h-4" />
          {categories.length} categories
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">{success}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Add category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Category name"
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
          />
          <input
            type="text"
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
            placeholder="Short description"
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
          />
          <textarea
            value={longDescription}
            onChange={(event) => setLongDescription(event.target.value)}
            placeholder="Long description"
            rows={3}
            className="md:col-span-2 px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none resize-none"
          />
          <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Picture URL"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
            <button
              type="button"
              onClick={() => setAssetPickerTarget('new')}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-[#16C784]/30 text-[#0f9f6e] font-semibold rounded-lg hover:bg-[#16C784]/5"
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Choose image
            </button>
          </div>
          <button
            type="button"
            onClick={createCategory}
            disabled={savingId === 'new' || !name.trim()}
            className="md:col-span-2 inline-flex items-center justify-center px-4 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] disabled:opacity-50"
          >
            {savingId === 'new' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add category
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-[#16C784] animate-spin" /></div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {category.image_url ? (
                        <img src={category.image_url} alt={category.name} className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
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
                        className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                      />
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
                        placeholder="Short description"
                        className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600"
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
                        placeholder="Long description"
                        rows={2}
                        className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 resize-none"
                      />
                      <div className="flex max-w-sm flex-col gap-2 sm:flex-row">
                        <input
                          type="url"
                          value={category.image_url || ''}
                          onChange={(event) =>
                            setCategories((current) =>
                              current.map((item) =>
                                item.id === category.id ? { ...item, image_url: event.target.value } : item,
                              ),
                            )
                          }
                          placeholder="Picture URL"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => setAssetPickerTarget(category.id)}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-[#16C784] hover:text-[#0f9f6e]"
                        >
                          <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                          Pick
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">/{category.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{category.product_count}</td>
                  <td className="px-6 py-4">
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
                      className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700"
                    />
                  </td>
                  <td className="px-6 py-4">
                    {category.is_default ? (
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">Default</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateCategory(category, { is_active: !category.is_active })}
                        disabled={savingId === category.id}
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${category.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
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
                        className="p-2 text-gray-400 hover:text-[#16C784] hover:bg-[#16C784]/5 rounded-lg transition-colors"
                        title="Save"
                      >
                        {savingId === category.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(category)}
                        disabled={category.is_default || deletingId === category.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title={category.is_default ? 'Default category cannot be deleted' : 'Delete'}
                      >
                        {deletingId === category.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
