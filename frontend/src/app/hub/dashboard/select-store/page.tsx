'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Plus, Store, ExternalLink, ReceiptText } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getMarketplaceDomain, getStorefrontUrl } from '@/lib/store-hosts';

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
  const { t, locale, dir } = useLocale();
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
        if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.selectStore.errorLoadStores')));
        const data = await res.json();
        if (cancelled) return;
        const nextStores = Array.isArray(data.stores) ? data.stores : [];
        setStores(nextStores);
        setSelectedStoreId(data.selected_store_id || data.selected_store?.id || null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('dashboardPages.selectStore.errorLoadStores'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadStores();
    return () => {
      cancelled = true;
    };
  }, [t]);

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
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.selectStore.errorSelectStore')));
      window.location.href = '/hub/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.selectStore.errorSelectStore'));
      setSelectingId(null);
    }
  }

  return (
    <div dir={dir} className="space-y-6 sm:space-y-8">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 self-start">
            <Store className="h-4 w-4" />
            {t('dashboardPages.selectStore.badge')}
          </div>
          <Link
            href="/hub/dashboard/my-subscription-orders"
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs self-start sm:self-auto"
          >
            <ReceiptText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            {t('dashboardPages.selectStore.subscriptionOrdersLink')}
          </Link>
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl text-slate-900 dark:text-white">{t('dashboardPages.selectStore.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 font-normal">
          {t('dashboardPages.selectStore.subtitle')}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('dashboardPages.selectStore.loading')}
          </div>
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-2xs">
          <Store className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.selectStore.noStoresTitle')}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.selectStore.noStoresDesc')}</p>
          <Link href="/hub/dashboard/create-store" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-sm font-medium text-white shadow-2xs transition">
            <Plus className="h-4 w-4" />
            {t('dashboardPages.selectStore.createStore')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stores.map((store) => {
            const isSelected = selectedStoreId === store.id;
            const isBusy = selectingId === store.id;
            return (
              <div key={store.id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700">
                    <Store className="h-6 w-6" />
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('dashboardPages.selectStore.selected')}
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{store.name}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{store.custom_domain ? store.custom_domain : store.subdomain ? `${store.subdomain}.${getMarketplaceDomain()}` : t('dashboardPages.selectStore.storefrontFallback')}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold capitalize">
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 text-slate-700 dark:text-slate-300">{t(`dashboardPages.selectStore.status.${store.status || 'unverified'}`)}</span>
                  <span className="rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60 px-2.5 py-1 text-amber-700 dark:text-amber-300">{t(`dashboardPages.selectStore.sellerType.${store.seller_type || 'retailer'}`)}</span>
                  <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/60 px-2.5 py-1 text-indigo-700 dark:text-indigo-300">{t(`dashboardPages.selectStore.plan.${store.subscription_plan || 'free'}`)}</span>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void selectStore(store.id)}
                    disabled={Boolean(selectingId)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white shadow-2xs transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {t('dashboardPages.selectStore.manage')}
                  </button>
                  {(store.subdomain || store.custom_domain) && (
                    <Link
                      href={getStorefrontUrl({ subdomain: store.subdomain, customDomain: store.custom_domain })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('dashboardPages.selectStore.viewStore')}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-center">
        <Link href="/hub/dashboard/create-store" className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition">
          <Plus className="h-4 w-4" />
          {t('dashboardPages.selectStore.createAnother')}
        </Link>
      </div>
    </div>
  );
}
