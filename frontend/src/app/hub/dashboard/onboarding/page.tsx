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
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Upload,
  Info,
  Phone,
  Shield,
  Globe,
  FileText,
  Check,
  RotateCcw,
  HelpCircle,
  X,
} from 'lucide-react';
import { fetchOnboardingState, updateOnboardingStep, type OnboardingState } from '@/lib/onboarding';
import { themes, type ThemeId } from '@/lib/themes';

interface ThemeCustomizationState {
  layoutVariation?: string | null;
  gridDensity?: string | null;
  heroStyle?: string | null;
  colorPresetId?: string | null;
  customColors?: Record<string, string | null | undefined>;
}

interface StoreSettingsState {
  logo_url?: string | null;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
  themeCustomization?: ThemeCustomizationState | null;
  shipping_flat_fee?: number | null;
  payout_method?: string | null;
  payout_details?: string | null;
}

interface StoreState {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  theme_id?: string | null;
  is_verified?: boolean;
  status: string;
  settings?: StoreSettingsState | null;
}

interface VerificationState {
  id: string;
  status: string;
  rc_document_url?: string | null;
  cin_document_url?: string | null;
  phone_number?: string | null;
}

interface ProductSummaryState {
  id: string;
  title: string;
  price: string | number;
  status: string;
  thumbnail?: string | null;
}

interface CategoryState {
  id: string;
  name: string;
  slug: string;
}

const WIZARD_STEP_KEYS = ['store_basics', 'theme', 'kyc', 'first_product', 'payment_shipping'] as const;

/** Returns the wizard step index the seller should resume from (0 = welcome tour, 6 = launch). */
function getResumeStep(state: OnboardingState): number {
  const record = state as Record<string, { completed?: boolean } | undefined>;
  if (!record.store_basics?.completed) return 0;
  for (let i = 1; i < WIZARD_STEP_KEYS.length; i += 1) {
    if (!record[WIZARD_STEP_KEYS[i]]?.completed) return i + 1;
  }
  return 6;
}

