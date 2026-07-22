'use client';

import { fetchWithCsrf } from '@/lib/api';
import { BarChart3, Building, Check, DollarSign, ExternalLink, Eye, History, Layers, Loader2, Megaphone, RefreshCw, Settings, ShieldAlert, Users, WalletCards, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdsPlatformChart } from '../../../components/admin/AdsPlatformChart';

type CreativeItem = { id?: string; title: string; description?: string; image_url?: string; cta_label?: string; destination_url?: string; product_id?: string };

type Campaign = {
  id: string; store_id: string; name: string; store_name: string; campaign_type: string; objective?: string; status: string;
  pricing_model?: string; bid_amount?: string; daily_budget?: string; total_budget: string; spent_amount: string;
  starts_at?: string; ends_at?: string; targeting?: Record<string, any>; created_at: string;
  subdomain?: string; custom_domain?: string; is_verified?: boolean; seller_type?: string;
  owner_email?: string; owner_name?: string; account_balance?: string; account_reserved_balance?: string; account_status?: string;
  creatives?: CreativeItem[]; placement_names?: string[];
};

type Account = { id: string; store_id: string; store_name: string; balance: string; reserved_balance: string; campaign_count: number; total_spend: string; status: string };
type Summary = { campaigns: number; pending_review: number; active: number; total_spend: string };
type DailyStat = { stat_date: string; impressions: string; clicks: string; conversions: string; spend: string; revenue: string };
type Review = { id: string; campaign_name: string; store_name: string; decision: string; reason?: string; reviewer_email?: string; created_at: string };
type Placement = { id: string; name: string; placement_key: string; format: string; enabled: boolean; default_price: string; default_pricing_model: string };
type AdsCoupon = { id: string; code: string; amount: string; max_redemptions: number; redemption_count: number; expires_at?: string; enabled: boolean };
type AdsTransaction = { id: string; type: string; amount: string; balance_after: string; description?: string; created_at: string; store_name: string; campaign_name?: string; refunded: boolean };
type AdsConfig = { ads_enabled: boolean; ads_moderation_required: boolean; ads_min_refill_tnd: number; ads_max_refill_tnd: number; ads_min_daily_budget_tnd: number; ads_max_campaign_days: number; ads_frequency_cap_daily: number; ads_click_attribution_days: number; ads_view_attribution_days: number; ads_sponsored_products_enabled: boolean; ads_sponsored_brands_enabled: boolean; ads_sponsored_content_enabled: boolean; ads_prohibited_terms: string; ads_creative_image_required: boolean; ads_max_creative_description_length: number };
type BlockedIP = { ip_hash: string; reason?: string; blocked_at: string };
type AdminAdsTab = 'overview' | 'moderation' | 'advertisers' | 'transactions' | 'placements' | 'pricing' | 'fraud' | 'configuration';

const money = (v: string) => `${Number(v || 0).toFixed(3)} TND`;

