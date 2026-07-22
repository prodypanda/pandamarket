'use client';

import { Building2, Megaphone, ShoppingBag } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

type Creative = { campaign_type: string; creative_title: string; creative_description: string; image_url: string; cta_label: string };

export function AdsCreativePreview({ creative, formats = [] }: { creative: Creative; formats?: string[] }) {
  const { t } = useLocale();
  const unique = [...new Set(formats.length ? formats : [creative.campaign_type === 'sponsored_brand' ? 'brand_card' : creative.campaign_type === 'sponsored_content' ? 'banner' : 'product_card'])];

  return (
    <section className="mt-5" aria-labelledby="creative-preview-title">
      <div className="flex items-center justify-between">
        <h4 id="creative-preview-title" className="text-xs font-black uppercase tracking-wider text-slate-500">
          {t('ads.wizard.placementPreviews') || 'Placement previews'}
        </h4>
        <span className="text-xs text-slate-400">
          {t('ads.wizard.approximateRendering') || 'Approximate marketplace rendering'}
        </span>
      </div>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        {unique.map((format) => (
          <Preview key={format} format={format} creative={creative} />
        ))}
      </div>
    </section>
  );
}

function Preview({ format, creative }: { format: string; creative: Creative }) {
  const title = creative.creative_title.trim() || 'Your sponsored headline';
  const description = creative.creative_description.trim() || 'Your campaign description appears here.';
  const cta = creative.cta_label.trim() || 'Learn more';

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  if (format === 'banner') {
    return (
      <div className="relative min-h-52 overflow-hidden rounded-2xl bg-slate-950 text-white md:col-span-2">
        {creative.image_url && (
          <img src={creative.image_url} alt="Banner preview" onError={handleImgError} className="absolute inset-0 h-full w-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent" />
        <div className="relative max-w-lg p-6">
          <Badge />
          <p className="mt-3 text-2xl font-black">{title}</p>
          <p className="mt-2 line-clamp-2 text-sm text-white/75">{description}</p>
          <span className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950">{cta}</span>
        </div>
        <Format value="Banner · 1200 × 320" />
      </div>
    );
  }

  if (format === 'brand_card' || creative.campaign_type === 'sponsored_brand') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
            {creative.image_url ? (
              <img src={creative.image_url} alt="Brand preview" onError={handleImgError} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <div className="min-w-0">
            <Badge />
            <p className="mt-2 truncate text-lg font-black">{title}</p>
            <p className="line-clamp-2 text-xs text-slate-500">{description}</p>
            <span className="mt-2 inline-block text-xs font-black text-emerald-700">{cta} →</span>
          </div>
        </div>
        <Format value="Sponsored brand card" />
      </div>
    );
  }

  if (format === 'product_card' || creative.campaign_type === 'sponsored_product') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="aspect-square max-h-52 bg-slate-100">
          {creative.image_url ? (
            <img src={creative.image_url} alt="Product preview" onError={handleImgError} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-slate-300" />
            </div>
          )}
        </div>
        <div className="p-4">
          <Badge />
          <p className="mt-2 line-clamp-2 font-black">{title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{description}</p>
        </div>
        <Format value="Sponsored product card" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-white">
      <div className="flex min-h-36 gap-4 p-4">
        <div className="flex w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          {creative.image_url ? (
            <img src={creative.image_url} alt="Content preview" onError={handleImgError} className="h-full w-full object-cover" />
          ) : (
            <Megaphone className="text-slate-300" />
          )}
        </div>
        <div>
          <Badge />
          <p className="mt-2 font-black">{title}</p>
          <p className="mt-1 line-clamp-3 text-xs text-slate-500">{description}</p>
          <span className="mt-3 inline-block rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white">{cta}</span>
        </div>
      </div>
      <Format value="Native sponsored content" />
    </div>
  );
}

function Badge() {
  return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800">Sponsored</span>;
}

function Format({ value }: { value: string }) {
  return <span className="absolute right-2 top-2 rounded-full bg-slate-950/75 px-2 py-1 text-[9px] font-bold text-white">{value}</span>;
}
