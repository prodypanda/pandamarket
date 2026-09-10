'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Truck,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Navigation,
  ShieldCheck,
  Search,
  ExternalLink,
  Lock,
  User,
  Package,
  Clock,
  X,
  Loader2,
  DollarSign,
  FileText,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import { useLocale } from '@/contexts/LocaleContext';

export interface CourierPackage {
  id: string;
  orderNumber: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  governorate?: string;
  codAmount: number; // In TND
  status: 'pending' | 'out_for_delivery' | 'delivered' | 'failed';
  notes?: string;
  itemsSummary?: string;
  deliveredAt?: string;
}

export interface CourierReGoConsoleProps {
  packages: CourierPackage[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onVerifyDeliveryOtp: (pkg: CourierPackage, otp: string) => Promise<boolean>;
  onReportDeliveryFailed?: (pkg: CourierPackage, reason: string) => Promise<void>;
}

export function CourierReGoConsole({
  packages,
  loading,
  onRefresh,
  onVerifyDeliveryOtp,
  onReportDeliveryFailed,
}: CourierReGoConsoleProps) {
  const { t, locale } = useLocale();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'out_for_delivery' | 'delivered' | 'failed'>('all');

  // Active OTP Handshake Modal
  const [otpPkg, setOtpPkg] = useState<CourierPackage | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);

  // Active Failure/RTO Modal
  const [failedPkg, setFailedPkg] = useState<CourierPackage | null>(null);
  const [failReason, setFailReason] = useState('Client injoignable');
  const [failNotes, setFailNotes] = useState('');
  const [isReportingFail, setIsReportingFail] = useState(false);

  // Inspection Drawer
  const [inspectedPkg, setInspectedPkg] = useState<CourierPackage | null>(null);

  // Telemetry KPIs
  const totalCodToCollect = useMemo(
    () => packages.reduce((sum, p) => sum + (p.codAmount || 0), 0),
    [packages]
  );
  const totalCashCollected = useMemo(
    () =>
      packages
        .filter((p) => p.status === 'delivered')
        .reduce((sum, p) => sum + (p.codAmount || 0), 0),
    [packages]
  );
  const deliveredCount = useMemo(
    () => packages.filter((p) => p.status === 'delivered').length,
    [packages]
  );
  const pendingCount = useMemo(
    () => packages.filter((p) => p.status === 'out_for_delivery' || p.status === 'pending').length,
    [packages]
  );

