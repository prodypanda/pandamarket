'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import {
  BarChart3, Building, CheckCircle2, ChevronRight, Edit3, Eye, Loader2, Megaphone, Plus, Trash2, UploadCloud, WalletCards, X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdsCampaignWizard } from '../../../../components/dashboard/AdsCampaignWizard';
import { AdsPerformanceCharts } from '../../../../components/dashboard/AdsPerformanceCharts';
import { useLocale } from '@/contexts/LocaleContext';

type Placement = { id: string; name: string; format: string; default_price: string };
type Account = { balance: string; reserved_balance: string; currency: string; total_spend: string; active_campaigns: number; auto_refill_enabled?: boolean; auto_refill_threshold?: string; auto_refill_amount?: string };
type Campaign = {
  id: string; name: string; campaign_type: string; status: string; total_budget: string; spent_amount: string; bid_amount: string; daily_budget: string;
  starts_at?: string; ends_at?: string; targeting?: Record<string, any>; creatives?: Array<{ id: string; title: string; description?: string; image_url?: string; cta_label?: string; destination_url?: string; product_id?: string }>;
};
type Refill = { id: string; amount: string; currency: string; gateway: string; status: string; proof_url?: string; rejection_reason?: string; created_at: string };
type AdsTransaction = { id: string; type: string; amount: string; balance_after: string; description?: string; campaign_name?: string; created_at: string };
type Analytics = { impressions: number; clicks: number; ctr: number; average_cpc: number; conversions: number; conversion_rate: number; revenue: string; roas: number };
type DailyPoint = { stat_date: string; impressions: number; clicks: number; conversions: number; spend: string; revenue: string };
type MarketplaceSettings = { marketplace_billing_info?: { recipient_name?: string; bank_name?: string; rib?: string; iban?: string; cin?: string; city?: string; phone?: string } };

const money = (v?: string | number, c = 'TND') => `${Number(v || 0).toFixed(3)} ${c}`;

