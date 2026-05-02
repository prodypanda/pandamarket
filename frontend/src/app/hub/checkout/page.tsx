'use client';

import React, { useState } from 'react';
import { CheckCircle, Upload, CreditCard, Banknote, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const router = useRouter();
  const [selectedGateway, setSelectedGateway] = useState('flouci');
  const [isProcessing, setIsProcessing] = useState(false);

  const gateways = [
    { id: 'flouci', name: 'Flouci', icon: CreditCard, desc: 'Paiement sécurisé par carte bancaire ou wallet Flouci.' },
    { id: 'konnect', name: 'Konnect', icon: CreditCard, desc: 'Paiement en ligne via le réseau Konnect.' },
    { id: 'manual_mandat', name: 'Mandat Minute', icon: Banknote, desc: 'Payez à la poste et uploadez votre reçu.' },
    { id: 'cod', name: 'Cash on Delivery', icon: Truck, desc: 'Paiement à la livraison.' },
  ];

  const handleCheckout = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      if (selectedGateway === 'manual_mandat') {
        router.push('/hub/checkout/mandat-upload?order_id=order_12345');
      } else if (selectedGateway === 'cod') {
        router.push('/hub/checkout/success?order_id=order_12345');
      } else {
        // Redirect to mocked external gateway URL
        alert(`Redirecting to ${selectedGateway} gateway...`);
        router.push('/hub/checkout/success?order_id=order_12345');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Secure Checkout</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Order Summary</h2>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">Premium Noise-Canceling Headphones x1</span>
            <span className="font-medium">TND 450.00</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">Shipping (Flat Rate)</span>
            <span className="font-medium">TND 7.00</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-black text-blue-600">TND 457.00</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Payment Method</h2>
          
          <div className="space-y-4">
            {gateways.map((g) => (
              <div 
                key={g.id}
                onClick={() => setSelectedGateway(g.id)}
                className={`relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 ${
                  selectedGateway === g.id 
                    ? 'border-blue-600 bg-blue-50/50' 
                    : 'border-gray-200 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="flex items-center h-5">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedGateway === g.id ? 'border-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedGateway === g.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>}
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center">
                    <g.icon className={`w-5 h-5 mr-2 ${selectedGateway === g.id ? 'text-blue-600' : 'text-gray-400'}`} />
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
            className="w-full mt-8 bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center items-center"
          >
            {isProcessing ? 'Processing...' : 'Complete Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}
