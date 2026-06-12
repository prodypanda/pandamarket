'use client';

import { fetchWithCsrf } from '@/lib/api';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Image as ImageIcon, Inbox, Loader2, MessageSquare, PlusCircle, Search, Send, ShieldCheck, Store, UserRound, X } from 'lucide-react';
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent';

type ChatMode = 'buyer' | 'seller' | 'admin';
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
  sender_email?: string | null;
  sender_name?: string | null;
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

interface ChatInboxProps {
  mode: ChatMode;
  title: string;
  subtitle: string;
}

const modeConfig: Record<ChatMode, { accent: string; soft: string; label: string }> = {
  buyer: { accent: 'bg-[#16C784] text-white', soft: 'bg-emerald-50 text-emerald-700 ring-emerald-100', label: 'Buyer inbox' },
  seller: { accent: 'bg-slate-950 text-white', soft: 'bg-slate-100 text-slate-700 ring-slate-200', label: 'Seller inbox' },
  admin: { accent: 'bg-[#B91C1C] text-white', soft: 'bg-amber-50 text-[#B91C1C] ring-amber-100', label: 'Superadmin messages' },
};

function listEndpoint(mode: ChatMode) {
  if (mode === 'buyer') return '/api/pd/chats/me';
  if (mode === 'seller') return '/api/pd/chats/store';
  return '/api/pd/chats/admin';
}

function detailEndpoint(mode: ChatMode, id: string) {
  if (mode === 'buyer') return `/api/pd/chats/${id}`;
  if (mode === 'seller') return `/api/pd/chats/store/${id}`;
  return `/api/pd/chats/admin/${id}`;
}

function createAdminEndpoint(mode: ChatMode) {
  return mode === 'buyer' ? '/api/pd/chats/buyer-admin' : '/api/pd/chats/store/admin';
}

function roleIsMine(mode: ChatMode, role: string) {
  if (mode === 'buyer') return role === 'customer';
  if (mode === 'seller') return role === 'vendor';
  return role === 'admin' || role === 'super_admin';
}

function participantLabel(mode: ChatMode, conversation: ChatConversation) {
  if (conversation.type === 'seller_admin') {
    return mode === 'admin' ? conversation.store_name || 'Seller' : 'Hub administrator';
  }
  if (conversation.type === 'buyer_admin') {
    return mode === 'admin' ? conversation.buyer_name || conversation.buyer_email || 'Buyer' : 'Marketplace support';
  }
  if (conversation.type === 'seller_seller') {
    return conversation.store_name || conversation.seller_name || conversation.seller_email || 'Seller';
  }
  if (mode === 'buyer') return conversation.store_name || 'Seller';
  return conversation.buyer_name || conversation.buyer_email || 'Buyer';
}

function typeLabel(type: ChatType) {
  if (type === 'buyer_seller') return 'Buyer / Seller';
  if (type === 'seller_admin') return 'Seller / Admin';
  if (type === 'buyer_admin') return 'Buyer / Admin';
  return 'Seller / Seller';
}

function dateLabel(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('fr-TN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function getErrorMessage(res: Response) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
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
      <div className={`flex h-28 w-44 items-center justify-center rounded-2xl ${mine ? 'bg-white/10' : 'bg-gray-100'}`}>
        <Loader2 className="h-5 w-5 animate-spin opacity-60" />
      </div>
    );
  }

  return (
    <a href={imageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl">
      <span
        aria-label={attachment.file_name}
        role="img"
        className="block h-44 w-64 max-w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
    </a>
  );
}

