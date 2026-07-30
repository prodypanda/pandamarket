'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { AlertTriangle } from 'lucide-react';
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
  DrilldownType,
} from '@/types/analytics';
import {
  fetchOverviewAnalytics,
  fetchRevenueAnalytics,
  fetchVendorAnalytics,
  fetchAdsAnalytics,
  fetchSystemAnalytics,
  fetchBusinessAnalytics,
  exportPlatformAnalytics,
} from '@/lib/admin-platform-analytics';
import { PlatformAnalyticsHeader } from '@/components/admin/platform-analytics/PlatformAnalyticsHeader';
import { AnalyticsRangeStatus } from '@/components/admin/platform-analytics/AnalyticsRangeStatus';
import { AnalyticsTabsNav } from '@/components/admin/platform-analytics/AnalyticsTabsNav';
import { AnalyticsLoadingState } from '@/components/admin/platform-analytics/AnalyticsLoadingState';
import { AnalyticsErrorState } from '@/components/admin/platform-analytics/AnalyticsErrorState';
import { OverviewAnalyticsTab } from '@/components/admin/platform-analytics/OverviewAnalyticsTab';
import { FinancialsAnalyticsTab } from '@/components/admin/platform-analytics/FinancialsAnalyticsTab';
import { VendorsAnalyticsTab } from '@/components/admin/platform-analytics/VendorsAnalyticsTab';
import { AdsAnalyticsTab } from '@/components/admin/platform-analytics/AdsAnalyticsTab';
import { SystemAnalyticsTab } from '@/components/admin/platform-analytics/SystemAnalyticsTab';
import { BusinessAnalyticsTab } from '@/components/admin/platform-analytics/BusinessAnalyticsTab';
import { IntelligenceTab } from '@/components/admin/platform-analytics/IntelligenceTab';
import { GovernanceTab } from '@/components/admin/platform-analytics/GovernanceTab';
import { MetricDefinitionsModal } from '@/components/admin/platform-analytics/MetricDefinitionsModal';
import { AnalyticsDrilldownModal } from '@/components/admin/platform-analytics/AnalyticsDrilldownModal';
import { AnalyticsHelpPanel } from '@/components/admin/platform-analytics/AnalyticsHelpPanel';

