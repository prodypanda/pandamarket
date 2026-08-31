'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Package, Clock, CheckCircle2, Eye, Truck, XCircle, Download, Loader2 } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';

interface OrderItem {
  id?: string;
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  product_type?: string;
  thumbnail?: string | null;
  has_digital_file?: boolean;
}

/**
 * A storefront order is always single-store (checkout rejects any product that
 * does not belong to the storefront), so there is at most ONE parcel — no
 * "Colis 1/2" numbering is needed here, unlike the marketplace Hub page.
 */
interface OrderPackage {
  id: string;
  store_id: string;
  store_name?: string | null;
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
  payment_status: string;
  payment_gateway?: string;
  subtotal?: string;
  shipping_total?: string;
  total: string;
  created_at: string;
  items: OrderItem[];
  /** Store-scoped parcel of this order (empty for digital-only orders). */
  fulfillments?: OrderPackage[];
}

function formatPrice(priceStr: string | number): string {
  const val = typeof priceStr === 'number' ? priceStr : parseFloat(priceStr || '0');
  return `${val.toFixed(3)} TND`;
}

/** Order-level status label. Partial states cannot normally occur on a
 *  single-store storefront order, but are handled defensively. */
const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    payment_required: 'Paiement requis',
    pending: 'En attente',
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

const statusColor = (status: string) => {
  switch (status) {
    case 'payment_required': return 'bg-orange-100 text-orange-800';
    case 'processing': return 'bg-blue-100 text-blue-800';
    case 'partially_shipped': return 'bg-violet-100 text-violet-800';
    case 'fulfilled': return 'bg-purple-100 text-purple-800';
    case 'partially_delivered': return 'bg-emerald-100 text-emerald-800';
    case 'delivered': return 'bg-emerald-100 text-emerald-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'refunded': return 'bg-gray-100 text-gray-700';
    default: return 'bg-amber-100 text-amber-800';
  }
};

const paymentStatusLabel = (paymentStatus: string) => {
  const labels: Record<string, string> = {
    captured: 'Payée',
    pending: 'Paiement en attente',
    failed: 'Paiement échoué',
    refunded: 'Remboursée',
  };
  return labels[paymentStatus] || paymentStatus;
};

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
    case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'shipped': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'preparing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

/** Carrier tracking deep links (same coverage as the marketplace Hub page). */
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

const shortId = (id: string) => `#${id.slice(-8).toUpperCase()}`;

