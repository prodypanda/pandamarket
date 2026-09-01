'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useEffect, useState, useMemo } from 'react';
import {
  Download,
  Package,
  Loader2,
  ShoppingBag,
  ChevronDown,
  Flag,
  MessageSquare,
  XCircle,
  Search,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';

interface OrderItem {
  id?: string;
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: string;
  subtotal?: string;
  store_id?: string;
  store_name?: string;
  product_type?: string;
  thumbnail?: string | null;
  has_digital_file?: boolean;
}

/** One store parcel of a (possibly multi-vendor) order. */
interface OrderPackage {
  id: string;
  store_id: string;
  store_name?: string | null;
  store_subdomain?: string | null;
  status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | string;
  carrier?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  shipping_total?: string | null;
  items: OrderItem[];
}

interface Order {
  id: string;
  status: string;
  payment_gateway: string;
  payment_status: string;
  subtotal: string;
  shipping_total: string;
  total: string;
  currency: string;
  created_at: string;
  items?: OrderItem[];
  /** Per-store parcels; empty for digital-only orders. */
  fulfillments?: OrderPackage[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'payment_required': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'partially_shipped': return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'fulfilled': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'partially_delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'delivered': return 'bg-green-50 text-green-700 border-green-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    case 'refunded': return 'bg-gray-50 text-gray-700 border-gray-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    payment_required: 'Paiement requis',
    processing: 'En préparation',
    partially_shipped: 'Partiellement expédiée',
    fulfilled: 'Expédiée',
    partially_delivered: 'Partiellement livrée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    refunded: 'Remboursée',
  };
  return labels[status] || status;
};

const paymentLabel = (gateway: string) => {
  const labels: Record<string, string> = {
    flouci: 'Flouci',
    konnect: 'Konnect',
    manual_mandat: 'Mandat Minute',
    cod: 'Paiement à la livraison',
  };
  return labels[gateway] || gateway;
};

/** Per-parcel status chip label. */
const packageStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente de préparation',
    preparing: 'En préparation',
    shipped: 'Expédié',
    delivered: 'Livré',
    cancelled: 'Annulé',
  };
  return labels[status] || status;
};

const packageStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return 'bg-green-50 text-green-700 border-green-200';
    case 'shipped': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'preparing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  }
};

/**
 * Carrier tracking deep links.
 */
const getCarrierTrackingUrl = (carrier?: string | null, trackingNumber?: string | null) => {
  const tracking = trackingNumber?.trim();
  if (!tracking) return null;
  const c = (carrier || '').toLowerCase();
  const code = encodeURIComponent(tracking);
  if (c.includes('aramex')) return `https://www.aramex.com/track/results?ShipmentNumber=${code}`;
  if (c.includes('poste')) return `https://www.poste.tn/suivi?code=${code}`;
  if (c.includes('dhl')) return `https://www.dhl.com/tn-en/home/tracking/tracking-express.html?submit=1&tracking-id=${code}`;
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${code}`;
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${code}`;
  return null;
};

/** Progress summary for a multi-parcel order, e.g. "1/2 colis expédié". */
const packagesProgress = (packages: OrderPackage[]) => {
  const total = packages.length;
  const shipped = packages.filter((pkg) => pkg.status === 'shipped' || pkg.status === 'delivered').length;
  const delivered = packages.filter((pkg) => pkg.status === 'delivered').length;
  return { total, shipped, delivered };
};

/**
 * 5-Step Stepper Helper for Timeline Logistics Style
 */
function getOrderTimelineStep(status: string): number {
  switch (status) {
    case 'pending':
    case 'payment_required':
      return 1;
    case 'processing':
      return 2;
    case 'partially_shipped':
    case 'fulfilled':
      return 3;
    case 'partially_delivered':
      return 4;
    case 'delivered':
      return 5;
    default:
      return 1;
  }
}

/**
 * Per-package 4-step progression (Timeline Logistics style).
 * Unlike the order-level stepper, this reflects ONE seller's parcel:
 * pending -> preparing -> shipped -> delivered.
 */
function getPackageTimelineStep(status: string): number {
  switch (status) {
    case 'pending': return 1;
    case 'preparing': return 2;
    case 'shipped': return 3;
    case 'delivered': return 4;
    default: return 1; // cancelled/unknown: show at start; terminal styling handled separately
  }
}

