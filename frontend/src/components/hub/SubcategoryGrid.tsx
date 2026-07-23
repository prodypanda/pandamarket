import Link from 'next/link';
import { ArrowRight, Layers, Box } from 'lucide-react';

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
}: {
  parentName: string;
  subcategories: Subcategory[];
  locale?: string;
}) {
  if (!subcategories || subcategories.length === 0) return null;

  const isRtl = locale === 'ar';
  const i18n = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.fr;

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-[#ff6a00] border border-orange-100 shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {subcategories.map((sub) => (
          <Link
            key={sub.id}
            href={`/hub/category/${encodeURIComponent(sub.slug)}`}
            className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-orange-300 hover:bg-white hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              {sub.image_url ? (
                <img
                  src={sub.image_url}
                  alt={sub.name}
                  className="h-10 w-10 shrink-0 rounded-xl object-cover border border-slate-200 shadow-xs"
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
    </section>
  );
}
