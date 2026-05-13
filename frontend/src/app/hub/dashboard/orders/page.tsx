'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { Search, Filter, Eye, Truck, Loader2, MessageSquare, X, CalendarDays, CreditCard, PackageCheck, RefreshCw, TrendingUp } from 'lucide-react';

interface Order {
  id: string;
  customer_id?: string | null;
  storefront_customer_id?: string | null;
  status: string;
  payment_gateway: string;
  payment_status: string;
  subtotal: string;
  shipping_total: string;
  total: string;
  currency: string;
  created_at: string;
  shipping_address?: ShippingAddress | null;
  store_subtotal?: string | null;
  store_shipping_total?: string | null;
  store_total?: string | null;
  fulfillment_id?: string | null;
  fulfillment_status?: string | null;
  carrier?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  customer_email?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone?: string | null;
  items?: OrderItem[];
}

interface ShippingAddress {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface OrderItem {
  id?: string;
  product_id?: string;
  variant_id?: string | null;
  product_title?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  subtotal?: number | string | null;
  product_type?: string | null;
  thumbnail?: string | null;
  variant_sku?: string | null;
  variant_title?: string | null;
}

interface OrderSummary {
  total_orders: number;
  open_orders: number;
  to_ship: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  captured_orders: number;
  captured_revenue: number;
  revenue_today: number;
  revenue_7d: number;
  revenue_30d: number;
  average_order_value: number;
}

interface OrderMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  summary?: OrderSummary;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'payment_required': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'fulfilled': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'delivered': return 'bg-green-50 text-green-700 border-green-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
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
  };
  return labels[status] || status;
};

const paymentStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    captured: 'Payé',
    failed: 'Échec',
    refunded: 'Remboursé',
  };
  return labels[status] || status || '—';
};