export default function StorefrontAccountOrdersPage() {
  const params = useParams();
  const storeHost = decodeURIComponent(params.storeHost as string);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [downloadingProductId, setDownloadingProductId] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState('');

  useEffect(() => {
    async function loadOrders() {
      try {
        // Storefront channel only: this endpoint returns orders placed on THIS
        // storefront (storefront_customer_id scoped to the store). Marketplace
        // Hub orders are a separate channel and never appear here.
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

  const handleDownload = async (productId: string) => {
    setDownloadingProductId(productId);
    setDownloadMessage('');
    try {
      const res = await fetch(`/api/pd/products/${productId}/download`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Téléchargement indisponible');
      if (data.data?.download_url) {
        window.open(data.data.download_url, '_blank', 'noopener,noreferrer');
      }
      const licenseKeys = Array.isArray(data.data?.license_keys)
        ? data.data.license_keys
        : data.data?.license_key ? [data.data.license_key] : [];
      setDownloadMessage(licenseKeys.length > 0 ? `Clés de licence : ${licenseKeys.join(', ')}` : 'Lien de téléchargement ouvert.');
    } catch (err) {
      setDownloadMessage(err instanceof Error ? err.message : 'Téléchargement échoué');
    } finally {
      setDownloadingProductId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  const renderParcel = (order: Order, pkg: OrderPackage) => {
    const trackingUrl = getCarrierTrackingUrl(pkg.carrier, pkg.tracking_number);
    return (
      <div key={pkg.id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className="rounded-xl bg-white p-2 border border-gray-100">
              <Truck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Expédition</p>
              {pkg.carrier ? (
                <p className="text-xs text-gray-500">
                  Transporteur : <strong className="text-gray-700">{pkg.carrier}</strong>
                  {pkg.tracking_number ? ` · N° ${pkg.tracking_number}` : ''}
                </p>
              ) : (
                <p className="text-xs text-gray-400">Transporteur non encore assigné</p>
              )}
              {pkg.shipped_at && (
                <p className="text-[11px] text-gray-400">
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
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
              >
                Suivre mon colis ↗
              </a>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {pkg.items.map((item) => {
            const isDownloadable = (item.product_type === 'digital' || item.product_type === 'serial') && item.has_digital_file;
            const canDownload = order.payment_status === 'captured' && isDownloadable;
            return (
              <div key={item.id || `${pkg.id}-${item.product_id}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{item.product_title}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} x {formatPrice(item.unit_price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{formatPrice(item.subtotal)}</span>
                  {canDownload && (
                    <button
                      type="button"
                      onClick={() => handleDownload(item.product_id)}
                      disabled={downloadingProductId === item.product_id}
                      className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
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
  };

  /** Items with no parcel (digital products generate no fulfillment). */
  const orphanItems = (order: Order) => {
    const parcelStores = new Set((order.fulfillments || []).map((pkg) => pkg.store_id));
    if (parcelStores.size === 0) return order.items || [];
    const parcelItemIds = new Set(
      (order.fulfillments || []).flatMap((pkg) => pkg.items.map((item) => item.id || item.product_id)),
    );
    return (order.items || []).filter((item) => !parcelItemIds.has(item.id || item.product_id));
  };

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
              const isPaid = order.payment_status === 'captured';
              const parcels = order.fulfillments || [];
              return (
                <div key={order.id} className="rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 mb-3">
                    <div>
                      <span className="font-extrabold text-sm text-gray-900">Commande {shortId(order.id)}</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Passée le {new Date(order.created_at).toLocaleDateString('fr-TN')}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${statusColor(order.status)}`}>
                        {order.status === 'delivered' || order.status === 'partially_delivered' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : order.status === 'cancelled' || order.status === 'refunded' ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : order.status === 'fulfilled' || order.status === 'partially_shipped' ? (
                          <Truck className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {statusLabel(order.status)}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {paymentStatusLabel(order.payment_status)}
                      </span>
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

                  {parcels.length > 0 ? (
                    <div className="space-y-3">
                      {parcels.map((pkg) => renderParcel(order, pkg))}
                      {orphanItems(order).length > 0 && (
                        <div className="rounded-2xl border border-dashed border-gray-200 p-3 space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Articles numériques (sans expédition)</p>
                          {orphanItems(order).map((item) => (
                            <div key={`orphan-${order.id}-${item.product_id}`} className="flex justify-between items-center text-xs py-1">
                              <span className="font-medium text-gray-800 line-clamp-1">{item.product_title} (x{item.quantity})</span>
                              <span className="font-semibold text-gray-900">{formatPrice(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
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
                  )}

                  {downloadMessage && (
                    <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">{downloadMessage}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Commande {shortId(selectedOrder.id)}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(selectedOrder.created_at).toLocaleDateString('fr-TN')} ·{' '}
                  <span className="font-semibold">{statusLabel(selectedOrder.status)}</span>
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
            </div>

            {(selectedOrder.fulfillments || []).length > 0 ? (
              <div className="space-y-3">
                {(selectedOrder.fulfillments || []).map((pkg) => renderParcel(selectedOrder, pkg))}
              </div>
            ) : (
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
            )}

            <div className="space-y-1 border-t pt-4 text-sm">
              {selectedOrder.subtotal && (
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span className="font-semibold text-gray-900">{formatPrice(selectedOrder.subtotal)}</span>
                </div>
              )}
              {selectedOrder.shipping_total && (
                <div className="flex justify-between text-gray-600">
                  <span>Livraison</span>
                  <span className="font-semibold text-gray-900">{formatPrice(selectedOrder.shipping_total)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-base font-extrabold pt-2">
                <span>Total</span>
                <span className="text-emerald-600">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t">
              {/* Mandat receipt management only applies to Mandat Minute orders
                  that are still awaiting payment. */}
              {selectedOrder.payment_gateway === 'manual_mandat' && selectedOrder.payment_status !== 'captured' ? (
                <Link
                  href={`/checkout/success?order=${encodeURIComponent(selectedOrder.id)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors"
                >
                  Gérer le reçu Mandat
                </Link>
              ) : (
                <span />
              )}
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
