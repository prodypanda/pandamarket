'use client';

import { Home, RefreshCcw, ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';
import { ErrorStatePage } from '../../components/ErrorStatePage';

export default function HubErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorStatePage
      eyebrow="Marketplace hub"
      code="500"
      title="The hub hit a temporary problem"
      description="Your shopping session is safe. Retry this page or return to the hub home to continue browsing."
      icon={ShoppingBag}
      actions={[
        { href: '/hub', label: 'Hub home', icon: Home, variant: 'secondary' },
      ]}
    >
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16C784] px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#14b576]"
      >
        <RefreshCcw className="h-4 w-4" />
        Try again
      </button>
    </ErrorStatePage>
  );
}
