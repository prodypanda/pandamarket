'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Check, Loader2, X } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';

export interface BackInStockAlertButtonProps {
  productId: string;
  productTitle?: string;
  isAuthenticated?: boolean;
  userEmail?: string | null;
  className?: string;
}

export const BackInStockAlertButton: React.FC<BackInStockAlertButtonProps> = ({
  productId,
  productTitle = 'Cet article',
  isAuthenticated = false,
  userEmail = null,
  className = '',
}) => {
  const { t, dir } = useLocale();
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [email, setEmail] = useState<string>(userEmail || '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check alert status on mount
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const queryParams = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
        const res = await fetchWithCsrf(`/api/pd/products/${productId}/back-in-stock/status${queryParams}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setIsSubscribed(Boolean(json.subscribed));
          }
        }
      } catch {
        // Ignore check errors
      } finally {
        if (isMounted) setChecking(false);
      }
    }

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [productId, userEmail]);

  const handleSubscribe = async (emailToUse?: string) => {
    const targetEmail = (emailToUse || email || userEmail || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMessage(t('storeFollow.emailRequired') || 'Veuillez renseigner une adresse email valide.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetchWithCsrf(`/api/pd/products/${productId}/back-in-stock/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Impossible d\'enregistrer l\'alerte.');
      }

      setIsSubscribed(true);
      setSuccessMessage(t('storeFollow.alertSubscribed') || 'Vous serez prévenu par notification dès le retour en stock !');
      setTimeout(() => {
        setShowModal(false);
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsubscribe = async () => {
    setSubmitting(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/products/${productId}/back-in-stock/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail || email }),
      });
      if (res.ok) {
        setIsSubscribed(false);
      }
    } catch {
      // Ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleButtonClick = () => {
    if (isSubscribed) {
      handleUnsubscribe();
    } else if (isAuthenticated && userEmail) {
      handleSubscribe(userEmail);
    } else {
      setShowModal(true);
    }
  };

  return (
    <div className={`relative inline-block w-full ${className}`} dir={dir}>
      <button
        type="button"
        data-testid="btn-back-in-stock-alert"
        disabled={checking || submitting}
        onClick={handleButtonClick}
        className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          isSubscribed
            ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50'
        }`}
      >
        {submitting || checking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <>
            <Check className="h-4 w-4 stroke-[2.5]" />
            <span>{t('storeFollow.alertActive') || 'Alerte active au réassort'}</span>
          </>
        ) : (
          <>
            <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>{t('storeFollow.backInStockAlert') || t('storeFollow.alertMe') || 'M\'avertir lors du réassort'}</span>
          </>
        )}
      </button>

      {/* Email Input Modal for Guests */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1c212c] border border-gray-100 dark:border-white/10"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute end-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 mb-4">
              <Bell className="h-6 w-6" />
            </div>

            <h3 className="text-base font-black text-gray-900 dark:text-white">
              Alerte de retour en stock
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Recevez un email instantané dès que « {productTitle} » est de nouveau disponible en stock.
            </p>

            {successMessage ? (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold dark:bg-emerald-950/40 dark:text-emerald-300">
                {successMessage}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubscribe();
                }}
                className="mt-4 space-y-3"
              >
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-medium dark:bg-rose-950/40 dark:text-rose-300">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Votre adresse email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Valider mon alerte</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
