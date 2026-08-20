'use client';

import { fetchWithCsrf } from '@/lib/api';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard, Banknote, Truck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../contexts/CartContext';
import { useLocale } from '../../../contexts/LocaleContext';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';
import { getShippableStoreCount } from '../../../lib/cart-utils';
import {
  checkoutQuoteTotalsMatch,
  createCheckoutIdempotencyKey,
  formatCheckoutMoney,
  getQuoteProductDiscount,
  getQuoteShippingSavings,
  isCheckoutAddressComplete,
  isRecoverableQuoteError,
  normalizeCheckoutAddress,
  submitCheckoutOrder,
  toCheckoutItems,
} from '../../../lib/checkout-quote';
import { useCheckoutQuote } from '../../../hooks/useCheckoutQuote';
import { trackCheckoutStarted, trackCheckoutPaymentStarted, trackCheckoutPaymentCompleted, trackCheckoutFailed, trackCheckoutAddressSubmitted } from '../../../lib/marketplace-analytics';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, couponCode, clearCart } = useCart();
  const { t } = useLocale();
  const { settings, classes, isAliExpress } = useMarketplaceTheme();
  const [selectedGateway, setSelectedGateway] = useState('flouci');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const idempotencyKeyRef = useRef(createCheckoutIdempotencyKey('hub'));

  // Shipping address
  const [address, setAddress] = useState({
    full_name: '',
    address_line: '',
    city: '',
    postal_code: '',
    phone: '',
  });

  const shippableStoreCount = getShippableStoreCount(items);
  const hasShippableItems = shippableStoreCount > 0;
  const quoteItems = useMemo(() => toCheckoutItems(items), [items]);
  const normalizedAddress = useMemo(
    () => hasShippableItems && isCheckoutAddressComplete(address) ? normalizeCheckoutAddress(address) : null,
    [address, hasShippableItems],
  );
  const quoteEnabled = items.length > 0 && (!hasShippableItems || Boolean(normalizedAddress));
  const {
    quote,
    error: quoteError,
    isLoading: quoteLoading,
    refresh: refreshQuote,
  } = useCheckoutQuote({
    scope: 'hub',
    items: quoteItems,
    shippingAddress: normalizedAddress,
    couponCode,
    enabled: quoteEnabled,
  });
  const quoteCurrency = quote?.currency || t('common.currency');
  const formatPrice = (price: number) => formatCheckoutMoney(price, quoteCurrency);
  const quoteProductDiscount = quote ? getQuoteProductDiscount(quote) : 0;
  const quoteShippingSavings = quote ? getQuoteShippingSavings(quote) : 0;
  const quoteTotalLabel = quote
    ? formatPrice(quote.total)
    : hasShippableItems && !normalizedAddress
      ? '—'
      : quoteLoading
        ? 'Calculating...'
        : '—';
  const inputClass = `w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-4 outline-none transition ${classes.focus}`;

  useEffect(() => {
    if (quoteError?.status === 401) {
      router.replace(`/login?next=${encodeURIComponent('/hub/checkout')}`);
    }
  }, [quoteError, router]);

  const gateways = [
    { id: 'flouci', name: t('checkout.payment.flouci'), icon: CreditCard, desc: t('checkout.payment.flouci') },
    { id: 'konnect', name: t('checkout.payment.konnect'), icon: CreditCard, desc: t('checkout.payment.konnect') },
    { id: 'paypal', name: 'PayPal (International)', icon: CreditCard, desc: 'Pay safely with credit card or PayPal account globally' },
    { id: 'manual_mandat', name: t('checkout.payment.mandat'), icon: Banknote, desc: t('checkout.payment.mandatInstructions') },
    { id: 'cod', name: t('checkout.payment.cod'), icon: Truck, desc: t('checkout.payment.codInstructions') },
  ];
  const availableGateways = gateways.filter((gateway) => hasShippableItems || gateway.id !== 'cod');

  const handleCheckout = async () => {
    setError('');

    if (hasShippableItems && !isCheckoutAddressComplete(address)) {
      setError('Complete the required delivery address fields before continuing.');
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
    trackCheckoutStarted();
    if (hasShippableItems) trackCheckoutAddressSubmitted();
    if (!quote) {
      try {
        await refreshQuote();
        setError('The total was refreshed. Please review it and confirm again.');
      } catch (quoteRefreshError) {
        setError((quoteRefreshError as Error)?.message || 'Unable to calculate the order total');
      }
      setIsProcessing(false);
      return;
    }

    let quoteForOrder = quote;
    if (new Date(quote.expires_at).getTime() <= Date.now() + 15_000) {
      try {
        const refreshedQuote = await refreshQuote();
        if (!checkoutQuoteTotalsMatch(quote, refreshedQuote)) {
          setError('The total changed. Please review the updated amount and confirm again.');
          setIsProcessing(false);
          return;
        }
        quoteForOrder = refreshedQuote;
      } catch (quoteRefreshError) {
        setError((quoteRefreshError as Error)?.message || 'Unable to refresh the order total');
        setIsProcessing(false);
        return;
      }
    }

    try {
      let adsAttribution: {campaign_id:string;creative_id:string;event_key:string}|undefined;
      try { const raw=localStorage.getItem('pd_ads_attribution'); if(raw){const parsed=JSON.parse(raw);if(parsed.created_at>Date.now()-7*86400000)adsAttribution={campaign_id:parsed.campaign_id,creative_id:parsed.creative_id,event_key:parsed.event_key};else localStorage.removeItem('pd_ads_attribution');} } catch { localStorage.removeItem('pd_ads_attribution'); }
      // Step 1: Create the order from the server-authoritative quote.
      const { orderId } = await submitCheckoutOrder({
        scope: 'hub',
        idempotencyKey: idempotencyKeyRef.current,
        quoteId: quoteForOrder.id,
        items: quoteItems,
        shippingAddress: normalizedAddress,
        paymentGateway: selectedGateway,
        couponCode,
        adsAttribution,
      });
      if (adsAttribution) localStorage.removeItem('pd_ads_attribution');
      trackCheckoutPaymentStarted(orderId, selectedGateway);

      // Step 2: Handle payment based on gateway
      if (selectedGateway === 'manual_mandat') {
        trackCheckoutPaymentCompleted(orderId);
        clearCart();
        router.push(`/hub/checkout/mandat-upload?order_id=${orderId}`);
        return;
      }

      if (selectedGateway === 'cod') {
        trackCheckoutPaymentCompleted(orderId);
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
        trackCheckoutFailed(orderId, 'payment_init_failed');
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
    } catch (checkoutError) {
      if (isRecoverableQuoteError(checkoutError)) {
        try {
          await refreshQuote();
          setError('The order total changed. Please review the refreshed quote and confirm again.');
        } catch (quoteRefreshError) {
          setError((quoteRefreshError as Error)?.message || checkoutError.message);
        }
      } else {
        setError(checkoutError instanceof Error ? checkoutError.message : t('errors.networkError'));
      }
      trackCheckoutFailed(undefined, 'network_error');
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
              <p className="text-2xl font-black" aria-live="polite">{quoteTotalLabel}</p>
              <p className="text-xs font-semibold text-white/70">{t('cart.total')}</p>
            </div>
          </div>
        </div>

        {(error || quoteError) && (
          <div role="alert" aria-live="polite" className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error || quoteError?.message}
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleCheckout();
          }}
        >

        {/* Order Summary */}
        <div className={`${classes.panel} p-6 sm:p-8 mb-8`}>
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">{t('cart.title')}</h2>
          {items.map((item) => {
            const line = quote?.items.find(
              (quoteLine) => quoteLine.product_id === item.product_id
                && quoteLine.variant_id === (item.variant_id || null),
            );
            return (
              <div key={item.id} className="flex justify-between items-center gap-4 mb-3">
                <span className="min-w-0 break-words text-gray-600">
                  {item.title} x{item.quantity}
                </span>
                <span className="shrink-0 font-medium">{line ? formatPrice(line.subtotal) : '—'}</span>
              </div>
            );
          })}
          <div className="flex justify-between items-center gap-4 mb-3">
            <span className="text-gray-600">Merchandise subtotal</span>
            <span className="shrink-0 font-medium">{quote ? formatPrice(quote.subtotal) : '—'}</span>
          </div>
          {quoteProductDiscount > 0 && (
            <div className="flex justify-between items-center gap-4 mb-3 text-emerald-700">
              <span>Product discount{quote?.coupon_code ? ` (${quote.coupon_code})` : ''}</span>
              <span className="shrink-0 font-medium">−{formatPrice(quoteProductDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">{t('cart.shipping')} ({shippableStoreCount})</span>
            <span className="font-medium">{quote ? formatPrice(quote.shipping_total) : '—'}</span>
          </div>
          {quoteShippingSavings > 0 && (
            <div className="flex justify-between items-center gap-4 mb-3 text-emerald-700">
              <span>Shipping savings</span>
              <span className="shrink-0 font-medium">−{formatPrice(quoteShippingSavings)}</span>
            </div>
          )}
          {quote && quote.tax_total > 0 && (
            <div className="flex justify-between items-center gap-4 mb-3">
              <span className="text-gray-600">Tax</span>
              <span className="shrink-0 font-medium">{formatPrice(quote.tax_total)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <span className="text-lg font-bold text-gray-900">{t('cart.total')}</span>
            <span className={`text-2xl font-black ${classes.primaryText}`} aria-live="polite">{quoteTotalLabel}</span>
          </div>
          {!quote && hasShippableItems && !normalizedAddress && (
            <p className="mt-4 text-sm text-gray-500">Complete the delivery address to calculate the authoritative total.</p>
          )}
          {quoteLoading && (
            <p className="mt-4 text-sm text-gray-500" aria-live="polite">Calculating the latest price, discounts, shipping, and tax...</p>
          )}
        </div>

        {hasShippableItems ? (
          <fieldset className={`${classes.panel} p-6 sm:p-8 mb-8`}>
            <legend className="w-full text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">{t('checkout.address.title')}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="hub_checkout_full_name" className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.firstName')}</label>
                <input
                  id="hub_checkout_full_name"
                  name="full_name"
                  type="text"
                  value={address.full_name}
                  onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                  className={inputClass}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="hub_checkout_address_line" className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.address')}</label>
                <input
                  id="hub_checkout_address_line"
                  name="address_line"
                  type="text"
                  value={address.address_line}
                  onChange={(e) => setAddress({ ...address, address_line: e.target.value })}
                  className={inputClass}
                  autoComplete="street-address"
                  required
                />
              </div>
              <div>
                <label htmlFor="hub_checkout_city" className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.city')}</label>
                <input
                  id="hub_checkout_city"
                  name="city"
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className={inputClass}
                  autoComplete="address-level2"
                  required
                />
              </div>
              <div>
                <label htmlFor="hub_checkout_postal_code" className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.postalCode')}</label>
                <input
                  id="hub_checkout_postal_code"
                  name="postal_code"
                  type="text"
                  value={address.postal_code}
                  onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                  className={inputClass}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="hub_checkout_phone" className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.phone')}</label>
                <input
                  id="hub_checkout_phone"
                  name="phone"
                  type="tel"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className={inputClass}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
              </div>
            </div>
          </fieldset>
        ) : (
          <div className={`${classes.panel} p-6 sm:p-8 mb-8`}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Digital delivery</h2>
            <p className="text-sm text-gray-500">No shipping address is required for this cart.</p>
          </div>
        )}

        {/* Payment Method */}
        <fieldset className={`${classes.panel} p-6 sm:p-8`}>
          <legend className="w-full text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">{t('checkout.payment.title')}</legend>

          <div className="space-y-4" role="radiogroup" aria-label={t('checkout.payment.title')}>
            {availableGateways.map((g) => (
              <label
                key={g.id}
                htmlFor={`hub_payment_gateway_${g.id}`}
                className={`relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-2 ${
                  selectedGateway === g.id 
                    ? `${classes.primaryBorder} ${classes.primarySoft}` 
                    : isAliExpress ? 'border-gray-200 hover:border-orange-200 bg-white hover:bg-orange-50/40' : 'border-gray-200 hover:border-[#16C784]/50 bg-white'
                }`}
              >
                <input
                  id={`hub_payment_gateway_${g.id}`}
                  name="payment_gateway"
                  type="radio"
                  value={g.id}
                  checked={selectedGateway === g.id}
                  onChange={() => setSelectedGateway(g.id)}
                  className="sr-only peer"
                />
                <div className="flex items-center h-5" aria-hidden="true">
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
              </label>
            ))}
          </div>

          <button 
            type="submit"
            disabled={isProcessing || quoteLoading}
            className={`w-full mt-8 text-white font-black text-lg py-4 rounded-full shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center items-center ${classes.primaryGradient}`}
          >
            {isProcessing ? t('checkout.processing') : quoteLoading ? 'Calculating total...' : t('checkout.confirm')}
          </button>
        </fieldset>
        </form>
      </div>
      <HubFooter {...settings} />
    </div>
  );
}