export default function ComprehensivePlatformAnalyticsPage() {
  const { dir } = useLocale();
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [currency, setCurrency] = useState<AnalyticsCurrency>('TND');
  const [activeTab, setActiveTab] = useState<AnalyticsTabID>('overview');

  // Preference Persistence (localStorage)
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('pandamarket_analytics_active_tab');
      if (savedTab && ['overview', 'business', 'financials', 'vendors', 'ads', 'system', 'intelligence', 'governance'].includes(savedTab)) {
        setActiveTab(savedTab as AnalyticsTabID);
      }
      const savedRange = localStorage.getItem('pandamarket_analytics_time_range');
      if (savedRange && ['7d', '30d', '90d', '12m', 'all'].includes(savedRange)) {
        setTimeRange(savedRange as AnalyticsTimeRange);
      }
      const savedCurrency = localStorage.getItem('pandamarket_analytics_currency');
      if (savedCurrency && ['TND', 'USD', 'EUR'].includes(savedCurrency)) {
        setCurrency(savedCurrency as AnalyticsCurrency);
      }
    } catch {
      // Ignore localStorage read errors in SSR/strict sandbox
    }
  }, []);

  const handleTabChange = (tab: AnalyticsTabID) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('pandamarket_analytics_active_tab', tab);
    } catch {}
  };

  const handleTimeRangeChange = (r: AnalyticsTimeRange) => {
    setTimeRange(r);
    try {
      localStorage.setItem('pandamarket_analytics_time_range', r);
    } catch {}
  };

  const handleCurrencyChange = (c: AnalyticsCurrency) => {
    setCurrency(c);
    try {
      localStorage.setItem('pandamarket_analytics_currency', c);
    } catch {}
  };

  // Modal States
  const [isDefinitionsOpen, setIsDefinitionsOpen] = useState(false);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [drilldownType, setDrilldownType] = useState<DrilldownType>('orders');

  // Typed tab data states
  const [overviewData, setOverviewData] = useState<PlatformOverviewAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<PlatformRevenueAnalytics | null>(null);
  const [vendorData, setVendorData] = useState<PlatformVendorAnalytics | null>(null);
  const [adsData, setAdsData] = useState<PlatformAdsAnalytics | null>(null);
  const [systemData, setSystemData] = useState<PlatformSystemAnalytics | null>(null);
  const [businessData, setBusinessData] = useState<PlatformBusinessAnalytics | null>(null);

  // Tab Loading and Error states
  const [tabLoading, setTabLoading] = useState<Record<AnalyticsTabID, boolean>>({
    overview: false,
    business: false,
    financials: false,
    vendors: false,
    ads: false,
    system: false,
    intelligence: false,
    governance: false,
  });
  const [tabError, setTabError] = useState<Record<AnalyticsTabID, string>>({
    overview: '',
    business: '',
    financials: '',
    vendors: '',
    ads: '',
    system: '',
    intelligence: '',
    governance: '',
  });

  // Lazy Tab Data Fetcher
  const fetchTabData = useCallback(
    async (tab: AnalyticsTabID) => {
      setTabLoading((prev) => ({ ...prev, [tab]: true }));
      setTabError((prev) => ({ ...prev, [tab]: '' }));

      const filters = { timeRange, currency };

      try {
        if (tab === 'overview') {
          const data = await fetchOverviewAnalytics(filters);
          setOverviewData(data);
        } else if (tab === 'business') {
          const data = await fetchBusinessAnalytics(filters);
          setBusinessData(data);
        } else if (tab === 'financials') {
          const data = await fetchRevenueAnalytics(filters);
          setRevenueData(data);
        } else if (tab === 'vendors') {
          const data = await fetchVendorAnalytics(filters);
          setVendorData(data);
        } else if (tab === 'ads') {
          const data = await fetchAdsAnalytics(filters);
          setAdsData(data);
        } else if (tab === 'system') {
          const data = await fetchSystemAnalytics(filters);
          setSystemData(data);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network error loading analytics data.';
        setTabError((prev) => ({ ...prev, [tab]: message }));
      } finally {
        setTabLoading((prev) => ({ ...prev, [tab]: false }));
      }
    },
    [timeRange, currency]
  );

  // Fetch active tab data whenever activeTab, timeRange, or currency changes
  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, timeRange, currency, fetchTabData]);

  const handleExportCSV = async () => {
    try {
      const blob = await exportPlatformAnalytics({ type: activeTab, timeRange, currency });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform_analytics_${activeTab}_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate export file.';
      alert(message);
    }
  };

  const activeRange =
    overviewData?.range ||
    businessData?.range ||
    revenueData?.range ||
    vendorData?.range ||
    adsData?.range ||
    systemData?.range;

  const currentTabLoading = tabLoading[activeTab];
  const currentTabError = tabError[activeTab];

  return (
    <div dir={dir} className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      {/* Top Header & Filter Bar */}
      <PlatformAnalyticsHeader
        timeRange={timeRange}
        currency={currency}
        loading={currentTabLoading}
        onTimeRangeChange={handleTimeRangeChange}
        onCurrencyChange={handleCurrencyChange}
        onRefresh={() => fetchTabData(activeTab)}
        onExport={handleExportCSV}
        onOpenDefinitions={() => setIsDefinitionsOpen(true)}
        onOpenDrilldown={() => {
          setDrilldownType(activeTab === 'vendors' ? 'vendors' : activeTab === 'business' ? 'events' : 'orders');
          setIsDrilldownOpen(true);
        }}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Normalized Time Range Metadata Bar */}
      <AnalyticsRangeStatus range={activeRange} />

      {/* Conversion Warning Badge when USD/EUR selected */}
      {currency !== 'TND' && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-between">
          <span>
            Requested Display Currency: <strong>{currency}</strong> (Live USD/EUR conversion service unavailable — displaying native TND figures)
          </span>
          <span className="px-2 py-0.5 bg-indigo-200/50 dark:bg-indigo-900/60 rounded text-[10px] font-black uppercase">
            Native TND
          </span>
        </div>
      )}

      {/* Threshold Alerts Banner */}
      {overviewData?.threshold_alerts?.map((alert) => (
        <div
          key={alert.id}
          className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <div>
              <span className="font-black uppercase tracking-wider">{alert.title}: </span>
              <span className="font-normal">{alert.message}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-amber-200/50 dark:bg-amber-900/60 rounded text-[10px] uppercase font-black">
            Active Alert
          </span>
        </div>
      ))}

      {/* Navigation Sub-Tabs */}
      <AnalyticsTabsNav activeTab={activeTab} tabLoading={tabLoading} onTabChange={handleTabChange} />

      {/* Active Tab Panel */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {currentTabError ? (
          <AnalyticsErrorState message={currentTabError} onRetry={() => fetchTabData(activeTab)} />
        ) : currentTabLoading &&
          ((activeTab === 'overview' && !overviewData) ||
            (activeTab === 'business' && !businessData) ||
            (activeTab === 'financials' && !revenueData) ||
            (activeTab === 'vendors' && !vendorData) ||
            (activeTab === 'ads' && !adsData) ||
            (activeTab === 'system' && !systemData)) ? (
          <AnalyticsLoadingState message={`Fetching live ${activeTab} telemetry...`} />
        ) : (
          <>
            {activeTab === 'overview' && <OverviewAnalyticsTab data={overviewData} />}
            {activeTab === 'business' && <BusinessAnalyticsTab data={businessData} />}
            {activeTab === 'financials' && <FinancialsAnalyticsTab data={revenueData} />}
            {activeTab === 'vendors' && <VendorsAnalyticsTab data={vendorData} />}
            {activeTab === 'ads' && <AdsAnalyticsTab data={adsData} />}
            {activeTab === 'system' && <SystemAnalyticsTab data={systemData} />}
            {activeTab === 'intelligence' && <IntelligenceTab />}
            {activeTab === 'governance' && <GovernanceTab />}
          </>
        )}
      </div>

      {/* Part 6 Modals */}
      <MetricDefinitionsModal
        isOpen={isDefinitionsOpen}
        onClose={() => setIsDefinitionsOpen(false)}
      />

      <AnalyticsDrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        initialType={drilldownType}
        timeRange={timeRange}
      />

      {/* Part 9 Onboarding Help Panel */}
      <AnalyticsHelpPanel
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
