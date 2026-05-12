'use client';

import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { ErrorStatePage } from '../components/ErrorStatePage';

export default function ErrorPage({
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
      eyebrow="Something went wrong"
      code="500"
      title="This page couldn’t load"
      description="A temporary issue interrupted the page. You can retry now or return to the marketplace while we keep the rest of the platform available."
      icon={AlertTriangle}
      actions={[
        { href: '/hub', label: 'Go to marketplace', icon: Home, variant: 'secondary' },
      ]}
    >
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16C784] px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#14b576]"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </ErrorStatePage>
  );
}
