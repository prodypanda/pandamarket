'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Store } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '@/lib/themes';

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    themeCustomization?: ThemeCustomization;
  };
}

function StatusContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const storeHost = decodeURIComponent(params.storeHost as string);
  const orderId = searchParams.get('order') || searchParams.get('order_id');
  const statusParam = searchParams.get('status');

  const [store, setStore] = useState<StoreData | null>(null);

  useEffect(() => {
    async function loadStore() {
      try {
        const res = await fetchWithCsrf(`/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`);
        if (res.ok) {
          const data = await res.json();
          setStore(data.store);
        }
      } catch {
        // Fallback styling
      }
    }
    loadStore();
  }, [storeHost]);

  const activeTheme = store?.theme_id ? themes[store.theme_id] || themes.classic : themes.classic;
  const themeCustomization = (store?.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);
  const primaryColor = store?.settings?.colors?.primary || resolvedColors.primary;
  const pageBackground = resolvedColors.background;
  const textColor = resolvedColors.text;
  const mutedTextColor = `${textColor}99`;
  const surfaceColor = store?.settings?.colors?.secondary || resolvedColors.secondary;
  const borderColor = `${primaryColor}20`;

  return (
    <div className={`min-h-screen ${activeTheme.typography.fontFamily} flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8`} style={{ backgroundColor: pageBackground, color: textColor }}>
      <div className="max-w-md w-full text-center">
        <div className="rounded-2xl border p-8 sm:p-10 shadow-xs" style={{ backgroundColor: surfaceColor, borderColor }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-100 text-red-600">
            <AlertTriangle className="w-10 h-10" />
          </div>

          <h1 className="text-2xl font-extrabold mb-2" style={{ color: textColor }}>
            {statusParam === 'failed' ? 'Paiement non finalisé' : 'Statut de paiement'}
          </h1>

          <p className="text-sm mb-6" style={{ color: mutedTextColor }}>
            {statusParam === 'failed'
              ? `La transaction pour la commande #${orderId || ''} a été annulée ou n’a pas pu aboutir. Aucun montant n’a été débité.`
              : `Le statut du paiement pour la commande #${orderId || ''} est en cours de traitement.`}
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/checkout"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              <RefreshCcw className="w-4 h-4" />
              Réessayer le paiement
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              <Store className="w-4 h-4" />
              Retour à la boutique
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StorefrontCheckoutStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>}>
      <StatusContent />
    </Suspense>
  );
}
