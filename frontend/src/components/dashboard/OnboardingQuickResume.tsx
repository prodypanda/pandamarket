'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Store,
  Palette,
  ShieldCheck,
  Package,
  CreditCard,
  X,
} from 'lucide-react';
import { fetchOnboardingState, type OnboardingState } from '@/lib/onboarding';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';

interface OnboardingQuickResumeProps {
  storeId?: string | null;
}

export function OnboardingQuickResume({ storeId }: OnboardingQuickResumeProps) {
  const { dir } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingState>({});
  const [storeBasicsDone, setStoreBasicsDone] = useState(false);
  const [themeDone, setThemeDone] = useState(false);
  const [kycDone, setKycDone] = useState(false);
  const [productDone, setProductDone] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProgress() {
      try {
        const [onboardingData, storeRes, prodRes, kycRes] = await Promise.allSettled([
          fetchOnboardingState(),
          fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me/products?limit=1', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/verification/status', { credentials: 'include' }),
        ]);

        if (!active) return;

        let onb: OnboardingState = {};
        if (onboardingData.status === 'fulfilled') {
          onb = onboardingData.value;
          setOnboarding(onb);
        }

        if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
          const s = (await storeRes.value.json()).store;
          if (s) {
            const hasLogo = Boolean(s.settings?.logo_url || s.settings?.logo_light_url || s.settings?.logo_dark_url);
            const hasColors = Boolean(s.settings?.themeCustomization?.colorPresetId || s.settings?.colors?.primary);
            setStoreBasicsDone(Boolean(onb.store_basics?.completed || (s.name && s.subdomain && hasLogo && hasColors)));
            setThemeDone(Boolean(onb.theme?.completed || s.theme_id));
            setPaymentDone(Boolean(onb.payment_shipping?.completed || s.payment_config));
          }
        }

        if (prodRes.status === 'fulfilled' && prodRes.value.ok) {
          const p = await prodRes.value.json();
          setProductDone(Boolean(onb.first_product?.completed || (p.meta?.total && p.meta.total > 0)));
        }

        if (kycRes.status === 'fulfilled' && kycRes.value.ok) {
          const k = await kycRes.value.json();
          setKycDone(Boolean(k.verification?.status === 'approved'));
        }
      } catch {
        // silent fallback
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProgress();
    return () => {
      active = false;
    };
  }, [storeId]);

  if (loading || dismissed) return null;

  const steps = [
    {
      id: 'store_basics',
      label: 'Identité boutique',
      done: storeBasicsDone,
      href: '/hub/dashboard/onboarding',
      icon: Store,
    },
    {
      id: 'theme',
      label: 'Choix du thème',
      done: themeDone,
      href: '/hub/dashboard/onboarding#theme',
      icon: Palette,
    },
    {
      id: 'kyc',
      label: 'Vérification KYC',
      done: kycDone,
      href: '/hub/dashboard/onboarding#kyc',
      icon: ShieldCheck,
    },
    {
      id: 'first_product',
      label: 'Premier produit',
      done: productDone,
      href: '/hub/dashboard/onboarding#first-product',
      icon: Package,
    },
    {
      id: 'payment',
      label: 'Passerelle de paiement',
      done: paymentDone,
      href: '/hub/dashboard/payment-config',
      icon: CreditCard,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // If 100% completed, hide the resume widget
  if (progressPercent === 100) return null;

  const nextStep = steps.find((s) => !s.done) || steps[0];

  return (
    <aside dir={dir} aria-label="Progression de configuration" className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 px-4 py-2.5 sm:px-8 text-slate-900 dark:text-white transition-all backdrop-blur-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex-shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Configuration ({progressPercent}%)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline">
                · {completedCount}/{steps.length} étapes validées
              </span>
            </div>
            <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-slate-900 dark:bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link
            href={nextStep.href}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-bold rounded-lg transition shadow-2xs"
          >
            <span>Continuer : {nextStep.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
            title="Détails des étapes"
            aria-label="Détails des étapes"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
            title="Masquer la bannière"
            aria-label="Masquer la bannière"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 max-w-7xl mx-auto">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.id}
                href={step.href}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium transition ${
                  step.done
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                )}
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{idx + 1}. {step.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
