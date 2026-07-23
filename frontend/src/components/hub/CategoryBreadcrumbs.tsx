import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface Ancestor {
  id: string;
  name: string;
  slug: string;
}

export function CategoryBreadcrumbs({ ancestors, locale = 'fr' }: { ancestors: Ancestor[]; locale?: string }) {
  if (!ancestors || !ancestors.length) return null;

  const isRtl = locale === 'ar';
  const homeLabel = locale === 'ar' ? 'الرئيسية' : locale === 'en' ? 'Home' : 'Accueil';

  return (
    <nav dir={isRtl ? 'rtl' : 'ltr'} aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
      <Link
        href="/hub"
        className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
      >
        <Home className="h-3.5 w-3.5 text-orange-500" />
        <span>{homeLabel}</span>
      </Link>

      {ancestors.map((item, idx) => {
        const isLast = idx === ancestors.length - 1;
        return (
          <div key={item.id} className="flex items-center gap-2">
            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 ${isRtl ? 'rotate-180' : ''}`} />
            {isLast ? (
              <span className="font-extrabold text-slate-900">{item.name}</span>
            ) : (
              <Link
                href={`/hub/category/${item.slug}`}
                className="hover:text-slate-900 transition-colors"
              >
                {item.name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
