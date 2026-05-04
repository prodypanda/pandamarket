'use client';

import React, { useState } from 'react';
import { CreditCard, Banknote, Truck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../contexts/CartContext';
import { useLocale } from '../../../contexts/LocaleContext';

const SHIPPING_PER_VENDOR = 7;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getCartTotal, getItemsByStore, clearCart } = useCart();
  const { t } = useLocale();
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

  const storeGroups = getItemsByStore();
  const storeIds = Object.keys(storeGroups);
  const subtotal = getCartTotal();
  const shippingTotal = storeIds.length * SHIPPING_PER_VENDOR;
  const total = subtotal + shippingTotal;

  const gateways = [
    { id: 'flouci', name: t('checkout.payment.flouci'), icon: CreditCard, desc: t('checkout.payment.flouci') },
    { id: 'konnect', name: t('checkout.payment.konnect'), icon: CreditCard, desc: t('checkout.payment.konnect') },
    { id: 'manual_mandat', name: t('checkout.payment.mandat'), icon: Banknote, desc: t('checkout.payment.mandatInstructions') },
    { id: 'cod', name: t('checkout.payment.cod'), icon: Truck, desc: t('checkout.payment.codInstructions') },
  ];

  const handleCheckout = async () => {
    setError('');

    if (!address.full_name || !address.address_line || !address.city || !address.phone) {
      setError(t('errors.forbidden'));
      return;
    }

    if (items.length === 0) {
      setError(t('cart.empty'));
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create order
      const orderRes = await fetch('/api/pd/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: items.map((item) => ({
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
      const paymentRes = await fetch('/api/pd/payments/init', {
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
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('cart.empty')}</h1>
          <p className="text-gray-500 mb-6">{t('cart.emptySubtitle')}</p>
          <button
            onClick={() => router.push('/hub')}
            className="px-6 py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b876] transition-colors"
          >
            {t('cart.continueShopping')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">{t('checkout.title')}</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">{t('cart.title')}</h2>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center mb-3">
              <span className="text-gray-600">
                {item.title} x{item.quantity}
              </span>
              <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">{t('cart.shipping')} ({storeIds.length})</span>
            <span className="font-medium">{formatPrice(shippingTotal)}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <span className="text-lg font-bold text-gray-900">{t('cart.total')}</span>
            <span className="text-2xl font-black text-[#16C784]">{formatPrice(total)}</span>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">{t('checkout.address.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.firstName')}</label>
              <input
                type="text"
                value={address.full_name}
                onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.address')}</label>
              <input
                type="text"
                value={address.address_line}
                onChange={(e) => setAddress({ ...address, address_line: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.city')}</label>
              <input
                type="text"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.postalCode')}</label>
              <input
                type="text"
                value={address.postal_code}
                onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address.phone')}</label>
              <input
                type="tel"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">{t('checkout.payment.title')}</h2>
          
          <div className="space-y-4">
            {gateways.map((g) => (
              <div 
                key={g.id}
                onClick={() => setSelectedGateway(g.id)}
                className={`relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 ${
                  selectedGateway === g.id 
                    ? 'border-[#16C784] bg-[#16C784]/5' 
                    : 'border-gray-200 hover:border-[#16C784]/50 bg-white'
                }`}
              >
                <div className="flex items-center h-5">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedGateway === g.id ? 'border-[#16C784]' : 'border-gray-300'
                  }`}>
                    {selectedGateway === g.id && <div className="w-2.5 h-2.5 rounded-full bg-[#16C784]"></div>}
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center">
                    <g.icon className={`w-5 h-5 mr-2 ${selectedGateway === g.id ? 'text-[#16C784]' : 'text-gray-400'}`} />
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
            className="w-full mt-8 bg-[#16C784] text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-[#16C784]/20 hover:bg-[#14b876] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center items-center"
          >
            {isProcessing ? t('checkout.processing') : t('checkout.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
