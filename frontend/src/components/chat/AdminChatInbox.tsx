'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  Inbox,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent';
import { useLocale } from '@/contexts/LocaleContext';

type ChatType = 'buyer_seller' | 'seller_admin' | 'buyer_admin' | 'seller_seller';
type ChatStatus = 'open' | 'closed';

interface ChatConversation {
  id: string;
  type: ChatType;
  status: ChatStatus;
  store_id?: string | null;
  buyer_id?: string | null;
  seller_id?: string | null;
  order_id?: string | null;
  product_id?: string | null;
  subject: string;
  store_name?: string | null;
  store_subdomain?: string | null;
  buyer_email?: string | null;
  buyer_name?: string | null;
  seller_email?: string | null;
  seller_name?: string | null;
  product_title?: string | null;
  last_message_body?: string | null;
  unread_count?: number;
  last_message_at?: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id?: string | null;
  sender_role: string;
  sender_name?: string | null;
  sender_email?: string | null;
  body: string;
  attachments?: ChatAttachment[];
  created_at: string;
}

interface ChatAttachment {
  file_url?: string | null;
  file_key?: string | null;
  file_name: string;
  content_type: string;
  file_size?: number | null;
}

interface ChatLimits {
  message_rate_limit_per_minute: number;
  max_images_per_message: number;
  max_image_size_bytes: number;
  max_message_length: number;
}

interface PendingImage {
  file: File;
  previewUrl: string;
}

