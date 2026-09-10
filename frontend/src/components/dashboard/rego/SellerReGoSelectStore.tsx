'use client';

import React from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Globe,
  Clock,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import { getStorefrontUrl } from '@/lib/store-hosts';

export interface SellerStore {
  id: string;
  name: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
  subscription_plan?: string | null;
  seller_type?: string | null;
  created_at?: string | null;
}

export interface SellerReGoSelectStoreProps {
  stores: SellerStore[];
  selectedStoreId: string | null;
  loading: boolean;
  selectingId: string | null;
  error: string;
  onSelectStore: (id: string) => Promise<void> | void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoSelectStore({
  stores,
  selectedStoreId,
  loading,
  selectingId,
  error,
  onSelectStore,
  dir = 'ltr',
}: SellerReGoSelectStoreProps) {
  const activeStore = stores.find((s) => s.id === selectedStoreId);
  const verifiedStoresCount = stores.filter((s) => s.is_verified).length;

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Espace Vendeur', href: '/hub/dashboard' },
        { label: 'Sélecteur de Boutiques' },
      ]}
      headerTitle="Sélecteur de Boutiques Marchandes"
      headerSubtitle="Basculez instantanément entre vos différents magasins et gérez chacun de leurs cockpits de manière isolée."
      headerIcon={Store}
      statusBadge={
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          ReGo MultiStore Switcher
        </span>
      }
      primaryAction={
        <Link
          href="/hub/dashboard/create-store"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Boutique</span>
        </Link>
      }
      secondaryAction={
        <Link
          href="/hub/dashboard/my-subscription-orders"
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
        >
          <ReceiptText className="w-3.5 h-3.5" />
          <span>Abonnements & Factures</span>
        </Link>
      }
      mainContent={
        <div className="space-y-6" dir={dir}>
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Telemetry KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReGoKpiHero
              label="Boutiques Totales"
              value={stores.length}
              hint="Magasins rattachés à votre profil"
              icon={Layers}
              accent
            />
            <ReGoKpiHero
              label="Vitrine Active"
              value={activeStore ? activeStore.name : 'Aucune'}
              hint="Cockpit présentement sélectionné"
              icon={Store}
            />
            <ReGoKpiHero
              label="Boutiques Vérifiées"
              value={verifiedStoresCount}
              hint="Conformes aux critères KYC Tunisie"
              icon={ShieldCheck}
            />
            <ReGoKpiHero
              label="Réseau Multi-Vendeur"
              value="Opérationnel"
              hint="Synchronisation instantanée"
              icon={Sparkles}
            />
          </div>

          {/* Stores Card Grid */}
          <ReGoCard
            title="Vos Vitrines Commerciales"
            subtitle="Cliquez sur une boutique pour changer de contexte de gestion ou accéder à sa vitrine publique."
            actions={
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {stores.length} magasin{stores.length > 1 ? 's' : ''}
              </span>
            }
          >
            {loading ? (
              <div className="py-16 flex justify-center items-center">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            ) : stores.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Store className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Aucune boutique enregistrée
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Créez votre première boutique vitrine pour commencer à vendre en ligne sur le marché tunisien.
                  </p>
                </div>
                <Link
                  href="/hub/dashboard/create-store"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer ma Boutique</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {stores.map((store) => {
                  const isSelected = selectedStoreId === store.id;
                  const isSwitching = selectingId === store.id;
                  const storefrontUrl = getStorefrontUrl(store);

                  return (
                    <div
                      key={store.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-slate-900 dark:border-white bg-slate-50/50 dark:bg-slate-900 shadow-xs ring-2 ring-slate-900/15 dark:ring-white/20'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {store.seller_type || 'Commerce Vendeur'}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {store.name}
                            </h3>
                          </div>
                          {isSelected ? (
                            <ReGoStatusChip status="ok" label="Active" />
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Disponible
                            </span>
                          )}
                        </div>

                        {/* Store URLs */}
                        <div className="space-y-1 text-xs">
                          {store.subdomain && (
                            <div className="flex items-center gap-1.5 font-mono text-slate-500 dark:text-slate-400 truncate">
                              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{store.subdomain}.pandamarket.tn</span>
                            </div>
                          )}
                          {store.custom_domain && (
                            <div className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200 font-bold truncate">
                              <Globe className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)] shrink-0" />
                              <span className="truncate">{store.custom_domain}</span>
                            </div>
                          )}
                        </div>

                        {/* Badges strip */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {store.is_verified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/40">
                              <ShieldCheck className="w-3 h-3" />
                              Vérifiée
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-900/40">
                              <Clock className="w-3 h-3" />
                              En attente KYC
                            </span>
                          )}

                          {store.subscription_plan && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700 capitalize">
                              {store.subscription_plan}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        {storefrontUrl && (
                          <a
                            href={storefrontUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                          >
                            <span>Voir Vitrine</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <button
                          onClick={() => void onSelectStore(store.id)}
                          disabled={isSwitching || isSelected}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                            isSelected
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default'
                              : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-2xs'
                          }`}
                        >
                          {isSwitching ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isSelected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                          <span>{isSelected ? 'Boutique Active' : 'Ouvrir Cockpit'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ReGoCard>
        </div>
      }
    />
  );
}
