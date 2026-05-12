'use client';

import { Home, RefreshCcw, Store } from 'lucide-react';
import { useEffect } from 'react';
import { ErrorStatePage } from '../../../components/ErrorStatePage';

export default function StoreErrorPage({
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
      eyebrow="Storefront error"
      code="500"
      title="This store couldn’t load"
      description="The storefront hit a temporary problem. You can retry the store page or return to the marketplace hub."
      icon={Store}
      actions={[
        { href: '/hub', label: 'Marketplace hub', icon: Home, variant: 'secondary' },
      ]}
    >
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16C784] px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#14b576]"
      >
        <RefreshCcw className="h-4 w-4" />
        Reload store
      </button>
    </ErrorStatePage>
  );
}
