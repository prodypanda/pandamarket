import Link from 'next/link';
import { Store, ArrowLeft, Search } from 'lucide-react';

/**
 * Custom 404 page for non-existent store subdomains.
 * Displayed when `notFound()` is called from the store page
 * (e.g. when a customer visits a subdomain that doesn't match any store).
 *
 * Follows the PandaMarket design system:
 *   - Panda Green #16C784
 *   - Inter font (inherited from root layout)
 *   - Lucide icons
 */
export default function StoreNotFound() {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(22,199,132,0.18),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-12">
      <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-[#16C784]/10 blur-2xl" />
      <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-slate-900/10 blur-3xl" />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-8 text-center shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-10">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#16C784]/10 ring-1 ring-[#16C784]/15">
          <Store className="h-11 w-11 text-[#16C784]" />
        </div>

        {/* Heading */}
        <p className="mb-3 text-sm font-black uppercase tracking-[0.24em] text-[#16C784]">404</p>
        <h1 className="mb-3 text-3xl font-black text-gray-900 sm:text-4xl">
          Store Not Found
        </h1>

        {/* Description */}
        <p className="mx-auto mb-8 max-w-lg leading-7 text-gray-500">
          The store you&apos;re looking for doesn&apos;t exist or may have been
          removed. Check the URL or explore our marketplace.
        </p>

        {/* CTAs */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/hub"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16C784] px-6 py-3 font-black text-white shadow-lg shadow-[#16C784]/20 transition hover:-translate-y-0.5 hover:bg-[#14b576]"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Hub
          </Link>
          <Link
            href="/hub/search"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 font-black text-gray-700 transition hover:-translate-y-0.5 hover:bg-gray-50"
          >
            <Search className="h-4 w-4" />
            Search Products
          </Link>
        </div>
      </div>
    </div>
  );
}