const PACKAGE_STEPPER_STEPS = [
  { step: 1, label: 'En attente' },
  { step: 2, label: 'Pr�paration' },
  { step: 3, label: 'Exp�di�' },
  { step: 4, label: 'Livr�' },
] as const;

function PackageTimelineStepper({ pkgStatus, storeName }: { pkgStatus: string; storeName: string }) {
  if (pkgStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Colis {storeName} annul�.</span>
      </div>
    );
  }
  const step = getPackageTimelineStep(pkgStatus);
  return (
    <div className="relative flex items-center justify-between py-1">
      {/* Progress line */}
      <div className="absolute left-[6%] right-[6%] top-1/2 -translate-y-1/2 h-1 bg-gray-200 -z-0 rounded-full" />
      <div
        className="absolute left-[6%] top-1/2 -translate-y-1/2 h-1 bg-emerald-500 -z-0 rounded-full transition-all duration-500"
        style={{ width: `calc(${((step - 1) / 3) * 88}%)` }}
      />
      {PACKAGE_STEPPER_STEPS.map((s) => {
        const isDone = step >= s.step;
        const isCurrent = step === s.step;
        return (
          <div key={s.step} className="flex flex-col items-center relative z-10">
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                isDone
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border-2 border-gray-300 text-gray-400'
              } ${isCurrent ? 'ring-2 ring-emerald-100' : ''}`}
            >
              {isDone ? <Check className="h-2.5 w-2.5" /> : s.step}
            </div>
            <span className={`mt-1 text-[9px] font-bold ${isDone ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [downloadingProductId, setDownloadingProductId] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ orderId: string; storeId: string; storeName?: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [startingChatKey, setStartingChatKey] = useState('');
  const { settings, classes, isAliExpress } = useMarketplaceTheme();

  const themeStyle = useMemo(() => {
    return settings?.buyer_orders_theme_style || 'modern_cards';
  }, [settings?.buyer_orders_theme_style]);

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDownload = async (productId: string) => {
    setDownloadingProductId(productId);
    setDownloadMessage('');
    try {
      const res = await fetch(`/api/pd/products/${productId}/download`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Téléchargement indisponible');
      }
      if (data.data?.download_url) {
        window.open(data.data.download_url, '_blank', 'noopener,noreferrer');
      }
      const licenseKeys = Array.isArray(data.data?.license_keys)
        ? data.data.license_keys
        : data.data?.license_key ? [data.data.license_key] : [];
      setDownloadMessage(licenseKeys.length > 0 ? `Clés de licence : ${licenseKeys.join(', ')}` : 'Lien de téléchargement ouvert.');
    } catch (err) {
      setDownloadMessage(err instanceof Error ? err.message : 'Échec du téléchargement');
    } finally {
      setDownloadingProductId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const submitSellerReport = async () => {
    if (!reportTarget) return;
    setSubmittingReport(true);
    setReportMessage('');
    try {
      const res = await fetchWithCsrf('/api/pd/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          store_id: reportTarget.storeId,
          order_id: reportTarget.orderId,
          category: 'seller_issue',
          reason: reportReason,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Impossible de créer le signalement');
      }
      setReportMessage('Signalement envoyé à l’équipe marketplace.');
      setReportReason('');
      setReportTarget(null);
    } catch (err) {
      setReportMessage(err instanceof Error ? err.message : 'Signalement échoué');
    } finally {
      setSubmittingReport(false);
    }
  };

  const startSellerChat = async (orderId: string, item: NonNullable<Order['items']>[number]) => {
    if (!item.store_id) return;
    const key = `${orderId}-${item.store_id}`;
    setStartingChatKey(key);
    setDownloadMessage('');
    try {
      const res = await fetchWithCsrf('/api/pd/chats/buyer-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          store_id: item.store_id,
          order_id: orderId,
          product_id: item.product_id,
          subject: `Commande #${orderId.slice(-8).toUpperCase()} · ${item.product_title}`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || 'Impossible de démarrer la conversation');
      window.location.href = `/hub/messages?conversation=${encodeURIComponent(data.conversation.id)}`;
    } catch (err) {
      setDownloadMessage(err instanceof Error ? err.message : 'Conversation indisponible');
    } finally {
      setStartingChatKey('');
    }
  };

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
        const searchParam = debouncedSearch.trim() ? `&search=${encodeURIComponent(debouncedSearch.trim())}` : '';
        const res = await fetch(
          `/api/pd/orders/me?page=${page}&limit=10${statusParam}${searchParam}`,
          { credentials: 'include' },
        );
        if (res.ok) {
          const data = await res.json();
          setOrders(data.data || []);
          setTotalPages(data.meta?.total_pages || 1);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [page, statusFilter, debouncedSearch]);

  const canDownloadInvoice = (order: Order) => {
    return order.payment_status === 'captured' || (order.payment_gateway === 'cod' && order.status === 'delivered');
  };

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`mb-6 rounded-[2rem] p-6 text-white sm:p-8 ${classes.header}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">
                <Package className="w-6 h-6" />
                Mes Commandes
              </h1>
              <p className="text-white/75 text-sm mt-1">Suivez l&apos;état de vos colis, téléchargez vos factures et accédez à vos achats.</p>
            </div>
            <Link
              href="/hub"
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-black text-gray-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continuer mes achats
            </Link>
          </div>
        </div>

        {/* Search Bar & Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par N° commande, article ou boutique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'processing', 'partially_shipped', 'fulfilled', 'partially_delivered', 'delivered', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  statusFilter === s
                    ? classes.primary
                    : isAliExpress ? 'bg-white text-gray-600 hover:bg-orange-50 border border-orange-100' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {s === 'all' ? 'Toutes' : statusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className={`w-8 h-8 ${classes.primaryText} animate-spin`} />
            <span className="ml-3 text-sm font-semibold text-gray-500">Chargement de vos commandes...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className={`text-center py-20 ${classes.panel} border border-dashed border-gray-200 rounded-[2rem]`}>
            <Package className={`w-14 h-14 ${isAliExpress ? 'text-orange-200' : 'text-gray-300'} mx-auto mb-4`} />
            <p className="text-gray-700 text-lg font-bold">Aucune commande trouvée.</p>
            <p className="text-gray-400 text-sm mt-1">
              {debouncedSearch ? 'Aucune commande ne correspond à votre recherche.' : 'Vos futures commandes apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const hasInvoice = canDownloadInvoice(order);
              const isExpanded = expandedOrder === order.id;
              const currentStep = getOrderTimelineStep(order.status);
              const isCancelled = order.status === 'cancelled' || order.status === 'refunded';

              return (
                <div
                  key={order.id}
                  className={`${classes.panel} border border-gray-200/80 rounded-[1.75rem] overflow-hidden transition-all shadow-xs hover:shadow-md`}
                >
                  {/* Order Card Header */}
                  <div
                    className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer select-none bg-white"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                        <span className="text-base font-extrabold text-gray-900 tracking-tight">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getStatusColor(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                        {order.payment_status === 'captured' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Payée
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-500">
                        <span>
                          {new Date(order.created_at).toLocaleDateString('fr-TN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span>{paymentLabel(order.payment_gateway)}</span>
                        {order.fulfillments && order.fulfillments.length > 1 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              {order.fulfillments.length} colis multi-vendeurs
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block sm:inline mr-1">Total:</span>
                        <span className={`text-lg font-black ${classes.primaryText}`}>
                          {parseFloat(order.total).toFixed(3)} TND
                        </span>
                      </div>

                      {hasInvoice && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/api/pd/orders/${order.id}/invoice.pdf`, '_blank');
                          }}
                          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Télécharger la facture officielle PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          Facture PDF
                        </button>
                      )}

                      <div className="p-1 rounded-full bg-gray-100 text-gray-500">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      STYLE 2: TIMELINE LOGISTICS STEPPER (When timeline_logistics selected)
                     ───────────────────────────────────────────────────────────── */}
                  {themeStyle === 'timeline_logistics' && (
                    <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-3">Progression logistique</p>
                      
                      {isCancelled ? (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                          <AlertCircle className="w-4 h-4" />
                          <span>Cette commande a été {statusLabel(order.status).toLowerCase()}.</span>
                        </div>
                      ) : (
                        <div className="relative flex items-center justify-between max-w-2xl mx-auto py-2">
                          {/* Progress Line */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-0 rounded-full" />
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 -z-0 rounded-full transition-all duration-500"
                            style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                          />

                          {[
                            { step: 1, label: 'Validée' },
                            { step: 2, label: 'Préparation' },
                            { step: 3, label: 'Expédiée' },
                            { step: 4, label: 'En route' },
                            { step: 5, label: 'Livrée' },
                          ].map((s) => {
                            const isDone = currentStep >= s.step;
                            const isCurrent = currentStep === s.step;
                            return (
                              <div key={s.step} className="flex flex-col items-center relative z-10">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    isDone
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-white border-2 border-gray-300 text-gray-400'
                                  } ${isCurrent ? 'ring-4 ring-emerald-100 ring-offset-1' : ''}`}
                                >
                                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.step}
                                </div>
                                <span className={`text-[11px] font-bold mt-1.5 ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {s.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded Details Body */}
                  {isExpanded && (
                    <div className={`border-t p-5 sm:p-6 ${isAliExpress ? 'border-orange-100 bg-orange-50/30' : 'border-gray-100 bg-gray-50/40'}`}>
                      {/* Financial Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white border border-gray-200/70 mb-5 text-sm">
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sous-total</span>
                          <p className="font-extrabold text-gray-900 mt-0.5">{parseFloat(order.subtotal).toFixed(3)} TND</p>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Livraison</span>
                          <p className="font-extrabold text-gray-900 mt-0.5">{parseFloat(order.shipping_total).toFixed(3)} TND</p>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Paiement</span>
                          <p className="font-extrabold text-gray-900 mt-0.5 capitalize">{order.payment_status}</p>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total TTC</span>
                          <p className={`font-black text-base ${classes.primaryText} mt-0.5`}>{parseFloat(order.total).toFixed(3)} TND</p>
                        </div>
                      </div>

                      {/* Mobile invoice download button */}
                      {hasInvoice && (
                        <div className="sm:hidden mb-4">
                          <button
                            type="button"
                            onClick={() => window.open(`/api/pd/orders/${order.id}/invoice.pdf`, '_blank')}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-xs font-extrabold text-gray-800 shadow-xs"
                          >
                            <FileText className="w-4 h-4 text-emerald-600" />
                            Télécharger la Facture PDF
                          </button>
                        </div>
                      )}

                      {/* Parcels (Multi-Vendor Aware) */}
                      {order.fulfillments && order.fulfillments.length > 0 ? (
                        <div className="space-y-4">
                          {(() => {
                            const progress = packagesProgress(order.fulfillments);
                            return (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                                  {progress.total > 1 ? `Colis d'expédition (${progress.total} colis)` : 'Détail du colis & transport'}
                                </span>
                                {progress.total > 1 && (
                                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                                    {progress.delivered > 0
                                      ? `${progress.delivered}/${progress.total} livré${progress.delivered > 1 ? 's' : ''}`
                                      : `${progress.shipped}/${progress.total} expédié${progress.shipped > 1 ? 's' : ''}`}
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {order.fulfillments.map((pkg, idx) => {
                            const trackingUrl = getCarrierTrackingUrl(pkg.carrier, pkg.tracking_number);
                            const packageCount = order.fulfillments!.length;
                            return (
                              <div
                                key={pkg.id || `${order.id}-${idx}`}
                                className="rounded-2xl border border-gray-200/90 bg-white p-4 sm:p-5 space-y-4 shadow-xs"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
                                  <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 border border-emerald-100">
                                      <Package className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-gray-900">
                                        {packageCount > 1 ? `Colis ${idx + 1}/${packageCount} · ` : ''}
                                        {pkg.store_name || 'Boutique'}
                                      </p>
                                      {themeStyle === 'timeline_logistics' && (
                                        <div className="mt-2">
                                          <PackageTimelineStepper pkgStatus={pkg.status} storeName={pkg.store_name || 'Boutique'} />
                                        </div>
                                      )}
                                      {pkg.carrier ? (
                                        <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1.5">
                                          <Truck className="w-3.5 h-3.5 text-gray-400" />
                                          <span>{pkg.carrier}</span>
                                          {pkg.tracking_number && (
                                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">
                                              #{pkg.tracking_number}
                                            </span>
                                          )}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-gray-400 mt-0.5">Préparation en cours par le vendeur</p>
                                      )}
                                      {pkg.shipped_at && (
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                          Expédié le {new Date(pkg.shipped_at).toLocaleDateString('fr-TN')}
                                          {pkg.delivered_at ? ` · Livré le ${new Date(pkg.delivered_at).toLocaleDateString('fr-TN')}` : ''}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${packageStatusColor(pkg.status)}`}>
                                      {packageStatusLabel(pkg.status)}
                                    </span>
                                    {trackingUrl && (
                                      <a
                                        href={trackingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100"
                                      >
                                        Suivi transporteur ↗
                                      </a>
                                    )}
                                    {pkg.store_id && (
                                      <button
                                        type="button"
                                        onClick={() => startSellerChat(order.id, { product_id: pkg.items[0]?.product_id ?? '', product_title: pkg.items[0]?.product_title ?? '', quantity: 1, unit_price: '0', store_id: pkg.store_id, store_name: pkg.store_name ?? undefined })}
                                        disabled={startingChatKey === `${order.id}-${pkg.store_id}`}
                                        className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                      >
                                        {startingChatKey === `${order.id}-${pkg.store_id}` ? (
                                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        Message
                                      </button>
                                    )}
                                    {pkg.store_id && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReportTarget({ orderId: order.id, storeId: pkg.store_id, storeName: pkg.store_name ?? undefined });
                                          setReportReason('');
                                          setReportMessage('');
                                        }}
                                        className="inline-flex items-center rounded-full border border-red-100 bg-white px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                                      >
                                        <Flag className="mr-1 h-3 w-3" />
                                        Signaler
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="divide-y divide-gray-100">
                                  {pkg.items.map((item) => {
                                    const isDownloadable = (item.product_type === 'digital' || item.product_type === 'serial') && item.has_digital_file;
                                    const canDownload = order.payment_status === 'captured' && isDownloadable;
                                    return (
                                      <div key={item.id || `${pkg.id}-${item.product_id}`} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between text-sm">
                                        <div className="flex items-center gap-3">
                                          {item.thumbnail ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.thumbnail} alt={item.product_title} className="h-11 w-11 rounded-xl border border-gray-200 object-cover" />
                                          ) : (
                                            <div className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                                              <ShoppingBag className="w-5 h-5" />
                                            </div>
                                          )}
                                          <div>
                                            <p className="font-extrabold text-gray-900">{item.product_title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              Quantité : {item.quantity} × {parseFloat(item.unit_price).toFixed(3)} TND
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                          {item.subtotal && (
                                            <span className="text-sm font-black text-gray-900">{parseFloat(item.subtotal).toFixed(3)} TND</span>
                                          )}
                                          {canDownload && (
                                            <button
                                              type="button"
                                              onClick={() => handleDownload(item.product_id)}
                                              disabled={downloadingProductId === item.product_id}
                                              className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition-colors disabled:opacity-50 ${classes.primaryGradient}`}
                                            >
                                              {downloadingProductId === item.product_id ? (
                                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                              ) : (
                                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                              )}
                                              Télécharger
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {/* Digital items without parcel */}
                          {(() => {
                            const parcelStores = new Set(order.fulfillments!.map((pkg) => pkg.store_id));
                            const orphanItems = (order.items || []).filter((item) => !item.store_id || !parcelStores.has(item.store_id));
                            if (orphanItems.length === 0) return null;
                            return (
                              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 space-y-3">
                                <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Articles numériques & licences</p>
                                {orphanItems.map((item) => {
                                  const isDownloadable = (item.product_type === 'digital' || item.product_type === 'serial') && item.has_digital_file;
                                  const canDownload = order.payment_status === 'captured' && isDownloadable;
                                  return (
                                    <div key={`orphan-${order.id}-${item.product_id}`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm py-1">
                                      <div>
                                        <p className="font-extrabold text-gray-900">{item.product_title}</p>
                                        <p className="text-xs text-gray-500">
                                          {item.quantity} × {parseFloat(item.unit_price).toFixed(3)} TND
                                          {item.store_name ? ` · ${item.store_name}` : ''}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {canDownload && (
                                          <button
                                            type="button"
                                            onClick={() => handleDownload(item.product_id)}
                                            disabled={downloadingProductId === item.product_id}
                                            className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-black text-white shadow-xs transition-colors disabled:opacity-50 ${classes.primaryGradient}`}
                                          >
                                            {downloadingProductId === item.product_id ? (
                                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                              <Download className="mr-1.5 h-3.5 w-3.5" />
                                            )}
                                            Télécharger le fichier
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (order.items && order.items.length > 0) ? (
                        <div className="space-y-3">
                          <span className="text-xs font-black uppercase tracking-wider text-gray-500">Articles commandés</span>
                          <div className="rounded-2xl border border-gray-200 bg-white p-4 divide-y divide-gray-100">
                            {order.items.map((item) => {
                              const isDownloadable = (item.product_type === 'digital' || item.product_type === 'serial') && item.has_digital_file;
                              const canDownload = order.payment_status === 'captured' && isDownloadable;
                              return (
                                <div key={`${order.id}-${item.product_id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 text-sm">
                                  <div>
                                    <p className="font-extrabold text-gray-900">{item.product_title}</p>
                                    <p className="text-xs text-gray-500">
                                      {item.quantity} × {parseFloat(item.unit_price).toFixed(3)} TND
                                      {item.store_name ? ` · ${item.store_name}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {canDownload && (
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(item.product_id)}
                                        disabled={downloadingProductId === item.product_id}
                                        className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-black text-white shadow-xs transition-colors disabled:opacity-50 ${classes.primaryGradient}`}
                                      >
                                        {downloadingProductId === item.product_id ? (
                                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Download className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        Télécharger
                                      </button>
                                    )}
                                    {item.store_id && (
                                      <button
                                        type="button"
                                        onClick={() => startSellerChat(order.id, item)}
                                        disabled={startingChatKey === `${order.id}-${item.store_id}`}
                                        className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                      >
                                        <MessageSquare className="mr-1 h-3 w-3" />
                                        Message
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {downloadMessage && (
                        <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-white border border-gray-200 p-3 text-xs font-semibold text-gray-700 shadow-xs">
                          <span>{downloadMessage}</span>
                          {downloadMessage.includes('Clés de licence') && (
                            <button
                              onClick={() => copyToClipboard(downloadMessage.replace('Clés de licence : ', ''))}
                              className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-bold"
                            >
                              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedKey ? 'Copié !' : 'Copier'}
                            </button>
                          )}
                        </div>
                      )}

                      {order.status === 'payment_required' && order.payment_gateway === 'manual_mandat' && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                          <p className="text-xs text-amber-700 font-bold">Un reçu de virement Mandat Minute est requis pour valider cette commande.</p>
                          <Link
                            href={`/hub/checkout/mandat-upload?order_id=${order.id}`}
                            className={`inline-flex items-center px-4 py-2 rounded-full transition-colors text-xs font-black text-white ${classes.primaryGradient}`}
                          >
                            Uploader la preuve de mandat
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`px-4 py-2 text-xs font-bold border rounded-full disabled:opacity-40 transition-colors ${isAliExpress ? 'border-orange-200 bg-white hover:bg-orange-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
            >
              ← Précédent
            </button>
            <span className="text-xs font-bold text-gray-500 px-4">
              Page {page} sur {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`px-4 py-2 text-xs font-bold border rounded-full disabled:opacity-40 transition-colors ${isAliExpress ? 'border-orange-200 bg-white hover:bg-orange-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
            >
              Suivant →
            </button>
          </div>
        )}

        {/* Report Modal */}
        {reportTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Signaler le vendeur</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {reportTarget.storeName || 'Vendeur'} · Commande #{reportTarget.orderId.slice(-8).toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <textarea
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                rows={5}
                placeholder="Décrivez le problème rencontré avec cette boutique..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-red-300"
              />
              {reportMessage && (
                <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{reportMessage}</p>
              )}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={submitSellerReport}
                  disabled={submittingReport || reportReason.trim().length < 10}
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {submittingReport ? 'Envoi...' : 'Envoyer le signalement'}
                </button>
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-black text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <HubFooter {...settings} />
    </div>
  );
}
