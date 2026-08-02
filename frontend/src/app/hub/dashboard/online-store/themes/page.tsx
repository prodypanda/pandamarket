'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnlineStoreThemesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hub/dashboard/settings?tab=theme');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500">
      Redirection vers la sélection des thèmes...
    </div>
  );
}
