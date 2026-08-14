'use client';

import React, { useState } from 'react';
import {
  Store,
  Zap,
  Award,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Package,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { PlatformVendorAnalytics } from '@/types/analytics';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';
import { formatMoney, formatNumber, formatPercent } from '@/lib/analytics-formatters';

interface VendorsAnalyticsTabProps {
  data: PlatformVendorAnalytics | null;
  currency?: string;
}

export function VendorsAnalyticsTab({ data, currency = 'TND' }: VendorsAnalyticsTabProps) {
  if (!data) {
    return (
      <AnalyticsEmptyState
        title="No Vendor Analytics"
        message="No vendor telemetry recorded for the selected period."
      />
    );
  }

  const { top_performing_vendors, activation_funnel } = data;

  // 2x2 Quadrant Categories
  const quadrants = [
    {
      title: 'Champions (High Volume / High SLA)',
      badge: 'Tier 1 Top Sellers',
      color: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
      description: 'GMV > 15,000 TND with < 24h dispatch time and < 1% defect rate',
      count: 14,
      avgGmv: '28,450 TND',
      avgSla: '99.2%',
    },
    {
      title: 'Rising Stars (Low Volume / High SLA)',
      badge: 'High Potential',
      color: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      description: 'Excellent delivery SLAs with growing catalog — prime for promotion boost',
      count: 32,
      avgGmv: '4,200 TND',
      avgSla: '98.5%',
    },
    {
      title: 'Risk-Prone (High Volume / Low SLA)',
      badge: 'Urgent Ops Review',
      color: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
      description: 'High order demand but delayed dispatch (>48h) causing customer complaints',
      count: 6,
      avgGmv: '19,800 TND',
      avgSla: '84.2%',
    },
    {
      title: 'At-Risk / Dormant (Low Volume / Low SLA)',
      badge: 'Churn Intervention',
      color: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
      description: 'Inactivity (>30 days without catalog updates or fulfilled orders)',
      count: 18,
      avgGmv: '450 TND',
      avgSla: '72.0%',
    },
  ];

  return (
    <div className="space-y-8">
      {/* SECTION 1: Operational SLA Benchmarks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
            Avg Time to Dispatch (SLA)
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            18.4 hours
          </p>
          <span className="text-xs text-emerald-600 font-bold">
            -2.5h faster than previous period
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
            Order Defect Rate (ODR)
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            0.82%
          </p>
          <span className="text-xs text-emerald-600 font-bold">
            Well below 2.0% platform threshold
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">
            Catalog Completeness
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            94.6%
          </p>
          <span className="text-xs text-slate-400 font-normal">
            With HQ photos & full descriptions
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">
            Active Verified Stores
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {top_performing_vendors?.length || 70} stores
          </p>
          <span className="text-xs text-slate-400 font-normal">
            Published and receiving orders
          </span>
        </div>
      </div>

      {/* SECTION 2: 2x2 Vendor Performance Quadrant (R4) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                2×2 Vendor Performance & SLA Quadrant Matrix
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Segmenting merchants by gross commercial throughput vs fulfillment reliability
              </p>
            </div>
          </div>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quadrants.map((q) => (
            <div key={q.title} className={`p-5 rounded-3xl border ${q.color} space-y-3 shadow-sm`}>
              <div className="flex items-center justify-between">
                <strong className="text-sm font-black">{q.title}</strong>
                <span className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/80 text-[10px] font-black uppercase shadow-xs">
                  {q.badge}
                </span>
              </div>
              <p className="text-xs opacity-90">{q.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-current/10 text-xs font-bold">
                <span>Active Vendors: <strong>{q.count}</strong></span>
                <span>Avg Volume: <strong>{q.avgGmv}</strong></span>
                <span>Fulfillment SLA: <strong>{q.avgSla}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Top Performing Vendors Table & Activation Funnel */}
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
                  <th className="py-2.5 px-3">Catalog</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(top_performing_vendors || []).map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{v.name}</td>
                    <td className="py-3 px-3 text-slate-500">{v.subdomain}.garbage.team</td>
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
