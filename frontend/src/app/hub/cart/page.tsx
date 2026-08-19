'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { useState, useEffect } from 'react';
import { useCart, type CartItem } from '../../../contexts/CartContext';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Store,
  Sparkles,
  Ticket,
  CheckCircle2,
  X,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '../../../contexts/LocaleContext';
import { getHubProductHref } from '../../../lib/product-links';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';
import {
  getCartItemUnitPrice,
  getCartLineTotal,
  getShippableStoreCount,
  getShippingTotalForItems,
  getStoreShippingTotal,
} from '../../../lib/cart-utils';
import { trackCartView } from '../../../lib/marketplace-analytics';

const SHIPPING_PER_VENDOR = 7;

function getCartProductHref(item: CartItem): string {
  return getHubProductHref({
    id: item.product_id,
    title: item.title,
    slug: item.slug,
    category: item.category,
    marketplace_category_slug: item.marketplace_category_slug,
    store_subdomain: item.store_subdomain,
  });
}

export default function CartPage() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getItemsByStore,
    getItemCount,
    couponCode,
    discountAmount,
    combinedShippingSavings,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { t } = useLocale();
  const { settings, classes, isAliExpress } = useMarketplaceTheme();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{
    message: string;
    isError?: boolean;
  } | null>(null);

  useEffect(() => {
    trackCartView();
  }, []);

  function formatPrice(price: number): string {
    return `${price.toFixed(3)} ${t('common.currency')}`;
  }

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    const res = applyCoupon(inputCoupon.trim());
    if (res.success) {
      setCouponFeedback({ message: res.message });
      setInputCoupon('');
    } else {
      setCouponFeedback({ message: res.message, isError: true });
    }
  };

  const storeGroups = getItemsByStore();
  const storeIds = Object.keys(storeGroups);
  const subtotal = getCartTotal();
  const rawShippingTotal = getShippingTotalForItems(items, SHIPPING_PER_VENDOR);
  const finalShippingTotal = Math.max(
    0,
    rawShippingTotal -
      (couponCode === 'LIVRAISON_ZERO' ? rawShippingTotal : combinedShippingSavings),
  );
  const finalTotal =
    Math.max(0, subtotal - (couponCode === 'LIVRAISON_ZERO' ? 0 : discountAmount)) +
    finalShippingTotal;

  if (items.length === 0) {
    return (
      <div className={`min-h-screen ${classes.pageSoft}`}>
        <HubNavbar
          marketplaceName={settings.marketplace_name}
          marketplaceLogoUrl={settings.marketplace_logo_url}
          marketplaceTheme={settings.marketplace_theme}
        />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div
            className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${classes.primarySoft}`}
          >
            <ShoppingCart className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('cart.empty')}</h1>
          <p className="text-gray-500 mb-8">{t('cart.emptySubtitle')}</p>
          <Link
            href="/hub"
            className={`inline-flex items-center gap-2 rounded-full px-8 py-3 font-black transition-all hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
          >
            {t('cart.continueShopping')}
            <ArrowRight className="w-5 h-5" />
          </Link>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`relative overflow-hidden rounded-[2rem] p-6 sm:p-8 ${classes.header}`}>
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/80">
                Panier Intelligent Multi-Boutiques
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                {t('cart.title')} ({t('cart.itemCount', { count: getItemCount() })})
              </h1>
              <p className="mt-2 text-sm text-white/75">
                {storeIds.length} boutique{storeIds.length !== 1 ? 's' : ''} partenaires ·
                Expédition combinée · Paiement sécurisé
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur">
              <p className="text-2xl font-black">{formatPrice(finalTotal)}</p>
              <p className="text-xs font-semibold text-white/70">{t('cart.total')}</p>
            </div>
          </div>
        </div>

        {/* Multi-Vendor Combined Shipping Highlight Banner */}
        {storeIds.length >= 2 && (
          <div className="mt-6 p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-300 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-sm text-emerald-950">
                  🎉 Expédition Groupée Active sur {storeIds.length} Boutiques
                </p>
                <p className="text-xs text-emerald-800">
                  PandaMarket optimise vos livraisons :{' '}
                  <strong>-{formatPrice(combinedShippingSavings)}</strong> de remise automatique
                  appliquée !
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
              Économie Garantie
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Cart Items Grouped by Store */}
          <div className="lg:col-span-2 space-y-6">
            {storeIds.map((storeId) => {
              const group = storeGroups[storeId];
              const storeSubtotal = group.items.reduce(
                (sum, item) => sum + getCartLineTotal(item),
                0,
              );
              const storeShippingTotal = getStoreShippingTotal(group.items, SHIPPING_PER_VENDOR);

              return (
                <div key={storeId} className={`${classes.panel} overflow-hidden rounded-3xl`}>
                  {/* Store Header */}
                  <div
                    className={`px-6 py-4 border-b flex items-center justify-between gap-2 ${isAliExpress ? 'border-orange-100 bg-orange-50/70' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Store className={`w-4 h-4 ${classes.primaryText}`} />
                      <span className="font-bold text-gray-900">{group.store_name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {group.items.length} article{group.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => (
                      <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                        {/* Image */}
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                          {item.image_url ? (
                            <img
                              src={
                                item.image_url ? getResizedImageUrl(item.image_url, 'medium') : ''
                              }
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
                          <Link
                            href={getCartProductHref(item)}
                            className="font-bold text-gray-900 hover:text-[#B91C1C] transition-colors truncate block text-sm"
                          >
                            {item.title}
                          </Link>
                          <p className="text-xs text-gray-500 font-semibold mt-0.5">
                            {formatPrice(getCartItemUnitPrice(item))} / unité
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className={`p-2 transition-colors ${isAliExpress ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}
                          >
                            <Minus className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                          <span className="px-3 py-1 text-xs font-bold text-gray-800 min-w-[28px] text-center font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className={`p-2 transition-colors ${isAliExpress ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}
                          >
                            <Plus className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[90px]">
                          <p className="font-black text-gray-900 font-mono text-sm">
                            {formatPrice(getCartLineTotal(item))}
                          </p>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Supprimer l'article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Store Shipping + Subtotal */}
                  <div
                    className={`px-6 py-3 border-t flex items-center justify-between text-xs font-semibold ${isAliExpress ? 'border-orange-100 bg-orange-50/60' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <span className="text-gray-500">
                      Livraison {group.store_name} : {formatPrice(storeShippingTotal)}
                    </span>
                    <span className="font-bold text-gray-900">
                      Sous-total boutique : {formatPrice(storeSubtotal + storeShippingTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary & Coupons */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`${classes.panel} p-6 rounded-3xl sticky top-24 space-y-5`}>
              <h2 className="font-black text-gray-900 text-lg">Récapitulatif Panier</h2>

              {/* Promo Coupon Form */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-[#B91C1C]" />
                  Code Promo & Carte Cadeau
                </span>

                {couponCode ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="space-y-0.5">
                      <p className="font-mono font-black text-xs text-emerald-900">{couponCode}</p>
                      <p className="text-[10px] text-emerald-700 font-semibold">
                        {discountAmount > 0
                          ? `-${formatPrice(discountAmount)} déduits`
                          : 'Livraison 100% offerte'}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove coupon"
                      onClick={removeCoupon}
                      className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100"
                      title="Retirer le code"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={inputCoupon}
                        onChange={(e) => setInputCoupon(e.target.value.toUpperCase())}
                        placeholder="Ex: CHANCE5DT, PANDA10"
                        className="flex-1 px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-[#B91C1C]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition"
                      >
                        Appliquer
                      </button>
                    </div>
                    {couponFeedback && (
                      <p
                        className={`text-[11px] font-bold ${couponFeedback.isError ? 'text-red-600' : 'text-emerald-600'}`}
                      >
                        {couponFeedback.message}
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 text-xs border-t border-slate-100 pt-4">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total articles</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>
                    Frais de livraison ({storeIds.length} boutique{storeIds.length !== 1 ? 's' : ''}
                    )
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatPrice(rawShippingTotal)}
                  </span>
                </div>

                {combinedShippingSavings > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Remise expédition combinée</span>
                    <span className="font-mono">-{formatPrice(combinedShippingSavings)}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Code promo ({couponCode})</span>
                    <span className="font-mono">-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 flex justify-between items-baseline">
                  <span className="font-black text-gray-900 text-sm">Total à payer</span>
                  <span className={`font-black ${classes.primaryText} text-2xl font-mono`}>
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              <Link
                href="/hub/checkout"
                className={`w-full flex items-center justify-center gap-2 py-4 font-black rounded-2xl hover:shadow-lg transition-all ${classes.primaryGradient}`}
              >
                <span>{t('cart.checkout')}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href="/hub"
                className={`w-full flex items-center justify-center py-2 text-xs font-bold text-gray-500 transition-colors ${classes.primaryTextHover}`}
              >
                {t('cart.continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <HubFooter {...settings} />
    </div>
  );
}
