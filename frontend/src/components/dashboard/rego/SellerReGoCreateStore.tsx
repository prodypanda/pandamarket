'use client';

import React from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  ArrowLeft,
  Loader2,
  Globe,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Building,
  CheckCircle2,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import type { SellerTypeValue } from '@/lib/seller-type';

export interface SellerReGoCreateStoreProps {
  name: string;
  subdomain: string;
  sellerType: SellerTypeValue;
  canCreateFreeStore: boolean | null;
  saving: boolean;
  error: string;
  sellerTypes: Array<{ value: SellerTypeValue; label: string }>;
  marketplaceDomain: string;
  onFieldChange: (field: 'name' | 'subdomain' | 'seller_type', value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoCreateStore({
  name,
  subdomain,
  sellerType,
  canCreateFreeStore,
  saving,
  error,
  sellerTypes,
  marketplaceDomain,
  onFieldChange,
  onSubmit,
  dir = 'ltr',
}: SellerReGoCreateStoreProps) {
  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Espace Vendeur', href: '/hub/dashboard' },
        { label: 'Sélecteur de Boutiques', href: '/hub/dashboard/select-store' },
        { label: 'Nouvelle Vitrine' },
      ]}
      headerTitle="Créer une Nouvelle Vitrine Marchande"
      headerSubtitle="Lancez une boutique en ligne distincte avec son sous-domaine dédié, catalogue et gestionnaire de commandes."
      headerIcon={Store}
      statusBadge={
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          ReGo MultiStore
        </span>
      }
      secondaryAction={
        <Link
          href="/hub/dashboard/select-store"
          className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Mes Boutiques</span>
        </Link>
      }
      mainContent={
        <div className="max-w-3xl mx-auto space-y-6" dir={dir}>
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {canCreateFreeStore === false && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Quota de boutique gratuite atteint pour ce compte. Vous pouvez gérer vos boutiques existantes depuis le sélecteur.
              </span>
            </div>
          )}

          {/* Quick Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ReGoKpiHero
              label="Boutique Gratuite"
              value={canCreateFreeStore === false ? '0 restante' : '1 disponible'}
              hint="Inclus sans frais additionnels"
              icon={Store}
              accent
            />
            <ReGoKpiHero
              label="Sous-domaine Offert"
              value={`.${marketplaceDomain}`}
              hint="Sécurisé avec certificat SSL HTTPS"
              icon={Globe}
            />
            <ReGoKpiHero
              label="Activation"
              value="Immédiate"
              hint="Cockpit prêt à l'emploi"
              icon={Sparkles}
            />
          </div>

          <ReGoCard
            title="Configuration de votre Magasin"
            subtitle="Renseignez l'identité commerciale de votre nouvelle vitrine."
          >
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom commercial de la boutique <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => onFieldChange('name', e.target.value)}
                  placeholder="Ex: Carthage Artisanat, Mode Tunisienne"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-slate-900 dark:focus:border-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Sous-domaine personnalisé <span className="text-rose-500">*</span>
                </label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus-within:border-slate-900 dark:focus-within:border-white transition">
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => onFieldChange('subdomain', e.target.value)}
                    placeholder="mon-magasin"
                    required
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-xs font-mono font-medium outline-none text-slate-900 dark:text-white"
                  />
                  <span className="border-l border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/60 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center font-mono">
                    .{marketplaceDomain}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Lettres minuscules, chiffres et tirets uniquement. Vous pourrez connecter un nom de domaine .tn ultérieurement.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type d'activité commerciale <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sellerType}
                  onChange={(e) => onFieldChange('seller_type', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-slate-900 dark:focus:border-white transition"
                >
                  {sellerTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={saving || canCreateFreeStore === false || !name.trim() || !subdomain.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Créer la boutique & ouvrir le cockpit</span>
                </button>
              </div>
            </form>
          </ReGoCard>
        </div>
      }
    />
  );
}
