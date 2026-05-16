'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { Crown, Check, X, ArrowUp, ArrowDown, AlertCircle, Sparkles } from 'lucide-react';

interface PlanLimits {
  plan_id: string;
  max_products: number;
  max_images_per_product: number;
  max_page_builder_pages: number;
  has_ai_seo: boolean;
  has_image_compression: boolean;
  has_custom_domain: boolean;
  has_page_builder: boolean;
  has_direct_payment: boolean;
  has_white_label: boolean;
  has_own_ai_provider: boolean;
  commission_rate: number;
  ai_tokens_included: number;
  yearly_price: number;
}

interface CurrentPlan {
  plan: string;
  type: string;
  expires_at: string | null;
  limits: PlanLimits;
}

function formatPrice(price: number): string {
  return `${price.toFixed(0)} TND`;
}

const PLAN_DISPLAY: Record<string, { name: string; color: string }> = {
  free: { name: 'Free', color: 'bg-gray-100 text-gray-700' },
  starter: { name: 'Starter', color: 'bg-blue-100 text-blue-700' },
  regular: { name: 'Regular', color: 'bg-indigo-100 text-indigo-700' },
  agency: { name: 'Agency', color: 'bg-purple-100 text-purple-700' },
  pro: { name: 'Pro', color: 'bg-[#B91C1C]/10 text-[#B91C1C]' },
  golden: { name: 'Golden', color: 'bg-yellow-100 text-yellow-700' },
  platinum: { name: 'Platinum', color: 'bg-gray-900 text-white' },
};

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [allPlans, setAllPlans] = useState<PlanLimits[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null);

  const getErrorMessage = useCallback(async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data.error?.message || data.message || `${fallback} (${res.status})`;
    } catch {
      return `${fallback} (${res.status})`;
    }
  }, []);

  const fetchCurrentPlan = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/current', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data);
      } else {
        setError(await getErrorMessage(res, 'Erreur lors du chargement du plan actuel'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  }, [getErrorMessage]);

  const fetchAllPlans = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/plans');
      if (res.ok) {
        const data = await res.json();
        setAllPlans(data.plans || []);
      } else {
        setError(await getErrorMessage(res, 'Erreur lors du chargement des plans'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  }, [getErrorMessage]);

  useEffect(() => {
    Promise.all([fetchCurrentPlan(), fetchAllPlans()]).finally(() => setLoading(false));
  }, [fetchAllPlans, fetchCurrentPlan]);

  const handleChangePlan = async (planId: string) => {
    setError('');
    setSuccess('');
    setChanging(true);
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        setSuccess('Plan mis à jour avec succès !');
        setConfirmPlan(null);
        await fetchCurrentPlan();
      } else {
        setError(await getErrorMessage(res, 'Erreur lors du changement de plan'));
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setChanging(false);
    }
  };

  const isUpgrade = (planId: string) => {
    if (!currentPlan) return false;
    const target = allPlans.find((plan) => plan.plan_id === planId);
    return Number(target?.yearly_price ?? 0) > Number(currentPlan.limits.yearly_price ?? 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-100 rounded w-1/2" />
                <div className="h-8 bg-gray-100 rounded w-3/4" />
                <div className="h-32 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>

      {/* Feedback */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Current Plan */}
      {currentPlan && (
        <div className="bg-gradient-to-r from-[#B91C1C] to-[#991B1B] rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-6 h-6" />
            <h2 className="text-lg font-bold">Plan actuel</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#B91C1C] shadow-sm ring-1 ring-white/40">
              {PLAN_DISPLAY[currentPlan.plan]?.name || currentPlan.plan}
            </span>
            {currentPlan.expires_at && (
              <span className="text-sm opacity-80">
                Expire le {new Date(currentPlan.expires_at).toLocaleDateString('fr-TN')}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="opacity-70">Produits</p>
              <p className="font-bold">
                {currentPlan.limits.max_products === -1
                  ? '∞'
                  : currentPlan.limits.max_products}
              </p>
            </div>
            <div>
              <p className="opacity-70">Images/produit</p>
              <p className="font-bold">{currentPlan.limits.max_images_per_product}</p>
            </div>
            <div>
              <p className="opacity-70">Commission</p>
              <p className="font-bold">{currentPlan.limits.commission_rate}%</p>
            </div>
            <div>
              <p className="opacity-70">Pages builder</p>
              <p className="font-bold">
                {currentPlan.limits.max_page_builder_pages === -1
                  ? '∞'
                  : currentPlan.limits.max_page_builder_pages}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allPlans.map((plan) => {
          const isCurrent = currentPlan?.plan === plan.plan_id;
          const display = PLAN_DISPLAY[plan.plan_id] || { name: plan.plan_id, color: 'bg-gray-100 text-gray-700' };
          const isPro = plan.plan_id === 'pro';

          return (
            <div
              key={plan.plan_id}
              className={`bg-white rounded-xl border-2 p-5 transition-all ${
                isCurrent
                  ? 'border-[#B91C1C] shadow-lg shadow-[#B91C1C]/10'
                  : isPro
                    ? 'border-[#B91C1C]/50'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {isPro && !isCurrent && (
                <div className="flex items-center gap-1 text-xs font-bold text-[#B91C1C] mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Populaire
                </div>
              )}
              {isCurrent && (
                <div className="text-xs font-bold text-[#B91C1C] mb-2">✓ Plan actuel</div>
              )}

              <h3 className="font-bold text-gray-900 text-lg">{display.name}</h3>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">
                {plan.yearly_price === 0 ? 'Gratuit' : `${formatPrice(plan.yearly_price)}/an`}
              </p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#B91C1C]" />
                  <span>
                    {plan.max_products === -1 ? 'Produits illimités' : `${plan.max_products} produits`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#B91C1C]" />
                  <span>{plan.max_images_per_product} images/produit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#B91C1C]" />
                  <span>{plan.commission_rate}% commission</span>
                </div>
                <div className="flex items-center gap-2">
                  {plan.has_custom_domain ? (
                    <Check className="w-4 h-4 text-[#B91C1C]" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300" />
                  )}
                  <span className={!plan.has_custom_domain ? 'text-gray-400' : ''}>
                    Domaine custom
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {plan.has_page_builder ? (
                    <Check className="w-4 h-4 text-[#B91C1C]" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300" />
                  )}
                  <span className={!plan.has_page_builder ? 'text-gray-400' : ''}>
                    {plan.has_page_builder
                      ? plan.max_page_builder_pages === -1 ? 'Pages builder illimitées' : `${plan.max_page_builder_pages} pages builder`
                      : 'Page Builder'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {plan.has_ai_seo ? (
                    <Check className="w-4 h-4 text-[#B91C1C]" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300" />
                  )}
                  <span className={!plan.has_ai_seo ? 'text-gray-400' : ''}>IA SEO</span>
                </div>
                <div className="flex items-center gap-2">
                  {plan.has_direct_payment ? (
                    <Check className="w-4 h-4 text-[#B91C1C]" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300" />
                  )}
                  <span className={!plan.has_direct_payment ? 'text-gray-400' : ''}>
                    Paiement direct
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {plan.has_white_label ? (
                    <Check className="w-4 h-4 text-[#B91C1C]" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300" />
                  )}
                  <span className={!plan.has_white_label ? 'text-gray-400' : ''}>
                    White Label
                  </span>
                </div>
              </div>

              <div className="mt-5">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-gray-100 text-gray-500 font-medium rounded-lg text-sm cursor-not-allowed"
                  >
                    Plan actuel
                  </button>
                ) : confirmPlan === plan.plan_id ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 text-center">
                      {isUpgrade(plan.plan_id) ? 'Confirmer l\'upgrade ?' : 'Confirmer le downgrade ?'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleChangePlan(plan.plan_id)}
                        disabled={changing}
                        className="flex-1 py-2 bg-[#B91C1C] text-white font-medium rounded-lg text-sm hover:bg-[#991B1B] disabled:opacity-50"
                      >
                        {changing ? '...' : 'Oui'}
                      </button>
                      <button
                        onClick={() => setConfirmPlan(null)}
                        className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-200"
                      >
                        Non
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmPlan(plan.plan_id)}
                    className={`w-full py-2.5 font-medium rounded-lg text-sm transition-colors ${
                      isUpgrade(plan.plan_id)
                        ? 'bg-[#B91C1C] text-white hover:bg-[#991B1B]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isUpgrade(plan.plan_id) ? (
                      <span className="flex items-center justify-center gap-1">
                        <ArrowUp className="w-4 h-4" /> Upgrade
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <ArrowDown className="w-4 h-4" /> Downgrade
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