const paymentStatusColor = (status: string) => {
  switch (status) {
    case 'captured': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'failed': return 'bg-red-50 text-red-700 border-red-200';
    case 'refunded': return 'bg-slate-100 text-slate-700 border-slate-200';
    default: return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

async function getErrorMessage(res: Response, fallback = 'Erreur') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function toNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(value: unknown, currency = 'TND') {
  return `${toNumber(value).toFixed(3)} ${currency}`;
}

function customerName(order: Order) {
  const name = [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ').trim();
  return name || order.customer_email || order.customer_id || order.storefront_customer_id || 'Client';
}

function fulfillmentLabel(status?: string | null) {
  if (!status) return 'Non expédiable';
  const labels: Record<string, string> = {
    pending: 'À expédier',
    shipped: 'Expédié',
    delivered: 'Livré',
    cancelled: 'Annulé',
  };
  return labels[status] || status;
}

function fulfillmentColor(status?: string | null) {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'shipped': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function canFulfill(order: Order) {
  return order.fulfillment_status === 'pending' && !['fulfilled', 'delivered', 'cancelled'].includes(order.status);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [meta, setMeta] = useState<OrderMeta>({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [fulfillOrderTarget, setFulfillOrderTarget] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [fulfillingId, setFulfillingId] = useState('');
  const [startingChatId, setStartingChatId] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (statusFilter) params.set('status', statusFilter);
      if (paymentStatusFilter) params.set('payment_status', paymentStatusFilter);
      if (fulfillmentStatusFilter) params.set('fulfillment_status', fulfillmentStatusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetchWithCsrf(`/api/pd/orders/store?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setTotalPages(data.meta?.total_pages || 1);
        setMeta(data.meta || { page, limit: 20, total: 0, total_pages: 1 });
      } else {
        setError(await getErrorMessage(res, 'Erreur lors du chargement des commandes'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, fulfillmentStatusFilter, page, paymentStatusFilter, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePaymentStatusChange = (value: string) => {
    setPaymentStatusFilter(value);
    setPage(1);
  };

  const handleFulfillmentStatusChange = (value: string) => {
    setFulfillmentStatusFilter(value);
    setPage(1);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setFulfillmentStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const openFulfillmentModal = (order: Order) => {
    setFulfillOrderTarget(order);
    setCarrier('');
    setTrackingNumber('');
  };

  const openOrderDetail = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingOrderDetail(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}`, { credentials: 'include' });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors du chargement du détail'));
        return;
      }
      const data = await res.json();
      setSelectedOrder(data.order || order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const fulfillOrder = async () => {
    if (!fulfillOrderTarget) return;
    const order = fulfillOrderTarget;
    setFulfillingId(order.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/${order.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          carrier: carrier.trim() || undefined,
          tracking_number: trackingNumber.trim() || undefined,
        }),
      });

      if (res.ok) {
        setFulfillOrderTarget(null);
        setCarrier('');
        setTrackingNumber('');
        await fetchOrders();
        if (selectedOrder?.id === order.id) {
          await openOrderDetail(order);
        }
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de l’expédition'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setFulfillingId('');
    }
  };

  const startBuyerChat = async (order: Order) => {
    setStartingChatId(order.id);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/chats/store/buyer-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          order_id: order.id,
          subject: `Order #${order.id.slice(-8).toUpperCase()}`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || 'Impossible de démarrer la conversation');
      window.location.href = `/hub/dashboard/messages?conversation=${encodeURIComponent(data.conversation.id)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversation indisponible');
    } finally {
      setStartingChatId('');
    }
  };

  const summary = meta.summary;
  const hasActiveFilters = Boolean(search || statusFilter || paymentStatusFilter || fulfillmentStatusFilter || dateFrom || dateTo);
  const activeFilterCount = [search, statusFilter, paymentStatusFilter, fulfillmentStatusFilter, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and fulfill your customer orders.</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchOrders()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Revenu 30j', value: formatMoney(summary?.revenue_30d ?? 0), icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Aujourd’hui', value: formatMoney(summary?.revenue_today ?? 0), icon: CalendarDays, tone: 'bg-blue-50 text-blue-700' },
          { label: 'À expédier', value: String(summary?.to_ship ?? 0), icon: PackageCheck, tone: 'bg-amber-50 text-amber-700' },
          { label: 'AOV', value: formatMoney(summary?.average_order_value ?? 0), icon: CreditCard, tone: 'bg-purple-50 text-purple-700' },
          { label: 'Commandes', value: String(summary?.total_orders ?? meta.total), icon: Truck, tone: 'bg-slate-50 text-slate-700' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={`mb-4 inline-flex rounded-2xl p-3 ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{item.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="space-y-4 border-b border-gray-100 bg-gray-50/50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by order ID or customer..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#16C784] focus:border-transparent outline-none transition-shadow"
              />
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <Filter className="w-4 h-4 mr-2" />
              <select
                value={statusFilter}
                onChange={(event) => handleStatusChange(event.target.value)}
                className="min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 outline-none transition-colors hover:bg-gray-50 lg:flex-none"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="payment_required">Paiement requis</option>
                <option value="processing">En cours</option>
                <option value="fulfilled">Expédié</option>
                <option value="delivered">Livré</option>
                <option value="cancelled">Annulé</option>
              </select>
              <select
                value={paymentStatusFilter}
                onChange={(event) => handlePaymentStatusChange(event.target.value)}
                className="min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 outline-none transition-colors hover:bg-gray-50 lg:flex-none"
              >
                <option value="">Tous paiements</option>
                <option value="pending">En attente</option>
                <option value="captured">Payé</option>
                <option value="failed">Échec</option>
                <option value="refunded">Remboursé</option>
              </select>
              <select
                value={fulfillmentStatusFilter}
                onChange={(event) => handleFulfillmentStatusChange(event.target.value)}
                className="min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 outline-none transition-colors hover:bg-gray-50 lg:flex-none"
              >
                <option value="">Tous fulfillment</option>
                <option value="pending">À expédier</option>
                <option value="shipped">Expédié</option>
                <option value="delivered">Livré</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:flex">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-500">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <span>Du</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => handleDateFromChange(event.target.value)}
                  className="min-w-0 outline-none"
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-500">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <span>Au</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => handleDateToChange(event.target.value)}
                  className="min-w-0 outline-none"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {meta.total} résultat{meta.total !== 1 ? 's' : ''}{hasActiveFilters ? ` · ${activeFilterCount} filtre${activeFilterCount > 1 ? 's' : ''}` : ''}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 hover:border-[#16C784] hover:text-[#16C784]"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#16C784] animate-spin" />
              <span className="ml-2 text-gray-500">Chargement des commandes...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Aucune commande pour le moment.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold">ID Commande</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Paiement</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 font-semibold">Fulfillment</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-[#16C784] transition-colors">
                        {order.id.slice(0, 16)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('fr-TN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <p className="font-semibold text-gray-900">{customerName(order)}</p>
                      {order.customer_email && <p className="text-xs text-gray-500">{order.customer_email}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <p className="font-semibold capitalize text-gray-700">
                        {order.payment_gateway?.replace('_', ' ') || '—'}
                      </p>
                      <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${paymentStatusColor(order.payment_status)}`}>
                        {paymentStatusLabel(order.payment_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatMoney(order.store_total ?? order.total, order.currency || 'TND')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${fulfillmentColor(order.fulfillment_status)}`}>
                        {fulfillmentLabel(order.fulfillment_status)}
                      </span>
                      {order.tracking_number && <p className="mt-1 text-xs font-semibold text-gray-500">{order.tracking_number}</p>}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => void openOrderDetail(order)}
                          className="p-2 text-gray-400 hover:text-[#16C784] hover:bg-[#16C784]/5 rounded-lg transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startBuyerChat(order)}
                          disabled={startingChatId === order.id}
                          className="p-2 text-gray-400 hover:text-[#16C784] hover:bg-[#16C784]/5 rounded-lg transition-colors disabled:opacity-40"
                          title="Message buyer"
                        >
                          {startingChatId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openFulfillmentModal(order)}
                          disabled={fulfillingId === order.id || !canFulfill(order)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Marquer expédié"
                        >
                          {fulfillingId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Truck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              ← Précédent
            </button>
            <span className="text-sm text-gray-500">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Détails commande</h2>
                <p className="text-xs text-gray-500">{selectedOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-78px)] overflow-y-auto p-6">
              {loadingOrderDetail ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-[#16C784]" />
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Statut</p>
                        <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                          {statusLabel(selectedOrder.status)}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Fulfillment</p>
                        <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${fulfillmentColor(selectedOrder.fulfillment_status)}`}>
                          {fulfillmentLabel(selectedOrder.fulfillment_status)}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Votre total</p>
                        <p className="mt-2 text-lg font-black text-gray-900">{formatMoney(selectedOrder.store_total ?? selectedOrder.total, selectedOrder.currency || 'TND')}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <h3 className="text-sm font-black text-gray-900">Articles de votre boutique</h3>
                      <div className="mt-4 space-y-3">
                        {(selectedOrder.items || []).length > 0 ? (
                          selectedOrder.items?.map((item) => (
                            <div key={item.id || `${item.product_id}-${item.variant_id}`} className="flex gap-3 rounded-2xl bg-gray-50 p-3">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-200">
                                {item.thumbnail && (
                                  <div
                                    aria-label={item.product_title || 'Product image'}
                                    role="img"
                                    className="h-full w-full bg-cover bg-center"
                                    style={{ backgroundImage: `url(${item.thumbnail})` }}
                                  />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black text-gray-900">{item.product_title || 'Produit'}</p>
                                <p className="mt-1 text-xs font-semibold text-gray-500">
                                  Qté {toNumber(item.quantity)} · {formatMoney(item.unit_price, selectedOrder.currency || 'TND')}
                                  {item.variant_sku ? ` · SKU ${item.variant_sku}` : ''}
                                </p>
                              </div>
                              <p className="text-sm font-black text-gray-900">{formatMoney(item.subtotal, selectedOrder.currency || 'TND')}</p>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">Détail des articles indisponible.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <h3 className="text-sm font-black text-gray-900">Client</h3>
                        <div className="mt-3 space-y-2 text-sm">
                          <p className="font-bold text-gray-900">{customerName(selectedOrder)}</p>
                          <p className="text-gray-600">{selectedOrder.customer_email || 'Email non disponible'}</p>
                          <p className="text-gray-600">{selectedOrder.customer_phone || 'Téléphone non disponible'}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <h3 className="text-sm font-black text-gray-900">Adresse livraison</h3>
                        {selectedOrder.shipping_address ? (
                          <div className="mt-3 space-y-1 text-sm font-semibold text-gray-600">
                            <p>{[selectedOrder.shipping_address.first_name, selectedOrder.shipping_address.last_name].filter(Boolean).join(' ')}</p>
                            <p>{selectedOrder.shipping_address.address_line_1}</p>
                            {selectedOrder.shipping_address.address_line_2 && <p>{selectedOrder.shipping_address.address_line_2}</p>}
                            <p>{[selectedOrder.shipping_address.postal_code, selectedOrder.shipping_address.city].filter(Boolean).join(' ')}</p>
                            <p>{selectedOrder.shipping_address.country || 'TN'}</p>
                            {selectedOrder.shipping_address.phone && <p>{selectedOrder.shipping_address.phone}</p>}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm font-semibold text-gray-500">Pas d’adresse requise.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <h3 className="text-sm font-black text-gray-900">Paiement</h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Méthode</span>
                          <span className="font-bold text-gray-900">{selectedOrder.payment_gateway?.replace('_', ' ') || '—'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Statut</span>
                          <span className="font-bold text-gray-900">{selectedOrder.payment_status || '—'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Sous-total boutique</span>
                          <span className="font-bold text-gray-900">{formatMoney(selectedOrder.store_subtotal ?? selectedOrder.subtotal, selectedOrder.currency || 'TND')}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Livraison boutique</span>
                          <span className="font-bold text-gray-900">{formatMoney(selectedOrder.store_shipping_total ?? selectedOrder.shipping_total, selectedOrder.currency || 'TND')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <h3 className="text-sm font-black text-gray-900">Expédition</h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="font-bold text-gray-900">{fulfillmentLabel(selectedOrder.fulfillment_status)}</p>
                        <p className="text-gray-600">Transporteur: {selectedOrder.carrier || '—'}</p>
                        <p className="text-gray-600">Tracking: {selectedOrder.tracking_number || '—'}</p>
                        {selectedOrder.shipped_at && <p className="text-gray-600">Expédiée le {new Date(selectedOrder.shipped_at).toLocaleDateString('fr-TN')}</p>}
                      </div>
                      {canFulfill(selectedOrder) && (
                        <button
                          type="button"
                          onClick={() => openFulfillmentModal(selectedOrder)}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16C784] px-4 py-3 text-sm font-black text-white transition hover:bg-[#14b876]"
                        >
                          <Truck className="h-4 w-4" />
                          Marquer expédiée
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {fulfillOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Marquer comme expédiée</h2>
                <p className="mt-1 text-xs font-semibold text-gray-500">Commande #{fulfillOrderTarget.id.slice(-8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setFulfillOrderTarget(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Transporteur</label>
                <input
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  placeholder="Aramex, DHL, La Poste..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Numéro de suivi</label>
                <input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="Tracking number"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10"
                />
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Cette action expédie la partie de commande liée à votre boutique. Si toutes les boutiques ont expédié, la commande passera en statut expédié.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFulfillOrderTarget(null)}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void fulfillOrder()}
                  disabled={fulfillingId === fulfillOrderTarget.id}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16C784] px-5 py-3 text-sm font-black text-white transition hover:bg-[#14b876] disabled:opacity-60"
                >
                  {fulfillingId === fulfillOrderTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Confirmer l’expédition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
