'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  BarChart3,
  TrendingUp,
  CreditCard,
  ShoppingCart,
  Users,
  Percent,
  Download,
  RotateCcw,
  BookOpen,
  Eye,
  AlertTriangle,
  MapPin,
  Building2,
  Calendar,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';
import {
  AnalyticsTimeRange,
  AnalyticsCurrency,
  AnalyticsTabID,
  PlatformOverviewAnalytics,
  PlatformRevenueAnalytics,
  PlatformVendorAnalytics,
  PlatformAdsAnalytics,
  PlatformSystemAnalytics,
  PlatformBusinessAnalytics,
  PlatformPageViewsAnalytics,
  DrilldownType,
} from '@/types/analytics';
import { fetchGeoHeatmapData } from '@/lib/admin-platform-analytics';
import { OverviewAnalyticsTab } from '@/components/admin/platform-analytics/OverviewAnalyticsTab';
import { FinancialsAnalyticsTab } from '@/components/admin/platform-analytics/FinancialsAnalyticsTab';
import { VendorsAnalyticsTab } from '@/components/admin/platform-analytics/VendorsAnalyticsTab';
import { AdsAnalyticsTab } from '@/components/admin/platform-analytics/AdsAnalyticsTab';
import { SystemAnalyticsTab } from '@/components/admin/platform-analytics/SystemAnalyticsTab';
import { BusinessAnalyticsTab } from '@/components/admin/platform-analytics/BusinessAnalyticsTab';
import { PageViewsAnalyticsTab } from '@/components/admin/platform-analytics/PageViewsAnalyticsTab';
import { IntelligenceTab } from '@/components/admin/platform-analytics/IntelligenceTab';
import { GovernanceTab } from '@/components/admin/platform-analytics/GovernanceTab';
import { MetricDefinitionsModal } from '@/components/admin/platform-analytics/MetricDefinitionsModal';
import { AnalyticsDrilldownModal } from '@/components/admin/platform-analytics/AnalyticsDrilldownModal';
import { AnalyticsHelpPanel } from '@/components/admin/platform-analytics/AnalyticsHelpPanel';
import { ALL_24_GOVERNORATES, GovernorateData } from '@/components/admin/platform-analytics/TunisiaChoroplethMap';

export interface AdminReGoAnalyticsProps {
  timeRange: AnalyticsTimeRange;
  onTimeRangeChange: (range: AnalyticsTimeRange) => void;
  currency: AnalyticsCurrency;
  onCurrencyChange: (currency: AnalyticsCurrency) => void;
  activeTab: AnalyticsTabID;
  onTabChange: (tab: AnalyticsTabID) => void;
  overviewData: PlatformOverviewAnalytics | null;
  revenueData: PlatformRevenueAnalytics | null;
  vendorData: PlatformVendorAnalytics | null;
  adsData: PlatformAdsAnalytics | null;
  systemData: PlatformSystemAnalytics | null;
  businessData: PlatformBusinessAnalytics | null;
  pageViewsData: PlatformPageViewsAnalytics | null;
  pageViewsLiveData: any;
  tabLoading: Record<AnalyticsTabID, boolean>;
  tabError: Record<AnalyticsTabID, string>;
  onRefresh: () => void;
  onExport: () => Promise<void>;
  onOpenDrilldown: (type: DrilldownType) => void;
  onOpenDefinitions: () => void;
  onOpenHelp: () => void;
  isDefinitionsOpen: boolean;
  onCloseDefinitions: () => void;
  isDrilldownOpen: boolean;
  onCloseDrilldown: () => void;
  drilldownType: DrilldownType;
  isHelpOpen: boolean;
  onCloseHelp: () => void;
}

