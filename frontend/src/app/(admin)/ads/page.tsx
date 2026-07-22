'use client';

import { fetchWithCsrf } from '@/lib/api';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Globe,
  Loader2,
  Lock,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Tag,
  Trash2,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdsPlatformChart } from '../../../components/admin/AdsPlatformChart';

type Summary = { campaigns: number; pending_review: number; active: number; total_spend: string };
type Campaign = {
  id: string; name: string; campaign_type: string; status: string; total_budget: string; spent_amount: string; bid_amount: string; store_id: string;
  store_name: string; owner_name?: string; owner_email?: string; account_balance?: string; account_reserved_balance?: string; account_status?: string;
  created_at: string; starts_at?: string; ends_at?: string; rejection_reason?: string;
  creatives?: Array<{ id: string; title: string; description?: string; image_url?: string; cta_label?: string; destination_url?: string }>;
  placement_names?: string[];
};
type Account = { id: string; store_id: string; store_name: string; balance: string; reserved_balance: string; status: string; campaign_count: number; total_spend: string };
type DailyStat = { stat_date: string; impressions: number; clicks: number; conversions: number; spend: string; revenue: string };
type Review = { id: string; campaign_name: string; store_name: string; reviewer_email?: string; decision: string; reason?: string; created_at: string };
type Transaction = { id: string; store_name: string; campaign_name?: string; type: string; amount: string; balance_after: string; created_at: string; refunded?: boolean; description?: string };
type Placement = { id: string; name: string; placement_key: string; format: string; default_price: string; default_pricing_model: string; enabled: boolean };
type Coupon = { id: string; code: string; amount: string; max_redemptions: number; redemption_count: number; enabled: boolean; expires_at?: string };
type BlockedIP = { ip_hash: string; reason?: string; blocked_at: string };

type AdsConfig = {
  ads_enabled: boolean;
  ads_moderation_required: boolean;
  ads_min_refill_tnd: number;
  ads_max_refill_tnd: number;
  ads_min_daily_budget_tnd: number;
  ads_max_campaign_days: number;
  ads_frequency_cap_daily: number;
  ads_click_attribution_days: number;
  ads_view_attribution_days: number;
  ads_sponsored_products_enabled: boolean;
  ads_sponsored_brands_enabled: boolean;
  ads_sponsored_content_enabled: boolean;
  ads_prohibited_terms: string;
  ads_creative_image_required: boolean;
  ads_max_creative_description_length: number;
};

const money = (v?: string | number) => `${Number(v || 0).toFixed(3)} TND`;

