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
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getResizedImageUrl } from '@/lib/image-url';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import type {
  Order,
  OrderMeta,
  OrderSummary,
  CodVerification,
  OrderItem,
  ShippingAddress,
  SellerOrderShipment,
} from '@/app/hub/dashboard/orders/page';

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
}

function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
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
}: OrdersReGoCockpitProps) {
  const { t } = useLocale();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [otpInput, setOtpInput] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'cod_urgent' | 'shipped'>('all');

  // Derive metrics
  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + toNumber(o.total || o.store_total), 0);
  }, [orders]);

  const urgentCodOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.payment_gateway === 'cod' || o.payment_gateway === 'cash_on_delivery') &&
        (o.status === 'pending' || o.status === 'processing')
    );
  }, [orders]);

  const processingCount = useMemo(() => {
    return orders.filter((o) => o.status === 'processing').length;
  }, [orders]);

  const fulfilledCount = useMemo(() => {
    return orders.filter((o) => o.status === 'fulfilled' || o.status === 'delivered').length;
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeTab === 'cod_urgent') {
        const isCod = order.payment_gateway === 'cod' || order.payment_gateway === 'cash_on_delivery';
        const isPending = order.status === 'pending' || order.status === 'processing';
        if (!isCod || !isPending) return false;
      } else if (activeTab === 'shipped') {
        if (order.status !== 'fulfilled' && order.status !== 'delivered') return false;
      }

      if (selectedStatus !== 'all' && order.status !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = order.id.toLowerCase().includes(q);
        const nameMatch = `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`
          .toLowerCase()
          .includes(q);
        const phoneMatch = (order.shipping_address?.phone || '').includes(q);
        const cityMatch = (order.shipping_address?.city || '')
          .toLowerCase()
          .includes(q);
        if (!idMatch && !nameMatch && !phoneMatch && !cityMatch) return false;
      }

      return true;
    });
  }, [orders, activeTab, selectedStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* LAYER 4: Telemetry & KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ReGoKpiHero
          label="Volume d'Affaires Réalisé"
          value={<ReGoAmtBox amount={totalRevenue} size="md" />}
          delta="+16.4%"
          deltaType="increase"
          deltaLabel="ce mois"
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
                La confirmation préalable par téléphone ou SMS OTP réduit le taux de retour (RTO) tunisien de 42% à moins de 8%.
              </p>
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

      {/* LAYER 5: Control Bar & Filter Toolbar */}
      <ReGoCard className="p-3 sm:p-4">
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

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Réf, client, téléphone..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#ad0505]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-extrabold">
                {urgentCodOrders.length} prioritaires
              </span>
            </div>

            {urgentCodOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-semibold">Toutes les commandes COD sont vérifiées !</p>
                <p className="text-[11px] mt-0.5">Aucune commande à risque en attente d'appel.</p>
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
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Flux Opérationnel des Commandes ({filteredOrders.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Cliquez pour inspecter la commande
              </span>
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
                  const isCod = order.payment_gateway === 'cod' || order.payment_gateway === 'cash_on_delivery';
                  const dateStr = new Date(order.created_at).toLocaleDateString('fr-TN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        void onSelectOrder(order);
                      }}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <ReGoStatusChip
                              status={
                                order.status === 'delivered'
                                  ? 'ok'
                                  : order.status === 'fulfilled'
                                  ? 'info'
                                  : order.status === 'processing'
                                  ? 'accent'
                                  : order.status === 'cancelled' || order.status === 'refunded'
                                  ? 'err'
                                  : 'warn'
                              }
                              label={order.status}
                            />
                            {isCod && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold">
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
                            onClick={() => {
                              setSelectedOrder(order);
                              void onSelectOrder(order);
                            }}
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

      {/* LAYER 7: Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Commande #${selectedOrder.id.slice(-6).toUpperCase()}` : 'Détails de la commande'}
        subtitle={selectedOrder ? `Créée le ${new Date(selectedOrder.created_at).toLocaleString('fr-TN')}` : ''}
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
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
