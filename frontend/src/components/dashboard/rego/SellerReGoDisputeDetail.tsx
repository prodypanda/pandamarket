'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ShieldAlert,
  Send,
  Upload,
  Paperclip,
  Download,
  Truck,
  MessageSquare,
  ShieldCheck,
  Building,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export type ReportStatus = 'open' | 'investigating' | 'awaiting_buyer' | 'awaiting_seller' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_email?: string | null;
  store_name?: string | null;
  order_id: string | null;
  category: string;
  priority: string;
  reason: string;
  status: ReportStatus;
  admin_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface ReportMessage {
  id: string;
  author_email?: string | null;
  author_role: string;
  body: string;
  created_at: string;
}

export interface ReportAttachment {
  id: string;
  message_id: string | null;
  file_url: string | null;
  file_key: string | null;
  file_name: string;
  file_size: number | string | null;
}

export interface CaseDetails {
  report: Report;
  messages: ReportMessage[];
  attachments: ReportAttachment[];
}

export interface SellerReGoDisputeDetailProps {
  details: CaseDetails | null;
  loading: boolean;
  body: string;
  files: File[];
  submitting: boolean;
  feedback: string | null;
  onBodyChange: (v: string) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmitReply: (e: FormEvent) => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoDisputeDetail({
  details,
  loading: _loading,
  body,
  files,
  submitting,
  feedback,
  onBodyChange,
  onFileChange,
  onSubmitReply,
  dir: _dir = 'ltr',
}: SellerReGoDisputeDetailProps) {
  const { t: _t, locale } = useLocale();
  const [resolutionProposal, setResolutionProposal] = useState<'resend' | 'refund_full' | 'refund_partial' | 'contest'>('contest');

  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const report = details?.report;
  const messages = details?.messages || [];
  const attachments = details?.attachments || [];

  const getStatusBadge = (status?: ReportStatus): { label: string; chipStatus: 'ok' | 'warn' | 'err' | 'info' | 'neutral' } => {
    if (!status) return { label: 'En attente', chipStatus: 'neutral' };
    switch (status) {
      case 'open': return { label: 'Nouveau Litige', chipStatus: 'err' };
      case 'investigating': return { label: 'En Analyse Admin', chipStatus: 'warn' };
      case 'awaiting_seller': return { label: 'Action Vendeur Requise', chipStatus: 'err' };
      case 'awaiting_buyer': return { label: 'En Attente Acheteur', chipStatus: 'info' };
      case 'resolved': return { label: 'Litige Résolu', chipStatus: 'ok' };
      case 'dismissed': return { label: 'Classé Sans Suite', chipStatus: 'neutral' };
      default: return { label: status, chipStatus: 'neutral' };
    }
  };

  const badge = getStatusBadge(report?.status);

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Litiges & Réclamations', href: '/hub/dashboard/reports' },
        { label: `Dossier ${report?.id ? report.id.slice(0, 8).toUpperCase() : '...'}`, href: '#' },
      ]}
      headerTitle={`Arbitrage Litige Commande #${report?.order_id ? report.order_id.slice(0, 8).toUpperCase() : (report?.id?.slice(0, 8).toUpperCase() || '')}`}
      headerSubtitle="Examinez les faits reprochés par le client et apportez vos justificatifs contradictoires."
      headerIcon={FileText}
      statusBadge={
        <ReGoStatusChip label={badge.label} status={badge.chipStatus} />
      }
      primaryAction={
        <Link
          href="/hub/dashboard/reports"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour aux Litiges</span>
        </Link>
      }
      alertBanner={
        feedback ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{feedback}</span>
          </div>
        ) : undefined
      }
      kpiStrip={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Commande Associée"
            value={<span className="font-mono text-base">{report?.order_id ? `#${report.order_id.slice(0, 8).toUpperCase()}` : 'Non spécifiée'}</span>}
            hint="Référence d'achat"
            icon={Truck}
            accent={true}
          />
          <ReGoKpiHero
            label="Client Plaignant"
            value={<span className="text-sm font-bold truncate block">{report?.reporter_email || 'Client'}</span>}
            hint="Email de notification"
            icon={MessageSquare}
          />
          <ReGoKpiHero
            label="Date d'Ouverture"
            value={report?.created_at ? new Date(report.created_at).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' }) : '—'}
            hint="Délai de réponse 48h"
            icon={Clock}
          />
          <ReGoKpiHero
            label="Arbitrage Plateforme"
            value="PandaMarket Trust"
            hint="Médiation commerciale"
            icon={ShieldCheck}
          />
        </div>
      }
      mainContent={
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: CLAIM DETAILS & DEFENSE FORM */}
          <div className="lg:col-span-7 space-y-6">
            {/* BUYER REASON */}
            <ReGoCard
              title="Motif & Faits Reprochés par l'Acheteur"
              subtitle="Description de la réclamation déposée auprès du service client"
              icon={AlertTriangle}
            >
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between text-slate-400 font-bold">
                    <span>Catégorie : {report?.category || 'Non-conformité produit'}</span>
                    <span className="capitalize">Priorité : {report?.priority || 'Moyenne'}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-relaxed">
                    {report?.reason}
                  </p>
                </div>

                {report?.admin_notes && (
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-200">
                    <strong className="block mb-0.5">Directive de l'Arbitre PandaMarket :</strong>
                    {report.admin_notes}
                  </div>
                )}
              </div>
            </ReGoCard>

            {/* SELLER RESPONSE FORM */}
            <ReGoCard
              title="Formulaire de Réponse du Marchand"
              subtitle="Soumettez vos explications contradictoires et proposez une issue au dossier"
              icon={ShieldAlert}
            >
              <form onSubmit={onSubmitReply} className="space-y-4 pt-2 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Proposition de règlement commercial
                  </label>
                  <select
                    value={resolutionProposal}
                    onChange={(e) => setResolutionProposal(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none"
                  >
                    <option value="contest">Contester formellement (Preuve de livraison irréfutable du transporteur)</option>
                    <option value="resend">Renvoyer un article neuf sans frais pour le client</option>
                    <option value="refund_full">Accepter le remboursement intégral de la commande</option>
                    <option value="refund_partial">Proposer un dédommagement partiel (50% du montant)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Explications factuelles pour l'arbitrage <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={body}
                    onChange={(e) => onBodyChange(e.target.value)}
                    placeholder="Détaillez vos arguments (date de remise au transporteur Aramex/La Poste, numéro de suivi, état du colis)..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Justificatifs / Bordereau d'expédition signé (Photos, PDF)
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      {files.length > 0 ? `${files.length} fichier(s) sélectionné(s)` : 'Téléverser le bordereau transporteur ou photo'}
                    </span>
                    <span className="text-[10px] text-slate-400">JPG, PNG ou PDF (Max 10 Mo)</span>
                    <input
                      type="file"
                      multiple
                      onChange={onFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !body.trim()}
                  className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmission de votre réponse...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Transmettre la Réponse Officielle à l'Administration</span>
                    </>
                  )}
                </button>
              </form>
            </ReGoCard>
          </div>

          {/* RIGHT: THREAD & ATTACHMENTS */}
          <div className="lg:col-span-5 space-y-6">
            {/* ATTACHMENTS */}
            <ReGoCard
              title="Pièces Jointes au Dossier"
              subtitle={`${attachments.length} fichier(s) versé(s) au dossier`}
              icon={Paperclip}
            >
              <div className="space-y-2 pt-2">
                {attachments.length > 0 ? (
                  attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                          {att.file_name}
                        </span>
                      </div>
                      {att.file_url && (
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Aucune pièce jointe versée pour le moment.
                  </div>
                )}
              </div>
            </ReGoCard>

            {/* MESSAGES THREAD */}
            <ReGoCard
              title="Fil des Échanges Contradictoires"
              subtitle="Historique chronologique des messages et observations"
              icon={MessageSquare}
            >
              <div className="space-y-3 pt-2 text-xs">
                {messages.length > 0 ? (
                  messages.map((m) => {
                    const isSeller = m.author_role === 'seller';
                    const isAdmin = m.author_role === 'admin' || m.author_role === 'staff';

                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border ${
                          isSeller
                            ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20'
                            : isAdmin
                            ? 'border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20'
                            : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span className={isSeller ? 'text-indigo-600 dark:text-indigo-400' : isAdmin ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}>
                            {isSeller ? 'Vous (Marchand)' : isAdmin ? 'Médiateur PandaMarket' : 'Acheteur'}
                          </span>
                          <span>
                            {new Date(m.created_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {m.body}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Aucun message enregistré dans ce dossier.
                  </div>
                )}
              </div>
            </ReGoCard>
          </div>
        </div>
      }
    />
  );
}
