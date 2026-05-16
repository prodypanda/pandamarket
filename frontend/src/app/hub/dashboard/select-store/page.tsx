'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Plus, Store, ExternalLink } from 'lucide-react';

interface SellerStore {
  id: string;
  name: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
  subscription_plan?: string | null;
  seller_type?: string | null;
  created_at?: string | null;
}

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || fallback;
  } catch {
    return fallback;
  }
}

export default function SelectStorePage() {
  const [stores, setStores] = useState<SellerStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadStores() {
      setLoading(true);
      setError('');
      try {
        const res = await fetchWithCsrf('/api/pd/stores/mine', { credentials: 'include' });
        if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to load stores'));
        const data = await res.json();
        if (cancelled) return;
        const nextStores = Array.isArray(data.stores) ? data.stores : [];
        setStores(nextStores);
        setSelectedStoreId(data.selected_store_id || data.selected_store?.id || null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load stores');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadStores();
    return () => {
      cancelled = true;
    };
  }, []);

  async function selectStore(storeId: string) {
    setSelectingId(storeId);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/stores/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ store_id: storeId }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to select store'));
      window.location.href = '/hub/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select store');
      setSelectingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-8 text-white shadow-2xl shadow-slate-900/15">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-100 ring-1 ring-white/10">
          <Store className="h-4 w-4" />
          Store selector
        </div>
        <h1 className="mt-5 text-3xl font-black sm:text-4xl">Which store do you want to manage?</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          Choose the storefront you want to open. All dashboard pages, products, orders, wallet, settings, API keys, and reports will use the selected store.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-[2rem] bg-white shadow-sm">
          <div className="flex items-center gap-3 text-sm font-black text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your stores...
          </div>
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <Store className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-2xl font-black text-gray-900">No stores yet</h2>
          <p className="mt-2 text-sm text-gray-500">Create your first storefront to start selling.</p>
          <Link href="/hub/dashboard/create-store" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#B91C1C] px-5 py-3 text-sm font-black text-white">
            <Plus className="h-4 w-4" />
            Create store
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stores.map((store) => {
            const isSelected = selectedStoreId === store.id;
            const isBusy = selectingId === store.id;
            return (
              <div key={store.id} className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-[#B91C1C] ring-1 ring-amber-100">
                    <Store className="h-6 w-6" />
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Selected
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-xl font-black text-gray-900">{store.name}</h2>
                <p className="mt-1 text-sm font-semibold text-gray-500">{store.subdomain ? `${store.subdomain}.pandamarket` : store.custom_domain || 'Storefront'}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black capitalize">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{store.status || 'unverified'}</span>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">{store.seller_type || 'retailer'}</span>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">{store.subscription_plan || 'free'}</span>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void selectStore(store.id)}
                    disabled={Boolean(selectingId)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Manage
                  </button>
                  {store.subdomain && (
                    <Link
                      href={`/store/${encodeURIComponent(store.subdomain)}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-black text-gray-700 transition hover:border-[#B91C1C] hover:text-[#B91C1C]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View store
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-center">
        <Link href="/hub/dashboard/create-store" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-700 shadow-sm transition hover:border-[#B91C1C] hover:text-[#B91C1C]">
          <Plus className="h-4 w-4" />
          Create another store
        </Link>
      </div>
    </div>
  );
}
