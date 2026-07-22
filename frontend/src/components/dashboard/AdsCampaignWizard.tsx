'use client';

import { fetchWithCsrf } from '@/lib/api';
import { ChevronLeft, ChevronRight, Loader2, Package, X } from 'lucide-react';
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
    t('ads.wizard.stepSetup') || 'Setup',
    t('ads.wizard.stepCreative') || 'Creative',
    t('ads.wizard.stepTargeting') || 'Targeting',
    t('ads.wizard.stepReview') || 'Review',
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

  const handleProductSelect = (selectedId: string) => {
    if (!selectedId) {
      set({ product_id: '' });
      return;
    }
    const found = storeProducts.find((p) => p.id === selectedId);
    if (found) {
      set({
        product_id: found.id,
        creative_title: form.creative_title || found.title,
        image_url: form.image_url || found.image_url || '',
        destination_url: form.destination_url || `/hub/products/${found.id}`,
      });
    } else {
      set({ product_id: selectedId });
    }
  };

  const valid = () => {
    if (step === 0) {
      if (!form.name.trim() || Number(form.daily_budget) <= 0 || Number(form.total_budget) < Number(form.daily_budget)) {
        return t('ads.wizard.validSetupErr') || 'Enter a valid campaign name and budgets.';
      }
    }
    if (step === 1) {
      if (!form.creative_title.trim()) {
        return t('ads.wizard.validTitleErr') || 'Enter a title for your campaign creative.';
      }
      if (form.campaign_type === 'sponsored_product' && !form.product_id.trim()) {
        return t('ads.wizard.validProductErr') || 'Select or enter a product/service to sponsor.';
      }
    }
    if (step === 2) {
      if (!form.placement_ids.length) {
        return t('ads.wizard.validPlacementErr') || 'Select at least one placement slot.';
      }
      if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
        return t('ads.wizard.validScheduleErr') || 'End date must be after the start date.';
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
      if (!r.ok) throw new Error(d.error?.message || 'Unable to create campaign');
      localStorage.removeItem(KEY);
      await onCreated();
      onClose();
    } catch (x) {
      onError(x instanceof Error ? x.message : 'Unable to create campaign');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold text-slate-900 normal-case focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none';

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
      {label}
      {children}
    </label>
  );

  return (
    <div dir={dir} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{t('ads.wizard.wizardTitle') || 'Create sponsored campaign'}</h2>
              <p className="text-sm text-slate-500">{t('ads.wizard.wizardSubtitle') || 'Progress saves automatically on this device.'}</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <ol className="mt-5 grid grid-cols-4 gap-2">
            {steps.map((s, i) => (
              <li
                key={s}
                className={`rounded-xl p-2 text-center text-xs font-black transition ${
                  i === step ? 'bg-emerald-600 text-white' : i < step ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i + 1}. {s}
              </li>
            ))}
          </ol>
        </header>

        {/* Content Body */}
        <main className="p-6">
          {restored && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">
              <span>{t('ads.wizard.restoredNotice') || 'Saved progress restored.'}</span>
              <button
                type="button"
                className="font-black text-blue-900 underline"
                onClick={() => {
                  localStorage.removeItem(KEY);
                  setForm({ ...blank, product_id: productId });
                  setStep(0);
                  setRestored(false);
                }}
              >
                {t('ads.wizard.discard') || 'Discard'}
              </button>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {/* Step 0: Setup */}
          {step === 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">{t('ads.wizard.campaignSetup') || 'Campaign setup'}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('ads.wizard.campaignName') || 'Campaign name'}>
                  <input autoFocus value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} placeholder="e.g. Summer Promotion Campaign" />
                </Field>

                <Field label={t('ads.wizard.format') || 'Format'}>
                  <select value={form.campaign_type} onChange={(e) => set({ campaign_type: e.target.value })} className={inputClass}>
                    <option value="sponsored_product">{t('ads.wizard.sponsoredProductOpt') || 'Sponsored product / service'}</option>
                    <option value="sponsored_brand">{t('ads.wizard.sponsoredBrandOpt') || 'Sponsored brand'}</option>
                    <option value="sponsored_content">{t('ads.wizard.sponsoredContentOpt') || 'Sponsored content'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.objective') || 'Objective'}>
                  <select value={form.objective} onChange={(e) => set({ objective: e.target.value })} className={inputClass}>
                    <option value="awareness">{t('ads.wizard.awareness') || 'Awareness'}</option>
                    <option value="traffic">{t('ads.wizard.traffic') || 'Traffic'}</option>
                    <option value="sales">{t('ads.wizard.sales') || 'Sales'}</option>
                    <option value="conversions">{t('ads.wizard.conversions') || 'Conversions'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.pricing') || 'Pricing model'}>
                  <select value={form.pricing_model} onChange={(e) => set({ pricing_model: e.target.value })} className={inputClass}>
                    <option value="cpc">{t('ads.wizard.cpc') || 'Cost per click (CPC)'}</option>
                    <option value="cpm">{t('ads.wizard.cpm') || 'Cost per 1,000 impressions (CPM)'}</option>
                    <option value="fixed_daily">{t('ads.wizard.fixedDaily') || 'Fixed daily rate'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.dailyBudget') || 'Daily budget (TND)'}>
                  <input type="number" min="0.001" step="0.001" value={form.daily_budget} onChange={(e) => set({ daily_budget: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.totalBudget') || 'Total budget (TND)'}>
                  <input type="number" min="0.001" step="0.001" value={form.total_budget} onChange={(e) => set({ total_budget: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.bidAmount') || 'Bid / rate (TND)'}>
                  <input type="number" min="0" step="0.001" value={form.bid_amount} onChange={(e) => set({ bid_amount: e.target.value })} className={inputClass} />
                </Field>
              </div>
            </section>
          )}

          {/* Step 1: Creative */}
          {step === 1 && (
            <section className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">{t('ads.wizard.stepCreative') || 'Creative'}</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Product Dropdown Selection for Sponsored Product */}
                {form.campaign_type === 'sponsored_product' && (
                  <div className="sm:col-span-2 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <Field label={t('ads.wizard.selectProduct') || 'Select product or service'}>
                      {loadingProducts ? (
                        <div className="mt-1 flex items-center gap-2 p-3 text-xs font-bold text-emerald-700 bg-white rounded-xl border">
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Loading store catalog...
                        </div>
                      ) : (
                        <select value={form.product_id} onChange={(e) => handleProductSelect(e.target.value)} className={inputClass}>
                          <option value="">{t('ads.wizard.chooseProduct') || '-- Select from your store catalog --'}</option>
                          {storeProducts.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.title} ({Number(prod.price).toFixed(3)} TND) — ID: {prod.id}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>

                    <Field label={t('ads.wizard.productId') || 'Product / Service ID'}>
                      <input
                        value={form.product_id}
                        onChange={(e) => set({ product_id: e.target.value })}
                        placeholder={t('ads.wizard.customProductId') || 'Or enter custom Product ID...'}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}

                <Field label={t('ads.wizard.titleLabel') || 'Title'}>
                  <input value={form.creative_title} onChange={(e) => set({ creative_title: e.target.value })} className={inputClass} placeholder="e.g. Best Olive Oil in Tunisia" />
                </Field>

                <Field label={t('ads.wizard.imageLabel') || 'Image'}>
                  <div className="mt-1 flex gap-2">
                    <input value={form.image_url} onChange={(e) => set({ image_url: e.target.value })} placeholder="Image URL" className={`${inputClass} mt-0`} />
                    <button
                      type="button"
                      onClick={() => setMediaOpen(true)}
                      className="shrink-0 rounded-xl border border-emerald-600 px-4 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
                    >
                      {t('ads.wizard.uploadLibrary') || 'Upload / Library'}
                    </button>
                  </div>
                </Field>

                <Field label={t('ads.wizard.ctaLabel') || 'CTA'}>
                  <input value={form.cta_label} onChange={(e) => set({ cta_label: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.destinationUrl') || 'Destination URL'}>
                  <input value={form.destination_url} onChange={(e) => set({ destination_url: e.target.value })} className={inputClass} placeholder="e.g. /hub/products/..." />
                </Field>

                <div className="sm:col-span-2">
                  <Field label={t('ads.wizard.descriptionLabel') || 'Description'}>
                    <textarea value={form.creative_description} onChange={(e) => set({ creative_description: e.target.value })} rows={3} className={inputClass} />
                  </Field>
                </div>
              </div>

              <AdsCreativePreview creative={form} />
            </section>
          )}

          {/* Step 2: Targeting */}
          {step === 2 && (
            <section className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">{t('ads.wizard.stepTargeting') || 'Targeting'}</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('ads.wizard.startsAt') || 'Starts'}>
                  <input type="datetime-local" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.endsAt') || 'Ends'}>
                  <input type="datetime-local" value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} className={inputClass} />
                </Field>

                <Field label={t('ads.wizard.language') || 'Language'}>
                  <select value={form.locale} onChange={(e) => set({ locale: e.target.value })} className={inputClass}>
                    <option value="all">{t('ads.wizard.allLanguages') || 'All'}</option>
                    <option value="fr">Français (French)</option>
                    <option value="en">English</option>
                    <option value="ar">العربية (Arabic)</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.device') || 'Device'}>
                  <select value={form.device} onChange={(e) => set({ device: e.target.value })} className={inputClass}>
                    <option value="all">{t('ads.wizard.allDevices') || 'All'}</option>
                    <option value="mobile">{t('ads.wizard.mobile') || 'Mobile'}</option>
                    <option value="desktop">{t('ads.wizard.desktop') || 'Desktop'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.audience') || 'Audience'}>
                  <select value={form.audience} onChange={(e) => set({ audience: e.target.value })} className={inputClass}>
                    <option value="all">{t('ads.wizard.allVisitors') || 'All visitors'}</option>
                    <option value="new">{t('ads.wizard.newVisitors') || 'New visitors'}</option>
                    <option value="returning">{t('ads.wizard.returningVisitors') || 'Returning visitors'}</option>
                  </select>
                </Field>

                <Field label={t('ads.wizard.categorySlug') || 'Category slug'}>
                  <input value={form.category} onChange={(e) => set({ category: e.target.value })} className={inputClass} placeholder="e.g. electronics" />
                </Field>
              </div>

              <fieldset className="mt-5 space-y-2">
                <legend className="text-xs font-black uppercase text-slate-500">{t('ads.wizard.placements') || 'Placements'}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {placements.map((p) => (
                    <label key={p.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold transition hover:border-emerald-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.placement_ids.includes(p.id)}
                        onChange={(e) =>
                          set({
                            placement_ids: e.target.checked ? [...form.placement_ids, p.id] : form.placement_ids.filter((id) => id !== p.id),
                          })
                        }
                        className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-black text-slate-900">{p.name}</span>
                        <small className="block font-medium text-slate-500">
                          {p.format} · {Number(p.default_price).toFixed(3)} TND
                        </small>
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
              <h3 className="text-lg font-black text-slate-900">{t('ads.wizard.reviewTitle') || 'Review & summary'}</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [t('ads.wizard.campaignSetup') || 'Campaign', `${form.name} · ${form.campaign_type.replaceAll('_', ' ')}`],
                  [t('ads.wizard.dailyBudget') || 'Budget', `${form.daily_budget} TND/day · ${form.total_budget} TND total`],
                  [t('ads.wizard.audience') || 'Audience', `${form.locale} · ${form.device}${form.category ? ` · ${form.category}` : ''}`],
                  [t('ads.wizard.placements') || 'Placements', placements.filter((p) => form.placement_ids.includes(p.id)).map((p) => p.name).join(', ') || 'None selected'],
                ].map(([l, v]) => (
                  <div key={String(l)} className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400">{String(l)}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 capitalize">{String(v)}</p>
                  </div>
                ))}
              </div>

              <EstimatePanel
                estimate={estimate}
                loading={estimating}
                apply={(bid, daily) => set({ bid_amount: String(bid), daily_budget: String(daily), total_budget: String(Math.max(Number(form.total_budget), daily)) })}
              />

              <AdsCreativePreview creative={form} formats={placements.filter((p) => form.placement_ids.includes(p.id)).map((p) => p.format)} />

              <p className="rounded-2xl bg-amber-50 p-4 text-xs font-semibold text-amber-800 border border-amber-200">
                {t('ads.wizard.draftNotice') || 'This creates a draft campaign. Submit it for review when funded and ready.'}
              </p>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 flex justify-between border-t bg-white p-5">
          <button
            type="button"
            disabled={!step}
            onClick={() => {
              setError('');
              setStep((v) => Math.max(0, v - 1));
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('ads.wizard.backBtn') || 'Back'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
            >
              {t('ads.wizard.continueBtn') || 'Continue'}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/20"
            >
              {saving ? t('ads.wizard.creatingBtn') || 'Creating...' : t('ads.wizard.createDraftBtn') || 'Create draft'}
            </button>
          )}
        </footer>
      </form>

      <AdsCreativeMediaPicker open={mediaOpen} onClose={() => setMediaOpen(false)} onSelect={(image_url) => set({ image_url })} />
    </div>
  );
}

function EstimatePanel({ estimate, loading, apply }: { estimate: Estimate | null; loading: boolean; apply: (bid: number, daily: number) => void }) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700 border border-emerald-200">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
        {t('ads.wizard.calculatingEstimate') || 'Calculating delivery estimate…'}
      </div>
    );
  }
  if (!estimate) return null;
  return (
    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-emerald-700">{t('ads.wizard.estimatedDelivery') || 'Estimated delivery'}</p>
          <p className="mt-1 text-2xl font-black text-emerald-950">
            {estimate.range.low.toLocaleString()}–{estimate.range.high.toLocaleString()} {estimate.metric}
          </p>
          <p className="text-xs text-emerald-800">
            Across approximately {estimate.estimated_days} day{estimate.estimated_days === 1 ? '' : 's'}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => apply(estimate.recommended_bid, estimate.recommended_daily_budget)}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800 transition"
        >
          {t('ads.wizard.applyRecommendation') || 'Apply recommendation'}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-white/80 p-2 font-semibold">
          <b>{t('ads.wizard.suggestedBid') || 'Suggested bid'}:</b> {estimate.recommended_bid.toFixed(3)} TND
        </p>
        <p className="rounded-lg bg-white/80 p-2 font-semibold">
          <b>{t('ads.wizard.suggestedDaily') || 'Suggested daily'}:</b> {estimate.recommended_daily_budget.toFixed(3)} TND
        </p>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-emerald-800 font-medium">{estimate.assumptions}</p>
    </div>
  );
}
