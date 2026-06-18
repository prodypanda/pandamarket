'use client';

import { fetchWithCsrf } from '@/lib/api';
import { isAliExpressTheme } from '@/lib/marketplace-theme';
import { Loader2, MessageCircle, Send, ShieldCheck, Store, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface CurrentUser {
  id: string;
  role?: string;
  store_id?: string | null;
}

interface InstantChatStoreContext {
  storeId: string;
  storeName: string;
  productId?: string | null;
  productTitle?: string | null;
}

interface InstantChatLauncherProps {
  storeContext?: InstantChatStoreContext;
  marketplaceTheme?: 'panda' | 'aliexpress' | 'aliexpress2';
}

type ChatTarget = 'marketplace' | 'store';
type ChatBubblePosition = 'bottom-right' | 'bottom-left';

interface ChatBubbleSettings {
  enabled: boolean;
  position: ChatBubblePosition;
}

function roleOf(user: CurrentUser | null) {
  return user?.role?.toLowerCase() || '';
}

function dashboardHref(role: string) {
  if (role === 'admin' || role === 'super_admin') return '/messages';
  if (role === 'vendor') return '/hub/dashboard/messages';
  return '/hub/messages';
}

function normalizeBubbleSettings(data: Record<string, unknown> | null | undefined): ChatBubbleSettings {
  return {
    enabled: data?.chat_bubble_enabled !== false && data?.chat_bubble_enabled !== 'false',
    position: data?.chat_bubble_position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
  };
}

export function InstantChatLauncher({ storeContext, marketplaceTheme = 'panda' }: InstantChatLauncherProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [loadingTarget, setLoadingTarget] = useState<ChatTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [existingConversationId, setExistingConversationId] = useState<string | null>(null);
  const [bubbleSettings, setBubbleSettings] = useState<ChatBubbleSettings | null>(null);
  const isAliExpress = isAliExpressTheme(marketplaceTheme);
  const role = roleOf(currentUser);
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSeller = role === 'vendor';
  const isBuyer = role === 'customer';
  const isOwnStore = Boolean(storeContext?.storeId && currentUser?.store_id === storeContext.storeId);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const res = await fetch('/api/pd/auth/me', { credentials: 'include' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setCurrentUser(data.user || data.data || null);
        }
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadBubbleSettings() {
      try {
        const res = await fetch('/api/pd/marketplace/settings', { credentials: 'include' });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok) setBubbleSettings(normalizeBubbleSettings(data?.data));
      } catch {
        if (!cancelled) setBubbleSettings({ enabled: true, position: 'bottom-right' });
      }
    }
    void loadBubbleSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const actions = useMemo(() => {
    const items: Array<{ target: ChatTarget; label: string; helper: string; icon: 'shield' | 'store' }> = [];
    if (isBuyer || isSeller) {
      items.push({ target: 'marketplace', label: 'Marketplace manager', helper: 'Chat with the superadmin support team.', icon: 'shield' });
    }
    if (storeContext && !isOwnStore) {
      if (isBuyer) {
        items.push({ target: 'store', label: `${storeContext.storeName} manager`, helper: 'Ask this seller about products, stock, or orders.', icon: 'store' });
      } else if (isSeller) {
        items.push({ target: 'store', label: `${storeContext.storeName} manager`, helper: 'Start a seller-to-seller conversation.', icon: 'store' });
      } else if (isAdmin) {
        items.push({ target: 'store', label: `${storeContext.storeName} owner`, helper: 'Contact the store owner directly.', icon: 'store' });
      }
    }
    return items;
  }, [isAdmin, isBuyer, isOwnStore, isSeller, storeContext]);

  if (!authChecked || actions.length === 0 || !mounted || !bubbleSettings?.enabled) return null;

  const redirectToConversation = (conversationId: string) => {
    window.location.href = `${dashboardHref(role)}?conversation=${encodeURIComponent(conversationId)}`;
  };

  const startChat = async (target: ChatTarget, forceNew = false) => {
    if (!currentUser) {
      window.location.href = `/login/buyer?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setLoadingTarget(target);
    setError(null);
    setExistingConversationId(null);
    try {
      const subject = storeContext?.productTitle || (storeContext ? `Conversation with ${storeContext.storeName}` : 'Marketplace support');
      let endpoint = '/api/pd/chats/buyer-admin';
      const payload: Record<string, string | null | boolean> = { subject };

      if (target === 'marketplace') {
        endpoint = isSeller ? '/api/pd/chats/store/admin' : '/api/pd/chats/buyer-admin';
      } else if (storeContext) {
        payload.store_id = storeContext.storeId;
        payload.product_id = storeContext.productId ?? null;
        if (isBuyer) endpoint = '/api/pd/chats/buyer-seller';
        if (isSeller) endpoint = '/api/pd/chats/store/seller';
        if (isAdmin) endpoint = '/api/pd/chats/admin/seller';
        if (isBuyer) {
          payload.check_existing = !forceNew;
          payload.force_new = forceNew;
        }
      }

      if (body.trim()) payload.body = body.trim();
      const res = await fetchWithCsrf(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        window.location.href = `/login/buyer?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || data?.message || 'Unable to start chat');
      if (data?.existing && data?.conversation?.id && !forceNew) {
        setExistingConversationId(data.conversation.id);
        return;
      }
      redirectToConversation(data.conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start chat');
    } finally {
      setLoadingTarget(null);
    }
  };

  const launcher = (
    <div className={`fixed bottom-5 z-50 ${bubbleSettings.position === 'bottom-left' ? 'left-5' : 'right-5'}`}>
      {open && (
        <div className="mb-3 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-2xl shadow-slate-900/20">
          <div className={`p-4 text-white ${isAliExpress ? 'bg-gradient-to-r from-[#ff4747] to-[#ff8a00]' : 'bg-gradient-to-r from-slate-950 to-[#16C784]'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Instant chat</p>
                <h3 className="mt-1 text-lg font-black">How can we help?</h3>
              </div>
              <button type="button" aria-label="Close chat" onClick={() => setOpen(false)} className="rounded-full bg-white/15 p-2 hover:bg-white/25">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {error && <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div>}
            {existingConversationId && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-sm font-black text-amber-900">You already have an open chat with this seller.</p>
                <p className="mt-1 text-xs font-semibold text-amber-700">Resume the old conversation or create a new one.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => redirectToConversation(existingConversationId)} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white">
                    Resume
                  </button>
                  <button type="button" onClick={() => startChat('store', true)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-200">
                    New chat
                  </button>
                </div>
              </div>
            )}
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              placeholder="Write an optional first message..."
              className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10"
            />
            <div className="space-y-2">
              {actions.map((action) => (
                <button
                  key={action.target}
                  type="button"
                  onClick={() => startChat(action.target)}
                  disabled={Boolean(loadingTarget)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:border-emerald-100 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    {loadingTarget === action.target ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon === 'shield' ? <ShieldCheck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-gray-900">{action.label}</span>
                    <span className="block text-xs font-semibold text-gray-500">{action.helper}</span>
                  </span>
                  <Send className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition hover:scale-105 ${isAliExpress ? 'bg-[#ff4747] shadow-orange-900/20' : 'bg-[#16C784] shadow-emerald-900/20'}`}
        aria-label="Open instant chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );

  return createPortal(launcher, document.body);
}
