'use client';

import { AlertTriangle, BarChart3, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { ErrorStatePage } from '@/components/ErrorStatePage';

export default function AdminErrorPage({
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
      eyebrow="Admin error"
      code="500"
      title="Admin screen failed to load"
      description="A temporary issue interrupted this admin tool. Retry the screen or return to the dashboard."
      icon={AlertTriangle}
      actions={[
        { href: '/dashboard', label: 'Admin dashboard', icon: BarChart3, variant: 'secondary' },
      ]}
    >
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
      >
        <RotateCcw className="h-4 w-4" />
        Retry admin screen
      </button>
    </ErrorStatePage>
  );
}
