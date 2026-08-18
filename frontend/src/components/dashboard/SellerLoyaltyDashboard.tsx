'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { Download, Search, Users, Crown, Bell, RefreshCw, Send, CheckCircle2, AlertCircle, Sparkles, ChevronLeft, ChevronRight, UserCheck, Mail, MapPin } from 'lucide-react';
import { BroadcastComposer } from './BroadcastComposer';

export interface LoyaltyKpiData {
  total_subscribers: number;
  new_this_week: number;
  verified_pct: number;
  growth_rate_pct: number;
  broadcasts_remaining_this_week: number;
  trust_score: {
    overall: number;
    rating_component: number;
    sla_component: number;
    subscribers_log_component: number;
    dispute_penalty: number;
  };
}

export interface BroadcastHistoryItem {
  id: string;
  created_at: string;
  sent_at?: string;
  title: string;
  message: string;
  coupon_code: string;
  discount_value: string;
  discount_type?: 'percentage' | 'fixed';
  target_audience?: 'all' | 'verified_only';
  recipients_count: number;
  claims_count: number;
  claim_rate_pct: number;
  generated_gmv_tnd: number;
  status: 'sent' | 'active' | 'expired';
}

export interface SubscriberItem {
  id: string;
  buyer_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  city: string | null;
  is_verified_buyer: boolean;
  notify_price_drops: boolean;
  notify_new_products: boolean;
  created_at: string;
}

export interface LoyaltyDashboardData {
  total_subscribers?: number;
  verified_subscribers?: number;
  kpis: LoyaltyKpiData;
  broadcasts: BroadcastHistoryItem[];
  governorate_distribution: Record<string, number>;
}