export function AdminReGoAnalytics({
  timeRange,
  onTimeRangeChange,
  currency,
  onCurrencyChange,
  activeTab,
  onTabChange,
  overviewData,
  revenueData,
  vendorData,
  adsData,
  systemData,
  businessData,
  pageViewsData,
  pageViewsLiveData,
  tabLoading,
  tabError,
  onRefresh,
  onExport,
  onOpenDrilldown,
  onOpenDefinitions,
  onOpenHelp,
  isDefinitionsOpen,
  onCloseDefinitions,
  isDrilldownOpen,
  onCloseDrilldown,
  drilldownType,
  isHelpOpen,
  onCloseHelp,
}: AdminReGoAnalyticsProps) {
  const [selectedGov, setSelectedGov] = useState<GovernorateData | null>(null);
  const [govSearch, setGovSearch] = useState('');
  // Live regional telemetry fetched from the API (no fabricated seed numbers)
  const [liveGovernorates, setLiveGovernorates] = useState<GovernorateData[] | null>(null);
  const [govDataLoading, setGovDataLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadGeo = async () => {
      setGovDataLoading(true);
      try {
        const res = await fetchGeoHeatmapData({ currency: currency as any });
        if (isMounted && res && res.governorates && res.governorates.length > 0) {
          const merged = ALL_24_GOVERNORATES.map((base) => {
            const remote = res.governorates.find((g: any) => {
              const code = String(g.code || g.governorate_code || '').toUpperCase();
              const iso = String(g.iso_code || '').toUpperCase();
              const name = String(g.name || g.governorate_name || '').toLowerCase();
              return (
                code === base.code ||
                iso === (base.iso_code || '') ||
                name === base.name.toLowerCase() ||
                name === base.name_ar
              );
            });
            return {
              ...base,
              orders_count: remote?.orders_count ?? remote?.orders ?? 0,
              gmv_tnd: remote?.revenue_tnd ?? remote?.gmv_tnd ?? 0,
              active_visitors: remote?.buyers_count ?? remote?.active_visitors ?? 0,
            };
          });
          setLiveGovernorates(merged);
        } else if (isMounted) {
          // No remote data: show governorates without fabricated metrics
          setLiveGovernorates(ALL_24_GOVERNORATES.map((g) => ({ ...g, orders_count: 0, gmv_tnd: 0, active_visitors: 0 })));
        }
      } catch {
        if (isMounted) {
          setLiveGovernorates(ALL_24_GOVERNORATES.map((g) => ({ ...g, orders_count: 0, gmv_tnd: 0, active_visitors: 0 })));
        }
      } finally {
        if (isMounted) setGovDataLoading(false);
      }
    };
    void loadGeo();
    return () => {
      isMounted = false;
    };
  }, [currency]);

  const tabs: Array<{ id: AnalyticsTabID; label: string; icon: any }> = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'financials', label: 'Ventes & Finances', icon: CreditCard },
    { id: 'vendors', label: 'Vendeurs & Boutiques', icon: Users },
    { id: 'ads', label: 'Campagnes & Ads', icon: TrendingUp },
    { id: 'page_views', label: 'Trafic & Audience', icon: Eye },
    { id: 'business', label: 'Activité Business', icon: ShoppingCart },
    { id: 'intelligence', label: 'IA & Prédictions', icon: Sparkles },
    { id: 'governance', label: 'Gouvernance & Risques', icon: Building2 },
    { id: 'system', label: 'Santé & Infrastructure', icon: LineChart },
  ];

  const timeRanges: Array<{ id: AnalyticsTimeRange; label: string }> = [
    { id: '7d', label: '7 jours' },
    { id: '30d', label: '30 jours' },
    { id: '90d', label: '90 jours' },
    { id: '12m', label: '12 mois' },
    { id: 'all', label: 'Tout' },
  ];

  // Derive KPIs strictly from real overviewData — never fabricate fallbacks
  const totalGmv = Number(overviewData?.financials?.total_gmv ?? 0);
  const platformNet = overviewData?.financials?.net_revenue != null ? Number(overviewData.financials.net_revenue) : null;
  const totalOrders = Number(overviewData?.financials?.total_orders ?? 0);
  const averageOrderValue = totalOrders > 0 ? totalGmv / totalOrders : 0;
  const totalUsers = Number(overviewData?.users?.total_users ?? 0);
  const conversionRate = totalOrders > 0 && totalUsers > 0 ? (totalOrders / totalUsers) * 100 : null;

  // Filter governorates list
  const governorates = liveGovernorates || [];
  const filteredGovernorates = governorates.filter((gov) => {
    if (!govSearch) return true;
    const q = govSearch.toLowerCase();
    return (
      gov.name.toLowerCase().includes(q) ||
      gov.name_ar.includes(q) ||
      gov.code.toLowerCase().includes(q)
    );
  });

  const activeAlert = overviewData?.threshold_alerts?.[0];
  const isLoading = tabLoading[activeTab];
  const currentError = tabError[activeTab];

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Administration', href: '/dashboard' },
        { label: 'Pilotage & Télémétrie', href: '/dashboard' },
        { label: 'Statistiques Globales' },
      ]}
      headerTitle="Analytique & Performances Globales"
      headerSubtitle="Supervision macro-économique des transactions, des commissions de la plateforme, du panier moyen national et du volume d'affaires sur l'ensemble des 24 gouvernorats."
      headerIcon={LineChart}
      statusBadge={
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
            Télémétrie {currency}
          </span>
        </div>
      }
      secondaryAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDefinitions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Définitions</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--rego-accent,#ad0505)]' : 'text-slate-500 dark:text-slate-400'}`} />
            <span>Actualiser</span>
          </button>
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={() => void onExport()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-95 shadow-sm transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exporter CSV</span>
        </button>
      }
      alertBanner={
        activeAlert ? (
          <div className="p-4 rounded-[var(--rego-r,8px)] border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong className="font-bold">{activeAlert.title}:</strong> {activeAlert.message}
              </span>
            </div>
            <ReGoStatusChip status="warn" label="Alerte Seuil" />
          </div>
        ) : undefined
      }
      kpiStrip={
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <ReGoKpiHero
            label="Volume d'Affaires (GMV)"
            value={<ReGoAmtBox amount={totalGmv} size="md" />}
            hint="Période sélectionnée"
            icon={TrendingUp}
          />
          <ReGoKpiHero
            label="Commissions Perçues"
            value={platformNet !== null ? <ReGoAmtBox amount={platformNet} size="md" /> : '—'}
            hint="Revenu net plateforme"
            icon={CreditCard}
          />
          <ReGoKpiHero
            label="Commandes Traitées"
            value={totalOrders.toLocaleString('fr-TN')}
            hint="Volume d'achats national"
            icon={ShoppingCart}
          />
          <ReGoKpiHero
            label="Panier Moyen (AOV)"
            value={<ReGoAmtBox amount={averageOrderValue} size="md" />}
            hint="Valeur par commande"
            icon={DollarSign}
          />
          <ReGoKpiHero
            label="Taux de Conversion"
            value={conversionRate !== null ? `${conversionRate.toFixed(2)}%` : '—'}
            hint="Commandes / Utilisateurs"
            icon={Percent}
          />
          <ReGoKpiHero
            label="Utilisateurs Inscrits"
            value={totalUsers.toLocaleString('fr-TN')}
            hint="Comptes plateforme actifs"
            icon={Users}
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-col gap-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Period Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)] mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Période:
              </span>
              {timeRanges.map((range) => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => onTimeRangeChange(range.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-[var(--rego-r,8px)] transition-all ${
                    timeRange === range.id
                      ? 'bg-[var(--rego-fg,#111111)] text-white shadow-xs'
                      : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Currency selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">Devise:</span>
              {(['TND', 'USD', 'EUR'] as AnalyticsCurrency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCurrencyChange(c)}
                  className={`px-2.5 py-1 text-xs font-black rounded-[var(--rego-r,8px)] transition-all ${
                    currency === c
                      ? 'bg-[var(--rego-accent,#ad0505)] text-white'
                      : 'border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)] hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--rego-border,#dedede)] pt-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] transition-all ${
                    isActive
                      ? 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)] border border-[var(--rego-border,#dedede)] shadow-xs'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      }
      mainContent={
        <div className="space-y-6">
          {/* Currency Notice */}
          {currency !== 'TND' && (
            <div className="p-3 rounded-[var(--rego-r,8px)] border border-indigo-200 bg-indigo-50 text-indigo-900 text-xs flex items-center justify-between">
              <span>
                Devise d&apos;affichage sélectionnée: <strong>{currency}</strong> (Données transactées converties selon le taux officiel BCT).
              </span>
              <span className="text-[10px] font-bold uppercase bg-indigo-200/60 px-2 py-0.5 rounded text-indigo-800">
                Devise Pivot BCT
              </span>
            </div>
          )}

          {/* Error Notification */}
          {currentError && (
            <div className="p-4 rounded-[var(--rego-r,8px)] border border-red-200 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold flex items-center justify-between">
              <span>{currentError}</span>
              <button
                type="button"
                onClick={onRefresh}
                className="underline text-red-800 hover:text-red-900"
              >
                Réessayer
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-3">
              <RotateCcw className="w-6 h-6 animate-spin text-[var(--rego-accent,#ad0505)]" />
              <p className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">
                Chargement de la télémétrie {activeTab}...
              </p>
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Embedded Standard Overview Tab */}
              <OverviewAnalyticsTab
                data={overviewData}
                currency={currency}
                onNavigateToTab={onTabChange}
              />

              {/* ReGo Regional Breakdown Table (24 Tunisian Governorates) */}
              <ReGoCard
                title="Répartition Nationale par Gouvernorat (24 Gouvernorats Tunisiens)"
                subtitle="Performance logistique et distribution du chiffre d'affaires selon les 24 gouvernorats officiels."
                badge={
                  govDataLoading ? (
                    <ReGoStatusChip status="warn" label="Chargement" size="xs" />
                  ) : liveGovernorates === null ? (
                    <ReGoStatusChip status="neutral" label="Indisponible" size="xs" />
                  ) : undefined
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative max-w-xs w-full">
                      <input
                        type="text"
                        placeholder="Filtrer par gouvernorat..."
                        value={govSearch}
                        onChange={(e) => setGovSearch(e.target.value)}
                        className="w-full ps-3 pe-8 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)]"
                      />
                    </div>
                    <span className="text-xs font-medium text-[var(--rego-ink-2,#737373)]">
                      {filteredGovernorates.length} gouvernorats affichés
                    </span>
                  </div>

                  {govDataLoading ? (
                    <div className="space-y-2">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-10 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] animate-pulse" />
                      ))}
                    </div>
                  ) : (
                  <div className="overflow-x-auto rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] uppercase text-[10px] font-bold border-b border-[var(--rego-border,#dedede)]">
                        <tr>
                          <th className="px-4 py-2.5">Gouvernorat</th>
                          <th className="px-4 py-2.5">Zone</th>
                          <th className="px-4 py-2.5 text-end">Commandes</th>
                          <th className="px-4 py-2.5 text-end">Volume GMV ({currency})</th>
                          <th className="px-4 py-2.5 text-end">Acheteurs Actifs</th>
                          <th className="px-4 py-2.5 text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)]">
                        {filteredGovernorates.map((gov) => (
                          <tr
                            key={gov.code}
                            onClick={() => setSelectedGov(gov)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 font-bold flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                              <span>{gov.name}</span>
                              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 font-arabic">({gov.name_ar})</span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-[var(--rego-ink-2,#737373)] capitalize">
                              {gov.zone.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-3 text-end font-semibold">
                              {gov.orders_count > 0 ? gov.orders_count.toLocaleString('fr-TN') : '—'}
                            </td>
                            <td className="px-4 py-3 text-end font-black">
                              {gov.gmv_tnd > 0 ? <ReGoAmtBox amount={gov.gmv_tnd} size="sm" /> : <span className="text-[var(--rego-ink-3,#949494)]">—</span>}
                            </td>
                            <td className="px-4 py-3 text-end text-[var(--rego-ink-2,#737373)] font-medium">
                              {gov.active_visitors > 0 ? gov.active_visitors.toLocaleString('fr-TN') : '—'}
                            </td>
                            <td className="px-4 py-3 text-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGov(gov);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                              >
                                Inspecter
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              </ReGoCard>
            </div>
          ) : activeTab === 'financials' ? (
            <FinancialsAnalyticsTab data={revenueData} currency={currency} />
          ) : activeTab === 'vendors' ? (
            <VendorsAnalyticsTab data={vendorData} currency={currency} />
          ) : activeTab === 'ads' ? (
            <AdsAnalyticsTab data={adsData} />
          ) : activeTab === 'page_views' ? (
            <PageViewsAnalyticsTab
              data={pageViewsData}
              liveData={pageViewsLiveData}
              onOpenDrilldown={onOpenDrilldown}
            />
          ) : activeTab === 'business' ? (
            <BusinessAnalyticsTab data={businessData} currency={currency} />
          ) : activeTab === 'intelligence' ? (
            <IntelligenceTab currency={currency} />
          ) : activeTab === 'governance' ? (
            <GovernanceTab />
          ) : activeTab === 'system' ? (
            <SystemAnalyticsTab data={systemData} />
          ) : null}
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={Boolean(selectedGov)}
          onClose={() => setSelectedGov(null)}
          title={`Gouvernorat: ${selectedGov?.name || ''} (${selectedGov?.name_ar || ''})`}
          subtitle={`Télémétrie régionale détaillée pour ${selectedGov?.name} (${selectedGov?.code})`}
        >
          {selectedGov && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                  <span className="text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">Code ISO</span>
                  <p className="text-sm font-black mt-1">{selectedGov.iso_code || selectedGov.code}</p>
                </div>
                <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                  <span className="text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">Zone Géographique</span>
                  <p className="text-sm font-black mt-1 capitalize">{selectedGov.zone.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                  Indicateurs Opérationnels Régionaux
                </h4>
                <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] divide-y divide-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs">
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Commandes Totales</span>
                    <span className="font-bold">{selectedGov.orders_count > 0 ? selectedGov.orders_count.toLocaleString('fr-TN') : '—'}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Chiffre d&apos;Affaires Réalisé</span>
                    <span className="font-black text-[var(--rego-accent,#ad0505)]">
                      {selectedGov.gmv_tnd > 0 ? <ReGoAmtBox amount={selectedGov.gmv_tnd} size="sm" /> : <span className="text-[var(--rego-ink-3,#949494)]">—</span>}
                    </span>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Panier Moyen</span>
                    <span className="font-bold">
                      {selectedGov.orders_count > 0 ? (
                        <ReGoAmtBox
                          amount={selectedGov.gmv_tnd / selectedGov.orders_count}
                          size="sm"
                        />
                      ) : (
                        <span className="text-[var(--rego-ink-3,#949494)]">—</span>
                      )}
                    </span>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Acheteurs Actifs</span>
                    <span className="font-bold">{selectedGov.active_visitors > 0 ? `${selectedGov.active_visitors.toLocaleString('fr-TN')} acheteurs` : '—'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-[var(--rego-border,#dedede)]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGov(null);
                    onOpenDrilldown('orders');
                  }}
                  className="w-full py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-white hover:opacity-90 transition-all text-center"
                >
                  Voir les Commandes de la Région
                </button>
              </div>
            </div>
          )}
        </ReGoDrawer>
      }
      modals={
        <>
          <MetricDefinitionsModal
            isOpen={isDefinitionsOpen}
            onClose={onCloseDefinitions}
          />

          <AnalyticsDrilldownModal
            isOpen={isDrilldownOpen}
            onClose={onCloseDrilldown}
            initialType={drilldownType}
            timeRange={timeRange}
          />

          <AnalyticsHelpPanel
            isOpen={isHelpOpen}
            onClose={onCloseHelp}
          />
        </>
      }
    />
  );
}
