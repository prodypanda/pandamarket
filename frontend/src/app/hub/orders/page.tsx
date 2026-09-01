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
  Copy,
  Check,
  AlertCircle,
  Star,
  RefreshCw,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { HubNavbar } from '@/components/hub/HubNavbar';
import { HubFooter } from '@/components/hub/HubFooter';
import { useMarketplaceTheme } from '@/hooks/useMarketplaceTheme';
import { useCart } from '@/contexts/CartContext';

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

interface ReviewModalState {
  orderId: string;
  productId: string;
  productTitle: string;
  storeName?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-800 border-amber-200/60';
    case 'payment_required': return 'bg-orange-50 text-orange-800 border-orange-200/60';
    case 'processing': return 'bg-sky-50 text-sky-800 border-sky-200/60';
    case 'partially_shipped': return 'bg-indigo-50 text-indigo-800 border-indigo-200/60';
    case 'fulfilled': return 'bg-purple-50 text-purple-800 border-purple-200/60';
    case 'partially_delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    case 'delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    case 'cancelled': return 'bg-zinc-100 text-zinc-600 border-zinc-200/80';
    case 'refunded': return 'bg-zinc-100 text-zinc-600 border-zinc-200/80';
    default: return 'bg-zinc-100 text-zinc-600 border-zinc-200/80';
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
    pending: 'En attente',
    preparing: 'En préparation',
    shipped: 'Expédié',
    delivered: 'Livré',
    cancelled: 'Annulé',
  };
  return labels[status] || status;
};

const packageStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    case 'shipped': return 'bg-purple-50 text-purple-800 border-purple-200/60';
    case 'preparing': return 'bg-sky-50 text-sky-800 border-sky-200/60';
    case 'cancelled': return 'bg-zinc-100 text-zinc-600 border-zinc-200/80';
    default: return 'bg-amber-50 text-amber-800 border-amber-200/60';
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
 */
function getPackageTimelineStep(status: string): number {
  switch (status) {
    case 'pending': return 1;
    case 'preparing': return 2;
    case 'shipped': return 3;
    case 'delivered': return 4;
    default: return 1;
  }
}

const PACKAGE_STEPPER_STEPS = [
  { step: 1, label: 'En attente' },
  { step: 2, label: 'Préparation' },
  { step: 3, label: 'Expédié' },
  { step: 4, label: 'Livré' },
] as const;

