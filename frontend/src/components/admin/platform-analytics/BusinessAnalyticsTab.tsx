'use client';

import { ShoppingBag, Users, Store, Wallet, ShieldAlert, CheckCircle2, Info, Filter } from 'lucide-react';
import { PlatformBusinessAnalytics } from '@/types/analytics';
import { MetricCard } from './MetricCard';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';
import { formatMoney, formatNumber, formatPercent } from '@/lib/analytics-formatters';

interface BusinessAnalyticsTabProps {
  data: PlatformBusinessAnalytics | null;
}

export function BusinessAnalyticsTab({ data }: BusinessAnalyticsTabProps) {
  if (!data) {
    return <AnalyticsEmptyState title="No Business Analytics" message="No marketplace business metrics are recorded for the selected period." />;
  }

  const { orders, checkout, buyers, sellers, payouts, risk, operations } = data;

  return (
    <div className="space-y-8">
      {/* 1. Orders & Marketplace GMV */}
      <div className="space-y-3">
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-indigo-600" aria-hidden="true" /> Marketplace Orders & Order GMV
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Marketplace Order GMV"
            value={orders.marketplace_gmv_tnd}
            currencyLabel="TND"
            icon={<ShoppingBag className="w-4 h-4" />}
            growthPct={orders.gmv_growth_pct}
            growthLabel="GMV PoP"
            subtext={<span className="text-[10px] text-indigo-600 font-bold">Paid & Captured Orders Only</span>}
          />

          <MetricCard
            title="Total Orders in Period"
            value={orders.total_orders}
            icon={<ShoppingBag className="w-4 h-4" />}
            growthPct={orders.order_growth_pct}
            growthLabel="Orders PoP"
            subtext={
              <span className="text-slate-500 text-[11px]">
                Paid: <strong>{orders.paid_orders}</strong> | Fulfilled: <strong>{orders.fulfilled_orders}</strong>
              </span>
            }
          />

          <MetricCard
            title="Average Order Value (AOV)"
            value={formatMoney(orders.average_order_value_tnd, 'TND', 'Unavailable')}
            icon={<ShoppingBag className="w-4 h-4" />}
            subtext={<span className="text-slate-500 text-[11px]">Per paid order</span>}
          />

          <MetricCard
            title="Cancelled Orders"
            value={orders.cancelled_orders}
            icon={<ShoppingBag className="w-4 h-4" />}
            gradientClass="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-slate-900 dark:to-rose-950/40"
            borderClass="border-rose-200/60 dark:border-rose-800/60"
            titleColorClass="text-rose-600 dark:text-rose-400"
            iconBgClass="bg-rose-500/10"
            iconColorClass="text-rose-600"
            subtext={
              <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                {orders.total_orders > 0 ? `${((orders.cancelled_orders / orders.total_orders) * 100).toFixed(1)}% cancellation rate` : '0%'}
              </span>
            }
          />
        </div>
      </div>

      {/* 2. Checkout Funnel (Explicit Unavailable Banner) */}
      <div className="p-5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm">
          <Filter className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span>Checkout Conversion Funnel</span>
          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] uppercase font-black">
            Not Tracked Yet
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {checkout.unavailable_reason || 'Checkout funnel events (checkout_started, payment_started, payment_completed) are not tracked yet in the database.'}
        </p>
      </div>

      {/* 3. Buyer & Customer Analytics */}
      <div className="space-y-3">
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" aria-hidden="true" /> Buyer & Customer Telemetry
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Registered Buyers"
            value={buyers.total_buyers_current}
            icon={<Users className="w-4 h-4" />}
            subtext={<span className="text-slate-500 text-[11px]">Current platform total</span>}
            gradientClass="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-blue-950/40"
            borderClass="border-blue-200/60 dark:border-blue-800/60"
            titleColorClass="text-blue-600 dark:text-blue-400"
            iconBgClass="bg-blue-500/10"
            iconColorClass="text-blue-600"
          />

          <MetricCard
            title="New Buyers in Period"
            value={buyers.new_buyers}
            icon={<Users className="w-4 h-4" />}
            growthPct={buyers.buyer_growth_pct}
            growthLabel="New Buyers PoP"
            gradientClass="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-slate-900 dark:to-blue-950/40"
            borderClass="border-blue-200/60 dark:border-blue-800/60"
            titleColorClass="text-blue-600 dark:text-blue-400"
            iconBgClass="bg-blue-500/10"
            iconColorClass="text-blue-600"
          />

          <MetricCard
            title="Active Ordering Buyers"
            value={buyers.active_buyers}
            icon={<Users className="w-4 h-4" />}
            subtext={<span className="text-slate-500 text-[11px]">Placed order in period</span>}
            gradientClass="bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-900 dark:to-sky-950/40"
            borderClass="border-sky-200/60 dark:border-sky-800/60"
            titleColorClass="text-sky-600 dark:text-sky-400"
            iconBgClass="bg-sky-500/10"
            iconColorClass="text-sky-600"
          />

          <MetricCard
            title="Repeat Buyers & Retention"
            value={buyers.repeat_buyers}
            icon={<Users className="w-4 h-4" />}
            subtext={
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                {formatPercent(buyers.repeat_buyer_rate_pct, 'Unavailable')} repeat rate
              </span>
            }
            gradientClass="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-teal-950/40"
            borderClass="border-emerald-200/60 dark:border-emerald-800/60"
            titleColorClass="text-emerald-600 dark:text-emerald-400"
            iconBgClass="bg-emerald-500/10"
            iconColorClass="text-emerald-600"
          />
        </div>
      </div>

      {/* 4. Seller & Vendor Activation */}
      <div className="space-y-3">
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-purple-600" aria-hidden="true" /> Seller & Vendor Activation Funnel
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Registered Vendors"
            value={sellers.total_sellers_current}
            icon={<Store className="w-4 h-4" />}
            growthPct={sellers.seller_growth_pct}
            growthLabel="Sellers PoP"
            subtext={<span className="text-slate-500 text-[11px]">New in period: <strong>{sellers.new_sellers}</strong></span>}
            gradientClass="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-900 dark:to-purple-950/40"
            borderClass="border-purple-200/60 dark:border-purple-800/60"
            titleColorClass="text-purple-600 dark:text-purple-400"
            iconBgClass="bg-purple-500/10"
            iconColorClass="text-purple-600"
          />

          <MetricCard
            title="Active Published Stores"
            value={sellers.active_stores_current}
            icon={<Store className="w-4 h-4" />}
            subtext={<span className="text-slate-500 text-[11px]">Created in period: <strong>{sellers.stores_created}</strong></span>}
            gradientClass="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-purple-950/40"
            borderClass="border-purple-200/60 dark:border-purple-800/60"
            titleColorClass="text-purple-600 dark:text-purple-400"
            iconBgClass="bg-purple-500/10"
            iconColorClass="text-purple-600"
          />

          <MetricCard
            title="Stores with Active Catalog"
            value={sellers.stores_with_products}
            icon={<Store className="w-4 h-4" />}
            subtext={<span className="text-slate-500 text-[11px]">Has ≥1 listed product</span>}
          />

          <MetricCard
            title="Vendor Order Activation"
            value={sellers.stores_with_orders}
            icon={<Store className="w-4 h-4" />}
            subtext={
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                {formatPercent(sellers.activation_rate_pct, 'Unavailable')} activation rate
              </span>
            }
          />
        </div>
      </div>

      {/* 5. Payouts & Wallet Liability */}
      <div className="space-y-3">
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600" aria-hidden="true" /> Vendor Payouts & Wallet Liabilities
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
            <span className="text-[10px] text-emerald-600 font-black uppercase">Withdrawable Wallet Liability</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {formatMoney(payouts.total_wallet_balance_tnd, 'TND')}
            </p>
            <span className="text-xs text-slate-500">
              Pending Escrow Holds: <strong>{formatMoney(payouts.pending_wallet_balance_tnd, 'TND')}</strong>
            </span>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
            <span className="text-[10px] text-indigo-600 font-black uppercase">Payouts Released in Period</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {formatMoney(payouts.payout_amount_in_period_tnd, 'TND')}
            </p>
            <span className="text-xs text-slate-500">
              Transactions Count: <strong>{payouts.payout_transactions_in_period}</strong>
            </span>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
            <span className="text-[10px] text-purple-600 font-black uppercase">Historical Vendor Payouts</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {formatMoney(payouts.total_withdrawn_tnd, 'TND')}
            </p>
            <span className="text-xs text-slate-500">Total processed withdrawals to date</span>
          </div>
        </div>
      </div>

      {/* 6. Risk, Disputes, Reports & Operational Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk & Disputes */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" aria-hidden="true" /> Risk, Disputes & Refunds
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">Open Vendor Reports</span>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {risk.open_reports_count} <span className="text-xs font-normal text-slate-400">/ {risk.reports_count} in period</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">Open Subscription Disputes</span>
              <p className="text-lg font-black text-slate-900 dark:text-white">{risk.open_disputes_count}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">Refund Requests</span>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {formatMoney(risk.refunds_amount_tnd, 'TND')}
                <span className="block text-[10px] text-slate-400 font-normal">{risk.refunds_count} requests</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">High Risk Flagged Vendors</span>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400">{risk.high_risk_vendors_count}</p>
            </div>
          </div>
        </div>

        {/* KYC & Support Operations */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" /> KYC Verification & Support Queue
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">Pending KYC Submissions</span>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400">{operations.pending_kyc_count}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">KYC Approval Rate</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {formatPercent(operations.kyc_approval_rate_pct, 'Unavailable')}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">Open Support Tickets</span>
              <p className="text-lg font-black text-slate-900 dark:text-white">{operations.open_support_tickets}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">Urgent / High Priority</span>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400">{operations.urgent_support_tickets}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