interface ChatDetails {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

interface AdminChatTarget {
  id: string;
  name?: string | null;
  email?: string | null;
  subdomain?: string | null;
  owner_id?: string | null;
  owner_email?: string | null;
  owner_name?: string | null;
}

const DEFAULT_CHAT_LIMITS: ChatLimits = {
  message_rate_limit_per_minute: 20,
  max_images_per_message: 4,
  max_image_size_bytes: 5 * 1024 * 1024,
  max_message_length: 5000,
};

const CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function ChatImageAttachment({ attachment, mine }: { attachment: ChatAttachment; mine: boolean }) {
  const [imageUrl, setImageUrl] = useState(attachment.file_url || '');

  useEffect(() => {
    if (attachment.file_url || !attachment.file_key) return;
    let active = true;
    async function loadImageUrl() {
      const res = await fetchWithCsrf(`/api/pd/files/access?key=${encodeURIComponent(attachment.file_key!)}`);
      const data = await res.json().catch(() => null);
      if (active && res.ok && data?.download_url) setImageUrl(data.download_url);
    }
    void loadImageUrl();
    return () => {
      active = false;
    };
  }, [attachment.file_key, attachment.file_url]);

  if (!imageUrl) {
    return (
      <div className={`flex h-24 w-36 items-center justify-center rounded-xl ${mine ? 'bg-white/15' : 'bg-slate-100 dark:bg-slate-800'}`}>
        <Loader2 className="h-4 w-4 animate-spin opacity-60" />
      </div>
    );
  }

  return (
    <a href={imageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-2xs hover:opacity-95 transition">
      <span
        aria-label={attachment.file_name}
        role="img"
        className="block h-36 w-52 max-w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${getResizedImageUrl(imageUrl, 'large')})` }}
      />
    </a>
  );
}

export function AdminChatInbox({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { t, dir } = useLocale();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [active, setActive] = useState<ChatDetails | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('conversation');
  });

  const [mobilePane, setMobilePane] = useState<'list' | 'thread'>('list');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [chatLimits, setChatLimits] = useState<ChatLimits>(DEFAULT_CHAT_LIMITS);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ChatStatus>('all');
  const [type, setType] = useState<'all' | ChatType>('all');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New admin ticket target search
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newSubject, setNewSubject] = useState('Assistance administrative');
  const [newBody, setNewBody] = useState('');
  const [adminTargetType, setAdminTargetType] = useState<'seller' | 'buyer'>('seller');
  const [adminTargetId, setAdminTargetId] = useState('');
  const [adminTargetSearch, setAdminTargetSearch] = useState('');
  const [adminTargets, setAdminTargets] = useState<AdminChatTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  const pendingImagesRef = useRef<PendingImage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConversation = active?.conversation;

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => () => {
    for (const image of pendingImagesRef.current) URL.revokeObjectURL(image.previewUrl);
  }, []);

  useEffect(() => {
    let activeRequest = true;
    async function loadChatLimits() {
      const res = await fetchWithCsrf('/api/pd/chats/limits');
      const data = await res.json().catch(() => null);
      if (activeRequest && res.ok && data?.data) {
        setChatLimits({ ...DEFAULT_CHAT_LIMITS, ...data.data });
      }
    }
    void loadChatLimits();
    return () => {
      activeRequest = false;
    };
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      if (type !== 'all') params.set('type', type);

      const res = await fetchWithCsrf(`/api/pd/chats/admin?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login/admin';
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Impossible de charger les discussions');
      }
      const data = await res.json();
      const next = data.data || [];
      setConversations(next);

      if (!activeId && next[0]) {
        setActiveId(next[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du chargement');
    } finally {
      setLoadingList(false);
    }
  }, [activeId, search, status, type]);

  const loadConversation = useCallback(async (id: string) => {
    setLoadingConversation(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/chats/admin/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Impossible de charger la discussion');
      }
      const data = await res.json();
      setActive(data);
      setMobilePane('thread');

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('conversation', id);
        window.history.replaceState({}, '', url.toString());
      }

      await fetchWithCsrf(`/api/pd/chats/admin/${id}/read`, { method: 'POST' }).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du chargement de la discussion');
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) void loadConversation(activeId);
  }, [activeId, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages]);

  // Search admin targets
  useEffect(() => {
    if (!showCreateAdmin) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingTargets(true);
      try {
        const params = new URLSearchParams({ kind: adminTargetType, search: adminTargetSearch.trim() });
        const res = await fetchWithCsrf(`/api/pd/chats/admin/targets/search?${params.toString()}`);
        if (!res.ok) throw new Error('Échec de la recherche');
        const data = await res.json();
        if (!cancelled) setAdminTargets(data.data || []);
      } catch {
        if (!cancelled) setAdminTargets([]);
      } finally {
        if (!cancelled) setLoadingTargets(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [adminTargetSearch, adminTargetType, showCreateAdmin]);

  useRealtimeEvent('chat_message', (payload) => {
    const item = payload as { conversation_id?: string };
    void loadConversations();
    if (item.conversation_id && item.conversation_id === activeId) {
      void loadConversation(item.conversation_id);
    }
  }, [activeId, loadConversation, loadConversations]);

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;
    setError(null);
    const remainingSlots = Math.max(0, chatLimits.max_images_per_message - pendingImages.length);
    const accepted: PendingImage[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      if (!CHAT_IMAGE_TYPES.has(file.type)) {
        setError('Formats autorisés : JPG, PNG, WebP ou GIF.');
        continue;
      }
      if (file.size > chatLimits.max_image_size_bytes) {
        setError(`L'image doit faire moins de ${Math.floor(chatLimits.max_image_size_bytes / (1024 * 1024))} Mo.`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (files.length > remainingSlots) {
      setError(`Limite de ${chatLimits.max_images_per_message} images par message.`);
    }
    if (accepted.length > 0) {
      setPendingImages((current) => [...current, ...accepted]);
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages((current) => {
      const next = [...current];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const uploadPendingImages = async () => {
    const attachments: ChatAttachment[] = [];
    for (const image of pendingImages) {
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: image.file.name,
          content_type: image.file.type,
          file_size: image.file.size,
          purpose: 'chat_image',
        }),
      });
      if (!presignRes.ok) throw new Error('Échec de préparation');
      const presignData = await presignRes.json();
      const uploadRes = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': image.file.type },
        body: image.file,
      });
      if (!uploadRes.ok) throw new Error(`Échec du téléversement pour ${image.file.name}`);
      attachments.push({
        file_key: presignData.file_key,
        file_name: image.file.name,
        content_type: image.file.type,
        file_size: image.file.size,
      });
    }
    return attachments;
  };

  const sendMessage = async () => {
    if (!activeConversation || (!draft.trim() && pendingImages.length === 0)) return;
    setSending(true);
    setError(null);
    try {
      const attachments = await uploadPendingImages();
      const res = await fetchWithCsrf(`/api/pd/chats/admin/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim(), attachments }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Échec de l\'envoi');
      }
      const data = await res.json();
      setActive(data);
      setDraft('');
      setPendingImages((current) => {
        for (const image of current) URL.revokeObjectURL(image.previewUrl);
        return [];
      });
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const createAdminConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newBody.trim() || !adminTargetId.trim()) return;
    setSending(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        subject: newSubject.trim(),
        body: newBody.trim(),
      };
      payload[adminTargetType === 'seller' ? 'store_id' : 'buyer_id'] = adminTargetId.trim();

      const res = await fetchWithCsrf(`/api/pd/chats/admin/${adminTargetType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Échec de la création du ticket');
      }
      const data = await res.json();
      setShowCreateAdmin(false);
      setNewBody('');
      setActive(data);
      setActiveId(data.conversation.id);
      setSuccessMsg('Nouvelle discussion ouverte.');
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer la discussion');
    } finally {
      setSending(false);
    }
  };

  const updateConversationStatus = async (nextStatus: ChatStatus) => {
    if (!activeConversation) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/chats/admin/${activeConversation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Échec de modification');
      }
      const data = await res.json();
      setActive((current) => (current ? { ...current, conversation: data.conversation } : current));
      setSuccessMsg(`Statut mis à jour : ${nextStatus === 'closed' ? 'Clôturée' : 'Ouverte'}`);
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de mise à jour');
    } finally {
      setSending(false);
    }
  };

  return (
    <div dir={dir} className="space-y-4">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              {title || 'Centre de Messagerie Superadmin'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {subtitle || 'Supervisez les échanges, traitez les litiges et assistez boutiques et acheteurs.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateAdmin(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-3.5 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nouvelle Discussion</span>
        </button>
      </header>

      {/* Alerts */}
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {successMsg && (
        <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} aria-label="Fermer" className="rounded-lg p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Dual Column */}
      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs lg:grid-cols-[340px_1fr]">
        {/* Sidebar */}
        <aside className={`flex flex-col border-r border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 ${
          mobilePane === 'thread' ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="p-3.5 space-y-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Rechercher"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher boutique, client..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {(['all', 'open', 'closed'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                    status === item
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item === 'all' ? 'Toutes' : item === 'open' ? 'En cours' : 'Clôturées'}
                </button>
              ))}
              <span className="text-slate-300 dark:text-slate-700 mx-0.5">|</span>
              {(['all', 'seller_admin', 'buyer_admin'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                    type === item
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item === 'all' ? 'Tous' : item === 'seller_admin' ? 'Boutiques' : 'Acheteurs'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[560px]">
            {loadingList ? (
              <div className="flex h-36 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-900 dark:text-white" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                <Inbox className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Aucun fil de discussion</p>
              </div>
            ) : (
              conversations.map((c) => {
                const selected = activeId === c.id;
                const unread = Number(c.unread_count || 0);
                const participant = c.store_name || c.buyer_name || c.buyer_email || 'Utilisateur';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveId(c.id);
                      setMobilePane('thread');
                    }}
                    className={`w-full rounded-xl p-3 text-left transition shadow-2xs border cursor-pointer ${
                      selected
                        ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xs'
                        : 'border-transparent bg-white/60 dark:bg-slate-850/60 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {c.type === 'seller_admin' ? (
                          <Store className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <UserRound className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                        )}
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{participant}</p>
                      </div>
                      {unread > 0 && (
                        <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] font-semibold text-white font-mono">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                      {c.subject}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-normal">
                      {c.last_message_body?.trim() || 'Pièce jointe'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Thread Section */}
        <section className={`flex flex-col min-h-[620px] bg-white dark:bg-slate-900 ${
          mobilePane === 'list' ? 'hidden lg:flex' : 'flex'
        }`}>
          {!activeConversation ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-400">
              <div>
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sélectionnez une discussion</h2>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobilePane('list')}
                    aria-label="Retour"
                    className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {activeConversation.store_name || activeConversation.buyer_name || activeConversation.buyer_email}
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {activeConversation.subject}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateConversationStatus(activeConversation.status === 'open' ? 'closed' : 'open')}
                  disabled={sending}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {activeConversation.status === 'open' ? 'Clôturer' : 'Réouvrir'}
                </button>
              </div>

              {/* Messages History */}
              <div
                role="log"
                aria-live="polite"
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20 max-h-[460px]"
              >
                {loadingConversation ? (
                  <div className="flex h-36 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-900 dark:text-white" />
                  </div>
                ) : (
                  active.messages.map((m) => {
                    const mine = m.sender_role === 'admin' || m.sender_role === 'super_admin';
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-2xs space-y-1 ${
                          mine
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700'
                        }`}>
                          <p className={`text-[10px] font-medium uppercase tracking-wider ${
                            mine ? 'text-slate-300 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {mine ? 'Admin PandaMarket' : m.sender_name || m.sender_email || 'Utilisateur'}
                          </p>
                          {m.body && (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap font-normal">
                              {m.body}
                            </p>
                          )}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className={`pt-1 grid gap-1.5 ${m.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                              {m.attachments.map((att) => (
                                <ChatImageAttachment key={att.file_key || att.file_url || att.file_name} attachment={att} mine={mine} />
                              ))}
                            </div>
                          )}
                          <p className={`text-[9px] font-mono text-right ${
                            mine ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400'
                          }`}>
                            {new Date(m.created_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <footer className="border-t border-slate-100 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900 space-y-2">
                {pendingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pendingImages.map((img, idx) => (
                      <div key={img.previewUrl} className="relative h-14 w-14 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50">
                        <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePendingImage(idx)}
                          aria-label="Supprimer"
                          className="absolute right-0.5 top-0.5 rounded-full bg-slate-900/80 p-0.5 text-white hover:bg-rose-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <label className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs ${
                    activeConversation.status === 'closed' ? 'pointer-events-none opacity-40' : ''
                  }`}>
                    <ImageIcon className="h-4 w-4" />
                    <span className="sr-only">Joindre des images</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={handleImageSelection}
                      disabled={activeConversation.status === 'closed' || pendingImages.length >= chatLimits.max_images_per_message}
                    />
                  </label>

                  <textarea
                    aria-label="Réponse administrative"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={activeConversation.status === 'closed' ? 'Discussion clôturée.' : 'Écrivez votre réponse...'}
                    disabled={activeConversation.status === 'closed'}
                    rows={1}
                    maxLength={chatLimits.max_message_length}
                    className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={sendMessage}
                    aria-label="Envoyer"
                    disabled={sending || (!draft.trim() && pendingImages.length === 0) || activeConversation.status === 'closed'}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs disabled:opacity-40 cursor-pointer"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>

      {/* Admin New Thread Modal */}
      {showCreateAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-dialog-title"
        >
          <form
            onSubmit={createAdminConversation}
            className="w-full max-w-lg rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 id="admin-dialog-title" className="text-base font-semibold text-slate-900 dark:text-white">
                  Ouvrir une Discussion Admin
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Initiez un contact direct avec un marchand ou un acheteur.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAdmin(false)}
                aria-label="Fermer"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-medium text-slate-700 dark:text-slate-300">
              {/* Target Type Selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminTargetType('seller');
                    setAdminTargetId('');
                    setAdminTargetSearch('');
                  }}
                  className={`flex-1 rounded-xl py-1.5 text-xs font-medium transition cursor-pointer ${
                    adminTargetType === 'seller'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Boutique / Vendeur
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminTargetType('buyer');
                    setAdminTargetId('');
                    setAdminTargetSearch('');
                  }}
                  className={`flex-1 rounded-xl py-1.5 text-xs font-medium transition cursor-pointer ${
                    adminTargetType === 'buyer'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Acheteur
                </button>
              </div>

              {/* Target Search */}
              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500">Destinataire</label>
                <input
                  value={adminTargetSearch}
                  onChange={(e) => setAdminTargetSearch(e.target.value)}
                  placeholder={adminTargetType === 'seller' ? 'Rechercher une boutique par nom, sous-domaine...' : 'Rechercher un acheteur par email...'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none shadow-2xs"
                />
                {loadingTargets ? (
                  <div className="flex justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                ) : adminTargets.length > 0 ? (
                  <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-1 space-y-1">
                    {adminTargets.map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => {
                          setAdminTargetId(target.id);
                          setAdminTargetSearch(adminTargetType === 'seller' ? target.name || target.subdomain || target.id : target.name || target.email || target.id);
                        }}
                        className={`w-full p-2 text-left rounded-lg text-xs transition cursor-pointer ${
                          adminTargetId === target.id
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'hover:bg-white dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                        }`}
                      >
                        <p className="font-semibold">{target.name || target.email || target.id}</p>
                        <p className="text-[10px] opacity-75">{target.subdomain || target.owner_email || target.id}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="block space-y-1">
                Objet du message
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Ex: Notification administrative importante..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none shadow-2xs"
                />
              </label>

              <label className="block space-y-1">
                Contenu du message
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Écrivez votre message..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs font-normal text-slate-900 dark:text-white outline-none shadow-2xs resize-none"
                />
              </label>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateAdmin(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={sending || !newSubject.trim() || !newBody.trim() || !adminTargetId.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Envoyer</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
