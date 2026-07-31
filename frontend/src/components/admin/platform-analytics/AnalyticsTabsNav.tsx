'use client';

import {
  Layers,
  CreditCard,
  Store,
  Megaphone,
  Server,
  ShoppingBag,
  RefreshCw,
  ShieldCheck,
  Brain,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { AnalyticsTabID } from '@/types/analytics';
import { useLocale } from '@/contexts/LocaleContext';

interface AnalyticsTabsNavProps {
  activeTab: AnalyticsTabID;
  tabLoading: Record<AnalyticsTabID, boolean>;
  onTabChange: (tab: AnalyticsTabID) => void;
}

interface TabItem {
  id: AnalyticsTabID;
  label: string;
  icon: typeof Layers;
  description: string;
  badge?: string;
}

interface TabGroup {
  groupName: string;
  tabs: TabItem[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    groupName: 'Overview & Telemetry',
    tabs: [
      {
        id: 'overview',
        label: 'Executive Overview',
        icon: Layers,
        description: 'Core platform metrics & KPIs',
      },
      {
        id: 'page_views',
        label: 'Page Views & Visits',
        icon: Eye,
        description: 'Real-time traffic & GEO map',
        badge: 'LIVE',
      },
      {
        id: 'business',
        label: 'Marketplace Business',
        icon: ShoppingBag,
        description: 'Sales GMV & product conversion',
      },
    ],
  },
  {
    groupName: 'Monetization & Ads',
    tabs: [
      {
        id: 'financials',
        label: 'Financials & SaaS',
        icon: CreditCard,
        description: 'Subscriptions & revenue engine',
      },
      {
        id: 'vendors',
        label: 'Vendor & Store Health',
        icon: Store,
        description: 'Store rankings & verification',
      },
      {
        id: 'ads',
        label: 'PandaMarket Ads',
        icon: Megaphone,
        description: 'Campaigns & ad impressions',
      },
    ],
  },
  {
    groupName: 'Infrastructure & Risk',
    tabs: [
      {
        id: 'system',
        label: 'Infrastructure',
        icon: Server,
        description: 'API telemetry & system logs',
      },
      {
        id: 'intelligence',
        label: 'Intelligence & Risk',
        icon: Brain,
        description: 'Fraud radar & AI anomaly detection',
      },
      {
        id: 'governance',
        label: 'Governance & Audit',
        icon: ShieldCheck,
        description: 'Platform audit logs & compliance',
      },
    ],
  },
];

export function AnalyticsTabsNav({ activeTab, tabLoading, onTabChange }: AnalyticsTabsNavProps) {
  const { t } = useLocale();

  return (
    <nav
      aria-label="Platform Analytics Sidebar Navigation"
      className="w-full lg:w-72 flex-shrink-0 space-y-6"
    >
      {/* Mobile Horizontal Scroll Fallback (< lg screens) */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
        {TAB_GROUPS.flatMap(g => g.tabs).map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          const isLoading = tabLoading[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 border transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t(`analytics.tabs.${tab.id}`) || tab.label}</span>
              {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-indigo-300" />}
            </button>
          );
        })}
      </div>

      {/* Desktop Vertical Sidebar (≥ lg screens) */}
      <div className="hidden lg:block space-y-6 sticky top-6">
        {TAB_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-2">
            {/* Category Section Title */}
            <h4 className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.groupName}
            </h4>

            {/* Vertical Tab Items */}
            <div className="space-y-1.5">
              {group.tabs.map((tab) => {
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
                    className={`w-full p-3 rounded-2xl text-left transition-all duration-200 group flex items-start gap-3 border ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25 scale-[1.02]'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Icon Container */}
                    <div
                      className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Label & Description */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-black truncate leading-tight">
                          {t(`analytics.tabs.${tab.id}`) || tab.label}
                        </span>
                        {tab.badge && (
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-black rounded uppercase tracking-wider ${
                              isSelected
                                ? 'bg-emerald-400 text-slate-950'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                        {isLoading && (
                          <RefreshCw
                            className={`w-3 h-3 animate-spin ${
                              isSelected ? 'text-white' : 'text-indigo-500'
                            }`}
                          />
                        )}
                      </div>

                      <p
                        className={`text-[11px] mt-0.5 line-clamp-1 font-medium ${
                          isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {tab.description}
                      </p>
                    </div>

                    {/* Active Chevron Indicator */}
                    <ChevronRight
                      className={`w-4 h-4 self-center flex-shrink-0 transition-transform ${
                        isSelected
                          ? 'text-white opacity-100 translate-x-0.5'
                          : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