function PackageTimelineStepper({ pkgStatus, storeName }: { pkgStatus: string; storeName: string }) {
  if (pkgStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
        <AlertCircle className="h-3 w-3 text-zinc-400" />
        <span>Colis {storeName} annulé.</span>
      </div>
    );
  }
  const step = getPackageTimelineStep(pkgStatus);
  return (
    <div className="relative flex items-center justify-between py-1" role="group" aria-label={`Progression du colis ${storeName}`}>
      {/* Progress line */}
      <div className="absolute left-[6%] right-[6%] top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0 rounded-full" />
      <div
        className="absolute left-[6%] top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 -z-0 rounded-full transition-all duration-500 rtl:right-[6%] rtl:left-auto"
        style={{ width: `calc(${((step - 1) / 3) * 88}%)` }}
      />
      {PACKAGE_STEPPER_STEPS.map((s) => {
        const isDone = step >= s.step;
        const isCurrent = step === s.step;
        return (
          <div key={s.step} className="flex flex-col items-center relative z-10">
            <div
              className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[9px] font-medium transition-all ${
                isDone
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-400'
              } ${isCurrent ? 'ring-2 ring-emerald-100 ring-offset-1' : ''}`}
            >
              {isDone ? <Check className="h-2.5 w-2.5" /> : s.step}
            </div>
            <span className={`mt-0.5 text-[9px] font-medium ${isDone ? 'text-slate-700' : 'text-slate-400'}`}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Pulsing Skeleton Placeholder */
function SkeletonOrderCard() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xs animate-pulse space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-4.5 w-24 bg-slate-200 rounded-md" />
            <div className="h-4.5 w-18 bg-slate-100 rounded-full" />
          </div>
          <div className="h-3 w-40 bg-slate-100 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-slate-200 rounded-md" />
        </div>
      </div>
      <div className="h-8 bg-slate-50 rounded-xl border border-slate-100" />
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
  const [reorderToast, setReorderToast] = useState<{ message: string; productId: string } | null>(null);

  // Review Modal State
  const [reviewTarget, setReviewTarget] = useState<ReviewModalState | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Report Seller Modal State
  const [reportTarget, setReportTarget] = useState<{ orderId: string; storeId: string; storeName?: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [startingChatKey, setStartingChatKey] = useState('');

  const { settings } = useMarketplaceTheme();
  const { addToCart } = useCart();

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

  const handleReorderItem = (item: OrderItem) => {
    addToCart({
      product_id: item.product_id,
      title: item.product_title,
      price: parseFloat(item.unit_price) || 0,
      quantity: 1,
      image_url: item.thumbnail || null,
      store_id: item.store_id || 'default_store',
      store_name: item.store_name || 'Boutique Marketplace',
      product_type: item.product_type || 'physical',
    });
    setReorderToast({
      message: `« ${item.product_title} » a été ajouté à votre panier !`,
      productId: item.product_id,
    });
    setTimeout(() => setReorderToast(null), 3500);
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
      setReportMessage('Signalement envoyé avec succès à l’équipe marketplace.');
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

  const handleReviewSubmit = async () => {
    if (!reviewTarget) return;
    setSubmittingReview(true);
    setReviewMessage(null);
    try {
      const res = await fetchWithCsrf('/api/pd/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: reviewTarget.productId,
          order_id: reviewTarget.orderId,
          rating: reviewRating,
          title: reviewTitle.trim() || undefined,
          body: reviewBody.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Impossible de soumettre votre avis');
      }
      setReviewMessage({ type: 'success', text: 'Merci ! Votre avis a été enregistré avec succès.' });
      setTimeout(() => {
        setReviewTarget(null);
        setReviewMessage(null);
        setReviewTitle('');
        setReviewBody('');
      }, 1800);
    } catch (err) {
      setReviewMessage({ type: 'error', text: err instanceof Error ? err.message : 'Échec de la soumission de l’avis' });
    } finally {
      setSubmittingReview(false);
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

  // Status Filter options
  const filterOptions = [
    { id: 'all', label: 'Toutes' },
    { id: 'pending', label: 'En attente' },
    { id: 'processing', label: 'En préparation' },
    { id: 'partially_shipped', label: 'Partiellement expédiée' },
    { id: 'fulfilled', label: 'Expédiée' },
    { id: 'partially_delivered', label: 'Partiellement livrée' },
    { id: 'delivered', label: 'Livrée' },
    { id: 'cancelled', label: 'Annulée' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]/80 text-slate-900">
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />

      {/* Floating Reorder Toast */}
      {reorderToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-xl animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{reorderToast.message}</span>
          <Link
            href="/hub/cart"
            className="ml-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            Panier
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Quieter Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200/70 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-700" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Mes Commandes
              </h1>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Suivez l&apos;acheminement de vos colis, téléchargez vos factures et accédez à vos achats numériques.</p>
          </div>
          <Link
            href="/hub"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
            Continuer mes achats
          </Link>
        </div>

        {/* Quieter Search Bar & Horizontal Scrolling Filter Bar */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par n° de commande, article ou boutique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Rechercher dans mes commandes"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200/80 bg-white text-xs font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200/50 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Calmer Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap">
            {filterOptions.map((f) => {
              const isSelected = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => { setStatusFilter(f.id); setPage(1); }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    isSelected
                      ? 'bg-slate-900 text-white font-medium shadow-2xs'
                      : 'bg-white border border-slate-200/70 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal shadow-2xs'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders List / Skeletons / Empty State */}
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Chargement de vos commandes">
            <SkeletonOrderCard />
            <SkeletonOrderCard />
            <SkeletonOrderCard />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 text-base font-semibold">Aucune commande trouvée</p>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              {debouncedSearch ? 'Aucune commande ne correspond à vos critères de recherche.' : 'Vos commandes apparaîtront ici dès vos premiers achats.'}
            </p>
            {!debouncedSearch && (
              <Link
                href="/hub"
                className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Explorer la marketplace
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const hasInvoice = canDownloadInvoice(order);
              const isExpanded = expandedOrder === order.id;
              const currentStep = getOrderTimelineStep(order.status);
              const isCancelled = order.status === 'cancelled' || order.status === 'refunded';

              return (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-2xs hover:border-slate-300"
                >
                  {/* Order Card Header */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-controls={`order-detail-${order.id}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedOrder(isExpanded ? null : order.id);
                      }
                    }}
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none bg-white transition-colors hover:bg-slate-50/50"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-900 tracking-tight font-mono">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                          {statusLabel(order.status)}
                        </span>
                        {order.payment_status === 'captured' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Payée
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-normal">
                        <span>
                          {new Date(order.created_at).toLocaleDateString('fr-TN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{paymentLabel(order.payment_gateway)}</span>
                        {order.fulfillments && order.fulfillments.length > 1 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
                              {order.fulfillments.length} colis
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block sm:inline mr-1 font-normal">Total :</span>
                        <span className="text-base font-semibold text-slate-900">
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
                          aria-label={`Télécharger la facture PDF pour la commande #${order.id.slice(-8).toUpperCase()}`}
                          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                          title="Télécharger la facture PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          Facture PDF
                        </button>
                      )}

                      <div className="p-1 rounded-lg bg-slate-100 text-slate-500 transition-transform">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      STYLE 2: TIMELINE LOGISTICS STEPPER
                     ───────────────────────────────────────────────────────────── */}
                  {themeStyle === 'timeline_logistics' && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-2.5">Acheminement</p>
                      
                      {isCancelled ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-normal">
                          <AlertCircle className="w-4 h-4 text-zinc-400" />
                          <span>Cette commande a été {statusLabel(order.status).toLowerCase()}.</span>
                        </div>
                      ) : (
                        <div className="relative flex items-center justify-between max-w-xl mx-auto py-1">
                          {/* Progress Line */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-0 rounded-full" />
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 -z-0 rounded-full transition-all duration-500 rtl:right-0 rtl:left-auto"
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
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
                                    isDone
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-white border border-slate-300 text-slate-400'
                                  } ${isCurrent ? 'ring-2 ring-emerald-100 ring-offset-1' : ''}`}
                                >
                                  {isDone ? <Check className="w-3 h-3" /> : s.step}
                                </div>
                                <span className={`text-[10px] font-medium mt-1 ${isDone ? 'text-slate-700' : 'text-slate-400'}`}>
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
                    <div
                      id={`order-detail-${order.id}`}
                      className="border-t border-slate-100 p-4 sm:p-5 bg-slate-50/30 space-y-4"
                    >
                      {/* Financial Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white border border-slate-200/70 text-xs shadow-2xs">
                        <div>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Sous-total</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{parseFloat(order.subtotal).toFixed(3)} TND</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Livraison</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{parseFloat(order.shipping_total).toFixed(3)} TND</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Paiement</span>
                          <p className="font-semibold text-slate-800 mt-0.5 capitalize">{order.payment_status === 'captured' ? 'Payé' : order.payment_status}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total</span>
                          <p className="font-semibold text-slate-900 mt-0.5">{parseFloat(order.total).toFixed(3)} TND</p>
                        </div>
                      </div>

                      {/* Mobile invoice download button */}
                      {hasInvoice && (
                        <div className="sm:hidden">
                          <button
                            type="button"
                            onClick={() => window.open(`/api/pd/orders/${order.id}/invoice.pdf`, '_blank')}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Télécharger la Facture PDF
                          </button>
                        </div>
                      )}

                      {/* Parcels (Multi-Vendor Aware) */}
                      {order.fulfillments && order.fulfillments.length > 0 ? (
                        <div className="space-y-3">
                          {(() => {
                            const progress = packagesProgress(order.fulfillments);
                            return (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                                  {progress.total > 1 ? `Colis d'expédition (${progress.total})` : 'Détail du colis'}
                                </span>
                                {progress.total > 1 && (
                                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
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
                            const isDelivered = pkg.status === 'delivered';

                            return (
                              <div
                                key={pkg.id || `${order.id}-${idx}`}
                                className="rounded-xl border border-slate-200/70 bg-white p-3.5 sm:p-4 space-y-3 shadow-2xs"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                  <div className="flex items-start gap-2.5">
                                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                                      <Package className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-900">
                                        {packageCount > 1 ? `Colis ${idx + 1}/${packageCount} · ` : ''}
                                        {pkg.store_name || 'Boutique'}
                                      </p>
                                      {themeStyle === 'timeline_logistics' && (
                                        <div className="mt-1.5 min-w-[200px] sm:min-w-[280px]">
                                          <PackageTimelineStepper pkgStatus={pkg.status} storeName={pkg.store_name || 'Boutique'} />
                                        </div>
                                      )}
                                      {pkg.carrier ? (
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-normal">
                                          <Truck className="w-3 h-3 text-slate-400" />
                                          <span>{pkg.carrier}</span>
                                          {pkg.tracking_number && (
                                            <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">
                                              #{pkg.tracking_number}
                                            </span>
                                          )}
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-slate-400 mt-0.5">En cours de préparation</p>
                                      )}
                                      {pkg.shipped_at && (
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                          Expédié le {new Date(pkg.shipped_at).toLocaleDateString('fr-TN')}
                                          {pkg.delivered_at ? ` · Livré le ${new Date(pkg.delivered_at).toLocaleDateString('fr-TN')}` : ''}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${packageStatusColor(pkg.status)}`}>
                                      {packageStatusLabel(pkg.status)}
                                    </span>
                                    {trackingUrl && (
                                      <a
                                        href={trackingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                                      >
                                        Suivi
                                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                                      </a>
                                    )}
                                    {pkg.store_id && (
                                      <button
                                        type="button"
                                        onClick={() => startSellerChat(order.id, { product_id: pkg.items[0]?.product_id ?? '', product_title: pkg.items[0]?.product_title ?? '', quantity: 1, unit_price: '0', store_id: pkg.store_id, store_name: pkg.store_name ?? undefined })}
                                        disabled={startingChatKey === `${order.id}-${pkg.store_id}`}
                                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                      >
                                        {startingChatKey === `${order.id}-${pkg.store_id}` ? (
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        ) : (
                                          <MessageSquare className="mr-1 h-3 w-3 text-slate-400" />
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
                                        className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-normal text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      >
                                        <Flag className="mr-1 h-2.5 w-2.5" />
                                        Signaler
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                  {pkg.items.map((item) => {
                                    const isDownloadable = (item.product_type === 'digital' || item.product_type === 'serial') && item.has_digital_file;
                                    const canDownload = order.payment_status === 'captured' && isDownloadable;

                                    return (
                                      <div key={item.id || `${pkg.id}-${item.product_id}`} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                                        <div className="flex items-center gap-2.5">
                                          {item.thumbnail ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.thumbnail} alt={item.product_title} className="h-10 w-10 rounded-lg border border-slate-100 object-cover" />
                                          ) : (
                                            <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                              <ShoppingBag className="w-4 h-4" />
                                            </div>
                                          )}
                                          <div>
                                            <Link href={`/hub/products/${item.product_id}`} className="font-medium text-slate-900 hover:text-emerald-700 transition-colors">
                                              {item.product_title}
                                            </Link>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                              Qté : {item.quantity} × {parseFloat(item.unit_price).toFixed(3)} TND
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                                          {item.subtotal && (
                                            <span className="text-xs font-semibold text-slate-900 mr-1">{parseFloat(item.subtotal).toFixed(3)} TND</span>
                                          )}

                                          {/* Reorder Button */}
                                          <button
                                            type="button"
                                            onClick={() => handleReorderItem(item)}
                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                                            title="Commander cet article à nouveau"
                                          >
                                            <RefreshCw className="h-3 w-3 text-slate-400" />
                                            Recommander
                                          </button>

                                          {/* Review Button for Delivered items */}
                                          {isDelivered && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setReviewTarget({
                                                  orderId: order.id,
                                                  productId: item.product_id,
                                                  productTitle: item.product_title,
                                                  storeName: pkg.store_name ?? undefined,
                                                });
                                                setReviewRating(5);
                                                setReviewTitle('');
                                                setReviewBody('');
                                                setReviewMessage(null);
                                              }}
                                              className="inline-flex items-center gap-1 rounded-md border border-amber-200/70 bg-amber-50/60 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100/70 transition-colors shadow-2xs"
                                            >
                                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                              Évaluer
                                            </button>
                                          )}

                                          {canDownload && (
                                            <button
                                              type="button"
                                              onClick={() => handleDownload(item.product_id)}
                                              disabled={downloadingProductId === item.product_id}
                                              className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-2xs"
                                            >
                                              {downloadingProductId === item.product_id ? (
                                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                              ) : (
                                                <Download className="mr-1 h-3 w-3" />
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
                              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 space-y-2">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Articles numériques & licences</p>
                                {orphanItems.map((item) => {
                                  const isDownloadable = (item.product_type === 'digital' || item.product_type === 'serial') && item.has_digital_file;
                                  const canDownload = order.payment_status === 'captured' && isDownloadable;
                                  return (
                                    <div key={`orphan-${order.id}-${item.product_id}`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs py-1">
                                      <div>
                                        <p className="font-medium text-slate-900">{item.product_title}</p>
                                        <p className="text-[11px] text-slate-500">
                                          {item.quantity} × {parseFloat(item.unit_price).toFixed(3)} TND
                                          {item.store_name ? ` · ${item.store_name}` : ''}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleReorderItem(item)}
                                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-normal text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                                        >
                                          <RefreshCw className="h-3 w-3 text-slate-400" />
                                          Recommander
                                        </button>
                                        {canDownload && (
                                          <button
                                            type="button"
                                            onClick={() => handleDownload(item.product_id)}
                                            disabled={downloadingProductId === item.product_id}
                                            className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-2xs"
                                          >
                                            {downloadingProductId === item.product_id ? (
                                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                            ) : (
                                              <Download className="mr-1 h-3 w-3" />
                                            )}
                                            Télécharger
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
                        <div className="space-y-2">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Articles commandés</span>
                          <div className="rounded-xl border border-slate-200/70 bg-white p-3.5 divide-y divide-slate-100 shadow-2xs">
                            {order.items.map((item) => {
                              const isDownloadable = (item.product_type === 'digital' || item.product_type === 'serial') && item.has_digital_file;
                              const canDownload = order.payment_status === 'captured' && isDownloadable;
                              const isDelivered = order.status === 'delivered';

                              return (
                                <div key={`${order.id}-${item.product_id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 text-xs">
                                  <div>
                                    <p className="font-medium text-slate-900">{item.product_title}</p>
                                    <p className="text-[11px] text-slate-500">
                                      {item.quantity} × {parseFloat(item.unit_price).toFixed(3)} TND
                                      {item.store_name ? ` · ${item.store_name}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleReorderItem(item)}
                                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-normal text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                                    >
                                      <RefreshCw className="h-3 w-3 text-slate-400" />
                                      Recommander
                                    </button>
                                    {isDelivered && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReviewTarget({
                                            orderId: order.id,
                                            productId: item.product_id,
                                            productTitle: item.product_title,
                                            storeName: item.store_name ?? undefined,
                                          });
                                          setReviewRating(5);
                                          setReviewTitle('');
                                          setReviewBody('');
                                          setReviewMessage(null);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-md border border-amber-200/70 bg-amber-50/60 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100/70 transition-colors shadow-2xs"
                                      >
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                        Évaluer
                                      </button>
                                    )}
                                    {canDownload && (
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(item.product_id)}
                                        disabled={downloadingProductId === item.product_id}
                                        className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-2xs"
                                      >
                                        {downloadingProductId === item.product_id ? (
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        ) : (
                                          <Download className="mr-1 h-3 w-3" />
                                        )}
                                        Télécharger
                                      </button>
                                    )}
                                    {item.store_id && (
                                      <button
                                        type="button"
                                        onClick={() => startSellerChat(order.id, item)}
                                        disabled={startingChatKey === `${order.id}-${item.store_id}`}
                                        className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                      >
                                        <MessageSquare className="mr-1 h-3 w-3 text-slate-400" />
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
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 p-2.5 text-xs text-slate-700 shadow-2xs">
                          <span>{downloadMessage}</span>
                          {downloadMessage.includes('Clés de licence') && (
                            <button
                              onClick={() => copyToClipboard(downloadMessage.replace('Clés de licence : ', ''))}
                              className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold"
                            >
                              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedKey ? 'Copié !' : 'Copier'}
                            </button>
                          )}
                        </div>
                      )}

                      {order.status === 'payment_required' && order.payment_gateway === 'manual_mandat' && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <p className="text-xs text-amber-800 font-normal">Un reçu de virement Mandat Minute est requis pour valider cette commande.</p>
                          <Link
                            href={`/hub/checkout/mandat-upload?order_id=${order.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-2xs"
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

        {/* Quieter Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
            >
              ← Précédent
            </button>
            <span className="text-xs text-slate-500 font-normal px-3">
              Page {page} sur {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
            >
              Suivant →
            </button>
          </div>
        )}

        {/* Quieter Product Review Modal */}
        {reviewTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl space-y-4 border border-slate-100">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Évaluer le produit</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {reviewTarget.productTitle}
                    {reviewTarget.storeName ? ` · ${reviewTarget.storeName}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <XCircle className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Star Rating Selector */}
              <div className="flex flex-col items-center py-1 space-y-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeRating = reviewHoverRating || reviewRating;
                    const isFilled = star <= activeRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setReviewHoverRating(star)}
                        onMouseLeave={() => setReviewHoverRating(0)}
                        aria-label={`Attribuer ${star} étoile(s)`}
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            isFilled ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-medium text-slate-600">
                  {reviewRating === 5 && 'Excellent !'}
                  {reviewRating === 4 && 'Très bon'}
                  {reviewRating === 3 && 'Moyen'}
                  {reviewRating === 2 && 'Décevant'}
                  {reviewRating === 1 && 'Médiocre'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Titre de l'avis (optionnel)</label>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="Ex : Conforme à mes attentes"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Votre commentaire</label>
                  <textarea
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    rows={3}
                    placeholder="Partagez votre retour d'expérience sur ce produit..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                  />
                </div>
              </div>

              {reviewMessage && (
                <div
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${
                    reviewMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200/60 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200/60 text-rose-800'
                  }`}
                >
                  {reviewMessage.text}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  disabled={submittingReview}
                  className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {submittingReview ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Publier mon avis'}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quieter Report Seller Modal */}
        {reportTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl space-y-4 border border-slate-100">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Signaler le vendeur</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {reportTarget.storeName || 'Vendeur'} · Commande #{reportTarget.orderId.slice(-8).toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <XCircle className="h-4.5 w-4.5" />
                </button>
              </div>
              <textarea
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                rows={4}
                placeholder="Décrivez le problème rencontré avec cette boutique..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
              />
              {reportMessage && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{reportMessage}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={submitSellerReport}
                  disabled={submittingReport || reportReason.trim().length < 10}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 shadow-2xs"
                >
                  {submittingReport ? 'Envoi...' : 'Envoyer le signalement'}
                </button>
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
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
