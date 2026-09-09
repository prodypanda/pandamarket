'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Package,
  Phone,
  Send,
  Sparkles,
  Truck,
  User,
  ShieldCheck,
  RotateCcw,
  Paperclip,
  X,
  AlertCircle,
  Loader2,
  Zap,
  ShoppingBag,
  CreditCard,
  Plus,
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
import { getResizedImageUrl } from '@/lib/image-url';
import { useLocale } from '@/contexts/LocaleContext';

export interface ChatConversation {
  id: string;
  type: string;
  status: string;
  store_id?: string | null;
  buyer_id?: string | null;
  seller_id?: string | null;
  order_id?: string | null;
  product_id?: string | null;
  subject: string;
  store_name?: string | null;
  buyer_email?: string | null;
  buyer_name?: string | null;
  product_title?: string | null;
  last_message_body?: string | null;
  unread_count?: number;
  last_message_at?: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id?: string | null;
  sender_role: string;
  sender_email?: string | null;
  sender_name?: string | null;
  body: string;
  attachments?: Array<{
    file_url?: string | null;
    file_key?: string | null;
    file_name: string;
    content_type: string;
  }>;
  created_at: string;
}

export interface SellerReGoMessagesProps {
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  messages: ChatMessage[];
  loadingList: boolean;
  loadingMessages: boolean;
  sendingMessage: boolean;
  onSelectConversation: (id: string) => void;
  onSendMessage: (text: string, attachments?: File[]) => Promise<void>;
  onValidateCodOrder?: (conversation: ChatConversation, finalPrice?: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function SellerReGoMessages({
  conversations,
  activeConversation,
  messages,
  loadingList,
  loadingMessages,
  sendingMessage,
  onSelectConversation,
  onSendMessage,
  onValidateCodOrder,
  onRefresh,
}: SellerReGoMessagesProps) {
  const { t, locale } = useLocale();

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'inquiries' | 'orders'>('all');
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 1-Click COD Modal
  const [isCodModalOpen, setIsCodModalOpen] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState('');
  const [codValidating, setCodValidating] = useState(false);
  const [codSuccess, setCodSuccess] = useState(false);

  // Scroll to bottom of message list
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Telemetry KPIs
  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );
  const inquiriesTotal = useMemo(
    () => conversations.filter((c) => Boolean(c.product_title || c.product_id)).length,
    [conversations]
  );
  const orderRelatedTotal = useMemo(
    () => conversations.filter((c) => Boolean(c.order_id)).length,
    [conversations]
  );

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (filterMode === 'unread') {
      list = list.filter((c) => (c.unread_count || 0) > 0);
    } else if (filterMode === 'inquiries') {
      list = list.filter((c) => Boolean(c.product_title || c.product_id));
    } else if (filterMode === 'orders') {
      list = list.filter((c) => Boolean(c.order_id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.buyer_name && c.buyer_name.toLowerCase().includes(q)) ||
          (c.buyer_email && c.buyer_email.toLowerCase().includes(q)) ||
          (c.subject && c.subject.toLowerCase().includes(q)) ||
          (c.product_title && c.product_title.toLowerCase().includes(q))
      );
    }

    return list;
  }, [conversations, filterMode, search]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !selectedFile) return;
    try {
      await onSendMessage(inputMessage.trim(), selectedFile ? [selectedFile] : undefined);
      setInputMessage('');
      setSelectedFile(null);
    } catch {
      // ignore
    }
  };

  const handleExecuteCod = async () => {
    if (!activeConversation || !onValidateCodOrder) return;
    setCodValidating(true);
    try {
      const priceNum = parseFloat(negotiatedPrice);
      await onValidateCodOrder(activeConversation, Number.isFinite(priceNum) ? priceNum : undefined);
      setCodSuccess(true);
      setTimeout(() => {
        setIsCodModalOpen(false);
        setCodSuccess(false);
      }, 1500);
    } finally {
      setCodValidating(false);
    }
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Ventes', href: '/hub/dashboard/orders' },
        { label: 'Messagerie clients' },
      ]}
      headerTitle="Messagerie Vendeur & Négociations Clients"
      headerSubtitle="Répondez aux acheteurs intéressés par vos articles, négociez les commandes spéciales et validez les paniers en direct."
      headerIcon={MessageSquare}
      statusBadge={
        <ReGoStatusChip
          status={unreadTotal > 0 ? 'accent' : 'ok'}
          label={unreadTotal > 0 ? `${unreadTotal} non lu(s)` : 'Tous lus'}
          size="sm"
        />
      }
      secondaryAction={
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
          <span>Actualiser</span>
        </button>
      }
      primaryAction={
        <Link
          href="/hub/dashboard/orders"
          className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3.5 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all"
        >
          <Truck className="w-4 h-4" />
          <span>Voir les Commandes COD</span>
        </Link>
      }
      alertBanner={
        unreadTotal > 0 ? (
          <div className="rounded-[var(--rego-r,8px)] border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-900 dark:text-amber-300 font-medium">
                <strong>{unreadTotal} question(s) d'acheteur(s) en attente :</strong> Un temps de réponse inférieur à 15 minutes multiplie vos conversions COD par 3 sur le marché tunisien.
              </p>
            </div>
          </div>
        ) : null
      }
      kpiStrip={
        <>
          <ReGoKpiHero
            label="Total Conversations"
            value={conversations.length}
            delta={`${unreadTotal} non lus`}
            deltaType={unreadTotal > 0 ? 'increase' : 'neutral'}
            hint="Flux d'échanges marchands"
            icon={MessageSquare}
            accent={conversations.length > 0}
          />
          <ReGoKpiHero
            label="Demandes d'Articles"
            value={inquiriesTotal}
            hint="Liées à une référence produit"
            icon={Package}
          />
          <ReGoKpiHero
            label="Commandes en Échange"
            value={orderRelatedTotal}
            hint="Fils attachés à un panier"
            icon={ShoppingBag}
          />
          <ReGoKpiHero
            label="Validation 1-Clic COD"
            value={<span className="text-emerald-600 text-lg font-black">Prêt</span>}
            hint="Anti-Refus & confirmation OTP"
            icon={Zap}
          />
        </>
      }
      mainContent={
        <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px]">
          
          {/* Left Pane: Conversations List */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[var(--rego-border,#dedede)]/70 flex flex-col bg-[var(--rego-surface,#f5f5f5)]/30">
            {/* Filter Bar */}
            <div className="p-3 border-b border-[var(--rego-border,#dedede)]/70 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une conversation..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-0.5">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'unread', label: `Non lus (${unreadTotal})` },
                  { id: 'inquiries', label: 'Articles' },
                  { id: 'orders', label: 'Commandes' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterMode(f.id as any)}
                    className={`px-2 py-0.5 rounded-[var(--rego-r,8px)] text-[10px] font-bold whitespace-nowrap transition-all ${
                      filterMode === f.id
                        ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                        : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--rego-border,#dedede)]/60">
              {loadingList ? (
                <div className="p-8 text-center text-xs text-[var(--rego-ink-2,#737373)]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--rego-accent,#ad0505)] mb-2" />
                  Chargement des messages...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--rego-ink-2,#737373)]">
                  Aucune conversation trouvée
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = activeConversation?.id === c.id;
                  const hasUnread = (c.unread_count || 0) > 0;
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectConversation(c.id)}
                      className={`p-3 cursor-pointer transition-colors flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-[var(--rego-bg,#ffffff)] border-l-3 border-l-[var(--rego-accent,#ad0505)] shadow-2xs'
                          : 'hover:bg-[var(--rego-surface,#f5f5f5)]/70'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] flex items-center justify-center text-[var(--rego-fg,#111111)] text-xs font-bold shrink-0">
                        {c.buyer_name ? c.buyer_name[0].toUpperCase() : <User className="w-4 h-4 text-[var(--rego-ink-2,#737373)]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs truncate ${hasUnread ? 'font-black text-[var(--rego-fg,#111111)]' : 'font-bold text-[var(--rego-fg,#111111)]'}`}>
                            {c.buyer_name || c.buyer_email || 'Acheteur'}
                          </h4>
                          {c.last_message_at && (
                            <span className="text-[10px] text-[var(--rego-ink-2,#737373)] shrink-0 font-mono">
                              {new Date(c.last_message_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        {c.product_title && (
                          <div className="text-[10px] font-bold text-[var(--rego-accent,#ad0505)] truncate mt-0.5">
                            Article : {c.product_title}
                          </div>
                        )}

                        <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'font-bold text-[var(--rego-fg,#111111)]' : 'text-[var(--rego-ink-2,#737373)]'}`}>
                          {c.last_message_body || c.subject || 'Nouvelle discussion'}
                        </p>
                      </div>

                      {hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-[var(--rego-accent,#ad0505)] shrink-0 mt-1" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Active Chat Room */}
          <div className="md:col-span-8 flex flex-col h-full bg-[var(--rego-bg,#ffffff)]">
            {activeConversation ? (
              <>
                {/* Active Chat Header */}
                <div className="p-3.5 border-b border-[var(--rego-border,#dedede)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[var(--rego-surface,#f5f5f5)]/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] flex items-center justify-center text-[var(--rego-fg,#111111)] font-bold text-xs shrink-0">
                      {activeConversation.buyer_name ? activeConversation.buyer_name[0].toUpperCase() : 'A'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-[var(--rego-fg,#111111)] truncate">
                          {activeConversation.buyer_name || activeConversation.buyer_email || 'Client'}
                        </h3>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                          Acheteur Vérifié
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)] truncate font-mono">
                        {activeConversation.buyer_email}
                      </p>
                    </div>
                  </div>

                  {/* 1-Click COD Quick Action Trigger */}
                  <div className="flex items-center gap-2 shrink-0">
                    {onValidateCodOrder && (
                      <button
                        type="button"
                        onClick={() => setIsCodModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Créer Commande COD Directe</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Attached Product Negotiation Card (if present) */}
                {activeConversation.product_title && (
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded bg-white dark:bg-slate-850 border border-amber-200 text-amber-700 shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                          Négociation portant sur l'article :
                        </span>
                        <h5 className="text-xs font-bold text-amber-950 dark:text-amber-100 truncate">
                          {activeConversation.product_title}
                        </h5>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCodModalOpen(true)}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs shrink-0"
                    >
                      Proposer un Prix Négocié
                    </button>
                  </div>
                )}

                {/* Messages Timeline */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[var(--rego-surface,#f5f5f5)]/10">
                  {loadingMessages ? (
                    <div className="p-8 text-center text-xs text-[var(--rego-ink-2,#737373)]">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--rego-accent,#ad0505)] mb-2" />
                      Chargement de la discussion...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--rego-ink-2,#737373)]">
                      Aucun message pour l'instant. Écrivez le premier message ci-dessous.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isSeller = m.sender_role === 'seller' || m.sender_role === 'admin';
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-[var(--rego-r,8px)] p-3 text-xs shadow-2xs ${
                              isSeller
                                ? 'bg-[var(--rego-fg,#111111)] text-white'
                                : 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-70 mb-1">
                              <span className="font-bold">{isSeller ? 'Vous (Marchand)' : m.sender_name || 'Acheteur'}</span>
                              <span className="font-mono">
                                {new Date(m.created_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>

                            {/* Attachments */}
                            {m.attachments && m.attachments.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-2">
                                {m.attachments.map((att, i) => (
                                  <a
                                    key={i}
                                    href={att.file_url || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-bold underline flex items-center gap-1"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>{att.file_name}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSend} className="p-3 border-t border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-2">
                  {selectedFile && (
                    <div className="flex items-center justify-between bg-[var(--rego-surface,#f5f5f5)] px-3 py-1.5 rounded text-xs">
                      <span className="truncate font-mono">{selectedFile.name}</span>
                      <button type="button" onClick={() => setSelectedFile(null)} className="text-rose-600 hover:opacity-80">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="p-2 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer transition-colors" title="Joindre une photo">
                      <Paperclip className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                        }}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Écrivez votre message à l'acheteur..."
                      className="flex-1 px-3.5 py-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                    />

                    <button
                      type="submit"
                      disabled={sendingMessage || (!inputMessage.trim() && !selectedFile)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {sendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Envoyer</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--rego-ink-2,#737373)] space-y-2">
                <MessageSquare className="w-8 h-8 text-[var(--rego-ink-2,#737373)]/40" />
                <p>Sélectionnez une conversation dans la liste pour démarrer l'échange.</p>
              </div>
            )}
          </div>
        </div>
      }
      modals={
        <ReGoModal
          isOpen={isCodModalOpen}
          onClose={() => setIsCodModalOpen(false)}
          title="Créer une Commande COD en 1-Clic"
          subtitle="Validez instantanément la commande négociée pour cet acheteur."
        >
          {codSuccess ? (
            <div className="p-4 rounded-[var(--rego-r,8px)] bg-emerald-50 text-emerald-800 text-xs font-bold text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600" />
              <p>Commande COD créée et envoyée en préparation d'expédition !</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)]">Acheteur :</span>
                  <span className="font-bold">{activeConversation?.buyer_name || activeConversation?.buyer_email}</span>
                </div>
                {activeConversation?.product_title && (
                  <div className="flex justify-between">
                    <span className="text-[var(--rego-ink-2,#737373)]">Article rattaché :</span>
                    <span className="font-bold truncate max-w-[200px]">{activeConversation.product_title}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)]">Mode de paiement :</span>
                  <span className="font-bold text-emerald-700">Contre Remboursement (COD)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Prix Net Négocié à Encaisser (TND)
                </label>
                <input
                  type="text"
                  value={negotiatedPrice}
                  onChange={(e) => setNegotiatedPrice(e.target.value)}
                  placeholder="Ex : 65.000"
                  className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3.5 py-2 text-xs font-mono font-bold text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
                <span className="text-[10px] text-[var(--rego-ink-2,#737373)] block">
                  Laissez vide pour conserver le prix officiel du catalogue.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--rego-border,#dedede)]">
                <button
                  type="button"
                  onClick={() => setIsCodModalOpen(false)}
                  className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={codValidating}
                  onClick={handleExecuteCod}
                  className="rounded-[var(--rego-r,8px)] bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {codValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Confirmer la commande COD</span>
                </button>
              </div>
            </div>
          )}
        </ReGoModal>
      }
    />
  );
}
