'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Store } from 'lucide-react';
import { getSellerTypeOptions, type SellerTypeValue } from '@/lib/seller-type';
import { useLocale } from '../../../../contexts/LocaleContext';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || fallback;
  } catch {
    return fallback;
  }
}

export default function CreateStorePage() {
  const { t } = useLocale();
  const sellerTypes = getSellerTypeOptions(t);
  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    seller_type: 'retailer' as SellerTypeValue,
  });
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [canCreateFreeStore, setCanCreateFreeStore] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadStoreEligibility() {
      try {
        const res = await fetchWithCsrf('/api/pd/stores/mine', { credentials: 'include' });
        if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to check store limits'));
        const data = await res.json();
        if (!cancelled) setCanCreateFreeStore(Boolean(data.can_create_free_store));
      } catch (err) {
        if (!cancelled) {
          setCanCreateFreeStore(false);
          setError(err instanceof Error ? err.message : 'Failed to check store limits');
        }
      }
    }
    void loadStoreEligibility();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(field: keyof typeof form, value: string) {
    if (field === 'subdomain') setSubdomainEdited(true);
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'name' && !subdomainEdited) next.subdomain = slugify(value);
      if (field === 'subdomain') {
        next.subdomain = slugify(value);
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (canCreateFreeStore === false) {
      setError('This account already used its free store. Each account can create only one free store.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Store creation failed'));
      window.location.href = '/hub/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Store creation failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/hub/dashboard/select-store" className="inline-flex items-center gap-2 text-sm font-black text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to store selector
      </Link>

      <div className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
          <Store className="h-4 w-4" />
          New store
        </div>
        <h1 className="mt-5 text-3xl font-black text-gray-900">Create another storefront</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Add the free store available for this seller account. Each account can create one free store only.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {canCreateFreeStore === false && (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            Free store limit reached for this account. You can manage your existing stores from the selector.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-black text-gray-700">Store name</label>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10"
              placeholder="My second store"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-gray-700">Subdomain</label>
            <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 focus-within:border-[#16C784] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#16C784]/10">
              <input
                value={form.subdomain}
                onChange={(event) => updateField('subdomain', event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-gray-900 outline-none"
                placeholder="my-second-store"
                required
              />
              <span className="border-l border-gray-200 px-4 py-3 text-sm font-black text-gray-400">.pandamarket</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-gray-700">Seller type</label>
            <select
              value={form.seller_type}
              onChange={(event) => updateField('seller_type', event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10"
            >
              {sellerTypes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || canCreateFreeStore === false || !form.name.trim() || !form.subdomain.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16C784] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-[#16C784]/20 transition hover:-translate-y-0.5 hover:bg-[#14b876] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create and open dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
