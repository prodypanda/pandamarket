'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { User, MapPin, Package, Shield, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';

interface CustomerProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_verified: boolean;
  created_at: string;
}

export default function StorefrontAccountOverviewPage() {
  const params = useParams();
  const storeHost = decodeURIComponent(params.storeHost as string);

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [routeBase, setRouteBase] = useState('');

  useEffect(() => {
    if (window.location.pathname.startsWith('/store/')) {
      setRouteBase(`/store/${encodeURIComponent(storeHost)}`);
    }
  }, [storeHost]);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, ordersRes, addrsRes] = await Promise.all([
          fetchWithCsrf('/api/pd/storefront/account/me'),
          fetchWithCsrf('/api/pd/orders/storefront/me'),
          fetchWithCsrf('/api/pd/storefront/account/addresses'),
        ]);

        if (meRes.ok) {
          const data = await meRes.json();
          setCustomer(data.customer || data.data);
        }

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrderCount(data.data?.length || data.orders?.length || 0);
        }

        if (addrsRes.ok) {
          const data = await addrsRes.json();
          setAddressCount(data.addresses?.length || data.data?.length || 0);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [storeHost]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour, {customer?.first_name || customer?.email} !
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Bienvenue sur votre espace client. Gérez votre profil, vos adresses et vos commandes.
            </p>
          </div>
          {customer?.email_verified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Email vérifié
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" /> Email non vérifié
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Commandes</span>
            <Package className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-gray-900">{orderCount}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Adresses enregistrées</span>
            <MapPin className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-gray-900">{addressCount}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sécurité</span>
            <Shield className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-sm font-semibold text-emerald-600">Compte sécurisé</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3">Actions rapides</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`${routeBase}/account/profile`}
            className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-gray-900">Modifier mon profil</p>
                <p className="text-xs text-gray-500">Nom, téléphone, email</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            href={`${routeBase}/account/addresses`}
            className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-gray-900">Gérer mes adresses</p>
                <p className="text-xs text-gray-500">Ajouter ou modifier vos adresses</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            href={`${routeBase}/account/orders`}
            className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-gray-900">Voir mes commandes</p>
                <p className="text-xs text-gray-500">Suivi et historique d’achats</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            href={`${routeBase}/account/security`}
            className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-gray-900">Sécurité & Sessions</p>
                <p className="text-xs text-gray-500">Changer mot de passe & appareils</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
