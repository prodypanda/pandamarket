'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { Search, Filter, Eye, Truck, Loader2, MessageSquare } from 'lucide-react';

interface Order {
  id: string;
  customer_id: string;
  status: string;
  payment_gateway: string;
  payment_status: string;
  subtotal: string;
  shipping_total: string;
  total: string;
  currency: string;
  created_at: string;
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

async function getErrorMessage(res: Response, fallback = 'Erreur') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
      if (search.trim()) params.set('search', search.trim());

      const res = await fetchWithCsrf(`/api/pd/orders/store?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setTotalPages(data.meta?.total_pages || 1);
      } else {
        setError(await getErrorMessage(res, 'Erreur lors du chargement des commandes'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

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

  const fulfillOrder = async (order: Order) => {
    const carrier = window.prompt('Transporteur (optionnel)', '') || '';
    const trackingNumber = window.prompt('Numéro de suivi (optionnel)', '') || '';

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
        await fetchOrders();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and fulfill your customer orders.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by order ID or customer..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#16C784] focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            <select
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value)}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="payment_required">Paiement requis</option>
              <option value="processing">En cours</option>
              <option value="fulfilled">Expédié</option>
              <option value="delivered">Livré</option>
              <option value="cancelled">Annulé</option>
            </select>
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
                  <th className="px-6 py-4 font-semibold">Paiement</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
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
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {order.payment_gateway?.replace('_', ' ') || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {parseFloat(order.total).toFixed(3)} {order.currency || 'TND'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
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
                          onClick={() => fulfillOrder(order)}
                          disabled={fulfillingId === order.id || ['fulfilled', 'delivered', 'cancelled'].includes(order.status)}
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
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Détails commande</h2>
                <p className="text-xs text-gray-500">{selectedOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Client</span>
                <span className="font-medium text-gray-900">{selectedOrder.customer_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Statut</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                  {statusLabel(selectedOrder.status)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paiement</span>
                <span className="font-medium text-gray-900">{selectedOrder.payment_gateway?.replace('_', ' ') || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Statut paiement</span>
                <span className="font-medium text-gray-900">{selectedOrder.payment_status || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sous-total</span>
                <span className="font-medium text-gray-900">{parseFloat(selectedOrder.subtotal).toFixed(3)} {selectedOrder.currency || 'TND'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Livraison</span>
                <span className="font-medium text-gray-900">{parseFloat(selectedOrder.shipping_total).toFixed(3)} {selectedOrder.currency || 'TND'}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <span className="text-gray-900 font-semibold">Total</span>
                <span className="font-bold text-gray-900">{parseFloat(selectedOrder.total).toFixed(3)} {selectedOrder.currency || 'TND'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
