'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState, Suspense, ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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

interface MandatInstructions {
  recipient_name?: string;
  recipient_cin?: string;
  recipient_city?: string;
  bank_name?: string;
  bank_rib?: string;
  bank_iban?: string;
  recipient_phone?: string;
  proof_email?: string;
}

function formatPrice(price: number): string {
  return `${price.toFixed(0)} TND`;
}

function SubscriptionContent() {
  const { t, locale, dir } = useLocale();
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
  const [cancelIntentTargetId, setCancelIntentTargetId] = useState<string | null>(null);
  const [cancellingIntent, setCancellingIntent] = useState(false);

  // Payment modal state
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PlanLimits | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<'flouci' | 'konnect' | 'paypal' | 'manual_mandat' | 'cod'>('flouci');
  const [mandatProofUrl, setMandatProofUrl] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mandatInfo, setMandatInfo] = useState<MandatInstructions | null>(null);

  // Load Mandat Minute recipient instructions from platform settings once
  useEffect(() => {
    let cancelled = false;
    fetchWithCsrf('/api/pd/subscriptions/mandat-instructions', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setMandatInfo(json?.data ?? null);
      })
      .catch(() => {
        // Leave null
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/plans', { credentials: 'include' });
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

  useEffect(() => {
    Promise.all([fetchCurrentPlan(), fetchPlans()]).finally(() => setLoading(false));
  }, [fetchCurrentPlan, fetchPlans]);

  // Check query params for payment callbacks
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const paymentOrderId = searchParams.get('order_id');

    if (paymentStatus === 'success') {
      setSuccess(t('dashboardPages.subscription.paymentSuccess', { orderId: paymentOrderId || '' }));
      fetchCurrentPlan();
    } else if (paymentStatus === 'cancelled') {
      setError(t('dashboardPages.subscription.paymentCancelled'));
    } else if (paymentStatus === 'failed') {
      setError(t('dashboardPages.subscription.paymentFailed'));
    }
  }, [searchParams, fetchCurrentPlan, t]);

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
      let finalProofUrl = mandatProofUrl;
      if (selectedGateway === 'manual_mandat' && proofFile) {
        setUploading(true);
        finalProofUrl = await handleFileUpload(proofFile);
        setUploading(false);
      }

      const res = await fetchWithCsrf('/api/pd/subscriptions/change', {
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
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
          return;
        }

        if (selectedGateway === 'manual_mandat') {
          setSuccess(t('dashboardPages.subscription.mandatSuccessMsg'));
        } else {
          setSuccess(t('dashboardPages.subscription.planChangedSuccess', { plan: planName(selectedPlanForPayment.plan_id) }));
        }

        setSelectedPlanForPayment(null);
        setMandatProofUrl('');
        setProofFile(null);
        await fetchCurrentPlan();
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
      <div dir={dir} className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.subscription.title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pendingIntents = currentPlan?.pending_intents || [];

  const handleCancelIntent = (intentId: string) => {
    setCancelIntentTargetId(intentId);
  };

  const confirmCancelIntent = async () => {
    if (!cancelIntentTargetId) return;
    setCancellingIntent(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intent_id: cancelIntentTargetId }),
      });
      if (res.ok) {
        setSuccess(t('dashboardPages.subscription.intentCancelled'));
        setCancelIntentTargetId(null);
        await fetchCurrentPlan();
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.subscription.errorCancellingIntent')));
      }
    } catch {
      setError(t('dashboardPages.subscription.errorNetwork'));
    } finally {
      setCancellingIntent(false);
    }
  };

  return (
    <div dir={dir} className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.subscription.heading')}</h1>

      {/* Feedback */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-sm font-semibold rounded-xl">{success}</div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm font-medium rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Pending Mandat Order Notification Banner */}
      {pendingIntents.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-base">{t('dashboardPages.subscription.pendingOrderTitle')}</h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                {t('dashboardPages.subscription.pendingOrderDesc', { count: pendingIntents.length })}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {pendingIntents.map((intent) => (
              <div key={intent.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">{t('dashboardPages.subscription.planLabel')}: {intent.target_plan.toUpperCase()}</span>
                  <span className="text-slate-400 dark:text-slate-500 mx-2">•</span>
                  <span className="font-bold text-slate-900 dark:text-white">{Number(intent.amount).toFixed(0)} TND</span>
                  <span className="text-slate-400 dark:text-slate-500 mx-2">•</span>
                  <span className="text-slate-600 dark:text-slate-300">{t('dashboardPages.subscription.statusLabel')}: {intent.status === 'pending_review' ? t('dashboardPages.subscription.statusPendingReview') : t('dashboardPages.subscription.statusPendingProof')}</span>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleCancelIntent(intent.id)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    {t('dashboardPages.subscription.cancelOrder')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadModalIntent(intent)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-semibold rounded-xl text-xs flex items-center gap-1 shadow-2xs transition"
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
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.subscription.currentPlanTitle')}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-4 py-1.5 text-sm font-bold text-slate-900 dark:text-white">
              {planName(currentPlan.plan)}
            </span>
            {currentPlan.expires_at && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('subscription.expiresOn', { date: new Date(currentPlan.expires_at).toLocaleDateString(localeCode) })}
              </span>
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('dashboardPages.subscription.productsLabel')}</p>
              <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">
                {currentPlan.limits.max_products === -1 ? t('subscription.features.productsUnlimited') : currentPlan.limits.max_products}
              </p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('dashboardPages.subscription.imagesPerProductLabel')}</p>
              <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{currentPlan.limits.max_images_per_product}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('dashboardPages.subscription.commissionLabel')}</p>
              <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{currentPlan.limits.commission_rate}%</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('dashboardPages.subscription.pageBuilderLabel')}</p>
              <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">
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
              className={`rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-slate-900 dark:border-white bg-white dark:bg-slate-900 shadow-md'
                  : isPro
                    ? 'border-slate-400/60 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-2xs'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                {isPro && !isCurrent && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('dashboardPages.subscription.popularB2B')}
                  </div>
                )}
                {isCurrent && (
                  <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2">{t('dashboardPages.subscription.currentPlanBadge')}</div>
                )}

                <h3 className="font-bold text-slate-900 dark:text-white text-xl">{planName(plan.plan_id)}</h3>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {plan.yearly_price === 0 ? t('subscription.plans.free') : `${formatPrice(plan.yearly_price)}/${t('dashboardPages.subscription.perYear')}`}
                </p>

                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{plan.max_products === -1 ? t('subscription.features.productsUnlimited') : t('subscription.features.products', { count: plan.max_products })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{t('subscription.features.images', { count: plan.max_images_per_product })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{t('subscription.features.commission', { rate: plan.commission_rate })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_custom_domain ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> : <X className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                    <span className={!plan.has_custom_domain ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}>{t('subscription.features.customDomain')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_page_builder ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> : <X className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                    <span className={!plan.has_page_builder ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}>
                      {plan.has_page_builder ? (plan.max_page_builder_pages === -1 ? t('dashboardPages.subscription.unlimitedPages') : t('dashboardPages.subscription.pageBuilderPages', { count: plan.max_page_builder_pages })) : t('subscription.features.pageBuilder')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_ai_seo ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> : <X className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                    <span className={!plan.has_ai_seo ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}>{t('dashboardPages.subscription.aiSeo')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.has_direct_payment ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> : <X className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                    <span className={!plan.has_direct_payment ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}>{t('subscription.features.directPayment')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <button type="button" disabled className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold rounded-xl text-sm cursor-not-allowed">
                    {t('dashboardPages.subscription.planActive')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedPlanForPayment(plan)}
                    className={`w-full py-2.5 font-semibold rounded-xl text-sm transition shadow-2xs ${
                      isUpgrade(plan.plan_id)
                        ? 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('dashboardPages.subscription.subscribeToPlan', { plan: planName(selectedPlanForPayment.plan_id) })}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t('dashboardPages.subscription.amountLabel')}: <span className="font-bold text-slate-900 dark:text-white">{selectedPlanForPayment.yearly_price === 0 ? t('subscription.plans.free') : `${formatPrice(selectedPlanForPayment.yearly_price)} / ${t('dashboardPages.subscription.perYear')}`}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForPayment(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPlanForPayment.yearly_price === 0 || selectedPlanForPayment.plan_id === 'free' ? (
              <div className="py-4 text-center space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t('dashboardPages.subscription.freePlanNoPayment')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('dashboardPages.subscription.choosePaymentMethod')}</h4>
                
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
                      className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition ${
                        selectedGateway === g.id
                          ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <g.icon className={`w-5 h-5 mt-0.5 mr-3 ${selectedGateway === g.id ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{t(`dashboardPages.subscription.gateway.${g.id}.name`)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t(`dashboardPages.subscription.gateway.${g.id}.desc`)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mandat Minute Instructions & File Upload */}
                {selectedGateway === 'manual_mandat' && (
                  <div className="space-y-4 pt-2 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 p-4 border border-amber-200/80 dark:border-amber-900/50">
                    <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                      <p className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1">
                        <Building className="w-4 h-4 text-amber-700 dark:text-amber-400" /> {t('dashboardPages.subscription.mandatInstructionsTitle')}
                      </p>
                      <p>• {t('dashboardPages.subscription.mandatBeneficiary')}: <strong>{mandatInfo?.recipient_name || '—'}</strong></p>
                      <p>• {t('dashboardPages.subscription.mandatIdLabel')}: <strong>{mandatInfo?.recipient_cin || '—'}</strong>{mandatInfo?.recipient_city ? ` (${mandatInfo.recipient_city})` : ''}</p>
                      <p>• {t('dashboardPages.subscription.mandatRibLabel')}: <strong>{mandatInfo?.bank_rib || '—'}</strong></p>
                      <p>• {t('dashboardPages.subscription.mandatEmailLabel')}: <strong className="underline text-amber-950 dark:text-amber-100">{mandatInfo?.proof_email || '—'}</strong></p>
                    </div>

                    <div className="space-y-2 border-t border-amber-200/80 dark:border-amber-900/50 pt-3">
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {t('dashboardPages.subscription.uploadReceiptOptional')}
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 dark:file:bg-white file:text-white dark:file:text-slate-900 hover:file:bg-slate-800 dark:hover:file:bg-slate-100 cursor-pointer transition"
                      />
                      {proofFile && (
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t('dashboardPages.subscription.fileSelected', { name: proofFile.name })}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('dashboardPages.subscription.submitLaterHint')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanForPayment(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {t('dashboardPages.common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={changing || uploading}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl text-sm shadow-2xs transition disabled:opacity-50"
              >
                {uploading ? t('dashboardPages.subscription.uploadingReceipt') : changing ? t('dashboardPages.subscription.processing') : selectedPlanForPayment.yearly_price === 0 ? t('dashboardPages.subscription.activatePlan') : selectedGateway === 'manual_mandat' ? t('dashboardPages.subscription.placeMandatOrder') : t('dashboardPages.subscription.payAndActivate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Upload Proof for Existing Pending Order */}
      {uploadModalIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('dashboardPages.subscription.submitPaymentReceipt')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('dashboardPages.subscription.orderWithPlan', { ref: uploadModalIntent.id.slice(-8), plan: uploadModalIntent.target_plan.toUpperCase() })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalIntent(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-bold">{t('dashboardPages.subscription.emailAvailable')}</p>
                <p>{t('dashboardPages.subscription.emailProofHint', { ref: uploadModalIntent.id.slice(-8) })}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">{t('dashboardPages.subscription.uploadReceiptStep1')}</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 dark:file:bg-white file:text-white dark:file:text-slate-900 hover:file:bg-slate-800 dark:hover:file:bg-slate-100 cursor-pointer transition"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">{t('dashboardPages.subscription.orUrlStep2')}</label>
                <input
                  type="url"
                  value={mandatProofUrl}
                  onChange={(e) => setMandatProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUploadModalIntent(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {t('dashboardPages.common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleUploadProofForPendingIntent}
                disabled={changing || uploading}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl text-xs shadow-2xs transition disabled:opacity-50"
              >
                {uploading ? t('dashboardPages.subscription.uploading') : changing ? t('dashboardPages.subscription.sending') : t('dashboardPages.subscription.submitReceipt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelIntentTargetId && (
        <ConfirmDialog
          isOpen={!!cancelIntentTargetId}
          onClose={() => {
            if (!cancellingIntent) setCancelIntentTargetId(null);
          }}
          onConfirm={confirmCancelIntent}
          title={t('dashboardPages.subscription.cancelOrder') || "Annuler la commande d'abonnement"}
          description={t('dashboardPages.subscription.confirmCancelIntent') || "Êtes-vous sûr de vouloir annuler cette intention de paiement ?"}
          confirmLabel={t('dashboardPages.subscription.cancelOrder') || "Annuler la commande"}
          cancelLabel={t('dashboardPages.common.cancel') || "Fermer"}
          variant="danger"
          loading={cancellingIntent}
          dir={dir}
        />
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const { t } = useLocale();
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 dark:text-slate-400">{t('dashboardPages.common.loading')}</div>}>
      <SubscriptionContent />
    </Suspense>
  );
}
