'use client';

import { useState, useEffect } from 'react';
import { getConsentStatus, setConsentStatus, ConsentStatus } from '@/lib/consent';
import { ShieldCheck } from 'lucide-react';

export function ConsentBanner() {
  const [status, setStatus] = useState<ConsentStatus>('accepted'); // default accepted until loaded to avoid SSR flash

  useEffect(() => {
    setStatus(getConsentStatus());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: ConsentStatus }>;
      if (customEvent.detail?.status) {
        setStatus(customEvent.detail.status);
      }
    };

    window.addEventListener('pd_consent_updated', handleUpdate);
    return () => window.removeEventListener('pd_consent_updated', handleUpdate);
  }, []);

  if (status !== 'pending') return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-800 shadow-2xl transition-all animate-in slide-in-from-bottom duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-100 mb-0.5">Protection de vos données &amp; Cookies</p>
            <p className="text-slate-300 leading-relaxed">
              Nous utilisons des cookies essentiels pour faire fonctionner la boutique et, avec votre accord, des cookies d&apos;analyse (GA4, Meta Pixel) pour améliorer votre expérience d&apos;achat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setConsentStatus('rejected')}
            className="px-4 py-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors font-medium"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => setConsentStatus('accepted')}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            Accepter les cookies
          </button>
        </div>
      </div>
    </div>
  );
}
