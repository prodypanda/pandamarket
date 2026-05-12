'use client';

import { useCart, type CartItem } from '../../../contexts/CartContext';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Store } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '../../../contexts/LocaleContext';
import { getHubProductHref } from '../../../lib/product-links';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';
import { getCartItemUnitPrice, getCartLineTotal, getShippableStoreCount, getShippingTotalForItems, getStoreShippingTotal } from '../../../lib/cart-utils';

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
  const { items, removeFromCart, updateQuantity, getCartTotal, getItemsByStore, getItemCount } =
    useCart();
  const { t } = useLocale();
  const { settings, classes, isAliExpress } = useMarketplaceTheme();

  function formatPrice(price: number): string {
    return `${price.toFixed(3)} ${t('common.currency')}`;
  }

  const storeGroups = getItemsByStore();
  const storeIds = Object.keys(storeGroups);
  const subtotal = getCartTotal();
  const shippingTotal = getShippingTotalForItems(items, SHIPPING_PER_VENDOR);
  const shippableStoreCount = getShippableStoreCount(items);
  const total = subtotal + shippingTotal;

  if (items.length === 0) {
    return (
      <div className={`min-h-screen ${classes.pageSoft}`}>
        <HubNavbar
          marketplaceName={settings.marketplace_name}
          marketplaceLogoUrl={settings.marketplace_logo_url}
          marketplaceTheme={settings.marketplace_theme}
        />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${classes.primarySoft}`}>
            <ShoppingCart className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('cart.empty')}</h1>
          <p className="text-gray-500 mb-8">
            {t('cart.emptySubtitle')}
          </p>
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
                Secure marketplace cart
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                {t('cart.title')} ({t('cart.itemCount', { count: getItemCount() })})
              </h1>
              <p className="mt-2 text-sm text-white/75">
                {storeIds.length} vendor{storeIds.length !== 1 ? 's' : ''} · buyer protection · fast checkout
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur">
              <p className="text-2xl font-black">{formatPrice(total)}</p>
              <p className="text-xs font-semibold text-white/70">{t('cart.total')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {storeIds.map((storeId) => {
              const group = storeGroups[storeId];
              const storeSubtotal = group.items.reduce(
                (sum, item) => sum + getCartLineTotal(item),
                0,
              );
              const storeShippingTotal = getStoreShippingTotal(group.items, SHIPPING_PER_VENDOR);

              return (
                <div
                  key={storeId}
                  className={`${classes.panel} overflow-hidden`}
                >
                  {/* Store Header */}
                  <div className={`px-6 py-4 border-b flex items-center gap-2 ${isAliExpress ? 'border-orange-100 bg-orange-50/70' : 'border-gray-200 bg-gray-50'}`}>
                    <Store className={`w-4 h-4 ${classes.primaryText}`} />
                    <span className="font-semibold text-gray-900">{group.store_name}</span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => (
                      <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                        {/* Image */}
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
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
                          <Link
                            href={getCartProductHref(item)}
                            className={`font-bold text-gray-900 transition-colors line-clamp-1 ${classes.primaryTextHover}`}
                          >
                            {item.title}
                          </Link>
                          {item.variant && (
                            <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>
                          )}
                          <p className="text-sm font-semibold text-gray-700 mt-1">
                            {formatPrice(getCartItemUnitPrice(item))}
                          </p>
                          {item.wholesale_pricing?.enabled && (
                            <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                              Wholesale tier pricing applied by quantity
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className={`flex items-center overflow-hidden rounded-full border bg-white ${isAliExpress ? 'border-orange-200' : 'border-gray-300'}`}>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className={`p-2 transition-colors ${isAliExpress ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}
                          >
                            <Minus className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                          <span className="px-3 text-sm font-semibold text-gray-900 min-w-[32px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className={`p-2 transition-colors ${isAliExpress ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}
                          >
                            <Plus className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[100px]">
                          <p className="font-bold text-gray-900">
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

                  {/* Store Shipping + Subtotal */}
                  <div className={`px-6 py-3 border-t flex items-center justify-between text-sm ${isAliExpress ? 'border-orange-100 bg-orange-50/60' : 'border-gray-200 bg-gray-50'}`}>
                    <span className="text-gray-500">
                      {t('cart.shipping')} : {formatPrice(storeShippingTotal)}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {t('cart.subtotal')} : {formatPrice(storeSubtotal + storeShippingTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className={`${classes.panel} p-6 sticky top-24`}>
              <h2 className="font-bold text-gray-900 text-lg mb-4">{t('cart.title')}</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cart.subtotal')}</span>
                  <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t('cart.shipping')} ({shippableStoreCount})
                  </span>
                  <span className="font-medium text-gray-900">{formatPrice(shippingTotal)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900 text-base">{t('cart.total')}</span>
                  <span className={`font-extrabold ${classes.primaryText} text-lg`}>
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <Link
                href="/hub/checkout"
                className={`mt-6 w-full flex items-center justify-center gap-2 py-3.5 font-black rounded-full hover:shadow-lg transition-all ${classes.primaryGradient}`}
              >
                {t('cart.checkout')}
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href="/hub"
                className={`mt-3 w-full flex items-center justify-center py-3 text-sm font-semibold text-gray-500 transition-colors ${classes.primaryTextHover}`}
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
