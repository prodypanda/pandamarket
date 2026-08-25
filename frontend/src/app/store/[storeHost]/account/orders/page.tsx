'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Package, Clock, CheckCircle2, Eye } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';

interface OrderItem {
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

interface Order {
  id: string;
  status: string;
  payment_status: string;
  total: string;
  created_at: string;
  items: OrderItem[];
}

function formatPrice(priceStr: string | number): string {
  const val = typeof priceStr === 'number' ? priceStr : parseFloat(priceStr || '0');
  return `${val.toFixed(3)} TND`;
}

export default function StorefrontAccountOrdersPage() {
  const params = useParams();
  const storeHost = decodeURIComponent(params.storeHost as string);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetchWithCsrf('/api/pd/orders/storefront/me');
        if (res.ok) {
          const data = await res.json();
          setOrders(data.data || data.orders || []);
        }
      } catch {
        // Error handling
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [storeHost]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs">
        <h1 className="text-xl font-bold text-gray-900 border-b pb-4 mb-6">Mes Commandes</h1>

        {orders.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Vous n’avez pas encore passé de commande sur cette boutique.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isPaid = order.payment_status === 'paid' || order.status === 'completed';
              return (
                <div key={order.id} className="rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 mb-3">
                    <div>
                      <span className="font-extrabold text-sm text-gray-900">Commande #{order.id}</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Passée le {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Payée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" /> En attente
                        </span>
                      )}
                      <span className="text-base font-extrabold text-emerald-600">{formatPrice(order.total)}</span>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors"
                        title="Voir le détail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {order.items?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1.5">
                        <span className="font-medium text-gray-800 line-clamp-1">{item.product_title} (x{item.quantity})</span>
                        <span className="font-semibold text-gray-900">{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <p className="text-[11px] text-gray-400 pt-1">+ {order.items.length - 3} autre(s) article(s)</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Détails de la commande #{selectedOrder.id}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-3">
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-semibold text-gray-900">{item.product_title}</p>
                    <p className="text-xs text-gray-500">Quantité : {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-gray-900">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-base font-extrabold border-t pt-4">
              <span>Total</span>
              <span className="text-emerald-600">{formatPrice(selectedOrder.total)}</span>
            </div>

            <div className="pt-4 flex items-center justify-between border-t">
              <Link
                href={`/checkout/success?order=${encodeURIComponent(selectedOrder.id)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors"
              >
                Gérer le reçu Mandat
              </Link>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
