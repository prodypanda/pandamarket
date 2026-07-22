import Link from 'next/link';
import { ArrowRight, Layers } from 'lucide-react';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  short_description?: string | null;
  image_url?: string | null;
  product_count?: number;
}

export function SubcategoryGrid({
  parentName,
  subcategories,
}: {
  parentName: string;
  subcategories: Subcategory[];
}) {
  if (!subcategories || subcategories.length === 0) return null;

  return (
    <section className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              Sous-catégories de {parentName}
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Explorez par type de produit
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {subcategories.length} sub-categories
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {subcategories.map((sub) => (
          <Link
            key={sub.id}
            href={`/hub/category/${sub.slug}`}
            className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:-translate-y-1 hover:border-amber-200 hover:bg-amber-50/50 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              {sub.image_url ? (
                <img
                  src={sub.image_url}
                  alt={sub.name}
                  className="h-10 w-10 shrink-0 rounded-xl object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100/60 font-black text-amber-800 text-sm">
                  {sub.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-900 group-hover:text-amber-800">
                  {sub.name}
                </p>
                <p className="text-[11px] font-bold text-slate-400">
                  {sub.product_count || 0} produits
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end text-[10px] font-extrabold uppercase text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Voir</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
