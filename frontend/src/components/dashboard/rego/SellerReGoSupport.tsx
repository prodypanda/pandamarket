'use client';

import React, { useState } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Paperclip,
  Check,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  Inbox,
  User,
  ExternalLink,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  body: string;
  created_at: string;
  is_internal?: boolean;
}

export interface TicketAttachment {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

export type SellerStatusFilter = 'all' | 'open' | 'in_progress' | 'waiting_seller' | 'waiting_admin' | 'resolved' | 'closed';

export interface SellerReGoSupportProps {
  tickets: Ticket[];
  selectedTicketId: string | null;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  replyBody: string;
  subject: string;
  description: string;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  statusFilter: SellerStatusFilter;
  onSelectTicket: (id: string) => void;
  onStatusFilterChange: (f: SellerStatusFilter) => void;
  onSubjectChange: (s: string) => void;
  onDescriptionChange: (d: string) => void;
  onReplyBodyChange: (r: string) => void;
  onCreateTicket: (e: React.FormEvent) => Promise<void> | void;
  onSendReply: (e: React.FormEvent) => Promise<void> | void;
  onUpdateStatus: (status: 'open' | 'closed') => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  dir?: 'ltr' | 'rtl';
}

function getStatusChip(status: string) {
  switch (status) {
    case 'open':
    case 'waiting_seller':
      return <ReGoStatusChip status="warn" label="En attente" />;
    case 'in_progress':
    case 'waiting_admin':
      return <ReGoStatusChip status="info" label="En cours" />;
    case 'resolved':
    case 'closed':
      return <ReGoStatusChip status="ok" label="Résolu" />;
    default:
      return <ReGoStatusChip status="neutral" label={status} />;
  }
}

export function SellerReGoSupport({
  tickets,
  selectedTicketId,
  messages,
  attachments,
  replyBody,
  subject,
  description,
  loading,
  submitting,
  error,
  statusFilter,
  onSelectTicket,
  onStatusFilterChange,
  onSubjectChange,
  onDescriptionChange,
  onReplyBodyChange,
  onCreateTicket,
  onSendReply,
  onUpdateStatus,
  onRefresh,
  dir = 'ltr',
}: SellerReGoSupportProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const openTicketsCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_admin').length;
  const resolvedTicketsCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    await onCreateTicket(e);
    setShowCreateModal(false);
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Espace Vendeur', href: '/hub/dashboard' },
        { label: 'Assistance & Support' },
      ]}
      headerTitle="Assistance Marchand & Support Technique"
      headerSubtitle="Ouvrez des tickets d'assistance, échangez avec les équipes PandaMarket et suivez vos résolutions."
      headerIcon={LifeBuoy}
      statusBadge={
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          ReGo Desk 24/7
        </span>
      }
      primaryAction={
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Ticket</span>
        </button>
      }
      secondaryAction={
        <button
          onClick={() => void onRefresh()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
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
              label="Dossiers d'Assistance"
              value={tickets.length}
              hint="Tickets enregistrés au support"
              icon={MessageSquare}
              accent
            />
            <ReGoKpiHero
              label="En Traitement"
              value={openTicketsCount}
              hint="Tickets en cours de prise en charge"
              icon={Clock}
            />
            <ReGoKpiHero
              label="Résolus & Clôturés"
              value={resolvedTicketsCount}
              hint="Demandes satisfaites avec succès"
              icon={CheckCircle2}
            />
            <ReGoKpiHero
              label="Délai Moyen Réponse"
              value="< 2h"
              hint="Engagement SLA équipe PandaMarket"
              icon={ShieldCheck}
            />
          </div>

          {/* Split Workspace Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Pane: Ticket List */}
            <div className="lg:col-span-5 space-y-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    { id: 'all', label: 'Tous' },
                    { id: 'open', label: 'Ouverts' },
                    { id: 'in_progress', label: 'En cours' },
                    { id: 'resolved', label: 'Résolus' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onStatusFilterChange(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      statusFilter === f.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Tickets Cards */}
              <div className="space-y-2.5">
                {loading && tickets.length === 0 ? (
                  <div className="py-12 flex justify-center items-center">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Aucun ticket d&apos;assistance
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cliquez sur Nouveau Ticket pour poser une question ou signaler une anomalie.
                    </p>
                  </div>
                ) : (
                  tickets.map((t) => {
                    const isSelected = selectedTicketId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => onSelectTicket(t.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-900 shadow-xs ring-1 ring-slate-900/10'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-slate-400">
                                #{t.ticket_number}
                              </span>
                              {getStatusChip(t.status)}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {t.subject}
                            </h4>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400 font-mono">
                          Mis à jour :{' ' }
                          {new Date(t.updated_at).toLocaleDateString('fr-TN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Pane: Thread & Replies */}
            <div className="lg:col-span-7">
              {selectedTicket ? (
                <ReGoCard
                  title={
                    <div className="flex items-center gap-2">
                      <span>#{selectedTicket.ticket_number}</span>
                      <span className="text-slate-400 font-normal">|</span>
                      <span>{selectedTicket.subject}</span>
                    </div>
                  }
                  actions={
                    <div className="flex items-center gap-2">
                      {selectedTicket.status !== 'closed' ? (
                        <button
                          onClick={() => void onUpdateStatus('closed')}
                          disabled={submitting}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          Clôturer le ticket
                        </button>
                      ) : (
                        <button
                          onClick={() => void onUpdateStatus('open')}
                          disabled={submitting}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                        >
                          Rouvrir le ticket
                        </button>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {/* Messages Scroll Area */}
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {messages.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                          Chargement des messages de ce ticket...
                        </div>
                      ) : (
                        messages.map((m) => {
                          const isAdmin = m.is_internal || !m.is_internal; // Or check sender if available
                          return (
                            <div
                              key={m.id}
                              className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                                m.is_internal
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-8'
                                  : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 ml-8'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] opacity-75">
                                <span className="font-bold">
                                  {m.is_internal ? 'Support PandaMarket' : 'Vous (Marchand)'}
                                </span>
                                <span className="font-mono">
                                  {new Date(m.created_at).toLocaleDateString('fr-TN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Attachments list if any */}
                    {attachments.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                          Pièces jointes ({attachments.length}) :
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((a) => (
                            <a
                              key={a.id}
                              href={a.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] hover:bg-slate-200 transition"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span className="max-w-xs truncate">{a.file_name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reply Box */}
                    {selectedTicket.status !== 'closed' && (
                      <form onSubmit={onSendReply} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <textarea
                          value={replyBody}
                          onChange={(e) => onReplyBodyChange(e.target.value)}
                          placeholder="Écrivez votre réponse ou apportez des précisions..."
                          rows={3}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-slate-900 dark:focus:border-white transition resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={submitting || !replyBody.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-40"
                          >
                            {submitting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>Envoyer la Réponse</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </ReGoCard>
              ) : (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <MessageSquare className="w-10 h-10 text-slate-400 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Sélectionnez un ticket pour afficher la discussion
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Choisissez un ticket existant dans la colonne de gauche ou cliquez sur Nouveau Ticket pour solliciter notre équipe technique.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="w-5 h-5 text-slate-900 dark:text-white" />
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Ouvrir un Nouveau Ticket
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>

                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sujet de la demande <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => onSubjectChange(e.target.value)}
                      placeholder="Ex: Problème d'impression bordereau Aramex, question sur mon abonnement"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-slate-900 dark:focus:border-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description détaillée <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => onDescriptionChange(e.target.value)}
                      placeholder="Veuillez décrire le problème rencontré, les références des commandes ou les messages d'erreur affichés..."
                      required
                      rows={5}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-slate-900 dark:focus:border-white transition resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !subject.trim() || !description.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Créer le Dossier</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
