'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Store,
  ShieldCheck,
  ExternalLink,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  KeyRound,
  CreditCard,
  Globe,
  MessageSquare,
  Maximize2,
  Minimize2,
  FileCheck,
  Clock3,
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
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface SellerTypeChangeRequest {
  requested_type?: string;
  status?: string;
  requested_at?: string;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  owner_id: string;
  owner_email?: string | null;
  owner_first_name?: string | null;
  owner_last_name?: string | null;
  owner_last_login_at?: string | null;
  owner_is_active?: boolean | null;
  owner_two_factor_enabled?: boolean | null;
  owner_phone?: string | null;
  seller_type?: string | null;
  subscription_plan: string;
  subscription_type?: string | null;
  subscription_expires_at?: string | null;
  payment_config_set?: boolean | null;
  status: string;
  is_verified: boolean;
  product_count?: string | number | null;
  published_product_count?: string | number | null;
  order_count?: string | number | null;
  pending_order_count?: string | number | null;
  captured_revenue?: string | number | null;
  open_report_count?: string | number | null;
  owner_store_count?: string | number | null;
  owner_free_store_count?: string | number | null;
  owner_paid_store_count?: string | number | null;
  kyc_status?: string | null;
  kyc_created_at?: string | null;
  kyc_reviewed_at?: string | null;
  settings?: {
    seller_type_change_request?: SellerTypeChangeRequest;
  } | null;
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

export interface SubscriptionOverrideValue {
  plan: string;
  type: string;
  expiresAt: string;
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
  sellerTypeFilter: string;
  onSellerTypeFilterChange: (sellerType: string) => void;
  pendingOnly: boolean;
  onPendingOnlyChange: (pendingOnly: boolean) => void;
  onClearFilters: () => void;
  ownerId?: string;
  ownerName?: string;
  sellerTypeOptions: Array<{ value: string; label: string }>;
  availableSubscriptionPlans: string[];
  subscriptionOverrides: Record<string, SubscriptionOverrideValue>;
  onSubscriptionOverrideChange: (vendorId: string, patch: Partial<SubscriptionOverrideValue>) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onStatusChange: (vendorId: string, status: string, reason?: string) => Promise<void> | void;
  onSellerTypeChange: (vendorId: string, sellerType: string) => Promise<void> | void;
  onApproveTypeRequest: (vendorId: string) => Promise<void> | void;
  onRejectTypeRequest: (vendorId: string, reason?: string) => Promise<void> | void;
  onSubscriptionSave: (vendorId: string, override: SubscriptionOverrideValue) => Promise<void> | void;
  onChatStoreOwner: (vendor: Vendor) => Promise<void> | void;
  onOwnerReactivate: (vendorId: string) => Promise<void> | void;
  onOwnerSuspend: (vendorId: string) => Promise<void> | void;
  onResetOwner2FA: (vendorId: string) => Promise<void> | void;
  onClearPaymentConfig: (vendorId: string) => Promise<void> | void;
  onClearCustomDomain: (vendorId: string) => Promise<void> | void;
  updatingStatus?: boolean;
  error?: string;
  success?: string;
}

const subscriptionTypes = ['commission', 'yearly'];

const marketplaceDomain = (process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'garbage.team').replace(/^https?:\/\//i, '');

const statusLabels: Record<string, string> = {
  verified: 'Vérifié',
  unverified: 'Non vérifié',
  maintenance: 'Maintenance',
  suspended: 'Suspendu',
};

const statusChipTone: Record<string, 'ok' | 'warn' | 'err' | 'neutral'> = {
  verified: 'ok',
  unverified: 'neutral',
  maintenance: 'warn',
  suspended: 'err',
};

const kycLabels: Record<string, string> = {
  pending: 'KYC en attente',
  approved: 'KYC approuvé',
  rejected: 'KYC rejeté',
  missing: 'Pas de KYC',
};

const kycChipTone: Record<string, 'ok' | 'warn' | 'err' | 'neutral'> = {
  pending: 'warn',
  approved: 'ok',
  rejected: 'err',
  missing: 'neutral',
};

const selectClasses = 'w-full px-3 py-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-medium disabled:opacity-50';

const primaryActionClasses = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] text-xs font-bold bg-[var(--rego-accent,#ad0505)] text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all cursor-pointer disabled:opacity-50';

const successActionClasses = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50';

const outlineActionClasses = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] hover:text-[var(--rego-fg,#111111)] transition-colors cursor-pointer disabled:opacity-50';

const dangerOutlineActionClasses = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-rose-200 dark:border-rose-800/60 bg-white dark:bg-slate-900 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50';

const amberOutlineActionClasses = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer disabled:opacity-50';

const modalInputClasses = 'w-full p-2.5 text-xs rounded-[var(--rego-r,8px)] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden';

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildPageList(currentPage: number, pages: number): Array<number | '…'> {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }
  const list: Array<number | '…'> = [1];
  if (currentPage > 3) list.push('…');
  for (let index = Math.max(2, currentPage - 1); index <= Math.min(pages - 1, currentPage + 1); index += 1) {
    list.push(index);
  }
  if (currentPage < pages - 2) list.push('…');
  list.push(pages);
  return list;
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
  sellerTypeFilter,
  onSellerTypeFilterChange,
  pendingOnly,
  onPendingOnlyChange,
  onClearFilters,
  ownerId,
  ownerName,
  sellerTypeOptions,
  availableSubscriptionPlans,
  subscriptionOverrides,
  onSubscriptionOverrideChange,
  onPageChange,
  onRefresh,
  onStatusChange,
  onSellerTypeChange,
  onApproveTypeRequest,
  onRejectTypeRequest,
  onSubscriptionSave,
  onChatStoreOwner,
  onOwnerReactivate,
  onOwnerSuspend,
  onResetOwner2FA,
  onClearPaymentConfig,
  onClearCustomDomain,
  updatingStatus = false,
  error,
  success,
}: AdminReGoStoresProps) {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [compactMode, setCompactMode] = useState(false);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [ownerSuspendId, setOwnerSuspendId] = useState<string | null>(null);
  const [reset2FAId, setReset2FAId] = useState<string | null>(null);
  const [clearPaymentsId, setClearPaymentsId] = useState<string | null>(null);
  const [clearDomainId, setClearDomainId] = useState<string | null>(null);

  const busy = updatingStatus;

  const selectedVendor = useMemo(
    () => (selectedVendorId ? vendors.find((vendor) => vendor.id === selectedVendorId) || null : null),
    [selectedVendorId, vendors],
  );

  const pageList = useMemo(() => buildPageList(page, totalPages || 1), [page, totalPages]);

  const getStorefrontHref = (vendor: Vendor) => (
    vendor.custom_domain
      ? `https://${vendor.custom_domain}`
      : `https://${encodeURIComponent(vendor.subdomain)}.${marketplaceDomain}`
  );

  const sellerTypeLabel = (value?: string | null) => {
    const match = sellerTypeOptions.find((option) => option.value === value);
    if (match) return match.label;
    const fallback = sellerTypeOptions.find((option) => option.value === 'retailer');
    return fallback ? fallback.label : 'Détaillant';
  };

  const currentSellerType = (vendor: Vendor): string => {
    const value = vendor.seller_type;
    if (value && sellerTypeOptions.some((option) => option.value === value)) return value;
    return 'retailer';
  };

  const pendingRequest = (vendor: Vendor): SellerTypeChangeRequest | null => {
    const request = vendor.settings?.seller_type_change_request;
    if (request?.status !== 'pending') return null;
    if (!sellerTypeOptions.some((option) => option.value === request.requested_type)) return null;
    return request;
  };

  const getSubscriptionOverride = (vendor: Vendor): SubscriptionOverrideValue => subscriptionOverrides[vendor.id] || {
    plan: vendor.subscription_plan || 'free',
    type: vendor.subscription_type || 'commission',
    expiresAt: vendor.subscription_expires_at ? vendor.subscription_expires_at.slice(0, 10) : '',
  };

  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('fr-TN') : '—');

  const selectedPendingRequest = selectedVendor ? pendingRequest(selectedVendor) : null;
  const selectedOverride = selectedVendor ? getSubscriptionOverride(selectedVendor) : null;

  const hasActiveFilters = Boolean(search.trim() || sellerTypeFilter || statusFilter !== 'all' || pendingOnly);

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
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          {success}
        </div>
      )}

      {ownerId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-[var(--rego-r,8px)] border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <span>Boutiques de {ownerName || ownerId}</span>
          <Link
            href="/stores"
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors"
          >
            Voir toutes les boutiques
          </Link>
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        <ReGoKpiHero
          label="Total Boutiques"
          value={loading ? '—' : summary.total}
          hint="Enregistrées sur la marketplace"
          icon={Store}
        />
        <ReGoKpiHero
          label="Boutiques Vérifiées"
          value={loading ? '—' : summary.verified}
          hint="Dossier KYC et identité validés"
          icon={ShieldCheck}
        />
        <ReGoKpiHero
          label="Non Vérifiées"
          value={loading ? '—' : summary.unverified}
          hint="Comptes en attente de vérification"
          icon={Clock3}
        />
        <ReGoKpiHero
          label="En Maintenance"
          value={loading ? '—' : summary.maintenance}
          hint="Boutiques fermées temporairement"
          icon={Building2}
        />
        <ReGoKpiHero
          label="Suspendues / Bloquées"
          value={loading ? '—' : summary.suspended}
          hint="Accès restreint par l'administration"
          icon={Ban}
        />
        <ReGoKpiHero
          label="Demandes de Type"
          value={loading ? '—' : summary.pending_seller_type_requests}
          hint="Changements de type vendeur en attente"
          icon={SlidersHorizontal}
          accent
        />
        <ReGoKpiHero
          label="KYC en Attente"
          value={loading ? '—' : summary.pending_kyc}
          hint="Dossiers KYC à examiner"
          icon={FileCheck}
        />
      </div>

      {/* Main Content Card with Status Filters & Search */}
      <ReGoCard
        title="Liste des Boutiques Enregistrées"
        subtitle="Consultez les informations administratives, métriques de vente et statuts opérationnels"
        icon={Building2}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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
                      ? 'bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] shadow-2xs'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
              <input
                type="text"
                placeholder="Rechercher par boutique, sous-domaine, domaine, propriétaire ou email..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full ps-8 pe-3 py-1 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-medium"
              />
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 pb-3 mb-3 border-b border-[var(--rego-border,#dedede)]/70">
          <select
            value={sellerTypeFilter}
            onChange={(event) => onSellerTypeFilterChange(event.target.value)}
            className="px-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-bold cursor-pointer"
          >
            <option value="">Tous les types de vendeurs</option>
            {sellerTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onPendingOnlyChange(!pendingOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border text-xs font-bold transition-all cursor-pointer ${
              pendingOnly
                ? 'bg-[var(--rego-accent,#ad0505)] text-white border-[var(--rego-accent,#ad0505)] hover:bg-[var(--rego-accent-deep,#8f0404)]'
                : 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Demandes en attente</span>
            {summary.pending_seller_type_requests > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${pendingOnly ? 'bg-white/20 dark:bg-white/20 text-white' : 'bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]'}`}>
                {summary.pending_seller_type_requests}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
            className="px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            Réinitialiser
          </button>

          <div className="ms-auto flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--rego-ink-3,#949494)]">
              {total} boutique(s)
            </span>
            <button
              type="button"
              onClick={() => setCompactMode((current) => !current)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all cursor-pointer"
            >
              {compactMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              <span>{compactMode ? 'Vue complète' : 'Vue compacte'}</span>
            </button>
          </div>
        </div>

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
              <table className="w-full text-start text-xs text-[var(--rego-fg,#111111)]">
                <thead className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                  <tr>
                    <th className="px-3 py-2.5">Boutique & Domaine</th>
                    <th className="px-3 py-2.5">Marchand / Propriétaire</th>
                    <th className="px-3 py-2.5">Articles & Ventes</th>
                    <th className="px-3 py-2.5">Chiffre d&apos;Affaires</th>
                    <th className="px-3 py-2.5">Abonnement</th>
                    <th className="px-3 py-2.5">Statut</th>
                    <th className="px-3 py-2.5 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                  {vendors.map((vendor) => {
                    const ownerName = [vendor.owner_first_name, vendor.owner_last_name].filter(Boolean).join(' ');
                    const statusKey = vendor.status?.toLowerCase() || 'unverified';
                    const kycKey = vendor.kyc_status || 'missing';

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
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <a
                            href={getStorefrontHref(vendor)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-accent,#ad0505)] inline-flex items-center gap-1"
                          >
                            {vendor.custom_domain || `${vendor.subdomain}.${marketplaceDomain}`}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {!compactMode && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              <ReGoStatusChip status={kycChipTone[kycKey]} label={kycLabels[kycKey]} size="xs" />
                              <ReGoStatusChip status="info" label={sellerTypeLabel(vendor.seller_type)} size="xs" />
                              <ReGoStatusChip
                                status={vendor.owner_two_factor_enabled ? 'ok' : 'neutral'}
                                label={vendor.owner_two_factor_enabled ? '2FA activée' : '2FA désactivée'}
                                size="xs"
                              />
                              {vendor.payment_config_set && (
                                <ReGoStatusChip status="accent" label="Paiements configurés" size="xs" />
                              )}
                              {toNumber(vendor.owner_store_count) > 1 && (
                                <ReGoStatusChip
                                  status="neutral"
                                  label={`${toNumber(vendor.owner_store_count)} boutiques (propriétaire)`}
                                  size="xs"
                                />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-[var(--rego-fg,#111111)]">
                            {ownerName || 'Marchand'}
                          </div>
                          {!compactMode && (
                            <div className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                              {vendor.owner_email || '—'}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-[var(--rego-fg,#111111)]">
                            {toNumber(vendor.product_count)} arts.
                          </span>
                          <span className="text-[10px] text-[var(--rego-ink-3,#949494)] block">
                            {toNumber(vendor.order_count)} commandes
                          </span>
                          {!compactMode && toNumber(vendor.pending_order_count) > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                              {toNumber(vendor.pending_order_count)} en attente
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <ReGoAmtBox amount={toNumber(vendor.captured_revenue)} size="sm" />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 capitalize">
                            {vendor.subscription_plan || 'free'}
                          </span>
                          {!compactMode && vendor.subscription_type && (
                            <span className="text-[10px] text-[var(--rego-ink-3,#949494)] block mt-0.5 capitalize">
                              {vendor.subscription_type}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col items-start gap-1">
                            <ReGoStatusChip
                              status={statusChipTone[statusKey] || 'neutral'}
                              label={statusLabels[statusKey] || vendor.status}
                              size="xs"
                            />
                            {pendingRequest(vendor) && (
                              <ReGoStatusChip status="accent" label="Demande de type" size="xs" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-end">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedVendorId(vendor.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspecter</span>
                            </button>

                            {!vendor.is_verified && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void onStatusChange(vendor.id, 'verified')}
                                className="px-2 py-1 rounded-[var(--rego-r,8px)] text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Vérifier
                              </button>
                            )}

                            {vendor.status === 'suspended' ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void onStatusChange(vendor.id, 'active')}
                                className="px-2 py-1 rounded-[var(--rego-r,8px)] text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Réactiver
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setSuspendingId(vendor.id);
                                  setSuspendReason('');
                                }}
                                className="px-2 py-1 rounded-[var(--rego-r,8px)] text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
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
            <div className="pt-3 border-t border-[var(--rego-border,#dedede)] space-y-2">
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {pageList.map((entry, index) => (
                  entry === '…' ? (
                    <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-[var(--rego-ink-3,#949494)]">
                      …
                    </span>
                  ) : (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => onPageChange(entry)}
                      disabled={entry === page}
                      className={`min-w-[1.75rem] h-7 px-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold border transition-colors cursor-pointer ${
                        entry === page
                          ? 'bg-[var(--rego-accent,#ad0505)] text-white border-[var(--rego-accent,#ad0505)]'
                          : 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                      }`}
                    >
                      {entry}
                    </button>
                  )
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--rego-ink-2,#737373)]">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </ReGoCard>

      {/* Suspend Store Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(suspendingId)}
        onClose={() => {
          setSuspendingId(null);
          setSuspendReason('');
        }}
        onConfirm={async () => {
          if (!suspendingId) return;
          await onStatusChange(suspendingId, 'suspended', suspendReason);
          setSuspendingId(null);
          setSuspendReason('');
        }}
        title="Suspendre la boutique"
        description={
          <div className="space-y-3">
            <p>La boutique ne sera plus accessible aux acheteurs jusqu&apos;à réactivation par un administrateur.</p>
            <input
              type="text"
              placeholder="Raison de la suspension (infraction, non-conformité...)"
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              className={modalInputClasses}
            />
          </div>
        }
        confirmLabel="Confirmer la suspension"
        cancelLabel="Annuler"
        variant="danger"
        loading={busy}
      />

      {/* Reject Seller Type Request */}
      <ReGoModal
        isOpen={Boolean(rejectingId)}
        onClose={() => {
          setRejectingId(null);
          setRejectReason('');
        }}
        title="Rejeter la demande de type"
        subtitle="Indiquez la raison du rejet au vendeur."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setRejectingId(null);
                setRejectReason('');
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!rejectingId) return;
                void onRejectTypeRequest(rejectingId, rejectReason || undefined);
                setRejectingId(null);
                setRejectReason('');
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              Rejeter
            </button>
          </>
        }
      >
        <input
          type="text"
          placeholder="Raison du rejet..."
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          className={modalInputClasses}
        />
      </ReGoModal>

      {/* Suspend Owner Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(ownerSuspendId)}
        onClose={() => setOwnerSuspendId(null)}
        onConfirm={async () => {
          if (!ownerSuspendId) return;
          await onOwnerSuspend(ownerSuspendId);
          setOwnerSuspendId(null);
        }}
        title="Suspendre le compte propriétaire"
        description="Le propriétaire ne pourra plus se connecter à son espace vendeur jusqu&apos;à sa réactivation par l&apos;administration."
        confirmLabel="Suspendre le propriétaire"
        cancelLabel="Annuler"
        variant="danger"
        loading={busy}
      />

      {/* Reset Owner 2FA Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(reset2FAId)}
        onClose={() => setReset2FAId(null)}
        onConfirm={async () => {
          if (!reset2FAId) return;
          await onResetOwner2FA(reset2FAId);
          setReset2FAId(null);
        }}
        title="Réinitialiser le 2FA"
        description="Le propriétaire devra reconfigurer l&apos;authentification à deux facteurs lors de sa prochaine connexion."
        confirmLabel="Réinitialiser le 2FA"
        cancelLabel="Annuler"
        variant="warning"
        loading={busy}
      />

      {/* Clear Payment Config Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(clearPaymentsId)}
        onClose={() => setClearPaymentsId(null)}
        onConfirm={async () => {
          if (!clearPaymentsId) return;
          await onClearPaymentConfig(clearPaymentsId);
          setClearPaymentsId(null);
        }}
        title="Effacer la configuration de paiement"
        description="Les moyens de paiement de la boutique seront supprimés. Les nouvelles ventes seront bloquées jusqu&apos;à reconfiguration par le vendeur."
        confirmLabel="Effacer les paiements"
        cancelLabel="Annuler"
        variant="danger"
        loading={busy}
      />

      {/* Clear Custom Domain Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(clearDomainId)}
        onClose={() => setClearDomainId(null)}
        onConfirm={async () => {
          if (!clearDomainId) return;
          await onClearCustomDomain(clearDomainId);
          setClearDomainId(null);
        }}
        title="Retirer le domaine personnalisé"
        description="La boutique redeviendra accessible uniquement via son sous-domaine."
        confirmLabel="Retirer le domaine"
        cancelLabel="Annuler"
        variant="danger"
        loading={busy}
      />

      {/* Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedVendor)}
        onClose={() => setSelectedVendorId(null)}
        title={selectedVendor?.name || 'Détails Boutique'}
        subtitle={`Domaine: ${selectedVendor ? (selectedVendor.custom_domain || `${selectedVendor.subdomain}.${marketplaceDomain}`) : '—'}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedVendorId(null)}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
            >
              Fermer
            </button>
            {selectedVendor && (
              <a
                href={getStorefrontHref(selectedVendor)}
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
                {toNumber(selectedVendor.order_count)} commandes traitées · {toNumber(selectedVendor.product_count)} articles · {toNumber(selectedVendor.published_product_count)} publiés
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ReGoStatusChip
                  status={toNumber(selectedVendor.pending_order_count) > 0 ? 'warn' : 'neutral'}
                  label={`${toNumber(selectedVendor.pending_order_count)} commandes en attente`}
                  size="xs"
                />
                <ReGoStatusChip
                  status={toNumber(selectedVendor.open_report_count) > 0 ? 'err' : 'ok'}
                  label={`${toNumber(selectedVendor.open_report_count)} signalements`}
                  size="xs"
                />
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Identité de la Boutique</h4>
              <div className="space-y-1.5 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-ink-2,#737373)]">
                <p><strong className="text-[var(--rego-fg,#111111)]">Store ID :</strong> <span className="font-mono">{selectedVendor.id}</span></p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Sous-domaine :</strong> <span className="font-mono">{selectedVendor.subdomain}.{marketplaceDomain}</span></p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Domaine personnalisé :</strong> {selectedVendor.custom_domain || '—'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Créée le :</strong> {formatDate(selectedVendor.created_at)}</p>
                <p className="flex items-center gap-2 flex-wrap">
                  <strong className="text-[var(--rego-fg,#111111)]">Statut KYC :</strong>
                  <ReGoStatusChip
                    status={kycChipTone[selectedVendor.kyc_status || 'missing']}
                    label={kycLabels[selectedVendor.kyc_status || 'missing']}
                    size="xs"
                  />
                </p>
                {selectedVendor.kyc_created_at && (
                  <p><strong className="text-[var(--rego-fg,#111111)]">Déposé le :</strong> {formatDate(selectedVendor.kyc_created_at)}</p>
                )}
                {selectedVendor.kyc_reviewed_at && (
                  <p><strong className="text-[var(--rego-fg,#111111)]">Révisé le :</strong> {formatDate(selectedVendor.kyc_reviewed_at)}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Propriétaire Marchand</h4>
              <div className="space-y-1.5 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-ink-2,#737373)]">
                <p className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <strong className="text-[var(--rego-fg,#111111)]">Nom :</strong>
                  {[selectedVendor.owner_first_name, selectedVendor.owner_last_name].filter(Boolean).join(' ') || '—'}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <strong className="text-[var(--rego-fg,#111111)]">Email :</strong>
                  {selectedVendor.owner_email || '—'}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <strong className="text-[var(--rego-fg,#111111)]">Téléphone :</strong>
                  {selectedVendor.owner_phone || 'Non renseigné'}
                </p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Dernière connexion :</strong> {formatDate(selectedVendor.owner_last_login_at)}</p>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
                    <p className="text-sm font-black text-[var(--rego-fg,#111111)]">{toNumber(selectedVendor.owner_store_count)}</p>
                    <p className="text-[9px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">Boutiques</p>
                  </div>
                  <div className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
                    <p className="text-sm font-black text-[var(--rego-fg,#111111)]">{toNumber(selectedVendor.owner_free_store_count)}</p>
                    <p className="text-[9px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">Gratuites</p>
                  </div>
                  <div className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
                    <p className="text-sm font-black text-[var(--rego-fg,#111111)]">{toNumber(selectedVendor.owner_paid_store_count)}</p>
                    <p className="text-[9px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">Payantes</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <ReGoStatusChip
                    status={selectedVendor.owner_is_active === false ? 'err' : 'ok'}
                    label={selectedVendor.owner_is_active === false ? 'Propriétaire inactif' : 'Propriétaire actif'}
                    size="xs"
                  />
                  <ReGoStatusChip
                    status={selectedVendor.owner_two_factor_enabled ? 'ok' : 'neutral'}
                    label={selectedVendor.owner_two_factor_enabled ? '2FA activée' : '2FA désactivée'}
                    size="xs"
                  />
                  <ReGoStatusChip
                    status={selectedVendor.payment_config_set ? 'ok' : 'neutral'}
                    label={selectedVendor.payment_config_set ? 'Paiements configurés' : 'Paiements non configurés'}
                    size="xs"
                  />
                  <ReGoStatusChip status="info" label={sellerTypeLabel(selectedVendor.seller_type)} size="xs" />
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Type de Vente</h4>
              {selectedPendingRequest && (
                <div className="p-3 rounded-[var(--rego-r,8px)] border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        Demande en attente : le vendeur a demandé {sellerTypeLabel(selectedPendingRequest.requested_type)}
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Demandé le : {formatDate(selectedPendingRequest.requested_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void onApproveTypeRequest(selectedVendor.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approuver</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(selectedVendor.id);
                        setRejectReason('');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] text-[11px] font-bold border border-rose-200 dark:border-rose-800/60 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rejeter</span>
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">
                  Modifier directement
                </label>
                <select
                  value={currentSellerType(selectedVendor)}
                  onChange={(event) => void onSellerTypeChange(selectedVendor.id, event.target.value)}
                  disabled={busy}
                  className={`mt-1 ${selectClasses} cursor-pointer`}
                >
                  {sellerTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedOverride && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-[var(--rego-fg,#111111)]">Abonnement</h4>
                <div className="space-y-2 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedOverride.plan}
                      onChange={(event) => onSubscriptionOverrideChange(selectedVendor.id, { plan: event.target.value })}
                      className={`${selectClasses} cursor-pointer`}
                    >
                      {availableSubscriptionPlans.map((plan) => (
                        <option key={plan} value={plan}>{plan}</option>
                      ))}
                    </select>
                    <select
                      value={selectedOverride.type}
                      onChange={(event) => onSubscriptionOverrideChange(selectedVendor.id, { type: event.target.value })}
                      className={`${selectClasses} cursor-pointer`}
                    >
                      {subscriptionTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="date"
                    value={selectedOverride.expiresAt}
                    onChange={(event) => onSubscriptionOverrideChange(selectedVendor.id, { expiresAt: event.target.value })}
                    className={`${selectClasses} cursor-pointer`}
                  />
                  <button
                    type="button"
                    onClick={() => void onSubscriptionSave(selectedVendor.id, selectedOverride)}
                    disabled={busy}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] text-xs font-bold bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Enregistrer l&apos;abonnement</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Actions Administratives</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void onChatStoreOwner(selectedVendor)}
                  disabled={busy}
                  className={`${primaryActionClasses} sm:col-span-2`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Contacter le propriétaire</span>
                </button>
                {!selectedVendor.is_verified && (
                  <button
                    type="button"
                    onClick={() => void onStatusChange(selectedVendor.id, 'verified')}
                    disabled={busy}
                    className={outlineActionClasses}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Vérifier</span>
                  </button>
                )}
                {selectedVendor.status === 'suspended' ? (
                  <button
                    type="button"
                    onClick={() => void onStatusChange(selectedVendor.id, 'active')}
                    disabled={busy}
                    className={successActionClasses}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Réactiver</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSuspendingId(selectedVendor.id);
                      setSuspendReason('');
                    }}
                    disabled={busy}
                    className={dangerOutlineActionClasses}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Suspendre</span>
                  </button>
                )}
                {selectedVendor.owner_is_active === false ? (
                  <button
                    type="button"
                    onClick={() => void onOwnerReactivate(selectedVendor.id)}
                    disabled={busy}
                    className={outlineActionClasses}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Réactiver le propriétaire</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOwnerSuspendId(selectedVendor.id)}
                    disabled={busy}
                    className={dangerOutlineActionClasses}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Suspendre le propriétaire</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReset2FAId(selectedVendor.id)}
                  disabled={busy || !selectedVendor.owner_two_factor_enabled}
                  className={amberOutlineActionClasses}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Réinitialiser 2FA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClearPaymentsId(selectedVendor.id)}
                  disabled={busy || !selectedVendor.payment_config_set}
                  className={amberOutlineActionClasses}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Effacer les paiements</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClearDomainId(selectedVendor.id)}
                  disabled={busy || !selectedVendor.custom_domain}
                  className={outlineActionClasses}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Retirer le domaine</span>
                </button>
              </div>
              <Link
                href={`/reports?store=${encodeURIComponent(selectedVendor.id)}`}
                className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-accent,#ad0505)] hover:border-[var(--rego-accent,#ad0505)] transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Voir les signalements</span>
              </Link>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
