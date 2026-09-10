'use client';

import React, { Fragment, useState, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Package,
  Truck,
  Phone,
  PhoneCall,
  CheckCircle2,
  Search,
  FileText,
  Printer,
  ShieldAlert,
  DollarSign,
  ArrowUpRight,
  MessageSquare,
  Send,
  X,
  Eye,
  RotateCcw,
  RefreshCw,
  MapPin,
  Check,
  ShieldCheck,
  Download,
  CalendarDays,
  Ban,
  ChevronDown,
  Loader2,
  Clock3,
  Receipt,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoDrawer,
} from './ReGoPrimitives';
import type {
  Order,
  OrderMeta,
  OrdersMainTab,
  CourierSettlement,
} from '@/app/hub/dashboard/orders/page';

export interface OrdersSettlementsSummary {
  total_collected: number;
  total_courier_fees: number;
  total_net_payout: number;
  pending_payout: number;
  settled_payout: number;
  settled_count: number;
  pending_count: number;
}

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

export interface OrdersReGoCockpitProps {
  orders: Order[];
  meta?: OrderMeta | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSelectOrder: (order: Order) => void | Promise<void>;
  onFulfillOrder: (order: Order) => void;
  onGenerateLabel: (order: Order) => void | Promise<void>;
  onUpdateCodStatus: (
    orderId: string,
    status: 'pending' | 'confirmed' | 'rejected' | 'unreachable' | 'otp_verified',
    callAttemptsDelta?: number,
    notes?: string
  ) => Promise<void>;
  onSendCodOtp: (orderId: string) => Promise<void>;
  onVerifyCodOtp?: (orderId: string, otp: string) => Promise<void>;
  onPrintOrder: (order: Order, kind: 'invoice' | 'delivery_slip') => void;
  onCancelFulfillment: (order: Order) => void;
  updatingCodStatus?: boolean;
  sendingCodOtp?: boolean;
  codFeedback?: string;
  dir?: 'ltr' | 'rtl';

  // Main tab navigation (shared with the classic branch)
  mainTab: OrdersMainTab;
  onMainTabChange: (tab: OrdersMainTab) => void;

  // Server-side filters (controlled by the page, applied by the API)
  search?: string;
  onSearchChange?: (value: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  paymentGatewayFilter?: string;
  onPaymentGatewayFilterChange?: (value: string) => void;
  paymentStatusFilter?: string;
  onPaymentStatusFilterChange?: (value: string) => void;
  fulfillmentStatusFilter?: string;
  onFulfillmentStatusFilterChange?: (value: string) => void;
  dateFrom?: string;
  onDateFromChange?: (value: string) => void;
  dateTo?: string;
  onDateToChange?: (value: string) => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;

  // Server pagination
  page?: number;
  totalPages?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;

  // CSV export (page owns the export logic)
  onExportCsv?: (scope: 'filtered' | 'selected') => void;
  exporting?: boolean;

  // Bulk selection & bulk fulfillment (page owns selection state + modal)
  selectedIds?: string[];
  onToggleSelect?: (orderId: string) => void;
  onToggleSelectAll?: (checked: boolean) => void;
  onOpenBulkFulfillment?: () => void;
  onPrintSelected?: (kind: 'invoice' | 'delivery_slip') => void;

  // Courier settlements tab data (fetched by the page)
  settlements?: CourierSettlement[];
  settlementsLoading?: boolean;
  settlementsSummary?: OrdersSettlementsSummary;
  settlementCarrierFilter?: string;
  onSettlementCarrierFilterChange?: (value: string) => void;
  settlementStatusFilter?: string;
  onSettlementStatusFilterChange?: (value: string) => void;
  onExportSettlementsCsv?: () => void;
  onReconcileSettlement?: (settlement: CourierSettlement) => void;
}

function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value: unknown, currency = 'TND') {
  return `${toNumber(value).toFixed(3)} ${currency}`;
}

function isCodOrder(order: Order) {
  return order.payment_gateway === 'cod' || order.payment_gateway === 'cash_on_delivery';
}

function canGenerateLabel(order: Order) {
  return Boolean(order.fulfillment_id && order.shipping_address && !['delivered', 'cancelled'].includes(order.fulfillment_status || ''));
}

function canCancelFulfillment(order: Order) {
  return (order.fulfillment_status === 'pending' || order.fulfillment_status === 'preparing') && order.status !== 'refunded';
}

function getRtoLabel(code: string | null | undefined, t: TranslationFn) {
  switch (code) {
    case 'client_refused': return t('dashboardPages.orders.rtoReasonClientRefused');
    case 'unreachable': return t('dashboardPages.orders.rtoReasonUnreachable');
    case 'wrong_address': return t('dashboardPages.orders.rtoReasonWrongAddress');
    case 'fake_order': return t('dashboardPages.orders.rtoReasonFakeOrder');
    case 'delayed_delivery': return t('dashboardPages.orders.rtoReasonDelayedDelivery');
    case 'damaged_in_transit': return t('dashboardPages.orders.rtoReasonDamagedInTransit');
    case 'customer_cancelled': return t('dashboardPages.orders.rtoReasonCustomerCancelled');
    default: return code || t('dashboardPages.orders.rtoReasonDefault');
  }
}

function getCodStatusLabel(status: string | null | undefined, t: TranslationFn) {
  switch (status) {
    case 'confirmed': return t('dashboardPages.orders.codConfirmedByCall');
    case 'otp_verified': return t('dashboardPages.orders.codVerifiedByOtp');
    case 'unreachable': return t('dashboardPages.orders.codUnreachable');
    case 'rejected': return t('dashboardPages.orders.codRejected');
    default: return t('dashboardPages.orders.codAwaitingCall');
  }
}

