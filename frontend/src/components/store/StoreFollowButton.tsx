'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithCsrf } from '@/lib/api';

export interface StoreSubscriptionStatus {
  is_subscribed: boolean;
  is_verified_buyer: boolean;
  notify_price_drops: boolean;
  notify_new_products: boolean;
  subscribers_count: number;
  verified_subscribers_count: number;
}

export interface StoreFollowButtonProps {
  storeId: string;
  storeName?: string;
  initialSubscribed?: boolean;
  initialCount?: number;
  initialVerifiedCount?: number;
  isVerifiedBuyer?: boolean;
  variant?: 'pdp_card' | 'action_bar' | 'directory_card';
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showVerifiedBadge?: boolean;
  enableNotificationModal?: boolean;
  isAuthenticated?: boolean;
  onFollowChange?: (subscribed: boolean, newCount: number) => void;
  onRequireAuth?: () => void;
}

export const StoreFollowButton: React.FC<StoreFollowButtonProps> = ({
  storeId,
  storeName = 'Boutique',
  initialSubscribed = false,
  initialCount = 0,
  initialVerifiedCount = 0,
  isVerifiedBuyer = false,
  variant = 'pdp_card',
  size = 'md',
  showCount = true,
  showVerifiedBadge = true,
  enableNotificationModal = true,
  isAuthenticated = true,
  onFollowChange,
  onRequireAuth,
}) => {
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [count, setCount] = useState(initialCount);
  const [verifiedCount, setVerifiedCount] = useState(initialVerifiedCount);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [notifyPriceDrops, setNotifyPriceDrops] = useState(true);
  const [notifyNewProducts, setNotifyNewProducts] = useState(true);

  // Sync state if initial props change
  useEffect(() => {
    setIsSubscribed(initialSubscribed);
    setCount(initialCount);
    setVerifiedCount(initialVerifiedCount);
  }, [initialSubscribed, initialCount, initialVerifiedCount]);

  const handleToggleFollow = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setErrorBanner(null);

    if (!isAuthenticated) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        window.location.href = '/login';
      }
      return;
    }

    if (!storeId || storeId.trim() === '') {
      setErrorBanner('Identifiant boutique invalide.');
      return;
    }

    const previousSubscribed = isSubscribed;
    const previousCount = count;
    const previousVerifiedCount = verifiedCount;
    const nextSubscribed = !previousSubscribed;
    const nextCount = nextSubscribed ? previousCount + 1 : Math.max(0, previousCount - 1);
    const nextVerifiedCount = nextSubscribed
      ? (isVerifiedBuyer ? previousVerifiedCount + 1 : previousVerifiedCount)
      : Math.max(0, isVerifiedBuyer ? previousVerifiedCount - 1 : previousVerifiedCount);

    // Optimistic UI Update
    setIsSubscribed(nextSubscribed);
    setCount(nextCount);
    setVerifiedCount(nextVerifiedCount);
    if (onFollowChange) onFollowChange(nextSubscribed, nextCount);

    setLoading(true);
    try {
      const endpoint = `/api/pd/stores/${storeId}/subscribe`;
      const method = nextSubscribed ? 'POST' : 'DELETE';
      const response = await fetchWithCsrf(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notify_price_drops: notifyPriceDrops,
          notify_new_products: notifyNewProducts,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Trop de requêtes. Veuillez patienter avant de modifier votre abonnement.');
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Erreur serveur (${response.status})`);
      }

      const result = await response.json();
      if (typeof result.subscribers_count === 'number') {
        setCount(result.subscribers_count);
      }
      if (typeof result.verified_subscribers_count === 'number') {
        setVerifiedCount(result.verified_subscribers_count);
      }
    } catch (err: any) {
      // Rollback on error
      setIsSubscribed(previousSubscribed);
      setCount(previousCount);
      setVerifiedCount(previousVerifiedCount);
      if (onFollowChange) onFollowChange(previousSubscribed, previousCount);
      setErrorBanner(err.message || 'Une erreur réseau est survenue lors de l’abonnement.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      await fetchWithCsrf(`/api/pd/stores/${storeId}/subscription-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notify_price_drops: notifyPriceDrops,
          notify_new_products: notifyNewProducts,
        }),
      });
      setShowPreferencesModal(false);
    } catch {
      setErrorBanner('Impossible d’enregistrer les préférences.');
    }
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }[size];

  const variantContainerClasses = {
    pdp_card: 'inline-flex flex-col gap-1.5 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm',
    action_bar: 'flex items-center justify-between w-full p-3 bg-zinc-50 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-800',
    directory_card: 'flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow',
  }[variant];

  // Button Label Computation
  let buttonLabel = isSubscribed ? 'Abonné' : 'Suivre';
  if (isSubscribed && isHovered) {
    buttonLabel = 'Se désabonner';
  }

  return (
    <div className={variantContainerClasses} data-testid={`store-follow-container-${storeId}`}>
      {errorBanner && (
        <div role="alert" className="p-2 text-xs text-rose-700 bg-rose-50 rounded-md border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
          {errorBanner}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          {variant !== 'action_bar' && (
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{storeName}</span>
          )}
          {showCount && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span data-testid="subscriber-count" className="font-medium text-zinc-700 dark:text-zinc-300">
                {count.toLocaleString()} {count <= 1 ? 'abonné' : 'abonnés'}
              </span>
              {showVerifiedBadge && verifiedCount > 0 && (
                <span
                  data-testid="verified-buyer-badge"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  title={`${verifiedCount} acheteurs vérifiés`}
                >
                  ✓ Badge Acheteur Vérifié
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid={`store-follow-btn-${storeId}`}
            aria-pressed={isSubscribed}
            aria-label={buttonLabel}
            disabled={loading || !storeId}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleToggleFollow}
            className={`relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 select-none ${sizeClasses} ${
              isSubscribed
                ? isHovered
                  ? 'bg-rose-50 text-rose-600 border border-rose-300 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
                  : 'bg-zinc-100 text-zinc-800 border border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-95'
            } ${loading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {loading ? (
              <span data-testid="follow-spinner" className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
            ) : isSubscribed ? (
              isHovered ? (
                <span className="mr-1 text-xs">✕</span>
              ) : (
                <span className="mr-1 text-xs text-emerald-600 dark:text-emerald-400">✓</span>
              )
            ) : (
              <span className="mr-1 text-xs">+</span>
            )}
            <span>{buttonLabel}</span>
          </button>

          {isSubscribed && enableNotificationModal && (
            <button
              type="button"
              data-testid="notification-preferences-trigger"
              aria-label="Préférences de notifications"
              onClick={() => setShowPreferencesModal(true)}
              className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              🔔
            </button>
          )}
        </div>
      </div>

      {/* Notification Preferences Modal */}
      {showPreferencesModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base mb-3">
              Alertes pour {storeName}
            </h3>
            <div className="space-y-3 mb-4">
              <label className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                <span>Baisses de prix</span>
                <input
                  type="checkbox"
                  data-testid="toggle-price-drops"
                  checked={notifyPriceDrops}
                  onChange={(e) => setNotifyPriceDrops(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
              <label className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                <span>Nouveaux produits publiés</span>
                <input
                  type="checkbox"
                  data-testid="toggle-new-products"
                  checked={notifyNewProducts}
                  onChange={(e) => setNotifyNewProducts(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Annuler
              </button>
              <button
                type="button"
                data-testid="save-preferences-btn"
                onClick={handleSavePreferences}
                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreFollowButton;
