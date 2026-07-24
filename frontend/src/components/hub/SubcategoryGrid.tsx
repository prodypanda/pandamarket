import Link from 'next/link';
import { ArrowRight, Layers, Box } from 'lucide-react';
import { LazyBlurImage } from '../ui/LazyBlurImage';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  short_description?: string | null;
  image_url?: string | null;
  icon?: string | null;
  product_count?: number;
}

const TRANSLATIONS = {
  fr: {
    subcategoriesOf: (name: string) => `Sous-catégories de ${name}`,
    exploreSubtitle: 'Explorez par type de produit',
    subcatCount: (count: number) => `${count} sous-catégorie${count > 1 ? 's' : ''}`,
    productsCount: (count: number) => `${count} produit${count > 1 ? 's' : ''}`,
    view: 'Voir',
  },
  ar: {
    subcategoriesOf: (name: string) => `الأقسام الفرعية لـ ${name}`,
    exploreSubtitle: 'استكشف المنتجات حسب الفئة الفرعية',
    subcatCount: (count: number) => `${count} قسم فرعي`,
    productsCount: (count: number) => `${count} منتج`,
    view: 'عرض',
  },
  en: {
    subcategoriesOf: (name: string) => `Subcategories in ${name}`,
    exploreSubtitle: 'Explore by product type',
    subcatCount: (count: number) => `${count} subcategor${count > 1 ? 'ies' : 'y'}`,
    productsCount: (count: number) => `${count} product${count > 1 ? 's' : ''}`,
    view: 'View',
  },
};

export function SubcategoryGrid({
  parentName,
  subcategories,
  locale = 'fr',
  isV2Showcase = false,
}: {
  parentName: string;
  subcategories: Subcategory[];
  locale?: string;
  isV2Showcase?: boolean;
}) {
  if (!subcategories || subcategories.length === 0) return null;

  const isRtl = locale === 'ar';
  const i18n = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.fr;

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-[#ff6a00] border border-orange-100 shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {i18n.subcategoriesOf(parentName)}
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              {i18n.exploreSubtitle}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3.5 py-1 text-xs font-extrabold text-slate-700">
          {i18n.subcatCount(subcategories.length)}
        </span>
      </div>

      {isV2Showcase ? (
        /* Large Picture Subcategory Card Grid for V2 Modern Showcase */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/hub/category/${encodeURIComponent(sub.slug)}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"
            >
              {/* Big 160px Tall Subcategory Picture Box */}
              <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-slate-100">
                {sub.image_url ? (
                  <LazyBlurImage
                    src={sub.image_url}
                    alt={sub.name}
                    containerClassName="h-full w-full"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-2xl">
                    {sub.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex flex-col">
                  <span className="text-xs sm:text-sm font-black text-white truncate drop-shadow-md">
                    {sub.name}
                  </span>
                  {sub.short_description && (
                    <span className="text-[10px] font-semibold text-slate-200 line-clamp-1 opacity-90 drop-shadow-xs">
                      {sub.short_description}
                    </span>
                  )}
                </div>
              </div>

              {/* Compact Info Footer */}
              <div className="p-3 flex items-center justify-between border-t border-slate-100 bg-white">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#ff6a00]">
                  <Box className="h-3.5 w-3.5" />
                  {i18n.productsCount(sub.product_count || 0)}
                </span>
                <span className="text-xs font-bold text-slate-400 group-hover:text-[#ff6a00] transition-colors">
                  {i18n.view} ➔
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Compact Thumbnail Grid for V1 Classic */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/hub/category/${encodeURIComponent(sub.slug)}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-orange-300 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                {sub.image_url ? (
                  <LazyBlurImage
                    src={sub.image_url}
                    alt={sub.name}
                    containerClassName="h-10 w-10 shrink-0 rounded-xl border border-slate-200 shadow-xs"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100/70 font-black text-[#ff6a00] text-sm shadow-xs border border-orange-200/50">
                    {sub.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-slate-900 group-hover:text-[#ff6a00] transition-colors">
                    {sub.name}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400">
                    {i18n.productsCount(sub.product_count || 0)}
                  </p>
                </div>
              </div>
              <div className={`mt-3 flex items-center justify-end text-[10px] font-extrabold uppercase text-[#ff6a00] opacity-0 group-hover:opacity-100 transition-opacity`}>
                <span>{i18n.view}</span>
                <ArrowRight className={`ml-1 h-3 w-3 ${isRtl ? 'rotate-180 mr-1 ml-0' : ''}`} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