const CARRIERS_CONFIG: Record<string, { name: string; badge: string; sla: string; color: string; border: string }> = {
  aramex: {
    name: 'Aramex Tunisie',
    badge: 'Aramex Express',
    sla: '24-48h National',
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800',
  },
  laposte_rapid: {
    name: 'Rapid-Poste',
    badge: 'Rapid-Poste',
    sla: '24-72h 24 Gouv',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
  },
  runex: {
    name: 'Runex Express',
    badge: 'Runex Express',
    sla: '24-48h Sfax & Sud',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
  first_delivery: {
    name: 'First Delivery',
    badge: 'First Delivery',
    sla: '12-24h Grand Tunis',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
};

const EMPTY_SETTLEMENTS_SUMMARY: OrdersSettlementsSummary = {
  total_collected: 0,
  total_courier_fees: 0,
  total_net_payout: 0,
  pending_payout: 0,
  settled_payout: 0,
  settled_count: 0,
  pending_count: 0,
};

const selectClasses =
  'px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer';

export function OrdersReGoCockpit({
  orders,
  meta,
  loading,
  onRefresh,
  onSelectOrder,
  onFulfillOrder,
  onGenerateLabel,
  onUpdateCodStatus,
  onSendCodOtp,
  onVerifyCodOtp,
  onPrintOrder,
  onCancelFulfillment,
  updatingCodStatus,
  sendingCodOtp,
  codFeedback,
  dir = 'ltr',
  mainTab,
  onMainTabChange,
  search = '',
  onSearchChange,
  statusFilter = '',
  onStatusFilterChange,
  paymentGatewayFilter = '',
  onPaymentGatewayFilterChange,
  paymentStatusFilter = '',
  onPaymentStatusFilterChange,
  fulfillmentStatusFilter = '',
  onFulfillmentStatusFilterChange,
  dateFrom = '',
  onDateFromChange,
  dateTo = '',
  onDateToChange,
  hasActiveFilters = false,
  onResetFilters,
  page = 1,
  totalPages = 1,
  limit = 20,
  onPageChange,
  onLimitChange,
  onExportCsv,
  exporting = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenBulkFulfillment,
  onPrintSelected,
  settlements = [],
  settlementsLoading = false,
  settlementsSummary = EMPTY_SETTLEMENTS_SUMMARY,
  settlementCarrierFilter = 'all',
  onSettlementCarrierFilterChange,
  settlementStatusFilter = 'all',
  onSettlementStatusFilterChange,
  onExportSettlementsCsv,
  onReconcileSettlement,
}: OrdersReGoCockpitProps) {
  const { t, locale } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  // Carrier is not a server-side filter param: keep a client-side quick filter
  // over the current page (search/status/payment/fulfillment/date are server-side).
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [otpInput, setOtpInput] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'cod_urgent' | 'shipped'>('all');
  // null = untouched: the deck defaults to expanded only when urgent COD exists.
  const [codDeckOpen, setCodDeckOpen] = useState<boolean | null>(null);

  // Derive metrics
  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + toNumber(o.total || o.store_total), 0);
  }, [orders]);

  const urgentCodOrders = useMemo(() => {
    return orders.filter(
      (o) => isCodOrder(o) && (o.status === 'pending' || o.status === 'processing')
    );
  }, [orders]);

  const processingCount = useMemo(() => {
    return orders.filter((o) => o.status === 'processing').length;
  }, [orders]);

  const fulfilledCount = useMemo(() => {
    return orders.filter((o) => o.status === 'fulfilled' || o.status === 'delivered').length;
  }, [orders]);

  const fulfillableCount = useMemo(() => {
    return orders.filter((o) => o.fulfillment_status === 'pending' || o.fulfillment_status === 'preparing').length;
  }, [orders]);

  const codOrders = useMemo(() => orders.filter(isCodOrder), [orders]);

  const codPendingCount = useMemo(() => {
    return codOrders.filter((o) => !o.cod_status || o.cod_status === 'pending').length;
  }, [codOrders]);

  const codConfirmedCount = useMemo(() => {
    return codOrders.filter((o) => o.cod_status === 'confirmed' || o.cod_status === 'otp_verified').length;
  }, [codOrders]);

  const codRejectedCount = useMemo(() => {
    return codOrders.filter((o) => o.cod_status === 'rejected' || o.cod_status === 'unreachable').length;
  }, [codOrders]);

  const rtoOrders = useMemo(() => {
    return orders.filter((o) => Boolean(o.rto_reason_code) || o.status === 'cancelled');
  }, [orders]);

  const rtoSavedValue = useMemo(() => {
    return rtoOrders.reduce((acc, o) => acc + (parseFloat(o.store_total || o.total) || 0), 0);
  }, [rtoOrders]);

  const rtoLostShipping = useMemo(() => {
    return rtoOrders.reduce((acc, o) => acc + (parseFloat(o.store_shipping_total || o.shipping_total) || 7.0), 0);
  }, [rtoOrders]);

  const rtoRate = orders.length > 0 ? ((rtoOrders.length / orders.length) * 100).toFixed(1) : '0.0';

  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

  // Carrier options present in the current order book
  const carrierOptions = useMemo(() => {
    const carriers = new Set<string>();
    orders.forEach((o) => {
      if (o.carrier) carriers.add(o.carrier);
    });
    return Array.from(carriers).sort();
  }, [orders]);

  // Quick client-side views over the current server page
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeTab === 'cod_urgent') {
        if (!isCodOrder(order) || (order.status !== 'pending' && order.status !== 'processing')) return false;
      } else if (activeTab === 'shipped') {
        if (order.status !== 'fulfilled' && order.status !== 'delivered') return false;
      }

      if (selectedCarrier !== 'all' && (order.carrier || '') !== selectedCarrier) return false;

      return true;
    });
  }, [orders, activeTab, selectedCarrier]);

  const totalCount = typeof meta?.total === 'number' ? meta.total : orders.length;
  const codDeckVisible = codDeckOpen === null ? urgentCodOrders.length > 0 : codDeckOpen;
  const toggleCodDeck = () => setCodDeckOpen(!codDeckVisible);

  const mainTabs: Array<{ key: OrdersMainTab; label: string; icon: LucideIcon; iconClass: string; badge?: React.ReactNode }> = [
    {
      key: 'all_orders',
      label: t('dashboardPages.orders.tabAllOrders'),
      icon: Package,
      iconClass: 'text-slate-600 dark:text-slate-300',
      badge: (
        <span className="ms-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
          {totalCount}
        </span>
      ),
    },
    {
      key: 'cod_radar',
      label: t('dashboardPages.orders.tabCodRadar'),
      icon: ShieldAlert,
      iconClass: 'text-amber-600 dark:text-amber-400',
      badge: codPendingCount > 0 ? (
        <span className="ms-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
          {t('dashboardPages.orders.badgeToValidate', { count: codPendingCount })}
        </span>
      ) : undefined,
    },
    {
      key: 'rto_returns',
      label: t('dashboardPages.orders.tabRtoReturns'),
      icon: RotateCcw,
      iconClass: 'text-rose-600 dark:text-rose-400',
      badge: rtoOrders.length > 0 ? (
        <span className="ms-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-medium">
          {t('dashboardPages.orders.badgeReturns', { count: rtoOrders.length })}
        </span>
      ) : undefined,
    },
    {
      key: 'courier_settlements',
      label: t('dashboardPages.orders.tabSettlements'),
      icon: DollarSign,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      badge: settlementsSummary.pending_payout > 0 ? (
        <span className="ms-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
          {t('dashboardPages.orders.badgeDue', { amount: formatMoney(settlementsSummary.pending_payout) })}
        </span>
      ) : undefined,
    },
  ];

  const openOrderInspection = (order: Order) => {
    setSelectedOrder(order);
    void onSelectOrder(order);
  };

  /* Shared pagination footer (orders stay server-paginated on the order tabs) */
  const paginationFooter = (
    <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-4 py-3 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-[var(--rego-ink-2,#737373)]">
          Affichage {totalCount === 0 ? 0 : (page - 1) * limit + 1} à {Math.min(page * limit, totalCount)} sur {totalCount} commandes
        </span>
        <div className="flex items-center gap-1.5 ps-3 border-s border-[var(--rego-border,#dedede)]">
          <span className="text-[11px] text-[var(--rego-ink-3,#949494)]">Par page :</span>
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange?.(Number(e.target.value));
              onPageChange?.(1);
            }}
            className="px-2 py-0.5 rounded-lg border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)] cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange?.(Math.max(1, page - 1))}
          disabled={page <= 1 || loading}
          className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 transition cursor-pointer"
        >
          Précédent
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((pNum) => pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 2)
          .map((pNum, idx, arr) => {
            const prevNum = arr[idx - 1];
            const showEllipsis = prevNum && pNum - prevNum > 1;
            return (
              <Fragment key={pNum}>
                {showEllipsis && <span className="px-1 text-[var(--rego-ink-3,#949494)]">...</span>}
                <button
                  type="button"
                  onClick={() => onPageChange?.(pNum)}
                  disabled={loading}
                  className={`h-7 w-7 rounded-lg font-medium text-xs flex items-center justify-center transition cursor-pointer ${
                    page === pNum
                      ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                      : 'border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                  }`}
                >
                  {pNum}
                </button>
              </Fragment>
            );
          })}

        <button
          type="button"
          onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || loading}
          className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 transition cursor-pointer"
        >
          Suivant
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main tab navigation (mirrors the classic pill bar, ReGo tokens) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onMainTabChange(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
              mainTab === tab.key
                ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-bold shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]'
                : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] font-medium'
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${tab.iconClass}`} />
            <span>{tab.label}</span>
            {tab.badge}
          </button>
        ))}
      </div>

      {mainTab === 'all_orders' && (
        <>
          {/* LAYER 4: Telemetry & KPI Cards Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ReGoKpiHero
              label="Volume d'Affaires Réalisé"
              value={<ReGoAmtBox amount={totalRevenue} size="md" />}
              hint={`${filteredOrders.length} commandes affichées`}
              icon={DollarSign}
            />
            <ReGoKpiHero
              label="Commandes en Préparation"
              value={processingCount}
              hint="À expédier aujourd'hui"
              icon={Package}
            />
            <ReGoKpiHero
              label="COD Anti-Refus Urgent"
              value={urgentCodOrders.length}
              delta={urgentCodOrders.length > 0 ? "Action requise" : "À jour"}
              deltaType={urgentCodOrders.length === 0 ? "increase" : "decrease"}
              icon={ShieldAlert}
            />
            <ReGoKpiHero
              label="Colis en Acheminement"
              value={fulfilledCount}
              hint="4 transporteurs partenaires"
              icon={Truck}
            />
          </div>

          {/* LAYER 3 (Conditional): Urgent COD Warning Banner */}
          {urgentCodOrders.length > 0 && (
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                    <span>{urgentCodOrders.length} commande(s) Cash on Delivery en attente de vérification</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-extrabold uppercase">
                      Priorité Haute
                    </span>
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    La confirmation préalable par téléphone ou SMS OTP réduit fortement le taux de retour (RTO).
                  </p>
                  {codFeedback && (
                    <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 mt-1.5 bg-amber-100/70 dark:bg-amber-900/50 rounded-lg px-2.5 py-1 inline-block">
                      {codFeedback}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('cod_urgent')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <span>Filtrer les {urgentCodOrders.length} commandes</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* LAYER 5: Control Bar & Filter Toolbar (server-side filters) */}
          <ReGoCard className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#ad0505] text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Toutes ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cod_urgent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'cod_urgent'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Anti-Refus COD ({urgentCodOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('shipped')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'shipped'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>En Transit / Livrées ({fulfilledCount})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange?.(e.target.value)}
                  className={selectClasses}
                  title="Filtrer par statut"
                >
                  <option value="">{t('dashboardPages.orders.filterAll')}</option>
                  <option value="pending">{t('dashboardPages.orders.pending')}</option>
                  <option value="payment_required">{t('dashboardPages.orders.paymentRequired')}</option>
                  <option value="processing">{t('dashboardPages.orders.confirmed')}</option>
                  <option value="fulfilled">{t('dashboardPages.orders.shipped')}</option>
                  <option value="delivered">{t('dashboardPages.orders.delivered')}</option>
                  <option value="cancelled">{t('dashboardPages.orders.cancelled')}</option>
                </select>

                <select
                  value={paymentGatewayFilter}
                  onChange={(e) => onPaymentGatewayFilterChange?.(e.target.value)}
                  className={selectClasses}
                  title="Filtrer par mode de paiement"
                >
                  <option value="">{t('dashboardPages.orders.allPaymentMethods')}</option>
                  <option value="flouci">Flouci</option>
                  <option value="konnect">Konnect</option>
                  <option value="manual_mandat">{t('dashboardPages.orders.mandat')}</option>
                  <option value="cod">COD</option>
                </select>

                <select
                  value={paymentStatusFilter}
                  onChange={(e) => onPaymentStatusFilterChange?.(e.target.value)}
                  className={selectClasses}
                  title="Filtrer par statut de paiement"
                >
                  <option value="">{t('dashboardPages.orders.allPayments')}</option>
                  <option value="pending">{t('dashboardPages.orders.pending')}</option>
                  <option value="captured">{t('dashboardPages.orders.paid')}</option>
                  <option value="failed">{t('dashboardPages.orders.failed')}</option>
                  <option value="refunded">{t('dashboardPages.orders.refunded')}</option>
                </select>

                <select
                  value={fulfillmentStatusFilter}
                  onChange={(e) => onFulfillmentStatusFilterChange?.(e.target.value)}
                  className={selectClasses}
                  title="Filtrer par statut d'expédition"
                >
                  <option value="">{t('dashboardPages.orders.allFulfillment')}</option>
                  <option value="pending">{t('dashboardPages.orders.toShip')}</option>
                  <option value="preparing">{t('dashboardPages.orders.preparing')}</option>
                  <option value="shipped">{t('dashboardPages.orders.shipped')}</option>
                  <option value="delivered">{t('dashboardPages.orders.delivered')}</option>
                  <option value="cancelled">{t('dashboardPages.orders.cancelled')}</option>
                </select>

                {carrierOptions.length > 0 && (
                  <select
                    value={selectedCarrier}
                    onChange={(e) => setSelectedCarrier(e.target.value)}
                    className={selectClasses}
                    title="Filtrer par transporteur (page courante)"
                  >
                    <option value="all">Tous transporteurs</option>
                    {carrierOptions.map((c) => (
                      <option key={c} value={c}>
                        {CARRIERS_CONFIG[c]?.name || c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    placeholder={t('dashboardPages.orders.searchPlaceholder')}
                    className="w-full ps-9 pe-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#ad0505]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => onSearchChange?.('')}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void onRefresh()}
                  disabled={loading}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                  title="Rafraîchir"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Date range + export + bulk actions row */}
            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/70">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('dashboardPages.orders.from')}</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onDateFromChange?.(e.target.value)}
                    className="min-w-0 bg-transparent outline-none text-xs"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('dashboardPages.orders.to')}</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => onDateToChange?.(e.target.value)}
                    className="min-w-0 bg-transparent outline-none text-xs"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {t('dashboardPages.orders.resultCount', { total: totalCount })}
                </span>

                {fulfillableCount > 0 && onOpenBulkFulfillment && (
                  <button
                    type="button"
                    onClick={onOpenBulkFulfillment}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                    title="Ouvrir le fulfillment en masse des commandes expédiables"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Fulfillment en Masse ({fulfillableCount})</span>
                  </button>
                )}

                {onExportCsv && (
                  <button
                    type="button"
                    onClick={() => onExportCsv('filtered')}
                    disabled={exporting || loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition shadow-2xs cursor-pointer"
                  >
                    {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{t('dashboardPages.orders.exportCsv')}</span>
                  </button>
                )}

                {hasActiveFilters && onResetFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('dashboardPages.orders.reset')}</span>
                  </button>
                )}
              </div>
            </div>
          </ReGoCard>

          {/* LAYER 6: Main Operational Working Area */}
          <ReGoSplitCard
            left={
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#ad0505]" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Radar Anti-Refus COD
                    </h3>
                    <button
                      type="button"
                      onClick={toggleCodDeck}
                      title={codDeckVisible ? 'Replier le radar COD' : 'Déplier le radar COD'}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${codDeckVisible ? '' : '-rotate-90'}`} />
                    </button>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-extrabold">
                    {urgentCodOrders.length} prioritaires
                  </span>
                </div>

                {codDeckVisible && (
                  <>
                    {urgentCodOrders.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                        <p className="font-semibold">Toutes les commandes COD sont vérifiées !</p>
                        <p className="text-[11px] mt-0.5">Aucune commande à risque en attente d&apos;appel.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                        {urgentCodOrders.map((order) => {
                          const customerName = `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`.trim() || 'Client Anonyme';
                          const phone = order.shipping_address?.phone || '';
                          const city = order.shipping_address?.city || 'Tunisie';
                          const total = toNumber(order.total || order.store_total);

                          return (
                            <div
                              key={order.id}
                              className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-700 transition shadow-2xs space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {customerName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span className="font-mono text-slate-700 dark:text-slate-300">
                                      #{order.id.slice(-6).toUpperCase()}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      {city}
                                    </span>
                                  </div>
                                </div>
                                <ReGoAmtBox amount={total} size="sm" />
                              </div>

                              {/* Quick Action Buttons for COD */}
                              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                                {phone && (
                                  <a
                                    href={`tel:${phone}`}
                                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 transition"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>Appeler</span>
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => void onSendCodOtp(order.id)}
                                  disabled={sendingCodOtp}
                                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-100 transition disabled:opacity-50 cursor-pointer"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>SMS OTP</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void onUpdateCodStatus(order.id, 'confirmed')}
                                  disabled={updatingCodStatus}
                                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Confirmer</span>
                                </button>
                              </div>

                              {/* OTP Code Verification (when available) */}
                              {onVerifyCodOtp && (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const code = (otpInput[order.id] || '').trim();
                                    if (code) void onVerifyCodOtp(order.id, code);
                                  }}
                                  className="flex items-center gap-1.5"
                                >
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={otpInput[order.id] || ''}
                                    onChange={(e) =>
                                      setOtpInput((prev) => ({
                                        ...prev,
                                        [order.id]: e.target.value.replace(/\D/g, ''),
                                      }))
                                    }
                                    placeholder="Code OTP reçu..."
                                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#ad0505]"
                                  />
                                  <button
                                    type="submit"
                                    disabled={updatingCodStatus || !(otpInput[order.id] || '').trim()}
                                    className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition disabled:opacity-50 cursor-pointer"
                                  >
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>Vérifier</span>
                                  </button>
                                </form>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            }
            right={
              <div className="space-y-4">
                {selectedIdSet.size > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-fg,#111111)] bg-[var(--rego-fg,#111111)] px-3.5 py-2 text-[var(--rego-bg,#ffffff)] shadow-lg">
                    <div className="flex items-center gap-1.5 pe-2 me-1 border-e border-[var(--rego-border,#dedede)]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-bold text-[11px]">
                        {selectedIdSet.size}
                      </span>
                      <span className="text-xs font-medium hidden sm:inline">sélectionnée(s)</span>
                    </div>

                    {onOpenBulkFulfillment && (
                      <button
                        type="button"
                        onClick={onOpenBulkFulfillment}
                        title={t('dashboardPages.orders.markShipped')}
                        className="px-2.5 py-1 rounded-lg bg-[var(--rego-accent,#ad0505)] text-white text-xs font-medium hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Fulfillment en Masse</span>
                      </button>
                    )}

                    {onPrintSelected && (
                      <>
                        <button
                          type="button"
                          onClick={() => onPrintSelected('delivery_slip')}
                          className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer hidden sm:inline-block"
                        >
                          {t('dashboardPages.orders.printLabels')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrintSelected('invoice')}
                          className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer hidden md:inline-block"
                        >
                          {t('dashboardPages.orders.printInvoices')}
                        </button>
                      </>
                    )}

                    {onExportCsv && (
                      <button
                        type="button"
                        onClick={() => onExportCsv('selected')}
                        title={t('dashboardPages.orders.exportSelected')}
                        className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('dashboardPages.orders.exportSelected')}</span>
                      </button>
                    )}

                    {onToggleSelectAll && (
                      <button
                        type="button"
                        onClick={() => onToggleSelectAll(false)}
                        title={t('dashboardPages.orders.clear')}
                        className="px-2.5 py-1 rounded-lg border border-[var(--rego-border,#dedede)] text-xs font-medium hover:bg-[var(--rego-bg,#ffffff)] hover:text-[var(--rego-fg,#111111)] transition cursor-pointer flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('dashboardPages.orders.clear')}</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {onToggleSelectAll && (
                      <input
                        type="checkbox"
                        checked={orders.length > 0 && orders.every((o) => selectedIdSet.has(o.id))}
                        onChange={(e) => onToggleSelectAll(e.target.checked)}
                        className="w-4 h-4 accent-[var(--rego-accent,#ad0505)] cursor-pointer"
                        title="Sélectionner toutes les commandes de la page"
                      />
                    )}
                    <Package className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Flux Opérationnel des Commandes ({filteredOrders.length})
                    </h3>
                  </div>
                  {meta && typeof meta.total === 'number' && (
                    <span className="text-[11px] font-bold text-slate-400">
                      {meta.total} au total
                      {typeof meta.page === 'number' && typeof meta.total_pages === 'number' && meta.total_pages > 1
                        ? ` · page ${meta.page}/${meta.total_pages}`
                        : ''}
                    </span>
                  )}
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">Aucune commande trouvée</p>
                    <p className="text-[11px] mt-0.5">Modifiez vos critères de recherche ou de filtre.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                    {filteredOrders.map((order) => {
                      const customerName = `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`.trim() || 'Client Anonyme';
                      const city = order.shipping_address?.city || 'Tunisie';
                      const total = toNumber(order.total || order.store_total);
                      const isCod = isCodOrder(order);
                      const isSelected = selectedIdSet.has(order.id);
                      const dateStr = new Date(order.created_at).toLocaleDateString(dateLocale, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={order.id}
                          onClick={() => openOrderInspection(order)}
                          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-[var(--rego-accent,#ad0505)]'
                              : 'border-slate-200/80 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {onToggleSelect && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggleSelect(order.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 mt-2 accent-[var(--rego-accent,#ad0505)] cursor-pointer shrink-0"
                                title="Sélectionner la commande"
                              />
                            )}
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                  #{order.id.slice(-6).toUpperCase()}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                    order.status === 'delivered'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                                      : order.status === 'fulfilled'
                                      ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60'
                                      : order.status === 'processing'
                                      ? 'bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] border-[var(--rego-accent-line,rgba(173,5,5,0.3))]'
                                      : order.status === 'cancelled' || order.status === 'refunded'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                                  }`}
                                >
                                  {order.status}
                                </span>
                                {isCod && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold">
                                    COD
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mt-1">
                                {customerName}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span>{city}</span>
                                <span>•</span>
                                <span>{dateStr}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <ReGoAmtBox amount={total} size="sm" />
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => onPrintOrder(order, 'delivery_slip')}
                                title="Imprimer le bordereau de livraison"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openOrderInspection(order)}
                                title="Inspecter la commande"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#ad0505] hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            }
          />

          {paginationFooter}
        </>
      )}

      {mainTab === 'cod_radar' && (
        <div className="space-y-6">
          {/* COD Pre-Validation KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ReGoKpiHero
              label={t('dashboardPages.orders.codTotalOrders')}
              value={codOrders.length}
              hint={t('dashboardPages.orders.codOnDelivery')}
              icon={DollarSign}
            />
            <ReGoKpiHero
              label={t('dashboardPages.orders.codAwaitingConfirmation')}
              value={codPendingCount}
              hint={t('dashboardPages.orders.codPhoneCallRequired')}
              icon={ShieldAlert}
            />
            <ReGoKpiHero
              label={t('dashboardPages.orders.codConfirmedSecured')}
              value={codConfirmedCount}
              hint={t('dashboardPages.orders.codReadyToShip')}
              icon={ShieldCheck}
            />
            <ReGoKpiHero
              label={t('dashboardPages.orders.codRejectedFraud')}
              value={codRejectedCount}
              hint={t('dashboardPages.orders.codStockProtected')}
              icon={Ban}
            />
          </div>

          {/* COD queue */}
          <ReGoCard className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{t('dashboardPages.orders.codQueueTitle')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-normal">
                  {t('dashboardPages.orders.codQueueSubtitle')}
                </p>
              </div>
              {codFeedback && (
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg px-2.5 py-1 w-fit">
                  {codFeedback}
                </span>
              )}
            </div>

            {codOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-semibold">{t('dashboardPages.orders.codNoOrders')}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {codOrders.map((order) => {
                  const phone = order.customer_phone || order.shipping_address?.phone || '';
                  const name = `${order.customer_first_name || order.shipping_address?.first_name || ''} ${order.customer_last_name || order.shipping_address?.last_name || ''}`.trim() || 'Client';
                  const cleanPhone = phone.replace(/\D+/g, '');
                  const waPhone = cleanPhone.startsWith('216') ? cleanPhone : `216${cleanPhone}`;
                  const waText = encodeURIComponent(`Bonjour ${name}, nous confirmons votre commande PandaMarket #${order.id.slice(-8).toUpperCase()} de montant ${formatMoney(order.store_total || order.total)} pour livraison à ${order.shipping_address?.city || 'votre adresse'}. Confirmez-vous l'envoi ? Merci !`);

                  const riskScore = order.cod_risk_score ?? (order.cod_status === 'otp_verified' || order.cod_status === 'confirmed' ? 0 : 35);
                  const isHighRisk = riskScore > 60;
                  const isModerateRisk = riskScore > 25 && riskScore <= 60;
                  const isCodSecured = order.cod_status === 'confirmed' || order.cod_status === 'otp_verified';
                  const isCodRejected = order.cod_status === 'rejected' || order.cod_status === 'unreachable';
                  const dateStr = new Date(order.created_at).toLocaleDateString(dateLocale, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={order.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isHighRisk
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isHighRisk ? <ShieldAlert className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                #{order.id.slice(-8).toUpperCase()}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                  isHighRisk
                                    ? 'bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
                                    : isModerateRisk
                                    ? 'bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                                }`}
                              >
                                {isHighRisk
                                  ? t('dashboardPages.orders.riskHigh')
                                  : isModerateRisk
                                  ? t('dashboardPages.orders.riskModerate')
                                  : t('dashboardPages.orders.riskLow')}{' '}
                                ({riskScore}%)
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                  isCodSecured
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                                    : isCodRejected
                                    ? 'bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
                                    : 'bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                                }`}
                              >
                                {getCodStatusLabel(order.cod_status, t)}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mt-1">
                              {name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              {phone ? (
                                <span className="font-mono flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                  <Phone className="w-3 h-3" />
                                  {phone}
                                </span>
                              ) : (
                                <span className="italic text-rose-500">{t('dashboardPages.orders.phoneUnavailable')}</span>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {order.shipping_address?.city || t('dashboardPages.orders.cityUnknown')}
                              </span>
                              <span>•</span>
                              <span>{dateStr}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
                          <ReGoAmtBox amount={toNumber(order.store_total || order.total)} size="sm" />
                          <div className="flex items-center gap-1.5">
                            {phone && (
                              <a
                                href={`tel:${cleanPhone}`}
                                onClick={() => void onUpdateCodStatus(order.id, 'pending', 1, 'Tentative d’appel sortant')}
                                title={t('dashboardPages.orders.callCustomer')}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
                              >
                                <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                              </a>
                            )}

                            {phone && (
                              <a
                                href={`https://wa.me/${waPhone}?text=${waText}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={t('dashboardPages.orders.sendWhatsAppConfirmation')}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 transition shadow-2xs"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => void onSendCodOtp(order.id)}
                              disabled={sendingCodOtp}
                              title={t('dashboardPages.orders.otpSend')}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-blue-600" />
                            </button>

                            <button
                              type="button"
                              onClick={() => void onUpdateCodStatus(order.id, 'confirmed', 0, 'Confirmé manuellement par le vendeur')}
                              disabled={updatingCodStatus}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-medium text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition shadow-2xs flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>{t('dashboardPages.common.confirm')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => void onUpdateCodStatus(order.id, 'rejected', 0, 'Rejeté par le vendeur pour risque élevé')}
                              disabled={updatingCodStatus}
                              title={t('dashboardPages.orders.rejectCancel')}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {onVerifyCodOtp && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const code = (otpInput[order.id] || '').trim();
                            if (code) void onVerifyCodOtp(order.id, code);
                          }}
                          className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800"
                        >
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpInput[order.id] || ''}
                            onChange={(e) =>
                              setOtpInput((prev) => ({
                                ...prev,
                                [order.id]: e.target.value.replace(/\D/g, ''),
                              }))
                            }
                            placeholder={t('dashboardPages.orders.otpPlaceholder')}
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#ad0505]"
                          />
                          <button
                            type="submit"
                            disabled={updatingCodStatus || !(otpInput[order.id] || '').trim()}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition disabled:opacity-50 cursor-pointer"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Vérifier</span>
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ReGoCard>

          {paginationFooter}
        </div>
      )}

      {mainTab === 'rto_returns' && (
        <div className="space-y-6">
          {/* RTO KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ReGoKpiHero
              label={t('dashboardPages.orders.rtoGlobalRate')}
              value={`${rtoRate}%`}
              hint={t('dashboardPages.orders.rtoTargetBelow5')}
              icon={RotateCcw}
            />
            <ReGoKpiHero
              label={t('dashboardPages.orders.rtoReturnedParcels')}
              value={rtoOrders.length}
              hint={t('dashboardPages.orders.rtoStockRestored')}
              icon={Package}
            />
            <ReGoKpiHero
              label={t('dashboardPages.orders.rtoSavedValue')}
              value={<ReGoAmtBox amount={rtoSavedValue} size="md" />}
              hint={t('dashboardPages.orders.rtoStockRecovered')}
              icon={DollarSign}
            />
            <ReGoKpiHero
              label={t('dashboardPages.orders.rtoLostShippingCosts')}
              value={<ReGoAmtBox amount={rtoLostShipping} size="md" />}
              hint={t('dashboardPages.orders.rtoUnrecoverableFees')}
              icon={Truck}
            />
          </div>

          {/* RTO journal */}
          <ReGoCard noPadding className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--rego-border,#dedede)]/70 bg-[var(--rego-surface,#f5f5f5)]/60">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {t('dashboardPages.orders.rtoJournalTitle')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    {t('dashboardPages.orders.rtoJournalSubtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead className="bg-[var(--rego-surface,#f5f5f5)]/70 text-[var(--rego-ink-2,#737373)]">
                  <tr className="border-b border-[var(--rego-border,#dedede)] text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.orderNumber')}</th>
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.customer')}</th>
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.carrier')}</th>
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.rtoReason')}</th>
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.amount')}</th>
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.rtoDate')}</th>
                    <th className="px-4 py-3 text-end font-bold">{t('dashboardPages.orders.details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                  {rtoOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        {t('dashboardPages.orders.rtoNoReturns')}
                      </td>
                    </tr>
                  ) : (
                    rtoOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[var(--rego-surface,#f5f5f5)]/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900 dark:text-white font-mono">
                            #{order.id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {order.customer_first_name || order.shipping_address?.first_name} {order.customer_last_name || order.shipping_address?.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{order.shipping_address?.city}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium uppercase text-[11px] text-slate-700 dark:text-slate-300">
                            {order.carrier || 'Aramex'}
                          </span>
                          {order.tracking_number && (
                            <p className="text-[10px] font-mono text-slate-400">{order.tracking_number}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                            {getRtoLabel(order.rto_reason_code, t)}
                          </span>
                          {order.rto_notes && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">{order.rto_notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <ReGoAmtBox amount={toNumber(order.store_total || order.total)} size="sm" />
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          {new Date(order.rto_at || order.created_at).toLocaleDateString(dateLocale)}
                        </td>
                        <td className="px-4 py-3.5 text-end">
                          <button
                            type="button"
                            onClick={() => openOrderInspection(order)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition shadow-2xs cursor-pointer"
                          >
                            {t('dashboardPages.orders.viewDetails')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ReGoCard>

          {paginationFooter}
        </div>
      )}

      {mainTab === 'courier_settlements' && (
        <div className="space-y-6">
          {/* Settlement KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ReGoKpiHero
              label={t('dashboardPages.orders.settlementTotalCollected')}
              value={<ReGoAmtBox amount={settlementsSummary.total_collected} size="md" />}
              hint={t('dashboardPages.orders.settlementGrossFromCustomers')}
              icon={DollarSign}
            />
            <ReGoKpiHero
              label={t('dashboardPages.orders.settlementFeesDeducted')}
              value={
                <span className="font-mono font-black tabular-nums text-rose-600 dark:text-rose-400">
                  -{formatMoney(settlementsSummary.total_courier_fees)}
                </span>
              }
              hint={t('dashboardPages.orders.settlementCarrierBilling')}
              icon={Truck}
            />
            <ReGoKpiHero
              label={t('dashboardPages.orders.settlementAwaitingTransfer')}
              value={<ReGoAmtBox amount={settlementsSummary.pending_payout} size="md" />}
              hint={t('dashboardPages.orders.settlementPendingCount', { count: settlementsSummary.pending_count })}
              icon={Clock3}
            />
            <ReGoKpiHero
              label={t('dashboardPages.orders.settlementNetToVendor')}
              value={<ReGoAmtBox amount={settlementsSummary.settled_payout} size="md" />}
              hint={t('dashboardPages.orders.settlementSettledCount', { count: settlementsSummary.settled_count })}
              icon={CheckCircle2}
            />
          </div>

          {/* Settlement ledger */}
          <ReGoCard noPadding className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--rego-border,#dedede)]/70 bg-[var(--rego-surface,#f5f5f5)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>{t('dashboardPages.orders.settlementLedgerTitle')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-normal">
                  {t('dashboardPages.orders.settlementLedgerSubtitle')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={settlementCarrierFilter}
                  onChange={(e) => onSettlementCarrierFilterChange?.(e.target.value)}
                  className={selectClasses}
                  title="Filtrer les règlements par transporteur"
                >
                  <option value="all">{t('dashboardPages.orders.allCarriers')}</option>
                  <option value="aramex">Aramex</option>
                  <option value="laposte">La Poste Tunisienne</option>
                  <option value="first_delivery">First Delivery</option>
                  <option value="livri">Livri</option>
                  <option value="own_fleet">{t('dashboardPages.orders.ownFleet')}</option>
                </select>

                <select
                  value={settlementStatusFilter}
                  onChange={(e) => onSettlementStatusFilterChange?.(e.target.value)}
                  className={selectClasses}
                  title="Filtrer les règlements par statut"
                >
                  <option value="all">{t('dashboardPages.orders.allStatuses')}</option>
                  <option value="pending">{t('dashboardPages.orders.settlementAwaitingTransfer')}</option>
                  <option value="settled">{t('dashboardPages.orders.settlementStatusSettled')}</option>
                  <option value="disputed">{t('dashboardPages.orders.settlementStatusDisputed')}</option>
                </select>

                {onExportSettlementsCsv && (
                  <button
                    type="button"
                    onClick={onExportSettlementsCsv}
                    disabled={settlements.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Exporter CSV</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead className="bg-[var(--rego-surface,#f5f5f5)]/70 text-[var(--rego-ink-2,#737373)]">
                  <tr className="border-b border-[var(--rego-border,#dedede)] text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.orderNumber')}</th>
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.carrier')}</th>
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.settlementCollectedFromCustomer')}</th>
                    <th className="px-4 py-3 text-start font-bold">Frais Livraison</th>
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.settlementNetToPay')}</th>
                    <th className="px-4 py-3 text-start font-bold">{t('dashboardPages.orders.settlementStatusHeader')}</th>
                    <th className="px-4 py-3 text-end font-bold">Rapprochement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        {settlementsLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                            <span>{t('dashboardPages.orders.settlementLoading')}</span>
                          </div>
                        ) : (
                          <span>{t('dashboardPages.orders.settlementEmpty')}</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    settlements.map((st) => (
                      <tr key={st.id} className="hover:bg-[var(--rego-surface,#f5f5f5)]/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900 dark:text-white font-mono">
                            #{st.order_id.slice(-8).toUpperCase()}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{st.customer_name || 'Client'}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium uppercase text-[11px] text-slate-800 dark:text-slate-200">
                            {st.carrier}
                          </span>
                          {st.tracking_number && (
                            <p className="text-[10px] font-mono text-slate-400">{st.tracking_number}</p>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <ReGoAmtBox amount={toNumber(st.collected_amount)} size="sm" />
                        </td>

                        <td className="px-4 py-3.5 font-semibold text-slate-600 dark:text-slate-400 font-mono text-xs">
                          -{formatMoney(st.courier_fee)}
                        </td>

                        <td className="px-4 py-3.5 font-semibold text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                          +{formatMoney(st.net_payout)}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              st.status === 'settled'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                                : st.status === 'disputed'
                                ? 'bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
                                : 'bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                            }`}
                          >
                            {st.status === 'settled'
                              ? t('dashboardPages.orders.settlementStatusSettled')
                              : st.status === 'disputed'
                              ? t('dashboardPages.orders.settlementStatusDisputed')
                              : t('dashboardPages.orders.settlementStatusPending')}
                          </span>
                          {st.settlement_reference && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {t('dashboardPages.orders.settlementRef')} {st.settlement_reference}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-end">
                          {onReconcileSettlement && (
                            <button
                              type="button"
                              onClick={() => onReconcileSettlement(st)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition shadow-2xs cursor-pointer"
                            >
                              {t('dashboardPages.orders.settlementReconcile')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ReGoCard>
        </div>
      )}

      {/* LAYER 7: Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Commande #${selectedOrder.id.slice(-6).toUpperCase()}` : 'Détails de la commande'}
        subtitle={selectedOrder ? `Créée le ${new Date(selectedOrder.created_at).toLocaleString(dateLocale)}` : ''}
        width="w-full max-w-lg"
      >
        {selectedOrder && (
          <div className="space-y-5">
            {/* Customer & Address Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Destinataire
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {selectedOrder.shipping_address?.first_name} {selectedOrder.shipping_address?.last_name}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`tel:${selectedOrder.shipping_address?.phone}`} className="hover:underline font-mono">
                    {selectedOrder.shipping_address?.phone || 'Non renseigné'}
                  </a>
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {selectedOrder.shipping_address?.address_line_1 || ''}, {selectedOrder.shipping_address?.city || 'Tunisie'}
                  </span>
                </p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Paiement & Montant
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Mode de paiement</span>
                <span className="text-xs font-bold uppercase">{selectedOrder.payment_gateway}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Total à encaisser</span>
                <ReGoAmtBox amount={toNumber(selectedOrder.total || selectedOrder.store_total)} size="md" />
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => onPrintOrder(selectedOrder, 'delivery_slip')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Bordereau</span>
              </button>
              <button
                type="button"
                onClick={() => onPrintOrder(selectedOrder, 'invoice')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Facture</span>
              </button>
            </div>

            {canGenerateLabel(selectedOrder) && (
              <button
                type="button"
                onClick={() => void onGenerateLabel(selectedOrder)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>{t('dashboardPages.orders.generateLabel')}</span>
              </button>
            )}

            {selectedOrder.status !== 'fulfilled' && selectedOrder.status !== 'delivered' && (
              <button
                type="button"
                onClick={() => onFulfillOrder(selectedOrder)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ad0505] hover:bg-[#8f0404] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Expédier via transporteur tunisien</span>
              </button>
            )}

            {canCancelFulfillment(selectedOrder) && (
              <button
                type="button"
                onClick={() => onCancelFulfillment(selectedOrder)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{t('dashboardPages.orders.cancelThisShipment')}</span>
              </button>
            )}
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
