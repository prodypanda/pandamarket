'use client';

import { fetchWithCsrf } from '@/lib/api';
import React, { useState } from 'react';
import { CreditCard, Banknote, Truck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../contexts/CartContext';
import { useLocale } from '../../../contexts/LocaleContext';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';
import { getCartLineTotal, getShippableStoreCount, getShippingTotalForItems } from '../../../lib/cart-utils';

const SHIPPING_PER_VENDOR = 7;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getCartTotal, clearCart } = useCart();
  const { t } = useLocale();
  const { settings, classes, isAliExpress } = useMarketplaceTheme();
  const [selectedGateway, setSelectedGateway] = useState('flouci');

  function formatPrice(price: number): string {
    return `${price.toFixed(3)} ${t('common.currency')}`;
  }
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Shipping address
  const [address, setAddress] = useState({
    full_name: '',
    address_line: '',
    city: '',
    postal_code: '',
    phone: '',
  });

  const subtotal = getCartTotal();
  const shippingTotal = getShippingTotalForItems(items, SHIPPING_PER_VENDOR);
  const shippableStoreCount = getShippableStoreCount(items);
  const hasShippableItems = shippableStoreCount > 0;
  const total = subtotal + shippingTotal;
  const inputClass = `w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-4 outline-none transition ${classes.focus}`;

  const gateways = [
    { id: 'flouci', name: t('checkout.payment.flouci'), icon: CreditCard, desc: t('checkout.payment.flouci') },
    { id: 'konnect', name: t('checkout.payment.konnect'), icon: CreditCard, desc: t('checkout.payment.konnect') },
    { id: 'manual_mandat', name: t('checkout.payment.mandat'), icon: Banknote, desc: t('checkout.payment.mandatInstructions') },
    { id: 'cod', name: t('checkout.payment.cod'), icon: Truck, desc: t('checkout.payment.codInstructions') },
  ];
  const availableGateways = gateways.filter((gateway) => hasShippableItems || gateway.id !== 'cod');

  const handleCheckout = async () => {
    setError('');

    if (hasShippableItems && (!address.full_name || !address.address_line || !address.city || !address.phone)) {
      setError(t('errors.forbidden'));
      return;
    }

    if (items.length === 0) {
      setError(t('cart.empty'));
      return;
    }

    if (!hasShippableItems && selectedGateway === 'cod') {
      setError('Cash on delivery is only available for physical products.');
      return;
    }

    setIsProcessing(true);
    const normalizedAddress = hasShippableItems
      ? (() => {
        const [firstName = '', ...lastNameParts] = address.full_name.trim().split(/\s+/).filter(Boolean);
        return {
          first_name: firstName,
          last_name: lastNameParts.join(' ') || firstName,
          phone: address.phone.trim(),
          address_line_1: address.address_line.trim(),
          city: address.city.trim(),
          postal_code: address.postal_code.trim(),
          country: 'TN',
        };
      })()
      : null;

    try {
      let adsAttribution: {campaign_id:string;creative_id:string;event_key:string}|undefined;
      try { const raw=localStorage.getItem('pd_ads_attribution'); if(raw){const parsed=JSON.parse(raw);if(parsed.created_at>Date.now()-7*86400000)adsAttribution={campaign_id:parsed.campaign_id,creative_id:parsed.creative_id,event_key:parsed.event_key};else localStorage.removeItem('pd_ads_attribution');} } catch { localStorage.removeItem('pd_ads_attribution'); }
      // Step 1: Create order
      const orderRes = await fetchWithCsrf('/api/pd/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
          shipping_address: normalizedAddress,
          payment_gateway: selectedGateway,
          ads_attribution: adsAttribution,
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
      if (adsAttribution) localStorage.removeItem('pd_ads_attribution');

      // Step 2: Handle payment based on gateway
      if (selectedGateway === 'manual_mandat') {
        clearCart();
        router.push(`/hub/checkout/mandat-upload?order_id=${orderId}`);
        return;
      }

      if (selectedGateway === 'cod') {
        clearCart();
        router.push(`/hub/checkout/success?order_id=${orderId}`);
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
        setError(data.error?.message || 'Erreur lors de l\'initialisation du paiement');
        setIsProcessing(false);
        return;
      }

      const paymentData = await paymentRes.json();
      const checkoutUrl = paymentData.checkout_url || paymentData.url;

      if (checkoutUrl) {
        clearCart();
        window.location.href = checkoutUrl;
      } else {
        clearCart();
        router.push(`/hub/checkout/success?order_id=${orderId}`);
      }
    } catch {
      setError(t('errors.networkError'));
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className={`min-h-screen ${classes.pageSoft}`}>
        <HubNavbar
          marketplaceName={settings.marketplace_name}
          marketplaceLogoUrl={settings.marketplace_logo_url}
          marketplaceTheme={settings.marketplace_theme}
        />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('cart.empty')}</h1>
          <p className="text-gray-500 mb-6">{t('cart.emptySubtitle')}</p>
          <button
            onClick={() => router.push('/hub')}
            className={`px-8 py-3 rounded-full font-black transition-all hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
          >
            {t('cart.continueShopping')}
          </button>
        </div>
        <HubFooter {...settings} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className={`relative mb-8 overflow-hidden rounded-[2rem] p-6 text-white sm:p-8 ${classes.header}`}>
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/80">
                Protected checkout
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t('checkout.title')}</h1>
              <p className="mt-2 max-w-xl text-sm text-white/75">
                Secure payment, vendor grouped delivery, and marketplace buyer protection.
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur">
              <p className="text-2xl font-black">{formatPrice(total)}</p>
              <p className="text-xs font-semibold text-white/70">{t('cart.total')}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Order Summary */}
        <div className={`${classes.panel} p-6 sm:p-8 mb-8`}>
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">{t('cart.title')}</h2>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center mb-3">
              <span className="text-gray-600">
                {item.title} x{item.quantity}
              </span>
              <span className="font-medium">{formatPrice(getCartLineTotal(item))}</span>
            </div>
          ))}
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">{t('cart.shipping')} ({shippableStoreCount})</span>
            <span className="font-medium">{formatPrice(shippingTotal)}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <span className="text-lg font-bold text-gray-900">{t('cart.total')}</span>
            <span className={`text-2xl font-black ${classes.primaryText}`}>{formatPrice(total)}</span>
          </div>
        </div>

        {hasShippableItems ? (
          <div className={`${classes.panel} p-6 sm:p-8 mb-8`}>
            <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">{t('checkout.address.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.firstName')}</label>
                <input
                  type="text"
                  value={address.full_name}
                  onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.address')}</label>
                <input
                  type="text"
                  value={address.address_line}
                  onChange={(e) => setAddress({ ...address, address_line: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.city')}</label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.postalCode')}</label>
                <input
                  type="text"
                  value={address.postal_code}
                  onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.phone')}</label>
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className={`${classes.panel} p-6 sm:p-8 mb-8`}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Digital delivery</h2>
            <p className="text-sm text-gray-500">No shipping address is required for this cart.</p>
          </div>
        )}

        {/* Payment Method */}
        <div className={`${classes.panel} p-6 sm:p-8`}>
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">{t('checkout.payment.title')}</h2>

          <div className="space-y-4">
            {availableGateways.map((g) => (
              <div
                key={g.id}
                onClick={() => setSelectedGateway(g.id)}
                className={`relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 ${
                  selectedGateway === g.id 
                    ? `${classes.primaryBorder} ${classes.primarySoft}` 
                    : isAliExpress ? 'border-gray-200 hover:border-orange-200 bg-white hover:bg-orange-50/40' : 'border-gray-200 hover:border-[#16C784]/50 bg-white'
                }`}
              >
                <div className="flex items-center h-5">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedGateway === g.id ? classes.primaryBorder : 'border-gray-300'
                  }`}>
                    {selectedGateway === g.id && <div className={`w-2.5 h-2.5 rounded-full ${isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]'}`}></div>}
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center">
                    <g.icon className={`w-5 h-5 mr-2 ${selectedGateway === g.id ? classes.primaryText : 'text-gray-400'}`} />
                    <h3 className="font-bold text-gray-900">{g.name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleCheckout}
            disabled={isProcessing}
            className={`w-full mt-8 text-white font-black text-lg py-4 rounded-full shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center items-center ${classes.primaryGradient}`}
          >
            {isProcessing ? t('checkout.processing') : t('checkout.confirm')}
          </button>
        </div>
      </div>
      <HubFooter {...settings} />
    </div>
  );
}
