'use client';

import { Layers, CreditCard, Store, Megaphone, Server, ShoppingBag, RefreshCw } from 'lucide-react';
import { AnalyticsTabID } from '@/types/analytics';

interface AnalyticsTabsNavProps {
  activeTab: AnalyticsTabID;
  tabLoading: Record<AnalyticsTabID, boolean>;
  onTabChange: (tab: AnalyticsTabID) => void;
}

const TABS: Array<{ id: AnalyticsTabID; label: string; icon: typeof Layers }> = [
  { id: 'overview', label: 'Executive Overview', icon: Layers },
  { id: 'business', label: 'Marketplace Business', icon: ShoppingBag },
  { id: 'financials', label: 'Financials & SaaS Engine', icon: CreditCard },
  { id: 'vendors', label: 'Vendor & Marketplace Health', icon: Store },
  { id: 'ads', label: 'PandaMarket Ads', icon: Megaphone },
  { id: 'system', label: 'Infrastructure & Telemetry', icon: Server },
];

export function AnalyticsTabsNav({ activeTab, tabLoading, onTabChange }: AnalyticsTabsNavProps) {
  return (
    <div
      role="tablist"
      aria-label="Platform Analytics Tabs"
      className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-bold text-slate-500 overflow-x-auto pb-1"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isSelected = activeTab === tab.id;
        const isLoading = tabLoading[tab.id];

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              isSelected
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            <span>{tab.label}</span>
            {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
