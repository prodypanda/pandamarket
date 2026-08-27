'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Loader2, Package, Clock, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HubNavbar } from '../../../../components/hub/HubNavbar';
import { HubFooter } from '../../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../../hooks/useMarketplaceTheme';
import { fetchWithCsrf } from '@/lib/api';

type MarketplaceThemeClasses = ReturnType<typeof useMarketplaceTheme>['classes'];

interface OrderSummary {
  id: string;
  payment_status: 'paid' | 'captured' | 'authorized' | 'payment_required' | 'pending' | 'failed' | string;
  payment_gateway?: string;
  total?: string | number;
  status?: string;
}

function SuccessContent({ classes }: { classes: MarketplaceThemeClasses }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id') || searchParams.get('order');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetchWithCsrf(`/api/pd/orders/${encodeURIComponent(orderId)}`)
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return data?.order || data?.data || null;
      })
      .then((ord) => {
        if (isMounted) {
          setOrder(ord);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className={`${classes.panel} max-w-2xl mx-auto mt-20 p-12 text-center flex flex-col items-center justify-center space-y-4`}>
        <Loader2 className={`w-10 h-10 animate-spin ${classes.primaryText}`} />
        <p className="text-gray-600 font-medium text-base">Vérification du statut du paiement...</p>
      </div>
    );
  }

  // Case 1: Payment explicitly failed
  if (order?.payment_status === 'failed') {
    return (
      <div className={`${classes.panel} max-w-2xl mx-auto mt-20 relative overflow-hidden p-10 text-center lg:p-16`}>
        <div className="w-20 h-20 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-sm">
          <XCircle className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Échec du paiement</h1>
        <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
          La transaction pour la commande <strong className="text-gray-900">{orderId}</strong> n&apos;a pas pu aboutir ou a été annulée. Aucun débit n&apos;a été effectué.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/hub/cart"
            className={`px-8 py-3.5 font-black rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
          >
            Retourner au panier
          </Link>
          <Link
            href={orderId ? `/hub/orders?highlight=${encodeURIComponent(orderId)}` : '/hub/orders'}
            className="px-8 py-3.5 bg-white text-gray-900 font-bold rounded-full border border-gray-200 hover:bg-gray-50 transition-colors flex justify-center items-center"
          >
            Voir la commande <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  // Case 2: Payment pending / verification required (e.g. Mandat or offline bank payment)
  if (order?.payment_status === 'payment_required' || order?.payment_status === 'pending') {
    return (
      <div className={`${classes.panel} max-w-2xl mx-auto mt-20 relative overflow-hidden p-10 text-center lg:p-16`}>
        <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-8 border border-amber-100 shadow-sm">
          <Clock className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Paiement en attente</h1>
        <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
          Votre commande <strong className="text-gray-900">{orderId}</strong> a bien été enregistrée. Elle sera traitée dès réception et validation de votre règlement.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/hub"
            className="px-8 py-3.5 font-bold text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            Accueil
          </Link>
          <Link
            href={orderId ? `/hub/orders?highlight=${encodeURIComponent(orderId)}` : '/hub/orders'}
            className={`px-8 py-3.5 font-black rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient} flex justify-center items-center`}
          >
            Suivre ma commande <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  // Case 3: Payment verified / confirmed (or fallback if payment succeeded)
  return (
    <div className={`${classes.panel} max-w-2xl mx-auto mt-20 relative overflow-hidden p-10 text-center lg:p-16`}>
      {/* Decorative background circle */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl -z-10 ${classes.primarySoft}`}></div>
      
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 ${classes.primarySoft}`}>
        <CheckCircle className="w-10 h-10" />
      </div>
      
      <h1 className="text-4xl font-black text-gray-900 mb-4">Paiement Confirmé !</h1>
      <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
        Merci pour votre commande. Votre commande <strong className="text-gray-900">{orderId}</strong> a été validée et est en cours de préparation par le vendeur.
      </p>

      <div className="bg-gray-50 rounded-2xl p-6 mb-10 flex items-center justify-center space-x-4 border border-gray-100">
        <Package className="w-6 h-6 text-gray-400" />
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900">Suivi de livraison</p>
          <p className="text-sm text-gray-500">Les détails de livraison et de suivi seront envoyés à votre email.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Link 
          href="/hub"
          className={`px-8 py-3.5 font-black rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href={orderId ? `/hub/orders?highlight=${encodeURIComponent(orderId)}` : '/hub/orders'}
          className="px-8 py-3.5 bg-white text-gray-900 font-bold rounded-full border border-gray-200 hover:bg-gray-50 transition-colors flex justify-center items-center"
        >
          Voir ma commande <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  const { settings, classes } = useMarketplaceTheme();

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className={`w-8 h-8 animate-spin ${classes.primaryText}`} /></div>}>
          <SuccessContent classes={classes} />
        </Suspense>
      </div>
      <HubFooter {...settings} />
    </div>
  );
}
