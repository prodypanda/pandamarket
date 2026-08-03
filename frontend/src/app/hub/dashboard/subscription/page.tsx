'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState, Suspense, ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
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

function SubscriptionContent() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const localeCode = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const planName = useCallback(
    (planId: string) => {
      const key = `subscription.plans.${planId}`;
      const translated = t(key);
      return translated === key ? planId : translated;
    },
    [t]
  );
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
        setError(await getErrorMessage(res, t('dashboardPages.subscription.errorLoadingCurrent')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.subscription.errorNetwork'));
    }
  }, [getErrorMessage, t]);

  const fetchAllPlans = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/plans');
      if (res.ok) {
        const data = await res.json();
        setAllPlans(data.plans || []);
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.subscription.errorLoadingPlans')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.subscription.errorNetwork'));
    }
  }, [getErrorMessage, t]);

  // Handle return from payment gateway redirect
  useEffect(() => {
    const successParam = searchParams.get('success');
    const intentIdParam = searchParams.get('intent_id');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(t('dashboardPages.subscription.paymentFailedOrCancelled'));
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
            setSuccess(t('dashboardPages.subscription.paymentConfirmed'));
            await fetchCurrentPlan();
          } else {
            setError(await getErrorMessage(res, t('dashboardPages.subscription.verifyingPayment')));
          }
        } catch {
          setError(t('dashboardPages.subscription.errorConfirmingPayment'));
        }
      }
      settlePayment();
    }
  }, [searchParams, fetchCurrentPlan, getErrorMessage, t]);

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
      throw new Error(errData.error?.message || t('dashboardPages.subscription.errorPreparingUpload'));
    }
    const presignData = await presignRes.json();
    const uploadRes = await fetch(presignData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(t('dashboardPages.subscription.errorUploadingProof'));
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
          setSuccess(t('dashboardPages.subscription.freePlanActivated'));
          setSelectedPlanForPayment(null);
          await fetchCurrentPlan();
        } else {
          setError(await getErrorMessage(res, t('dashboardPages.subscription.errorActivatingPlan')));
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
          setSuccess(t('dashboardPages.subscription.subscriptionActivated'));
          setSelectedPlanForPayment(null);
          await fetchCurrentPlan();
        } else if (data.pending_review || data.pending_proof) {
          setSuccess(
            data.pending_review
              ? t('dashboardPages.subscription.orderRecordedReview')
              : t('dashboardPages.subscription.orderRecordedProof')
          );
          setSelectedPlanForPayment(null);
          setProofFile(null);
          setMandatProofUrl('');
          await fetchCurrentPlan();
        } else if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          setError(t('dashboardPages.subscription.errorNoCheckoutUrl'));
        }
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.subscription.errorInitiatingPayment')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.subscription.errorNetwork'));
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
        setError(t('dashboardPages.subscription.errorNoFileOrUrl'));
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
        setSuccess(t('dashboardPages.subscription.proofSubmitted'));
        setUploadModalIntent(null);
        setProofFile(null);
        setMandatProofUrl('');
        await fetchCurrentPlan();
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.subscription.errorSubmittingProof')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.subscription.errorNetwork'));
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
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboardPages.subscription.title')}</h1>
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
    if (!confirm(t('dashboardPages.subscription.confirmCancelIntent'))) return;
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
        setSuccess(t('dashboardPages.subscription.intentCancelled'));
        await fetchCurrentPlan();
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.subscription.errorCancellingIntent')));
      }
    } catch {
      setError(t('dashboardPages.subscription.errorNetwork'));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboardPages.subscription.heading')}</h1>

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
              <h3 className="font-bold text-amber-900 text-base">{t('dashboardPages.subscription.pendingOrderTitle')}</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {t('dashboardPages.subscription.pendingOrderDesc', { count: pendingIntents.length })}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {pendingIntents.map((intent) => (
              <div key={intent.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-xl border border-amber-200 gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900">{t('dashboardPages.subscription.planLabel')}: {intent.target_plan.toUpperCase()}</span>
                  <span className="text-slate-500 mx-2">•</span>
                  <span className="font-black text-[#B91C1C]">{Number(intent.amount).toFixed(0)} TND</span>
                  <span className="text-slate-500 mx-2">•</span>
                  <span className="text-slate-600">{t('dashboardPages.subscription.statusLabel')}: {intent.status === 'pending_review' ? t('dashboardPages.subscription.statusPendingReview') : t('dashboardPages.subscription.statusPendingProof')}</span>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleCancelIntent(intent.id)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100"
                  >
                    {t('dashboardPages.subscription.cancelOrder')}
                  </button>
                  <button
                    onClick={() => setUploadModalIntent(intent)}
                    className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 flex items-center gap-1 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> {t('dashboardPages.subscription.submitReceipt')}
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
            <h2 className="text-lg font-bold">{t('dashboardPages.subscription.currentPlanTitle')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-black text-[#B91C1C] shadow-sm">
              {planName(currentPlan.plan)}
            </span>
            {currentPlan.expires_at && (
              <span className="text-sm font-medium opacity-90">
                {t('subscription.expiresOn', { date: new Date(currentPlan.expires_at).toLocaleDateString(localeCode) })}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="opacity-75 text-xs font-bold uppercase tracking-wider">{t('dashboardPages.subscription.productsLabel')}</p>
              <p className="font-extrabold text-base">
                {currentPlan.limits.max_products === -1 ? t('subscription.features.productsUnlimited') : currentPlan.limits.max_products}
              </p>
            </div>
            <div>
              <p className="opacity-75 text-xs font-bold uppercase tracking-wider">{t('dashboardPages.subscription.imagesPerProductLabel')}</p>
              <p className="font-extrabold text-base">{currentPlan.limits.max_images_per_product}</p>
            </div>
            <div>
              <p className="opacity-75 text-xs font-bold uppercase tracking-wider">{t('dashboardPages.subscription.commissionLabel')}</p>
              <p className="font-extrabold text-base">{currentPlan.limits.commission_rate}%</p>
            </div>
            <div>
              <p className="opacity-75 text-xs font-bold uppercase tracking-wider">{t('dashboardPages.subscription.pageBuilderLabel')}</p>
              <p className="font-extrabold text-base">
                {currentPlan.limits.max_page_builder_pages === -1 ? t('dashboardPages.subscription.unlimitedPages') : currentPlan.limits.max_page_builder_pages}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allPlans.map((plan) => {
          const isCurrent = currentPlan?.plan === plan.plan_id;
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
                    {t('dashboardPages.subscription.popularB2B')}
                  </div>
                )}
                {isCurrent && (
                  <div className="text-xs font-bold text-[#B91C1C] mb-2">{t('dashboardPages.subscription.currentPlanBadge')}</div>
                )}

                <h3 className="font-bold text-gray-900 text-xl">{planName(plan.plan_id)}</h3>
                <p className="text-2xl font-extrabold text-gray-900 mt-1">
                  {plan.yearly_price === 0 ? t('subscription.plans.free') : `${formatPrice(plan.yearly_price)}/${t('dashboardPages.subscription.perYear')}`}
                </p>

                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" />
                    <span>{plan.max_products === -1 ? t('subscription.features.productsUnlimited') : t('subscription.features.products', { count: plan.max_products })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" />
                    <span>{t('subscription.features.images', { count: plan.max_images_per_product })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" />
                    <span>{t('subscription.features.commission', { rate: plan.commission_rate })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_custom_domain ? <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" /> : <X className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={!plan.has_custom_domain ? 'text-gray-400' : ''}>{t('subscription.features.customDomain')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_page_builder ? <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" /> : <X className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={!plan.has_page_builder ? 'text-gray-400' : ''}>
                      {plan.has_page_builder ? (plan.max_page_builder_pages === -1 ? t('dashboardPages.subscription.unlimitedPages') : t('dashboardPages.subscription.pageBuilderPages', { count: plan.max_page_builder_pages })) : t('subscription.features.pageBuilder')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_ai_seo ? <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" /> : <X className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={!plan.has_ai_seo ? 'text-gray-400' : ''}>{t('dashboardPages.subscription.aiSeo')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_direct_payment ? <Check className="w-4 h-4 text-[#B91C1C] flex-shrink-0" /> : <X className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={!plan.has_direct_payment ? 'text-gray-400' : ''}>{t('subscription.features.directPayment')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <button disabled className="w-full py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-sm cursor-not-allowed">
                    {t('dashboardPages.subscription.planActive')}
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
                        <ArrowUp className="w-4 h-4" /> {t('dashboardPages.subscription.orderAndUpgrade')}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <ArrowDown className="w-4 h-4" /> {t('dashboardPages.subscription.switchToPlan')}
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
                  {t('dashboardPages.subscription.subscribeToPlan', { plan: planName(selectedPlanForPayment.plan_id) })}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('dashboardPages.subscription.amountLabel')}: <span className="font-black text-gray-900">{selectedPlanForPayment.yearly_price === 0 ? t('subscription.plans.free') : `${formatPrice(selectedPlanForPayment.yearly_price)} / ${t('dashboardPages.subscription.perYear')}`}</span>
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
                  {t('dashboardPages.subscription.freePlanNoPayment')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">{t('dashboardPages.subscription.choosePaymentMethod')}</h4>
                
                <div className="space-y-2.5">
                  {[
                    { id: 'flouci', icon: CreditCard },
                    { id: 'konnect', icon: CreditCard },
                    { id: 'paypal', icon: CreditCard },
                    { id: 'manual_mandat', icon: Banknote },
                    { id: 'cod', icon: Truck },
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
                        <p className="font-bold text-sm text-gray-900">{t(`dashboardPages.subscription.gateway.${g.id}.name`)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t(`dashboardPages.subscription.gateway.${g.id}.desc`)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mandat Minute Instructions & File Upload */}
                {selectedGateway === 'manual_mandat' && (
                  <div className="space-y-4 pt-2 rounded-2xl bg-amber-50/60 p-4 border border-amber-200">
                    <div className="space-y-1 text-xs text-amber-900">
                      <p className="font-bold text-amber-950 flex items-center gap-1">
                        <Building className="w-4 h-4 text-amber-700" /> {t('dashboardPages.subscription.mandatInstructionsTitle')}
                      </p>
                      <p>• {t('dashboardPages.subscription.mandatBeneficiary')}: <strong>PandaMarket SARL</strong></p>
                      <p>• {t('dashboardPages.subscription.mandatIdLabel')}: <strong>01234567</strong> ({t('dashboardPages.subscription.mandatCity')})</p>
                      <p>• {t('dashboardPages.subscription.mandatRibLabel')}: <strong>10 000 0000000000000 00</strong></p>
                      <p>• {t('dashboardPages.subscription.mandatEmailLabel')}: <strong className="underline text-amber-950">billing@pandamarket.tn</strong></p>
                    </div>

                    <div className="space-y-2 border-t border-amber-200 pt-3">
                      <label className="block text-xs font-bold text-slate-800">
                        {t('dashboardPages.subscription.uploadReceiptOptional')}
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#B91C1C] file:text-white hover:file:bg-[#991B1B] cursor-pointer"
                      />
                      {proofFile && (
                        <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t('dashboardPages.subscription.fileSelected', { name: proofFile.name })}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500">
                        {t('dashboardPages.subscription.submitLaterHint')}
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
                {t('dashboardPages.common.cancel')}
              </button>
              <button
                onClick={handleInitiatePayment}
                disabled={changing || uploading}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-sm hover:bg-[#991B1B] disabled:opacity-50"
              >
                {uploading ? t('dashboardPages.subscription.uploadingReceipt') : changing ? t('dashboardPages.subscription.processing') : selectedPlanForPayment.yearly_price === 0 ? t('dashboardPages.subscription.activatePlan') : selectedGateway === 'manual_mandat' ? t('dashboardPages.subscription.placeMandatOrder') : t('dashboardPages.subscription.payAndActivate')}
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
                  {t('dashboardPages.subscription.submitPaymentReceipt')}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('dashboardPages.subscription.orderWithPlan', { ref: uploadModalIntent.id.slice(-8), plan: uploadModalIntent.target_plan.toUpperCase() })}
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
                <p className="font-bold">{t('dashboardPages.subscription.emailAvailable')}</p>
                <p>{t('dashboardPages.subscription.emailProofHint', { ref: uploadModalIntent.id.slice(-8) })}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">{t('dashboardPages.subscription.uploadReceiptStep1')}</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#B91C1C] file:text-white hover:file:bg-[#991B1B] cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">{t('dashboardPages.subscription.orUrlStep2')}</label>
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
                {t('dashboardPages.common.cancel')}
              </button>
              <button
                onClick={handleUploadProofForPendingIntent}
                disabled={changing || uploading}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-xs hover:bg-[#991B1B] disabled:opacity-50"
              >
                {uploading ? t('dashboardPages.subscription.uploading') : changing ? t('dashboardPages.subscription.sending') : t('dashboardPages.subscription.submitReceipt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const { t } = useLocale();
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">{t('dashboardPages.common.loading')}</div>}>
      <SubscriptionContent />
    </Suspense>
  );
}
