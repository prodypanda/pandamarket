'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Download, Package, Loader2, ShoppingBag, ChevronDown, Flag, MessageSquare, XCircle } from 'lucide-react';
import Link from 'next/link';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';

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
  items?: Array<{
    product_id: string;
    product_title: string;
    quantity: number;
    unit_price: string;
    store_id?: string;
    store_name?: string;
    product_type?: string;
    has_digital_file?: boolean;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'payment_required': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'fulfilled': return 'bg-purple-50 text-purple-700 border-purple-200';
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
    processing: 'En cours',
    fulfilled: 'Expédié',
    delivered: 'Livré',
    cancelled: 'Annulé',
    refunded: 'Remboursé',
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

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [downloadingProductId, setDownloadingProductId] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [reportTarget, setReportTarget] = useState<{ orderId: string; storeId: string; storeName?: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [startingChatKey, setStartingChatKey] = useState('');
  const { settings, classes, isAliExpress } = useMarketplaceTheme();

  const handleDownload = async (productId: string) => {
    setDownloadingProductId(productId);
    setDownloadMessage('');
    try {
      const res = await fetch(`/api/pd/products/${productId}/download`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Download unavailable');
      }
      if (data.data?.download_url) {
        window.open(data.data.download_url, '_blank', 'noopener,noreferrer');
      }
      const licenseKeys = Array.isArray(data.data?.license_keys)
        ? data.data.license_keys
        : data.data?.license_key ? [data.data.license_key] : [];
      setDownloadMessage(licenseKeys.length > 0 ? `License keys: ${licenseKeys.join(', ')}` : 'Download link opened.');
    } catch (err) {
      setDownloadMessage(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingProductId(null);
    }
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
          subject: `Order #${orderId.slice(-8).toUpperCase()} · ${item.product_title}`,
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
        const res = await fetch(
          `/api/pd/orders/me?page=${page}&limit=10${statusParam}`,
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
  }, [page, statusFilter]);

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`mb-8 rounded-[2rem] p-6 text-white sm:p-8 ${classes.header}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">
                <Package className="w-6 h-6" />
                Mes Commandes
              </h1>
              <p className="text-white/75 text-sm mt-1">Suivez l&apos;état de vos commandes.</p>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'pending', 'processing', 'fulfilled', 'delivered', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? classes.primary
                : isAliExpress ? 'bg-white text-gray-600 hover:bg-orange-50 border border-orange-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'Toutes' : statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className={`w-6 h-6 ${classes.primaryText} animate-spin`} />
          <span className="ml-2 text-gray-500">Chargement...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className={`text-center py-16 ${classes.panel}`}>
          <Package className={`w-12 h-12 ${isAliExpress ? 'text-orange-200' : 'text-gray-300'} mx-auto mb-4`} />
          <p className="text-gray-500 text-lg">Aucune commande trouvée.</p>
          <p className="text-gray-400 text-sm mt-1">Vos commandes apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`${classes.panel} overflow-hidden transition-shadow hover:shadow-md`}
            >
              {/* Order Header */}
              <div
                className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-bold text-gray-900">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>
                      {new Date(order.created_at).toLocaleDateString('fr-TN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span>{paymentLabel(order.payment_gateway)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold ${classes.primaryText}`}>
                    {parseFloat(order.total).toFixed(3)} TND
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedOrder === order.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className={`border-t p-4 sm:p-6 ${isAliExpress ? 'border-orange-100 bg-orange-50/40' : 'border-gray-100 bg-gray-50/50'}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Sous-total</span>
                      <p className="text-sm font-medium text-gray-900">{parseFloat(order.subtotal).toFixed(3)} TND</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Livraison</span>
                      <p className="text-sm font-medium text-gray-900">{parseFloat(order.shipping_total).toFixed(3)} TND</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Paiement</span>
                      <p className="text-sm font-medium text-gray-900 capitalize">{order.payment_status}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
                      <p className={`text-sm font-bold ${classes.primaryText}`}>{parseFloat(order.total).toFixed(3)} TND</p>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Articles</span>
                      {order.items.map((item) => {
                        const isDownloadable = (item.product_type === 'digital' || item.product_type === 'serial') && item.has_digital_file;
                        const canDownload = order.payment_status === 'captured' && isDownloadable;
                        return (
                          <div key={`${order.id}-${item.product_id}`} className="flex flex-col gap-2 rounded-2xl bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{item.product_title}</p>
                              <p className="text-xs text-gray-500">
                                {item.quantity} x {parseFloat(item.unit_price).toFixed(3)} TND
                                {item.store_name ? ` · ${item.store_name}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                            {canDownload && (
                              <button
                                type="button"
                                onClick={() => handleDownload(item.product_id)}
                                disabled={downloadingProductId === item.product_id}
                                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-black transition-colors disabled:opacity-50 ${classes.primaryGradient}`}
                              >
                                {downloadingProductId === item.product_id ? (
                                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="mr-2 h-3.5 w-3.5" />
                                )}
                                Télécharger
                              </button>
                            )}
                            {item.store_id && (
                              <button
                                type="button"
                                onClick={() => startSellerChat(order.id, item)}
                                disabled={startingChatKey === `${order.id}-${item.store_id}`}
                                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-black transition-colors disabled:opacity-50 ${isAliExpress ? 'bg-orange-50 text-[#ff4747] hover:bg-orange-100' : 'bg-emerald-50 text-[#16C784] hover:bg-emerald-100'}`}
                              >
                                {startingChatKey === `${order.id}-${item.store_id}` ? (
                                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <MessageSquare className="mr-2 h-3.5 w-3.5" />
                                )}
                                Message
                              </button>
                            )}
                            {item.store_id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReportTarget({ orderId: order.id, storeId: item.store_id!, storeName: item.store_name });
                                  setReportReason('');
                                  setReportMessage('');
                                }}
                                className="inline-flex items-center justify-center rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-black text-red-600 transition-colors hover:bg-red-50"
                              >
                                <Flag className="mr-2 h-3.5 w-3.5" />
                                Signaler le vendeur
                              </button>
                            )}
                            </div>
                          </div>
                        );
                      })}
                      {downloadMessage && (
                        <p className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-gray-600">{downloadMessage}</p>
                      )}
                    </div>
                  )}

                  {order.status === 'payment_required' && order.payment_gateway === 'manual_mandat' && (
                    <Link
                      href={`/hub/checkout/mandat-upload?order_id=${order.id}`}
                      className={`inline-flex items-center px-4 py-2 rounded-full transition-colors text-sm font-black mt-2 ${classes.primaryGradient}`}
                    >
                      Uploader la preuve de mandat
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={`px-4 py-2 text-sm border rounded-full disabled:opacity-50 transition-colors ${isAliExpress ? 'border-orange-200 bg-white hover:bg-orange-50' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-500 px-4">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={`px-4 py-2 text-sm border rounded-full disabled:opacity-50 transition-colors ${isAliExpress ? 'border-orange-200 bg-white hover:bg-orange-50' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            Suivant →
          </button>
        </div>
      )}
      {reportMessage && !reportTarget && (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm">{reportMessage}</p>
      )}
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
              placeholder="Décrivez le problème avec ce vendeur..."
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
