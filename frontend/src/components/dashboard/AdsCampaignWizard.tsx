'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Package, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { AdsCreativeMediaPicker } from './AdsCreativeMediaPicker';
import { AdsCreativePreview } from './AdsCreativePreview';

type Placement = { id: string; name: string; format: string; default_price: string };
type ProductOption = { id: string; title: string; price: number | string; image_url?: string };
type Estimate = { metric: 'clicks' | 'impressions' | 'days'; range: { low: number; high: number }; estimated_days: number; effective_rate: number; recommended_bid: number; recommended_daily_budget: number; assumptions: string };

type Form = {
  name: string; campaign_type: string; objective: string; pricing_model: string;
  daily_budget: string; total_budget: string; bid_amount: string;
  creative_title: string; creative_description: string; image_url: string; cta_label: string; destination_url: string; product_id: string;
  starts_at: string; ends_at: string; locale: string; category: string; device: string; audience: string; placement_ids: string[];
};

const blank: Form = {
  name: '', campaign_type: 'sponsored_product', objective: 'traffic', pricing_model: 'cpc',
  daily_budget: '5', total_budget: '50', bid_amount: '0.100',
  creative_title: '', creative_description: '', image_url: '', cta_label: 'Shop now', destination_url: '', product_id: '',
  starts_at: '', ends_at: '', locale: 'all', category: '', device: 'all', audience: 'all', placement_ids: [],
};

const KEY = 'pandamarket:ads-wizard-draft:v1';

