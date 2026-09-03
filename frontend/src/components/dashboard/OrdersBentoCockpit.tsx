'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Truck,
  Phone,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Search,
  Copy,
  Check,
  FileText,
  Printer,
  ShieldAlert,
  DollarSign,
  Filter,
  ArrowUpRight,
  MessageSquare,
  PhoneCall,
  XCircle,
  Ban,
  RefreshCw,
  Sparkles,
  MapPin,
  User,
  CreditCard,
  Send,
  X,
  Eye,
  ChevronRight,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getResizedImageUrl } from '@/lib/image-url';
import type {
  Order,
  OrderMeta,
  OrderSummary,
  CodVerification,
  OrderItem,
  ShippingAddress,
  SellerOrderShipment,
} from '@/app/hub/dashboard/orders/page';

export type { Order, OrderMeta, OrderSummary, CodVerification, OrderItem, ShippingAddress, SellerOrderShipment };

export interface OrdersBentoCockpitProps {
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
}

function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatPrice(price: unknown, currency = 'TND'): string {
  return `${toNumber(price).toFixed(3)} ${currency}`;
}

type CarrierKey = 'aramex' | 'laposte_rapid' | 'runex' | 'first_delivery' | 'unassigned' | 'other';

interface CarrierMeta {
  key: CarrierKey;
  id: string;
  name: string;
  badge: string;
  sla: string;
  baseRate: string;
  colorClass: string;
  bgLight: string;
  borderClass: string;
  badgeBg: string;
}

const TUNISIAN_CARRIER_CONFIG: Record<string, CarrierMeta> = {
  aramex: {
    key: 'aramex',
    id: 'aramex',
    name: 'Aramex Tunisie',
    badge: '🔴 Aramex Express',
    sla: '24-48h National',
    baseRate: '7.500 TND',
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50/50 dark:bg-rose-950/20',
    borderClass: 'border-rose-200/80 dark:border-rose-800/80',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800',
  },
  laposte_rapid: {
    key: 'laposte_rapid',
    id: 'laposte_rapid',
    name: 'Rapid-Poste (La Poste)',
    badge: '🟡 Rapid-Poste',
    sla: '24-72h 24 Gouv',
    baseRate: '6.500 TND',
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50/50 dark:bg-amber-950/20',
    borderClass: 'border-amber-200/80 dark:border-amber-800/80',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
  },
  runex: {
    key: 'runex',
    id: 'runex',
    name: 'Runex Express',
    badge: '🚀 Runex',
    sla: '24-48h Sfax & Sud',
    baseRate: '7.000 TND',
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50/50 dark:bg-blue-950/20',
    borderClass: 'border-blue-200/80 dark:border-blue-800/80',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800',
  },
  first_delivery: {
    key: 'first_delivery',
    id: 'first_delivery',
    name: 'First Delivery',
    badge: '⚡ First Delivery',
    sla: '12-24h Grand Tunis & Sahel',
    baseRate: '8.000 TND',
    colorClass: 'text-violet-600 dark:text-violet-400',
    bgLight: 'bg-violet-50/50 dark:bg-violet-950/20',
    borderClass: 'border-violet-200/80 dark:border-violet-800/80',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800',
  },
};

function identifyCarrier(carrierStr?: string | null): CarrierKey {
  if (!carrierStr || !carrierStr.trim()) return 'unassigned';
  const c = carrierStr.toLowerCase();
  if (c.includes('aramex')) return 'aramex';
  if (c.includes('poste') || c.includes('rapid')) return 'laposte_rapid';
  if (c.includes('runex')) return 'runex';
  if (c.includes('first')) return 'first_delivery';
  return 'other';
}

/**
 * Determines whether an order genuinely requires urgent COD pre-validation.
 * Strictly excludes orders that are already delivered, cancelled, refunded,
 * or returned at either the master order or store fulfillment level.
 */
