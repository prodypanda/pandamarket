'use client';

import React, { useState } from 'react';
import {
  Crown,
  Check,
  X,
  Sparkles,
  CreditCard,
  Building,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  Eye,
  Sliders,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface PlanLimits {
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

export interface PendingIntent {
  id: string;
  target_plan: string;
  amount: string | number;
  gateway: string;
  status: string;
  proof_url?: string;
  created_at: string;
  metadata?: any;
}

export interface CurrentPlan {
  plan: string;
  type: string;
  expires_at: string | null;
  limits: PlanLimits;
  pending_intents?: PendingIntent[];
}

export interface MandatInstructions {
  recipient_name?: string;
  recipient_cin?: string;
  recipient_city?: string;
  bank_name?: string;
  bank_rib?: string;
  bank_iban?: string;
  recipient_phone?: string;
  proof_email?: string;
}

export interface SellerReGoSubscriptionProps {
  currentPlan: CurrentPlan | null;
  allPlans: PlanLimits[];
  loading: boolean;
  changing: boolean;
  error: string;
  success: string;
  // Actions
  onRefresh: () => void;
  onOpenUpgradeModal: (plan: PlanLimits) => void;
  onCancelIntent: (intentId: string) => void;
  cancellingIntent: boolean;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoSubscription({
  currentPlan,
  allPlans,
  loading,
  changing: _changing,
  error,
  success,
  onRefresh,
  onOpenUpgradeModal,
  onCancelIntent,
  cancellingIntent,
  dir: _dir = 'ltr',
}: SellerReGoSubscriptionProps) {
  const { t: _t, locale } = useLocale();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<PlanLimits | null>(null);

  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  // Derive monthly price from the API-provided yearly_price (rounded to whole TND)
  const getPlanMonthlyPrice = (planId: string) => {
    const plan = allPlans.find((p) => p.plan_id === planId);
    return Math.round((plan?.yearly_price || 0) / 12);
  };

  const activePlanId = currentPlan?.plan || 'free';
  const activePlanPrice = getPlanMonthlyPrice(activePlanId);
  const expirationDate = currentPlan?.expires_at
    ? new Date(currentPlan.expires_at).toLocaleDateString(dateLocale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Renouvellement automatique actif';

  const pendingIntents = currentPlan?.pending_intents || [];

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Finance', href: '/hub/dashboard/financial' },
        { label: 'Forfait & Abonnement', href: '/hub/dashboard/subscription' },
      ]}
      headerTitle="Formule d'Abonnement & Quotas de la Boutique"
      headerSubtitle="Consultez votre formule actuelle, surveillez vos quotas d'utilisation et surclassez votre boutique pour débloquer des fonctionnalités premium."
      headerIcon={Crown}
      statusBadge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Crown className="w-3.5 h-3.5 text-amber-500 fill-current" />
          <span className="capitalize">{currentPlan ? `Plan ${currentPlan.plan}` : 'Chargement...'}</span>
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualiser les Quotas</span>
        </button>
      }
      secondaryAction={
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
              billingCycle === 'yearly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Annuel</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-black">Annuel</span>
          </button>
        </div>
      }
      alertBanner={
        error ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        ) : pendingIntents.length > 0 ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Demande de surclassement en attente :</span> Vous avez une commande de formule <strong>Plan {pendingIntents[0].target_plan}</strong> en cours de validation ({pendingIntents[0].gateway}).
              </div>
            </div>
            <button
              type="button"
              disabled={cancellingIntent}
              onClick={() => onCancelIntent(pendingIntents[0].id)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold transition-all"
            >
              {cancellingIntent ? 'Annulation...' : 'Annuler la demande'}
            </button>
          </div>
        ) : undefined
      }
      kpiStrip={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Formule Active"
            value={<span className="capitalize">{activePlanId}</span>}
            hint="Forfait souscrit"
            icon={Crown}
            accent={true}
          />
          <ReGoKpiHero
            label="Tarif d'Abonnement"
            value={<ReGoAmtBox amount={activePlanPrice} size="sm" />}
            hint="Par mois facturé"
            icon={CreditCard}
          />
          <ReGoKpiHero
            label="Date d'Échéance"
            value={<span className="text-sm font-black">{expirationDate}</span>}
            hint="Renouvellement prévu"
            icon={Calendar}
          />
          <ReGoKpiHero
            label="Commission Ventes"
            value={currentPlan?.limits?.commission_rate != null ? `${currentPlan.limits.commission_rate}%` : '—'}
            hint="Taux préférentiel appliqué"
            icon={Zap}
          />
        </div>
      }
      filterToolbar={
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Surclassez votre formule pour débloquer les ventes directes et l&apos;IA illimitée
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Comparez les formules ci-dessous pour réduire vos commissions et débloquer des fonctionnalités avancées.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/hub/dashboard/subscription/payment-method"
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Gérer les Cartes & Mandats</span>
            </a>
            <a
              href="/hub/dashboard/my-subscription-orders"
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Historique Factures</span>
            </a>
          </div>
        </div>
      }
      mainContent={
        <div className="space-y-6">
          {/* SECTION 1: QUOTA ALLOCATIONS */}
          <ReGoCard
            title="Quotas Alloués par votre Abonnement"
            subtitle="Limites des ressources incluses dans votre formule actuelle"
            icon={Layers}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Articles Publiés :</span>
                  <span className="text-slate-900 dark:text-white font-black">
                    {currentPlan?.limits?.max_products === -1 ? 'Illimité' : `${currentPlan?.limits?.max_products ?? '—'} max`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Capacité catalogue boutique</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Jetons IA Mensuels :</span>
                  <span className="text-slate-900 dark:text-white font-black">
                    {currentPlan?.limits?.ai_tokens_included != null ? currentPlan.limits.ai_tokens_included.toLocaleString(dateLocale) : '—'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Descriptions & SEO automatique</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Pages Constructeur :</span>
                  <span className="text-slate-900 dark:text-white font-black">
                    {currentPlan?.limits?.max_page_builder_pages != null ? `${currentPlan.limits.max_page_builder_pages} pages` : '—'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Landing pages personnalisées</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Photos par Produit :</span>
                  <span className="text-slate-900 dark:text-white font-black">
                    {currentPlan?.limits?.max_images_per_product != null ? `${currentPlan.limits.max_images_per_product} photos` : '—'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Galerie haute définition</p>
              </div>
            </div>
          </ReGoCard>

          {/* SECTION 2: PLANS COMPARISON GRID */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Grille Comparative des Formules d&apos;Abonnement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choisissez la formule qui répond à la croissance de votre entreprise en Tunisie
                </p>
              </div>
            </div>

            {allPlans.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-600 text-xs font-semibold">
                {loading ? 'Chargement des formules disponibles...' : 'Aucune formule disponible pour le moment. Actualisez la page ou contactez le support.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {allPlans.map((plan) => {
                const isCurrent = activePlanId === plan.plan_id;
                const priceYearly = plan.yearly_price || 0;
                const priceMonthly = Math.round(priceYearly / 12);
                const displayPrice = priceMonthly;

                return (
                  <div
                    key={plan.plan_id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
                      isCurrent
                        ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-600/30'
                        : plan.plan_id === 'pro'
                        ? 'border-amber-400 bg-white dark:bg-slate-900 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {plan.plan_id === 'pro' && !isCurrent && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-900 dark:text-white shadow-sm">
                        Recommandé
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {plan.plan_id}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Actuel
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900 dark:text-white">
                            {displayPrice}
                          </span>
                          <span className="text-xs font-bold text-slate-400">TND / mois</span>
                        </div>
                        {billingCycle === 'yearly' && priceYearly > 0 && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            Facturé {priceYearly} TND / an
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>
                            {plan.max_products === -1 ? <strong>Produits illimités</strong> : `${plan.max_products} produits max`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>Commission : <strong>{plan.commission_rate}%</strong> sur ventes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>{plan.ai_tokens_included?.toLocaleString('fr-TN')} tokens IA</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {plan.has_custom_domain ? (
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <span className={!plan.has_custom_domain ? 'text-slate-400 line-through' : ''}>
                            Domaine personnalisé .tn
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {plan.has_page_builder ? (
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <span className={!plan.has_page_builder ? 'text-slate-400 line-through' : ''}>
                            Constructeur de pages
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {plan.has_direct_payment ? (
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <span className={!plan.has_direct_payment ? 'text-slate-400 line-through' : ''}>
                            Paiement direct marchand
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <button
                        type="button"
                        onClick={() => onOpenUpgradeModal(plan)}
                        disabled={isCurrent}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                            : plan.plan_id === 'pro'
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/20'
                            : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isCurrent ? 'Formule Active' : 'Choisir ce Plan'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPlanDetails(plan)}
                        className="w-full text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1"
                      >
                        Voir toutes les spécifications
                      </button>
                     </div>
                   </div>
                 );
              })}
              </div>
            )}
          </div>
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={!!selectedPlanDetails}
          onClose={() => setSelectedPlanDetails(null)}
          title="Spécifications Détaillées du Forfait"
          subtitle={selectedPlanDetails ? `Formule ${selectedPlanDetails.plan_id}` : ''}
        >
          {selectedPlanDetails && (
            <div className="space-y-4 text-xs font-medium text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Taux de Commission :</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">{selectedPlanDetails.commission_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Nombre de Produits Max :</span>
                  <span className="font-bold">{selectedPlanDetails.max_products === -1 ? 'Illimité' : selectedPlanDetails.max_products}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Photos par Fiche :</span>
                  <span className="font-bold">{selectedPlanDetails.max_images_per_product}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Jetons IA Inclus :</span>
                  <span className="font-bold">{selectedPlanDetails.ai_tokens_included?.toLocaleString('fr-TN')} tokens</span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white">Fonctionnalités avancées incluses :</h5>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                  <li>• Domaine Personnalisé : {selectedPlanDetails.has_custom_domain ? 'Oui (.tn ou .com)' : 'Non'}</li>
                  <li>• Constructeur de Pages : {selectedPlanDetails.has_page_builder ? 'Oui' : 'Non'}</li>
                  <li>• Passerelle Directe : {selectedPlanDetails.has_direct_payment ? 'Oui (Konnect/Flouci direct)' : 'Non'}</li>
                  <li>• Marque Blanche : {selectedPlanDetails.has_white_label ? 'Oui (Sans logo PandaMarket)' : 'Non'}</li>
                  <li>• Intégration Clé IA Perso : {selectedPlanDetails.has_own_ai_provider ? 'Oui (BYOK Gemini)' : 'Non'}</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  const p = selectedPlanDetails;
                  setSelectedPlanDetails(null);
                  onOpenUpgradeModal(p);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all mt-4"
              >
                Passer à ce Forfait
              </button>
            </div>
          )}
        </ReGoDrawer>
      }
    />
  );
}