export default function AdminAdsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'moderation' | 'advertisers' | 'transactions' | 'placements' | 'coupons' | 'fraud' | 'configuration'>('overview');

  const [summary, setSummary] = useState<Summary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null);

  // Date Range & Granularity Controls for Platform Overview
  const [adminFrom, setAdminFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [adminTo, setAdminTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [adminGranularity, setAdminGranularity] = useState<'hourly' | 'daily' | 'monthly'>('daily');

  // Moderation Controls
  const [modSearch, setModSearch] = useState('');
  const [modStatusFilter, setModStatusFilter] = useState('all');
  const [selectedModCampaigns, setSelectedModCampaigns] = useState<string[]>([]);

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ from: adminFrom, to: adminTo, granularity: adminGranularity });
      const [ar, cr, tr, pr, cpr, br] = await Promise.all([
        fetchWithCsrf(`/api/pd/admin/ads?${q}`, { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/config', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/transactions', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/placements', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/coupons', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ads/fraud/blocked-ips', { credentials: 'include' }),
      ]);
      const [ad, cd, td, pd, cpd, bd] = await Promise.all([
        ar.json(), cr.json(), tr.json(), pr.json(), cpr.json(), br.json(),
      ]);

      if (!ar.ok || !cr.ok || !tr.ok || !pr.ok) {
        throw new Error(ad.error?.message || cd.error?.message || 'Failed to load Ads overview');
      }

      setSummary(ad.summary);
      setCampaigns(ad.campaigns || []);
      setAccounts(ad.accounts || []);
      setDaily(ad.daily || []);
      setReviews(ad.reviews || []);
      setAdsConfig(cd.config || null);
      setTransactions(td.transactions || []);
      setPlacements(pd.placements || []);
      setCoupons(cpd.coupons || []);
      setBlockedIPs(bd.blocked_ips || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Ads data');
    } finally {
      setLoading(false);
    }
  }, [adminFrom, adminTo, adminGranularity]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPresetRange = (preset: 'today' | '7d' | '30d' | '90d') => {
    const today = new Date().toISOString().slice(0, 10);
    if (preset === 'today') {
      setAdminFrom(today);
      setAdminTo(today);
      setAdminGranularity('hourly');
    } else if (preset === '7d') {
      setAdminFrom(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
      setAdminTo(today);
      setAdminGranularity('daily');
    } else if (preset === '30d') {
      setAdminFrom(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
      setAdminTo(today);
      setAdminGranularity('daily');
    } else if (preset === '90d') {
      setAdminFrom(new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
      setAdminTo(today);
      setAdminGranularity('daily');
    }
  };

  const review = async (id: string, decision: 'approved' | 'rejected', reason?: string) => {
    setError(''); setSuccessMsg('');
    const r = await fetchWithCsrf(`/api/pd/admin/ads/campaigns/${id}/review`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Review failed');
      return;
    }
    setSuccessMsg(`Campaign successfully ${decision}!`);
    setSelectedCampaign(null); setRejectReason('');
    await load();
  };

  const bulkReview = async (decision: 'approved' | 'rejected') => {
    if (!selectedModCampaigns.length) return;
    const reason = decision === 'rejected' ? window.prompt('Reason for bulk rejecting selected campaigns:') : undefined;
    if (decision === 'rejected' && !reason) return;

    setError(''); setSuccessMsg('');
    try {
      await Promise.all(selectedModCampaigns.map((id) => review(id, decision, reason || undefined)));
      setSelectedModCampaigns([]);
      setSuccessMsg(`Bulk ${decision} completed for ${selectedModCampaigns.length} campaigns.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk review failed');
    }
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

  const adjust = async (account: Account) => {
    const raw = window.prompt(`Adjustment amount for ${account.store_name} (e.g. 50 or -20):`);
    const amount = Number(raw);
    const reason = window.prompt('Adjustment reason:');
    if (!Number.isFinite(amount) || amount === 0 || !reason) return;
    const r = await fetchWithCsrf('/api/pd/admin/ads/accounts/adjust', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: account.store_id, amount, reason, idempotency_key: `adj-${account.id}-${Date.now()}` }),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Adjustment failed');
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

  const refund = async (tx: Transaction) => {
    const reason = window.prompt(`Refund reason for ${tx.store_name} (${tx.id}):`);
    if (!reason) return;
    const r = await fetchWithCsrf(`/api/pd/admin/ads/transactions/${tx.id}/refund`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Refund failed');
      return;
    }
    await load();
  };

  const updateConfig = async (patch: Partial<AdsConfig>) => {
    setError(''); setSuccessMsg('');
    const r = await fetchWithCsrf('/api/pd/admin/ads/config', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Config update failed');
      return;
    }
    const d = await r.json();
    setAdsConfig(d.config);
    setSuccessMsg('Ads configuration updated successfully!');
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

  const blockIP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ip_hash = String(fd.get('ip_hash') || '').trim();
    const reason = String(fd.get('reason') || '').trim();
    if (!ip_hash) return;
    const r = await fetchWithCsrf('/api/pd/admin/ads/fraud/blocked-ips', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip_hash, reason }),
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'IP Block failed');
      return;
    }
    (e.target as HTMLFormElement).reset();
    await load();
  };

  const unblockIP = async (ip_hash: string) => {
    const r = await fetchWithCsrf(`/api/pd/admin/ads/fraud/blocked-ips/${encodeURIComponent(ip_hash)}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (!r.ok) {
      const d = await r.json();
      setError(d.error?.message || 'Unblock failed');
      return;
    }
    await load();
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchStatus = modStatusFilter === 'all' || c.status === modStatusFilter;
    const q = modSearch.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.store_name.toLowerCase().includes(q) || (c.owner_email && c.owner_email.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  type TabItem = { id: typeof activeTab; label: string; icon: any; count?: number };
  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'moderation', label: 'Moderation Queue', icon: Megaphone, count: summary?.pending_review },
    { id: 'advertisers', label: 'Advertisers', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: WalletCards },
    { id: 'placements', label: 'Placements', icon: Globe },
    { id: 'coupons', label: 'Promos & Coupons', icon: Tag },
    { id: 'fraud', label: 'Fraud & Safety', icon: ShieldAlert },
    { id: 'configuration', label: 'Configuration', icon: Settings },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-600">Super Admin Command Center</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">PandaMarket Ads Management</h1>
        </div>
        <button type="button" onClick={() => load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-sm">
          <RefreshCw className="h-4 w-4 text-emerald-600" /> Refresh Data
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {successMsg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{successMsg}</div>}

      {/* Navigation Header */}
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
                isActive ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
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
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600 h-8 w-8" /></div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ['Total Campaigns', summary?.campaigns || 0, Megaphone],
                  ['Pending Review', summary?.pending_review || 0, Clock],
                  ['Active Campaigns', summary?.active || 0, CheckCircle2],
                  ['Total Ads Revenue', money(summary?.total_spend || '0'), WalletCards],
                ].map(([l, v, I]) => (
                  <div key={String(l)} className="rounded-2xl border bg-white p-5 shadow-sm">
                    <I className="h-5 w-5 text-emerald-600" />
                    <p className="mt-3 text-xs font-bold uppercase text-gray-400">{String(l)}</p>
                    <p className="text-2xl font-black text-slate-900">{String(v)}</p>
                  </div>
                ))}
              </div>

              {/* Full Width Responsive Chart with Datetime & Granularity Controls */}
              <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-black text-slate-900 text-lg">Platform Ads Performance Analytics</h2>
                    <p className="text-xs text-gray-500">Track platform spend, sales revenue, impressions, and valid clicks.</p>
                  </div>

                  {/* Filter Controls Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Presets */}
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {(['today', '7d', '30d', '90d'] as const).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPresetRange(preset)}
                          className="rounded-lg px-2.5 py-1 text-xs font-bold uppercase hover:bg-white cursor-pointer transition"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* Date Inputs */}
                    <input type="date" value={adminFrom} onChange={(e) => setAdminFrom(e.target.value)} className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-slate-900" />
                    <input type="date" value={adminTo} onChange={(e) => setAdminTo(e.target.value)} className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-slate-900" />

                    {/* Granularity Selector */}
                    <select value={adminGranularity} onChange={(e) => setAdminGranularity(e.target.value as any)} className="rounded-xl border px-3 py-1.5 text-xs font-bold text-slate-900 cursor-pointer">
                      <option value="hourly">Hourly (24h)</option>
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                    </select>

                    <button type="button" onClick={() => load()} className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-black text-white hover:bg-slate-800 transition cursor-pointer">
                      Apply
                    </button>
                  </div>
                </div>

                <div className="w-full">
                  <AdsPlatformChart daily={daily} />
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: MODERATION QUEUE */}
          {activeTab === 'moderation' && (
            <div className="space-y-6">
              <section className="rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="font-black text-slate-900 text-lg">Campaign Moderation Queue</h2>
                      <p className="text-xs text-gray-500">Review creative images, titles, landing URLs, and store compliance.</p>
                    </div>

                    {/* Bulk Actions */}
                    {selectedModCampaigns.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">{selectedModCampaigns.length} selected</span>
                        <button type="button" onClick={() => bulkReview('approved')} className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-700 transition cursor-pointer">
                          Bulk Approve
                        </button>
                        <button type="button" onClick={() => bulkReview('rejected')} className="rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-red-700 transition cursor-pointer">
                          Bulk Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        value={modSearch}
                        onChange={(e) => setModSearch(e.target.value)}
                        placeholder="Search campaign name, store, or seller email..."
                        className="w-full rounded-xl border pl-9 pr-4 py-2 text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <select value={modStatusFilter} onChange={(e) => setModStatusFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer">
                      <option value="all">All Statuses</option>
                      <option value="pending_review">Pending Review</option>
                      <option value="approved">Approved</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused / Suspended</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {filteredCampaigns.map((c) => {
                    const primaryCreative = c.creatives?.[0];
                    const isSelected = selectedModCampaigns.includes(c.id);
                    return (
                      <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-slate-50/70 transition">
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedModCampaigns([...selectedModCampaigns, c.id]);
                              else setSelectedModCampaigns(selectedModCampaigns.filter((id) => id !== c.id));
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 cursor-pointer"
                          />
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
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                                c.status === 'pending_review' ? 'bg-amber-100 text-amber-800' : c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {c.status.replaceAll('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-emerald-700 mt-0.5">
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
                            <Eye className="h-3.5 w-3.5 text-slate-500" /> Inspect
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
                  {filteredCampaigns.length === 0 && <p className="p-8 text-center text-sm font-semibold text-gray-400">No matching campaigns found.</p>}
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

          {/* TAB 4: TRANSACTIONS (Fixed Actions Column) */}
          {activeTab === 'transactions' && (
            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="font-black text-slate-900">Platform Ads transactions ledger</h2>
                <p className="text-xs text-slate-500">Complete audit log of all account refills, campaign charges, refunds, and promo credits.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Advertiser</th>
                      <th className="p-4">Campaign / Item</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Balance after</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="p-4 text-xs font-semibold text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="p-4 font-bold text-slate-900">{t.store_name}</td>
                        <td className="p-4 font-bold text-slate-800 text-xs">{t.campaign_name || '—'}</td>
                        <td className="p-4 font-semibold capitalize text-slate-700 text-xs">{t.type.replaceAll('_', ' ')}</td>
                        <td className={`p-4 font-black ${Number(t.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {Number(t.amount) >= 0 ? '+' : ''}{money(t.amount)}
                        </td>
                        <td className="p-4 font-bold text-slate-900">{money(t.balance_after)}</td>
                        <td className="p-4 flex items-center gap-2">
                          {t.type === 'campaign_debit' && !t.refunded && (
                            <button type="button" onClick={() => refund(t)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-100 transition cursor-pointer">
                              Refund
                            </button>
                          )}
                          {t.refunded && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-500">Refunded</span>}
                          <button type="button" onClick={() => alert(`Transaction Details:\nID: ${t.id}\nStore: ${t.store_name}\nDescription: ${t.description || 'N/A'}`)} className="rounded-lg border bg-white px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                            Inspect
                          </button>
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

          {/* TAB 6: CONFIGURATION (Enhanced Control Center) */}
          {activeTab === 'configuration' && adsConfig && (
            <div className="space-y-6">
              <section className="rounded-2xl border bg-white shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="font-black text-slate-900 text-xl">Ads Platform Configuration Control Center</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage global system rules, daily limits, moderation policies, and attribution windows.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex items-center gap-3 rounded-2xl border p-4 font-bold text-sm text-slate-900 cursor-pointer hover:bg-slate-50 transition">
                    <input type="checkbox" checked={adsConfig.ads_enabled} onChange={(e) => updateConfig({ ads_enabled: e.target.checked })} className="h-5 w-5 rounded text-emerald-600 cursor-pointer" />
                    Enable PandaMarket Ads
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border p-4 font-bold text-sm text-slate-900 cursor-pointer hover:bg-slate-50 transition">
                    <input type="checkbox" checked={adsConfig.ads_moderation_required} onChange={(e) => updateConfig({ ads_moderation_required: e.target.checked })} className="h-5 w-5 rounded text-emerald-600 cursor-pointer" />
                    Require Super Admin Moderation
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border p-4 font-bold text-sm text-slate-900 cursor-pointer hover:bg-slate-50 transition">
                    <input type="checkbox" checked={adsConfig.ads_creative_image_required} onChange={(e) => updateConfig({ ads_creative_image_required: e.target.checked })} className="h-5 w-5 rounded text-emerald-600 cursor-pointer" />
                    Require Image Artwork for Ads
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 text-xs font-bold text-slate-700">
                  <label className="block bg-slate-50 p-4 rounded-2xl border">
                    Minimum Refill Amount (TND)
                    <input type="number" value={adsConfig.ads_min_refill_tnd} onChange={(e) => updateConfig({ ads_min_refill_tnd: Number(e.target.value) })} className="mt-1 w-full rounded-xl border p-2.5 text-sm font-black text-slate-900" />
                  </label>
                  <label className="block bg-slate-50 p-4 rounded-2xl border">
                    Maximum Refill Amount (TND)
                    <input type="number" value={adsConfig.ads_max_refill_tnd} onChange={(e) => updateConfig({ ads_max_refill_tnd: Number(e.target.value) })} className="mt-1 w-full rounded-xl border p-2.5 text-sm font-black text-slate-900" />
                  </label>
                  <label className="block bg-slate-50 p-4 rounded-2xl border">
                    Min Daily Campaign Budget (TND)
                    <input type="number" step="0.1" value={adsConfig.ads_min_daily_budget_tnd} onChange={(e) => updateConfig({ ads_min_daily_budget_tnd: Number(e.target.value) })} className="mt-1 w-full rounded-xl border p-2.5 text-sm font-black text-slate-900" />
                  </label>
                  <label className="block bg-slate-50 p-4 rounded-2xl border">
                    Daily Frequency Cap per Visitor
                    <input type="number" value={adsConfig.ads_frequency_cap_daily} onChange={(e) => updateConfig({ ads_frequency_cap_daily: Number(e.target.value) })} className="mt-1 w-full rounded-xl border p-2.5 text-sm font-black text-slate-900" />
                  </label>
                  <label className="block bg-slate-50 p-4 rounded-2xl border">
                    Click Attribution Window (Days)
                    <input type="number" value={adsConfig.ads_click_attribution_days} onChange={(e) => updateConfig({ ads_click_attribution_days: Number(e.target.value) })} className="mt-1 w-full rounded-xl border p-2.5 text-sm font-black text-slate-900" />
                  </label>
                  <label className="block bg-slate-50 p-4 rounded-2xl border">
                    Impression Attribution Window (Days)
                    <input type="number" value={adsConfig.ads_view_attribution_days} onChange={(e) => updateConfig({ ads_view_attribution_days: Number(e.target.value) })} className="mt-1 w-full rounded-xl border p-2.5 text-sm font-black text-slate-900" />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase text-slate-700">Prohibited Words & Terms Filter</label>
                  <textarea rows={3} value={adsConfig.ads_prohibited_terms || ''} onChange={(e) => updateConfig({ ads_prohibited_terms: e.target.value })} className="w-full rounded-2xl border p-3 text-xs font-semibold text-slate-900" placeholder="Comma-separated list of prohibited advertising terms..." />
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/* Super Admin Full Inspection Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 uppercase">
                  {selectedCampaign.status.replaceAll('_', ' ')}
                </span>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{selectedCampaign.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedCampaign(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs font-bold text-slate-800 bg-slate-50 p-4 rounded-2xl border">
              <p><span className="text-slate-500 font-medium">Store:</span> {selectedCampaign.store_name}</p>
              <p><span className="text-slate-500 font-medium">Owner Email:</span> {selectedCampaign.owner_email || 'N/A'}</p>
              <p><span className="text-slate-500 font-medium">Owner Name:</span> {selectedCampaign.owner_name || 'N/A'}</p>
              <p><span className="text-slate-500 font-medium">Ads Balance:</span> {money(selectedCampaign.account_balance)}</p>
              <p><span className="text-slate-500 font-medium">Total Budget:</span> {money(selectedCampaign.total_budget)}</p>
              <p><span className="text-slate-500 font-medium">Spent:</span> {money(selectedCampaign.spent_amount)}</p>
            </div>

            {selectedCampaign.creatives?.[0] && (
              <div className="space-y-3 rounded-2xl border p-4">
                <h3 className="font-black text-slate-900">Creative Artwork Preview</h3>
                {selectedCampaign.creatives[0].image_url && (
                  <img src={selectedCampaign.creatives[0].image_url} alt="" className="h-48 w-full rounded-xl object-cover border" />
                )}
                <p className="font-black text-slate-900">{selectedCampaign.creatives[0].title}</p>
                <p className="text-xs text-slate-600">{selectedCampaign.creatives[0].description}</p>
              </div>
            )}

            {selectedCampaign.status === 'pending_review' && (
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => review(selectedCampaign.id, 'approved')} className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer">
                  Approve Campaign
                </button>
                <button type="button" onClick={() => review(selectedCampaign.id, 'rejected', rejectReason || 'Creative does not meet marketplace standards')} className="flex-1 rounded-xl bg-red-600 py-3 text-xs font-black text-white hover:bg-red-700 cursor-pointer">
                  Reject Campaign
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