export function AdsCampaignWizard({
  placements,
  productId = '',
  onClose,
  onCreated,
  onError,
}: {
  placements: Placement[];
  productId?: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
  onError: (v: string) => void;
}) {
  const { t, dir } = useLocale();
  const steps = [
    t('ads.wizard.stepSetup') || 'Configuration',
    t('ads.wizard.stepCreative') || 'Créatif',
    t('ads.wizard.stepTargeting') || 'Ciblage',
    t('ads.wizard.stepReview') || 'Vérification',
  ];

  const [form, setForm] = useState<Form>({ ...blank, product_id: productId });
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [storeProducts, setStoreProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Restore saved draft
  useEffect(() => {
    try {
      const value = localStorage.getItem(KEY);
      if (value) {
        const saved = JSON.parse(value);
        setForm({ ...blank, ...saved.form, product_id: productId || saved.form?.product_id || '' });
        setStep(Math.min(3, saved.step || 0));
        setRestored(true);
      }
    } catch {
      localStorage.removeItem(KEY);
    }
  }, [productId]);

  // Persist draft
  useEffect(() => {
    const id = setTimeout(() => localStorage.setItem(KEY, JSON.stringify({ form, step })), 300);
    return () => clearTimeout(id);
  }, [form, step]);

  // Fetch store products for dropdown selection
  useEffect(() => {
    let mounted = true;
    setLoadingProducts(true);
    fetchWithCsrf('/api/pd/stores/me/products?limit=100', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const items: ProductOption[] = (data.data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          image_url: p.images?.[0]?.url || p.image_url || '',
        }));
        setStoreProducts(items);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoadingProducts(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const set = (patch: Partial<Form>) => setForm((v) => ({ ...v, ...patch }));

  const handleProductSelect = (selectedProduct: ProductOption) => {
    set({
      product_id: selectedProduct.id,
      creative_title: form.creative_title || selectedProduct.title,
      image_url: form.image_url || selectedProduct.image_url || '',
      destination_url: form.destination_url || `/hub/products/${selectedProduct.id}`,
    });
  };

  const valid = () => {
    if (step === 0) {
      if (!form.name.trim() || Number(form.daily_budget) <= 0 || Number(form.total_budget) < Number(form.daily_budget)) {
        return t('ads.wizard.validSetupErr') || 'Veuillez saisir un nom de campagne et des budgets valides.';
      }
    }
    if (step === 1) {
      if (!form.creative_title.trim()) {
        return t('ads.wizard.validTitleErr') || 'Veuillez saisir un titre pour votre créatif publicitaire.';
      }
      if (form.campaign_type === 'sponsored_product' && !form.product_id.trim()) {
        return t('ads.wizard.validProductErr') || 'Veuillez sélectionner ou indiquer un produit à sponsoriser.';
      }
    }
    if (step === 2) {
      if (!form.placement_ids.length) {
        return t('ads.wizard.validPlacementErr') || 'Veuillez sélectionner au moins un emplacement publicitaire.';
      }
      if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
        return t('ads.wizard.validScheduleErr') || 'La date de fin doit être postérieure à la date de début.';
      }
    }
    return '';
  };

  const next = () => {
    const e = valid();
    if (e) {
      setError(e);
      return;
    }
    setError('');
    setStep((v) => Math.min(3, v + 1));
  };

  // Estimate delivery calculation
  useEffect(() => {
    if (!form.placement_ids.length || Number(form.daily_budget) <= 0 || Number(form.total_budget) < Number(form.daily_budget)) {
      setEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const response = await fetchWithCsrf('/api/pd/ads/estimate', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pricing_model: form.pricing_model,
            bid_amount: Number(form.bid_amount),
            daily_budget: Number(form.daily_budget),
            total_budget: Number(form.total_budget),
            placement_ids: form.placement_ids,
            starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
            ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
          }),
        });
        const data = await response.json();
        setEstimate(response.ok ? data.estimate : null);
      } catch {
        setEstimate(null);
      } finally {
        setEstimating(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.pricing_model, form.bid_amount, form.daily_budget, form.total_budget, form.placement_ids, form.starts_at, form.ends_at]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      next();
      return;
    }
    setSaving(true);
    onError('');
    try {
      const r = await fetchWithCsrf('/api/pd/ads/campaigns', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, campaign_type: form.campaign_type, objective: form.objective, pricing_model: form.pricing_model,
          bid_amount: Number(form.bid_amount), daily_budget: Number(form.daily_budget), total_budget: Number(form.total_budget), placement_ids: form.placement_ids,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
          targeting: { locale: form.locale, category: form.category || undefined, device: form.device, audience: form.audience },
          creative: {
            title: form.creative_title, description: form.creative_description || undefined, image_url: form.image_url || undefined,
            product_id: form.product_id || undefined, cta_label: form.cta_label || undefined, destination_url: form.destination_url || undefined,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || 'Impossible de créer la campagne');
      localStorage.removeItem(KEY);
      await onCreated();
      onClose();
    } catch (x) {
      onError(x instanceof Error ? x.message : 'Impossible de créer la campagne');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs';

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );

  return (
    <div dir={dir} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 backdrop-blur-xs">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{t('ads.wizard.wizardTitle') || 'Créer une Campagne Sponsorisée'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">{t('ads.wizard.wizardSubtitle') || 'Votre progression est enregistrée automatiquement.'}</p>
            </div>
            <button type="button" aria-label="Fermer" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-4 grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-1">
            {steps.map((s, i) => (
              <li
                key={s}
                className={`rounded-lg py-1.5 text-center text-xs font-medium transition ${
                  i === step
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : i < step
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {i + 1}. {s}
              </li>
            ))}
          </ol>
        </header>

        {/* Content Body */}
        <main className="p-5 sm:p-6 space-y-4">
          {restored && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-700 dark:text-slate-300">
              <span>{t('ads.wizard.restoredNotice') || 'Brouillon précédent restauré.'}</span>
              <button
                type="button"
                className="font-medium text-slate-900 dark:text-white underline cursor-pointer"
                onClick={() => {
                  localStorage.removeItem(KEY);
                  setForm({ ...blank, product_id: productId });
                  setStep(0);
                  setRestored(false);
                }}
              >
                {t('ads.wizard.discard') || 'Effacer'}
              </button>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-medium text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Step 0: Setup */}
          {step === 0 && (
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('ads.wizard.campaignSetup') || 'Paramètres de la campagne'}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('ads.wizard.campaignName') || 'Nom de la campagne'}>
                  <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} placeholder="Ex: Promotion été 2026" />
                </Field>

                <Field label={t('ads.wizard.format') || 'Format'}>
                  <select value={form.campaign_type} onChange={(e) => set({ campaign_type: e.target.value })} className={inputClass}>
                    <option value="sponsored_product">{t('ads.wizard.sponsoredProductOpt') || 'Produit / Service sponsorisé'}</option>
                    <option value="sponsored_brand">{t('ads.wizard.sponsoredBrandOpt') || 'Bannière de marque'}</option>
                    <option value="sponsored_content">{t('ads.wizard.sponsoredContentOpt') || 'Contenu promotionnel'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.objective') || 'Objectif'}>
                  <select value={form.objective} onChange={(e) => set({ objective: e.target.value })} className={inputClass}>
                    <option value="awareness">{t('ads.wizard.awareness') || 'Notoriété'}</option>
                    <option value="traffic">{t('ads.wizard.traffic') || 'Trafic de boutique'}</option>
                    <option value="sales">{t('ads.wizard.sales') || 'Ventes directes'}</option>
                    <option value="conversions">{t('ads.wizard.conversions') || 'Conversions'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.pricing') || 'Modèle de tarification'}>
                  <select value={form.pricing_model} onChange={(e) => set({ pricing_model: e.target.value })} className={inputClass}>
                    <option value="cpc">{t('ads.wizard.cpc') || 'Coût par clic (CPC)'}</option>
                    <option value="cpm">{t('ads.wizard.cpm') || 'Coût par 1 000 impressions (CPM)'}</option>
                    <option value="fixed_daily">{t('ads.wizard.fixedDaily') || 'Forfait journalier'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.dailyBudget') || 'Budget quotidien (TND)'}>
                  <input type="number" min="0.001" step="0.001" value={form.daily_budget} onChange={(e) => set({ daily_budget: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.totalBudget') || 'Budget total (TND)'}>
                  <input type="number" min="0.001" step="0.001" value={form.total_budget} onChange={(e) => set({ total_budget: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.bidAmount') || 'Enchère max (TND)'}>
                  <input type="number" min="0" step="0.001" value={form.bid_amount} onChange={(e) => set({ bid_amount: e.target.value })} className={inputClass} />
                </Field>
              </div>
            </section>
          )}

          {/* Step 1: Creative */}
          {step === 1 && (
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('ads.wizard.stepCreative') || 'Visuel & Contenu publicitaire'}</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Rich Product Selector */}
                {form.campaign_type === 'sponsored_product' && (
                  <div className="sm:col-span-2 space-y-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 shadow-2xs">
                    <Field label={t('ads.wizard.selectProduct') || 'Sélectionner un produit du catalogue'}>
                      <RichProductSelector
                        products={storeProducts}
                        selectedId={form.product_id}
                        loading={loadingProducts}
                        onSelect={handleProductSelect}
                      />
                    </Field>

                    <Field label={t('ads.wizard.productId') || 'Identifiant du Produit'}>
                      <input
                        value={form.product_id}
                        onChange={(e) => set({ product_id: e.target.value })}
                        placeholder={t('ads.wizard.customProductId') || 'Ou collez un identifiant personnalisé...'}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}

                <div className="sm:col-span-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('ads.wizard.titleLabel') || 'Titre & Rédaction'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleProduct = storeProducts.find((p) => p.id === form.product_id);
                      const baseName = sampleProduct?.title || form.name || 'Produit PandaMarket';
                      const headlines = [
                        `Offre Spéciale : ${baseName} au meilleur prix !`,
                        `Sélection Premium : ${baseName} en livraison rapide`,
                        `Indispensable : ${baseName} disponible en stock limité`,
                      ];
                      const descriptions = [
                        `Découvrez ${baseName} sur PandaMarket. Qualité certifiée et commande sécurisée.`,
                        `Profitez d'une remise exclusive sur ${baseName}. Commandez dès maintenant.`,
                      ];
                      const randHead = headlines[Math.floor(Math.random() * headlines.length)];
                      const randDesc = descriptions[Math.floor(Math.random() * descriptions.length)];
                      set({ creative_title: randHead, creative_description: randDesc });
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Suggestions IA</span>
                  </button>
                </div>

                <Field label={t('ads.wizard.titleLabel') || 'Titre de l\'annonce'}>
                  <input value={form.creative_title} onChange={(e) => set({ creative_title: e.target.value })} className={inputClass} placeholder="Ex: Huile d'olive extra vierge" />
                </Field>

                <Field label={t('ads.wizard.imageLabel') || 'Image'}>
                  <div className="flex gap-2">
                    <input value={form.image_url} onChange={(e) => set({ image_url: e.target.value })} placeholder="URL de l'image" className={inputClass} />
                    <button
                      type="button"
                      onClick={() => setMediaOpen(true)}
                      className="shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 shadow-2xs cursor-pointer"
                    >
                      {t('ads.wizard.uploadLibrary') || 'Médiathèque'}
                    </button>
                  </div>
                </Field>

                <Field label={t('ads.wizard.ctaLabel') || 'Bouton d\'action'}>
                  <input value={form.cta_label} onChange={(e) => set({ cta_label: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.destinationUrl') || 'Lien de destination'}>
                  <input value={form.destination_url} onChange={(e) => set({ destination_url: e.target.value })} className={inputClass} placeholder="/hub/products/..." />
                </Field>

                <div className="sm:col-span-2">
                  <Field label={t('ads.wizard.descriptionLabel') || 'Description textuelle'}>
                    <textarea value={form.creative_description} onChange={(e) => set({ creative_description: e.target.value })} rows={2} className={inputClass} />
                  </Field>
                </div>
              </div>

              <AdsCreativePreview creative={form} />
            </section>
          )}

          {/* Step 2: Targeting */}
          {step === 2 && (
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('ads.wizard.stepTargeting') || 'Audience & Emplacements'}</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('ads.wizard.startsAt') || 'Date de début'}>
                  <input type="datetime-local" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.endsAt') || 'Date de fin'}>
                  <input type="datetime-local" value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.language') || 'Langue'}>
                  <select value={form.locale} onChange={(e) => set({ locale: e.target.value })} className={inputClass}>
                    <option value="all">{t('ads.wizard.allLanguages') || 'Toutes'}</option>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.device') || 'Appareils'}>
                  <select value={form.device} onChange={(e) => set({ device: e.target.value })} className={inputClass}>
                    <option value="all">{t('ads.wizard.allDevices') || 'Tous les appareils'}</option>
                    <option value="mobile">{t('ads.wizard.mobile') || 'Mobiles uniquement'}</option>
                    <option value="desktop">{t('ads.wizard.desktop') || 'Ordinateurs'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.audience') || 'Type d\'audience'}>
                  <select value={form.audience} onChange={(e) => set({ audience: e.target.value })} className={inputClass}>
                    <option value="all">{t('ads.wizard.allVisitors') || 'Tous les visiteurs'}</option>
                    <option value="new">{t('ads.wizard.newVisitors') || 'Nouveaux visiteurs'}</option>
                    <option value="returning">{t('ads.wizard.returningVisitors') || 'Clients récurrents'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.categorySlug') || 'Catégorie cible'}>
                  <input value={form.category} onChange={(e) => set({ category: e.target.value })} className={inputClass} placeholder="Ex: electronique" />
                </Field>
              </div>

              <fieldset className="space-y-2 pt-2">
                <legend className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('ads.wizard.placements') || 'Emplacements disponibles'}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {placements.map((p) => (
                    <label key={p.id} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs hover:border-slate-400 transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.placement_ids.includes(p.id)}
                        onChange={(e) =>
                          set({
                            placement_ids: e.target.checked ? [...form.placement_ids, p.id] : form.placement_ids.filter((id) => id !== p.id),
                          })
                        }
                        className="mt-0.5 h-3.5 w-3.5 rounded text-slate-900"
                      />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">{p.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {p.format} · {Number(p.default_price).toFixed(3)} TND
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>

              <EstimatePanel
                estimate={estimate}
                loading={estimating}
                apply={(bid, daily) => set({ bid_amount: String(bid), daily_budget: String(daily), total_budget: String(Math.max(Number(form.total_budget), daily)) })}
              />
            </section>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('ads.wizard.reviewTitle') || 'Récapitulatif de la campagne'}</h3>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  [t('ads.wizard.campaignSetup') || 'Campagne', `${form.name} · ${form.campaign_type.replaceAll('_', ' ')}`],
                  [t('ads.wizard.dailyBudget') || 'Budget', `${form.daily_budget} TND/jour · ${form.total_budget} TND total`],
                  [t('ads.wizard.audience') || 'Audience', `${form.locale} · ${form.device}${form.category ? ` · ${form.category}` : ''}`],
                  [t('ads.wizard.placements') || 'Emplacements', placements.filter((p) => form.placement_ids.includes(p.id)).map((p) => p.name).join(', ') || 'Aucun sélectionné'],
                ].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200/60 dark:border-slate-700">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{String(l)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white capitalize">{String(v)}</p>
                  </div>
                ))}
              </div>

              <EstimatePanel
                estimate={estimate}
                loading={estimating}
                apply={(bid, daily) => set({ bid_amount: String(bid), daily_budget: String(daily), total_budget: String(Math.max(Number(form.total_budget), daily)) })}
              />

              <AdsCreativePreview creative={form} formats={placements.filter((p) => form.placement_ids.includes(p.id)).map((p) => p.format)} />

              <p className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {t('ads.wizard.draftNotice') || 'Cette action crée une campagne en brouillon. Vous pourrez la soumettre pour examen dès que votre solde sera suffisant.'}
              </p>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 flex justify-between border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <button
            type="button"
            disabled={!step}
            onClick={() => {
              setError('');
              setStep((v) => Math.max(0, v - 1));
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t('ads.wizard.backBtn') || 'Retour'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
            >
              <span>{t('ads.wizard.continueBtn') || 'Continuer'}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>{saving ? t('ads.wizard.creatingBtn') || 'Création...' : t('ads.wizard.createDraftBtn') || 'Enregistrer le brouillon'}</span>
            </button>
          )}
        </footer>
      </form>

      <AdsCreativeMediaPicker open={mediaOpen} onClose={() => setMediaOpen(false)} onSelect={(image_url) => set({ image_url })} />
    </div>
  );
}

/**
 * Custom Rich Product Dropdown Selector Component with Pictures
 */
function RichProductSelector({
  products,
  selectedId,
  loading,
  onSelect,
}: {
  products: ProductOption[];
  selectedId: string;
  loading: boolean;
  onSelect: (prod: ProductOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedProduct = products.find((p) => p.id === selectedId);
  const filtered = products.filter(
    (p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900 dark:text-white" /> Chargement du catalogue...
      </div>
    );
  }

  return (
    <div className="relative mt-1">
      {/* Selector Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-left transition hover:border-slate-400 focus:outline-none shadow-2xs cursor-pointer"
      >
        {selectedProduct ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url ? getResizedImageUrl(selectedProduct.image_url, 'medium') : ''} alt={selectedProduct.title} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{selectedProduct.title}</p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{Number(selectedProduct.price).toFixed(3)} TND</p>
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400">-- Sélectionner un produit du catalogue --</span>
        )}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-xl">
          <div className="sticky top-0 bg-white dark:bg-slate-800 pb-1.5">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-xs text-slate-400">Aucun produit trouvé</p>
            ) : (
              filtered.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => {
                    onSelect(prod);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between p-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer ${
                    prod.id === selectedId ? 'bg-slate-50 dark:bg-slate-700/60 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      {prod.image_url ? (
                        <img src={prod.image_url ? getResizedImageUrl(prod.image_url, 'medium') : ''} alt={prod.title} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white line-clamp-1">{prod.title}</p>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{Number(prod.price).toFixed(3)} TND</p>
                    </div>
                  </div>
                  {prod.id === selectedId && <Check className="h-3.5 w-3.5 text-slate-900 dark:text-white" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EstimatePanel({ estimate, loading, apply }: { estimate: Estimate | null; loading: boolean; apply: (bid: number, daily: number) => void }) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 text-xs text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900 dark:text-white" />
        {t('ads.wizard.calculatingEstimate') || 'Estimation de la portée en cours…'}
      </div>
    );
  }
  if (!estimate) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 shadow-2xs space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('ads.wizard.estimatedDelivery') || 'Portée prévisionnelle'}</p>
          <p className="text-base font-semibold text-slate-900 dark:text-white font-mono mt-0.5">
            {estimate.range.low.toLocaleString()}–{estimate.range.high.toLocaleString()} {estimate.metric}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            Sur environ {estimate.estimated_days} jour{estimate.estimated_days > 1 ? 's' : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => apply(estimate.recommended_bid, estimate.recommended_daily_budget)}
          className="rounded-xl bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
        >
          {t('ads.wizard.applyRecommendation') || 'Appliquer les conseils'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-white dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
          <span className="text-slate-400 font-normal">{t('ads.wizard.suggestedBid') || 'Enchère recommandée'}:</span> {estimate.recommended_bid.toFixed(3)} TND
        </p>
        <p className="rounded-lg bg-white dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
          <span className="text-slate-400 font-normal">{t('ads.wizard.suggestedDaily') || 'Budget quotidien suggéré'}:</span> {estimate.recommended_daily_budget.toFixed(3)} TND
        </p>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{estimate.assumptions}</p>
    </div>
  );
}
