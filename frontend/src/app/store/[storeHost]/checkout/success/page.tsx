'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Clock, Package, AlertCircle, ArrowLeft, Store, FileText } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { isMarketplaceHost } from '@/lib/store-hosts';
import { getHubAbsoluteUrl } from '@/lib/storefront-url';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '@/lib/themes';

interface OrderItem {
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  store_name?: string;
}

interface OrderDetail {
  id: string;
  status: string;
  payment_status: string;
  payment_gateway?: string;
  total: string;
  currency?: string;
  created_at: string;
  items: OrderItem[];
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    address_line_1?: string;
    city?: string;
    postal_code?: string;
  };
}

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    themeCustomization?: ThemeCustomization;
  };
}

function formatPrice(amount: string | number, currency = 'TND') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount || '0');
  return `${num.toFixed(2)} ${currency}`;
}

interface MandatReceipt {
  id: string;
  order_id: string;
  file_name: string;
  status: string;
  review_notes?: string | null;
  created_at: string;
}

function MandatReceiptSection({ orderId }: { orderId: string }) {
  const [receipt, setReceipt] = useState<MandatReceipt | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadReceipt() {
      try {
        const res = await fetchWithCsrf(`/api/pd/payments/storefront/receipt/${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          setReceipt(data.receipt);
          setViewUrl(data.view_url || null);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    loadReceipt();
  }, [orderId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccessMsg('');
    setUploading(true);

    try {
      // 1. Presign upload
      const presignRes = await fetchWithCsrf('/api/pd/files/storefront/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'image/jpeg',
          purpose: 'mandat_proof',
          file_size: file.size,
        }),
      });

      if (!presignRes.ok) {
        const errData = await presignRes.json().catch(() => null);
        setError(errData?.error?.message || 'Erreur lors de la préparation de l’envoi.');
        setUploading(false);
        return;
      }

      const presignData = await presignRes.json();

      // 2. Upload file to presigned URL (or S3 mock)
      const uploadRes = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      if (!uploadRes.ok) {
        setError('Erreur lors du transfert du fichier.');
        setUploading(false);
        return;
      }

      // 3. Register receipt
      const receiptRes = await fetchWithCsrf('/api/pd/payments/storefront/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          file_key: presignData.file_key,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        }),
      });

      if (!receiptRes.ok) {
        const errData = await receiptRes.json().catch(() => null);
        setError(errData?.error?.message || 'Erreur lors de l’enregistrement du reçu.');
        setUploading(false);
        return;
      }

      const receiptData = await receiptRes.json();
      setReceipt(receiptData.receipt);
      setSuccessMsg('Reçu envoyé avec succès ! Il est en cours de vérification par le vendeur.');
    } catch {
      setError('Erreur réseau lors de l’envoi du reçu.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <div className="py-4 text-center text-sm text-gray-500">Chargement...</div>;
  }

  return (
    <div>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-amber-100 text-amber-600">
        <Clock className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-extrabold mb-2 text-gray-900">
        Commande en attente de mandat
      </h1>
      <p className="text-sm max-w-md mx-auto mb-6 text-gray-600">
        Votre commande <strong>#{orderId}</strong> est réservée. Veuillez effectuer votre virement/mandat postal et uploader votre reçu pour valider la commande.
      </p>

      {/* Receipt Status or Upload Box */}
      <div className="max-w-md mx-auto rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-left space-y-4">
        <h3 className="font-bold text-sm text-amber-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600" />
          Reçu de paiement Mandat Minute
        </h3>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
            {successMsg}
          </div>
        )}

        {receipt ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Statut du reçu :</span>
              {receipt.status === 'approved' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Approuvé</span>
              ) : receipt.status === 'rejected' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">Rejeté</span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">En attente de vérification</span>
              )}
            </div>

            <p className="text-xs text-gray-600 font-mono line-clamp-1">Fichier : {receipt.file_name}</p>

            {receipt.review_notes && (
              <p className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border">Note du vendeur : {receipt.review_notes}</p>
            )}

            {viewUrl && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:underline"
              >
                Consulter le reçu envoyé →
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-600">
              Veuillez prendre une photo ou scanner votre bordereau de mandat postal (Format JPG, PNG).
            </p>

            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer bg-white hover:bg-amber-50/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-2 pb-3">
                <FileText className="w-6 h-6 text-amber-500 mb-1" />
                <p className="text-xs font-bold text-gray-700">
                  {uploading ? 'Envoi en cours...' : 'Sélectionner le reçu'}
                </p>
                <p className="text-[11px] text-gray-400">JPG, PNG (max 10MB)</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const storeHost = decodeURIComponent(params.storeHost as string);
  const orderId = searchParams.get('order') || searchParams.get('order_id');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!orderId) {
        setError('Aucun numéro de commande spécifié.');
        setLoading(false);
        return;
      }

      try {
        const [storeRes, orderRes] = await Promise.all([
          fetchWithCsrf(`/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`),
          fetchWithCsrf(`/api/pd/orders/storefront/${encodeURIComponent(orderId)}`),
        ]);

        if (storeRes.ok) {
          const storeData = await storeRes.json();
          setStore(storeData.store);
        }

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setOrder(orderData.data || orderData.order || orderData);
        } else {
          setError('Commande introuvable ou vous n’avez pas l’autorisation de la consulter.');
        }
      } catch {
        setError('Erreur lors du chargement de la commande.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [storeHost, orderId]);

  const activeTheme = store?.theme_id ? themes[store.theme_id] || themes.classic : themes.classic;
  const themeCustomization = (store?.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);
  const primaryColor = store?.settings?.colors?.primary || resolvedColors.primary;
  const pageBackground = resolvedColors.background;
  const textColor = resolvedColors.text;
  const mutedTextColor = `${textColor}99`;
  const surfaceColor = store?.settings?.colors?.secondary || resolvedColors.secondary;
  const borderColor = `${primaryColor}20`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16C784]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-xs border border-gray-100">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande non vérifiée</h1>
          <p className="text-sm text-gray-600 mb-6">{error || 'La commande spécifiée n’a pas pu être chargée.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b576] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.payment_status === 'paid' || order.status === 'completed' || order.status === 'paid';
  const isCod = order.payment_gateway === 'cod';
  const isMandat = order.payment_gateway === 'manual_mandat';

  return (
    <div className={`min-h-screen ${activeTheme.typography.fontFamily} py-12 px-4 sm:px-6 lg:px-8`} style={{ backgroundColor: pageBackground, color: textColor }}>
      <div className="max-w-3xl mx-auto">
        {/* Main Status Card */}
        <div className="rounded-2xl border p-8 sm:p-10 text-center shadow-xs mb-8" style={{ backgroundColor: surfaceColor, borderColor }}>
          {isPaid ? (
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100 text-emerald-600">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-extrabold mb-2" style={{ color: textColor }}>
                Paiement confirmé !
              </h1>
              <p className="text-sm max-w-md mx-auto mb-6" style={{ color: mutedTextColor }}>
                Merci pour votre achat. Votre commande <strong style={{ color: textColor }}>#{order.id}</strong> a été validée et est en cours de préparation.
              </p>
            </>
          ) : isCod ? (
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-blue-100 text-blue-600">
                <Package className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-extrabold mb-2" style={{ color: textColor }}>
                Commande enregistrée !
              </h1>
              <p className="text-sm max-w-md mx-auto mb-6" style={{ color: mutedTextColor }}>
                Votre commande <strong style={{ color: textColor }}>#{order.id}</strong> a été reçue. Le paiement s’effectuera en espèces lors de la livraison.
              </p>
            </>
          ) : isMandat ? (
            <MandatReceiptSection orderId={order.id} />
          ) : (
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100 text-emerald-600">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-extrabold mb-2" style={{ color: textColor }}>
                Commande enregistrée
              </h1>
              <p className="text-sm max-w-md mx-auto mb-6" style={{ color: mutedTextColor }}>
                Votre commande <strong style={{ color: textColor }}>#{order.id}</strong> a été transmise à la boutique.
              </p>
            </>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              <Store className="w-4 h-4" />
              Retour à la boutique
            </Link>
            <Link
              href={getHubAbsoluteUrl('/hub/account')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Mes commandes
            </Link>
          </div>
        </div>

        {/* Order Details Breakdown */}
        <div className="rounded-2xl border p-6 sm:p-8 space-y-6" style={{ backgroundColor: surfaceColor, borderColor }}>
          <h2 className="text-lg font-bold border-b pb-3" style={{ color: textColor, borderColor }}>
            Détails de la commande #{order.id}
          </h2>

          {/* Items */}
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-semibold" style={{ color: textColor }}>{item.product_title}</p>
                  <p className="text-xs" style={{ color: mutedTextColor }}>Quantité : {item.quantity}</p>
                </div>
                <span className="font-semibold" style={{ color: textColor }}>{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="flex justify-between items-center text-base font-extrabold border-t pt-4" style={{ borderColor }}>
            <span>Total payé/dû</span>
            <span style={{ color: primaryColor }}>{formatPrice(order.total)}</span>
          </div>

          {/* Shipping Address if available */}
          {order.shipping_address && (
            <div className="border-t pt-4 text-xs space-y-1" style={{ borderColor, color: mutedTextColor }}>
              <p className="font-bold uppercase tracking-wider text-gray-700">Adresse de livraison</p>
              <p>{order.shipping_address.first_name} {order.shipping_address.last_name}</p>
              <p>{order.shipping_address.address_line_1}, {order.shipping_address.city} {order.shipping_address.postal_code}</p>
              <p>Tél : {order.shipping_address.phone}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StorefrontCheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
