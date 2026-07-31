'use client';

import { PlatformPageViewsAnalytics } from '@/types/analytics';
import {
  Eye,
  Users,
  Search,
  Store,
  Smartphone,
  Globe,
  TrendingUp,
  Activity,
  ShoppingBag,
  ArrowUpRight,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface PageViewsAnalyticsTabProps {
  data: PlatformPageViewsAnalytics | null;
  onOpenDrilldown?: (type: any) => void;
}

export function PageViewsAnalyticsTab({ data, onOpenDrilldown }: PageViewsAnalyticsTabProps) {
  if (!data) return null;

  const { summary, top_pages_viewed, top_products_viewed, top_products_ordered, top_storefronts_by_views, top_storefronts_by_sales, top_marketplace_searches, top_storefront_searches, visit_sources, device_breakdown, live_activity_feed } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Page Views */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Total Page Views</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {summary.total_page_views.toLocaleString()}
            </span>
            {summary.views_growth_pct !== null && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3 h-3" /> +{summary.views_growth_pct}%
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {summary.marketplace_views.toLocaleString()} Marketplace / {summary.storefront_views.toLocaleString()} Storefronts
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Unique Visitors</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {summary.unique_visitors.toLocaleString()}
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {summary.registered_user_views.toLocaleString()} Logged-in / {summary.anonymous_visitor_views.toLocaleString()} Guests
          </p>
        </div>

        {/* Live Active Visitors Now */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Live Visitors Now
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-200">
            {summary.live_active_visitors_now} <span className="text-sm font-bold text-emerald-600">online</span>
          </div>
          <p className="text-xs font-semibold text-emerald-700/80 dark:text-emerald-400/80">
            Active telemetry sessions in the last 15 mins
          </p>
        </div>

        {/* Session Quality & Bounce Rate */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Session Duration & Bounce</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {Math.floor(summary.avg_session_duration_seconds / 60)}m {summary.avg_session_duration_seconds % 60}s
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Avg Duration &bull; Bounce Rate: <span className="font-bold text-slate-800 dark:text-slate-200">{summary.bounce_rate_pct}%</span>
          </p>
        </div>
      </div>

      {/* 2. Live Telemetry Activity Feed & Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pages Viewed (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Top Pages Viewed</h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              Marketplace & Storefronts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold">Page URL / Path</th>
                  <th className="pb-3 font-extrabold">Type</th>
                  <th className="pb-3 font-extrabold text-right">Views</th>
                  <th className="pb-3 font-extrabold text-right">Unique Visitors</th>
                  <th className="pb-3 font-extrabold text-right">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_pages_viewed.map((page, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 max-w-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {page.path}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        page.type === 'marketplace'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : page.type === 'storefront'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {page.type}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                      {page.views_count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {page.unique_visitors.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-500">
                      {page.avg_time_seconds}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Activity Feed Stream (1 col) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Live Activity Stream</h3>
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
            {live_activity_feed.map((act) => (
              <div key={act.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
                    {act.event_type.replaceAll('_', ' ')}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {new Date(act.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{act.path}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold pt-1">
                  <span>{act.store_name}</span>
                  <span className="capitalize">{act.user_role} ({act.device_type})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Top Products Viewed vs Top Products Ordered */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Viewed */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Top Products Viewed</h3>
            </div>
            {onOpenDrilldown && (
              <button
                onClick={() => onOpenDrilldown('products')}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                Full Catalog <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold">Product Title</th>
                  <th className="pb-3 font-extrabold">Store</th>
                  <th className="pb-3 font-extrabold text-right">Views</th>
                  <th className="pb-3 font-extrabold text-right">Cart Adds</th>
                  <th className="pb-3 font-extrabold text-right">Conv. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_products_viewed.map((prod) => (
                  <tr key={prod.product_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 max-w-[160px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {prod.title}
                    </td>
                    <td className="py-3 text-slate-500 font-medium truncate max-w-[100px]">
                      {prod.store_name}
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                      {prod.views_count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {prod.add_to_cart_count}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold">
                        {prod.conversion_rate_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Ordered */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Top Products Ordered & Sales</h3>
            </div>
            {onOpenDrilldown && (
              <button
                onClick={() => onOpenDrilldown('orders')}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                Orders Analytics <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold">Product Title</th>
                  <th className="pb-3 font-extrabold">Store</th>
                  <th className="pb-3 font-extrabold text-right">Units Sold</th>
                  <th className="pb-3 font-extrabold text-right">Revenue</th>
                  <th className="pb-3 font-extrabold text-right">Order Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_products_ordered.map((prod) => (
                  <tr key={prod.product_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 max-w-[160px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {prod.title}
                    </td>
                    <td className="py-3 text-slate-500 font-medium truncate max-w-[100px]">
                      {prod.store_name}
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                      {prod.units_sold}
                    </td>
                    <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {prod.total_revenue_tnd.toFixed(0)} TND
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                        {prod.conversion_rate_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Top Storefront Websites Performance (Views vs Sales) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Storefront Websites by Page Views */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Top Storefront Websites (Page Views)</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold">Storefront Website</th>
                  <th className="pb-3 font-extrabold">Host URL</th>
                  <th className="pb-3 font-extrabold text-right">Page Views</th>
                  <th className="pb-3 font-extrabold text-right">Unique Visitors</th>
                  <th className="pb-3 font-extrabold text-right">Active Listings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_storefronts_by_views.map((store) => (
                  <tr key={store.store_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                      {store.store_name}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      /store/{store.store_host}
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                      {store.views_count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {store.unique_visitors.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {store.active_listings_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Storefront Websites by Sales GMV */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Top Storefront Websites (Sales GMV)</h3>
            </div>
            {onOpenDrilldown && (
              <button
                onClick={() => onOpenDrilldown('vendors')}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                Vendor Ranks <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold">Storefront Website</th>
                  <th className="pb-3 font-extrabold text-right">Orders</th>
                  <th className="pb-3 font-extrabold text-right">Total Sales GMV</th>
                  <th className="pb-3 font-extrabold text-right">Views</th>
                  <th className="pb-3 font-extrabold text-right">Store Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_storefronts_by_sales.map((store) => (
                  <tr key={store.store_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                      {store.store_name}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-700 dark:text-slate-300">
                      {store.total_orders_count}
                    </td>
                    <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {store.total_sales_gmv_tnd.toFixed(0)} TND
                    </td>
                    <td className="py-3 text-right text-slate-500">
                      {store.page_views_count}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                        {store.conversion_rate_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Top Search Keywords Analytics (Marketplace vs Storefronts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Marketplace Searches */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Top Marketplace Search Keywords</h3>
            </div>
            {onOpenDrilldown && (
              <button
                onClick={() => onOpenDrilldown('search')}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                Search Audit <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {top_marketplace_searches.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center text-[11px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">&ldquo;{item.query}&rdquo;</p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Avg Results: {item.avg_results_count} listings
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900 dark:text-white">{item.search_count} searches</span>
                  {item.zero_results_pct > 0 && (
                    <p className="text-[10px] font-bold text-red-500">{item.zero_results_pct}% 0-results</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Storefront Searches */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Top Storefront Search Keywords</h3>
            </div>
          </div>

          <div className="space-y-3">
            {top_storefront_searches.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center text-[11px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">&ldquo;{item.query}&rdquo;</p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Store: <span className="text-slate-700 dark:text-slate-300 font-bold">{item.store_name}</span> (/store/{item.store_host})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900 dark:text-white">{item.search_count} searches</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Traffic Sources & Device Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visit Traffic Sources */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">Traffic Referrer Sources</h3>
          </div>

          <div className="space-y-3">
            {visit_sources.map((src, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">{src.referrer_domain}</span>
                  <span className="text-slate-900 dark:text-white font-black">{src.views_count.toLocaleString()} ({src.share_pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, src.share_pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Types Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">Device Breakdown</h3>
          </div>

          <div className="space-y-4 pt-2">
            {device_breakdown.map((dev, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200 capitalize">{dev.device_type}</span>
                  <span className="text-slate-900 dark:text-white font-black">{dev.views_count.toLocaleString()} views ({dev.share_pct}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      idx === 0 ? 'bg-purple-600' : idx === 1 ? 'bg-blue-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, dev.share_pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
