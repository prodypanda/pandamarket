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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-[#16C784]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Store className="w-10 h-10 text-[#16C784]" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Store Not Found
        </h1>

        {/* Description */}
        <p className="text-gray-500 mb-8 leading-relaxed">
          The store you&apos;re looking for doesn&apos;t exist or may have been
          removed. Check the URL or explore our marketplace.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/hub"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#16C784] text-white font-medium rounded-full hover:bg-[#14b576] transition-colors shadow-lg shadow-[#16C784]/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Hub
          </Link>
          <Link
            href="/hub/search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            Search Products
          </Link>
        </div>
      </div>
    </div>
  );
}
