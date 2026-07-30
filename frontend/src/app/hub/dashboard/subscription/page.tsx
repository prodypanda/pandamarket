'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState, Suspense, ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Crown,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Sparkles,
  CreditCard,
  Banknote,
  Truck,
  Upload,
  FileText,
  Mail,
  Building,
  CheckCircle2,
  Clock,
} from 'lucide-react';

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

interface PendingIntent {
  id: string;
  target_plan: string;
  amount: string | number;
  gateway: string;
  status: string;
  proof_url?: string;
  created_at: string;
  metadata?: any;
}

interface CurrentPlan {
  plan: string;
  type: string;
  expires_at: string | null;
  limits: PlanLimits;
  pending_intents?: PendingIntent[];
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
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload proof modal state for pending order
  const [uploadModalIntent, setUploadModalIntent] = useState<PendingIntent | null>(null);

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
            setError(await getErrorMessage(res, 'Vérification du paiement en cours...'));
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

  const handleFileUpload = async (file: File): Promise<string> => {
    const contentType = file.type || 'image/jpeg';
    const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        filename: file.name,
        content_type: contentType,
        purpose: 'mandat_proof',
        file_size: file.size,
      }),
    });
    if (!presignRes.ok) {
      const errData = await presignRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Échec de la préparation du téléversement du justificatif');
    }
    const presignData = await presignRes.json();
    const uploadRes = await fetch(presignData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!uploadRes.ok) throw new Error('Échec de la transmission du justificatif sur le serveur');
    return presignData.public_url || presignData.file_key;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
    }
  };

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

      let finalProofUrl = mandatProofUrl;
      if (selectedGateway === 'manual_mandat' && proofFile) {
        setUploading(true);
        finalProofUrl = await handleFileUpload(proofFile);
        setUploading(false);
      }

      // Paid plan -> Initiate checkout flow with selected payment gateway
      const res = await fetchWithCsrf('/api/pd/subscriptions/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan: selectedPlanForPayment.plan_id,
          gateway: selectedGateway,
          proof_url: finalProofUrl || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.free) {
          setSuccess('Abonnement activé !');
          setSelectedPlanForPayment(null);
          await fetchCurrentPlan();
        } else if (data.pending_review || data.pending_proof) {
          setSuccess(
            data.pending_review
              ? '🎉 Commande d\'abonnement enregistrée et reçu de paiement transmis ! Notre équipe d\'administration va la valider sous peu.'
              : '📌 Commande d\'abonnement enregistrée ! Vous pouvez effectuer le virement puis transmettre le reçu par email (billing@pandamarket.tn) ou via cette page.'
          );
          setSelectedPlanForPayment(null);
          setProofFile(null);
          setMandatProofUrl('');
          await fetchCurrentPlan();
        } else if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          setError('Impossible d\'obtenir le lien de paiement');
        }
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de l\'initialisation du paiement'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setChanging(false);
      setUploading(false);
    }
  };

  const handleUploadProofForPendingIntent = async () => {
    if (!uploadModalIntent) return;
    setError('');
    setSuccess('');
    setChanging(true);

    try {
      let finalUrl = mandatProofUrl;
      if (proofFile) {
        setUploading(true);
        finalUrl = await handleFileUpload(proofFile);
        setUploading(false);
      }

      if (!finalUrl) {
        setError('Veuillez sélectionner un fichier ou indiquer un lien.');
        setChanging(false);
        return;
      }

      const res = await fetchWithCsrf('/api/pd/subscriptions/upload-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          intent_id: uploadModalIntent.id,
          proof_url: finalUrl,
        }),
      });

      if (res.ok) {
        setSuccess('🎉 Reçu de paiement transmis avec succès ! En attente de validation administrative.');
        setUploadModalIntent(null);
        setProofFile(null);
        setMandatProofUrl('');
        await fetchCurrentPlan();
      } else {
        setError(await getErrorMessage(res, 'Échec de la transmission du reçu'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setChanging(false);
      setUploading(false);
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

  const pendingIntents = currentPlan?.pending_intents || [];

  const handleCancelIntent = async (intentId: string) => {
    if (!confirm('Voulez-vous vraiment annuler cette commande d\'abonnement non payée ?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intent_id: intentId }),
      });
      if (res.ok) {
        setSuccess('Commande d\'abonnement annulée avec succès.');
        await fetchCurrentPlan();
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de l\'annulation de la commande'));
      }
    } catch {
      setError('Erreur réseau');
    }
  };

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

      {/* Pending Mandat Order Notification Banner */}
      {pendingIntents.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900 text-base">Commande d&apos;abonnement en attente de paiement</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Vous avez {pendingIntents.length} commande(s) d&apos;abonnement enregistrée(s). Vous pouvez transmettre le reçu de virement ou annuler la commande à tout moment.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {pendingIntents.map((intent) => (
              <div key={intent.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-xl border border-amber-200 gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900">Plan : {intent.target_plan.toUpperCase()}</span>
                  <span className="text-slate-500 mx-2">•</span>
                  <span className="font-black text-[#B91C1C]">{Number(intent.amount).toFixed(0)} TND</span>
                  <span className="text-slate-500 mx-2">•</span>
                  <span className="text-slate-600">Statut : {intent.status === 'pending_review' ? '📑 En attente de validation' : '📌 En attente du reçu'}</span>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleCancelIntent(intent.id)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100"
                  >
                    Annuler la commande
                  </button>
                  <button
                    onClick={() => setUploadModalIntent(intent)}
                    className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 flex items-center gap-1 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> Transmettre le Reçu
                  </button>
                </div>
              </div>
            ))}
          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
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
                    { id: 'manual_mandat', name: 'Mandat Minute / Virement Bancaire', icon: Banknote, desc: 'Effectuer le virement puis transmettre le reçu (Upload ou Email)' },
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

                {/* Mandat Minute Instructions & File Upload */}
                {selectedGateway === 'manual_mandat' && (
                  <div className="space-y-4 pt-2 rounded-2xl bg-amber-50/60 p-4 border border-amber-200">
                    <div className="space-y-1 text-xs text-amber-900">
                      <p className="font-bold text-amber-950 flex items-center gap-1">
                        <Building className="w-4 h-4 text-amber-700" /> Instructions pour le virement / Mandat Minute :
                      </p>
                      <p>• Bénéficiaire : <strong>PandaMarket SARL</strong></p>
                      <p>• Identifiant / CIN : <strong>01234567</strong> (Tunis)</p>
                      <p>• RIB Bancaire (STB) : <strong>10 000 0000000000000 00</strong></p>
                      <p>• Email d&apos;envoi du reçu : <strong className="underline text-amber-950">billing@pandamarket.tn</strong></p>
                    </div>

                    <div className="space-y-2 border-t border-amber-200 pt-3">
                      <label className="block text-xs font-bold text-slate-800">
                        📁 Téléverser le reçu / Relevé de paiement (Optionnel lors de la commande)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#B91C1C] file:text-white hover:file:bg-[#991B1B] cursor-pointer"
                      />
                      {proofFile && (
                        <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fichier sélectionné : {proofFile.name}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500">
                        Vous pouvez soumettre la commande dès maintenant et transmettre votre reçu ultérieurement sur cette page ou par email.
                      </p>
                    </div>
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
                disabled={changing || uploading}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-sm hover:bg-[#991B1B] disabled:opacity-50"
              >
                {uploading ? 'Téléversement du reçu...' : changing ? 'Traitement...' : selectedPlanForPayment.yearly_price === 0 ? 'Activer le plan' : selectedGateway === 'manual_mandat' ? 'Passer la commande Mandat' : 'Payer & Activer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Upload Proof for Existing Pending Order */}
      {uploadModalIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Transmettre le reçu de paiement
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Commande #{uploadModalIntent.id.slice(-8)} — Plan {uploadModalIntent.target_plan.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setUploadModalIntent(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <p className="font-bold">📩 Envoi par Email disponible :</p>
                <p>Vous pouvez également envoyer votre preuve de virement à <strong className="underline">billing@pandamarket.tn</strong> en précisant la référence <strong>#{uploadModalIntent.id.slice(-8)}</strong>.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">1. Téléverser l&apos;image / PDF du reçu</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#B91C1C] file:text-white hover:file:bg-[#991B1B] cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">OU 2. Lien / URL du justificatif</label>
                <input
                  type="url"
                  value={mandatProofUrl}
                  onChange={(e) => setMandatProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#B91C1C]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setUploadModalIntent(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleUploadProofForPendingIntent}
                disabled={changing || uploading}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-xs hover:bg-[#991B1B] disabled:opacity-50"
              >
                {uploading ? 'Téléversement...' : changing ? 'Envoi...' : 'Soumettre le Reçu'}
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
