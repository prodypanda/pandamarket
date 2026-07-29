'use client';

import { Store, Zap } from 'lucide-react';
import { PlatformVendorAnalytics } from '@/types/analytics';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';

interface VendorsAnalyticsTabProps {
  data: PlatformVendorAnalytics | null;
}

export function VendorsAnalyticsTab({ data }: VendorsAnalyticsTabProps) {
  if (!data) {
    return <AnalyticsEmptyState title="No Vendor Analytics" message="No vendor telemetry recorded for the selected period." />;
  }

  const { top_performing_vendors, activation_funnel } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Vendors Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" aria-hidden="true" /> Top Performing Vendors Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Store Name</th>
                  <th className="py-2.5 px-3">Domain</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Catalog Products</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(top_performing_vendors || []).map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{v.name}</td>
                    <td className="py-3 px-3 text-slate-500">{v.subdomain}.pandamarket.tn</td>
                    <td className="py-3 px-3 uppercase text-[10px] font-black text-indigo-600">{v.subscription_plan}</td>
                    <td className="py-3 px-3 font-bold">{v.products_count} items</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded-md text-[10px]">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activation Funnel */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" aria-hidden="true" /> Vendor Onboarding Funnel (In Period)
          </h3>
          <div className="space-y-3">
            {(activation_funnel || []).map((step, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{step.stage}</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{step.conversion}</span>
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{step.count} vendors</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
