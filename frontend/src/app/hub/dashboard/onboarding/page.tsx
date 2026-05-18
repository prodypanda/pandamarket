'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  Package,
  Palette,
  ShieldCheck,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { fetchOnboardingState, updateOnboardingStep, type OnboardingState } from '@/lib/onboarding';

interface ThemeCustomizationState {
  colorPresetId?: string | null;
  customColors?: Record<string, string | null | undefined>;
}

interface StoreSettingsState {
  logo_url?: string | null;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
  store_description?: string | null;
  themeCustomization?: ThemeCustomizationState | null;
}

interface StoreState {
  id?: string;
  name?: string | null;
  subdomain?: string | null;
  custom_domain?: string | null;
  theme_id?: string | null;
  is_verified?: boolean | null;
  payment_config?: unknown;
  settings?: StoreSettingsState | null;
}

interface VerificationState {
  status?: string | null;
}

interface ProductMetaState {
  total?: number | string | null;
}

interface GuideTask {
  label: string;
  detail: string;
  completed: boolean;
  href: string;
}

interface WizardStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  icon: LucideIcon;
}

function hasCustomColors(customization?: ThemeCustomizationState | null): boolean {
  return Boolean(
    customization?.colorPresetId || Object.values(customization?.customColors || {}).some((value) => Boolean(value)),
  );
}

