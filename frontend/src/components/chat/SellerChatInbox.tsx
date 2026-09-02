'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Inbox,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  UserRound,
  X,
  Zap,
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

interface OrderSummary {
  id: string;
  order_number?: string;
  total: number | string;
  store_total?: number | string;
  currency?: string;
  cod_status?: 'pending' | 'confirmed' | 'rejected' | 'unreachable' | 'otp_verified' | string;
  status?: string;
  customer_name?: string;
  customer_phone?: string;
  shipping_city?: string;
  shipping_governorate?: string;
  shipping_address?: string;
  items?: Array<{
    id: string;
    product_title?: string;
    quantity: number;
    unit_price: number | string;
    image_url?: string;
  }>;
}

const DEFAULT_CHAT_LIMITS: ChatLimits = {
  message_rate_limit_per_minute: 20,
  max_images_per_message: 4,
  max_image_size_bytes: 5 * 1024 * 1024,
  max_message_length: 5000,
};

const CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const money = (v?: string | number, c = 'TND') => `${Number(v || 0).toFixed(3)} ${c}`;

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

export function SellerChatInbox({ title, subtitle }: { title?: string; subtitle?: string }) {
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

  // Order Context Drawer State
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(true);
  const [validatingCod, setValidatingCod] = useState(false);

  // Admin Support Modal State
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newSubject, setNewSubject] = useState('Demande d\'assistance boutique');
  const [newBody, setNewBody] = useState('');

  const pendingImagesRef = useRef<PendingImage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConversation = active?.conversation;

  // Sync draft images
  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => () => {
    for (const image of pendingImagesRef.current) URL.revokeObjectURL(image.previewUrl);
  }, []);

  // Fetch chat limits
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

  // Load seller conversations
  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      if (type !== 'all') params.set('type', type);

      const res = await fetchWithCsrf(`/api/pd/chats/store?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login/seller';
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Impossible de charger vos discussions');
      }
      const data = await res.json();
      const next = data.data || [];
      setConversations(next);

      if (!activeId && next[0]) {
        setActiveId(next[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du chargement des messages');
    } finally {
      setLoadingList(false);
    }
  }, [activeId, search, status, type]);

  // Load single conversation detail
  const loadConversation = useCallback(async (id: string) => {
    setLoadingConversation(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/chats/store/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Impossible de charger la conversation');
      }
      const data = await res.json();
      setActive(data);
      setMobilePane('thread');

      // Update URL query param quietly
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('conversation', id);
        window.history.replaceState({}, '', url.toString());
      }

      // Mark read
      await fetchWithCsrf(`/api/pd/chats/store/${id}/read`, { method: 'POST' }).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du chargement de la discussion');
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  // Fetch Order Context if order_id exists
  useEffect(() => {
    if (!activeConversation?.order_id) {
      setOrderSummary(null);
      return;
    }
    let mounted = true;
    setLoadingOrder(true);
    fetchWithCsrf(`/api/pd/orders/store/${activeConversation.order_id}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const ord = data.data || data.order || data;
        setOrderSummary({
          id: ord.id,
          order_number: ord.order_number || ord.id.slice(-8).toUpperCase(),
          total: ord.store_total ?? ord.total ?? 0,
          currency: ord.currency || 'TND',
          cod_status: ord.cod_status || 'pending',
          status: ord.status || 'open',
          customer_name: ord.shipping_address?.full_name || ord.customer_name || activeConversation.buyer_name,
          customer_phone: ord.shipping_address?.phone || ord.customer_phone,
          shipping_city: ord.shipping_address?.city,
          shipping_governorate: ord.shipping_address?.governorate,
          shipping_address: ord.shipping_address?.address_line1,
          items: (ord.items || []).map((it: any) => ({
            id: it.id,
            product_title: it.product_title || it.title || 'Produit commandé',
            quantity: it.quantity || 1,
            unit_price: it.unit_price ?? it.price ?? 0,
            image_url: it.image_url || it.product?.images?.[0]?.url || '',
          })),
        });
      })
      .catch(() => {
        if (mounted) setOrderSummary(null);
      })
      .finally(() => {
        if (mounted) setLoadingOrder(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeConversation?.order_id, activeConversation?.buyer_name]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) void loadConversation(activeId);
  }, [activeId, loadConversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages]);

  // Realtime WebSocket listener
  useRealtimeEvent('chat_message', (payload) => {
    const item = payload as { conversation_id?: string };
    void loadConversations();
    if (item.conversation_id && item.conversation_id === activeId) {
      void loadConversation(item.conversation_id);
    }
  }, [activeId, loadConversation, loadConversations]);

  const stats = useMemo(() => {
    const unread = conversations.reduce((sum, c) => sum + Number(c.unread_count || 0), 0);
    const open = conversations.filter((c) => c.status === 'open').length;
    return { unread, open, total: conversations.length };
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
        setError('Formats autorisés : JPG, PNG, WebP ou GIF.');
        continue;
      }
      if (file.size > chatLimits.max_image_size_bytes) {
        setError(`L'image doit être inférieure à ${Math.floor(chatLimits.max_image_size_bytes / (1024 * 1024))} Mo.`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (files.length > remainingSlots) {
      setError(`Vous pouvez joindre jusqu'à ${chatLimits.max_images_per_message} images par message.`);
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
      if (!presignRes.ok) throw new Error('Échec de la préparation de l\'image');
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

  const sendMessageWithText = async (textToSend: string) => {
    if (!activeConversation || (!textToSend.trim() && pendingImages.length === 0)) return;
    setSending(true);
    setError(null);
    try {
      const attachments = await uploadPendingImages();
      const res = await fetchWithCsrf(`/api/pd/chats/store/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: textToSend.trim(), attachments }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Échec de l\'envoi du message');
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
      setError(err instanceof Error ? err.message : 'Échec de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    await sendMessageWithText(draft);
  };

  // 1-Click COD Validation Action
  const handleValidateCod = async () => {
    if (!activeConversation?.order_id) return;
    setValidatingCod(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${activeConversation.order_id}/cod-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'confirmed',
          call_attempts_delta: 0,
          custom_notes: 'Confirmé directement via la messagerie PandaMarket',
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Échec de la validation de la commande COD');
      }

      setOrderSummary((prev) => (prev ? { ...prev, cod_status: 'confirmed' } : prev));
      setSuccessMsg('Commande COD confirmée avec succès !');

      // Automatically send confirmation message to buyer in chat
      await sendMessageWithText('✅ Bonjour ! Votre commande a été validée avec succès par notre boutique. Elle est en cours de préparation pour livraison.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la validation COD');
    } finally {
      setValidatingCod(false);
    }
  };

  // Toggle open/closed status
  const updateConversationStatus = async (nextStatus: ChatStatus) => {
    if (!activeConversation) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/chats/store/${activeConversation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Échec de mise à jour du statut');
      }
      const data = await res.json();
      setActive((current) => (current ? { ...current, conversation: data.conversation } : current));
      setSuccessMsg(`Discussion ${nextStatus === 'closed' ? 'fermée' : 'réouverte'} avec succès.`);
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour le statut');
    } finally {
      setSending(false);
    }
  };

  const createAdminConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newBody.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetchWithCsrf('/api/pd/chats/store/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject.trim(), body: newBody.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Échec de la création du ticket support');
      }
      const data = await res.json();
      setShowCreateAdmin(false);
      setNewBody('');
      setActive(data);
      setActiveId(data.conversation.id);
      setSuccessMsg('Ticket d\'assistance ouvert avec l\'équipe PandaMarket.');
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d\'ouvrir le ticket');
    } finally {
      setSending(false);
    }
  };

  const cannedMacros = [
    { label: '📦 Commande confirmée', text: 'Bonjour ! Votre commande est bien confirmée et nous préparons votre colis avec soin.' },
    { label: '🚚 Expédition en cours', text: 'Votre colis a été remis au transporteur. Vous recevrez bientôt un appel du livreur.' },
    { label: '✨ En stock immédiat', text: 'Oui, cet article est disponible en stock et livrable sur toute la Tunisie sous 24 à 48h.' },
    { label: '📍 Confirmer adresse', text: 'Bonjour, pourriez-vous s\'il vous plaît nous confirmer votre gouvernorat et adresse exacte de livraison ?' },
    { label: '🤝 Merci pour votre achat', text: 'Merci beaucoup pour votre confiance ! N\'hésitez pas si vous avez la moindre question.' },
  ];

  return (
    <div dir={dir} className="space-y-4">
      {/* Compact Top Header Card (Replaces massive 200px hero banner) */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs shrink-0">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                {title || t('dashboardPages.messages.title') || 'Messagerie Clients & Support'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                Vendeur
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {subtitle || t('dashboardPages.messages.subtitle') || 'Échangez avec vos acheteurs et gérez l\'assistance PandaMarket.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span>En cours : <strong className="text-slate-900 dark:text-white font-mono">{stats.open}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Non lus : <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{stats.unread}</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateAdmin(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Contacter le Support</span>
          </button>
        </div>
      </header>

      {/* Global Alerts */}
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer l'alerte" className="rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50">
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
          <button type="button" onClick={() => setSuccessMsg(null)} aria-label="Fermer la confirmation" className="rounded-lg p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Dual-Column Inbox Container */}
      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs lg:grid-cols-[340px_1fr]">
        {/* Left Sidebar (Conversations List) */}
        <aside className={`flex flex-col border-r border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 ${
          mobilePane === 'thread' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Search & Filter Bar */}
          <div className="p-3.5 space-y-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Rechercher une discussion"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par client ou sujet..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
              />
            </div>

            {/* Quick Status & Channel Filters */}
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
                  {item === 'all' ? 'Toutes' : item === 'open' ? 'Ouvertes' : 'Fermées'}
                </button>
              ))}
              <span className="text-slate-300 dark:text-slate-700 mx-0.5">|</span>
              {(['all', 'buyer_seller', 'seller_admin'] as const).map((item) => (
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
                  {item === 'all' ? 'Tous' : item === 'buyer_seller' ? 'Clients' : 'Support'}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[560px]">
            {loadingList ? (
              <div className="flex h-36 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-900 dark:text-white" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                <Inbox className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Aucune discussion</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Les messages apparaîtront ici.</p>
              </div>
            ) : (
              conversations.map((c) => {
                const selected = activeId === c.id;
                const unread = Number(c.unread_count || 0);
                const participant = c.type === 'seller_admin' ? 'Support PandaMarket' : c.buyer_name || c.buyer_email || 'Client';

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
                        : 'border-transparent bg-white/60 dark:bg-slate-850/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {c.type === 'seller_admin' ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        ) : (
                          <UserRound className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                        )}
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{participant}</p>
                      </div>
                      {unread > 0 && (
                        <span className="rounded-full bg-emerald-600 dark:bg-emerald-500 px-1.5 py-0.2 text-[10px] font-semibold text-white font-mono">
                          {unread}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                      {c.subject}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal line-clamp-1">
                      {c.last_message_body?.trim() || 'Photo / Pièce jointe'}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      {c.status === 'open' ? (
                        <span className="rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Ouverte
                        </span>
                      ) : (
                        <span className="rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Fermée
                        </span>
                      )}
                      <span>
                        {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Section (Active Message Thread & Order Context) */}
        <section className={`flex flex-col min-h-[620px] bg-white dark:bg-slate-900 ${
          mobilePane === 'list' ? 'hidden lg:flex' : 'flex'
        }`}>
          {!activeConversation ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-400">
              <div>
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sélectionnez une discussion</h2>
                <p className="mt-1 text-xs text-slate-400">Choisissez une conversation pour lire et envoyer des messages.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread Header with Back Button (Mobile) & Actions */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-3.5 sm:p-4 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobilePane('list')}
                    aria-label="Retour à la liste des messages"
                    className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {activeConversation.type === 'seller_admin' ? 'Support PandaMarket' : activeConversation.buyer_name || activeConversation.buyer_email || 'Client'}
                      </h2>
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                        {activeConversation.type === 'seller_admin' ? 'Support Hub' : 'Acheteur'}
                      </span>
                      {activeConversation.status === 'closed' && (
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          Discussion fermée
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {activeConversation.subject}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {orderSummary && (
                    <button
                      type="button"
                      onClick={() => setOrderDrawerOpen((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs cursor-pointer"
                    >
                      <Package className="h-3.5 w-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Commande</span>
                      {orderDrawerOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => updateConversationStatus(activeConversation.status === 'open' ? 'closed' : 'open')}
                    disabled={sending}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {activeConversation.status === 'open' ? 'Clôturer' : 'Réouvrir'}
                  </button>
                </div>
              </div>

              {/* Order & Product Context Banner (Collapsible) */}
              {orderSummary && orderDrawerOpen && (
                <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 p-3.5 animate-in slide-in-from-top-1 duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          Commande #{orderSummary.order_number}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {money(orderSummary.total, orderSummary.currency)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          orderSummary.cod_status === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}>
                          COD : {orderSummary.cod_status === 'confirmed' ? 'Confirmé' : 'En attente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {orderSummary.customer_phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {orderSummary.customer_phone}
                          </span>
                        )}
                        {orderSummary.shipping_governorate && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {orderSummary.shipping_governorate}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {orderSummary.cod_status !== 'confirmed' && (
                        <button
                          type="button"
                          onClick={handleValidateCod}
                          disabled={validatingCod}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {validatingCod ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          <span>Confirmer COD (1-Clic)</span>
                        </button>
                      )}
                      <a
                        href={`/hub/dashboard/orders?id=${encodeURIComponent(orderSummary.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-2xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Détails Commande</span>
                      </a>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  {orderSummary.items && orderSummary.items.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pt-1">
                      {orderSummary.items.map((it) => (
                        <div key={it.id} className="flex items-center gap-2 rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shrink-0 shadow-2xs">
                          {it.image_url ? (
                            <img src={getResizedImageUrl(it.image_url, 'small')} alt="" className="h-6 w-6 rounded object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                          <span className="text-[11px] font-medium text-slate-900 dark:text-white max-w-[140px] truncate">{it.product_title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">×{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message History Stream */}
              <div
                role="log"
                aria-live="polite"
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20 max-h-[420px]"
              >
                {loadingConversation ? (
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-900 dark:text-white" />
                  </div>
                ) : active.messages.length === 0 ? (
                  <p className="py-12 text-center text-xs text-slate-400">Aucun message échangé pour l'instant.</p>
                ) : (
                  active.messages.map((m) => {
                    const mine = m.sender_role === 'vendor' || m.sender_role === 'seller';
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-2xs space-y-1 ${
                          mine
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700'
                        }`}>
                          <p className={`text-[10px] font-medium uppercase tracking-wider ${
                            mine ? 'text-slate-300 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {mine ? 'Vous (Boutique)' : m.sender_name || m.sender_email || 'Client'}
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

              {/* Quick Canned Macros Bar */}
              <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 overflow-x-auto flex items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase text-slate-400 shrink-0 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" /> Réponses rapides :
                </span>
                {cannedMacros.map((macro) => (
                  <button
                    key={macro.label}
                    type="button"
                    onClick={() => setDraft((prev) => (prev ? `${prev} ${macro.text}` : macro.text))}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                  >
                    {macro.label}
                  </button>
                ))}
              </div>

              {/* Message Composer Footer */}
              <footer className="border-t border-slate-100 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900 space-y-2">
                {pendingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pendingImages.map((img, idx) => (
                      <div key={img.previewUrl} className="relative h-14 w-14 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50">
                        <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePendingImage(idx)}
                          aria-label="Supprimer l'image"
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
                    aria-label="Message à envoyer"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={activeConversation.status === 'closed' ? 'Cette discussion est clôturée.' : 'Écrivez votre message (Entrée pour envoyer)...'}
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
                    aria-label="Envoyer le message"
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

      {/* Admin Support Ticket Modal */}
      {showCreateAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-support-title"
        >
          <form
            onSubmit={createAdminConversation}
            className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 id="admin-support-title" className="text-base font-semibold text-slate-900 dark:text-white">
                  Contacter le Support PandaMarket
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Ouvrez une discussion privée avec l'équipe de modération de la place de marché.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAdmin(false)}
                aria-label="Fermer le dialogue"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-medium text-slate-700 dark:text-slate-300">
              <label className="block space-y-1">
                Objet de la demande
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Ex: Problème de reversement ou litige commande..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none shadow-2xs"
                />
              </label>

              <label className="block space-y-1">
                Description de votre question
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Détaillez votre besoin pour une assistance rapide..."
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
                disabled={sending || !newSubject.trim() || !newBody.trim()}
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