export default function AdminAdsPage() {
  const [activeTab, setActiveTab] = useState<AdminAdsTab>('overview');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [transactions, setTransactions] = useState<AdsTransaction[]>([]);
  const [coupons, setCoupons] = useState<AdsCoupon[]>([]);
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [r, pr, cr, tr, cor, fr] = await Promise.all([
        fetchWithCsrf('/api/pd/admin/ads', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/placements', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/config', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/transactions?limit=100', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/coupons', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/fraud/blocked-ips', { credentials: 'include' }),
      ]);
      const [d, pd, cd, td, cod, fd] = await Promise.all([r.json(), pr.json(), cr.json(), tr.json(), cor.json(), fr.json()]);
      if (!r.ok || !pr.ok || !cr.ok || !tr.ok || !cor.ok || !fr.ok) throw new Error(d.error?.message || pd.error?.message || 'Unable to load Ads data');
      setCampaigns(d.campaigns || []);
      setAccounts(d.accounts || []);
      setPlacements(pd.placements || []);
      setTransactions(td.transactions || []);
      setCoupons(cod.coupons || []);
      setAdsConfig(cd.config || null);
      setReviews(d.reviews || []);
      setSummary(d.summary || null);
      setDaily(d.daily || []);
      setBlockedIPs(fd.blocked_ips || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Ads data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateConfig = async (patch: Partial<AdsConfig>) => {
    const r = await fetchWithCsrf('/api/pd/admin/ads/config', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Configuration update failed');
      return;
    }
    await load();
  };

  const review = async (id: string, decision: 'approved' | 'rejected', customReason?: string) => {
    const reason = decision === 'rejected' ? customReason || window.prompt('Rejection reason') || '' : '';
    if (decision === 'rejected' && !reason) return;
    const r = await fetchWithCsrf(`/api/pd/admin/ads/campaigns/${id}/review`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason: reason || undefined }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error?.message || 'Review failed');
      return;
    }
    setSelectedCampaign(null);
    setRejectReason('');
    await load();
  };

  const suspendCampaign = async (id: string) => {
    const reason = window.prompt('Reason for suspending this campaign:') || 'Suspended by Super Admin';
    if (!reason) return;
    const r = await fetchWithCsrf(`/api/pd/admin/ads/campaigns/${id}/suspend`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Suspend failed');
      return;
    }
    setSelectedCampaign(null);
    await load();
  };

  const credit = async (account: Account) => {
    const raw = window.prompt(`Promotional credit for ${account.store_name}:`);
    const amount = Number(raw);
    const reason = window.prompt('Credit reason:');
    if (!Number.isFinite(amount) || amount <= 0 || !reason) return;
    const r = await fetchWithCsrf('/api/pd/admin/ads/credits', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: account.store_id, amount, reason, idempotency_key: `promo-${account.id}-${Date.now()}` }),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Credit failed');
      return;
    }
    await load();
  };

  const setStatus = async (account: Account) => {
    const status = account.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`${status === 'suspended' ? 'Suspend' : 'Reactivate'} ${account.store_name}'s Ads account?`)) return;
    const r = await fetchWithCsrf(`/api/pd/admin/ads/accounts/${account.store_id}/status`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Status update failed');
      return;
    }
    await load();
  };

  const bulkPricing = async () => {
    const model = window.prompt('Pricing model: cpc, cpm, or fixed_daily', 'cpc');
    if (!model || !['cpc', 'cpm', 'fixed_daily'].includes(model)) return;
    const raw = window.prompt(`Default ${model.toUpperCase()} rate:`);
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) return;
    const r = await fetchWithCsrf('/api/pd/admin/ads/placements/bulk-pricing', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricing_model: model, default_price: price }),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Bulk pricing update failed');
      return;
    }
    await load();
  };

  const updatePlacement = async (placement: Placement, patch: Record<string, unknown>) => {
    const r = await fetchWithCsrf(`/api/pd/admin/ads/placements/${placement.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Placement update failed');
      return;
    }
    await load();
  };

  const createCoupon = async () => {
    const code = window.prompt('Coupon code (letters/numbers/dashes):')?.trim();
    if (!code) return;
    const amount = Number(window.prompt('Promotional credit amount (TND):'));
    const max = Number(window.prompt('Maximum redemptions:', '1'));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(max) || max <= 0) return;
    const r = await fetchWithCsrf('/api/pd/admin/ads/coupons', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, amount, max_redemptions: max }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error?.message || 'Coupon creation failed');
      return;
    }
    await load();
  };

  const refund = async (transaction: AdsTransaction) => {
    const reason = window.prompt(`Refund ${money(String(Math.abs(Number(transaction.amount))))} to ${transaction.store_name}. Reason:`);
    if (!reason) return;
    const r = await fetchWithCsrf(`/api/pd/admin/ads/transactions/${transaction.id}/refund`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error?.message || 'Refund failed');
      return;
    }
    await load();
  };

  const adjust = async (account: Account) => {
    const raw = window.prompt(`Adjustment for ${account.store_name} (negative debits):`);
    if (!raw) return;
    const amount = Number(raw);
    const reason = window.prompt('Reason for adjustment:');
    if (!Number.isFinite(amount) || amount === 0 || !reason) return;
    const r = await fetchWithCsrf('/api/pd/admin/ads/accounts/adjust', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: account.store_id, amount, reason, idempotency_key: `admin-${account.id}-${Date.now()}` }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error?.message || 'Adjustment failed');
      return;
    }
    await load();
  };

  const blockIP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ip_hash = fd.get('ip_hash')?.toString();
    const reason = fd.get('reason')?.toString();
    if (!ip_hash) return;
    const r = await fetchWithCsrf('/api/pd/admin/ads/fraud/block-ip', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip_hash, reason }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error?.message || 'Block IP failed');
      return;
    }
    (e.target as HTMLFormElement).reset();
    await load();
  };

  const unblockIP = async (ipHash: string) => {
    const r = await fetchWithCsrf(`/api/pd/admin/ads/fraud/blocked-ips/${encodeURIComponent(ipHash)}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Unblock failed');
      return;
    }
    await load();
  };

  const tabs: Array<{ id: AdminAdsTab; label: string; icon: any; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'moderation', label: 'Moderation', icon: Check, count: summary?.pending_review || 0 },
    { id: 'advertisers', label: 'Advertisers', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'placements', label: 'Placements', icon: Layers },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'fraud', label: 'Fraud & Safety', icon: ShieldAlert, count: blockedIPs.length },
    { id: 'configuration', label: 'Configuration', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#B91C1C]">Advertising operations</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">PandaMarket Ads</h1>
          <p className="mt-1 text-sm text-gray-500">Moderate campaigns and control prepaid advertiser accounts.</p>
        </div>
        <button type="button" onClick={() => load()} className="rounded-xl border bg-white p-3 shadow-sm hover:bg-gray-50 cursor-pointer">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {/* 8-Tab Navigation Header */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {Boolean(tab.count) && (
                <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-black ${isActive ? 'bg-amber-500 text-slate-950' : 'bg-amber-100 text-amber-800'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ['Campaigns', summary?.campaigns || 0, Megaphone],
                  ['Pending review', summary?.pending_review || 0, Megaphone],
                  ['Active', summary?.active || 0, Megaphone],
                  ['Ads revenue', money(summary?.total_spend || '0'), WalletCards],
                ].map(([l, v, I]) => (
                  <div key={String(l)} className="rounded-2xl border bg-white p-5 shadow-sm">
                    <I className="h-5 w-5 text-[#B91C1C]" />
                    <p className="mt-3 text-xs font-bold uppercase text-gray-400">{String(l)}</p>
                    <p className="text-2xl font-black text-slate-900">{String(v)}</p>
                  </div>
                ))}
              </div>
              <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5">
                  <h2 className="font-black text-slate-900">Platform Ads performance</h2>
                  <p className="text-xs text-gray-500">Spend, attributed revenue, and valid clicks over the last 30 days.</p>
                </div>
                <AdsPlatformChart daily={daily} />
              </section>
            </div>
          )}

          {/* TAB 2: MODERATION */}
          {activeTab === 'moderation' && (
            <div className="space-y-6">
              <section className="rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5">
                  <h2 className="font-black text-slate-900">Campaign moderation queue</h2>
                  <p className="text-xs text-gray-500">Review advertiser artwork, targeting, and store details before approving.</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {campaigns.map((c) => {
                    const primaryCreative = c.creatives?.[0];
                    return (
                      <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-slate-50/70 transition">
                        <div className="flex items-center gap-4">
                          {primaryCreative?.image_url ? (
                            <img src={primaryCreative.image_url} alt="" className="h-14 w-14 rounded-xl object-cover border border-slate-200" />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                              <Megaphone className="h-6 w-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-900 text-base">{c.name}</p>
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600">
                                {c.campaign_type.replaceAll('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-emerald-700">
                              Store: {c.store_name} {c.owner_email ? `(${c.owner_email})` : ''}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 font-medium">
                              Headline: "{primaryCreative?.title || 'No creative headline'}" · Budget: {money(c.spent_amount)} / {money(c.total_budget)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCampaign(c)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            Inspect & Review
                          </button>
                          {c.status === 'pending_review' && (
                            <>
                              <button
                                type="button"
                                onClick={() => review(c.id, 'approved')}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition cursor-pointer shadow-sm"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => review(c.id, 'rejected')}
                                className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700 transition cursor-pointer shadow-sm"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {['approved', 'active', 'scheduled'].includes(c.status) && (
                            <button
                              type="button"
                              onClick={() => suspendCampaign(c.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 transition cursor-pointer shadow-sm"
                            >
                              Suspend Ad
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {campaigns.length === 0 && <p className="p-8 text-center text-sm font-semibold text-gray-400">No campaigns found.</p>}
                </div>
              </section>

              <section className="rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5"><h2 className="font-black text-slate-900">Moderation review history</h2></div>
                <div className="divide-y divide-gray-100">
                  {reviews.map((r) => (
                    <div key={r.id} className="p-5">
                      <div className="flex justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-900">{r.campaign_name}</p>
                          <p className="text-xs text-gray-500">{r.store_name} · Reviewer: {r.reviewer_email || 'System'}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${r.decision === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {r.decision.replaceAll('_', ' ')}
                        </span>
                      </div>
                      {r.reason && <p className="mt-2 text-xs font-semibold text-gray-700 bg-gray-50 p-3 rounded-xl border">{r.reason}</p>}
                    </div>
                  ))}
                  {reviews.length === 0 && <p className="p-8 text-center text-sm font-semibold text-gray-400">No reviews yet.</p>}
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: ADVERTISERS */}
          {activeTab === 'advertisers' && (
            <section className="rounded-2xl border bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="font-black text-slate-900">Advertiser accounts</h2>
                <p className="text-xs text-gray-500">Inspect seller balances, status, promotional credits, and manual adjustments.</p>
              </div>
              <div className="divide-y divide-gray-100">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-5">
                    <div>
                      <p className="font-black text-slate-900">{a.store_name}</p>
                      <p className="text-xs text-slate-500">Balance: {money(a.balance)} · Total spend: {money(a.total_spend)} · {a.campaign_count} campaigns</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${a.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {a.status}
                      </span>
                      <button type="button" onClick={() => credit(a)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                        + Credit
                      </button>
                      <button type="button" onClick={() => adjust(a)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                        Adjust
                      </button>
                      <button type="button" onClick={() => setStatus(a)} className={`rounded-xl px-3 py-1.5 text-xs font-black text-white transition cursor-pointer ${a.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        {a.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 4: TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="font-black text-slate-900">Platform Ads transactions ledger</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Advertiser</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Balance after</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="p-4 text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="p-4 font-bold text-slate-900">{t.store_name}</td>
                        <td className="p-4 font-semibold capitalize text-slate-700">{t.type.replaceAll('_', ' ')}</td>
                        <td className={`p-4 font-black ${Number(t.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {Number(t.amount) >= 0 ? '+' : ''}{money(t.amount)}
                        </td>
                        <td className="p-4 font-bold text-slate-900">{money(t.balance_after)}</td>
                        <td className="p-4">
                          {t.type === 'campaign_debit' && !t.refunded && (
                            <button type="button" onClick={() => refund(t)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 hover:bg-red-100 transition cursor-pointer">
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 5: PLACEMENTS */}
          {activeTab === 'placements' && (
            <section className="rounded-2xl border bg-white shadow-sm">
              <div className="border-b p-5 flex items-center justify-between">
                <div>
                  <h2 className="font-black text-slate-900">Placement slots</h2>
                  <p className="text-xs text-slate-500">Configure marketplace advertising slots and default pricing.</p>
                </div>
                <button type="button" onClick={bulkPricing} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition cursor-pointer">
                  Bulk pricing
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {placements.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-5">
                    <div>
                      <p className="font-black text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.placement_key} · Format: {p.format} · Default: {money(p.default_price)} ({p.default_pricing_model.toUpperCase()})</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-black text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => updatePlacement(p, { enabled: e.target.checked })}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      Enabled
                    </label>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 6: PRICING */}
          {activeTab === 'pricing' && (
            <section className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
              <h2 className="font-black text-slate-900 text-lg">Platform Pricing Rates</h2>
              <p className="text-xs text-slate-500">Configure baseline rates per placement format across the marketplace.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {placements.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                    <p className="font-black text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.format}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-black text-emerald-700">{money(p.default_price)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newPrice = Number(window.prompt(`New rate for ${p.name} (TND):`, p.default_price));
                          if (Number.isFinite(newPrice) && newPrice > 0) {
                            updatePlacement(p, { default_price: newPrice });
                          }
                        }}
                        className="rounded-lg border bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Edit rate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 7: FRAUD & SAFETY */}
          {activeTab === 'fraud' && (
            <div className="space-y-6">
              <section className="rounded-2xl border bg-white shadow-sm p-6">
                <h2 className="font-black text-slate-900 text-lg">Fraud & Click Protection</h2>
                <form onSubmit={blockIP} className="mt-4 flex flex-wrap gap-3">
                  <input name="ip_hash" placeholder="IP Hash / Identifier" required className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold flex-1 min-w-64" />
                  <input name="reason" placeholder="Reason (e.g. click farm activity)" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold flex-1 min-w-64" />
                  <button type="submit" className="rounded-xl bg-red-600 px-5 py-2 text-xs font-black text-white hover:bg-red-700 transition cursor-pointer">
                    Block IP Hash
                  </button>
                </form>
              </section>

              <section className="rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5"><h2 className="font-black text-slate-900">Blocked IP Hashes ({blockedIPs.length})</h2></div>
                <div className="divide-y divide-gray-100">
                  {blockedIPs.map((b) => (
                    <div key={b.ip_hash} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-900">{b.ip_hash}</p>
                        <p className="text-xs text-slate-500">{b.reason || 'Manual block'} · Blocked: {new Date(b.blocked_at).toLocaleString()}</p>
                      </div>
                      <button type="button" onClick={() => unblockIP(b.ip_hash)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                        Unblock
                      </button>
                    </div>
                  ))}
                  {blockedIPs.length === 0 && <p className="p-8 text-center text-sm font-semibold text-gray-400">No blocked IPs.</p>}
                </div>
              </section>
            </div>
          )}

          {/* TAB 8: CONFIGURATION */}
          {activeTab === 'configuration' && adsConfig && (
            <section className="rounded-2xl border bg-white shadow-sm p-6 space-y-5">
              <h2 className="font-black text-slate-900 text-lg">Global Platform Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border p-4 font-bold text-sm text-slate-900 cursor-pointer">
                  <input type="checkbox" checked={adsConfig.ads_enabled} onChange={(e) => updateConfig({ ads_enabled: e.target.checked })} className="h-5 w-5 rounded text-emerald-600 cursor-pointer" />
                  Enable PandaMarket Ads
                </label>
                <label className="flex items-center gap-3 rounded-xl border p-4 font-bold text-sm text-slate-900 cursor-pointer">
                  <input type="checkbox" checked={adsConfig.ads_moderation_required} onChange={(e) => updateConfig({ ads_moderation_required: e.target.checked })} className="h-5 w-5 rounded text-emerald-600 cursor-pointer" />
                  Require Super Admin Moderation
                </label>
              </div>
            </section>
          )}
        </>
      )}

      {/* Super Admin Full Campaign & Store Inspection Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 uppercase">
                  {selectedCampaign.status.replaceAll('_', ' ')}
                </span>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{selectedCampaign.name}</h2>
                <p className="text-xs text-slate-500 font-mono">Campaign ID: {selectedCampaign.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedCampaign(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Store & Advertiser Info Card */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-900">
                <Building className="h-5 w-5 text-blue-700" />
                <h3 className="font-black text-sm uppercase tracking-wider">Advertiser Store Details</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-xs font-semibold text-slate-800">
                <p><span className="font-bold text-slate-500">Store Name:</span> {selectedCampaign.store_name}</p>
                <p><span className="font-bold text-slate-500">Store ID:</span> {selectedCampaign.store_id}</p>
                <p><span className="font-bold text-slate-500">Owner Name:</span> {selectedCampaign.owner_name || 'N/A'}</p>
                <p><span className="font-bold text-slate-500">Owner Email:</span> {selectedCampaign.owner_email || 'N/A'}</p>
                <p><span className="font-bold text-slate-500">Ads Balance:</span> <span className="font-black text-emerald-700">{money(selectedCampaign.account_balance || '0')}</span></p>
                <p><span className="font-bold text-slate-500">Account Status:</span> <span className="uppercase font-black text-slate-900">{selectedCampaign.account_status || 'active'}</span></p>
                {selectedCampaign.subdomain && (
                  <p className="sm:col-span-2">
                    <span className="font-bold text-slate-500">Storefront URL:</span>{' '}
                    <a href={`/store/${selectedCampaign.subdomain}`} target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold inline-flex items-center gap-1">
                      /store/{selectedCampaign.subdomain} <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Section 2: Campaign Specifications & Budget */}
            <div className="space-y-3">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Campaign Specs & Budget</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 border">
                  <p className="text-[10px] font-black uppercase text-slate-400">Format</p>
                  <p className="mt-1 font-bold text-slate-900 capitalize">{selectedCampaign.campaign_type.replaceAll('_', ' ')}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border">
                  <p className="text-[10px] font-black uppercase text-slate-400">Pricing Model</p>
                  <p className="mt-1 font-bold text-slate-900 uppercase">{selectedCampaign.pricing_model || 'cpc'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border">
                  <p className="text-[10px] font-black uppercase text-slate-400">Daily Budget</p>
                  <p className="mt-1 font-bold text-slate-900">{money(selectedCampaign.daily_budget || '0')}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border">
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Budget</p>
                  <p className="mt-1 font-bold text-slate-900">{money(selectedCampaign.total_budget || '0')}</p>
                </div>
              </div>
            </div>

            {/* Section 3: Creative Artwork & Headline */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Creative Artwork & Copy</h3>
              {selectedCampaign.creatives?.[0] ? (
                <div className="flex flex-col sm:flex-row items-start gap-4 bg-white p-4 rounded-xl border border-slate-200">
                  {selectedCampaign.creatives[0].image_url ? (
                    <img src={selectedCampaign.creatives[0].image_url} alt="Creative preview" className="h-24 w-24 shrink-0 rounded-xl object-cover border" />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Megaphone className="h-8 w-8" />
                    </div>
                  )}
                  <div className="space-y-1.5 text-xs text-slate-800">
                    <p className="text-base font-black text-slate-900">{selectedCampaign.creatives[0].title}</p>
                    {selectedCampaign.creatives[0].description && <p className="text-slate-600 font-medium">{selectedCampaign.creatives[0].description}</p>}
                    {selectedCampaign.creatives[0].cta_label && <span className="inline-block mt-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white">{selectedCampaign.creatives[0].cta_label}</span>}
                    {selectedCampaign.creatives[0].destination_url && <p className="mt-1 font-mono text-[11px] text-blue-600 truncate">URL: {selectedCampaign.creatives[0].destination_url}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-3">No creative object attached.</p>
              )}
            </div>

            {/* Moderation Actions Footer */}
            {selectedCampaign.status === 'pending_review' && (
              <div className="space-y-3 border-t pt-4">
                <label className="block text-xs font-black uppercase text-slate-500">
                  Rejection Reason (required only if rejecting)
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Prohibited terms or misleading creative title..."
                    className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-xs font-semibold text-slate-900 normal-case focus:border-red-500 focus:outline-none"
                  />
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => review(selectedCampaign.id, 'approved')}
                    className="flex-1 rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white hover:bg-emerald-700 transition cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    Approve & Launch Campaign
                  </button>
                  <button
                    type="button"
                    onClick={() => review(selectedCampaign.id, 'rejected', rejectReason)}
                    className="flex-1 rounded-xl bg-red-600 py-3.5 text-sm font-black text-white hover:bg-red-700 transition cursor-pointer shadow-lg shadow-red-600/20"
                  >
                    Reject Campaign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
