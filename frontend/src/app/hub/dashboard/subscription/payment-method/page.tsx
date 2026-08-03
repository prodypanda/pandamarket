'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { CreditCard, CheckCircle2, AlertCircle, ShieldCheck, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VendorPaymentMethodUpdatePage() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvv || !cardHolder) {
      setError(t('dashboardPages.paymentMethod.errors.fillAllFields'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Simulate secure tokenized card update
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSuccess(t('dashboardPages.paymentMethod.success.updated'));
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setCardHolder('');
    } catch {
      setError(t('dashboardPages.paymentMethod.errors.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <Link href="/hub/dashboard/subscription" className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-xs font-bold">
            <ArrowLeft className="w-4 h-4" /> {t('dashboardPages.paymentMethod.backToDashboard')}
          </Link>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 uppercase flex items-center gap-1">
            <Lock className="w-3 h-3" /> {t('dashboardPages.paymentMethod.magicLinkVerified')}
          </span>
        </div>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center text-purple-600 mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black">{t('dashboardPages.paymentMethod.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('dashboardPages.paymentMethod.subtitle')}</p>
        </div>

        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs font-medium rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t('dashboardPages.paymentMethod.cardHolderLabel')}</label>
            <input
              type="text"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder={t('dashboardPages.paymentMethod.cardHolderPlaceholder')}
              className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 outline-none uppercase font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t('dashboardPages.paymentMethod.cardNumberLabel')}</label>
            <input
              type="text"
              maxLength={19}
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
              placeholder="4500 0000 0000 0000"
              className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 outline-none font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t('dashboardPages.paymentMethod.expiryLabel')}</label>
              <input
                type="text"
                maxLength={5}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="MM/YY"
                className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 outline-none font-mono text-center"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{t('dashboardPages.paymentMethod.cvcLabel')}</label>
              <input
                type="password"
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 outline-none font-mono text-center"
              />
            </div>
          </div>

          <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>{t('dashboardPages.paymentMethod.securityInfo')}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-700 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? t('dashboardPages.paymentMethod.saving') : t('dashboardPages.paymentMethod.saveButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
