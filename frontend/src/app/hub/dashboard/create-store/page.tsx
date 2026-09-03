'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Store } from 'lucide-react';
import { getSellerTypeOptions, type SellerTypeValue } from '@/lib/seller-type';
import { useLocale } from '@/contexts/LocaleContext';
import { getMarketplaceDomain } from '@/lib/store-hosts';

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
  const { t, dir } = useLocale();
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
    <div dir={dir} className="mx-auto max-w-3xl space-y-6">
      <Link href="/hub/dashboard/select-store" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition">
        <ArrowLeft className="h-4 w-4" />
        Back to store selector
      </Link>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xs">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          <Store className="h-4 w-4" />
          New store
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl text-slate-900 dark:text-white">Create another storefront</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Add the free store available for this seller account. Each account can create one free store only.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        {canCreateFreeStore === false && (
          <div className="mt-5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
            Free store limit reached for this account. You can manage your existing stores from the selector.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Store name</label>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="My second store"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Subdomain</label>
            <div className="flex overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 focus-within:border-slate-900 dark:focus-within:border-white focus-within:ring-1 focus-within:ring-slate-900 dark:focus-within:ring-white">
              <input
                value={form.subdomain}
                onChange={(event) => updateField('subdomain', event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="my-second-store"
                required
              />
              <span className="border-l border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center">.{getMarketplaceDomain()}</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Seller type</label>
            <select
              value={form.seller_type}
              onChange={(event) => updateField('seller_type', event.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
            >
              {sellerTypes.map((option) => (
                <option key={option.value} value={option.value} className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{option.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || canCreateFreeStore === false || !form.name.trim() || !form.subdomain.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-3 text-sm font-medium text-white shadow-2xs transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create and open dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
