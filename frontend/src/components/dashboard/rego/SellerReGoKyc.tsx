'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Upload,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Info,
  Building2,
  User,
  Phone,
  ArrowRight,
  ExternalLink,
  Lock,
  RefreshCw,
  Loader2,
  Eye,
  Check,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface KycVerification {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rc_document_url: string | null;
  cin_document_url: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface SellerReGoKycProps {
  verification: KycVerification | null;
  loading: boolean;
  submitting: boolean;
  rcDocUrl: string;
  cinDocUrl: string;
  phone: string;
  uploadingRc: boolean;
  uploadingCin: boolean;
  error: string;
  success: string;
  onUploadRc: (file: File) => Promise<void> | void;
  onUploadCin: (file: File) => Promise<void> | void;
  onPhoneChange: (phone: string) => void;
  onSubmit: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
}

export function SellerReGoKyc({
  verification,
  loading,
  submitting,
  rcDocUrl,
  cinDocUrl,
  phone,
  uploadingRc,
  uploadingCin,
  error,
  success,
  onUploadRc,
  onUploadCin,
  onPhoneChange,
  onSubmit,
  onRefresh,
}: SellerReGoKycProps) {
  const cinInputRef = useRef<HTMLInputElement | null>(null);
  const rcInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'individual' | 'business'>('business');
  const [cinDragActive, setCinDragActive] = useState(false);
  const [rcDragActive, setRcDragActive] = useState(false);

  const status = verification?.status || 'not_submitted';

  const handleCinDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCinDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void onUploadCin(e.dataTransfer.files[0]);
    }
  };

  const handleRcDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setRcDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void onUploadRc(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumb Trail */}
      <nav className="flex items-center gap-2 text-xs text-[var(--rego-ink-2,#737373)]">
        <Link href="/hub/dashboard" className="hover:text-[var(--rego-fg,#111111)] transition-colors">
          Accueil
        </Link>
        <span>/</span>
        <Link href="/hub/dashboard/settings" className="hover:text-[var(--rego-fg,#111111)] transition-colors">
          Paramètres
        </Link>
        <span>/</span>
        <span className="font-bold text-[var(--rego-fg,#111111)]">Vérification KYC & Conformité</span>
      </nav>

      {/* 2. Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${
            status === 'approved'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
              : status === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
              : status === 'rejected'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
              : 'bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]'
          }`}>
            {status === 'approved' ? (
              <ShieldCheck className="w-5 h-5" />
            ) : status === 'pending' ? (
              <Clock className="w-5 h-5" />
            ) : status === 'rejected' ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Dossier de Conformité KYC Vendeur
              </h1>
              <ReGoStatusChip
                status={
                  status === 'approved'
                    ? 'ok'
                    : status === 'pending'
                    ? 'warn'
                    : status === 'rejected'
                    ? 'err'
                    : 'neutral'
                }
                label={
                  status === 'approved'
                    ? 'Boutique Certifiée & Vérifiée'
                    : status === 'pending'
                    ? 'En cours d\'analyse (sous 24h)'
                    : status === 'rejected'
                    ? 'Dossier Rejeté'
                    : 'Non Soumis'
                }
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Certification légale d\&apos;entreprise · Registre National des Entreprises (RNE) & Banque Centrale de Tunisie
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* 3. Feedback alerts */}
      {error && (
        <div className="rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Operational Banner depending on status */}
      {status === 'rejected' && verification?.rejection_reason && (
        <div className="rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50/90 dark:bg-rose-950/40 p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-300">
                Motif de refus communiqué par l\&apos;administration PandaMarket
              </h3>
              <p className="text-xs text-rose-800 mt-1 font-medium">
                {verification.rejection_reason}
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-2">
                Veuillez mettre à jour les documents ci-dessous avec des copies parfaitement lisibles puis re-soumettre le dossier.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="rounded-[var(--rego-r,8px)] border border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Dossier en attente de vérification manuelle
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Vos pièces justificatives ont bien été transmises au service conformité PandaMarket. L\&apos;examen moyen prend entre 2 et 24 heures ouvrables. Vous recevrez une notification par SMS et email dès validation.
              </p>
              {verification?.created_at && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-mono mt-1.5">
                  Dossier déposé le : {new Date(verification.created_at).toLocaleString('fr-TN')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'approved' && (
        <div className="rounded-[var(--rego-r,8px)] border border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Boutique Certifiée & Conformité Validée
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                Félicitations ! Votre statut marchand est pleinement certifié. Vous bénéficiez des virements automatiques de vos soldes séquestre, du badge de confiance sur la marketplace et des plafonds de vente illimités.
              </p>
              {verification?.reviewed_at && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono mt-1.5">
                  Validé avec succès le : {new Date(verification.reviewed_at).toLocaleDateString('fr-TN')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ReGoKpiHero
          label="Statut Conformité"
          value={
            status === 'approved'
              ? 'Certifié'
              : status === 'pending'
              ? 'En Revue'
              : status === 'rejected'
              ? 'Rejeté'
              : 'À Soumettre'
          }
          hint={
            status === 'approved'
              ? 'Badge vendeur vérifié actif'
              : 'Examen par équipe locale'
          }
          accent={status === 'approved'}
          icon={ShieldCheck}
        />
        <ReGoKpiHero
          label="Pièce d\'Identité (CIN)"
          value={
            cinDocUrl || verification?.cin_document_url
              ? 'Transmise'
              : 'Manquante'
          }
          hint="CIN tunisienne 8 chiffres"
          icon={User}
        />
        <ReGoKpiHero
          label="Registre de Commerce (RNE)"
          value={
            rcDocUrl || verification?.rc_document_url
              ? 'Transmis'
              : 'Manquant'
          }
          hint="Extrait RNE ou patente"
          icon={Building2}
        />
        <ReGoKpiHero
          label="Téléphone Professionnel"
          value={
            verification?.phone_number || phone || 'Non renseigné'
          }
          hint={
            verification?.phone_verified
              ? 'Vérifié par code OTP'
              : 'Ligne directe marchand'
          }
          icon={Phone}
        />
      </div>

      {/* 5. Main Form / Verification Review */}
      {status === 'approved' ? (
        <ReGoCard
          title="Documents Officiels Archivés & Certifiés"
          subtitle="Vos justificatifs sont conservés de manière chiffrée selon la norme bancaire"
          icon={ShieldCheck}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-emerald-100 text-emerald-700 dark:text-emerald-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">Carte d\&apos;Identité Nationale</h4>
                  <p className="text-[11px] text-[var(--rego-ink-2,#737373)] font-mono mt-0.5">
                    Document vérifié & scellé
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                <Check className="w-3.5 h-3.5" />
                Valide
              </span>
            </div>

            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-emerald-100 text-emerald-700 dark:text-emerald-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">Extrait RNE / Patente</h4>
                  <p className="text-[11px] text-[var(--rego-ink-2,#737373)] font-mono mt-0.5">
                    Immatriculation légale active
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                <Check className="w-3.5 h-3.5" />
                Valide
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--rego-border,#dedede)]/70 flex items-center justify-between text-xs text-[var(--rego-ink-2,#737373)]">
            <span>Identifiant de certification : <strong className="font-mono text-[var(--rego-fg,#111111)]">{verification?.id}</strong></span>
            <Link
              href="/hub/dashboard/wallet"
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline"
            >
              <span>Accéder à mon portefeuille & RIB</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </ReGoCard>
      ) : (
        <div className="space-y-6">
          {/* Activity Category Selector */}
          <div className="flex items-center gap-2 p-1 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'business'
                  ? 'bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Entreprise / Société / Commerçant (RNE)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'individual'
                  ? 'bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Artisan / Créateur Indépendant (CIN)</span>
            </button>
          </div>

          <ReGoCard
            title="Dépôt des Pièces Justificatives Légales"
            subtitle="Formats acceptés : PDF, PNG, JPG (maximum 10 Mo par document)"
            icon={FileText}
          >
            <div className="space-y-6">
              {/* Phone Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1.5">
                  Numéro de Téléphone Professionnel Tunisien <span className="text-[var(--rego-accent,#ad0505)]">*</span>
                </label>
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-[var(--rego-ink-2,#737373)] font-mono">
                    +216
                  </div>
                  <input
                    type="tel"
                    placeholder="98 123 456"
                    value={phone}
                    onChange={(e) => onPhoneChange(e.target.value)}
                    disabled={status === 'pending'}
                    className="w-full pl-14 pe-3 py-2 text-xs font-mono rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] focus:border-[var(--rego-accent,#ad0505)] focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)] outline-none"
                  />
                </div>
                <p className="text-[11px] text-[var(--rego-ink-3,#949494)] mt-1">
                  Ce numéro servira aux alertes opérationnelles et à la validation des virements bancaires.
                </p>
              </div>

              {/* Upload Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* CIN Upload Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                      1. Carte d\&apos;Identité Nationale (CIN) <span className="text-[var(--rego-accent,#ad0505)]">*</span>
                    </label>
                    {(cinDocUrl || verification?.cin_document_url) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Prêt
                      </span>
                    )}
                  </div>

                  <input
                    ref={cinInputRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        void onUploadCin(e.target.files[0]);
                      }
                    }}
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setCinDragActive(true);
                    }}
                    onDragLeave={() => setCinDragActive(false)}
                    onDrop={handleCinDrop}
                    onClick={() => status !== 'pending' && cinInputRef.current?.click()}
                    className={`rounded-[var(--rego-r,8px)] border-2 border-dashed p-6 text-center transition-all ${
                      status === 'pending'
                        ? 'opacity-60 cursor-not-allowed border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]'
                        : cinDragActive
                        ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-accent-soft,rgba(173,5,5,0.05))] cursor-pointer'
                        : cinDocUrl || verification?.cin_document_url
                        ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/40 cursor-pointer hover:border-emerald-400'
                        : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-accent,#ad0505)] cursor-pointer bg-white dark:bg-slate-900'
                    }`}
                  >
                    {uploadingCin ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-[var(--rego-accent,#ad0505)] animate-spin" />
                        <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                          Téléversement sécurisé en cours...
                        </span>
                      </div>
                    ) : cinDocUrl || verification?.cin_document_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-300">
                          <Check className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                          CIN enregistrée
                        </span>
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                          {cinDocUrl || verification?.cin_document_url}
                        </p>
                        {status !== 'pending' && (
                          <span className="text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:underline mt-1">
                            Remplacer le document
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 rounded-full bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)]">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                            Glissez votre CIN Recto/Verso ici
                          </span>
                          <span className="text-xs text-[var(--rego-ink-2,#737373)] block mt-0.5">
                            ou cliquez pour parcourir vos fichiers
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                          Photo nette ou scan PDF de la CIN tunisienne
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* RC / RNE Upload Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                      2. Extrait RNE / Registre de Commerce <span className="text-[var(--rego-accent,#ad0505)]">*</span>
                    </label>
                    {(rcDocUrl || verification?.rc_document_url) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Prêt
                      </span>
                    )}
                  </div>

                  <input
                    ref={rcInputRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        void onUploadRc(e.target.files[0]);
                      }
                    }}
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setRcDragActive(true);
                    }}
                    onDragLeave={() => setRcDragActive(false)}
                    onDrop={handleRcDrop}
                    onClick={() => status !== 'pending' && rcInputRef.current?.click()}
                    className={`rounded-[var(--rego-r,8px)] border-2 border-dashed p-6 text-center transition-all ${
                      status === 'pending'
                        ? 'opacity-60 cursor-not-allowed border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]'
                        : rcDragActive
                        ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-accent-soft,rgba(173,5,5,0.05))] cursor-pointer'
                        : rcDocUrl || verification?.rc_document_url
                        ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/40 cursor-pointer hover:border-emerald-400'
                        : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-accent,#ad0505)] cursor-pointer bg-white dark:bg-slate-900'
                    }`}
                  >
                    {uploadingRc ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-[var(--rego-accent,#ad0505)] animate-spin" />
                        <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                          Téléversement sécurisé en cours...
                        </span>
                      </div>
                    ) : rcDocUrl || verification?.rc_document_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-300">
                          <Check className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                          Extrait RNE enregistré
                        </span>
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                          {rcDocUrl || verification?.rc_document_url}
                        </p>
                        {status !== 'pending' && (
                          <span className="text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:underline mt-1">
                            Remplacer le document
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 rounded-full bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)]">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                            Glissez votre Extrait RNE / RC ici
                          </span>
                          <span className="text-xs text-[var(--rego-ink-2,#737373)] block mt-0.5">
                            ou cliquez pour parcourir vos fichiers
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                          Extrait RNE datant de moins de 3 mois ou déclaration d\&apos;existence
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Legal Note */}
              <div className="rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]/80 p-3 flex items-start gap-2.5 text-xs text-[var(--rego-ink-2,#737373)]">
                <Info className="w-4 h-4 text-[var(--rego-accent,#ad0505)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-[var(--rego-fg,#111111)]">
                    Cadre Légal & Sécurité des Données Bancaires en Tunisie
                  </p>
                  <p>
                    Conformément aux directives de la Banque Centrale de Tunisie (BCT) et de la loi n° 2018-52 relative au Registre National des Entreprises, ces pièces permettent de certifier la traçabilité des transactions et de débloquer les virements sur votre compte bancaire tunisien.
                  </p>
                </div>
              </div>

              {/* Submission Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-[var(--rego-ink-3,#949494)]">
                  Tous les champs marqués d\&apos;un astérisque sont obligatoires
                </div>

                <button
                  type="button"
                  onClick={() => void onSubmit()}
                  disabled={submitting || status === 'pending' || !cinDocUrl || !rcDocUrl || !phone}
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-6 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[var(--rego-accent-dark,#880404)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmission en cours...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Transmettre mon dossier pour certification officielle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </ReGoCard>
        </div>
      )}
    </div>
  );
}
