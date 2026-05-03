'use client';

import { useEffect, useState } from 'react';
import { useCart } from '../../../../contexts/CartContext';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

function formatPrice(price: number): string {
  return `${price.toFixed(3)} TND`;
}

const SHIPPING_PER_VENDOR = 7;

interface StoreData {
  id: string;
  name: string;
  settings?: {
    colors?: { primary?: string };
    logo_url?: string;
  };
}

export default function StoreCartPage() {
  const params = useParams();
  const storeHost = decodeURIComponent(params.storeHost as string);
  const { items, removeFromCart, updateQuantity, getItemCount } = useCart();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetch(`/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`);
        if (res.ok) {
          const data = await res.json();
          setStore(data.store);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    fetchStore();
  }, [storeHost]);

  const primaryColor = store?.settings?.colors?.primary || '#16C784';

  // Filter items to only this store
  const storeItems = store ? items.filter((item) => item.store_id === store.id) : [];
  const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingTotal = storeItems.length > 0 ? SHIPPING_PER_VENDOR : 0;
  const total = subtotal + shippingTotal;
  const itemCount = storeItems.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  if (storeItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link
                href={`/store/${params.storeHost}`}
                className="text-xl font-bold"
                style={{ color: primaryColor }}
              >
                {store?.name || storeHost}
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Votre panier est vide</h1>
          <p className="text-gray-500 mb-8">
            Découvrez nos produits et ajoutez-les à votre panier.
          </p>
          <Link
            href={`/store/${params.storeHost}`}
            className="inline-flex items-center gap-2 px-8 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Continuer vos achats
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href={`/store/${params.storeHost}`}
              className="text-xl font-bold"
              style={{ color: primaryColor }}
            >
              {store?.name || storeHost}
            </Link>
            <Link
              href={`/store/${params.storeHost}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la boutique
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Panier ({itemCount} article{itemCount > 1 ? 's' : ''})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {storeItems.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                    {/* Image */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No img
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 line-clamp-1">{item.title}</p>
                      {item.variant && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>
                      )}
                      <p className="text-sm font-semibold text-gray-700 mt-1">
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <span className="px-3 text-sm font-semibold text-gray-900 min-w-[32px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right min-w-[100px]">
                      <p className="font-bold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Shipping */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Livraison : {formatPrice(SHIPPING_PER_VENDOR)}
                </span>
                <span className="font-semibold text-gray-900">
                  Sous-total : {formatPrice(subtotal + shippingTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Résumé</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sous-total</span>
                  <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Livraison</span>
                  <span className="font-medium text-gray-900">{formatPrice(shippingTotal)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900 text-base">Total</span>
                  <span className="font-extrabold text-lg" style={{ color: primaryColor }}>
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <Link
                href={`/store/${params.storeHost}/checkout`}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 text-white font-semibold rounded-xl hover:opacity-90 hover:shadow-lg transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Passer la commande
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href={`/store/${params.storeHost}`}
                className="mt-3 w-full flex items-center justify-center py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Continuer vos achats
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
