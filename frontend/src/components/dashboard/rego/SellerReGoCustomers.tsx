'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Download,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Crown,
  Eye,
  MessageSquare,
  Check,
  Copy,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface StorefrontCustomer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  order_count?: number;
  total_spend_tnd?: number;
  city?: string | null;
  governorate?: string | null;
  last_order_date?: string | null;
}

export interface SellerReGoCustomersProps {
  customers: StorefrontCustomer[];
  loading: boolean;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoCustomers({
  customers,
  loading: _loading,
  searchQuery,
  onSearchQueryChange,
  dir = 'ltr',
}: SellerReGoCustomersProps) {
  const { t: _t, locale } = useLocale();
  const [selectedCustomer, setSelectedCustomer] = useState<StorefrontCustomer | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'single' | 'repeat' | 'vip'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const term = searchQuery.toLowerCase();
      const matchesSearch =
        (c.email || '').toLowerCase().includes(term) ||
        (c.first_name || '').toLowerCase().includes(term) ||
        (c.last_name || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term) ||
        (c.city || '').toLowerCase().includes(term) ||
        (c.governorate || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      const count = c.order_count || 0;
      if (orderFilter === 'single') return count === 1;
      if (orderFilter === 'repeat') return count >= 2 && count <= 4;
      if (orderFilter === 'vip') return count >= 5;
      return true;
    });
  }, [customers, searchQuery, orderFilter]);

  // Telemetry Calculations
  const totalCount = customers.length;
  const repeatBuyersCount = customers.filter((c) => (c.order_count || 0) > 1).length;
  const vipCount = customers.filter((c) => (c.order_count || 0) >= 5).length;
  // Only aggregate real spend data reported by the API — never fabricate amounts.
  const customersWithSpend = customers.filter((c) => typeof c.total_spend_tnd === 'number');
  const totalRevenue = customersWithSpend.reduce((acc, c) => acc + (c.total_spend_tnd || 0), 0);
  const averageSpend = customersWithSpend.length > 0 ? totalRevenue / customersWithSpend.length : null;

  const handleExportCsv = () => {
    const headers = 'ID,Nom,Prenom,Email,Telephone,Ville,Gouvernorat,Commandes,Depenses_TND,Date_Inscription\n';
    const rows = filteredCustomers
      .map((c) =>
        [
          c.id,
          `"${c.last_name || ''}"`,
          `"${c.first_name || ''}"`,
          `"${c.email || ''}"`,
          `"${c.phone || ''}"`,
          `"${c.city || ''}"`,
          `"${c.governorate || ''}"`,
          c.order_count || 0,
          typeof c.total_spend_tnd === 'number' ? c.total_spend_tnd.toFixed(3) : '',
          c.created_at,
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `clients_pandamarket_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div dir={dir}>
      <DashboardPageWrapper
        breadcrumbs={[
          { label: 'Accueil', href: '/hub/dashboard' },
          { label: 'Clients & Marketing', href: '/hub/dashboard' },
          { label: 'Répertoire Clients' },
        ]}
        headerTitle="Répertoire des Clients de la Boutique"
        headerSubtitle="Consultez la liste de vos acheteurs, leur historique d'achat et leurs coordonnées pour un service client d'excellence."
        headerIcon={Users}
        statusBadge={
          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] rounded-full">
            Base Acheteurs
          </span>
        }
        secondaryAction={
          <button
            onClick={handleExportCsv}
            disabled={filteredCustomers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter Base CSV</span>
          </button>
        }
        kpiStrip={
          <>
            <ReGoKpiHero
              label="Total Clients Uniques"
              value={totalCount.toLocaleString('fr-TN')}
              hint="Acheteurs ayant finalisé une commande"
              icon={Users}
              accent
            />
            <ReGoKpiHero
              label="Clients Fidèles (Récidivistes)"
              value={repeatBuyersCount.toLocaleString('fr-TN')}
              hint={`${totalCount > 0 ? Math.round((repeatBuyersCount / totalCount) * 100) : 0}% de taux de réachat`}
              icon={ShieldCheck}
            />
            <ReGoKpiHero
              label="Dépense Moyenne par Client"
              value={averageSpend !== null ? <ReGoAmtBox amount={averageSpend} size="lg" /> : '—'}
              hint="Panier moyen cumulé par acheteur"
              icon={ShoppingBag}
            />
            <ReGoKpiHero
              label="Clients VIP (> 5 commandes)"
              value={vipCount}
              hint="Meilleurs contributeurs au chiffre d'affaires"
              icon={Crown}
            />
          </>
        }
        filterToolbar={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, téléphone ou ville..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className="w-full ps-8 pe-3 py-1.5 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] focus:bg-[var(--rego-bg,#ffffff)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5">
              {[
                { id: 'all', label: 'Tous les clients' },
                { id: 'single', label: '1 commande' },
                { id: 'repeat', label: '2 à 4 commandes' },
                { id: 'vip', label: 'VIP (≥ 5)' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setOrderFilter(filter.id as any)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                    orderFilter === filter.id
                      ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        }
        mainContent={
          <div className="space-y-6">
            {filteredCustomers.length === 0 ? (
              <ReGoCard>
                <div className="py-12 text-center">
                  <Users className="w-8 h-8 text-[var(--rego-ink-3,#949494)] mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                    {searchQuery ? 'Aucun client correspondant' : 'Aucun client enregistré'}
                  </h4>
                  <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5 max-w-sm mx-auto">
                    {searchQuery
                      ? 'Essayez de modifier votre recherche par nom, numéro de téléphone ou email.'
                      : 'Les acheteurs ayant finalisé une commande apparaîtront automatiquement dans ce répertoire.'}
                  </p>
                </div>
              </ReGoCard>
            ) : (
              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                        <th className="py-3 px-4">Client</th>
                        <th className="py-3 px-4">Téléphone</th>
                        <th className="py-3 px-4">Localisation</th>
                        <th className="py-3 px-4 text-center">Total Commandes</th>
                        <th className="py-3 px-4">Dépenses Totales</th>
                        <th className="py-3 px-4">Inscription</th>
                        <th className="py-3 px-4 text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                      {filteredCustomers.map((c) => {
                        const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Client Anonyme';
                        const orderCount = c.order_count || 0;
                        const spend = typeof c.total_spend_tnd === 'number' ? c.total_spend_tnd : null;

                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors group cursor-pointer"
                            onClick={() => setSelectedCustomer(c)}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] flex items-center justify-center font-black text-xs text-[var(--rego-fg,#111111)] shrink-0">
                                  {(c.first_name?.[0] || c.email[0] || 'C').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[var(--rego-fg,#111111)] truncate">
                                      {fullName}
                                    </span>
                                    {orderCount >= 5 && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-black bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-full flex items-center gap-0.5">
                                        <Crown className="w-2.5 h-2.5" /> VIP
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[var(--rego-ink-2,#737373)] truncate block font-mono">
                                    {c.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {c.phone ? (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--rego-fg,#111111)] font-bold">
                                  <Phone className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                                  <span>{c.phone}</span>
                                </div>
                              ) : (
                                <span className="text-[var(--rego-ink-3,#949494)]">—</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1 text-[11px] text-[var(--rego-fg,#111111)] font-medium">
                                <MapPin className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                                <span>{c.city || c.governorate || 'Tunisie'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)]">
                                <ShoppingBag className="w-3 h-3" />
                                {orderCount}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-bold">
                              {spend !== null ? (
                                <ReGoAmtBox amount={spend} size="sm" />
                              ) : (
                                <span className="text-[var(--rego-ink-3,#949494)]">—</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-[11px] text-[var(--rego-ink-2,#737373)]">
                              {new Date(c.created_at).toLocaleDateString(dateLocale, {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>

                            <td className="py-3.5 px-4 text-end" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {c.phone && (
                                  <a
                                    href={`https://wa.me/216${c.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                                    title="Discuter sur WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  onClick={() => setSelectedCustomer(c)}
                                  className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                                  title="Inspecter la fiche client"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        }
        drawer={
          <ReGoDrawer
            isOpen={!!selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            title={
              [selectedCustomer?.first_name, selectedCustomer?.last_name].filter(Boolean).join(' ') ||
              'Fiche Client'
            }
            subtitle={selectedCustomer?.email}
            footer={
              selectedCustomer && (
                <div className="flex items-center justify-between w-full">
                  {selectedCustomer.phone ? (
                    <a
                      href={`https://wa.me/216${selectedCustomer.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="px-4 py-1.5 text-xs font-bold rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              )
            }
          >
            {selectedCustomer && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Statut de fidélité</span>
                    <ReGoStatusChip
                      status={(selectedCustomer.order_count || 0) >= 5 ? 'ok' : 'neutral'}
                      label={(selectedCustomer.order_count || 0) >= 5 ? 'VIP Récidiviste' : 'Client Actif'}
                      size="xs"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Total commandes passées</span>
                    <span className="font-bold font-mono text-[var(--rego-fg,#111111)]">
                      {selectedCustomer.order_count || 0} commandes
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Chiffre d&apos;affaires généré</span>
                    {typeof selectedCustomer.total_spend_tnd === 'number' ? (
                      <ReGoAmtBox
                        amount={selectedCustomer.total_spend_tnd}
                        size="sm"
                      />
                    ) : (
                      <span className="text-[var(--rego-ink-3,#949494)]">—</span>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-2 border border-[var(--rego-border,#dedede)] rounded-md p-3">
                  <h4 className="font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] text-[10px]">
                    Coordonnées de Contact & Livraison
                  </h4>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-[var(--rego-ink-2,#737373)]">Email :</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-[var(--rego-fg,#111111)]">
                      <span>{selectedCustomer.email}</span>
                      <button
                        onClick={() => copyToClipboard(selectedCustomer.email, 'email')}
                        className="p-1 text-[var(--rego-ink-3,#949494)] hover:text-[var(--rego-fg,#111111)]"
                      >
                        {copiedKey === 'email' ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {selectedCustomer.phone && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[var(--rego-ink-2,#737373)]">Téléphone :</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-[var(--rego-fg,#111111)]">
                        <span>{selectedCustomer.phone}</span>
                        <button
                          onClick={() => copyToClipboard(selectedCustomer.phone!, 'phone')}
                          className="p-1 text-[var(--rego-ink-3,#949494)] hover:text-[var(--rego-fg,#111111)]"
                        >
                          {copiedKey === 'phone' ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1">
                    <span className="text-[var(--rego-ink-2,#737373)]">Ville / Gouvernorat :</span>
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      {selectedCustomer.city || selectedCustomer.governorate || 'Tunisie'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </ReGoDrawer>
        }
      />
    </div>
  );
}
