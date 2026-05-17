'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useCart } from '../../../../contexts/CartContext';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { isMarketplaceHost } from '../../../../lib/store-hosts';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '../../../../lib/themes';
import { getCartItemUnitPrice, getCartLineTotal, getStoreShippingTotal } from '../../../../lib/cart-utils';

function formatPrice(price: number): string {
  return `${price.toFixed(3)} TND`;
}

const SHIPPING_PER_VENDOR = 7;

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  status?: string | null;
  is_verified?: boolean | null;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    themeCustomization?: ThemeCustomization;
  };
}

function isPublicStore(store: StoreData): boolean {
  return store.status === 'verified' && store.is_verified === true;
}

export default function StoreCartPage() {
  const params = useParams();
  const router = useRouter();
  const storeHost = decodeURIComponent(params.storeHost as string);
  const { items, removeFromCart, updateQuantity } = useCart();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeError, setStoreError] = useState('');

  useEffect(() => {
    if (isMarketplaceHost(window.location.host)) {
      router.replace('/hub/cart');
    }
  }, [router]);

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetchWithCsrf(`/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`);
        if (res.ok) {
          const data = await res.json();
          const nextStore = data.store as StoreData;
          if (isPublicStore(nextStore)) {
            setStore(nextStore);
          } else {
            setStore(null);
            setStoreError('Cette boutique n’est pas disponible pour le moment.');
          }
        } else {
          setStoreError('Boutique introuvable ou indisponible.');
        }
      } catch {
        setStoreError('Impossible de charger cette boutique.');
      }
      setLoading(false);
    }
    fetchStore();
  }, [storeHost]);

  const activeTheme = store?.theme_id ? themes[store.theme_id] || themes.classic : themes.classic;
  const themeCustomization = (store?.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);
  const primaryColor = store?.settings?.colors?.primary || resolvedColors.primary;
  const surfaceColor = store?.settings?.colors?.secondary || resolvedColors.secondary;
  const pageBackground = resolvedColors.background;
  const textColor = resolvedColors.text;
  const mutedTextColor = `${textColor}99`;
  const headerBackground = resolvedColors.headerBg;
  const borderColor = `${primaryColor}20`;
  const storeBaseHref = '';

  // Filter items to only this store
  const storeItems = store ? items.filter((item) => item.store_id === store.id) : [];
  const subtotal = storeItems.reduce((sum, item) => sum + getCartLineTotal(item), 0);
  const shippingTotal = getStoreShippingTotal(storeItems, SHIPPING_PER_VENDOR);
  const total = subtotal + shippingTotal;
  const itemCount = storeItems.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  if (!store) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground, color: textColor }}>
        <div className="max-w-md mx-auto px-6 py-12 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Boutique indisponible</h1>
          <p className="mb-6" style={{ color: mutedTextColor }}>
            {storeError || 'Cette boutique est introuvable ou temporairement indisponible.'}
          </p>
          <Link
            href="/hub"
            className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Retour au marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (storeItems.length === 0) {
    return (
      <div className={`min-h-screen ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground, color: textColor }}>
        {/* Header */}
        <header className="border-b sticky top-0 z-50" style={{ backgroundColor: headerBackground, borderColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link
                href={storeBaseHref || '/'}
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
          <h1 className="text-2xl font-bold mb-3" style={{ color: textColor }}>Votre panier est vide</h1>
          <p className="mb-8" style={{ color: `${textColor}99` }}>
            Découvrez nos produits et ajoutez-les à votre panier.
          </p>
          <Link
            href={storeBaseHref || '/'}
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
    <div className={`min-h-screen ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground, color: textColor }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-50" style={{ backgroundColor: headerBackground, borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href={storeBaseHref || '/'}
              className="text-xl font-bold"
              style={{ color: primaryColor }}
            >
              {store?.name || storeHost}
            </Link>
            <Link
              href={storeBaseHref || '/'}
              className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
              style={{ color: textColor }}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la boutique
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
          Panier ({itemCount} article{itemCount > 1 ? 's' : ''})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: surfaceColor, borderColor }}>
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
                      <p className="font-medium line-clamp-1" style={{ color: textColor }}>{item.title}</p>
                      {item.variant && (
                        <p className="text-xs mt-0.5" style={{ color: mutedTextColor }}>{item.variant}</p>
                      )}
                      <p className="text-sm font-semibold mt-1" style={{ color: mutedTextColor }}>
                        {formatPrice(getCartItemUnitPrice(item))}
                      </p>
                      {item.wholesale_pricing?.enabled && (
                        <p className="mt-0.5 text-xs font-semibold" style={{ color: primaryColor }}>
                          Prix de gros appliqué selon la quantité
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <span className="px-3 text-sm font-semibold min-w-[32px] text-center" style={{ color: textColor }}>
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
                      <p className="font-bold" style={{ color: textColor }}>
                        {formatPrice(getCartLineTotal(item))}
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
              <div className="px-6 py-3 border-t flex items-center justify-between text-sm" style={{ backgroundColor: surfaceColor, borderColor }}>
                <span style={{ color: mutedTextColor }}>
                  Livraison : {formatPrice(shippingTotal)}
                </span>
                <span className="font-semibold" style={{ color: textColor }}>
                  Sous-total : {formatPrice(subtotal + shippingTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border p-6 sticky top-24" style={{ backgroundColor: surfaceColor, borderColor }}>
              <h2 className="font-bold text-lg mb-4" style={{ color: textColor }}>Résumé</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: mutedTextColor }}>Sous-total</span>
                  <span className="font-medium" style={{ color: textColor }}>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: mutedTextColor }}>Livraison</span>
                  <span className="font-medium" style={{ color: textColor }}>{formatPrice(shippingTotal)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between" style={{ borderColor }}>
                  <span className="font-bold text-base" style={{ color: textColor }}>Total</span>
                  <span className="font-extrabold text-lg" style={{ color: primaryColor }}>
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <Link
                href={`${storeBaseHref}/checkout`}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 text-white font-semibold rounded-xl hover:opacity-90 hover:shadow-lg transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Passer la commande
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href={storeBaseHref || '/'}
                className="mt-3 w-full flex items-center justify-center py-3 text-sm transition-colors hover:opacity-80"
                style={{ color: `${textColor}99` }}
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