function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function SellerOnboardingPage() {
  const [store, setStore] = useState<StoreState | null>(null);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadGuideState() {
      setLoading(true);
      try {
        const [storeRes, verificationRes, productsRes, onboardingRes] = await Promise.allSettled([
          fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/verification/status', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me/products?limit=1', { credentials: 'include' }),
          fetchOnboardingState(),
        ]);

        if (!active) return;

        if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
          const data = await storeRes.value.json();
          setStore((data.store || null) as StoreState | null);
        }

        if (verificationRes.status === 'fulfilled' && verificationRes.value.ok) {
          const data = await verificationRes.value.json();
          setVerification((data.verification || null) as VerificationState | null);
        }

        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          const data = await productsRes.value.json();
          const meta = (data.meta || {}) as ProductMetaState;
          setProductCount(toNumber(meta.total));
        }

        if (onboardingRes.status === 'fulfilled') {
          setOnboardingState(onboardingRes.value);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadGuideState();
    return () => {
      active = false;
    };
  }, []);

  const storeBasicsTasks = useMemo<GuideTask[]>(() => {
    const settings = store?.settings;
    const logoReady = Boolean(settings?.logo_url || settings?.logo_light_url || settings?.logo_dark_url);
    const colorsReady = hasCustomColors(settings?.themeCustomization);
    return [
      {
        label: 'Store name',
        detail: store?.name ? store.name : 'Add the public seller name buyers will recognize.',
        completed: Boolean(store?.name?.trim()),
        href: '/hub/dashboard/settings?tab=store',
      },
      {
        label: 'Subdomain',
        detail: store?.subdomain ? `${store.subdomain}.pandamarket` : 'Confirm the generated storefront address.',
        completed: Boolean(store?.subdomain?.trim()),
        href: '/hub/dashboard/settings?tab=store',
      },
      {
        label: 'Light and dark logos',
        detail: logoReady ? 'At least one logo is ready.' : 'Upload default, light, or dark logo assets.',
        completed: logoReady,
        href: '/hub/dashboard/settings?tab=store',
      },
      {
        label: 'Colors',
        detail: colorsReady ? 'Store color customization is saved.' : 'Choose a color preset or custom brand colors.',
        completed: colorsReady,
        href: '/hub/dashboard/settings?tab=theme',
      },
    ];
  }, [store]);

  const completedStoreBasicsTasks = storeBasicsTasks.filter((task) => task.completed).length;
  const storeBasicsComplete = completedStoreBasicsTasks === storeBasicsTasks.length;
  const storeBasicsPercent = Math.round((completedStoreBasicsTasks / storeBasicsTasks.length) * 100);
  const firstIncompleteTask = storeBasicsTasks.find((task) => !task.completed);
  const storefrontHref = store?.subdomain ? `/store/${encodeURIComponent(store.subdomain)}` : '/hub';
  const wizardSteps = useMemo<WizardStep[]>(() => [
    {
      id: 'store_basics',
      label: 'Store basics',
      description: 'Name, subdomain, logos, colors',
      completed: storeBasicsComplete || Boolean(onboardingState.store_basics?.completed),
      href: '/hub/dashboard/onboarding',
      icon: Store,
    },
    {
      id: 'theme',
      label: 'Theme selected',
      description: 'Choose the storefront design',
      completed: Boolean(store?.theme_id),
      href: '/hub/dashboard/settings?tab=theme',
      icon: Palette,
    },
    {
      id: 'kyc',
      label: 'KYC approved',
      description: 'Verify seller identity',
      completed: verification?.status === 'approved' || Boolean(store?.is_verified),
      href: '/hub/dashboard/kyc',
      icon: ShieldCheck,
    },
    {
      id: 'first_product',
      label: 'First product',
      description: 'Publish the first listing',
      completed: productCount > 0,
      href: '/hub/dashboard/products',
      icon: Package,
    },
    {
      id: 'payment_shipping',
      label: 'Payments',
      description: 'Configure checkout readiness',
      completed: Boolean(store?.payment_config),
      href: '/hub/dashboard/payment-config',
      icon: CreditCard,
    },
  ], [onboardingState.store_basics?.completed, productCount, store, storeBasicsComplete, verification?.status]);
  const completedWizardSteps = wizardSteps.filter((step) => step.completed).length;
  const wizardPercent = Math.round((completedWizardSteps / wizardSteps.length) * 100);

  async function syncStoreBasicsProgress() {
    setSyncing(true);
    try {
      const nextState = await updateOnboardingStep('store_basics', {
        completed: storeBasicsComplete,
        metadata: {
          store_name: store?.name?.trim() || '',
          subdomain: store?.subdomain || '',
          has_logo: storeBasicsTasks[2]?.completed || false,
          has_custom_colors: storeBasicsTasks[3]?.completed || false,
        },
      });
      setOnboardingState(nextState);
    } catch {
      // Ignore transient sync failures; the guide reloads persisted state on the next visit.
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-[#B91C1C]" />
          Loading seller onboarding guide...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-xl shadow-red-950/10">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-100">Seller onboarding</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Launch guide for {store?.name || 'your storefront'}</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-amber-50/90">
              Finish Store basics first, then continue through theme, KYC, product, and payment setup without losing progress.
            </p>
          </div>
          <div className="rounded-2xl bg-white/12 p-4 text-right ring-1 ring-white/15 backdrop-blur">
            <p className="text-3xl font-black">{wizardPercent}%</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wide text-amber-100">{completedWizardSteps}/{wizardSteps.length} launch steps</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {wizardSteps.map((step, index) => (
          <Link
            key={step.id}
            href={step.href}
            className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${
              step.completed
                ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                : index === completedWizardSteps
                  ? 'border-[#B91C1C]/20 bg-[#B91C1C]/5 text-[#7F1D1D]'
                  : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <step.icon className="h-5 w-5" />
              </span>
              {step.completed ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
            </div>
            <p className="mt-4 text-sm font-black text-slate-950">{step.label}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{step.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#B91C1C]">Current step</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Store basics</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Complete the public identity buyers see first: store name, storefront address, logo assets, and brand colors.
              </p>
            </div>
            <div className={`rounded-2xl px-4 py-3 text-sm font-black ${storeBasicsComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {completedStoreBasicsTasks}/{storeBasicsTasks.length} complete
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#B91C1C] transition-all" style={{ width: `${storeBasicsPercent}%` }} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {storeBasicsTasks.map((task) => (
              <Link
                key={task.label}
                href={task.href}
                className={`flex items-start gap-3 rounded-2xl border p-4 transition hover:border-[#B91C1C]/25 hover:bg-amber-50/40 ${task.completed ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}
              >
                <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${task.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {task.completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-950">{task.label}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{task.detail}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#B91C1C]/15 bg-[#B91C1C]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">Next action</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                {firstIncompleteTask ? `Finish: ${firstIncompleteTask.label}.` : 'Store basics is ready. Continue with theme, KYC, products, and payments.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {firstIncompleteTask ? (
                <Link href={firstIncompleteTask.href} className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2 text-xs font-black text-white hover:bg-[#991B1B]">
                  Open task <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link href="/hub/dashboard/settings?tab=theme" className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2 text-xs font-black text-white hover:bg-[#991B1B]">
                  Continue setup <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={syncStoreBasicsProgress}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-[#B91C1C]/30 hover:text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Sync progress
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-950">Store preview</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Review the public storefront after saving the Store basics fields.
            </p>
            <Link href={storefrontHref} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:border-[#B91C1C]/30 hover:text-[#B91C1C]">
              Open storefront <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 text-amber-900">
            <h3 className="text-base font-black">Guidance</h3>
            <ul className="mt-3 space-y-2 text-sm font-semibold leading-6">
              <li>Use the same logo proportions for light and dark surfaces.</li>
              <li>Pick colors that keep buttons and product cards readable.</li>
              <li>Preview the storefront before moving to KYC and products.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
