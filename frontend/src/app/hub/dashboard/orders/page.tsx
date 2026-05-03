'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, Eye, Truck, Loader2 } from 'lucide-react';

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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await fetch(`${backendUrl}/api/pd/orders?page=${page}&limit=20`, {
          credentials: 'include',
        });
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
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and fulfill your customer orders.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by order ID or customer..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#16C784] focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <button className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
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
                        <button className="p-2 text-gray-400 hover:text-[#16C784] hover:bg-[#16C784]/5 rounded-lg transition-colors" title="Voir détails">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Marquer expédié">
                          <Truck className="w-4 h-4" />
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
    </div>
  );
}
