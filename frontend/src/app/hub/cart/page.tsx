'use client';

import { useCart } from '../../../contexts/CartContext';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Store } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '../../../contexts/LocaleContext';

const SHIPPING_PER_VENDOR = 7;

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getCartTotal, getItemsByStore, getItemCount } =
    useCart();
  const { t } = useLocale();

  function formatPrice(price: number): string {
    return `${price.toFixed(3)} ${t('common.currency')}`;
  }

  const storeGroups = getItemsByStore();
  const storeIds = Object.keys(storeGroups);
  const subtotal = getCartTotal();
  const shippingTotal = storeIds.length * SHIPPING_PER_VENDOR;
  const total = subtotal + shippingTotal;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <HubNavbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('cart.empty')}</h1>
          <p className="text-gray-500 mb-8">
            {t('cart.emptySubtitle')}
          </p>
          <Link
            href="/hub"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b876] transition-colors"
          >
            {t('cart.continueShopping')}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HubNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('cart.title')} ({t('cart.itemCount', { count: getItemCount() })})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {storeIds.map((storeId) => {
              const group = storeGroups[storeId];
              const storeSubtotal = group.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0,
              );

              return (
                <div
                  key={storeId}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  {/* Store Header */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <Store className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-900">{group.store_name}</span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => (
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
                          <Link
                            href={`/hub/products/${item.product_id}`}
                            className="font-medium text-gray-900 hover:text-[#16C784] transition-colors line-clamp-1"
                          >
                            {item.title}
                          </Link>
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

                  {/* Store Shipping + Subtotal */}
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {t('cart.shipping')} : {formatPrice(SHIPPING_PER_VENDOR)}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {t('cart.subtotal')} : {formatPrice(storeSubtotal + SHIPPING_PER_VENDOR)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
              <h2 className="font-bold text-gray-900 text-lg mb-4">{t('cart.title')}</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cart.subtotal')}</span>
                  <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t('cart.shipping')} ({storeIds.length})
                  </span>
                  <span className="font-medium text-gray-900">{formatPrice(shippingTotal)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900 text-base">{t('cart.total')}</span>
                  <span className="font-extrabold text-[#16C784] text-lg">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <Link
                href="/hub/checkout"
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b876] hover:shadow-lg hover:shadow-[#16C784]/20 transition-all"
              >
                {t('cart.checkout')}
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href="/hub"
                className="mt-3 w-full flex items-center justify-center py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t('cart.continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
