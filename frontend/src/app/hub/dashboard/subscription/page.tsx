'use 'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Crown, Check, X, ArrowUp, ArrowDown, AlertCircle, Sparkles, CreditCard, Banknote, Truck } from 'lucide-react';

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

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [allPlans, setAllPlans] = useState<PlanLimits[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Payment modal state
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PlanLimits | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<'flouci' | 'konnect' | 'paypal' | 'manual_mandat' | 'cod'>('flouci');
  const [mandatProofUrl, setMandatProofUrl] = useState('');

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

  // Handle return from payment gateway redirect
  useEffect(() => {
    const successParam = searchParams.get('success');
    const intentIdParam = searchParams.get('intent_id');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Le paiement de votre abonnement a échoué ou a été annulé.');
    } else if (successParam === 'true' && intentIdParam) {
      async function settlePayment() {
        try {
          const res = await fetchWithCsrf('/api/pd/subscriptions/settle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ intent_id: intentIdParam }),
          });
          if (res.ok) {
            setSuccess('🎉 Paiement confirmé ! Votre nouvel abonnement est maintenant actif.');
            await fetchCurrentPlan();
          } else {
            setError(await getErrorMessage(res, 'Verification du paiement en cours...'));
          }
        } catch {
          setError('Erreur lors de la confirmation du paiement');
        }
      }
      settlePayment();
    }
  }, [searchParams, fetchCurrentPlan, getErrorMessage]);

  useEffect(() => {
    Promise.all([fetchCurrentPlan(), fetchAllPlans()]).finally(() => setLoading(false));
  }, [fetchAllPlans, fetchCurrentPlan]);

  const handleInitiatePayment = async () => {
    if (!selectedPlanForPayment) return;
    setError('');
    setSuccess('');
    setChanging(true);

    try {
      // Free plan -> immediate activation
      if (selectedPlanForPayment.yearly_price === 0 || selectedPlanForPayment.plan_id === 'free') {
        const res = await fetchWithCsrf('/api/pd/subscriptions/change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ plan: selectedPlanForPayment.plan_id }),
        });
        if (res.ok) {
          setSuccess('Plan Gratuit activé avec succès !');
          setSelectedPlanForPayment(null);
          await fetchCurrentPlan();
        } else {
          setError(await getErrorMessage(res, 'Erreur lors de l\'activation du plan'));
        }
        setChanging(false);
        return;
      }

      // Paid plan -> Initiate checkout flow with selected payment gateway
      const res = await fetchWithCsrf('/api/pd/subscriptions/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan: selectedPlanForPayment.plan_id,
          gateway: selectedGateway,
          proof_url: selectedGateway === 'manual_mandat' ? mandatProofUrl : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.free) {
          setSuccess('Abonnement activé !');
          setSelectedPlanForPayment(null);
          await fetchCurrentPlan();
        } else if (data.pending_review) {
          setSuccess('Votre reçu Mandat Minute a été transmis à l\'équipe d\'administration pour validation.');
          setSelectedPlanForPayment(null);
        } else if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          setError('Impossible d\'obtenir le lien de paiement');
        }
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de l\'initialisation du paiement'));
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
      <h1 className="text-2xl font-bold text-gray-900">Abonnement & Formules</h1>

      {/* Feedback */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm font-semibold rounded-xl">{success}</div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Current Plan Card */}
      {currentPlan && (
        <div className="bg-gradient-to-r from-[#B91C1C] to-[#991B1B] rounded-2xl p-6 text-white shadow-xl shadow-[#B91C1C]/15">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-6 h-6 text-yellow-300" />
            <h2 className="text-lg font-bold">Plan actuel de votre boutique</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-black text-[#B91C1C] shadow-sm">
              {PLAN_DISPLAY[currentPlan.plan]?.name || currentPlan.plan}
            </span>
            {currentPlan.expires_at && (
              <span className="text-sm font-medium opacity-90">
                Expire le {new Date(currentPlan.expires_at).toLocaleDateString('fr-TN')}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="opacity-75 text-xs font-bold uppercase tracking-wider">Produits</p>
              <p className="font-extrabold text-base">
                {currentPlan.limits.max_products === -1 ? 'Illimités' : currentPlan.limits.max_products}
              </p>
            </div>
            <div>
              <p className="opacity-75 text-xs font-bold uppercase tracking-wider">Images / Produit</p>
              <p className="font-extrabold text-base">{currentPlan.limits.max_images_per_product}</p>
            </div>
            <div>
              <p className="opacity-75 text-xs font-bold uppercase tracking-wider">Commission</p>
              <p className="font-extrabold text-base">{currentPlan.limits.commission_rate}%</p>
            </div>
            <div>
              <p className="opacity-75 text-xs font-bold uppercase tracking-wider">Pages Builder</p>
              <p className="font-extrabold text-base">
                {currentPlan.limits.max_page_builder_pages === -1 ? 'Illimitées' : currentPlan.limits.max_page_builder_pages}
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
              className={`bg-white rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-[#B91C1C] shadow-lg shadow-[#B91C1C]/10'
                  : isPro
                    ? 'border-[#B91C1C]/60 ring-2 ring-[#B91C1C]/10'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div>
                {isPro && !isCurrent && (
                  <div className="flex items-center gap-1 text-xs font-bold text-[#B91C1C] mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Populaire B2B
                  </div>
                )}
                {isCurrent && (
                  <div className="text-xs font-bold text-[#B91C1C] mb-2">✓ Plan actuel</div>
                )}

                <h3 className="font-bold text-gray-900 text-xl">{display.name}</h3>
                <p className="text-2xl font-extrabold text-gray-900 mt-1">
                  {plan.yearly_price === 0 ? 'Gratuit' : `${formatPrice(plan.yearly_price)}/an`}
                </p>

                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" />
                    <span>{plan.max_products === -1 ? 'Produits illimités' : `${plan.max_products} produits`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" />
                    <span>{plan.max_images_per_product} images / produit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" />
                    <span>{plan.commission_rate}% commission</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_custom_domain ? <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" /> : <X className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={!plan.has_custom_domain ? 'text-gray-400' : ''}>Domaine personnalisé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_page_builder ? <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" /> : <X className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={!plan.has_page_builder ? 'text-gray-400' : ''}>
                      {plan.has_page_builder ? (plan.max_page_builder_pages === -1 ? 'Pages builder illimitées' : `${plan.max_page_builder_pages} pages builder`) : 'Page Builder'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_ai_seo ? <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" /> : <X className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={!plan.has_ai_seo ? 'text-gray-400' : ''}>IA SEO & Optimisation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_direct_payment ? <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" /> : <X className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={!plan.has_direct_payment ? 'text-gray-400' : ''}>Paiement direct (Ses clefs API)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <button disabled className="w-full py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-sm cursor-not-allowed">
                    Plan actif
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedPlanForPayment(plan)}
                    className={`w-full py-3 font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow ${
                      isUpgrade(plan.plan_id)
                        ? 'bg-[#B91C1C] text-white hover:bg-[#991B1B]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isUpgrade(plan.plan_id) ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <ArrowUp className="w-4 h-4" /> Commander & Upgrader
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <ArrowDown className="w-4 h-4" /> Basculer vers ce plan
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Gateway Modal for Subscription Purchase */}
      {selectedPlanForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Souscrire au plan {PLAN_DISPLAY[selectedPlanForPayment.plan_id]?.name || selectedPlanForPayment.plan_id}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Montant : <span className="font-black text-gray-900">{selectedPlanForPayment.yearly_price === 0 ? 'Gratuit' : `${formatPrice(selectedPlanForPayment.yearly_price)} / an`}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanForPayment(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPlanForPayment.yearly_price === 0 || selectedPlanForPayment.plan_id === 'free' ? (
              <div className="py-4 text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Le plan Gratuit n&apos;exige aucun paiement. Votre boutique fonctionnera avec la formule de commission de base.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Choisir le mode de paiement</h4>
                
                <div className="space-y-2.5">
                  {[
                    { id: 'flouci', name: 'Flouci (Carte bancaire & Wallet)', icon: CreditCard, desc: 'Paiement instantané en TND par carte bancaire ou Flouci' },
                    { id: 'konnect', name: 'Konnect (Cartes bancaires)', icon: CreditCard, desc: 'Paiement sécurisé via le réseau Konnect' },
                    { id: 'paypal', name: 'PayPal (International Cards)', icon: CreditCard, desc: 'Paiement international sécurisé via PayPal' },
                    { id: 'manual_mandat', name: 'Mandat Minute / Virement', icon: Banknote, desc: 'Payer à la poste ou banque puis uploader le reçu' },
                    { id: 'cod', name: 'Paiement sur facture / COD', icon: Truck, desc: 'Activer sous réserve de confirmation commerciale' },
                  ].map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGateway(g.id as any)}
                      className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedGateway === g.id
                          ? 'border-[#B91C1C] bg-[#B91C1C]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <g.icon className={`w-5 h-5 mt-0.5 mr-3 ${selectedGateway === g.id ? 'text-[#B91C1C]' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-bold text-sm text-gray-900">{g.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{g.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedGateway === 'manual_mandat' && (
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-gray-700">Lien / URL du reçu de paiement Mandat</label>
                    <input
                      type="url"
                      value={mandatProofUrl}
                      onChange={(e) => setMandatProofUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#B91C1C]"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedPlanForPayment(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleInitiatePayment}
                disabled={changing}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-sm hover:bg-[#991B1B] disabled:opacity-50"
              >
                {changing ? 'Traitement...' : selectedPlanForPayment.yearly_price === 0 ? 'Activer le plan' : 'Payer & Activer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Chargement...</div>}>
      <SubscriptionContent />
    </Suspense>
  );
}
