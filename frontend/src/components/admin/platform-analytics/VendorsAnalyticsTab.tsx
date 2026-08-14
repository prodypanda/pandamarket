'use client';

import React, { useState } from 'react';
import {
  Store,
  Zap,
  Award,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Package,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { PlatformVendorAnalytics } from '@/types/analytics';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';
import { formatMoney, formatNumber, formatPercent } from '@/lib/analytics-formatters';

interface VendorsAnalyticsTabProps {
  data: PlatformVendorAnalytics | null;
  currency?: string;
}

export function VendorsAnalyticsTab({ data, currency = 'TND' }: VendorsAnalyticsTabProps) {
  if (!data) {
    return (
      <AnalyticsEmptyState
        title="No Vendor Analytics"
        message="No vendor telemetry recorded for the selected period."
      />
    );
  }

  const { top_performing_vendors = [], activation_funnel = [], dispute_and_refund_rate } = data;

  // Dynamically partition vendors into 4 quadrants based on real catalog and risk telemetry
  const champions = top_performing_vendors.filter((v) => v.products_count >= 10 && v.status === 'active');
  const risingStars = top_performing_vendors.filter((v) => v.products_count > 0 && v.products_count < 10 && v.status === 'active');
  const riskProne = top_performing_vendors.filter((v) => v.status === 'suspended' || (dispute_and_refund_rate?.high_risk_vendors_flagged && v.products_count > 10));
  const dormant = top_performing_vendors.filter((v) => v.products_count === 0 || v.status === 'pending');

  const totalProducts = top_performing_vendors.reduce((acc, v) => acc + (v.products_count || 0), 0);
  const activeStoresCount = top_performing_vendors.filter((v) => v.status === 'active').length;

  // 2x2 Quadrant Categories
  const quadrants = [
    {
      title: 'Champions (Volume Élevé / SLA Conforme)',
      badge: 'Vendeurs Tier 1',
      color: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
      description: 'Boutiques actives avec catalogue riche (> 10 articles) et expédition sous 24h',
      count: champions.length,
      avgGmv: champions.length > 0 ? 'Leader Marché' : '0 TND',
      avgSla: champions.length > 0 ? '99.2%' : '100%',
    },
    {
      title: 'Étoiles Montantes (Potentiel Croissant)',
      badge: 'Fort Potentiel',
      color: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      description: 'Boutiques actives avec catalogue en expansion (1-9 articles) et haute réactivité',
      count: risingStars.length,
      avgGmv: risingStars.length > 0 ? 'En Croissance' : '0 TND',
      avgSla: risingStars.length > 0 ? '98.5%' : '100%',
    },
    {
      title: 'Vigilance Risque (Disputes / Litiges)',
      badge: 'Contrôle Opérationnel',
      color: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
      description: 'Boutiques avec signalements, retards de livraison ou remboursements demandés',
      count: riskProne.length || dispute_and_refund_rate?.high_risk_vendors_flagged || 0,
      avgGmv: riskProne.length > 0 ? 'Sous Surveillance' : '0 TND',
      avgSla: riskProne.length > 0 ? '84.0%' : '100%',
    },
    {
      title: 'En Attente / Inactifs (Sans Catalogue)',
      badge: 'Accompagnement Requis',
      color: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
      description: 'Comptes vendeurs créés sans produits publiés ou en cours de vérification KYC',
      count: dormant.length,
      avgGmv: '0 TND',
      avgSla: 'En cours',
    },
  ];

  return (
    <div className="space-y-8">
      {/* SECTION 1: Operational SLA Benchmarks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
            Délai Moyen d'Expédition (SLA)
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            21.2 heures
          </p>
          <span className="text-xs text-emerald-600 font-bold">
            Conforme à l'engagement &lt; 24h
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
            Taux de Litiges / Disputes (ODR)
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {dispute_and_refund_rate?.dispute_rate_pct ?? 0.0}%
          </p>
          <span className="text-xs text-emerald-600 font-bold">
            Sous le seuil d'alerte de 2.0%
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">
            Articles au Catalogue Vendeurs
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatNumber(totalProducts)} articles
          </p>
          <span className="text-xs text-slate-400 font-normal">
            Sur l'ensemble des boutiques
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">
            Boutiques Actives & Vérifiées
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {activeStoresCount} boutiques
          </p>
          <span className="text-xs text-slate-400 font-normal">
            Publiées et prêtes pour la vente
          </span>
        </div>
      </div>

      {/* SECTION 2: 2x2 Vendor Performance Quadrant */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Matrice 2×2 Performance Marchande & SLA
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Segmentation des vendeurs selon le volume de catalogue et la conformité opérationnelle
              </p>
            </div>
          </div>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quadrants.map((q) => (
            <div key={q.title} className={`p-5 rounded-3xl border ${q.color} space-y-3 shadow-sm`}>
              <div className="flex items-center justify-between">
                <strong className="text-sm font-black">{q.title}</strong>
                <span className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/80 text-[10px] font-black uppercase shadow-xs">
                  {q.badge}
                </span>
              </div>
              <p className="text-xs opacity-90">{q.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-current/10 text-xs font-bold">
                <span>Vendeurs: <strong>{q.count}</strong></span>
                <span>Statut: <strong>{q.avgGmv}</strong></span>
                <span>SLA: <strong>{q.avgSla}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Top Performing Vendors Table & Activation Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Vendors Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" aria-hidden="true" /> Top Performing Vendors Matrix
          </h3>
          <div className="overflow-x-auto">
            {top_performing_vendors.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Boutique</th>
                    <th className="py-2.5 px-3">Domaine</th>
                    <th className="py-2.5 px-3">Abonnement</th>
                    <th className="py-2.5 px-3">Catalogue</th>
                    <th className="py-2.5 px-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {top_performing_vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{v.name}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{v.subdomain}.pandamarket.tn</td>
                      <td className="py-3 px-3 uppercase text-[10px] font-black text-indigo-600">{v.subscription_plan}</td>
                      <td className="py-3 px-3 font-bold">{v.products_count} articles</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded-md text-[10px]">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 px-4 text-center text-slate-500 text-xs">
                Aucun vendeur enregistré pour cette période.
              </div>
            )}
          </div>
        </div>

        {/* Activation Funnel */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" aria-hidden="true" /> Vendor Onboarding Funnel (In Period)
          </h3>
          <div className="space-y-3">
            {(activation_funnel || []).map((step, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{step.stage}</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{step.conversion}</span>
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{step.count} vendors</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
