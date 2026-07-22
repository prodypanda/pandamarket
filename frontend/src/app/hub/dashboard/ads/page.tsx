'use client';

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

  if (loading) return <div className="p-8 text-sm font-semibold text-slate-500">{t('ads.loadingAds') || 'Loading Ads...'}</div>;

  return (
    <div dir={dir} className="space-y-7 p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-600">PandaMarket Ads</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">{t('ads.center') || 'Ads & Sponsorship Center'}</h1>
          <p className="mt-2 text-sm text-slate-500">{t('ads.sponsorDesc') || 'Promote your brand and products across marketplace slots.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={redeemCoupon} className="rounded-xl border border-amber-500 bg-amber-50 px-5 py-3 text-sm font-black text-amber-800 cursor-pointer">
            {t('ads.redeemCoupon') || 'Redeem Coupon'}
          </button>
          <button type="button" onClick={() => setRefilling(true)} className="rounded-xl border border-emerald-600 bg-white px-5 py-3 text-sm font-black text-emerald-700 cursor-pointer">
            {t('ads.refillAccount') || 'Refill Account'}
          </button>
          <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 cursor-pointer">
            <Plus className="h-4 w-4" /> {t('ads.newCampaign') || 'New Campaign'}
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {successMsg && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{successMsg}</div>}

      {/* Account Balance Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          [t('ads.availableBalance') || 'Available Balance', money(account?.balance, account?.currency), WalletCards],
          [t('ads.reserved') || 'Reserved', money(account?.reserved_balance, account?.currency), WalletCards],
          [t('ads.totalSpend') || 'Total Spend', money(account?.total_spend, account?.currency), BarChart3],
          [t('ads.activeCampaigns') || 'Active Campaigns', String(account?.active_campaigns || 0), Megaphone],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Icon className="h-5 w-5 text-emerald-600" />
            <p className="mt-4 text-xs font-bold uppercase text-slate-400">{String(label)}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Low Balance Warning */}
      <div className={`rounded-2xl border p-5 ${Number(account?.balance || 0) < 5 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
        <p className={`font-black ${Number(account?.balance || 0) < 5 ? 'text-red-900' : 'text-amber-900'}`}>
          {Number(account?.balance || 0) < 5 ? (t('ads.lowBalanceTitle') || 'Low Ads Balance') : (t('ads.prepaidAccountTitle') || 'Prepaid Account')}
        </p>
        <p className={`mt-1 text-sm ${Number(account?.balance || 0) < 5 ? 'text-red-700' : 'text-amber-800'}`}>
          {Number(account?.balance || 0) < 5 ? (t('ads.lowBalanceDesc') || 'Refill to prevent campaign pauses.') : (t('ads.prepaidAccountDesc') || 'Your Ads account is funded.')}
        </p>
      </div>

      {/* Performance Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-900">{t('ads.performanceTitle') || 'Performance & Analytics'}</h2>
            <p className="text-xs text-slate-500">{t('ads.performanceDesc') || 'Track impressions, clicks, spend, and conversions.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(['today', '7d', '30d', '90d'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSellerPreset(preset)}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold uppercase hover:bg-white cursor-pointer transition"
                >
                  {preset}
                </button>
              ))}
            </div>

            <select aria-label="Campaign filter" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="max-w-48 rounded-xl border px-3 py-2 text-xs font-semibold">
              <option value="">{t('ads.allCampaigns') || 'All Campaigns'}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select value={granularity} onChange={(e) => setGranularity(e.target.value as any)} className="rounded-xl border px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer">
              <option value="hourly">Hourly (24h)</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>

            <input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border px-3 py-2 text-xs font-semibold" />
            <input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border px-3 py-2 text-xs font-semibold" />
            <button type="button" onClick={() => load()} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 cursor-pointer">
              {t('ads.apply') || 'Apply'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          {[
            [t('ads.impressions') || 'Impressions', analytics?.impressions || 0],
            [t('ads.clicks') || 'Clicks', analytics?.clicks || 0],
            [t('ads.ctr') || 'CTR', `${((analytics?.ctr || 0) * 100).toFixed(2)}%`],
            [t('ads.avgCpc') || 'Avg CPC', money(String(analytics?.average_cpc || 0))],
            [t('ads.conversions') || 'Conversions', analytics?.conversions || 0],
            [t('ads.convRate') || 'Conv Rate', `${((analytics?.conversion_rate || 0) * 100).toFixed(2)}%`],
            [t('ads.revenue') || 'Revenue', money(analytics?.revenue)],
            [t('ads.roas') || 'ROAS', `${Number(analytics?.roas || 0).toFixed(2)}×`],
          ].map(([l, v]) => (
            <div key={String(l)} className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase text-slate-400">{String(l)}</p>
              <p className="mt-1 font-black text-slate-900">{String(v)}</p>
            </div>
          ))}
        </div>

        <AdsPerformanceCharts daily={daily} />
      </section>

      {/* Campaigns List Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-black text-slate-900">{t('ads.campaignsTitle') || 'Your Ads Campaigns'}</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-500">{t('ads.noCampaigns') || 'No campaigns created yet.'}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {campaigns.map((c) => {
              const creative = c.creatives?.[0];
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-slate-50/70 transition">
                  <div className="flex items-center gap-4">
                    {creative?.image_url ? (
                      <img src={creative.image_url} alt="" className="h-12 w-12 rounded-xl object-cover border border-slate-200" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Megaphone className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900 text-base">{c.name}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${creative?.image_url ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          Health: {creative?.image_url ? '95% Excellent' : '75% Needs Artwork'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500">
                        {c.campaign_type.replaceAll('_', ' ')} · {money(c.spent_amount)} {t('ads.spentOf') || 'spent of'} {money(c.total_budget)} · Rate: {money(c.bid_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                      {c.status.replaceAll('_', ' ')}
                    </span>

                    <button type="button" onClick={() => setPreviewCampaign(c)} className="rounded-lg border bg-white p-2 text-slate-600 hover:bg-slate-50 transition cursor-pointer" title="Preview Creative">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => openEditModal(c)} className="rounded-lg border bg-white p-2 text-slate-600 hover:bg-slate-50 transition cursor-pointer" title="Edit Campaign">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => hideCampaign(c.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 transition cursor-pointer" title="Hide/Archive Campaign">
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {c.status === 'draft' && (
                      <button type="button" onClick={() => action(c.id, 'submit')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 transition cursor-pointer">
                        {t('ads.submit') || 'Submit'}
                      </button>
                    )}
                    {c.status === 'approved' && (
                      <button type="button" onClick={() => action(c.id, 'launch')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 transition cursor-pointer">
                        {t('ads.launch') || 'Launch'}
                      </button>
                    )}
                    {c.status === 'active' && (
                      <button type="button" onClick={() => action(c.id, 'pause')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                        {t('ads.pause') || 'Pause'}
                      </button>
                    )}
                    {c.status === 'paused' && (
                      <button type="button" onClick={() => action(c.id, 'resume')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 transition cursor-pointer">
                        {t('ads.resume') || 'Resume'}
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
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-black text-slate-900">{t('ads.refillHistoryTitle') || 'Refill History'}</h2>
          <p className="text-xs text-slate-500">{t('ads.refillHistoryDesc') || 'Prepaid account top-up requests and receipts.'}</p>
        </div>
        {refills.length === 0 ? (
          <p className="p-8 text-center text-sm font-semibold text-slate-400">{t('ads.noRefills') || 'No refills executed.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4">{t('ads.date') || 'Date'}</th>
                  <th className="p-4">{t('ads.gateway') || 'Gateway'}</th>
                  <th className="p-4">{t('ads.amount') || 'Amount'}</th>
                  <th className="p-4">{t('ads.status') || 'Status'}</th>
                  <th className="p-4">{t('ads.proof') || 'Proof'}</th>
                  <th className="p-4">{t('ads.receipt') || 'Receipt'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {refills.map((r) => (
                  <tr key={r.id}>
                    <td className="p-4 text-xs font-semibold text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-4 font-bold capitalize text-slate-900">{r.gateway === 'manual_mandat' ? (t('ads.mandatGateway') || 'Bank Transfer / Mandat') : r.gateway}</td>
                    <td className="p-4 font-black text-slate-900">{money(r.amount, r.currency)}</td>
                    <td className="p-4">
                      {r.status === 'captured' ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">{t('ads.captured') || 'Captured'}</span>
                      ) : r.status === 'pending_review' ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{t('ads.pendingReview') || 'Pending Review'}</span>
                      ) : r.status === 'rejected' ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">{t('ads.rejected') || 'Rejected'}</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{r.status.replaceAll('_', ' ')}</span>
                      )}
                      {r.status === 'rejected' && r.rejection_reason && <p className="mt-1 text-[11px] font-semibold text-red-500">{r.rejection_reason}</p>}
                    </td>
                    <td className="p-4">
                      {r.proof_url ? (
                        <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 underline">
                          {t('ads.viewProof') || 'View Proof'}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.status === 'captured' ? (
                        <a href={`/api/pd/ads/refills/${encodeURIComponent(r.id)}/receipt`} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 transition">
                          {t('ads.download') || 'Receipt'}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">{t('ads.unavailable') || 'Unavailable'}</span>
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
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-black text-slate-900">{t('ads.transactionsTitle') || 'Ads Account Transactions'}</h2>
          <p className="text-xs text-slate-500">Ledger of all refills, campaign debits, refunds, and promo credits.</p>
        </div>
        {transactions.length === 0 ? (
          <p className="p-8 text-center text-sm font-semibold text-slate-400">{t('ads.noTransactions') || 'No transactions recorded.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4">{t('ads.date') || 'Date'}</th>
                  <th className="p-4">{t('ads.type') || 'Type'}</th>
                  <th className="p-4">{t('ads.description') || 'Description'}</th>
                  <th className="p-4">Campaign</th>
                  <th className="p-4">{t('ads.amount') || 'Amount'}</th>
                  <th className="p-4">{t('ads.balance') || 'Balance After'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="p-4 text-xs font-semibold text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="p-4 font-bold capitalize text-slate-900">{t.type.replaceAll('_', ' ')}</td>
                    <td className="p-4 text-xs font-semibold text-slate-600">{t.description || '—'}</td>
                    <td className="p-4 text-xs font-bold text-slate-900">{t.campaign_name || '—'}</td>
                    <td className={`p-4 font-black ${Number(t.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Number(t.amount) >= 0 ? '+' : ''}{money(t.amount)}
                    </td>
                    <td className="p-4 font-bold text-slate-900">{money(t.balance_after)}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={submitEdit} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Edit Campaign: {editingCampaign.name}</h2>
                <p className="text-xs text-slate-500">Editing an approved ad will resubmit it for admin moderation.</p>
              </div>
              <button type="button" onClick={() => setEditingCampaign(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs font-bold text-slate-700">
              <label className="sm:col-span-2 block">
                Campaign Name
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-semibold text-slate-900" />
              </label>

              <label className="block">
                Daily Budget (TND)
                <input type="number" min="0.001" step="0.001" value={editForm.daily_budget} onChange={(e) => setEditForm({ ...editForm, daily_budget: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-semibold text-slate-900" />
              </label>

              <label className="block">
                Total Budget (TND)
                <input type="number" min="0.001" step="0.001" value={editForm.total_budget} onChange={(e) => setEditForm({ ...editForm, total_budget: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-semibold text-slate-900" />
              </label>

              <label className="block">
                Bid Amount (TND)
                <input type="number" min="0" step="0.001" value={editForm.bid_amount} onChange={(e) => setEditForm({ ...editForm, bid_amount: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-semibold text-slate-900" />
              </label>

              <label className="block sm:col-span-2">
                Creative Title
                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-semibold text-slate-900" />
              </label>

              <label className="block sm:col-span-2">
                Creative Description
                <textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-semibold text-slate-900" />
              </label>

              <label className="block sm:col-span-2">
                Image URL
                <input value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-semibold text-slate-900" />
              </label>

              <label className="block">
                CTA Button Text
                <input value={editForm.cta_label} onChange={(e) => setEditForm({ ...editForm, cta_label: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-semibold text-slate-900" />
              </label>

              <label className="block">
                Destination Link URL
                <input value={editForm.destination_url} onChange={(e) => setEditForm({ ...editForm, destination_url: e.target.value })} className="mt-1 w-full rounded-xl border p-3 text-sm font-semibold text-slate-900" />
              </label>
            </div>

            <div className="flex gap-3 pt-3">
              <button type="button" onClick={() => setEditingCampaign(null)} className="flex-1 rounded-xl border py-3 text-xs font-black text-slate-700 hover:bg-slate-50 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer">
                Save & Update
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-black text-slate-900">Ad Creative Preview</h2>
              <button type="button" onClick={() => setPreviewCampaign(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            {previewCampaign.creatives?.[0] ? (
              <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm p-4 space-y-3">
                {previewCampaign.creatives[0].image_url && (
                  <img src={previewCampaign.creatives[0].image_url} alt="" className="h-44 w-full rounded-xl object-cover border" />
                )}
                <div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">Sponsored</span>
                  <h3 className="mt-2 text-base font-black text-slate-900">{previewCampaign.creatives[0].title}</h3>
                  {previewCampaign.creatives[0].description && <p className="mt-1 text-xs text-slate-600">{previewCampaign.creatives[0].description}</p>}
                  <button type="button" className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white">
                    {previewCampaign.creatives[0].cta_label || 'Shop now'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No creative details found.</p>
            )}
          </div>
        </div>
      )}

      {/* Refill Modal with Picture Upload and Billing Information */}
      {refilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={startRefill} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{t('ads.refillModalTitle') || 'Refill Ads Balance'}</h2>
                <p className="text-xs text-slate-500">{t('ads.refillModalDesc') || 'Prepay funds into your Ads account.'}</p>
              </div>
              <button type="button" onClick={() => setRefilling(false)} className="rounded-full p-1 hover:bg-slate-100 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                {t('ads.amountTnd') || 'Amount (TND)'}
                <input type="number" min="0.001" step="0.001" value={refillAmount} onChange={(e) => setRefillAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-lg font-black text-slate-900 focus:border-emerald-500 focus:ring-emerald-500" />
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {['20', '50', '100', '200'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRefillAmount(preset)}
                    className={`rounded-lg border px-3 py-1 text-xs font-bold transition cursor-pointer ${
                      refillAmount === preset ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    +{preset} TND
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              {t('ads.gateway') || 'Payment Method'}
              <select value={refillGateway} onChange={(e) => setRefillGateway(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-900 normal-case focus:border-emerald-500 focus:ring-emerald-500 cursor-pointer">
                <option value="flouci">Flouci</option>
                <option value="konnect">Konnect</option>
                <option value="manual_mandat">{t('ads.mandatGateway') || 'Bank Transfer / Mandat'}</option>
              </select>
            </label>

            {refillGateway === 'manual_mandat' && (
              <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-amber-700" />
                  <h3 className="font-black text-amber-900 text-sm">{t('ads.billingDetailsTitle') || 'Marketplace Billing Information'}</h3>
                </div>

                <div className="space-y-1.5 text-xs text-slate-800 font-semibold bg-white p-3 rounded-xl border border-amber-100">
                  <p><span className="font-bold text-slate-500">{t('ads.recipientName') || 'Beneficiary'}:</span> {billingInfo?.recipient_name || 'PandaMarket SARL'}</p>
                  <p><span className="font-bold text-slate-500">{t('ads.bankName') || 'Bank'}:</span> {billingInfo?.bank_name || 'STB (Société Tunisienne de Banque)'}</p>
                  <p className="font-mono text-slate-900"><span className="font-bold text-slate-500 font-sans">{t('ads.rib') || 'RIB'}:</span> {billingInfo?.rib || '10 000 0000000000000 00'}</p>
                  <p className="font-mono text-slate-900"><span className="font-bold text-slate-500 font-sans">{t('ads.iban') || 'IBAN'}:</span> {billingInfo?.iban || 'TN59 1000 0000 0000 0000 0000'}</p>
                  <p><span className="font-bold text-slate-500">{t('ads.cinNumber') || 'CIN'}:</span> {billingInfo?.cin || '01234567'} ({billingInfo?.city || 'Tunis'})</p>
                  {billingInfo?.phone && <p><span className="font-bold text-slate-500">{t('ads.phone') || 'Support Phone'}:</span> {billingInfo.phone}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase text-slate-700">{t('ads.proofImage') || 'Proof Picture Upload'}</label>
                  {uploadingFile ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-white p-4 text-xs font-bold text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      {t('ads.uploadingProof') || 'Uploading picture...'}
                    </div>
                  ) : proofPreviewUrl ? (
                    <div className="relative overflow-hidden rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                      <div className="flex items-center gap-3">
                        <img src={proofPreviewUrl} alt="Receipt preview" className="h-14 w-14 rounded-lg object-cover border border-emerald-200" />
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Uploaded successfully
                          </div>
                          <button type="button" onClick={() => { setRefillProofUrl(''); setProofPreviewUrl(''); }} className="mt-1 text-[11px] font-bold text-red-600 underline cursor-pointer">Change picture</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-white p-6 text-center cursor-pointer hover:border-emerald-500 transition">
                      <UploadCloud className="h-7 w-7 text-amber-600" />
                      <span className="text-xs font-bold text-slate-700">{t('ads.clickToUpload') || 'Click to select picture'}</span>
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            )}

            <button type="submit" disabled={uploadingFile} className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-lg shadow-emerald-600/20">
              {refillGateway === 'manual_mandat' ? (t('ads.submitMandat') || 'Submit Mandat Proof') : (t('ads.proceedToPayment') || 'Proceed to Payment')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