export function isUrgentCodOrder(order: Order): boolean {
  const gateway = (order.payment_gateway || '').trim().toLowerCase();
  if (gateway !== 'cod') return false;

  const codStatus = (order.cod_status || '').trim().toLowerCase();
  const isPendingCod = !codStatus || codStatus === 'pending';
  if (!isPendingCod) return false;

  const status = (order.status || '').trim().toLowerCase();
  const fStatus = (order.fulfillment_status || '').trim().toLowerCase();
  const pStatus = (order.payment_status || '').trim().toLowerCase();

  // Exclude cancelled orders (master order or store fulfillment)
  if (status === 'cancelled' || fStatus === 'cancelled') return false;

  // Exclude delivered orders (master order or store fulfillment)
  if (status === 'delivered' || fStatus === 'delivered') return false;

  // Exclude refunded orders (master order or payment status)
  if (status === 'refunded' || pStatus === 'refunded') return false;

  // Exclude returned / RTO orders
  if (Boolean(order.rto_reason_code) || fStatus === 'returned' || fStatus === 'rto') return false;

  return true;
}

export function OrdersBentoCockpit({
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
  updatingCodStatus = false,
  sendingCodOtp = false,
  codFeedback,
  dir = 'ltr',
}: OrdersBentoCockpitProps) {
  const { t, locale } = useLocale();

  // Filter and view states
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);
  const [streamFilter, setStreamFilter] = useState<'all' | 'ready_to_ship' | 'in_transit' | 'delivered' | 'cod_urgent' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  // 1. Courier Dispatch Pipeline Aggregations
  const carrierPipelines = useMemo(() => {
    const counts: Record<CarrierKey, { total: number; dispatched: number; inTransit: number; delivered: number; pending: number; codVolume: number }> = {
      aramex: { total: 0, dispatched: 0, inTransit: 0, delivered: 0, pending: 0, codVolume: 0 },
      laposte_rapid: { total: 0, dispatched: 0, inTransit: 0, delivered: 0, pending: 0, codVolume: 0 },
      runex: { total: 0, dispatched: 0, inTransit: 0, delivered: 0, pending: 0, codVolume: 0 },
      first_delivery: { total: 0, dispatched: 0, inTransit: 0, delivered: 0, pending: 0, codVolume: 0 },
      unassigned: { total: 0, dispatched: 0, inTransit: 0, delivered: 0, pending: 0, codVolume: 0 },
      other: { total: 0, dispatched: 0, inTransit: 0, delivered: 0, pending: 0, codVolume: 0 },
    };

    orders.forEach((order) => {
      const carrierKey = identifyCarrier(order.carrier);
      const target = counts[carrierKey];
      if (!target) return;

      const orderAmount = toNumber(order.store_total ?? order.total);
      target.total += 1;

      if (order.payment_gateway === 'cod') {
        target.codVolume += orderAmount;
      }

      const fStatus = order.fulfillment_status;
      const isDelivered = fStatus === 'delivered' || order.status === 'delivered';
      const isDispatched = fStatus === 'fulfilled' || fStatus === 'shipped' || order.status === 'processing';
      const isPending = fStatus === 'pending' || fStatus === 'preparing' || (!fStatus && order.status === 'pending');

      if (isDelivered) {
        target.delivered += 1;
      } else if (isDispatched) {
        target.dispatched += 1;
        target.inTransit += 1;
      } else if (isPending) {
        target.pending += 1;
      }
    });

    return counts;
  }, [orders]);

  // 2. Urgent COD Orders (Pending confirmation)
  const urgentCodOrders = useMemo(() => {
    return orders
      .filter(isUrgentCodOrder)
      .sort((a, b) => (b.cod_risk_score ?? 0) - (a.cod_risk_score ?? 0));
  }, [orders]);

  // 3. Filtered Card Stream
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Carrier filter (strictly unified with identifyCarrier)
      if (selectedCarrier) {
        const key = identifyCarrier(order.carrier);
        if (key !== selectedCarrier) return false;
      }

      // Stream category filter
      if (streamFilter === 'ready_to_ship') {
        const isReady = order.fulfillment_status === 'pending' || order.fulfillment_status === 'preparing';
        if (!isReady) return false;
      } else if (streamFilter === 'in_transit') {
        const isInTransit = order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'shipped';
        if (!isInTransit) return false;
      } else if (streamFilter === 'delivered') {
        const isDelivered = order.fulfillment_status === 'delivered' || order.status === 'delivered';
        if (!isDelivered) return false;
      } else if (streamFilter === 'cod_urgent') {
        if (!isUrgentCodOrder(order)) return false;
      } else if (streamFilter === 'cancelled') {
        const isCancelled = order.status === 'cancelled' || Boolean(order.rto_reason_code);
        if (!isCancelled) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchId = order.id.toLowerCase().includes(q);
        const matchCustomer = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.toLowerCase().includes(q);
        const matchPhone = (order.customer_phone || '').toLowerCase().includes(q);
        const matchCity = (order.shipping_address?.city || '').toLowerCase().includes(q);
        const matchCarrier = (order.carrier || '').toLowerCase().includes(q);
        const matchTracking = (order.tracking_number || '').toLowerCase().includes(q);
        if (!matchId && !matchCustomer && !matchPhone && !matchCity && !matchCarrier && !matchTracking) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedCarrier, streamFilter, searchQuery]);

  const summary = meta?.summary;

  return (
    <div dir={dir} className="space-y-5 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* COCKPIT HERO SUMMARY BANNER */}
      {/* ========================================================================= */}
      <section
        aria-label="Cockpit des Commandes"
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs">
                <Truck className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Cockpit Logistique & Expéditions
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                Bento View
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilotage des transporteurs tunisiens, validation express des commandes contre remboursement (COD), et flux visuel interactif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300">
              <Clock3 className="w-3.5 h-3.5 text-slate-400" />
              <span>SLA Expédition: </span>
              <strong className="text-slate-900 dark:text-white font-bold">
                {summary?.fulfillment_sla_rate ? `${summary.fulfillment_sla_rate}%` : '98.5%'}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('dashboardPages.orders.refresh') || 'Actualiser'}</span>
            </button>
          </div>
        </div>

        {/* Feedback alert if any */}
        {codFeedback && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{codFeedback}</span>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 1. COURIER DISPATCH PIPELINE CARDS (TUNISIAN TRANSPORTEURS) */}
      {/* ========================================================================= */}
      <section aria-label="Pipeline des transporteurs">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Pipeline des Transporteurs Tunisiens
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              (Cliquez sur un transporteur pour filtrer le flux)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {carrierPipelines.other.total > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCarrier(selectedCarrier === 'other' ? null : 'other')}
                className={`text-xs px-2.5 py-1 rounded-xl font-medium border transition-colors inline-flex items-center gap-1.5 shadow-2xs ${
                  selectedCarrier === 'other'
                    ? 'ring-2 ring-slate-400 bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>Autres transporteurs:</span>
                <strong className="font-mono font-bold">{carrierPipelines.other.total}</strong>
              </button>
            )}

            {selectedCarrier && (
              <button
                type="button"
                onClick={() => setSelectedCarrier(null)}
                className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Effacer filtre transporteur</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Aramex */}
          <button
            type="button"
            onClick={() => setSelectedCarrier(selectedCarrier === 'aramex' ? null : 'aramex')}
            className={`text-left rounded-2xl border p-4 transition-all shadow-2xs relative flex flex-col justify-between ${
              selectedCarrier === 'aramex'
                ? 'ring-2 ring-rose-500 border-rose-300 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-950/20'
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800">
                  🔴 Aramex Express
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">24-48h</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {carrierPipelines.aramex.total} <span className="text-xs font-normal text-slate-500">colis</span>
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>En transit:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{carrierPipelines.aramex.inTransit}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Livrés:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{carrierPipelines.aramex.delivered}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total COD:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{formatPrice(carrierPipelines.aramex.codVolume)}</span>
              </div>
            </div>
          </button>

          {/* Card 2: Rapid-Poste */}
          <button
            type="button"
            onClick={() => setSelectedCarrier(selectedCarrier === 'laposte_rapid' ? null : 'laposte_rapid')}
            className={`text-left rounded-2xl border p-4 transition-all shadow-2xs relative flex flex-col justify-between ${
              selectedCarrier === 'laposte_rapid'
                ? 'ring-2 ring-amber-500 border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20'
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                  🟡 Rapid-Poste
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">24-72h</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {carrierPipelines.laposte_rapid.total} <span className="text-xs font-normal text-slate-500">colis</span>
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>En transit:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{carrierPipelines.laposte_rapid.inTransit}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Livrés:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{carrierPipelines.laposte_rapid.delivered}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total COD:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{formatPrice(carrierPipelines.laposte_rapid.codVolume)}</span>
              </div>
            </div>
          </button>

          {/* Card 3: Runex Express */}
          <button
            type="button"
            onClick={() => setSelectedCarrier(selectedCarrier === 'runex' ? null : 'runex')}
            className={`text-left rounded-2xl border p-4 transition-all shadow-2xs relative flex flex-col justify-between ${
              selectedCarrier === 'runex'
                ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/20'
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                  🚀 Runex Express
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">24-48h</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {carrierPipelines.runex.total} <span className="text-xs font-normal text-slate-500">colis</span>
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>En transit:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{carrierPipelines.runex.inTransit}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Livrés:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{carrierPipelines.runex.delivered}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total COD:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{formatPrice(carrierPipelines.runex.codVolume)}</span>
              </div>
            </div>
          </button>

          {/* Card 4: First Delivery */}
          <button
            type="button"
            onClick={() => setSelectedCarrier(selectedCarrier === 'first_delivery' ? null : 'first_delivery')}
            className={`text-left rounded-2xl border p-4 transition-all shadow-2xs relative flex flex-col justify-between ${
              selectedCarrier === 'first_delivery'
                ? 'ring-2 ring-violet-500 border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-950/20'
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800">
                  ⚡ First Delivery
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">12-24h</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {carrierPipelines.first_delivery.total} <span className="text-xs font-normal text-slate-500">colis</span>
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>En transit:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{carrierPipelines.first_delivery.inTransit}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Livrés:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{carrierPipelines.first_delivery.delivered}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total COD:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{formatPrice(carrierPipelines.first_delivery.codVolume)}</span>
              </div>
            </div>
          </button>

          {/* Card 5: Unassigned / Ready to dispatch */}
          <button
            type="button"
            onClick={() => setSelectedCarrier(selectedCarrier === 'unassigned' ? null : 'unassigned')}
            className={`text-left rounded-2xl border p-4 transition-all shadow-2xs relative flex flex-col justify-between ${
              selectedCarrier === 'unassigned'
                ? 'ring-2 ring-emerald-500 border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20'
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  📦 Prêt à expédier
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">À assigner</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {carrierPipelines.unassigned.total} <span className="text-xs font-normal text-slate-500">colis</span>
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>À préparer:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">{carrierPipelines.unassigned.pending}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Sans transporteur:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{carrierPipelines.unassigned.total}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Montant COD:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{formatPrice(carrierPipelines.unassigned.codVolume)}</span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. URGENT COD CONFIRMATION ACTION CARD / DECK */}
      {/* ========================================================================= */}
      <section
        aria-label="Validation urgente des commandes COD"
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Validation Urgente COD & Anti-Refus
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Commandes contre remboursement en attente de confirmation téléphonique ou SMS OTP avant expédition.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
              {urgentCodOrders.length} à traiter
            </span>
          </div>
        </div>

        {urgentCodOrders.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Toutes les commandes COD sont confirmées !
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Aucune commande contre remboursement en attente de pré-validation. Vos colis confirmés sont prêts à être remis aux transporteurs.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {urgentCodOrders.map((order) => {
              const riskScore = order.cod_risk_score ?? 0;
              const isHighRisk = riskScore > 50;
              const isMediumRisk = riskScore > 25 && riskScore <= 50;
              const callAttempts = order.cod_verification?.call_attempts || 0;
              const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim() || 'Client PandaMarket';
              const phone = order.customer_phone || order.shipping_address?.phone || '';
              const orderAmount = formatPrice(order.store_total ?? order.total, order.currency || 'TND');
              const otpValue = otpInputs[order.id] || '';

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  {/* Card Header: Order ID & Risk Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(order.id, `ord-${order.id}`)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          title="Copier l'identifiant"
                        >
                          {copiedId === `ord-${order.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isHighRisk
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800'
                            : isMediumRisk
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800'
                        }`}
                      >
                        <ShieldAlert className="h-3 w-3" />
                        Risque {riskScore}/100
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {callAttempts} appel{callAttempts > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info & Amount */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{customerName}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white font-mono shrink-0">
                        {orderAmount}
                      </span>
                    </div>

                    {order.shipping_address?.city && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{order.shipping_address.city}</span>
                        {order.shipping_address.postal_code && <span>({order.shipping_address.postal_code})</span>}
                      </div>
                    )}
                  </div>

                  {/* Items summary */}
                  {order.items && order.items.length > 0 && (
                    <div className="rounded-lg bg-white dark:bg-slate-900/60 p-2 border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                      <p className="line-clamp-1 font-medium text-slate-800 dark:text-slate-200">
                        {order.items[0]?.product_title || 'Article'}
                        {order.items.length > 1 && ` +${order.items.length - 1} autre(s)`}
                      </p>
                    </div>
                  )}

                  {/* 1-Click Action Transition Buttons */}
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    {/* Confirmer */}
                    <button
                      type="button"
                      disabled={updatingCodStatus}
                      onClick={() => void onUpdateCodStatus(order.id, 'confirmed')}
                      className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                      title="Confirmer la commande"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmer</span>
                    </button>

                    {/* Appeler (tel: dialer) */}
                    {phone ? (
                      <a
                        href={`tel:${phone}`}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 hover:bg-blue-100 text-xs font-semibold shadow-2xs transition"
                        title="Appeler le client"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Appeler</span>
                      </a>
                    ) : null}

                    {/* SMS OTP */}
                    <button
                      type="button"
                      disabled={sendingCodOtp}
                      onClick={() => void onSendCodOtp(order.id)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800 hover:bg-violet-100 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                      title="Envoyer un code OTP par SMS"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>SMS OTP</span>
                    </button>

                    {/* Injoignable */}
                    <button
                      type="button"
                      disabled={updatingCodStatus}
                      onClick={() => void onUpdateCodStatus(order.id, 'unreachable', 1, 'Client injoignable par téléphone')}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 hover:bg-amber-100 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                      title="Marquer comme injoignable (+1 appel)"
                    >
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>Injoignable</span>
                    </button>

                    {/* Refuser */}
                    <button
                      type="button"
                      disabled={updatingCodStatus}
                      onClick={() => void onUpdateCodStatus(order.id, 'rejected', 0, 'Commande rejetée pour risque de refus')}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 hover:bg-rose-100 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                      title="Refuser et rejeter la commande"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Refuser</span>
                    </button>
                  </div>

                  {/* Inline OTP Verification if onVerifyCodOtp is provided */}
                  {onVerifyCodOtp && (
                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Code OTP client..."
                        value={otpValue}
                        onChange={(e) => setOtpInputs({ ...otpInputs, [order.id]: e.target.value })}
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 outline-none"
                      />
                      <button
                        type="button"
                        disabled={!otpValue.trim() || verifyingOrderId === order.id}
                        onClick={async () => {
                          setVerifyingOrderId(order.id);
                          try {
                            await onVerifyCodOtp(order.id, otpValue.trim());
                            setOtpInputs({ ...otpInputs, [order.id]: '' });
                          } finally {
                            setVerifyingOrderId(null);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        Valider
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE VISUAL CARD STREAM */}
      {/* ========================================================================= */}
      <section aria-label="Flux visuel interactif des commandes" className="space-y-4">
        {/* Stream Filter & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          {/* Quick status tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'all', label: 'Toutes les commandes', count: orders.length },
              { key: 'ready_to_ship', label: 'À expédier', count: orders.filter(o => o.fulfillment_status === 'pending' || o.fulfillment_status === 'preparing').length },
              { key: 'in_transit', label: 'En livraison', count: orders.filter(o => o.fulfillment_status === 'fulfilled' || o.fulfillment_status === 'shipped').length },
              { key: 'delivered', label: 'Livrées', count: orders.filter(o => o.fulfillment_status === 'delivered' || o.status === 'delivered').length },
              { key: 'cod_urgent', label: 'Urgent COD', count: urgentCodOrders.length },
              { key: 'cancelled', label: 'Annulées/Retours', count: orders.filter(o => o.status === 'cancelled' || Boolean(o.rto_reason_code)).length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStreamFilter(tab.key as typeof streamFilter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors ${
                  streamFilter === tab.key
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  streamFilter === tab.key
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher commande, client, ville..."
              className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-600 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Carrier Banner if active */}
        {selectedCarrier && (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-600 dark:text-slate-300">Filtre transporteur actif:</span>
              <strong className="text-slate-900 dark:text-white font-semibold">
                {selectedCarrier === 'unassigned'
                  ? 'Prêt à expédier (Sans transporteur)'
                  : selectedCarrier === 'other'
                  ? 'Autres transporteurs'
                  : TUNISIAN_CARRIER_CONFIG[selectedCarrier]?.name || selectedCarrier}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCarrier(null)}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
            >
              Afficher tous les transporteurs
            </button>
          </div>
        )}

        {/* Cards Stream Grid */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3 shadow-2xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Aucune commande trouvée
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Aucune commande ne correspond aux filtres ou à la recherche appliquée. Essayez de réinitialiser vos critères.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCarrier(null);
                setStreamFilter('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 shadow-2xs"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim() || 'Client';
              const carrierKey = identifyCarrier(order.carrier);
              const carrierConfig = TUNISIAN_CARRIER_CONFIG[carrierKey];
              const phone = order.customer_phone || order.shipping_address?.phone || '';
              const orderTotal = formatPrice(order.store_total ?? order.total, order.currency || 'TND');

              const isFulfillable = order.fulfillment_status === 'pending' || order.fulfillment_status === 'preparing';
              const isFulfilled = order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'shipped';
              const isDelivered = order.fulfillment_status === 'delivered' || order.status === 'delivered';

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  {/* Top: Order header & badges */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectOrder(order)}
                          className="font-mono text-sm font-bold text-slate-900 dark:text-white hover:underline text-left"
                        >
                          #{order.id.slice(-8).toUpperCase()}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(order.id, `stream-${order.id}`)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          title="Copier ID"
                        >
                          {copiedId === `stream-${order.id}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Badges: Payment & Fulfillment */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Payment Gateway Badge */}
                      {order.payment_gateway === 'cod' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                          <DollarSign className="w-3 h-3" />
                          COD {order.cod_status ? `(${order.cod_status})` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                          <CreditCard className="w-3 h-3" />
                          {order.payment_gateway.toUpperCase()}
                        </span>
                      )}

                      {/* Fulfillment Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          isDelivered
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800'
                            : isFulfilled
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800'
                            : isFulfillable
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Package className="w-3 h-3" />
                        {isDelivered
                          ? 'Livrée'
                          : isFulfilled
                          ? 'Expédiée'
                          : order.fulfillment_status === 'preparing'
                          ? 'En préparation'
                          : 'À expédier'}
                      </span>
                    </div>

                    {/* Customer & Destination Summary */}
                    <div className="space-y-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 truncate">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{customerName}</span>
                        </div>
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline shrink-0"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>{phone}</span>
                          </a>
                        )}
                      </div>

                      {order.shipping_address?.city && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {order.shipping_address.city}
                            {order.shipping_address.address_line_1 && `, ${order.shipping_address.address_line_1}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Items Thumbnails and Summary */}
                    {order.items && order.items.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5"
                            >
                              <img
                                src={getResizedImageUrl(item.thumbnail, 'thumbnail')}
                                alt={item.product_title || 'Article'}
                                className="h-full w-full object-cover rounded-md"
                              />
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                              +{order.items.length - 3}
                            </div>
                          )}
                          <div className="text-xs text-slate-600 dark:text-slate-400 pl-1 truncate">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                              {order.items[0]?.product_title || 'Article'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {order.items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0)} article(s) au total
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Carrier & Tracking indicator */}
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        {carrierConfig ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {carrierConfig.name}
                          </span>
                        ) : order.carrier ? (
                          <span className="font-medium text-slate-700 dark:text-slate-300">{order.carrier}</span>
                        ) : (
                          <span className="text-slate-400 italic">Transporteur non assigné</span>
                        )}
                      </div>

                      {order.tracking_number && (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          <span>{order.tracking_number}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(order.tracking_number || '', `track-${order.id}`)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Copier le numéro de suivi"
                          >
                            {copiedId === `track-${order.id}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Price & Quick Action Toolbar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400 font-medium">Total Commande:</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                        {orderTotal}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* View details */}
                      <button
                        type="button"
                        onClick={() => onSelectOrder(order)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Détails</span>
                      </button>

                      {/* Expédier / Préparer */}
                      {isFulfillable && (
                        <button
                          type="button"
                          onClick={() => onFulfillOrder(order)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold text-white dark:text-slate-900 transition shadow-2xs"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Expédier</span>
                        </button>
                      )}

                      {/* Label Bordereau */}
                      <button
                        type="button"
                        onClick={() => onGenerateLabel(order)}
                        className="inline-flex items-center justify-center gap-1 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition shadow-2xs"
                        title="Générer / Imprimer Bordereau"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Facture */}
                      <button
                        type="button"
                        onClick={() => onPrintOrder(order, 'invoice')}
                        className="inline-flex items-center justify-center gap-1 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition shadow-2xs"
                        title="Imprimer Facture"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>

                      {/* Annuler expédition si expédiée */}
                      {isFulfilled && (
                        <button
                          type="button"
                          onClick={() => onCancelFulfillment(order)}
                          className="inline-flex items-center justify-center gap-1 p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 transition shadow-2xs"
                          title="Annuler l'expédition"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
