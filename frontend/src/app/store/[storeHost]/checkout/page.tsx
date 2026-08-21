'use client';

import { fetchWithCsrf } from '@/lib/api';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CreditCard, Banknote, Truck, AlertCircle, ArrowLeft, CheckCircle, LoaderCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useCart } from '../../../../contexts/CartContext';
import Link from 'next/link';
import { isMarketplaceHost } from '../../../../lib/store-hosts';
import { getHubAbsoluteUrl } from '../../../../lib/storefront-url';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '../../../../lib/themes';
import { isCartItemShippable } from '../../../../lib/cart-utils';
import {
  checkoutQuoteTotalsMatch,
  createCheckoutIdempotencyKey,
  firstCheckoutAddressError,
  formatCheckoutMoney,
  getQuoteProductDiscount,
  getQuoteShippingSavings,
  isCheckoutAddressComplete,
  isRecoverableQuoteError,
  normalizeCheckoutAddress,
  submitCheckoutOrder,
  toCheckoutItems,
  validateCheckoutAddress,
  type CheckoutAddressErrors,
  type CheckoutAddressField,
} from '../../../../lib/checkout-quote';
import { useCheckoutQuote } from '../../../../hooks/useCheckoutQuote';
import { MarketplaceBrand } from '../../../../components/MarketplaceBrand';
import { trackCheckoutStarted, trackCheckoutPaymentStarted, trackCheckoutPaymentCompleted, trackCheckoutFailed } from '../../../../lib/marketplace-analytics';

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  status?: string | null;
  is_verified?: boolean | null;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    themeCustomization?: ThemeCustomization;
  };
}

interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_logo_url?: string;
  marketplace_logo_light_url?: string;
  marketplace_logo_dark_url?: string;
}

function isPublicStore(store: StoreData): boolean {
  return store.status === 'verified' && store.is_verified === true;
}

