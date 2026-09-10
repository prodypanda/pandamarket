'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoKpiHero,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface SellerReGoPaymentMethodProps {
  cardHolder: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  loading: boolean;
  success: string;
  error: string;
  onCardHolderChange: (v: string) => void;
  onCardNumberChange: (v: string) => void;
  onExpiryChange: (v: string) => void;
  onCvvChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoPaymentMethod({
  cardHolder,
  cardNumber,
  expiry,
  cvv,
  loading,
  success,
  error,
  onCardHolderChange,
  onCardNumberChange,
  onExpiryChange,
  onCvvChange,
  onSubmit,
  dir = 'ltr',
}: SellerReGoPaymentMethodProps) {
  const { t } = useLocale();
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mandat'>('card');

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Finance', href: '/hub/dashboard/financial' },
        { label: 'Forfait & Facturation', href: '/hub/dashboard/subscription' },
      ]}
      headerTitle="Moyen de Paiement pour l'Abonnement"
      headerSubtitle="Définissez comment vous réglez vos échéances d'abonnement PandaMarket (Carte bancaire tunisienne ou mandat postal)."
      headerIcon={CreditCard}
      statusBadge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Connexion Sécurisée</span>
        </div>
      }
      primaryAction={
        <Link
          href="/hub/dashboard/subscription"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour à l&apos;Abonnement</span>
        </Link>
      }
      secondaryAction={
        <Link
          href="/hub/dashboard/my-subscription-orders"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
        >
          <span>Factures & Reçus</span>
        </Link>
      }
      alertBanner={
        error ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        ) : undefined
      }
      kpiStrip={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Méthode Sélectionnée"
            value={<span className="text-base font-black">{selectedMethod === 'card' ? 'Carte Bancaire' : 'Mandat Postal'}</span>}
            hint="Mode de règlement choisi"
            icon={CreditCard}
            accent={true}
          />
          <ReGoKpiHero
            label="Sécurité des Transactions"
            value="3D Secure"
            hint="Authentification forte"
            icon={ShieldCheck}
          />
          <ReGoKpiHero
            label="Chiffrement"
            value="AES-256"
            hint="Données carte protégées au repos"
            icon={Lock}
          />
          <ReGoKpiHero
            label="Facturation Fiscale"
            value="TTC"
            hint="Facture officielle tunisienne"
            icon={Building}
          />
        </div>
      }
      filterToolbar={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedMethod('card')}
            className={`p-3 rounded-xl border text-start transition-all ${
              selectedMethod === 'card'
                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4 mb-1.5 text-indigo-600" />
            <div className="text-xs font-black">Carte Bancaire</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">CIB, Gim-Tel, Visa, Mastercard</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('mandat')}
            className={`p-3 rounded-xl border text-start transition-all ${
              selectedMethod === 'mandat'
                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Building className="w-4 h-4 mb-1.5 text-indigo-600" />
            <div className="text-xs font-black">Mandat Minute</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Guichet La Poste Tunisienne</div>
          </button>
        </div>
      }
      mainContent={
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {/* OPTION 1: CREDIT CARD (real API /api/pd/subscriptions/payment-method) */}
            {selectedMethod === 'card' && (
              <ReGoCard
                title="Carte Bancaire Tunisienne (Gim-Tel / CIB)"
                subtitle="Enregistrez votre carte pour le prélèvement automatique de votre abonnement"
                icon={CreditCard}
              >
                <form onSubmit={onSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nom et Prénom du Porteur de la Carte <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => onCardHolderChange(e.target.value)}
                      placeholder="e.g. MOHAMED BEN ALI"
                      className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Numéro de Carte Bancaire (16 chiffres) <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => onCardNumberChange(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                      placeholder="5359 0000 0000 0000"
                      className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Date d&apos;Expiration (MM/AA) <span className="text-rose-500 dark:text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={expiry}
                        onChange={(e) => onExpiryChange(e.target.value)}
                        placeholder="12/28"
                        className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Cryptogramme Visuel CVV <span className="text-rose-500 dark:text-rose-400">*</span>
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => onCvvChange(e.target.value)}
                        placeholder="123"
                        className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-2 text-[11px] text-indigo-700 dark:text-indigo-300">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>Les informations de votre carte sont chiffrées et ne sont jamais réaffichées en clair après enregistrement.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enregistrement sécurisé en cours...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Enregistrer la Carte de Prélèvement</span>
                      </>
                    )}
                  </button>
                </form>
              </ReGoCard>
            )}

            {/* OPTION 2: MANDAT POSTAL MINUTE (real proof-upload flow on my-subscription-orders) */}
            {selectedMethod === 'mandat' && (
              <ReGoCard
                title="Règlement par Mandat Minute Postal"
                subtitle="Versement au guichet de La Poste Tunisienne et soumission de preuve"
                icon={Building}
              >
                <div className="space-y-4 pt-2 text-xs text-slate-700 dark:text-slate-300">
                  <p>
                    Vous pouvez régler vos forfaits trimestriels ou annuels en espèces dans n&apos;importe quel bureau de poste en Tunisie.
                  </p>
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                    <p className="font-bold text-amber-900 dark:text-amber-200">Consignes de versement :</p>
                    <p>Référencez le numéro de commande d&apos;abonnement affiché sur votre facture.</p>
                  </div>

                  <a
                    href="/hub/dashboard/my-subscription-orders"
                    className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Building className="w-4 h-4" />
                    <span>Accéder à la Page de Dépôt de Preuve de Mandat</span>
                  </a>
                </div>
              </ReGoCard>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <ReGoCard
              title="Garanties & Politiques de Facturation"
              subtitle="Engagements PandaMarket envers les commerçants tunisiens"
              icon={ShieldCheck}
            >
              <div className="space-y-3 pt-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Sans Engagement :</strong> Vous pouvez changer de formule ou suspendre votre abonnement à tout moment sans frais additionnels.
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Facture Fiscale Déductible :</strong> Toutes nos factures d&apos;abonnement mentionnent votre Matricule Fiscal pour votre comptabilité.
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Avis de Renouvellement :</strong> Vous recevez un rappel avant chaque prélèvement automatique.
                  </div>
                </div>
              </div>
            </ReGoCard>
          </div>
        </div>
      }
    />
  );
}
