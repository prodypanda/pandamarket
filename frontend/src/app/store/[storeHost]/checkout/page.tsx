'use client';

import { fetchWithCsrf } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Truck, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useCart } from '../../../../contexts/CartContext';
import Link from 'next/link';
import { isMarketplaceHost } from '../../../../lib/store-hosts';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '../../../../lib/themes';

function formatPrice(price: number): string {
  return `${price.toFixed(3)} TND`;
}

const SHIPPING_PER_VENDOR = 7;

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    themeCustomization?: ThemeCustomization;
  };
}

export default function StoreCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const storeHost = decodeURIComponent(params.storeHost as string);
  const { items, removeStoreItems } = useCart();

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState('flouci');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isMarketplaceHost(window.location.host)) {
      router.replace('/hub/checkout');
    }
  }, [router]);

  // Shipping address
  const [address, setAddress] = useState({
    full_name: '',
    address_line: '',
    city: '',
    postal_code: '',
    phone: '',
  });

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetchWithCsrf(`/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`);
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

  const activeTheme = store?.theme_id ? themes[store.theme_id] || themes.classic : themes.classic;
  const themeCustomization = (store?.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);
  const primaryColor = store?.settings?.colors?.primary || resolvedColors.primary;
  const secondaryColor = store?.settings?.colors?.secondary || resolvedColors.secondary;
  const pageBackground = resolvedColors.background;
  const textColor = resolvedColors.text;
  const mutedTextColor = `${textColor}99`;
  const headerBackground = resolvedColors.headerBg;
  const footerBackground = resolvedColors.footerBg;
  const borderColor = `${primaryColor}20`;
  const storeBaseHref = '';

  // Filter items to only this store
  const storeItems = store ? items.filter((item) => item.store_id === store.id) : [];
  const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingTotal = storeItems.length > 0 ? SHIPPING_PER_VENDOR : 0;
  const total = subtotal + shippingTotal;

  const gateways = [
    { id: 'flouci', name: 'Flouci', icon: CreditCard, desc: 'Paiement sécurisé par carte bancaire ou wallet Flouci.' },
    { id: 'konnect', name: 'Konnect', icon: CreditCard, desc: 'Paiement en ligne via le réseau Konnect.' },
    { id: 'manual_mandat', name: 'Mandat Minute', icon: Banknote, desc: 'Payez à la poste et uploadez votre reçu.' },
    { id: 'cod', name: 'Cash on Delivery', icon: Truck, desc: 'Paiement à la livraison.' },
  ];

  const handleCheckout = async () => {
    setError('');

    if (!address.full_name || !address.address_line || !address.city || !address.phone) {
      setError("Veuillez remplir tous les champs d'adresse");
      return;
    }

    if (storeItems.length === 0) {
      setError('Votre panier est vide');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create order
      const orderRes = await fetchWithCsrf('/api/pd/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: storeItems.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            variant: item.variant,
          })),
          shipping_address: address,
          payment_gateway: selectedGateway,
        }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json();
        setError(data.error?.message || 'Erreur lors de la création de la commande');
        setIsProcessing(false);
        return;
      }

      const orderData = await orderRes.json();
      const orderId = orderData.order?.id || orderData.order_id;

      // Step 2: Handle payment based on gateway
      if (selectedGateway === 'manual_mandat' || selectedGateway === 'cod') {
        // Remove only this store's items from cart
        if (store) removeStoreItems(store.id);
        setOrderSuccess(orderId);
        return;
      }

      // Step 3: Initialize payment for Flouci/Konnect
      const paymentRes = await fetchWithCsrf('/api/pd/payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          order_id: orderId,
          gateway: selectedGateway,
        }),
      });

      if (!paymentRes.ok) {
        const data = await paymentRes.json();
        setError(data.error?.message || "Erreur lors de l'initialisation du paiement");
        setIsProcessing(false);
        return;
      }

      const paymentData = await paymentRes.json();
      const checkoutUrl = paymentData.checkout_url || paymentData.url;

      if (store) removeStoreItems(store.id);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setOrderSuccess(orderId);
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  // Success state
  if (orderSuccess) {
    return (
      <div className={`min-h-screen ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground, color: textColor }}>
        <header className="border-b" style={{ backgroundColor: headerBackground, borderColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
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
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <CheckCircle className="w-20 h-20 mx-auto mb-6" style={{ color: primaryColor }} />
          <h1 className="text-2xl font-bold mb-3" style={{ color: textColor }}>Commande confirmée !</h1>
          <p className="mb-2" style={{ color: mutedTextColor }}>
            Votre commande <span className="font-mono font-semibold">#{orderSuccess.slice(-8)}</span> a bien été enregistrée.
          </p>
          <p className="mb-8" style={{ color: mutedTextColor }}>
            Vous recevrez un email de confirmation avec les détails de votre commande.
          </p>
          <Link
            href={storeBaseHref || '/'}
            className="inline-flex items-center gap-2 px-8 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  if (storeItems.length === 0) {
    return (
      <div className={`min-h-screen py-12 ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground, color: textColor }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: textColor }}>Panier vide</h1>
          <p className="mb-6" style={{ color: mutedTextColor }}>Ajoutez des produits à votre panier avant de passer commande.</p>
          <Link
            href={storeBaseHref || '/'}
            className="px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-colors inline-block"
            style={{ backgroundColor: primaryColor }}
          >
            Continuer vos achats
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
              href={`${storeBaseHref}/cart`}
              className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
              style={{ color: textColor }}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au panier
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold mb-8 text-center" style={{ color: textColor }}>Checkout</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Order Summary */}
        <div className="rounded-2xl shadow-sm border p-8 mb-8" style={{ backgroundColor: secondaryColor, borderColor }}>
          <h2 className="text-xl font-bold mb-6 border-b pb-4" style={{ color: textColor, borderColor }}>Résumé de la commande</h2>
          {storeItems.map((item) => (
            <div key={item.id} className="flex justify-between items-center mb-3">
              <span style={{ color: mutedTextColor }}>
                {item.title} x{item.quantity}
              </span>
              <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center mb-3">
            <span style={{ color: mutedTextColor }}>Livraison</span>
            <span className="font-medium">{formatPrice(shippingTotal)}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor }}>
            <span className="text-lg font-bold" style={{ color: textColor }}>Total</span>
            <span className="text-2xl font-black" style={{ color: primaryColor }}>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="rounded-2xl shadow-sm border p-8 mb-8" style={{ backgroundColor: secondaryColor, borderColor }}>
          <h2 className="text-xl font-bold mb-6 border-b pb-4" style={{ color: textColor, borderColor }}>Adresse de livraison</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: textColor }}>Nom complet</label>
              <input
                type="text"
                value={address.full_name}
                onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                style={{ '--tw-ring-color': primaryColor, borderColor: undefined } as React.CSSProperties}
                onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: textColor }}>Adresse</label>
              <input
                type="text"
                value={address.address_line}
                onChange={(e) => setAddress({ ...address, address_line: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: textColor }}>Ville</label>
              <input
                type="text"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: textColor }}>Code postal</label>
              <input
                type="text"
                value={address.postal_code}
                onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: textColor }}>Téléphone</label>
              <input
                type="tel"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="rounded-2xl shadow-sm border p-8" style={{ backgroundColor: secondaryColor, borderColor }}>
          <h2 className="text-xl font-bold mb-6 border-b pb-4" style={{ color: textColor, borderColor }}>Mode de paiement</h2>

          <div className="space-y-4">
            {gateways.map((g) => (
              <div
                key={g.id}
                onClick={() => setSelectedGateway(g.id)}
                className="relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 hover:border-opacity-70"
                style={{
                  borderColor: selectedGateway === g.id ? primaryColor : borderColor,
                  backgroundColor: selectedGateway === g.id ? `${primaryColor}0D` : pageBackground,
                }}
              >
                <div className="flex items-center h-5">
                  <div
                    className="w-5 h-5 rounded-full border flex items-center justify-center"
                    style={{ borderColor: selectedGateway === g.id ? primaryColor : '#d1d5db' }}
                  >
                    {selectedGateway === g.id && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center">
                    <g.icon
                      className="w-5 h-5 mr-2"
                      style={{ color: selectedGateway === g.id ? primaryColor : '#9ca3af' }}
                    />
                    <h3 className="font-bold" style={{ color: textColor }}>{g.name}</h3>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: mutedTextColor }}>{g.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleCheckout}
            disabled={isProcessing}
            className="w-full mt-8 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center items-center"
            style={{ backgroundColor: primaryColor }}
          >
            {isProcessing ? 'Traitement en cours...' : 'Confirmer et payer'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-16" style={{ backgroundColor: footerBackground, borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm" style={{ color: mutedTextColor }}>
          <p>
            {store?.name || storeHost} — Propulsé par{' '}
            <Link href="/hub" className="font-medium" style={{ color: primaryColor }}>
              🐼 PandaMarket
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
