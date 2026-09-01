'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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
import { useLocale } from '@/contexts/LocaleContext';
import { revalidateStoreCache } from '@/lib/store-cache';

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
  const { locale } = useLocale();
  const [store, setStore] = useState<StoreState | null>(null);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [firstProduct, setFirstProduct] = useState<ProductSummaryState | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({});
  const [categories, setCategories] = useState<CategoryState[]>([]);
  const [loading, setLoading] = useState(true);

  // Platform domain shown in the wizard
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
  const [customPrimaryColor, setCustomPrimaryColor] = useState('#0F172A');

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
        fetchWithCsrf(`/api/pd/categories?locale=${encodeURIComponent(locale)}`, { credentials: 'include' }),
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
        // Resume from the first incomplete step
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
      const particles = Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        color: ['#0F172A', '#10B981', '#F59E0B', '#3B82F6', '#64748B', '#8B5CF6'][Math.floor(Math.random() * 6)],
        size: `${Math.random() * 8 + 6}px`,
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
    `Bienvenue ! Ce guide pas-à-pas vous accompagne pour configurer et lancer votre boutique sur ${platformDomain} en quelques minutes.`,
    'Votre logo et le nom de votre boutique sont les premiers éléments que vos clients verront.',
    'Parcourez nos thèmes soignés. Cliquez sur une carte pour prévisualiser immédiatement le style visuel.',
    'Téléversez vos justificatifs légaux (RC & CIN) pour faire vérifier votre profil vendeur et débloquer les ventes.',
    'Ajoutez votre premier produit en indiquant le titre, le prix en Dinars Tunisiens (TND) et la catégorie.',
    'Configurez vos modalités de paiement et frais de livraison (Paiement à la livraison ou Virement bancaire).',
    'Prêt à ouvrir ? Désactivez le mode maintenance pour rendre votre vitrine accessible publiquement.',
  ];

  // Save Step 2: Store Basics
  const saveStoreBasics = async () => {
    if (!storeName.trim()) {
      setWizardError('Le nom de la boutique est obligatoire');
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
      if (!res.ok) throw new Error('Impossible d\'enregistrer les informations de base');

      const nextOnboarding = await updateOnboardingStep('store_basics', {
        completed: true,
        metadata: { store_name: storeName, has_logo: Boolean(logoUrl) },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(2);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
      if (!res.ok) throw new Error('Impossible d\'enregistrer le thème');

      const nextOnboarding = await updateOnboardingStep('theme', {
        completed: true,
        metadata: { theme_id: selectedTheme },
      });
      setOnboardingState(nextOnboarding);
      revalidateStoreCache({ subdomain: store?.subdomain, custom_domain: store?.custom_domain });
      setCurrentStep(3);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSavingStep(false);
    }
  };

  // Save Step 4: KYC Documents
  const saveKyc = async () => {
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
      setWizardError('Veuillez téléverser tous les documents requis et indiquer un numéro de téléphone');
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
      if (!res.ok) throw new Error('Impossible de soumettre les documents KYC');

      const nextOnboarding = await updateOnboardingStep('kyc', {
        completed: false,
        metadata: { status: 'submitted' },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(4);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSavingStep(false);
    }
  };

  // Save Step 5: Product Creator
  const saveFirstProduct = async () => {
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
      setWizardError('Le titre, le prix et la catégorie sont obligatoires');
      return;
    }
    const parsedPrice = parseFloat(productPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setWizardError('Le prix doit être un nombre positif (TND)');
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
      if (!res.ok) throw new Error('Impossible de créer le produit');

      const nextOnboarding = await updateOnboardingStep('first_product', {
        completed: true,
        metadata: { product_title: productTitle },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(5);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSavingStep(false);
    }
  };

  // Save Step 6: Shipping & Payments
  const savePaymentsAndShipping = async () => {
    const parsedShippingFee = parseFloat(shippingFee);
    if (!Number.isFinite(parsedShippingFee) || parsedShippingFee < 0) {
      setWizardError('Les frais de livraison doivent être un montant valide (TND)');
      return;
    }
    setSavingStep(true);
    setWizardError('');
    try {
      const settingsRes = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            shipping_flat_fee: parsedShippingFee,
            payout_method: codEnabled ? 'COD' : 'bank_transfer',
            payout_details: bankTransferDetails,
          },
        }),
      });
      if (!settingsRes.ok) throw new Error('Impossible d\'enregistrer les options de livraison et paiement');

      const nextOnboarding = await updateOnboardingStep('payment_shipping', {
        completed: true,
        metadata: { shipping_fee: shippingFee, payout_method: codEnabled ? 'COD' : 'bank_transfer' },
      });
      setOnboardingState(nextOnboarding);
      setCurrentStep(6);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
      if (!res.ok) throw new Error('Impossible de modifier la visibilité');
      const data = await res.json();
      setStore(data.store);

      await updateOnboardingStep('publish_store', {
        completed: publish,
      });
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSavingStep(false);
    }
  };

  const isOnline = store?.status !== 'maintenance' && (store?.status === 'verified' || Boolean(store?.is_verified));

  const storeBasicsComplete = Boolean(onboardingState.store_basics?.completed || (store?.name && logoUrl));
  const themeStepComplete = Boolean(onboardingState.theme?.completed || store?.theme_id);
  const kycStepComplete = verification?.status === 'approved';
  const firstProductStepComplete = productCount > 0;
  const paymentStepComplete = Boolean(onboardingState.payment_shipping?.completed || store?.settings?.payout_method);

  const totalCompleted = [storeBasicsComplete, themeStepComplete, kycStepComplete, firstProductStepComplete, paymentStepComplete].filter(Boolean).length;
  const completionPercentage = Math.round((totalCompleted / 5) * 100);

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-slate-900 dark:text-white" />
          Chargement du guide d&apos;intégration...
        </div>
      </div>
    );
  }

  const storefrontHref = store?.subdomain ? `/store/${encodeURIComponent(store.subdomain)}?view=website` : '/hub';

  return (
    <div className="relative space-y-6">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs shrink-0">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Guide de Lancement Boutique
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {totalCompleted}/5 étapes
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-normal">
              Configurez votre vitrine, votre thème, téléversez vos documents KYC et publiez votre catalogue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">{completionPercentage}%</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Progression
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentStep(getResumeStep(onboardingState));
              setShowWizard(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Lancer l&apos;Assistant</span>
          </button>
        </div>
      </div>

      {/* Horizontal checklist layout */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { id: 'basics', title: 'Identité Boutique', desc: 'Nom, logo & sous-domaine', completed: storeBasicsComplete },
          { id: 'theme', title: 'Thème Graphique', desc: 'Mise en page & couleurs', completed: themeStepComplete },
          { id: 'kyc', title: 'Vérification KYC', desc: 'RC & CIN vendeur', completed: kycStepComplete },
          { id: 'product', title: 'Premier Produit', desc: 'Fiche produit & prix', completed: firstProductStepComplete },
          { id: 'payment', title: 'Paiement & Livraison', desc: 'Modes de versement & frais', completed: paymentStepComplete },
        ].map((item, idx) => (
          <div
            key={item.id}
            className={`rounded-xl border p-4 flex flex-col justify-between transition-colors shadow-2xs ${
              item.completed
                ? 'border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Étape 0{idx + 1}</span>
              {item.completed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Clock3 className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{item.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Static settings directory cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Configuration */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3.5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Paramètres Avancés</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Accédez directement aux sections du dashboard pour affiner vos réglages.
          </p>
          <div className="space-y-2">
            <Link
              href="/hub/dashboard/settings?tab=store"
              className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
            >
              <span>Profil et identité de boutique</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
            <Link
              href="/hub/dashboard/settings?tab=theme"
              className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
            >
              <span>Personnalisateur de thèmes</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
            <Link
              href="/hub/dashboard/payment-config"
              className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
            >
              <span>Modalités de reversement</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Card 2: Status */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3.5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">État de la Vitrine</h2>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 flex items-center justify-between border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400">Visibilité publique</span>
              <span className="block mt-0.5 text-xs font-semibold text-slate-900 dark:text-white">
                {isOnline ? '🟢 En ligne / Accessible' : '🟡 En mode maintenance'}
              </span>
            </div>
            <Link
              href={storefrontHref}
              target="_blank"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              Aperçu
            </Link>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Adresse : <code className="font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">{store?.subdomain}.{platformDomain}</code>
          </p>
        </div>

        {/* Card 3: Identity & KYC */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3.5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Identité & KYC</h2>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 flex items-center justify-between border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400">Statut de validation</span>
              <span className="block mt-0.5 text-xs font-semibold text-slate-900 dark:text-white">
                {verification?.status === 'approved'
                  ? 'Approuvé'
                  : verification?.status === 'pending'
                    ? 'En cours d\'examen'
                    : 'Non soumis / En attente'}
              </span>
            </div>
            <Link
              href="/hub/dashboard/kyc"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              Gérer KYC
            </Link>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Les boutiques vérifiées bénéficient d&apos;une meilleure visibilité sur la place de marché.
          </p>
        </div>
      </div>

      {/* FULLSCREEN INTERACTIVE WIZARD OVERLAY SHELL */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-label="Assistant d'intégration" className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl flex flex-col md:flex-row h-[90vh]">
            
            {/* Sidebar with Steps progress */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-5 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white">
                    <Store className="h-4 w-4" /> Assistant de Lancement
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWizard(false)}
                    className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-1.5">
                  {[
                    'Introduction',
                    'Identité Boutique',
                    'Choix du Thème',
                    'Documents KYC',
                    'Premier Produit',
                    'Livraison & Paiement',
                    'Lancement !',
                  ].map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setCurrentStep(idx)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors text-xs font-medium cursor-pointer ${
                        idx === currentStep
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-2xs'
                          : idx < currentStep
                            ? 'text-emerald-700 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 flex items-center justify-center rounded-lg text-[10px] font-semibold border ${
                          idx === currentStep
                            ? 'border-transparent bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-900'
                            : idx < currentStep
                              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        {idx < currentStep ? '✓' : idx + 1}
                      </span>
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress meter */}
              <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-slate-400">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Progression</span>
                <div className="mt-2 flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-slate-900 dark:bg-white transition-all duration-500"
                      style={{ width: `${(currentStep / 6) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white font-mono">{Math.round((currentStep / 6) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Main Interactive Workspace Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Étape {currentStep + 1} sur 7
                  </span>
                  <h2 className="text-base sm:text-lg font-semibold mt-0.5 text-slate-900 dark:text-white">
                    {
                      [
                        'Bienvenue sur PandaMarket',
                        'Identité de votre Boutique',
                        'Sélection du Thème Graphique',
                        'Justificatifs d\'Identité (KYC)',
                        'Ajout de votre Premier Produit',
                        'Options de Livraison & Paiement',
                        'Vérification et Mise en Ligne',
                      ][currentStep]
                    }
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="hidden md:block rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Step Forms */}
              <div className="flex-1 p-6 sm:p-7 overflow-y-auto space-y-5">
                {wizardError && (
                  <div role="alert" className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>{wizardError}</span>
                  </div>
                )}

                {/* Step 1: Welcome & Intro */}
                {currentStep === 0 && (
                  <div className="space-y-5 text-center max-w-lg mx-auto py-4">
                    <span className="text-5xl block">🐼</span>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Configurez votre boutique sur {platformDomain}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      Cet assistant interactif vous aide à paramétrer votre identité, votre charte graphique, vos documents de vérification et vos premiers articles en toute sérénité.
                    </p>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-left flex items-start gap-3 shadow-2xs">
                      <Sparkles className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        Votre progression est sauvegardée en temps réel. Vous pouvez quitter et revenir à tout moment exactement là où vous vous êtes arrêté.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Store Basics Form */}
                {currentStep === 1 && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Nom de la Boutique <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Maison de la Maroquinerie"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Adresse sous-domaine
                      </label>
                      <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden shadow-2xs">
                        <input
                          type="text"
                          readOnly
                          value={store?.subdomain || ''}
                          className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed font-mono"
                        />
                        <span className="bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 font-mono">
                          .{platformDomain}
                        </span>
                      </div>
                    </div>

                    {/* Logo uploaders */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Logo (Fond clair)
                        </label>
                        <div className="relative rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 text-center flex flex-col items-center justify-center min-h-[110px] shadow-2xs">
                          {logoUrl ? (
                            <div className="space-y-1.5">
                              <img src={logoUrl ? getResizedImageUrl(logoUrl, 'small') : ''} alt="Logo" className="h-9 object-contain mx-auto" />
                              <button
                                type="button"
                                onClick={() => setLogoUrl('')}
                                className="block text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                              >
                                Supprimer
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer space-y-1.5 block">
                              <Upload className="h-5 w-5 text-slate-400 mx-auto" />
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Choisir un fichier</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setWizardError('');
                                      const url = await handleFileUpload(file, 'store_asset');
                                      setLogoUrl(url);
                                    } catch {
                                      setWizardError('Échec du téléversement du logo');
                                    }
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Logo (Fond sombre)
                        </label>
                        <div className="relative rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 text-center flex flex-col items-center justify-center min-h-[110px] shadow-2xs">
                          {logoDarkUrl ? (
                            <div className="space-y-1.5">
                              <img src={logoDarkUrl ? getResizedImageUrl(logoDarkUrl, 'small') : ''} alt="Logo Dark" className="h-9 object-contain mx-auto" />
                              <button
                                type="button"
                                onClick={() => setLogoDarkUrl('')}
                                className="block text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                              >
                                Supprimer
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer space-y-1.5 block">
                              <Upload className="h-5 w-5 text-slate-400 mx-auto" />
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Choisir un fichier</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setWizardError('');
                                      const url = await handleFileUpload(file, 'store_asset');
                                      setLogoDarkUrl(url);
                                    } catch {
                                      setWizardError('Échec du téléversement du logo');
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
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3 max-h-72 overflow-y-auto pr-1">
                      {Object.values(themes).slice(0, 6).map((theme) => {
                        const isSelected = selectedTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setSelectedTheme(theme.id)}
                            className={`rounded-xl border p-3.5 text-left transition-colors shadow-2xs cursor-pointer ${
                              isSelected
                                ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800'
                                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <Palette className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                            <h4 className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">{theme.name}</h4>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-normal">
                              Nuances : {theme.colorPresets.map((p) => p.name).join(', ')}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Preset details preview */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 p-3.5 flex items-center justify-between shadow-2xs">
                      <div>
                        <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 block">
                          Configuration du thème actif
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-medium">
                          Grille : {themes[selectedTheme].layout.productGrid} · Typographie : {themes[selectedTheme].typography.fontFamily}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {themes[selectedTheme].colorPresets[0] &&
                          [
                            themes[selectedTheme].colorPresets[0].primary,
                            themes[selectedTheme].colorPresets[0].secondary,
                            themes[selectedTheme].colorPresets[0].accent,
                          ].map((c) => (
                            <span
                              key={c}
                              className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700"
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
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Numéro de Téléphone
                      </label>
                      <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-2xs">
                        <span className="bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700">
                          <Phone className="h-3.5 w-3.5" /> +216
                        </span>
                        <input
                          type="text"
                          placeholder="98765432"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="flex-1 bg-transparent px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Registre de Commerce (RC)
                        </label>
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 text-center flex flex-col items-center justify-center min-h-[120px] shadow-2xs">
                          {rcFileUrl ? (
                            <div className="space-y-1.5 text-center">
                              <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                              <span className="block text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate max-w-[130px]">
                                Document téléversé
                              </span>
                              <button
                                type="button"
                                onClick={() => setRcFileUrl('')}
                                className="text-[10px] text-rose-600 hover:text-rose-700 font-medium"
                              >
                                Remplacer
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer space-y-1.5 block">
                              <Upload className="h-5 w-5 text-slate-400 mx-auto" />
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Sélectionner le RC</span>
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
                                      setWizardError('Échec du téléversement du RC');
                                    }
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Carte d&apos;Identité (CIN)
                        </label>
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 text-center flex flex-col items-center justify-center min-h-[120px] shadow-2xs">
                          {cinFileUrl ? (
                            <div className="space-y-1.5 text-center">
                              <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                              <span className="block text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate max-w-[130px]">
                                Document téléversé
                              </span>
                              <button
                                type="button"
                                onClick={() => setCinFileUrl('')}
                                className="text-[10px] text-rose-600 hover:text-rose-700 font-medium"
                              >
                                Remplacer
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer space-y-1.5 block">
                              <Upload className="h-5 w-5 text-slate-400 mx-auto" />
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Sélectionner la CIN</span>
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
                                      setWizardError('Échec du téléversement de la CIN');
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
                  <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                            Titre du Produit <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Tasse en céramique artisanale"
                            value={productTitle}
                            onChange={(e) => setProductTitle(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none shadow-2xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                            Prix (TND) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="45.000"
                            value={productPrice}
                            onChange={(e) => setProductPrice(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                            Catégorie Marketplace
                          </label>
                          <select
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none shadow-2xs"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                            Tags (séparés par des virgules)
                          </label>
                          <input
                            type="text"
                            placeholder="tasse, céramique, artisanat"
                            value={productTags}
                            onChange={(e) => setProductTags(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Description
                        </label>
                        <textarea
                          placeholder="Décrivez les spécificités, dimensions et détails de fabrication..."
                          value={productDescription}
                          onChange={(e) => setProductDescription(e.target.value)}
                          rows={2}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-xs font-normal text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none resize-none shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Thumbnail Image Dropzone */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Photo du Produit
                      </label>
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 text-center flex flex-col items-center justify-center h-[180px] shadow-2xs">
                        {productThumbnail ? (
                          <div className="space-y-1.5">
                            <img src={productThumbnail} alt="Thumbnail Preview" className="h-24 rounded-lg object-cover mx-auto" />
                            <button
                              type="button"
                              onClick={() => setProductThumbnail('')}
                              className="block text-[11px] text-rose-600 hover:text-rose-700 font-medium mx-auto"
                            >
                              Supprimer
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer space-y-2 block">
                            <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              Téléverser une image
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
                                    setWizardError('Échec du téléversement de la photo');
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
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Frais de livraison fixes (TND)
                      </label>
                      <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-2xs">
                        <input
                          type="text"
                          value={shippingFee}
                          onChange={(e) => setShippingFee(e.target.value)}
                          className="flex-1 bg-transparent px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                        />
                        <span className="bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">
                          DT
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Modalités de Versement
                      </label>
                      <label className="flex items-center gap-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 p-3.5 cursor-pointer shadow-2xs">
                        <input
                          type="checkbox"
                          checked={codEnabled}
                          onChange={(e) => setCodEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <div>
                          <span className="block text-xs font-semibold text-slate-900 dark:text-white">Paiement à la livraison (COD)</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Encaissement direct des fonds auprès de vos transporteurs.</span>
                        </div>
                      </label>

                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Coordonnées Bancaires (RIB)
                        </span>
                        <textarea
                          placeholder="Banque, titulaire du compte et RIB à 20-24 chiffres..."
                          value={bankTransferDetails}
                          onChange={(e) => setBankTransferDetails(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-xs font-normal text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none resize-none shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 7: Launch & Publish */}
                {currentStep === 6 && (
                  <div className="space-y-4 text-center max-w-lg mx-auto py-2">
                    <span className="text-5xl block">🚀</span>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Félicitations !</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      Vos paramètres sont enregistrés, votre thème est appliqué et votre premier produit est prêt.
                    </p>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between shadow-2xs">
                      <div className="text-left">
                        <span className="block text-xs font-semibold text-slate-900 dark:text-white">Publier la Boutique en Ligne</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                          Les profils vérifiés deviennent visibles immédiatement.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => publishStoreToggle(!isOnline)}
                        className={`rounded-xl px-4 py-2 text-xs font-medium text-white transition shadow-2xs cursor-pointer ${
                          isOnline
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                        }`}
                      >
                        {isOnline ? '🟢 Publiée / En ligne' : 'Activer la Vitrine'}
                      </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Link
                        href={storefrontHref}
                        target="_blank"
                        className="flex-1 rounded-xl bg-slate-900 dark:bg-white py-2.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        Voir la Vitrine <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(0)}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 shadow-2xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Recommencer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Speech Bubble Guide Panel (Coachmarks) */}
              {showCoachmark && (
                <div className="mx-6 mb-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-left flex items-start justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
                      🐼
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                        Conseiller Panda
                      </span>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {stepCoachmarks[currentStep]}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCoachmark(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Bottom Navigation Buttons */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between">
                <div>
                  {!showCoachmark && (
                    <button
                      type="button"
                      onClick={() => setShowCoachmark(true)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Aide du conseiller
                    </button>
                  )}
                </div>

                <div className="flex gap-2.5">
                  {currentStep > 0 && currentStep < 6 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => prev - 1)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Précédent
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
                      className="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                      {savingStep ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement...
                        </>
                      ) : (
                        <>
                          Enregistrer & Continuer <ChevronRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowWizard(false)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-medium text-white flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                      Terminer & Fermer <Check className="h-3.5 w-3.5" />
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