export default function StoreCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const storeHost = decodeURIComponent(params.storeHost as string);
  const { items, couponCode, removeStoreItems } = useCart();

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState('flouci');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [addressErrors, setAddressErrors] = useState<CheckoutAddressErrors>({});
  const [paymentError, setPaymentError] = useState('');
  const [storeError, setStoreError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings>({});
  const idempotencyKeyRef = useRef(createCheckoutIdempotencyKey('storefront'));
  const addressRefs = useRef<Record<CheckoutAddressField, HTMLInputElement | null>>({
    full_name: null,
    address_line: null,
    city: null,
    postal_code: null,
    phone: null,
  });
  const paymentGroupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isMarketplaceHost(window.location.host)) {
      router.replace(getHubAbsoluteUrl('/hub/checkout'));
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

  useEffect(() => {
    async function fetchMarketplaceSettings() {
      try {
        const res = await fetchWithCsrf('/api/pd/marketplace/settings', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMarketplaceSettings(data.data || {});
        }
      } catch {
        setMarketplaceSettings({});
      }
    }
    fetchMarketplaceSettings();
  }, []);

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
  const storeItems = useMemo(
    () => store ? items.filter((item) => item.store_id === store.id) : [],
    [items, store],
  );
  const hasShippableItems = storeItems.some(isCartItemShippable);
  const quoteItems = useMemo(() => toCheckoutItems(storeItems), [storeItems]);
  const normalizedAddress = useMemo(
    () => hasShippableItems && isCheckoutAddressComplete(address) ? normalizeCheckoutAddress(address) : null,
    [address, hasShippableItems],
  );
  const quoteEnabled = Boolean(store) && storeItems.length > 0 && (!hasShippableItems || Boolean(normalizedAddress));
  const {
    quote,
    error: quoteError,
    isLoading: quoteLoading,
    refresh: refreshQuote,
  } = useCheckoutQuote({
    scope: 'storefront',
    items: quoteItems,
    shippingAddress: normalizedAddress,
    couponCode,
    enabled: quoteEnabled,
  });
  const quoteCurrency = quote?.currency || 'TND';
  const formatPrice = (price: number) => formatCheckoutMoney(price, quoteCurrency);
  const quoteProductDiscount = quote ? getQuoteProductDiscount(quote) : 0;
  const quoteShippingSavings = quote ? getQuoteShippingSavings(quote) : 0;
  const quoteTotalLabel = quote
    ? formatPrice(quote.total)
    : hasShippableItems && !normalizedAddress
      ? '—'
      : quoteLoading
        ? 'Calcul en cours...'
        : '—';

  const addressErrorMessage = (field: CheckoutAddressField): string => {
    if (addressErrors[field] === 'invalid' && field === 'phone') return 'Saisissez un numéro de téléphone valide.';
    return 'Ce champ est obligatoire.';
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
      const message = 'Sélectionnez un moyen de paiement disponible.';
      setPaymentError(message);
      window.requestAnimationFrame(() => paymentGroupRef.current?.focus());
      return false;
    }
    setPaymentError('');
    return true;
  };

  useEffect(() => {
    if (quoteError?.status === 401) {
      router.replace(`/login?next=${encodeURIComponent('/checkout')}`);
    }
  }, [quoteError, router]);

  const gateways = [
    { id: 'flouci', name: 'Flouci', icon: CreditCard, desc: 'Paiement sécurisé par carte bancaire ou wallet Flouci.' },
    { id: 'konnect', name: 'Konnect', icon: CreditCard, desc: 'Paiement en ligne via le réseau Konnect.' },
    { id: 'paypal', name: 'PayPal (International)', icon: CreditCard, desc: 'Paiement international sécurisé via PayPal.' },
    { id: 'manual_mandat', name: 'Mandat Minute', icon: Banknote, desc: 'Payez à la poste et uploadez votre reçu.' },
    { id: 'cod', name: 'Cash on Delivery', icon: Truck, desc: 'Paiement à la livraison.' },
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

    if (storeItems.length === 0) {
      setError('Votre panier est vide');
      return;
    }

    const selectedCapability = quote?.payment_capabilities.methods.find(
      (method) => method.gateway === selectedGateway,
    );
    if (!selectedCapability?.available) {
      const message = selectedCapability?.buyer_message || 'Sélectionnez un moyen de paiement disponible.';
      setPaymentError(message);
      window.requestAnimationFrame(() => paymentGroupRef.current?.focus());
      return;
    }

    setIsProcessing(true);
    trackCheckoutStarted();
    if (!store) {
      setError('Boutique introuvable ou indisponible.');
      setIsProcessing(false);
      return;
    }

    try {
      const authRes = await fetchWithCsrf(`/api/pd/storefront/auth/me?store_id=${encodeURIComponent(store.id)}`);
      if (!authRes.ok) {
        router.push(`/login?next=${encodeURIComponent('/checkout')}`);
        setIsProcessing(false);
        return;
      }
    } catch {
      setError('Impossible de vérifier votre session. Veuillez réessayer.');
      trackCheckoutFailed(undefined, 'auth_check_failed');
      setIsProcessing(false);
      return;
    }

    if (!quote) {
      try {
        await refreshQuote();
        setError('Le total a été actualisé. Vérifiez-le puis confirmez à nouveau.');
      } catch (quoteRefreshError) {
        setError((quoteRefreshError as Error)?.message || 'Impossible de calculer le total de la commande.');
      }
      setIsProcessing(false);
      return;
    }

    let quoteForOrder = quote;
    if (new Date(quote.expires_at).getTime() <= Date.now() + 15_000) {
      try {
        const refreshedQuote = await refreshQuote();
        if (!checkoutQuoteTotalsMatch(quote, refreshedQuote)) {
          setError('Le total a changé. Vérifiez le montant actualisé puis confirmez à nouveau.');
          setIsProcessing(false);
          return;
        }
        quoteForOrder = refreshedQuote;
      } catch (quoteRefreshError) {
        setError((quoteRefreshError as Error)?.message || 'Impossible d’actualiser le total de la commande.');
        setIsProcessing(false);
        return;
      }
    }

    try {
      const { orderId } = await submitCheckoutOrder({
        scope: 'storefront',
        idempotencyKey: idempotencyKeyRef.current,
        quoteId: quoteForOrder.id,
        items: quoteItems,
        shippingAddress: normalizedAddress,
        paymentGateway: selectedGateway,
        paymentCapabilityVersion: quoteForOrder.payment_capabilities.capability_version,
        couponCode,
      });
      trackCheckoutPaymentStarted(orderId, selectedGateway);

      if (selectedGateway === 'manual_mandat' || selectedGateway === 'cod') {
        trackCheckoutPaymentCompleted(orderId);
        removeStoreItems(store.id);
        router.push(`${storeBaseHref}/checkout/success?order=${encodeURIComponent(orderId)}`);
        return;
      }

      const paymentRes = await fetchWithCsrf('/api/pd/payments/storefront/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `${idempotencyKeyRef.current.slice(0, 119)}:payment`,
        },
        credentials: 'include',
        body: JSON.stringify({
          store_id: store.id,
          order_id: orderId,
          gateway: selectedGateway,
          return_origin: window.location.origin,
        }),
      });

      if (!paymentRes.ok) {
        const data = await paymentRes.json();
        setError(data.error?.message || "Erreur lors de l'initialisation du paiement");
        trackCheckoutFailed(orderId, 'payment_init_failed');
        setIsProcessing(false);
        return;
      }

      const paymentData = await paymentRes.json();
      const checkoutUrl = paymentData.checkout_url || paymentData.url;

      removeStoreItems(store.id);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setOrderSuccess(orderId);
      }
    } catch (checkoutError) {
      if (isRecoverableQuoteError(checkoutError)) {
        try {
          await refreshQuote();
          setError('Le total de la commande a changé. Vérifiez le nouveau montant puis confirmez à nouveau.');
        } catch (quoteRefreshError) {
          setError((quoteRefreshError as Error)?.message || checkoutError.message);
        }
      } else {
        setError(checkoutError instanceof Error ? checkoutError.message : 'Erreur réseau. Veuillez réessayer.');
      }
      trackCheckoutFailed(undefined, 'network_error');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground }}>
        <LoaderCircle className="h-8 w-8 animate-spin" style={{ color: primaryColor }} aria-label="Chargement" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground, color: textColor }}>
        <div className="max-w-md mx-auto px-6 py-12 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Boutique indisponible</h1>
          <p className="mb-6" style={{ color: mutedTextColor }}>
            {storeError || 'Cette boutique est introuvable ou temporairement indisponible.'}
          </p>
          <Link
            href={getHubAbsoluteUrl('/hub')}
            className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Retour au marketplace
          </Link>
        </div>
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
        <h1 id="storefront_checkout_title" className="text-3xl font-extrabold mb-8 text-center" style={{ color: textColor }}>Checkout</h1>

        {(error || quoteError) && (
          <div role="alert" aria-live="polite" className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error || quoteError?.message}
          </div>
        )}

        <form
          aria-labelledby="storefront_checkout_title"
          aria-busy={isProcessing || quoteLoading ? 'true' : undefined}
          onSubmit={(event) => {
            event.preventDefault();
            void handleCheckout();
          }}
        >

        {/* Order Summary */}
        <div className="rounded-2xl shadow-sm border p-8 mb-8" style={{ backgroundColor: secondaryColor, borderColor }}>
          <h2 className="text-xl font-bold mb-6 border-b pb-4" style={{ color: textColor, borderColor }}>Résumé de la commande</h2>
          {storeItems.map((item) => {
            const line = quote?.items.find(
              (quoteLine) => quoteLine.product_id === item.product_id
                && quoteLine.variant_id === (item.variant_id || null),
            );
            return (
              <div key={item.id} className="flex justify-between items-center gap-4 mb-3">
                <span className="min-w-0 break-words" style={{ color: mutedTextColor }}>
                  {item.title} x{item.quantity}
                </span>
                <span className="shrink-0 font-medium">{line ? formatPrice(line.subtotal) : '—'}</span>
              </div>
            );
          })}
          <div className="flex justify-between items-center gap-4 mb-3">
            <span style={{ color: mutedTextColor }}>Sous-total marchandises</span>
            <span className="shrink-0 font-medium">{quote ? formatPrice(quote.subtotal) : '—'}</span>
          </div>
          {quoteProductDiscount > 0 && (
            <div className="flex justify-between items-center gap-4 mb-3 text-emerald-700">
              <span>Remise produit{quote?.coupon_code ? ` (${quote.coupon_code})` : ''}</span>
              <span className="shrink-0 font-medium">−{formatPrice(quoteProductDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center mb-3">
            <span style={{ color: mutedTextColor }}>Livraison</span>
            <span className="font-medium">{quote ? formatPrice(quote.shipping_total) : '—'}</span>
          </div>
          {quoteShippingSavings > 0 && (
            <div className="flex justify-between items-center gap-4 mb-3 text-emerald-700">
              <span>Économies de livraison</span>
              <span className="shrink-0 font-medium">−{formatPrice(quoteShippingSavings)}</span>
            </div>
          )}
          {quote && quote.tax_total > 0 && (
            <div className="flex justify-between items-center gap-4 mb-3">
              <span style={{ color: mutedTextColor }}>Taxes</span>
              <span className="shrink-0 font-medium">{formatPrice(quote.tax_total)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor }}>
            <span className="text-lg font-bold" style={{ color: textColor }}>Total</span>
            <span className="text-2xl font-black" style={{ color: primaryColor }} aria-live="polite">{quoteTotalLabel}</span>
          </div>
          {!quote && hasShippableItems && !normalizedAddress && (
            <p className="mt-4 text-sm" style={{ color: mutedTextColor }}>Complétez l&apos;adresse pour calculer le total définitif.</p>
          )}
          {quoteLoading && (
            <p className="mt-4 text-sm" style={{ color: mutedTextColor }} aria-live="polite">Calcul du dernier prix, des remises, de la livraison et des taxes...</p>
          )}
        </div>

        {hasShippableItems ? (
          <fieldset className="rounded-2xl shadow-sm border p-8 mb-8" style={{ backgroundColor: secondaryColor, borderColor }}>
            <legend className="w-full text-xl font-bold mb-6 border-b pb-4" style={{ color: textColor, borderColor }}>Adresse de livraison</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="checkout_full_name" className="block text-sm font-medium mb-1" style={{ color: textColor }}>Nom complet</label>
                <input
                  id="checkout_full_name"
                  name="full_name"
                  type="text"
                  value={address.full_name}
                  onChange={(e) => setAddressField('full_name', e.target.value)}
                  ref={(node) => { addressRefs.current.full_name = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.full_name ? 'true' : 'false'}
                  aria-describedby={addressErrors.full_name ? 'checkout_full_name_error' : undefined}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                  style={{ '--tw-ring-color': primaryColor, borderColor: undefined } as React.CSSProperties}
                  onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  autoComplete="name"
                  required
                />
                {addressErrors.full_name && <p id="checkout_full_name_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('full_name')}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="checkout_address_line" className="block text-sm font-medium mb-1" style={{ color: textColor }}>Adresse</label>
                <input
                  id="checkout_address_line"
                  name="address_line"
                  type="text"
                  value={address.address_line}
                  onChange={(e) => setAddressField('address_line', e.target.value)}
                  ref={(node) => { addressRefs.current.address_line = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.address_line ? 'true' : 'false'}
                  aria-describedby={addressErrors.address_line ? 'checkout_address_line_error' : undefined}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                  onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  autoComplete="street-address"
                  required
                />
                {addressErrors.address_line && <p id="checkout_address_line_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('address_line')}</p>}
              </div>
              <div>
                <label htmlFor="checkout_city" className="block text-sm font-medium mb-1" style={{ color: textColor }}>Ville</label>
                <input
                  id="checkout_city"
                  name="city"
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddressField('city', e.target.value)}
                  ref={(node) => { addressRefs.current.city = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.city ? 'true' : 'false'}
                  aria-describedby={addressErrors.city ? 'checkout_city_error' : undefined}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                  onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  autoComplete="address-level2"
                  required
                />
                {addressErrors.city && <p id="checkout_city_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('city')}</p>}
              </div>
              <div>
                <label htmlFor="checkout_postal_code" className="block text-sm font-medium mb-1" style={{ color: textColor }}>Code postal</label>
                <input
                  id="checkout_postal_code"
                  name="postal_code"
                  type="text"
                  value={address.postal_code}
                  onChange={(e) => setAddressField('postal_code', e.target.value)}
                  ref={(node) => { addressRefs.current.postal_code = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.postal_code ? 'true' : 'false'}
                  aria-describedby={addressErrors.postal_code ? 'checkout_postal_code_error' : undefined}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                  onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  required
                />
                {addressErrors.postal_code && <p id="checkout_postal_code_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('postal_code')}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="checkout_phone" className="block text-sm font-medium mb-1" style={{ color: textColor }}>Téléphone</label>
                <input
                  id="checkout_phone"
                  name="phone"
                  type="tel"
                  value={address.phone}
                  onChange={(e) => setAddressField('phone', e.target.value)}
                  ref={(node) => { addressRefs.current.phone = node; }}
                  onInvalid={handleNativeInvalid}
                  aria-invalid={addressErrors.phone ? 'true' : 'false'}
                  aria-describedby={addressErrors.phone ? 'checkout_phone_error' : undefined}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 outline-none"
                  onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
                {addressErrors.phone && <p id="checkout_phone_error" className="mt-1 text-sm text-red-700">{addressErrorMessage('phone')}</p>}
              </div>
            </div>
          </fieldset>
        ) : (
          <div className="rounded-2xl shadow-sm border p-8 mb-8" style={{ backgroundColor: secondaryColor, borderColor }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: textColor }}>Livraison numérique</h2>
            <p className="text-sm" style={{ color: mutedTextColor }}>Aucune adresse de livraison n&apos;est requise pour ce panier.</p>
          </div>
        )}

        {/* Payment Method */}
        <fieldset className="rounded-2xl shadow-sm border p-8" style={{ backgroundColor: secondaryColor, borderColor }}>
          <legend className="w-full text-xl font-bold mb-6 border-b pb-4" style={{ color: textColor, borderColor }}>Mode de paiement</legend>

          <div
            ref={paymentGroupRef}
            className="space-y-4"
            role="radiogroup"
            aria-label="Mode de paiement"
            aria-invalid={paymentHasError ? 'true' : 'false'}
            aria-describedby={paymentHasError ? 'checkout_payment_error' : undefined}
            tabIndex={-1}
          >
            {paymentOptions.map((g) => {
              const isAvailable = g.capability?.available === true;
              const descriptionId = `payment_gateway_${g.id}_description`;
              return (
              <label
                key={g.id}
                htmlFor={`payment_gateway_${g.id}`}
                className={`relative flex items-start p-4 rounded-xl border-2 transition-all duration-200 hover:border-opacity-70 focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-2 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                style={{
                  borderColor: selectedGateway === g.id ? primaryColor : borderColor,
                  backgroundColor: selectedGateway === g.id ? `${primaryColor}0D` : pageBackground,
                }}
              >
                <input
                  type="radio"
                  id={`payment_gateway_${g.id}`}
                  name="payment_gateway"
                  value={g.id}
                  checked={selectedGateway === g.id}
                  disabled={!isAvailable}
                  aria-describedby={descriptionId}
                  onChange={() => setSelectedGateway(g.id)}
                  className="sr-only peer"
                />
                <div className="flex items-center h-5" aria-hidden="true">
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
                  <p id={descriptionId} className="mt-1 text-sm" style={{ color: mutedTextColor }}>
                    {isAvailable ? g.desc : g.capability?.buyer_message || 'Disponibilité en cours de vérification.'}
                  </p>
                </div>
              </label>
              );
            })}
          </div>

          {(paymentError || (quote && !hasAvailableGateway)) && (
            <p id="checkout_payment_error" role="alert" className="mt-4 text-sm font-medium text-red-700">
              {paymentError || 'Aucun moyen de paiement n&apos;est disponible pour cette commande. Vérifiez la livraison ou réessayez plus tard.'}
            </p>
          )}

          <button
            type="submit"
            disabled={isProcessing || quoteLoading || !selectedGateway || !hasAvailableGateway}
            className="w-full mt-8 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center items-center"
            style={{ backgroundColor: primaryColor }}
          >
            {isProcessing ? 'Traitement en cours...' : quoteLoading ? 'Calcul du total...' : 'Confirmer et payer'}
          </button>
        </fieldset>
        </form>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-16" style={{ backgroundColor: footerBackground, borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm" style={{ color: mutedTextColor }}>
          <p>
            {store?.name || storeHost} — Propulsé par{' '}
            <MarketplaceBrand
              href={getHubAbsoluteUrl('/hub')}
              marketplaceName={marketplaceSettings.marketplace_name}
              marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
              marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
              marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
              logoSurface="dark"
              className="inline-flex align-middle"
              imageClassName="inline h-5 max-w-[120px] object-contain"
              textClassName="font-medium"
              fallbackMarkClassName="hidden"
            />
          </p>
        </div>
      </footer>
    </div>
  );
}