export default function SellerAdsPage() {
  const { t, dir } = useLocale();

  const [account, setAccount] = useState<Account | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [refills, setRefills] = useState<Refill[]>([]);
  const [transactions, setTransactions] = useState<AdsTransaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings | null>(null);

  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [campaignFilter, setCampaignFilter] = useState('');
  const [granularity, setGranularity] = useState<'hourly' | 'daily' | 'monthly'>('daily');

  const setSellerPreset = (preset: 'today' | '7d' | '30d' | '90d') => {
    const today = new Date().toISOString().slice(0, 10);
    if (preset === 'today') {
      setFrom(today); setTo(today); setGranularity('hourly');
    } else if (preset === '7d') {
      setFrom(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)); setTo(today); setGranularity('daily');
    } else if (preset === '30d') {
      setFrom(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)); setTo(today); setGranularity('daily');
    } else if (preset === '90d') {
      setFrom(new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)); setTo(today); setGranularity('daily');
    }
  };

  const [refilling, setRefilling] = useState(false);
  const [refillAmount, setRefillAmount] = useState('50');
  const [refillGateway, setRefillGateway] = useState('flouci');
  const [refillProofUrl, setRefillProofUrl] = useState('');
  const [proofPreviewUrl, setProofPreviewUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const [creating, setCreating] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; daily_budget: string; total_budget: string; bid_amount: string; title: string; description: string; image_url: string; cta_label: string; destination_url: string }>({
    name: '', daily_budget: '5', total_budget: '50', bid_amount: '0.100', title: '', description: '', image_url: '', cta_label: 'Shop now', destination_url: '',
  });

  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  const [autoRefillEnabled, setAutoRefillEnabled] = useState(false);
  const [autoRefillThreshold, setAutoRefillThreshold] = useState('10');
  const [autoRefillAmount, setAutoRefillAmount] = useState('50');
  const [savingAutoRefill, setSavingAutoRefill] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Parse product_id from search params if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('product_id');
    if (pid) {
      setCreating(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ from, to, granularity });
      if (campaignFilter) q.set('campaign_id', campaignFilter);

      const [ar, cr, pr, rr, tr, an, msr] = await Promise.all([
        fetchWithCsrf('/api/pd/ads/account', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/ads/campaigns', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/ads/placements', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/ads/refills', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/ads/transactions', { credentials: 'include' }),
        fetchWithCsrf(`/api/pd/ads/analytics?${q}`, { credentials: 'include' }),
        fetchWithCsrf('/api/pd/marketplace/settings', { credentials: 'include' }),
      ]);

      const [ad, cd, pd, rd, td, and, msd] = await Promise.all([
        ar.json(), cr.json(), pr.json(), rr.json(), tr.json(), an.json(), msr.json(),
      ]);

      if (!ar.ok || !cr.ok || !pr.ok || !rr.ok || !tr.ok || !an.ok) {
        throw new Error(ad.error?.message || cd.error?.message || 'Unable to load PandaMarket Ads');
      }

      setAccount(ad.account);
      setAutoRefillEnabled(Boolean(ad.account?.auto_refill_enabled));
      setAutoRefillThreshold(String(ad.account?.auto_refill_threshold || '10'));
      setAutoRefillAmount(String(ad.account?.auto_refill_amount || '50'));

      setCampaigns(cd.campaigns || []);
      setPlacements(pd.placements || []);
      setRefills(rd.refills || []);
      setTransactions(td.transactions || []);
      setAnalytics(and.summary || null);
      setDaily(and.daily || []);
      setMarketplaceSettings(msd.settings || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load PandaMarket Ads');
    } finally {
      setLoading(false);
    }
  }, [from, to, campaignFilter, granularity]);

  useEffect(() => {
    void load();
  }, [load]);

  const redeemCoupon = async () => {
    const code = window.prompt(t('ads.enterCouponCode') || 'Enter PandaMarket Ads promo code:');
    if (!code) return;
    setError(''); setSuccessMsg('');
    const res = await fetchWithCsrf('/api/pd/ads/coupons/redeem', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error?.message || 'Invalid promo code'); return; }
    setSuccessMsg(t('ads.couponRedeemed') || 'Promotional credit added to your account balance!');
    await load();
  };

  const saveAutoRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAutoRefill(true); setError(''); setSuccessMsg('');
    try {
      const res = await fetchWithCsrf('/api/pd/ads/account/auto-refill', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: autoRefillEnabled,
          threshold: Number(autoRefillThreshold),
          amount: Number(autoRefillAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update auto-refill');
      setSuccessMsg(t('ads.autoRefillSaved') || 'Auto-refill settings saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update auto-refill');
    } finally {
      setSavingAutoRefill(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true); setError('');
    try {
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'ads-refill-proofs' }),
      });
      if (!presignRes.ok) throw new Error('Failed to prepare picture upload');
      const presignData = await presignRes.json();
      const { upload_url, file_key, public_url } = presignData;
      if (upload_url) {
        const uploadRes = await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        if (!uploadRes.ok) throw new Error('Picture upload failed');
      }
      const finalUrl = public_url || file_key || upload_url;
      setRefillProofUrl(finalUrl);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setProofPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setProofPreviewUrl(finalUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Picture upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const startRefill = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSuccessMsg('');
    if (refillGateway === 'manual_mandat') {
      if (!refillProofUrl.trim()) { setError(t('ads.proofUrlHint') || 'Please upload a picture of your payment receipt.'); return; }
      const r = await fetchWithCsrf('/api/pd/ads/refills/manual-mandat', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(refillAmount), proof_url: refillProofUrl.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error?.message || 'Unable to submit manual refill'); return; }
      setRefilling(false); setRefillProofUrl(''); setProofPreviewUrl(''); setSuccessMsg(t('ads.mandatSubmitted') || 'Manual mandat refill submitted for admin review!');
      await load(); return;
    }
    const r = await fetchWithCsrf('/api/pd/ads/refills', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(refillAmount), gateway: refillGateway }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error?.message || 'Unable to start refill'); return; }
    window.location.href = d.checkout_url;
  };

  const action = async (id: string, name: string) => {
    const res = await fetchWithCsrf(`/api/pd/ads/campaigns/${id}/${name}`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (!res.ok) { setError(data.error?.message || 'Campaign action failed'); return; }
    await load();
  };

  const hideCampaign = async (id: string) => {
    if (!window.confirm('Hide this campaign from your dashboard?')) return;
    const res = await fetchWithCsrf(`/api/pd/ads/campaigns/${id}/hide`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || 'Failed to hide campaign');
      return;
    }
    await load();
  };

  const openEditModal = (c: Campaign) => {
    const creative = c.creatives?.[0];
    setEditingCampaign(c);
    setEditForm({
      name: c.name,
      daily_budget: String(c.daily_budget),
      total_budget: String(c.total_budget),
      bid_amount: String(c.bid_amount),
      title: creative?.title || c.name,
      description: creative?.description || '',
      image_url: creative?.image_url || '',
      cta_label: creative?.cta_label || 'Shop now',
      destination_url: creative?.destination_url || '',
    });
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setError(''); setSuccessMsg('');
    try {
      const res = await fetchWithCsrf(`/api/pd/ads/campaigns/${editingCampaign.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          daily_budget: Number(editForm.daily_budget),
          total_budget: Number(editForm.total_budget),
          bid_amount: Number(editForm.bid_amount),
          creative: {
            title: editForm.title,
            description: editForm.description || undefined,
            image_url: editForm.image_url || undefined,
            cta_label: editForm.cta_label || undefined,
            destination_url: editForm.destination_url || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update campaign');
      setEditingCampaign(null);
      setSuccessMsg('Campaign updated successfully! If it was approved, it has been resubmitted for admin review.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign');
    }
  };

  const billingInfo = marketplaceSettings?.marketplace_billing_info;

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-slate-900 dark:text-white" />
          {t('ads.loadingAds') || 'Chargement de PandaMarket Ads...'}
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs shrink-0">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {t('ads.center') || 'Centre Publicitaire PandaAds'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Sponsorisation
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-normal">
              {t('ads.sponsorDesc') || 'Boostez la visibilité de vos produits sur les emplacements phares de la place de marché.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={redeemCoupon}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
          >
            {t('ads.redeemCoupon') || 'Code Promo'}
          </button>
          <button
            type="button"
            onClick={() => setRefilling(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
          >
            {t('ads.refillAccount') || 'Recharger le Solde'}
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-3.5 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('ads.newCampaign') || 'Nouvelle Campagne'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs font-medium text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {successMsg && (
        <div role="status" className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {successMsg}
        </div>
      )}

      {/* Account Balance Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t('ads.availableBalance') || 'Solde Disponible', money(account?.balance, account?.currency), WalletCards],
          [t('ads.reserved') || 'Fonds Réservés', money(account?.reserved_balance, account?.currency), WalletCards],
          [t('ads.totalSpend') || 'Dépenses Totales', money(account?.total_spend, account?.currency), BarChart3],
          [t('ads.activeCampaigns') || 'Campagnes Actives', String(account?.active_campaigns || 0), Megaphone],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{String(label)}</p>
                <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mt-1.5">{String(value)}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Low Balance Warning */}
      {Number(account?.balance || 0) < 5 && (
        <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-xs font-normal text-amber-800 dark:text-amber-300 flex items-start gap-3 shadow-2xs">
          <WalletCards className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              {t('ads.lowBalanceTitle') || 'Solde Publicitaire Bas'}
            </p>
            <p className="mt-0.5 leading-relaxed">
              {t('ads.lowBalanceDesc') || 'Rechargez votre compte pour éviter la suspension automatique de la diffusion de vos annonces.'}
            </p>
          </div>
        </div>
      )}

      {/* Performance Section */}
      <section className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('ads.performanceTitle') || 'Performance & Statistiques'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">{t('ads.performanceDesc') || 'Suivi précis des impressions, clics, dépenses et conversions.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 shadow-2xs">
              {(['today', '7d', '30d', '90d'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSellerPreset(preset)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium uppercase text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            <select
              aria-label="Filtre de campagne"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs outline-none"
            >
              <option value="">{t('ads.allCampaigns') || 'Toutes les Campagnes'}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as any)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs outline-none"
            >
              <option value="hourly">Par heure</option>
              <option value="daily">Par jour</option>
              <option value="monthly">Par mois</option>
            </select>

            <input
              aria-label="Date de début"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs outline-none"
            />
            <input
              aria-label="Date de fin"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs outline-none"
            />
            <button
              type="button"
              onClick={() => load()}
              className="rounded-xl bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
            >
              {t('ads.apply') || 'Filtrer'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
          {[
            [t('ads.impressions') || 'Impressions', analytics?.impressions || 0],
            [t('ads.clicks') || 'Clics', analytics?.clicks || 0],
            [t('ads.ctr') || 'CTR', `${((analytics?.ctr || 0) * 100).toFixed(2)}%`],
            [t('ads.avgCpc') || 'CPC Moyen', money(String(analytics?.average_cpc || 0))],
            [t('ads.conversions') || 'Conversions', analytics?.conversions || 0],
            [t('ads.convRate') || 'Taux Conv.', `${((analytics?.conversion_rate || 0) * 100).toFixed(2)}%`],
            [t('ads.revenue') || 'Revenus', money(analytics?.revenue)],
            [t('ads.roas') || 'ROAS', `${Number(analytics?.roas || 0).toFixed(2)}×`],
          ].map(([l, v]) => (
            <div key={String(l)} className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{String(l)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white font-mono">{String(v)}</p>
            </div>
          ))}
        </div>

        <AdsPerformanceCharts daily={daily} />
      </section>

      {/* Campaigns List Section */}
      <section className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="border-b border-slate-100 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('ads.campaignsTitle') || 'Vos Campagnes Publicitaires'}</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('ads.noCampaigns') || 'Aucune campagne créée pour le moment.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {campaigns.map((c) => {
              const creative = c.creatives?.[0];
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {creative?.image_url ? (
                      <img src={creative.image_url ? getResizedImageUrl(creative.image_url, 'medium') : ''} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover border border-slate-200/80 dark:border-slate-700" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <Megaphone className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                        {creative?.image_url ? (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Créatif complet
                          </span>
                        ) : (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Visuel manquant
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.campaign_type.replaceAll('_', ' ')} · {money(c.spent_amount)} dépensé sur {money(c.total_budget)} · Enchère : {money(c.bid_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {c.status.replaceAll('_', ' ')}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPreviewCampaign(c)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
                      title="Aperçu du visuel"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(c)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
                      title="Modifier la campagne"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => hideCampaign(c.id)}
                      className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
                      title="Masquer la campagne"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    {c.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => action(c.id, 'submit')}
                        className="rounded-xl bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                      >
                        {t('ads.submit') || 'Soumettre'}
                      </button>
                    )}
                    {c.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => action(c.id, 'launch')}
                        className="rounded-xl bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                      >
                        {t('ads.launch') || 'Activer'}
                      </button>
                    )}
                    {c.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => action(c.id, 'pause')}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
                      >
                        {t('ads.pause') || 'Pause'}
                      </button>
                    )}
                    {c.status === 'paused' && (
                      <button
                        type="button"
                        onClick={() => action(c.id, 'resume')}
                        className="rounded-xl bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                      >
                        {t('ads.resume') || 'Reprendre'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Refill History */}
      <section className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="border-b border-slate-100 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('ads.refillHistoryTitle') || 'Historique des Rechargements'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">{t('ads.refillHistoryDesc') || 'Demandes de rechargement prépayé et reçus comptables.'}</p>
        </div>
        {refills.length === 0 ? (
          <p className="p-8 text-center text-xs font-medium text-slate-400">{t('ads.noRefills') || 'Aucun rechargement effectué.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 font-medium">{t('ads.date') || 'Date'}</th>
                  <th className="p-3.5 font-medium">{t('ads.gateway') || 'Passerelle'}</th>
                  <th className="p-3.5 font-medium">{t('ads.amount') || 'Montant'}</th>
                  <th className="p-3.5 font-medium">{t('ads.status') || 'Statut'}</th>
                  <th className="p-3.5 font-medium">{t('ads.proof') || 'Justificatif'}</th>
                  <th className="p-3.5 font-medium">{t('ads.receipt') || 'Reçu'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {refills.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3.5 font-medium capitalize text-slate-900 dark:text-white">{r.gateway === 'manual_mandat' ? (t('ads.mandatGateway') || 'Virement / Mandat') : r.gateway}</td>
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white font-mono">{money(r.amount, r.currency)}</td>
                    <td className="p-3.5">
                      {r.status === 'captured' ? (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-medium">{t('ads.captured') || 'Validé'}</span>
                      ) : r.status === 'pending_review' ? (
                        <span className="rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-medium">{t('ads.pendingReview') || 'En examen'}</span>
                      ) : r.status === 'rejected' ? (
                        <span className="rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 text-[10px] font-medium">{t('ads.rejected') || 'Rejeté'}</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 text-[10px] font-medium">{r.status.replaceAll('_', ' ')}</span>
                      )}
                      {r.status === 'rejected' && r.rejection_reason && <p className="mt-1 text-[10px] text-rose-600">{r.rejection_reason}</p>}
                    </td>
                    <td className="p-3.5">
                      {r.proof_url ? (
                        <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-900 dark:text-white underline">
                          {t('ads.viewProof') || 'Voir le reçu'}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {r.status === 'captured' ? (
                        <a href={`/api/pd/ads/refills/${encodeURIComponent(r.id)}/receipt`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs">
                          {t('ads.download') || 'Reçu'}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ads Account Transactions Ledger */}
      <section className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="border-b border-slate-100 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('ads.transactionsTitle') || 'Journal des Transactions Ads'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">Registre de tous les rechargements, débits de campagne et remboursements.</p>
        </div>
        {transactions.length === 0 ? (
          <p className="p-8 text-center text-xs font-medium text-slate-400">{t('ads.noTransactions') || 'Aucune transaction enregistrée.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 font-medium">{t('ads.date') || 'Date'}</th>
                  <th className="p-3.5 font-medium">{t('ads.type') || 'Type'}</th>
                  <th className="p-3.5 font-medium">{t('ads.description') || 'Description'}</th>
                  <th className="p-3.5 font-medium">Campagne</th>
                  <th className="p-3.5 font-medium">{t('ads.amount') || 'Montant'}</th>
                  <th className="p-3.5 font-medium">{t('ads.balance') || 'Solde après'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="p-3.5 font-medium capitalize text-slate-900 dark:text-white">{t.type.replaceAll('_', ' ')}</td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">{t.description || '—'}</td>
                    <td className="p-3.5 font-medium text-slate-900 dark:text-white">{t.campaign_name || t.description || 'Compte Général'}</td>
                    <td className={`p-3.5 font-semibold font-mono ${Number(t.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {Number(t.amount) >= 0 ? '+' : ''}{money(t.amount)}
                    </td>
                    <td className="p-3.5 font-medium text-slate-900 dark:text-white font-mono">{money(t.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Campaign Wizard Popup */}
      {creating && (
        <AdsCampaignWizard
          placements={placements}
          onClose={() => setCreating(false)}
          onCreated={load}
          onError={(err) => setError(err)}
        />
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={submitEdit} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Modifier la Campagne : {editingCampaign.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Toute modification soumettra de nouveau le créatif pour modération.</p>
              </div>
              <button type="button" onClick={() => setEditingCampaign(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <label className="sm:col-span-2 block space-y-1">
                Nom de la Campagne
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-2xs outline-none" />
              </label>

              <label className="block space-y-1">
                Budget Quotidien (TND)
                <input type="number" min="0.001" step="0.001" value={editForm.daily_budget} onChange={(e) => setEditForm({ ...editForm, daily_budget: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-2xs outline-none" />
              </label>

              <label className="block space-y-1">
                Budget Total (TND)
                <input type="number" min="0.001" step="0.001" value={editForm.total_budget} onChange={(e) => setEditForm({ ...editForm, total_budget: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-2xs outline-none" />
              </label>

              <label className="block space-y-1">
                Montant de l&apos;Enchère (TND)
                <input type="number" min="0" step="0.001" value={editForm.bid_amount} onChange={(e) => setEditForm({ ...editForm, bid_amount: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-2xs outline-none" />
              </label>

              <label className="block sm:col-span-2 space-y-1">
                Titre du Créatif
                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-2xs outline-none" />
              </label>

              <label className="block sm:col-span-2 space-y-1">
                Description du Créatif
                <textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs font-normal text-slate-900 dark:text-white shadow-2xs outline-none resize-none" />
              </label>

              <label className="block sm:col-span-2 space-y-1">
                URL de l&apos;Image
                <input value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-2xs outline-none" />
              </label>

              <label className="block space-y-1">
                Texte du Bouton CTA
                <input value={editForm.cta_label} onChange={(e) => setEditForm({ ...editForm, cta_label: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-2xs outline-none" />
              </label>

              <label className="block space-y-1">
                URL de Destination
                <input value={editForm.destination_url} onChange={(e) => setEditForm({ ...editForm, destination_url: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-2xs outline-none" />
              </label>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setEditingCampaign(null)} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer">
                Annuler
              </button>
              <button type="submit" className="flex-1 rounded-xl bg-slate-900 dark:bg-white py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer">
                Enregistrer & Soumettre
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Aperçu du Créatif Publicitaire</h2>
              <button type="button" onClick={() => setPreviewCampaign(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            {previewCampaign.creatives?.[0] ? (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-2xs p-3.5 space-y-3">
                {previewCampaign.creatives[0].image_url && (
                  <img src={previewCampaign.creatives[0].image_url} alt="" className="h-40 w-full rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                )}
                <div>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-700 dark:text-slate-300">Sponsorisé</span>
                  <h3 className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{previewCampaign.creatives[0].title}</h3>
                  {previewCampaign.creatives[0].description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-normal">{previewCampaign.creatives[0].description}</p>}
                  <button type="button" className="mt-3 rounded-xl bg-slate-900 dark:bg-white px-3.5 py-1.5 text-xs font-medium text-white dark:text-slate-900 shadow-2xs">
                    {previewCampaign.creatives[0].cta_label || 'Découvrir'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Aucun détail de créatif trouvé.</p>
            )}
          </div>
        </div>
      )}

      {/* Refill Modal */}
      {refilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={startRefill} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('ads.refillModalTitle') || 'Recharger le Solde Ads'}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">{t('ads.refillModalDesc') || 'Approvisionnez votre compte publicitaire.'}</p>
              </div>
              <button type="button" onClick={() => setRefilling(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('ads.amountTnd') || 'Montant (TND)'}
              </label>
              <input type="number" min="0.001" step="0.001" value={refillAmount} onChange={(e) => setRefillAmount(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-base font-semibold text-slate-900 dark:text-white shadow-2xs outline-none" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['20', '50', '100', '200'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRefillAmount(preset)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                      refillAmount === preset ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    +{preset} TND
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('ads.gateway') || 'Moyen de Paiement'}
              </label>
              <select value={refillGateway} onChange={(e) => setRefillGateway(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium text-slate-900 dark:text-white shadow-2xs outline-none cursor-pointer">
                <option value="flouci">Flouci</option>
                <option value="konnect">Konnect</option>
                <option value="manual_mandat">{t('ads.mandatGateway') || 'Virement Bancaire / Mandat'}</option>
              </select>
            </div>

            {refillGateway === 'manual_mandat' && (
              <div className="space-y-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white text-xs">{t('ads.billingDetailsTitle') || 'Coordonnées de Facturation'}</h3>
                </div>

                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700">
                  <p><span className="text-slate-400">{t('ads.recipientName') || 'Bénéficiaire'} :</span> {billingInfo?.recipient_name || 'PandaMarket SARL'}</p>
                  <p><span className="text-slate-400">{t('ads.bankName') || 'Banque'} :</span> {billingInfo?.bank_name || 'STB (Société Tunisienne de Banque)'}</p>
                  <p className="font-mono"><span className="text-slate-400 font-sans">{t('ads.rib') || 'RIB'} :</span> {billingInfo?.rib || '10 000 0000000000000 00'}</p>
                  <p className="font-mono"><span className="text-slate-400 font-sans">{t('ads.iban') || 'IBAN'} :</span> {billingInfo?.iban || 'TN59 1000 0000 0000 0000 0000'}</p>
                  <p><span className="text-slate-400">{t('ads.cinNumber') || 'CIN'} :</span> {billingInfo?.cin || '01234567'} ({billingInfo?.city || 'Tunis'})</p>
                  {billingInfo?.phone && <p><span className="text-slate-400">{t('ads.phone') || 'Téléphone'} :</span> {billingInfo.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{t('ads.proofImage') || 'Preuve de Virement'}</label>
                  {uploadingFile ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white dark:bg-slate-800 p-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-900 dark:text-white" />
                      {t('ads.uploadingProof') || 'Téléversement en cours...'}
                    </div>
                  ) : proofPreviewUrl ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5">
                      <div className="flex items-center gap-2.5">
                        <img src={proofPreviewUrl} alt="Receipt preview" className="h-12 w-12 rounded-lg object-cover border border-slate-200" />
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Document téléversé
                          </div>
                          <button type="button" onClick={() => { setRefillProofUrl(''); setProofPreviewUrl(''); }} className="mt-0.5 text-[11px] font-medium text-rose-600 hover:text-rose-700 cursor-pointer">Changer</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-center cursor-pointer hover:border-slate-400 transition">
                      <UploadCloud className="h-5 w-5 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('ads.clickToUpload') || 'Choisir une photo du reçu'}</span>
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            )}

            <button type="submit" disabled={uploadingFile} className="w-full rounded-xl bg-slate-900 dark:bg-white py-2.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer shadow-2xs">
              {refillGateway === 'manual_mandat' ? (t('ads.submitMandat') || 'Soumettre la Demande') : (t('ads.proceedToPayment') || 'Procéder au Paiement')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
