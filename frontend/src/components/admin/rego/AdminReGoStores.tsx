'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Store,
  ShieldCheck,
  Package,
  ShoppingCart,
  ExternalLink,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  DollarSign,
  Building2,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface Vendor {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  owner_id: string;
  owner_email?: string | null;
  owner_first_name?: string | null;
  owner_last_name?: string | null;
  owner_phone?: string | null;
  seller_type?: string | null;
  subscription_plan: string;
  status: string;
  is_verified: boolean;
  product_count?: string | number | null;
  order_count?: string | number | null;
  captured_revenue?: string | number | null;
  kyc_status?: string | null;
  created_at: string;
}

export interface VendorSummary {
  total: number;
  verified: number;
  unverified: number;
  suspended: number;
  maintenance: number;
  pending_seller_type_requests: number;
  pending_kyc: number;
}

export interface AdminReGoStoresProps {
  vendors: Vendor[];
  summary: VendorSummary;
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onStatusChange: (vendorId: string, status: string, reason?: string) => Promise<void>;
  updatingStatus?: boolean;
  error?: string;
  success?: string;
}

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function AdminReGoStores({
  vendors,
  summary,
  loading,
  page,
  totalPages,
  total,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  onPageChange,
  onRefresh,
  onStatusChange,
  updatingStatus = false,
  error,
  success,
}: AdminReGoStoresProps) {
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const handleConfirmSuspend = async (vendorId: string) => {
    await onStatusChange(vendorId, 'suspended', suspendReason);
    setSuspendingId(null);
    setSuspendReason('');
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Annuaire Central des Boutiques Marchandes
              </h1>
              <ReGoStatusChip
                status="neutral"
                label={`${summary.total} boutiques`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Gouvernance des vendeurs ReGo · Supervision des domaines, vérifications et volumes d&apos;activité
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          <Link
            href="/users"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
          >
            <span>Comptes Vendeurs</span>
          </Link>
          <Link
            href="/kyc"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all"
          >
            <span>File KYC ({summary.pending_kyc})</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
          {success}
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Total Boutiques"
          value={loading ? '—' : summary.total}
          hint="Enregistrées sur la marketplace"
        />
        <ReGoKpiHero
          label="Boutiques Vérifiées"
          value={loading ? '—' : summary.verified}
          hint="Dossier KYC et identité validés"
        />
        <ReGoKpiHero
          label="En Maintenance"
          value={loading ? '—' : summary.maintenance}
          hint="Boutiques fermées temporairement"
        />
        <ReGoKpiHero
          label="Suspendues / Bloquées"
          value={loading ? '—' : summary.suspended}
          hint="Accès restreint par l'administration"
        />
      </div>

      {/* Main Content Card with Status Filters & Search */}
      <ReGoCard
        title="Liste des Boutiques Enregistrées"
        subtitle="Consultez les informations administratives, métriques de vente et statuts opérationnels"
        icon={Building2}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Status Tabs */}
            <div className="flex items-center rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5 text-xs font-bold">
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'verified', label: 'Vérifiées' },
                { id: 'unverified', label: 'Non vérifiées' },
                { id: 'maintenance', label: 'Maintenance' },
                { id: 'suspended', label: 'Suspendues' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={`px-2.5 py-1 rounded-[calc(var(--rego-r,8px)-2px)] transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-[var(--rego-fg,#111111)] shadow-2xs'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
              <input
                type="text"
                placeholder="Rechercher boutique, email..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-medium"
              />
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--rego-accent,#ad0505)]" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Store className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              Aucune boutique trouvée
            </p>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              Modifiez votre recherche ou sélectionnez un autre filtre de statut.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--rego-fg,#111111)]">
                <thead className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                  <tr>
                    <th className="px-3 py-2.5">Boutique & Domaine</th>
                    <th className="px-3 py-2.5">Marchand / Propriétaire</th>
                    <th className="px-3 py-2.5">Articles & Ventes</th>
                    <th className="px-3 py-2.5">Chiffre d&apos;Affaires</th>
                    <th className="px-3 py-2.5">Abonnement</th>
                    <th className="px-3 py-2.5">Statut</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                  {vendors.map((vendor) => {
                    const ownerName = [vendor.owner_first_name, vendor.owner_last_name].filter(Boolean).join(' ');

                    return (
                      <tr
                        key={vendor.id}
                        className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                              {vendor.name}
                            </span>
                            {vendor.is_verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--rego-ink-2,#737373)]">
                            {vendor.subdomain}.pandamarket.tn
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-[var(--rego-fg,#111111)]">
                            {ownerName || 'Marchand'}
                          </div>
                          <div className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                            {vendor.owner_email || '—'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-[var(--rego-fg,#111111)]">
                            {toNumber(vendor.product_count)} arts.
                          </span>
                          <span className="text-[10px] text-[var(--rego-ink-3,#949494)] block">
                            {toNumber(vendor.order_count)} commandes
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <ReGoAmtBox amount={toNumber(vendor.captured_revenue)} size="sm" />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 capitalize">
                            {vendor.subscription_plan || 'free'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <ReGoStatusChip
                            status={vendor.status === 'verified' ? 'ok' : vendor.status === 'suspended' ? 'err' : vendor.status === 'maintenance' ? 'warn' : 'neutral'}
                            label={vendor.status === 'verified' ? 'Active' : vendor.status === 'suspended' ? 'Suspendue' : vendor.status === 'maintenance' ? 'Maintenance' : 'En attente'}
                            size="xs"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedVendor(vendor)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspecter</span>
                            </button>

                            {vendor.status === 'suspended' ? (
                              <button
                                type="button"
                                disabled={updatingStatus}
                                onClick={() => void onStatusChange(vendor.id, 'verified')}
                                className="px-2 py-1 rounded-[var(--rego-r,8px)] text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                Réactiver
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={updatingStatus}
                                onClick={() => {
                                  setSuspendingId(vendor.id);
                                  setSuspendReason('');
                                }}
                                className="px-2 py-1 rounded-[var(--rego-r,8px)] text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                              >
                                Suspendre
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--rego-border,#dedede)] text-xs text-[var(--rego-ink-2,#737373)]">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>

              <span className="font-medium">
                Page <strong className="text-[var(--rego-fg,#111111)]">{page}</strong> sur {totalPages || 1} ({total} boutiques)
              </span>

              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
              >
                <span>Suivant</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </ReGoCard>

      {/* Suspend Confirmation Modal */}
      {suspendingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm text-[var(--rego-fg,#111111)]">
              Confirmer la suspension de la boutique
            </h3>
            <p className="text-xs text-[var(--rego-ink-2,#737373)]">
              La boutique ne sera plus accessible aux acheteurs jusqu&apos;à réactivation par un administrateur.
            </p>
            <input
              type="text"
              placeholder="Motif de la suspension (infraction, non-conformité...)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full p-2.5 text-xs rounded-[var(--rego-r,8px)] border border-slate-300 bg-white text-slate-900 focus:outline-hidden"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendingId(null)}
                className="px-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => void handleConfirmSuspend(suspendingId)}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                Confirmer la Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedVendor)}
        onClose={() => setSelectedVendor(null)}
        title={selectedVendor?.name || 'Détails Boutique'}
        subtitle={`Domaine: ${selectedVendor?.subdomain}.pandamarket.tn`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedVendor(null)}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
            >
              Fermer
            </button>
            {selectedVendor && (
              <a
                href={`https://${selectedVendor.subdomain}.pandamarket.tn`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir la Vitrine</span>
              </a>
            )}
          </>
        }
      >
        {selectedVendor && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">
                Chiffre d&apos;Affaires Encaissé
              </span>
              <div className="mt-1">
                <ReGoAmtBox amount={toNumber(selectedVendor.captured_revenue)} size="lg" />
              </div>
              <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
                {toNumber(selectedVendor.order_count)} commandes traitées · {toNumber(selectedVendor.product_count)} articles
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Propriétaire Marchand</h4>
              <div className="space-y-1.5 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)]">
                <p><strong className="text-[var(--rego-fg,#111111)]">Nom :</strong> {[selectedVendor.owner_first_name, selectedVendor.owner_last_name].filter(Boolean).join(' ') || '—'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Email :</strong> {selectedVendor.owner_email || '—'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Téléphone :</strong> {selectedVendor.owner_phone || 'Non renseigné'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Type de vente :</strong> {selectedVendor.seller_type || 'retailer'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Plan actif :</strong> {selectedVendor.subscription_plan}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Date d&apos;inscription :</strong> {new Date(selectedVendor.created_at).toLocaleDateString('fr-TN')}</p>
              </div>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