export const SellerLoyaltyDashboard: React.FC<{
  initialData?: LoyaltyDashboardData | null;
}> = ({ initialData = null }) => {
  const { t, dir } = useLocale();
  const [data, setData] = useState<LoyaltyDashboardData | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Active Main Tab: 'overview' | 'subscribers' | 'broadcasts'
  const [activeTab, setActiveTab] = useState<'overview' | 'subscribers' | 'broadcasts'>('overview');

  // Subscribers List State
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscribersTotal, setSubscribersTotal] = useState(0);
  const [subscribersPage, setSubscribersPage] = useState(1);
  const [subscribersTotalPages, setSubscribersTotalPages] = useState(1);
  const [subscribersSearch, setSubscribersSearch] = useState('');
  const [subscribersVerifiedFilter, setSubscribersVerifiedFilter] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const [flushing, setFlushing] = useState(false);
  const [flushStatus, setFlushStatus] = useState<string | null>(null);

  const handleFlush = async () => {
    setFlushing(true);
    setFlushStatus(null);
    try {
      const res = await fetchWithCsrf('/api/pd/notifications/flush-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const json = await res.json();
        setFlushStatus(`✓ Alertes envoyées (${json.priceDropCount ?? 0} baisses, ${json.newProductCount ?? 0} nouveautés).`);
        setTimeout(() => setFlushStatus(null), 5000);
      } else {
        setFlushStatus('Erreur de déclenchement.');
      }
    } catch {
      setFlushStatus('Erreur réseau.');
    } finally {
      setFlushing(false);
    }
  };

  const fetchLoyaltyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCsrf('/api/pd/seller/subscribers/analytics');
      if (!res.ok) throw new Error('Impossible de charger les données abonnés.');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = useCallback(async () => {
    setSubscribersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(subscribersPage),
        limit: '10',
      });
      if (subscribersSearch.trim()) params.set('search', subscribersSearch.trim());
      if (subscribersVerifiedFilter) params.set('verified_only', 'true');

      const res = await fetchWithCsrf(`/api/pd/seller/subscribers?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setSubscribers(json.subscribers || []);
        setSubscribersTotal(json.total || 0);
        setSubscribersTotalPages(json.total_pages || 1);
      }
    } catch {
      // Ignore
    } finally {
      setSubscribersLoading(false);
    }
  }, [subscribersPage, subscribersSearch, subscribersVerifiedFilter]);

  useEffect(() => {
    if (!initialData) {
      fetchLoyaltyData();
    }
  }, [initialData]);

  useEffect(() => {
    if (activeTab === 'subscribers') {
      fetchSubscribers();
    }
  }, [activeTab, fetchSubscribers]);

  // Real-time live follower counter listener (3.5)
  useEffect(() => {
    const handleLiveFollowerUpdate = (e: any) => {
      const detail = e.detail || e;
      if (typeof detail?.subscribers_count === 'number') {
        setData((prev) => {
          if (!prev) return prev;
          const total = detail.subscribers_count;
          const verified = typeof detail.verified_subscribers_count === 'number'
            ? detail.verified_subscribers_count
            : prev.verified_subscribers || 0;
          const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;
          return {
            ...prev,
            total_subscribers: total,
            verified_subscribers: verified,
            kpis: {
              ...prev.kpis,
              total_subscribers: total,
              verified_pct: verifiedPct,
            },
          };
        });
      }
    };

    window.addEventListener('store:subscribers_updated' as any, handleLiveFollowerUpdate);
    return () => {
      window.removeEventListener('store:subscribers_updated' as any, handleLiveFollowerUpdate);
    };
  }, []);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await fetchWithCsrf('/api/pd/seller/subscribers/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch {
      // Ignore
    } finally {
      setExportingCsv(false);
    }
  };

  const handleBroadcastSuccess = (newBroadcast: BroadcastHistoryItem, remainingQuota: number) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        kpis: {
          ...prev.kpis,
          broadcasts_remaining_this_week: remainingQuota,
        },
        broadcasts: [newBroadcast, ...prev.broadcasts],
      };
    });
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6" data-testid="loyalty-loading-skeleton">
        <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8" role="alert" data-testid="loyalty-error-state">
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl dark:bg-rose-950/40 dark:text-rose-300">
          <h2 className="font-bold text-base mb-1">Erreur de chargement</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchLoyaltyData}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_subscribers: 0,
    new_this_week: 0,
    verified_pct: 0,
    growth_rate_pct: 0,
    broadcasts_remaining_this_week: 2,
    trust_score: { overall: 4.5, rating_component: 1.8, sla_component: 1.2, subscribers_log_component: 0.6, dispute_penalty: 0.1 },
  };

  const broadcasts = data?.broadcasts || [];
  const governorates = data?.governorate_distribution || {};
  const totalGovSubs = Object.values(governorates).reduce((a, b) => a + b, 0);
  const totalFollowers = data?.total_subscribers ?? kpis.total_subscribers ?? 0;
  const verifiedFollowers = data?.verified_subscribers ?? Math.round((totalFollowers * kpis.verified_pct) / 100);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8" dir={dir} data-testid="seller-loyalty-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>⭐</span> {t('sellerLoyalty.title') || 'Abonnés & Fidélité'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t('sellerLoyalty.subtitle') || 'Suivez votre communauté d\'acheteurs fidèles et envoyez des coupons de réduction privés.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {flushStatus && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              {flushStatus}
            </span>
          )}
          <button
            type="button"
            onClick={handleFlush}
            disabled={flushing}
            data-testid="btn-flush-notifications"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 transition disabled:opacity-50"
            title="Envoyer immédiatement toutes les alertes de baisse de prix ou nouveautés en attente dans le buffer 15min"
          >
            {flushing ? 'Envoi en cours...' : '⚡ Forcer l’envoi des alertes'}
          </button>
          <span
            data-testid="broadcast-quota-badge"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              kpis.broadcasts_remaining_this_week > 0
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            📢 {kpis.broadcasts_remaining_this_week}/2 diffusions restantes
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          📊 Vue d'ensemble & Analyses
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscribers')}
          data-testid="tab-subscribers"
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'subscribers'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Audience & Abonnés ({totalFollowers.toLocaleString()})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('broadcasts')}
          data-testid="tab-broadcasts"
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'broadcasts'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{t('sellerLoyalty.broadcastTab') || 'Diffusions'} ({kpis.broadcasts_remaining_this_week}/2)</span>
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* 4 KPI CARDS */}
          <section data-testid="loyalty-kpis-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-testid="kpi-total-subscribers">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('sellerLoyalty.totalSubscribers') || 'Total Abonnés'}</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                {totalFollowers.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600 mt-1 font-medium">Audience directe</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-testid="kpi-new-this-week">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('sellerLoyalty.newThisWeek') || 'Nouveaux cette semaine'}</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                +{kpis.new_this_week.toLocaleString()}
              </div>
              <div className="text-xs text-blue-600 mt-1 font-medium">Acquisition 7 jours</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-testid="kpi-verified-buyers">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('sellerLoyalty.verifiedBuyers') || 'Acheteurs Vérifiés'}</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                {kpis.verified_pct}%
              </div>
              <div className="text-xs text-emerald-600 mt-1 font-medium">Au moins 1 commande validée</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-testid="kpi-growth-rate">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('sellerLoyalty.growthRate') || 'Taux de Croissance'}</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                +{kpis.growth_rate_pct}%
              </div>
              <div className="text-xs text-purple-600 mt-1 font-medium">Mensuel consolidé</div>
            </div>
          </section>

          {/* Trust Score Formula Card */}
          <section className="p-5 rounded-2xl bg-gradient-to-r from-zinc-50 to-emerald-50/30 dark:from-zinc-900 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-800" data-testid="seller-trust-score-card">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>🛡️</span> {t('sellerLoyalty.trustScore') || 'Score de Confiance Vendeur'}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                    {kpis.trust_score.overall.toFixed(2)} / 5.00
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Calculé via la formule logarithmique officielle: 0.40·Avis + 0.30·SLA + 0.20·log₁₀(Abonnés Vérifiés+1) - 0.10·Litiges.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
                <span title="Note client">⭐ Avis: {kpis.trust_score.rating_component.toFixed(2)}</span>
                <span title="SLA Expédition">📦 SLA: {kpis.trust_score.sla_component.toFixed(2)}</span>
                <span title="Bonus abonnés vérifiés">👥 Abonnés: +{kpis.trust_score.subscribers_log_component.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* Main Row: Broadcast Composer + Governorates Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <BroadcastComposer
              totalSubscribers={totalFollowers}
              verifiedSubscribers={verifiedFollowers}
              remainingQuota={kpis.broadcasts_remaining_this_week}
              onSuccess={handleBroadcastSuccess}
            />

            {/* 24 Governorates Distribution */}
            <section className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4" data-testid="governorates-distribution-section">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>🇹🇳</span> {t('sellerLoyalty.governoratesDistribution') || 'Répartition par Gouvernorat'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Origine géographique de votre audience dans les 24 gouvernorats tunisiens.
              </p>

              {Object.keys(governorates).length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400" data-testid="empty-governorate-data">
                  Aucune donnée géographique pour le moment.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2 scrollbar-thin" data-testid="governorates-list">
                  {Object.entries(governorates).map(([gov, count]) => {
                    const pct = totalGovSubs > 0 ? ((count / totalGovSubs) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={gov} data-testid={`gov-row-${gov}`} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          <span>{gov}</span>
                          <span>
                            {count} abonnés ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* SUBSCRIBERS AUDIENCE TAB (2.5) */}
      {activeTab === 'subscribers' && (
        <section className="space-y-6" data-testid="section-subscribers-list">
          {/* Controls Bar: Search, Verified Filter & Export CSV */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={t('sellerLoyalty.searchPlaceholder') || 'Rechercher par nom, email ou ville...'}
                  value={subscribersSearch}
                  onChange={(e) => {
                    setSubscribersSearch(e.target.value);
                    setSubscribersPage(1);
                  }}
                  className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscribersVerifiedFilter}
                  onChange={(e) => {
                    setSubscribersVerifiedFilter(e.target.checked);
                    setSubscribersPage(1);
                  }}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('sellerLoyalty.verifiedOnly') || 'Acheteurs vérifiés uniquement'}</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchSubscribers()}
                disabled={subscribersLoading}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                title="Actualiser la liste"
              >
                <RefreshCw className={`w-4 h-4 ${subscribersLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exportingCsv}
                data-testid="btn-export-subscribers-csv"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exportingCsv ? 'Exportation...' : (t('sellerLoyalty.exportCsv') || 'Exporter CSV')}</span>
              </button>
            </div>
          </div>

          {/* Subscribers Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            {subscribersLoading ? (
              <div className="p-12 text-center text-xs text-zinc-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <p>Chargement de votre audience...</p>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500">
                <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Aucun abonné trouvé</p>
                <p className="mt-1 text-zinc-400">Modifiez vos critères de recherche ou partagez votre boutique.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse" data-testid="subscribers-table">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-800/30">
                      <th className="py-3.5 px-4">Client / Abonné</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Localisation</th>
                      <th className="py-3.5 px-4">Statut Acheteur</th>
                      <th className="py-3.5 px-4">Préférences</th>
                      <th className="py-3.5 px-4">Date d'abonnement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {subscribers.map((sub) => {
                      const fullName = [sub.first_name, sub.last_name].filter(Boolean).join(' ') || 'Client Anonyme';
                      return (
                        <tr key={sub.id} data-testid={`subscriber-row-${sub.id}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                          <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xs font-black uppercase">
                              {fullName.charAt(0)}
                            </div>
                            <span>{fullName}</span>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">{sub.email}</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                              <MapPin className="w-3 h-3 text-zinc-400" />
                              {sub.city || 'Tunisie'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {sub.is_verified_buyer ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Crown className="w-3 h-3 text-amber-500" />
                                Acheteur Vérifié (VIP)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                Prospect
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {sub.notify_price_drops && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] font-bold" title="Alertes baisses de prix">
                                  Baisses
                                </span>
                              )}
                              {sub.notify_new_products && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 text-[10px] font-bold" title="Alertes nouveautés">
                                  Nouveautés
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap">
                            {new Date(sub.created_at).toLocaleDateString('fr-TN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {subscribersTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <span className="text-xs text-zinc-500">
                  Page {subscribersPage} sur {subscribersTotalPages} ({subscribersTotal} abonnés)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubscribersPage((p) => Math.max(1, p - 1))}
                    disabled={subscribersPage <= 1}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-white dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscribersPage((p) => Math.min(subscribersTotalPages, p + 1))}
                    disabled={subscribersPage >= subscribersTotalPages}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-white dark:hover:bg-zinc-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* BROADCASTS TAB */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-8">
          <BroadcastComposer
            totalSubscribers={totalFollowers}
            verifiedSubscribers={verifiedFollowers}
            remainingQuota={kpis.broadcasts_remaining_this_week}
            onSuccess={handleBroadcastSuccess}
          />

          {/* Broadcast History Table */}
          <section className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4" data-testid="broadcast-history-section">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>📜</span> {t('sellerLoyalty.historyTab') || 'Historique des Diffusions'}
            </h2>

            {broadcasts.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500" data-testid="empty-broadcast-history">
                Aucune diffusion envoyée jusqu'à présent.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse" data-testid="broadcast-history-table">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Objet</th>
                      <th className="py-3 px-3">Coupon</th>
                      <th className="py-3 px-3">Cible / Destinataires</th>
                      <th className="py-3 px-3">Taux de conversion</th>
                      <th className="py-3 px-3">GMV Généré</th>
                      <th className="py-3 px-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {broadcasts.map((b) => (
                      <tr key={b.id} data-testid={`broadcast-row-${b.id}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 px-3 text-zinc-500 whitespace-nowrap">
                          {new Date(b.created_at).toLocaleDateString('fr-TN')}
                        </td>
                        <td className="py-3 px-3 font-semibold">{b.title}</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {b.coupon_code} ({b.discount_value})
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {b.target_audience === 'verified_only' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                            <span>{b.recipients_count.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">{b.claim_rate_pct}% ({b.claims_count} ventes)</td>
                        <td className="py-3 px-3 font-bold">{b.generated_gmv_tnd.toFixed(3)} TND</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