  const filteredPackages = useMemo(() => {
    let list = packages;
    if (filterStatus !== 'all') {
      list = list.filter((p) => p.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.orderNumber.toLowerCase().includes(q) ||
          p.recipientName.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q)
      );
    }
    return list;
  }, [packages, filterStatus, search]);

  const handleConfirmOtp = async () => {
    if (!otpPkg) return;
    if (otpCode.length !== 4) {
      setOtpError("Veuillez saisir le code OTP à 4 chiffres fourni par l'acheteur.");
      return;
    }
    setIsVerifying(true);
    setOtpError('');
    try {
      const success = await onVerifyDeliveryOtp(otpPkg, otpCode);
      if (success) {
        setOtpSuccess(true);
        setTimeout(() => {
          setOtpPkg(null);
          setOtpSuccess(false);
          setOtpCode('');
        }, 1200);
      } else {
        setOtpError("Code OTP incorrect ou expiré. Demandez à l'acheteur de vérifier son SMS.");
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Échec de la vérification OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmFail = async () => {
    if (!failedPkg || !onReportDeliveryFailed) return;
    setIsReportingFail(true);
    try {
      await onReportDeliveryFailed(failedPkg, `${failReason} - ${failNotes}`);
      setFailedPkg(null);
      setFailNotes('');
    } finally {
      setIsReportingFail(false);
    }
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Plateforme PandaMarket', href: '/' },
        { label: 'Console Livreur Mobile' },
      ]}
      headerTitle="Tournée de Livraison & Encaissement COD"
      headerSubtitle="Feuille de route mobile pour les chauffeurs-livreurs : confirmez les réceptions de colis et encaissez les montants COD."
      headerIcon={Truck}
      statusBadge={
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>Tournée Active · GPS En Ligne</span>
        </span>
      }
      secondaryAction={
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
          <span>Actualiser Tournée</span>
        </button>
      }
      primaryAction={
        <div className="text-xs font-mono font-bold text-[var(--rego-fg,#111111)] bg-[var(--rego-surface,#f5f5f5)] px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] shadow-2xs">
          {deliveredCount}/{packages.length} Livrés
        </div>
      }
      alertBanner={
        pendingCount > 0 ? (
          <div className="rounded-[var(--rego-r,8px)] border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-900 dark:text-amber-300 font-medium">
                <strong>{pendingCount} colis à livrer contre remboursement :</strong> Assurez-vous d&apos;encaisser le montant exact en espèces avant de valider le code OTP remis par le client.
              </p>
            </div>
          </div>
        ) : null
      }
      kpiStrip={
        <>
          <ReGoKpiHero
            label="Colis Tournée Aujourd'hui"
            value={packages.length}
            delta={`${pendingCount} restants`}
            deltaType={pendingCount > 0 ? 'increase' : 'neutral'}
            hint="Feuille de route chauffeur"
            icon={Package}
            accent={packages.length > 0}
          />
          <ReGoKpiHero
            label="Colis Livrés avec Succès"
            value={deliveredCount}
            delta={`${Math.round((deliveredCount / (packages.length || 1)) * 100)}%`}
            deltaLabel="complété"
            deltaType="increase"
            hint="Validés par code OTP"
            icon={CheckCircle2}
          />
          <ReGoKpiHero
            label="Total COD à Encaisser"
            value={<ReGoAmtBox amount={totalCodToCollect} size="lg" />}
            hint="Espèces contre remboursement"
            icon={Truck}
          />
          <ReGoKpiHero
            label="Montant COD Collecté"
            value={<ReGoAmtBox amount={totalCashCollected} size="lg" />}
            hint="En caisse chauffeur"
            icon={DollarSign}
            accent={totalCashCollected > 0}
          />
        </>
      }
      filterToolbar={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par n° commande, client, téléphone, adresse..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `Tous (${packages.length})` },
              { id: 'out_for_delivery', label: `À livrer (${pendingCount})` },
              { id: 'delivered', label: `Livrés (${deliveredCount})` },
              { id: 'failed', label: 'Échecs / RTO' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                    : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      }
      mainContent={
        filteredPackages.length === 0 ? (
          <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-12 text-center shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--rego-surface,#f5f5f5)] flex items-center justify-center mx-auto text-[var(--rego-accent,#ad0505)]">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              {search ? 'Aucun colis correspondant aux critères' : 'Aucun colis assigné à cette tournée'}
            </h3>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              Toutes les livraisons de votre secteur sont terminées ou en attente d&apos;attribution logistique.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredPackages.map((pkg) => {
              const isDelivered = pkg.status === 'delivered';
              const isFailed = pkg.status === 'failed';
              return (
                <div
                  key={pkg.id}
                  className={`rounded-[var(--rego-r,8px)] border transition-all p-4 bg-[var(--rego-bg,#ffffff)] shadow-2xs flex flex-col justify-between ${
                    isDelivered
                      ? 'border-emerald-200/80 bg-emerald-50/20'
                      : isFailed
                        ? 'border-rose-200/80 bg-rose-50/20'
                        : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-accent,#ad0505)]/60'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Top: Order Number & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[var(--rego-fg,#111111)]">
                          {pkg.orderNumber}
                        </span>
                        <ReGoStatusChip
                          status={isDelivered ? 'ok' : isFailed ? 'err' : 'warn'}
                          label={
                            isDelivered
                              ? 'Livré (Encaissé)'
                              : isFailed
                                ? 'Échec / Retour'
                                : 'En cours de livraison'
                          }
                          size="xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setInspectedPkg(pkg)}
                        className="text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] underline"
                      >
                        Détails
                      </button>
                    </div>

                    {/* Recipient info & Click-to-Call */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)] truncate">
                          {pkg.recipientName}
                        </h4>
                        <a
                          href={`tel:${pkg.phone}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{pkg.phone}</span>
                        </a>
                      </div>

                      {/* Address & GPS Nav trigger */}
                      <div className="flex items-start gap-1.5 text-xs text-[var(--rego-ink-2,#737373)] pt-1">
                        <MapPin className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)] shrink-0 mt-0.5" />
                        <p className="flex-1 leading-snug">
                          {pkg.address}, {pkg.city} {pkg.governorate ? `(${pkg.governorate})` : ''}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${pkg.address}, ${pkg.city}, Tunisia`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/50 shrink-0"
                          title="Itinéraire GPS"
                        >
                          <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        </a>
                      </div>
                    </div>

                    {/* COD Amount Box */}
                    <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]/70 bg-[var(--rego-surface,#f5f5f5)]/50 p-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                        Montant COD à Encaisser :
                      </span>
                      <ReGoAmtBox amount={pkg.codAmount} size="md" />
                    </div>
                  </div>

                  {/* Actions Strip */}
                  <div className="mt-4 pt-3 border-t border-[var(--rego-border,#dedede)]/60 flex items-center justify-between gap-2">
                    {isDelivered ? (
                      <div className="w-full flex items-center justify-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 py-1.5 rounded-[var(--rego-r,8px)] border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Colis Remis & Fonds Encaissés</span>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setFailedPkg(pkg)}
                          className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-rose-600 hover:border-rose-300 transition-colors"
                        >
                          Signaler Échec
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpPkg(pkg);
                            setOtpCode('');
                            setOtpError('');
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Encaisser & Valider OTP</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
      drawer={
        <ReGoDrawer
          isOpen={inspectedPkg !== null}
          onClose={() => setInspectedPkg(null)}
          title="Fiche Colis Livreur"
          subtitle={inspectedPkg?.orderNumber}
        >
          {inspectedPkg && (
            <div className="space-y-4">
              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-bold uppercase text-[10px]">Destinataire :</span>
                  <span className="font-bold">{inspectedPkg.recipientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-bold uppercase text-[10px]">Téléphone :</span>
                  <a href={`tel:${inspectedPkg.phone}`} className="font-mono text-emerald-700 dark:text-emerald-300 font-bold underline">
                    {inspectedPkg.phone}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-bold uppercase text-[10px]">Montant COD :</span>
                  <ReGoAmtBox amount={inspectedPkg.codAmount} size="sm" />
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-bold uppercase text-[10px]">Statut livraison :</span>
                  <span className="font-bold">{inspectedPkg.status}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] block">
                  Adresse de livraison complète
                </label>
                <p className="text-xs text-[var(--rego-fg,#111111)] bg-[var(--rego-surface,#f5f5f5)]/50 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                  {inspectedPkg.address}, {inspectedPkg.city} {inspectedPkg.governorate ? `— Gouvernorat : ${inspectedPkg.governorate}` : ''}
                </p>
              </div>

              {inspectedPkg.itemsSummary && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] block">
                    Contenu du colis
                  </label>
                  <p className="text-xs text-[var(--rego-fg,#111111)] bg-[var(--rego-surface,#f5f5f5)]/50 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                    {inspectedPkg.itemsSummary}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInspectedPkg(null)}
                  className="px-3.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </ReGoDrawer>
      }
      modals={
        <>
          {/* OTP Handshake Modal */}
          <ReGoModal
            isOpen={otpPkg !== null}
            onClose={() => setOtpPkg(null)}
            title="Validation de Remise de Colis"
            subtitle={otpPkg?.orderNumber}
          >
            {otpSuccess ? (
              <div className="p-4 rounded-[var(--rego-r,8px)] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400" />
                <p>Livraison validée avec succès ! Les fonds COD sont enregistrés.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[var(--rego-r,8px)] border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                    Montant en Espèces à Encaisser :
                  </span>
                  <div className="text-xl font-black text-emerald-900 dark:text-emerald-100">
                    {otpPkg && <ReGoAmtBox amount={otpPkg.codAmount} size="lg" />}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                    Code OTP de remise (4 chiffres) *
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex : 4819"
                    className="w-full text-center text-2xl tracking-[0.5em] font-mono font-black rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] py-2 text-[var(--rego-fg,#111111)] focus:outline-none focus:border-emerald-600"
                    autoFocus
                  />
                  <p className="text-[11px] text-[var(--rego-ink-2,#737373)] text-center">
                    Le client a reçu ce code par SMS sur son numéro (+216 {otpPkg?.phone}).
                  </p>
                </div>

                {otpError && (
                  <div className="rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--rego-border,#dedede)]">
                  <button
                    type="button"
                    onClick={() => setOtpPkg(null)}
                    className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={isVerifying || otpCode.length !== 4}
                    onClick={handleConfirmOtp}
                    className="rounded-[var(--rego-r,8px)] bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Confirmer la réception & Encaisser</span>
                  </button>
                </div>
              </div>
            )}
          </ReGoModal>

          {/* Report Delivery Failed Modal */}
          <ReGoModal
            isOpen={failedPkg !== null}
            onClose={() => setFailedPkg(null)}
            title="Signaler un Échec de Livraison (RTO)"
            subtitle={failedPkg?.orderNumber}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Motif du Non-Aboutissement
                </label>
                <select
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-2 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none"
                >
                  <option value="Client injoignable">Client injoignable après 3 tentatives d&apos;appel</option>
                  <option value="Client absent">Client absent du domicile</option>
                  <option value="Adresse introuvable">Adresse erronée / introuvable</option>
                  <option value="Refus du colis">Refus explicite du colis par l&apos;acheteur</option>
                  <option value="Fonds insuffisants">Fonds COD non disponibles auprès du destinataire</option>
                  <option value="Autre">Autre motif opérationnel</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Précisions Chauffeur (Optionnel)
                </label>
                <textarea
                  rows={2}
                  value={failNotes}
                  onChange={(e) => setFailNotes(e.target.value)}
                  placeholder="Notes pour le marchand et le dispatch..."
                  className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-2.5 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--rego-border,#dedede)]">
                <button
                  type="button"
                  onClick={() => setFailedPkg(null)}
                  className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isReportingFail}
                  onClick={handleConfirmFail}
                  className="rounded-[var(--rego-r,8px)] bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {isReportingFail ? 'Signalement...' : "Confirmer l'échec"}
                </button>
              </div>
            </div>
          </ReGoModal>
        </>
      }
    />
  );
}
