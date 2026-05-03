'use client';

import React, { Suspense } from 'react';
import { CheckCircle, ArrowRight, Loader2, Package } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="bg-white rounded-3xl p-12 lg:p-16 text-center shadow-xl shadow-gray-200/50 border border-gray-100 max-w-2xl mx-auto mt-20 relative overflow-hidden">
      {/* Decorative background circle */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-50 rounded-full blur-3xl -z-10"></div>
      
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      
      <h1 className="text-4xl font-black text-gray-900 mb-4">Payment Successful!</h1>
      <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
        Thank you for your purchase. Your order <strong className="text-gray-900">{orderId}</strong> has been confirmed and is now being processed by the vendor.
      </p>

      <div className="bg-gray-50 rounded-2xl p-6 mb-10 flex items-center justify-center space-x-4 border border-gray-100">
        <Package className="w-6 h-6 text-gray-400" />
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900">Track your delivery</p>
          <p className="text-sm text-gray-500">We'll send shipping updates to your email.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Link 
          href="/hub"
          className="px-8 py-3.5 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-800 transition-colors"
        >
          Return to Home
        </Link>
        <button className="px-8 py-3.5 bg-white text-gray-900 font-bold rounded-full border border-gray-200 hover:bg-gray-50 transition-colors flex justify-center items-center">
          View Order Status <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 z-0">
      <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-[#16C784]" /></div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
