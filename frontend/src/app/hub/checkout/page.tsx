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
  firstCheckoutAddressError,
  isRecoverableQuoteError,
  normalizeCheckoutAddress,
  submitCheckoutOrder,
  toCheckoutItems,
  validateCheckoutAddress,
  type CheckoutAddressErrors,
  type CheckoutAddressField,
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
  const [addressErrors, setAddressErrors] = useState<CheckoutAddressErrors>({});
  const [paymentError, setPaymentError] = useState('');
  const addressRefs = useRef<Record<CheckoutAddressField, HTMLInputElement | null>>({
    full_name: null,
    address_line: null,
    city: null,
    postal_code: null,
    phone: null,
  });
  const paymentGroupRef = useRef<HTMLDivElement | null>(null);
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

  const addressErrorMessage = (field: CheckoutAddressField): string => {
    if (addressErrors[field] === 'invalid' && field === 'phone') return 'Enter a valid phone number.';
    return 'This field is required.';
  };

  const setAddressField = (field: CheckoutAddressField, value: string) => {
    setAddress((current) => ({ ...current, [field]: value }));
    setAddressErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const focusFirstInvalid = (errors: CheckoutAddressErrors) => {
    const firstField = firstCheckoutAddressError(errors);
    if (firstField) {
      window.requestAnimationFrame(() => addressRefs.current[firstField]?.focus());
    }
  };

  const handleNativeInvalid = (event: React.InvalidEvent<HTMLInputElement>) => {
    event.preventDefault();
    const field = event.currentTarget.name as CheckoutAddressField;
    const currentErrors = validateCheckoutAddress(address);
    const nextErrors = { ...currentErrors, [field]: currentErrors[field] || 'required' } as CheckoutAddressErrors;
    setAddressErrors(nextErrors);
    focusFirstInvalid(nextErrors);
  };

  const validateForm = (): boolean => {
    const nextAddressErrors = hasShippableItems ? validateCheckoutAddress(address) : {};
    setAddressErrors(nextAddressErrors);
    if (Object.keys(nextAddressErrors).length > 0) {
      focusFirstInvalid(nextAddressErrors);
      return false;
    }
    if (quote && (!selectedGateway || !hasAvailableGateway)) {
      const message = 'Select an available payment method.';
      setPaymentError(message);
      window.requestAnimationFrame(() => paymentGroupRef.current?.focus());
      return false;
    }
    setPaymentError('');
    return true;
  };

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
  const paymentCapabilities = useMemo(
    () => quote?.payment_capabilities.methods || [],
    [quote?.payment_capabilities.methods],
  );
  const paymentOptions = gateways.map((gateway) => ({
    ...gateway,
    capability: paymentCapabilities.find((method) => method.gateway === gateway.id),
  }));
  const hasAvailableGateway = paymentOptions.some((option) => option.capability?.available);
  const paymentHasError = Boolean(paymentError || (quote && !hasAvailableGateway));

  useEffect(() => {
    if (!quote) return;
    const current = paymentCapabilities.find((method) => method.gateway === selectedGateway);
    if (current?.available) return;
    setSelectedGateway(paymentCapabilities.find((method) => method.available)?.gateway || '');
  }, [paymentCapabilities, quote, selectedGateway]);

  const handleCheckout = async () => {
    setError('');
    setPaymentError('');

    if (!validateForm()) return;

    if (items.length === 0) {
      setError(t('cart.empty'));
      return;
    }

    const selectedCapability = quote?.payment_capabilities.methods.find(
      (method) => method.gateway === selectedGateway,
    );
    if (!selectedCapability?.available) {
      const message = selectedCapability?.buyer_message || 'Select an available payment method.';
      setPaymentError(message);
      window.requestAnimationFrame(() => paymentGroupRef.current?.focus());
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
        paymentCapabilityVersion: quoteForOrder.payment_capabilities.capability_version,
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
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `${idempotencyKeyRef.current.slice(0, 119)}:payment`,
        },
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
              <h1 id="hub_checkout_title" className="text-3xl font-black tracking-tight sm:text-4xl">{t('checkout.title')}</h1>
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
          aria-labelledby="hub_checkout_title"
          aria-busy={isProcessing || quoteLoading ? 'true' : undefined}
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
                  onChange={(e) => setAddressField('full_name', e.target.value)}
                  ref={(node) => { addressRefs.current.full_name = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.full_name ? 'true' : 'false'}
                  aria-describedby={addressErrors.full_name ? 'hub_checkout_full_name_error' : undefined}
                  className={inputClass}
                  autoComplete="name"
                  required
                />
                {addressErrors.full_name && <p id="hub_checkout_full_name_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('full_name')}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="hub_checkout_address_line" className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.address')}</label>
                <input
                  id="hub_checkout_address_line"
                  name="address_line"
                  type="text"
                  value={address.address_line}
                  onChange={(e) => setAddressField('address_line', e.target.value)}
                  ref={(node) => { addressRefs.current.address_line = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.address_line ? 'true' : 'false'}
                  aria-describedby={addressErrors.address_line ? 'hub_checkout_address_line_error' : undefined}
                  className={inputClass}
                  autoComplete="street-address"
                  required
                />
                {addressErrors.address_line && <p id="hub_checkout_address_line_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('address_line')}</p>}
              </div>
              <div>
                <label htmlFor="hub_checkout_city" className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.city')}</label>
                <input
                  id="hub_checkout_city"
                  name="city"
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddressField('city', e.target.value)}
                  ref={(node) => { addressRefs.current.city = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.city ? 'true' : 'false'}
                  aria-describedby={addressErrors.city ? 'hub_checkout_city_error' : undefined}
                  className={inputClass}
                  autoComplete="address-level2"
                  required
                />
                {addressErrors.city && <p id="hub_checkout_city_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('city')}</p>}
              </div>
              <div>
                <label htmlFor="hub_checkout_postal_code" className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.postalCode')}</label>
                <input
                  id="hub_checkout_postal_code"
                  name="postal_code"
                  type="text"
                  value={address.postal_code}
                  onChange={(e) => setAddressField('postal_code', e.target.value)}
                  ref={(node) => { addressRefs.current.postal_code = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.postal_code ? 'true' : 'false'}
                  aria-describedby={addressErrors.postal_code ? 'hub_checkout_postal_code_error' : undefined}
                  className={inputClass}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  required
                />
                {addressErrors.postal_code && <p id="hub_checkout_postal_code_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('postal_code')}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="hub_checkout_phone" className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.phone')}</label>
                <input
                  id="hub_checkout_phone"
                  name="phone"
                  type="tel"
                  value={address.phone}
                  onChange={(e) => setAddressField('phone', e.target.value)}
                  ref={(node) => { addressRefs.current.phone = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.phone ? 'true' : 'false'}
                  aria-describedby={addressErrors.phone ? 'hub_checkout_phone_error' : undefined}
                  className={inputClass}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
                {addressErrors.phone && <p id="hub_checkout_phone_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('phone')}</p>}
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

          <div
            ref={paymentGroupRef}
            className="space-y-4"
            role="radiogroup"
            aria-label={t('checkout.payment.title')}
            aria-invalid={paymentHasError ? 'true' : 'false'}
            aria-describedby={paymentHasError ? 'hub_checkout_payment_error' : undefined}
            tabIndex={-1}
          >
            {paymentOptions.map((g) => {
              const isAvailable = g.capability?.available === true;
              const descriptionId = `hub_payment_gateway_${g.id}_description`;
              return (
              <label
                key={g.id}
                htmlFor={`hub_payment_gateway_${g.id}`}
                className={`relative flex items-start p-4 rounded-xl border-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-2 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${
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
                  disabled={!isAvailable}
                  aria-describedby={descriptionId}
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
                  <p id={descriptionId} className="mt-1 text-sm text-gray-500">
                    {isAvailable ? g.desc : g.capability?.buyer_message || 'Availability is being checked.'}
                  </p>
                </div>
              </label>
              );
            })}
          </div>

          {(paymentError || (quote && !hasAvailableGateway)) && (
            <p id="hub_checkout_payment_error" role="alert" className="mt-4 text-sm font-medium text-red-700">
              {paymentError || 'No payment method is available for this order. Review the delivery details or try again later.'}
            </p>
          )}

          <button 
            type="submit"
            disabled={isProcessing || quoteLoading || !selectedGateway || !hasAvailableGateway}
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
