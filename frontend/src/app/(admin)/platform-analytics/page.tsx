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
} from '@/types/analytics';
import {
  fetchOverviewAnalytics,
  fetchRevenueAnalytics,
  fetchVendorAnalytics,
  fetchAdsAnalytics,
  fetchSystemAnalytics,
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

export default function ComprehensivePlatformAnalyticsPage() {
  const { dir } = useLocale();
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [currency, setCurrency] = useState<AnalyticsCurrency>('TND');
  const [activeTab, setActiveTab] = useState<AnalyticsTabID>('overview');

  // Typed tab data states
  const [overviewData, setOverviewData] = useState<PlatformOverviewAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<PlatformRevenueAnalytics | null>(null);
  const [vendorData, setVendorData] = useState<PlatformVendorAnalytics | null>(null);
  const [adsData, setAdsData] = useState<PlatformAdsAnalytics | null>(null);
  const [systemData, setSystemData] = useState<PlatformSystemAnalytics | null>(null);

  // Tab Loading and Error states
  const [tabLoading, setTabLoading] = useState<Record<AnalyticsTabID, boolean>>({
    overview: false,
    financials: false,
    vendors: false,
    ads: false,
    system: false,
  });
  const [tabError, setTabError] = useState<Record<AnalyticsTabID, string>>({
    overview: '',
    financials: '',
    vendors: '',
    ads: '',
    system: '',
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
        onTimeRangeChange={setTimeRange}
        onCurrencyChange={setCurrency}
        onRefresh={() => fetchTabData(activeTab)}
        onExport={handleExportCSV}
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
      <AnalyticsTabsNav activeTab={activeTab} tabLoading={tabLoading} onTabChange={setActiveTab} />

      {/* Active Tab Panel */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {currentTabError ? (
          <AnalyticsErrorState message={currentTabError} onRetry={() => fetchTabData(activeTab)} />
        ) : currentTabLoading &&
          ((activeTab === 'overview' && !overviewData) ||
            (activeTab === 'financials' && !revenueData) ||
            (activeTab === 'vendors' && !vendorData) ||
            (activeTab === 'ads' && !adsData) ||
            (activeTab === 'system' && !systemData)) ? (
          <AnalyticsLoadingState message={`Fetching live ${activeTab} telemetry...`} />
        ) : (
          <>
            {activeTab === 'overview' && <OverviewAnalyticsTab data={overviewData} />}
            {activeTab === 'financials' && <FinancialsAnalyticsTab data={revenueData} />}
            {activeTab === 'vendors' && <VendorsAnalyticsTab data={vendorData} />}
            {activeTab === 'ads' && <AdsAnalyticsTab data={adsData} />}
            {activeTab === 'system' && <SystemAnalyticsTab data={systemData} />}
          </>
        )}
      </div>
    </div>
  );
}