export function ChatInbox({ mode, title, subtitle }: ChatInboxProps) {
  const config = modeConfig[mode];
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [active, setActive] = useState<ChatDetails | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('conversation');
  });
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
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newSubject, setNewSubject] = useState('Support request');
  const [newBody, setNewBody] = useState('');
  const [adminTargetType, setAdminTargetType] = useState<'seller' | 'buyer'>('seller');
  const [adminTargetId, setAdminTargetId] = useState('');
  const [adminTargetSearch, setAdminTargetSearch] = useState('');
  const [adminTargets, setAdminTargets] = useState<AdminChatTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const activeConversation = active?.conversation;
  const adminMode = mode === 'admin';
  const primaryActionClass = adminMode
    ? 'bg-[#B91C1C] text-white shadow-lg shadow-red-900/15 hover:bg-[#991B1B]'
    : 'bg-slate-950 text-white hover:bg-[#16C784]';
  const activePillClass = adminMode ? 'bg-[#B91C1C] text-white shadow-sm shadow-red-900/15' : config.accent;
  const inputFocusClass = adminMode
    ? 'focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10'
    : 'focus:border-[#16C784] focus:ring-4 focus:ring-[#16C784]/10';
  const loadingAccentClass = adminMode ? 'text-[#B91C1C]' : 'text-[#16C784]';

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

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => () => {
    for (const image of pendingImagesRef.current) URL.revokeObjectURL(image.previewUrl);
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      if (mode !== 'buyer' && type !== 'all') params.set('type', type);
      const res = await fetchWithCsrf(`${listEndpoint(mode)}?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = mode === 'admin' ? '/login/admin' : mode === 'seller' ? '/login/seller' : '/login/buyer';
        return;
      }
      if (!res.ok) throw new Error(await getErrorMessage(res));
      const data = await res.json();
      const next = data.data || [];
      setConversations(next);
      if (!activeId && next[0]) setActiveId(next[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoadingList(false);
    }
  }, [activeId, mode, search, status, type]);

  const loadConversation = useCallback(async (id: string) => {
    setLoadingConversation(true);
    try {
      const res = await fetchWithCsrf(detailEndpoint(mode, id));
      if (!res.ok) throw new Error(await getErrorMessage(res));
      const data = await res.json();
      setActive(data);
      await fetchWithCsrf(`${detailEndpoint(mode, id)}/read`, { method: 'POST' }).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoadingConversation(false);
    }
  }, [mode]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) void loadConversation(activeId);
  }, [activeId, loadConversation]);

  useEffect(() => {
    setPendingImages((current) => {
      for (const image of current) URL.revokeObjectURL(image.previewUrl);
      return [];
    });
  }, [activeId]);

  useEffect(() => {
    if (mode !== 'admin' || !showCreateAdmin) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingTargets(true);
      try {
        const params = new URLSearchParams({ kind: adminTargetType, search: adminTargetSearch.trim() });
        const res = await fetchWithCsrf(`/api/pd/chats/admin/targets/search?${params.toString()}`);
        if (!res.ok) throw new Error(await getErrorMessage(res));
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
  }, [adminTargetSearch, adminTargetType, mode, showCreateAdmin]);

  useRealtimeEvent('chat_message', (payload) => {
    const item = payload as { conversation_id?: string };
    void loadConversations();
    if (item.conversation_id && item.conversation_id === activeId) {
      void loadConversation(item.conversation_id);
    }
  }, [activeId, loadConversation, loadConversations]);

  const stats = useMemo(() => {
    const unread = conversations.reduce((sum, conversation) => sum + Number(conversation.unread_count || 0), 0);
    const open = conversations.filter((conversation) => conversation.status === 'open').length;
    return { unread, open };
  }, [conversations]);

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;
    setError(null);
    const remainingSlots = Math.max(0, chatLimits.max_images_per_message - pendingImages.length);
    const accepted: PendingImage[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      if (!CHAT_IMAGE_TYPES.has(file.type)) {
        setError('Only JPG, PNG, WebP, or GIF images are allowed in chat.');
        continue;
      }
      if (file.size > chatLimits.max_image_size_bytes) {
        setError(`Chat images must be ${Math.floor(chatLimits.max_image_size_bytes / (1024 * 1024))} MB or smaller.`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (files.length > remainingSlots) {
      setError(`You can attach up to ${chatLimits.max_images_per_message} images per message.`);
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
      if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes));
      const presignData = await presignRes.json();
      const uploadRes = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': image.file.type },
        body: image.file,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed for ${image.file.name}`);
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
      const res = await fetchWithCsrf(`${detailEndpoint(mode, activeConversation.id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim(), attachments }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res));
      const data = await res.json();
      setActive(data);
      setDraft('');
      setPendingImages((current) => {
        for (const image of current) URL.revokeObjectURL(image.previewUrl);
        return [];
      });
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const createAdminConversation = async () => {
    if (!newSubject.trim() || !newBody.trim()) return;
    if (mode === 'admin' && !adminTargetId.trim()) return;
    setSending(true);
    setError(null);
    try {
      const endpoint = mode === 'admin' ? `/api/pd/chats/admin/${adminTargetType}` : createAdminEndpoint(mode);
      const payload: Record<string, string> = { subject: newSubject.trim(), body: newBody.trim() };
      if (mode === 'admin') {
        payload[adminTargetType === 'seller' ? 'store_id' : 'buyer_id'] = adminTargetId.trim();
      }
      const res = await fetchWithCsrf(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res));
      const data = await res.json();
      setShowCreateAdmin(false);
      setNewBody('');
      setActive(data);
      setActiveId(data.conversation.id);
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create support chat');
    } finally {
      setSending(false);
    }
  };

  const updateConversationStatus = async (nextStatus: ChatStatus) => {
    if (!activeConversation) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`${detailEndpoint(mode, activeConversation.id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res));
      const data = await res.json();
      setActive((current) => current ? { ...current, conversation: data.conversation } : current);
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update conversation');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={adminMode ? 'mx-auto max-w-7xl space-y-7 pb-8' : 'space-y-6'}>
      <section className={`overflow-hidden rounded-[2rem] p-6 text-white shadow-xl sm:p-8 ${
        adminMode
          ? 'border border-amber-100 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] shadow-red-950/10'
          : 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 shadow-slate-900/10'
      }`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className={`inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ring-1 ring-white/15 ${adminMode ? 'text-amber-100' : 'text-emerald-100'}`}>
              {config.label}
            </span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-white/70">{subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className={adminMode ? 'text-xs font-black uppercase text-amber-100' : 'text-xs font-black uppercase text-white/50'}>Open</p>
              <p className="mt-1 text-2xl font-black">{stats.open}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className={adminMode ? 'text-xs font-black uppercase text-amber-100' : 'text-xs font-black uppercase text-white/50'}>Unread</p>
              <p className="mt-1 text-2xl font-black">{stats.unread}</p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Close" className="rounded-full p-1 hover:bg-red-100"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className={`grid min-h-[650px] overflow-hidden rounded-[2rem] bg-white ${
        adminMode
          ? 'border border-slate-200/70 shadow-2xl shadow-slate-200/50 lg:grid-cols-[390px_1fr]'
          : 'border border-gray-100 shadow-sm lg:grid-cols-[360px_1fr]'
      }`}>
        <aside className={adminMode ? 'border-b border-amber-100 bg-stone-50/80 lg:border-b-0 lg:border-r lg:border-amber-100' : 'border-b border-gray-100 bg-gray-50/70 lg:border-b-0 lg:border-r'}>
          <div className={adminMode ? 'space-y-3 border-b border-amber-100 bg-white p-5' : 'space-y-3 border-b border-gray-100 bg-white p-4'}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className={`w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:bg-white ${inputFocusClass}`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'open', 'closed'] as Array<'all' | ChatStatus>).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition ${status === item ? activePillClass : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50'}`}
                >
                  {item === 'all' ? 'All' : item}
                </button>
              ))}
            </div>
            {mode !== 'buyer' && (
              <div className="flex flex-wrap gap-2">
                {(mode === 'seller' ? ['all', 'buyer_seller', 'seller_admin', 'seller_seller'] : ['all', 'seller_admin', 'buyer_admin']).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setType(item as 'all' | ChatType)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black transition ${type === item ? activePillClass : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50'}`}
                  >
                    {item === 'all' ? 'All chats' : typeLabel(item as ChatType)}
                  </button>
                ))}
              </div>
            )}
            {(mode === 'seller' || mode === 'buyer' || mode === 'admin') && (
              <button
                type="button"
                onClick={() => setShowCreateAdmin(true)}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${primaryActionClass}`}
              >
                <PlusCircle className="h-4 w-4" />
                {mode === 'buyer' ? 'Contact marketplace support' : mode === 'admin' ? 'Open a chat' : 'New admin support chat'}
              </button>
            )}
          </div>

          <div className="max-h-[520px] overflow-y-auto p-3">
            {loadingList ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className={`h-6 w-6 animate-spin ${loadingAccentClass}`} /></div>
            ) : conversations.length === 0 ? (
              <div className={adminMode ? 'rounded-3xl border border-dashed border-amber-200 bg-white p-8 text-center shadow-sm' : 'rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center'}>
                <Inbox className={adminMode ? 'mx-auto mb-3 h-9 w-9 text-amber-300' : 'mx-auto mb-3 h-9 w-9 text-gray-300'} />
                <p className="font-black text-gray-800">No conversations yet</p>
                <p className="mt-1 text-sm text-gray-500">Messages will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const selected = activeId === conversation.id;
                  const unread = Number(conversation.unread_count || 0);
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setActiveId(conversation.id)}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        selected
                          ? adminMode
                            ? 'border-[#B91C1C]/35 bg-gradient-to-br from-white to-amber-50 shadow-md shadow-red-900/10'
                            : 'border-slate-950 bg-white shadow-sm'
                          : adminMode
                            ? 'border-transparent bg-white/85 hover:border-amber-200 hover:bg-white hover:shadow-sm'
                            : 'border-transparent bg-white/80 hover:border-gray-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {conversation.type === 'seller_admin' || conversation.type === 'buyer_admin' ? <ShieldCheck className={`h-4 w-4 ${adminMode ? 'text-[#B91C1C]' : 'text-indigo-500'}`} /> : conversation.type === 'seller_seller' || mode === 'buyer' ? <Store className="h-4 w-4 text-emerald-500" /> : <UserRound className="h-4 w-4 text-slate-500" />}
                            <p className="truncate text-sm font-black text-gray-900">{participantLabel(mode, conversation)}</p>
                          </div>
                          <p className="mt-1 truncate text-xs font-bold text-gray-500">{conversation.subject}</p>
                        </div>
                        {unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">{unread}</span>}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-gray-600">{conversation.last_message_body?.trim() || 'Image attachment'}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${conversation.status === 'open' ? config.soft : 'bg-gray-100 text-gray-500 ring-gray-200'}`}>
                          {conversation.status}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">{dateLabel(conversation.last_message_at || conversation.created_at)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-[650px] flex-col bg-white">
          {!activeConversation ? (
            <div className={adminMode ? 'flex flex-1 items-center justify-center bg-gradient-to-br from-white via-stone-50 to-amber-50/70 p-8 text-center' : 'flex flex-1 items-center justify-center p-8 text-center'}>
              <div className={adminMode ? 'rounded-[2rem] border border-amber-100 bg-white/85 p-8 shadow-xl shadow-slate-200/50' : ''}>
                <MessageSquare className={adminMode ? 'mx-auto mb-4 h-14 w-14 text-amber-300' : 'mx-auto mb-4 h-14 w-14 text-gray-200'} />
                <h2 className="text-xl font-black text-gray-900">Select a conversation</h2>
                <p className="mt-2 text-sm text-gray-500">Choose a thread from the inbox to view messages.</p>
              </div>
            </div>
          ) : (
            <>
              <div className={adminMode ? 'border-b border-amber-100 bg-gradient-to-br from-white to-stone-50 p-5' : 'border-b border-gray-100 p-5'}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${config.soft}`}>{typeLabel(activeConversation.type)}</span>
                      <span className={adminMode ? 'rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-amber-100' : 'rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600'}>{activeConversation.status}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-gray-900">{activeConversation.subject}</h2>
                    <p className="mt-1 text-sm font-semibold text-gray-500">{participantLabel(mode, activeConversation)} {activeConversation.order_id ? `· Order #${activeConversation.order_id.slice(-8).toUpperCase()}` : ''}</p>
                    {mode === 'admin' && (
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-slate-500">
                        {activeConversation.buyer_id && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[#7F1D1D] ring-1 ring-amber-100">Buyer ID: {activeConversation.buyer_id}</span>}
                        {activeConversation.seller_id && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[#7F1D1D] ring-1 ring-amber-100">Seller ID: {activeConversation.seller_id}</span>}
                        {activeConversation.store_id && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[#7F1D1D] ring-1 ring-amber-100">Store: {activeConversation.store_name || activeConversation.store_id}</span>}
                        {activeConversation.store_subdomain && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[#7F1D1D] ring-1 ring-amber-100">Subdomain: {activeConversation.store_subdomain}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void updateConversationStatus(activeConversation.status === 'open' ? 'closed' : 'open')}
                      disabled={sending}
                      className={adminMode ? 'rounded-full border border-amber-100 bg-white px-3 py-1.5 text-xs font-black text-[#7F1D1D] transition hover:border-[#B91C1C]/30 hover:bg-red-50 hover:text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60' : 'rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-black text-gray-600 transition hover:border-red-100 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60'}
                    >
                      {activeConversation.status === 'open' ? 'Close chat' : 'Reopen chat'}
                    </button>
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
              </div>

              <div className={adminMode ? 'flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-stone-50 via-white to-amber-50/40 p-5' : 'flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-5'}>
                {loadingConversation ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className={`h-6 w-6 animate-spin ${loadingAccentClass}`} /></div>
                ) : active.messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-gray-400">No messages yet.</div>
                ) : active.messages.map((message) => {
                  const mine = roleIsMine(mode, message.sender_role);
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-[1.5rem] px-4 py-3 shadow-sm ${
                        mine
                          ? adminMode ? 'bg-[#7F1D1D] text-white shadow-red-900/15' : 'bg-slate-950 text-white'
                          : adminMode ? 'border border-amber-100 bg-white text-slate-800 shadow-slate-200/50' : 'border border-gray-100 bg-white text-gray-800'
                      }`}>
                        <div className={`mb-1 text-[11px] font-black uppercase tracking-wide ${mine ? 'text-white/50' : 'text-gray-400'}`}>
                          {mine ? 'You' : message.sender_name || message.sender_email || message.sender_role}
                        </div>
                        {message.body.trim() && <p className="whitespace-pre-wrap text-sm leading-6">{message.body.trim()}</p>}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className={`mt-2 grid gap-2 ${message.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {message.attachments.map((attachment) => (
                              <ChatImageAttachment key={attachment.file_key || attachment.file_url || attachment.file_name} attachment={attachment} mine={mine} />
                            ))}
                          </div>
                        )}
                        <p className={`mt-2 text-[11px] font-bold ${mine ? 'text-white/45' : 'text-gray-400'}`}>{dateLabel(message.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={adminMode ? 'border-t border-amber-100 bg-white p-4' : 'border-t border-gray-100 bg-white p-4'}>
                {pendingImages.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {pendingImages.map((image, index) => (
                      <div key={image.previewUrl} className="group relative h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                        <div
                          aria-label={image.file.name}
                          role="img"
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${image.previewUrl})` }}
                        />
                        <button
                          type="button"
                          onClick={() => removePendingImage(index)}
                          aria-label="Remove image"
                          className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-white opacity-90 transition hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <label className={`inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition ${adminMode ? 'hover:border-[#B91C1C] hover:text-[#B91C1C]' : 'hover:border-[#16C784] hover:text-[#16C784]'} ${activeConversation.status === 'closed' ? 'pointer-events-none opacity-50' : ''}`}>
                    <ImageIcon className="h-5 w-5" />
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
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={activeConversation.status === 'closed' ? 'This conversation is closed.' : 'Write a message...'}
                    disabled={activeConversation.status === 'closed'}
                    rows={2}
                    maxLength={chatLimits.max_message_length}
                    className={`min-h-[56px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${inputFocusClass}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sending || (!draft.trim() && pendingImages.length === 0) || activeConversation.status === 'closed'}
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-gray-300 ${
                      adminMode ? 'bg-[#B91C1C] shadow-red-900/15 hover:bg-[#991B1B]' : 'bg-[#16C784] shadow-emerald-900/10 hover:bg-[#12ad72]'
                    }`}
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {showCreateAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className={adminMode ? 'w-full max-w-xl overflow-hidden rounded-[2rem] border border-amber-100 bg-white shadow-2xl shadow-red-950/20' : 'w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl'}>
            <div className={adminMode ? 'bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] px-6 py-5 text-white' : 'hidden'} />
            <div className={adminMode ? 'p-6' : ''}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">{mode === 'buyer' ? 'Contact marketplace support' : 'Start admin support chat'}</h2>
                <p className="mt-1 text-sm font-semibold text-gray-500">{mode === 'buyer' ? 'Open a private conversation with the marketplace administrator team.' : 'Open a private conversation with the hub administrator team.'}</p>
              </div>
              <button type="button" onClick={() => setShowCreateAdmin(false)} aria-label="Close" className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {mode === 'admin' && (
                <div className="space-y-3 rounded-2xl border border-amber-100 bg-stone-50 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(['seller', 'buyer'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setAdminTargetType(item);
                          setAdminTargetId('');
                          setAdminTargetSearch('');
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-black transition ${adminTargetType === item ? 'bg-[#B91C1C] text-white shadow-sm shadow-red-900/15' : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:text-[#B91C1C]'}`}
                      >
                        {item === 'seller' ? 'Seller / Store' : 'Buyer'}
                      </button>
                    ))}
                  </div>
                  <input
                    value={adminTargetSearch}
                    onChange={(event) => setAdminTargetSearch(event.target.value)}
                    placeholder={adminTargetType === 'seller' ? 'Search stores by name, subdomain, owner email...' : 'Search buyers by name, email, or user ID...'}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                  />
                  <div className="space-y-2">
                    {loadingTargets ? (
                      <div className="flex items-center justify-center rounded-2xl bg-white py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-[#B91C1C]" />
                      </div>
                    ) : adminTargets.length === 0 ? (
                      <div className="rounded-2xl bg-white px-3 py-3 text-xs font-bold text-gray-400">No matching targets found.</div>
                    ) : adminTargets.map((target) => {
                      const selected = adminTargetId === target.id;
                      return (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => {
                            setAdminTargetId(target.id);
                            setAdminTargetSearch(adminTargetType === 'seller' ? target.name || target.subdomain || target.id : target.name || target.email || target.id);
                          }}
                          className={`w-full rounded-2xl p-3 text-left transition ${selected ? 'bg-[#B91C1C] text-white shadow-sm shadow-red-900/15' : 'bg-white text-gray-700 ring-1 ring-gray-100 hover:ring-amber-200'}`}
                        >
                          <span className="block text-sm font-black">
                            {adminTargetType === 'seller' ? target.name || 'Store' : target.name || target.email || 'Buyer'}
                          </span>
                          <span className={`mt-1 block text-xs font-semibold ${selected ? 'text-white/70' : 'text-gray-500'}`}>
                            {adminTargetType === 'seller'
                              ? `Store ID: ${target.id}${target.subdomain ? ` · ${target.subdomain}` : ''}${target.owner_email ? ` · Owner: ${target.owner_email}` : ''}`
                              : `Buyer ID: ${target.id}${target.email ? ` · ${target.email}` : ''}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {adminTargetId && (
                    <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-black text-[#7F1D1D] ring-1 ring-amber-100">
                      Selected {adminTargetType === 'seller' ? 'store' : 'buyer'} ID: {adminTargetId}
                    </div>
                  )}
                </div>
              )}
              <input
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
                placeholder="Subject"
                className={`w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:bg-white ${inputFocusClass}`}
              />
              <textarea
                value={newBody}
                onChange={(event) => setNewBody(event.target.value)}
                placeholder="Describe what you need help with..."
                rows={5}
                className={`w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:bg-white ${inputFocusClass}`}
              />
              <button
                type="button"
                onClick={createAdminConversation}
                disabled={sending || !newSubject.trim() || !newBody.trim() || (mode === 'admin' && !adminTargetId.trim())}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:bg-gray-300 ${primaryActionClass}`}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {mode === 'buyer' ? 'Send to marketplace support' : 'Send to admin'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
