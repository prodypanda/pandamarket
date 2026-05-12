'use client';

import { AlertOctagon, Home, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { ErrorStatePage } from '../components/ErrorStatePage';
import './globals.css';

export default function GlobalError({
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
    <html lang="fr">
      <body>
        <ErrorStatePage
          eyebrow="Critical error"
          code="500"
          title="PandaMarket needs a refresh"
          description="A critical interface error occurred. Your account and orders are safe; refresh the page or return to the marketplace."
          icon={AlertOctagon}
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
            Reload interface
          </button>
        </ErrorStatePage>
      </body>
    </html>
  );
}
