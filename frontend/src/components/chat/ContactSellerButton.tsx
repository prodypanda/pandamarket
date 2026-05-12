'use client';

import { fetchWithCsrf } from '@/lib/api';
import { Loader2, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface ContactSellerButtonProps {
  storeId: string;
  productId?: string | null;
  subject: string;
  isAliExpress?: boolean;
}

export function ContactSellerButton({ storeId, productId, subject, isAliExpress = false }: ContactSellerButtonProps) {
  const [loading, setLoading] = useState(false);
  const [existingConversationId, setExistingConversationId] = useState<string | null>(null);

  const redirectToConversation = (conversationId: string) => {
    window.location.href = `/hub/messages?conversation=${encodeURIComponent(conversationId)}`;
  };

  const startChat = async (forceNew = false) => {
    setLoading(true);
    setExistingConversationId(null);
    try {
      const res = await fetchWithCsrf('/api/pd/chats/buyer-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, product_id: productId, subject, check_existing: !forceNew, force_new: forceNew }),
      });
      if (res.status === 401) {
        window.location.href = `/login/buyer?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || 'Unable to start chat');
      if (data?.existing && data?.conversation?.id && !forceNew) {
        setExistingConversationId(data.conversation.id);
        return;
      }
      redirectToConversation(data.conversation.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to start chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => startChat()}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black transition disabled:opacity-60 ${
          isAliExpress
            ? 'bg-[#fff1e8] text-[#ff4747] hover:bg-[#ffe1d1]'
            : 'bg-emerald-50 text-[#16C784] hover:bg-emerald-100'
        }`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        Contact seller
      </button>
      {existingConversationId && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm">
          <p className="font-black text-amber-900">You already have an open chat with this seller.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => redirectToConversation(existingConversationId)} className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-black text-white">
              Resume old chat
            </button>
            <button type="button" onClick={() => startChat(true)} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-amber-800 ring-1 ring-amber-200">
              Create new chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