export default function SellerOnboardingPage() {
  const [store, setStore] = useState<StoreState | null>(null);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [firstProduct, setFirstProduct] = useState<ProductSummaryState | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({});
  const [categories, setCategories] = useState<CategoryState[]>([]);
  const [loading, setLoading] = useState(true);

  // Platform domain shown in the wizard — configurable per deployment
  const platformDomain = (process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'garbage.team').replace(/^https?:\/\//i, '');

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [savingStep, setSavingStep] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [confetti, setConfetti] = useState<{ id: number; left: string; delay: string; color: string; size: string }[]>([]);

  // Coachmarks (Guided help)
  const [showCoachmark, setShowCoachmark] = useState(true);

  // Step 2 Forms (Store Basics)
  const [storeName, setStoreName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoDarkUrl, setLogoDarkUrl] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [customPrimaryColor, setCustomPrimaryColor] = useState('#B91C1C');

  // Step 3 Forms (Themes)
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('minimal');

  // Step 4 Forms (KYC)
  const [rcFileUrl, setRcFileUrl] = useState('');
  const [cinFileUrl, setCinFileUrl] = useState('');
  const [phone, setPhone] = useState('');

  // Step 5 Forms (First Product)
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [productTags, setProductTags] = useState('');
  const [productThumbnail, setProductThumbnail] = useState('');

  // Step 6 Forms (Payments & Shipping)
  const [shippingFee, setShippingFee] = useState('7.00');
  const [codEnabled, setCodEnabled] = useState(true);
  const [bankTransferDetails, setBankTransferDetails] = useState('');

  const loadOnboardingData = async () => {
    try {
      const [storeRes, verificationRes, productsRes, onboardingRes, categoriesRes] = await Promise.allSettled([
        fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/verification/status', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/stores/me/products?limit=20', { credentials: 'include' }),
        fetchOnboardingState(),
        fetchWithCsrf('/api/pd/categories', { credentials: 'include' }),
      ]);

      if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
        const data = await storeRes.value.json();
        const s = data.store as StoreState;
        setStore(s);
        setStoreName(s.name || '');
        setLogoUrl(s.settings?.logo_url || '');
        setLogoDarkUrl(s.settings?.logo_dark_url || '');
        setSelectedPresetId(s.settings?.themeCustomization?.colorPresetId || '');
        setSelectedTheme((s.theme_id || 'minimal') as ThemeId);
        setShippingFee(s.settings?.shipping_flat_fee ? String(s.settings.shipping_flat_fee) : '7.00');
        setBankTransferDetails(s.settings?.payout_details || '');
      }

      if (verificationRes.status === 'fulfilled' && verificationRes.value.ok) {
        const data = await verificationRes.value.json();
        const v = data.verification as VerificationState;
        setVerification(v);
        setRcFileUrl(v?.rc_document_url || '');
        setCinFileUrl(v?.cin_document_url || '');
        setPhone(v?.phone_number || '');
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const data = await productsRes.value.json();
        const products = Array.isArray(data.data) ? (data.data as ProductSummaryState[]) : [];
        setProductCount(products.length);
        setFirstProduct(products[0] || null);
      }

      if (onboardingRes.status === 'fulfilled') {
        setOnboardingState(onboardingRes.value);
        // Resume from the first incomplete step (progress persistence)
        setCurrentStep(getResumeStep(onboardingRes.value));
        // Automatically open wizard if basics not completed
        if (!onboardingRes.value.store_basics?.completed) {
          setShowWizard(true);
        }
      }

      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
        const data = await categoriesRes.value.json();
        setCategories(data.data || []);
        if (data.data?.length > 0) {
          setSelectedCategoryId(data.data[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOnboardingData();
  }, []);

  // Animate celebratory confetti
  useEffect(() => {
    if (currentStep === 6 && showWizard) {
      const particles = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        color: ['#B91C1C', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'][Math.floor(Math.random() * 6)],
        size: `${Math.random() * 10 + 6}px`,
      }));
      setConfetti(particles);
    } else {
      setConfetti([]);
    }
  }, [currentStep, showWizard]);

  // General File Uploader helper
  const handleFileUpload = async (file: File, purpose: string): Promise<string> => {
    const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type,
        file_size: file.size,
        purpose,
      }),
    });
    if (!presignRes.ok) throw new Error('Failed to prepare file upload');
    const presignData = await presignRes.json();
    const uploadRes = await fetch(presignData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error('Failed to upload file');
    return presignData.public_url;
  };

  // Coachmarks helper content per step
  const stepCoachmarks = [
    `Welcome! This interactive guide will walk you through setting up and launching your store on ${platformDomain} in minutes. Let's start!`,
    'Your logo and store name are the first things customers see. Enter a catchy name and upload your branding logos.',
    'Browse our curated designs. Click on any theme card below to instantly preview its layout and visual presets.',
    'Submit identification documents (RC & CIN) to verify your vendor profile. Verified stores gain organic search ranking!',
    'Add your first item! Fill in the basic title, price in Tunisian Dinar (TND), and select an appropriate product category.',
    'Configure how you want to be paid and your delivery fees. We support Cash on Delivery (COD) and Bank Transfer payouts.',
    'Ready to go live? Toggle the maintenance mode switch off to publish your storefront. Congratulations on launching!',
  ];

  // Save Step 2: Store Basics
  const saveStoreBasics = async () => {
    if (!storeName.trim()) {
      setWizardError('Store Name is required');
      return;
    }
    setSavingStep(true);
    setWizardError('');
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            name: storeName,
            logo_url: logoUrl,
            logo_dark_url: logoDarkUrl,
            themeCustomization: {
              colorPresetId: selectedPresetId || undefined,
              customColors: selectedPresetId ? undefined : { primary: customPrimaryColor },
            },
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save store basic settings');

      const nextOnboarding = await updateOnboardingStep('store_basics', {
        completed: true,
        metadata: { store_name: storeName, has_logo: Boolean(logoUrl) },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(2); // Go to step 3 (Theme Selection)
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSavingStep(false);
    }
  };

  // Save Step 3: Themes
  const saveThemeSelection = async () => {
    setSavingStep(true);
    setWizardError('');
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_id: selectedTheme }),
      });
      if (!res.ok) throw new Error('Failed to save theme selection');

      const nextOnboarding = await updateOnboardingStep('theme', {
        completed: true,
        metadata: { theme_id: selectedTheme },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(3); // Go to Step 4 (KYC)
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSavingStep(false);
    }
  };

  // Save Step 4: KYC Documents
  const saveKyc = async () => {
    // Verification already submitted or approved — do not resubmit, just advance
    if (verification?.status === 'approved' || verification?.status === 'pending') {
      const nextOnboarding = await updateOnboardingStep('kyc', {
        completed: true,
        metadata: { status: verification.status },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(4);
      return;
    }
    if (!rcFileUrl || !cinFileUrl || !phone) {
      setWizardError('Please complete all document uploads and enter a phone number');
      return;
    }
    setSavingStep(true);
    setWizardError('');
    try {
      const res = await fetchWithCsrf('/api/pd/verification/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rc_document_url: rcFileUrl,
          cin_document_url: cinFileUrl,
          phone_number: phone,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit verification request');

      const nextOnboarding = await updateOnboardingStep('kyc', {
        completed: true,
        metadata: { status: 'submitted' },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(4); // Go to Step 5 (First Product)
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSavingStep(false);
    }
  };

  // Save Step 5: Product Creator
  const saveFirstProduct = async () => {
    // A product already exists and no new one was typed — mark the step complete
    if (productCount > 0 && !productTitle.trim()) {
      const nextOnboarding = await updateOnboardingStep('first_product', {
        completed: true,
        metadata: { product_title: firstProduct?.title || 'existing' },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(5);
      return;
    }
    if (!productTitle || !productPrice || !selectedCategoryId) {
      setWizardError('Product Title, Price, and Category are required');
      return;
    }
    const parsedPrice = parseFloat(productPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setWizardError('Price must be a valid positive number (TND)');
      return;
    }
    setSavingStep(true);
    setWizardError('');
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: productTitle,
          description: productDescription,
          price: parsedPrice,
          marketplace_category_id: selectedCategoryId,
          tags: productTags.split(',').map((t) => t.trim()).filter(Boolean),
          thumbnail: productThumbnail || undefined,
          status: 'published',
          inventory_quantity: 10,
        }),
      });
      if (!res.ok) throw new Error('Failed to create product listing');

      const nextOnboarding = await updateOnboardingStep('first_product', {
        completed: true,
        metadata: { product_title: productTitle },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(5); // Go to Step 6 (Payments & Shipping)
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSavingStep(false);
    }
  };

  // Save Step 6: Shipping & Payments
  const savePaymentsAndShipping = async () => {
    const parsedShippingFee = parseFloat(shippingFee);
    if (!Number.isFinite(parsedShippingFee) || parsedShippingFee < 0) {
      setWizardError('Shipping fee must be a valid number (TND)');
      return;
    }
    setSavingStep(true);
    setWizardError('');
    try {
      // 1. Save Shipping Fee
      const shipRes = await fetchWithCsrf('/api/pd/stores/me/shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipping_flat_fee: parsedShippingFee }),
      });
      if (!shipRes.ok) throw new Error('Failed to save shipping configurations');

      // 2. Save Payout details
      const payRes = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            payout_method: codEnabled ? 'COD' : 'bank_transfer',
            payout_details: bankTransferDetails,
          },
        }),
      });
      if (!payRes.ok) throw new Error('Failed to save payout settings');

      const nextOnboarding = await updateOnboardingStep('payment_shipping', {
        completed: true,
        metadata: { shipping_fee: shippingFee, payout_method: codEnabled ? 'COD' : 'bank_transfer' },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(6); // Go to final Step 7 (Publish & Celebrate!)
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSavingStep(false);
    }
  };

  // Step 7 Toggle Live
  const publishStoreToggle = async (publish: boolean) => {
    setSavingStep(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !publish }),
      });
      if (!res.ok) throw new Error('Failed to toggle storefront visibility');
      const data = await res.json();
      setStore(data.store);

      await updateOnboardingStep('publish_store', {
        completed: publish,
      });
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSavingStep(false);
    }
  };

  // Clean dashboard status counts
  const storeBasicsComplete = Boolean(onboardingState.store_basics?.completed || (store?.name && logoUrl));
  const themeStepComplete = Boolean(onboardingState.theme?.completed || store?.theme_id);
  const kycStepComplete = verification?.status === 'approved';
  const firstProductStepComplete = productCount > 0;
  const paymentStepComplete = Boolean(onboardingState.payment_shipping?.completed || store?.settings?.payout_method);

  const totalCompleted = [storeBasicsComplete, themeStepComplete, kycStepComplete, firstProductStepComplete, paymentStepComplete].filter(Boolean).length;
  const completionPercentage = Math.round((totalCompleted / 5) * 100);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-[#B91C1C]" />
          Loading onboarding settings...
        </div>
      </div>
    );
  }

  const storefrontHref = store?.subdomain ? `/store/${encodeURIComponent(store.subdomain)}?view=website` : '/hub';

  return (
    <div className="relative space-y-6">
      {/* Confetti falling keyframe styles */}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {/* Confetti canvas animation */}
      {confetti.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none absolute"
          style={{
            left: p.left,
            animationDelay: p.delay,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            top: '-20px',
            borderRadius: Math.random() > 0.5 ? '50%' : '20%',
            animationName: 'confetti-fall',
            animationDuration: '4s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            zIndex: 9999,
          }}
        />
      ))}

      {/* Main setup overview card */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-800 bg-[#0F0F23] p-8 text-white shadow-xl shadow-red-950/20">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#B91C1C]/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="rounded-full bg-[#B91C1C]/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#ff5f5f]">
              Dashboard Launcher
            </span>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Storefront Launch Guide</h1>
            <p className="mt-3 max-w-xl text-sm font-semibold text-slate-400">
              Configure your storefront basics, design themes, verify documents, and go live using our interactive checklist.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-3xl font-black">{completionPercentage}%</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-400">
                {totalCompleted}/5 setup tasks
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCurrentStep(getResumeStep(onboardingState));
                setShowWizard(true);
              }}
              className="flex items-center gap-2 rounded-2xl bg-[#B91C1C] px-6 py-4 text-sm font-black text-white hover:bg-[#991B1B] transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="h-5 w-5" /> Launch Setup Wizard
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal checklist layout */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { id: 'basics', title: 'Store Basics', completed: storeBasicsComplete },
          { id: 'theme', title: 'Theme Selection', completed: themeStepComplete },
          { id: 'kyc', title: 'KYC Verification', completed: kycStepComplete },
          { id: 'product', title: 'First Product', completed: firstProductStepComplete },
          { id: 'payment', title: 'Payments Setup', completed: paymentStepComplete },
        ].map((item, idx) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 flex flex-col justify-between ${
              item.completed
                ? 'border-emerald-500/40 bg-[#0C1B16] text-emerald-400'
                : 'border-slate-800 bg-[#0F0F23] text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider">Task 0{idx + 1}</span>
              {item.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Clock3 className="h-5 w-5" />}
            </div>
            <p className="mt-3 text-sm font-black text-white">{item.title}</p>
          </div>
        ))}
      </div>

      {/* Static settings directory cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-800 bg-[#0F0F23] p-6 space-y-4">
          <h2 className="text-xl font-black text-white">⚙️ Configuration Settings</h2>
          <p className="text-xs text-slate-400 leading-5">
            Quick links to customize components in detail later from settings panel.
          </p>
          <div className="grid gap-2">
            <Link
              href="/hub/dashboard/settings?tab=store"
              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3.5 text-xs font-bold text-white hover:bg-white/10"
            >
              <span>Store Profile settings</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/hub/dashboard/settings?tab=theme"
              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3.5 text-xs font-bold text-white hover:bg-white/10"
            >
              <span>Design presets customizer</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/hub/dashboard/payment-config"
              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3.5 text-xs font-bold text-white hover:bg-white/10"
            >
              <span>Merchant payout setups</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800 bg-[#0F0F23] p-6 space-y-4">
          <h2 className="text-xl font-black text-white">🏪 Storefront Status</h2>
          <div className="rounded-2xl bg-white/5 p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Visibility Status</span>
              <span className="block mt-1 text-sm font-black text-white">
                {store?.status === 'published' ? '🟢 Published / Active' : '🟡 In Maintenance Mode'}
              </span>
            </div>
            <Link
              href={storefrontHref}
              target="_blank"
              className="rounded-xl border border-slate-700 bg-transparent px-4 py-2 text-xs font-black text-white hover:bg-white/5"
            >
              Preview
            </Link>
          </div>
          <p className="text-xs text-slate-400 leading-5">
            Your storefront is currently mapped to: <code className="text-[#ff5f5f]">{store?.subdomain}.{platformDomain}</code>
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-800 bg-[#0F0F23] p-6 space-y-4">
          <h2 className="text-xl font-black text-white">🛂 Identity & KYC</h2>
          <div className="rounded-2xl bg-white/5 p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">KYC Status</span>
              <span className="block mt-1 text-sm font-black text-white">
                {verification?.status === 'approved'
                  ? '✅ Profile Approved'
                  : verification?.status === 'pending'
                    ? '⏳ Under Admin Review'
                    : '❌ Unsubmitted / Rejected'}
              </span>
            </div>
            <Link
              href="/hub/dashboard/kyc"
              className="rounded-xl border border-slate-700 bg-transparent px-4 py-2 text-xs font-black text-white hover:bg-white/5"
            >
              Verify Settings
            </Link>
          </div>
        </div>
      </div>

      {/* FULLSCREEN INTERACTIVE WIZARD OVERLAY SHELL */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-lg">
          <div role="dialog" aria-modal="true" aria-label="Store setup wizard" className="relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-slate-700 bg-[#0F0F23] text-white shadow-2xl ring-1 ring-white/10 flex flex-col md:flex-row h-[90vh]">
            
            {/* Sidebar with Steps progress */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0B0B1A]/80 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-black text-sm">
                    <Store className="h-5 w-5 text-[#B91C1C]" /> Wizard Launcher
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWizard(false)}
                    className="md:hidden text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-8 space-y-2">
                  {[
                    'Welcome Tour',
                    'Store Basics',
                    'Theme Customizer',
                    'KYC Verification',
                    'Add First Product',
                    'Shipping & Payouts',
                    'Launch Storefront!',
                  ].map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setCurrentStep(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        idx === currentStep
                          ? 'bg-[#B91C1C]/15 text-[#ff5f5f]'
                          : idx < currentStep
                            ? 'text-emerald-400 font-bold hover:bg-white/5'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-black border ${
                          idx === currentStep
                            ? 'border-[#B91C1C] bg-[#B91C1C] text-white'
                            : idx < currentStep
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-800'
                        }`}
                      >
                        {idx < currentStep ? '✓' : idx + 1}
                      </span>
                      <span className="text-xs font-black">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress meter */}
              <div className="mt-6 pt-4 border-t border-slate-800 text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Onboarding progress</span>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${(currentStep / 6) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-white">{Math.round((currentStep / 6) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Main Interactive Workspace Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#B91C1C]">
                    Step 0{currentStep + 1} of 07
                  </span>
                  <h2 className="text-xl font-black mt-1 text-white">
                    {
                      [
                        'Welcome to PandaMarket',
                        'Configure Store Basics',
                        'Select Store Theme Design',
                        'KYC Documents Submission',
                        'List Your First Product',
                        'Payments & Delivery Options',
                        'Review and Launch Storefront',
                      ][currentStep]
                    }
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="hidden md:block rounded-full bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Step Forms */}
              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                {wizardError && (
                  <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-300 flex items-center gap-2">
                    <Info className="h-4 w-4" /> {wizardError}
                  </div>
                )}

                {/* Step 1: Welcome & Intro */}
                {currentStep === 0 && (
                  <div className="space-y-6 text-center max-w-xl mx-auto py-6">
                    <span className="text-6xl">🐼</span>
                    <h3 className="text-2xl font-black">Let&apos;s configure {platformDomain}</h3>
                    <p className="text-sm text-slate-400 leading-6">
                      Welcome to your merchant command center. This quick interactive wizard will configure your public store basics, design layout theme, verify files, and add your first product.
                    </p>
                    <div className="p-4 rounded-2xl bg-white/5 border border-slate-800 text-left flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                      <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                        Progress is saved in real time. If you exit or lose connection, you can reload and resume setup exactly from this step.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Store Basics Form */}
                {currentStep === 1 && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                        Store Name
                      </label>
                      <input
                        type="text"
                        placeholder="My Beautiful Store"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-800 bg-white/5 p-4 text-sm text-white placeholder:text-slate-500 focus:border-[#B91C1C] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                        Subdomain Address
                      </label>
                      <div className="flex rounded-2xl border border-slate-800 bg-white/5 overflow-hidden">
                        <input
                          type="text"
                          readOnly
                          value={store?.subdomain || ''}
                          className="flex-1 bg-transparent p-4 text-sm text-slate-400 focus:outline-none cursor-not-allowed"
                        />
                        <span className="bg-slate-800 p-4 text-sm font-bold text-slate-400">
                          .{platformDomain}
                        </span>
                      </div>
                    </div>

                    {/* Logo uploaders */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                          Logo (Light background)
                        </label>
                        <div className="relative rounded-2xl border border-dashed border-slate-800 bg-white/5 p-4 text-center flex flex-col items-center justify-center min-h-[120px]">
                          {logoUrl ? (
                            <div className="space-y-2">
                              <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                              <button
                                type="button"
                                onClick={() => setLogoUrl('')}
                                className="block text-[10px] text-red-400 underline font-bold"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer space-y-2">
                              <Upload className="h-6 w-6 text-slate-500 mx-auto" />
                              <span className="block text-[10px] text-slate-400 font-bold">Choose File</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setWizardError('');
                                      const url = await handleFileUpload(file, 'store_logo');
                                      setLogoUrl(url);
                                    } catch (err) {
                                      setWizardError('Failed to upload logo image');
                                    }
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                          Logo (Dark background)
                        </label>
                        <div className="relative rounded-2xl border border-dashed border-slate-800 bg-white/5 p-4 text-center flex flex-col items-center justify-center min-h-[120px]">
                          {logoDarkUrl ? (
                            <div className="space-y-2">
                              <img src={logoDarkUrl} alt="Logo Dark" className="h-10 object-contain" />
                              <button
                                type="button"
                                onClick={() => setLogoDarkUrl('')}
                                className="block text-[10px] text-red-400 underline font-bold"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer space-y-2">
                              <Upload className="h-6 w-6 text-slate-500 mx-auto" />
                              <span className="block text-[10px] text-slate-400 font-bold">Choose File</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setWizardError('');
                                      const url = await handleFileUpload(file, 'store_logo');
                                      setLogoDarkUrl(url);
                                    } catch (err) {
                                      setWizardError('Failed to upload logo image');
                                    }
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Theme selection */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-3 max-h-72 overflow-y-auto pr-1">
                      {Object.values(themes).slice(0, 6).map((theme) => {
                        const isSelected = selectedTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setSelectedTheme(theme.id)}
                            className={`rounded-2xl border p-4 text-left transition hover:border-[#B91C1C]/40 ${
                              isSelected ? 'border-[#B91C1C] bg-[#B91C1C]/10' : 'border-slate-800 bg-white/5'
                            }`}
                          >
                            <Palette className="h-5 w-5 text-amber-400" />
                            <h4 className="mt-3 text-sm font-black text-white">{theme.name}</h4>
                            <p className="mt-1 text-[10px] text-slate-400 leading-normal">
                              Preset colors: {theme.colorPresets.map((p) => p.name).join(', ')}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Preset details preview */}
                    <div className="rounded-2xl bg-white/5 border border-slate-800 p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                          Active Theme Layout
                        </span>
                        <p className="text-xs text-slate-200 mt-1 font-bold">
                          Grid format: {themes[selectedTheme].layout.productGrid} Grid · Typography: {themes[selectedTheme].typography.fontFamily}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {themes[selectedTheme].colorPresets[0] &&
                          [
                            themes[selectedTheme].colorPresets[0].primary,
                            themes[selectedTheme].colorPresets[0].secondary,
                            themes[selectedTheme].colorPresets[0].accent,
                          ].map((c) => (
                            <span
                              key={c}
                              className="h-5 w-5 rounded-full border border-white/20"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: KYC identity documents upload */}
                {currentStep === 3 && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                        Phone number
                      </label>
                      <div className="flex rounded-2xl border border-slate-800 bg-white/5 overflow-hidden">
                        <span className="bg-slate-800 p-4 text-sm font-bold text-slate-400 flex items-center gap-1.5">
                          <Phone className="h-4 w-4" /> +216
                        </span>
                        <input
                          type="text"
                          placeholder="98765432"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="flex-1 bg-transparent p-4 text-sm text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                          RC (Registre de Commerce)
                        </label>
                        <div className="rounded-2xl border border-dashed border-slate-800 bg-white/5 p-4 text-center flex flex-col items-center justify-center min-h-[140px]">
                          {rcFileUrl ? (
                            <div className="space-y-2 text-center">
                              <FileText className="h-8 w-8 text-emerald-400 mx-auto" />
                              <span className="block text-[10px] text-emerald-400 font-bold truncate max-w-[140px]">
                                Uploaded successfully
                              </span>
                              <button
                                type="button"
                                onClick={() => setRcFileUrl('')}
                                className="text-[10px] text-red-400 underline font-bold"
                              >
                                Replace file
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer space-y-2">
                              <Upload className="h-6 w-6 text-slate-500 mx-auto" />
                              <span className="block text-[10px] text-slate-400 font-bold">Select business RC</span>
                              <input
                                type="file"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setWizardError('');
                                      const url = await handleFileUpload(file, 'kyc_document');
                                      setRcFileUrl(url);
                                    } catch {
                                      setWizardError('Failed to upload RC document');
                                    }
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                          CIN (Carte d&apos;Identité Nationale)
                        </label>
                        <div className="rounded-2xl border border-dashed border-slate-800 bg-white/5 p-4 text-center flex flex-col items-center justify-center min-h-[140px]">
                          {cinFileUrl ? (
                            <div className="space-y-2 text-center">
                              <FileText className="h-8 w-8 text-emerald-400 mx-auto" />
                              <span className="block text-[10px] text-emerald-400 font-bold truncate max-w-[140px]">
                                Uploaded successfully
                              </span>
                              <button
                                type="button"
                                onClick={() => setCinFileUrl('')}
                                className="text-[10px] text-red-400 underline font-bold"
                              >
                                Replace file
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer space-y-2">
                              <Upload className="h-6 w-6 text-slate-500 mx-auto" />
                              <span className="block text-[10px] text-slate-400 font-bold">Select ID CIN</span>
                              <input
                                type="file"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setWizardError('');
                                      const url = await handleFileUpload(file, 'kyc_document');
                                      setCinFileUrl(url);
                                    } catch {
                                      setWizardError('Failed to upload CIN document');
                                    }
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Add First Product Form */}
                {currentStep === 4 && (
                  <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                            Product Title
                          </label>
                          <input
                            type="text"
                            placeholder="Handmade Ceramic Mug"
                            value={productTitle}
                            onChange={(e) => setProductTitle(e.target.value)}
                            className="w-full rounded-2xl border border-slate-800 bg-white/5 p-4 text-sm text-white placeholder:text-slate-500 focus:border-[#B91C1C] focus:outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                            Price (TND)
                          </label>
                          <input
                            type="text"
                            placeholder="45.00"
                            value={productPrice}
                            onChange={(e) => setProductPrice(e.target.value)}
                            className="w-full rounded-2xl border border-slate-800 bg-white/5 p-4 text-sm text-white placeholder:text-slate-500 focus:border-[#B91C1C] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                            Marketplace Category
                          </label>
                          <select
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                            className="w-full rounded-2xl border border-slate-800 bg-white/5 p-4 text-sm text-white focus:border-[#B91C1C] focus:outline-none"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id} className="bg-[#0F0F23] text-white">{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                            Tags (comma separated)
                          </label>
                          <input
                            type="text"
                            placeholder="mug, clay, ceramic"
                            value={productTags}
                            onChange={(e) => setProductTags(e.target.value)}
                            className="w-full rounded-2xl border border-slate-800 bg-white/5 p-4 text-sm text-white placeholder:text-slate-500 focus:border-[#B91C1C] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                          Description
                        </label>
                        <textarea
                          placeholder="Describe your item details, dimensions, and unique features..."
                          value={productDescription}
                          onChange={(e) => setProductDescription(e.target.value)}
                          rows={2}
                          className="w-full rounded-2xl border border-slate-800 bg-white/5 p-4 text-sm text-white placeholder:text-slate-500 focus:border-[#B91C1C] focus:outline-none resize-none"
                        />
                      </div>
                    </div>

                    {/* Thumbnail Image Dropzone */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                        Product Photo
                      </label>
                      <div className="rounded-3xl border border-dashed border-slate-800 bg-white/5 p-6 text-center flex flex-col items-center justify-center h-[200px]">
                        {productThumbnail ? (
                          <div className="space-y-2">
                            <img src={productThumbnail} alt="Thumbnail Preview" className="h-28 rounded-xl object-cover" />
                            <button
                              type="button"
                              onClick={() => setProductThumbnail('')}
                              className="block text-[10px] text-red-400 underline font-bold mx-auto"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer space-y-3">
                            <Upload className="h-8 w-8 text-slate-500 mx-auto" />
                            <span className="block text-xs text-slate-400 font-bold leading-normal">
                              Upload Image
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    setWizardError('');
                                    const url = await handleFileUpload(file, 'product_image');
                                    setProductThumbnail(url);
                                  } catch {
                                    setWizardError('Failed to upload product thumbnail image');
                                  }
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Shipping & Payments config */}
                {currentStep === 5 && (
                  <div className="space-y-6 max-w-lg mx-auto">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                        Tunisian Shipping Fee Flat-Rate (TND)
                      </label>
                      <div className="flex rounded-2xl border border-slate-800 bg-white/5 overflow-hidden">
                        <input
                          type="text"
                          value={shippingFee}
                          onChange={(e) => setShippingFee(e.target.value)}
                          className="flex-1 bg-transparent p-4 text-sm text-white focus:outline-none"
                        />
                        <span className="bg-slate-800 p-4 text-sm font-bold text-slate-400">
                          DT
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                        Payout Options
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 rounded-2xl bg-white/5 border border-slate-800 p-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={codEnabled}
                            onChange={(e) => setCodEnabled(e.target.checked)}
                            className="h-5 w-5 rounded border-slate-800 bg-transparent text-[#B91C1C] focus:ring-[#B91C1C]"
                          />
                          <div>
                            <span className="block text-sm font-black text-white">Cash on Delivery (COD)</span>
                            <span className="text-[10px] text-slate-400">Receive cash directly from logistics courier.</span>
                          </div>
                        </label>

                        <div className="space-y-2">
                          <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
                            Bank Account details (RIB)
                          </span>
                          <textarea
                            placeholder="Enter your bank name, account holder, and 24-digit RIB code..."
                            value={bankTransferDetails}
                            onChange={(e) => setBankTransferDetails(e.target.value)}
                            rows={3}
                            className="w-full rounded-2xl border border-slate-800 bg-white/5 p-4 text-sm text-white placeholder:text-slate-500 focus:border-[#B91C1C] focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 7: Launch & Publish */}
                {currentStep === 6 && (
                  <div className="space-y-6 text-center max-w-xl mx-auto py-4">
                    <span className="text-6xl animate-bounce block">🚀</span>
                    <h3 className="text-3xl font-black text-white">Congratulations!</h3>
                    <p className="text-sm text-slate-400 leading-6">
                      Your settings are persisted, product is listed, and custom design is applied. You are ready to launch on {platformDomain}!
                    </p>

                    <div className="p-5 rounded-3xl bg-white/5 border border-slate-800 flex items-center justify-between">
                      <div className="text-left">
                        <span className="block text-sm font-black text-white">Publish Storefront Online</span>
                        <span className="text-[10px] text-slate-400 leading-normal">
                          Verified stores go live instantly. Unverified profiles enter review queues.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => publishStoreToggle(store?.status !== 'published')}
                        className={`rounded-2xl px-6 py-3.5 text-xs font-black text-white transition-all shadow-md ${
                          store?.status === 'published'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-[#B91C1C] hover:bg-[#991B1B]'
                        }`}
                      >
                        {store?.status === 'published' ? '🟢 Published Live' : '🔴 Offline / Private'}
                      </button>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <Link
                        href={storefrontHref}
                        target="_blank"
                        className="flex-1 rounded-2xl bg-white/10 py-4 text-sm font-black text-white hover:bg-white/20 flex items-center justify-center gap-2"
                      >
                        Preview Live Store <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep(0);
                        }}
                        className="rounded-2xl border border-slate-800 bg-transparent px-6 py-4 text-sm font-black text-slate-400 hover:text-white flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" /> Restart Guide
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Speech Bubble Guide Panel (Coachmarks) */}
              {showCoachmark && (
                <div className="m-6 p-4 rounded-2xl bg-gradient-to-br from-[#1C0D0D] to-[#2B0F0F] border border-[#B91C1C]/25 text-left flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#B91C1C]/15 text-[#ff5f5f]">
                      🐼
                    </span>
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wider text-[#ff5f5f]">
                        Panda Launch Advisor
                      </span>
                      <p className="mt-1 text-sm text-slate-200 leading-6 font-semibold">
                        {stepCoachmarks[currentStep]}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCoachmark(false)}
                    className="text-slate-500 hover:text-white shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Bottom Navigation Buttons */}
              <div className="p-6 border-t border-slate-800 bg-[#0B0B1A]/80 flex items-center justify-between">
                <div>
                  {!showCoachmark && (
                    <button
                      type="button"
                      onClick={() => setShowCoachmark(true)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      <HelpCircle className="h-4 w-4" /> Show advisor help
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  {currentStep > 0 && currentStep < 6 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => prev - 1)}
                      className="rounded-2xl border border-slate-800 bg-transparent px-6 py-3.5 text-xs font-black text-slate-300 hover:bg-white/5 flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                  )}

                  {currentStep < 6 ? (
                    <button
                      type="button"
                      disabled={savingStep}
                      onClick={async () => {
                        if (currentStep === 0) setCurrentStep(1);
                        else if (currentStep === 1) await saveStoreBasics();
                        else if (currentStep === 2) await saveThemeSelection();
                        else if (currentStep === 3) await saveKyc();
                        else if (currentStep === 4) await saveFirstProduct();
                        else if (currentStep === 5) await savePaymentsAndShipping();
                      }}
                      className="rounded-2xl bg-[#B91C1C] px-6 py-3.5 text-xs font-black text-white hover:bg-[#991B1B] disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingStep ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          Save & Continue <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowWizard(false)}
                      className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-black text-white hover:bg-emerald-700 flex items-center gap-2"
                    >
                      Complete & Exit <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
