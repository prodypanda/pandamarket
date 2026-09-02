'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { Building2, Megaphone, ShoppingBag } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

type Creative = { campaign_type: string; creative_title: string; creative_description: string; image_url: string; cta_label: string };

export function AdsCreativePreview({ creative, formats = [] }: { creative: Creative; formats?: string[] }) {
  const { t } = useLocale();
  const unique = [...new Set(formats.length ? formats : [creative.campaign_type === 'sponsored_brand' ? 'brand_card' : creative.campaign_type === 'sponsored_content' ? 'banner' : 'product_card'])];

  return (
    <section className="space-y-2 pt-1" aria-labelledby="creative-preview-title">
      <div className="flex items-center justify-between">
        <h4 id="creative-preview-title" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t('ads.wizard.placementPreviews') || 'Aperçu du rendu publicitaire'}
        </h4>
        <span className="text-[11px] text-slate-400 font-normal">
          {t('ads.wizard.approximateRendering') || 'Rendu indicatif sur PandaMarket'}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {unique.map((format) => (
          <Preview key={format} format={format} creative={creative} />
        ))}
      </div>
    </section>
  );
}

function Preview({ format, creative }: { format: string; creative: Creative }) {
  const { t } = useLocale();
  const title = creative.creative_title.trim() || 'Titre de votre annonce sponsorisée';
  const description = creative.creative_description.trim() || 'Votre description publicitaire apparaîtra ici avec vos arguments clés.';
  const cta = creative.cta_label.trim() || t('ads.preview.ctaDefault') || 'Découvrir';

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  if (format === 'banner') {
    return (
      <div className="relative min-h-48 overflow-hidden rounded-xl bg-slate-950 text-white md:col-span-2 border border-slate-800 shadow-2xs">
        {creative.image_url && (
          <img
            src={creative.image_url ? getResizedImageUrl(creative.image_url, 'medium') : ''}
            alt="Bannière"
            onError={handleImgError}
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        <div className="relative max-w-lg p-5 space-y-2">
          <Badge />
          <p className="text-base font-semibold text-white tracking-tight leading-snug">{title}</p>
          <p className="line-clamp-2 text-xs text-slate-300 font-normal">{description}</p>
          <span className="inline-block rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-2xs">
            {cta}
          </span>
        </div>
        <Format value="Bannière · 1200 × 320" />
      </div>
    );
  }

  if (format === 'brand_card' || creative.campaign_type === 'sponsored_brand') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
            {creative.image_url ? (
              <img src={creative.image_url ? getResizedImageUrl(creative.image_url, 'medium') : ''} alt="Marque" onError={handleImgError} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Badge />
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{title}</p>
            <p className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400 font-normal">{description}</p>
            <span className="inline-block text-xs font-medium text-slate-900 dark:text-white underline">{cta} →</span>
          </div>
        </div>
        <Format value="Bannière Marque" />
      </div>
    );
  }

  if (format === 'product_card' || creative.campaign_type === 'sponsored_product') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
        <div className="aspect-square max-h-40 bg-slate-100 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
          {creative.image_url ? (
            <img src={creative.image_url ? getResizedImageUrl(creative.image_url, 'medium') : ''} alt="Produit" onError={handleImgError} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            </div>
          )}
        </div>
        <div className="p-3.5 space-y-1">
          <Badge />
          <p className="line-clamp-1 text-xs font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400 font-normal">{description}</p>
        </div>
        <Format value="Fiche Produit Sponsorisée" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
      <div className="flex min-h-28 gap-3.5 p-3.5">
        <div className="flex w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
          {creative.image_url ? (
            <img src={creative.image_url ? getResizedImageUrl(creative.image_url, 'medium') : ''} alt="Contenu" onError={handleImgError} className="h-full w-full object-cover" />
          ) : (
            <Megaphone className="h-5 w-5 text-slate-300 dark:text-slate-600" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Badge />
          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{title}</p>
          <p className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400 font-normal">{description}</p>
          <span className="mt-1 inline-block rounded-lg bg-slate-900 dark:bg-white px-2.5 py-1 text-[11px] font-medium text-white dark:text-slate-900 shadow-2xs">
            {cta}
          </span>
        </div>
      </div>
      <Format value="Contenu Promotionnel" />
    </div>
  );
}

function Badge() {
  return (
    <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
      Sponsorisé
    </span>
  );
}

function Format({ value }: { value: string }) {
  return (
    <span className="absolute right-2 top-2 rounded-md bg-slate-900/80 dark:bg-slate-800/90 px-1.5 py-0.5 text-[9px] font-medium text-white dark:text-slate-200 backdrop-blur-xs">
      {value}
    </span>
  );
}
