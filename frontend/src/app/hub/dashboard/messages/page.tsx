'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { useDashboardStyle } from '@/contexts/DashboardStyleContext';
import {
  SellerReGoMessages,
  type ChatConversation,
  type ChatMessage,
} from '@/components/dashboard/rego/SellerReGoMessages';
import { SellerChatInbox } from '@/components/chat/SellerChatInbox';

interface ChatDetails {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

interface PresignedAttachment {
  file_key: string;
  file_name: string;
  content_type: string;
  file_size: number;
}

export default function SellerMessagesPage() {
  const { t } = useLocale();
  const { dashboardStyle } = useDashboardStyle();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeDetails, setActiveDetails] = useState<ChatDetails | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('conversation');
  });
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const activeConversation = activeDetails?.conversation || null;
  const messages = activeDetails?.messages || [];

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetchWithCsrf('/api/pd/chats/store?page=1&limit=50', {
        credentials: 'include',
      });
      if (res.status === 401) {
        window.location.href = '/login/seller';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const next: ChatConversation[] = data.data || [];
        setConversations(next);
        if (!activeId && next[0]) {
          setActiveId(next[0].id);
        }
      }
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, [activeId]);

  const loadConversation = useCallback(async (id: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/chats/store/${id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data: ChatDetails = await res.json();
        setActiveDetails(data);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('conversation', id);
          window.history.replaceState({}, '', url.toString());
        }
        await fetchWithCsrf(`/api/pd/chats/store/${id}/read`, { method: 'POST' }).catch(() => undefined);
      }
    } catch {
      // keep previous detail on failure
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) void loadConversation(activeId);
  }, [activeId, loadConversation]);

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
  };

  const uploadAttachment = async (file: File): Promise<PresignedAttachment | null> => {
    try {
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          purpose: 'chat_image',
        }),
      });
      if (!presignRes.ok) return null;
      const presignData = await presignRes.json();
      const uploadRes = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) return null;
      return {
        file_key: presignData.file_key,
        file_name: file.name,
        content_type: file.type,
        file_size: file.size,
      };
    } catch {
      return null;
    }
  };

  const handleSendMessage = async (text: string, attachments?: File[]) => {
    if (!activeId || (!text.trim() && !attachments?.length)) return;
    setSendingMessage(true);
    try {
      const uploaded: PresignedAttachment[] = [];
      for (const file of attachments || []) {
        const att = await uploadAttachment(file);
        if (att) uploaded.push(att);
      }
      const res = await fetchWithCsrf(`/api/pd/chats/store/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: text.trim(), attachments: uploaded }),
      });
      if (res.ok) {
        const data: ChatDetails = await res.json();
        setActiveDetails(data);
        void loadConversations();
      }
    } finally {
      setSendingMessage(false);
    }
  };

  // 1-Click COD validation: only available when the thread is attached to an existing order
  const handleValidateCodOrder = activeConversation?.order_id
    ? async (conversation: ChatConversation) => {
        const res = await fetchWithCsrf(
          `/api/pd/orders/store/${conversation.order_id}/cod-verify`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              status: 'confirmed',
              call_attempts_delta: 0,
              custom_notes: 'Confirmé directement via la messagerie PandaMarket',
            }),
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error?.message || 'Échec de la validation COD');
        }
      }
    : undefined;

  const handleRefresh = async () => {
    await loadConversations();
    if (activeId) await loadConversation(activeId);
  };

  if (dashboardStyle === 'rego') {
    return (
      <SellerReGoMessages
        conversations={conversations}
        activeConversation={activeConversation}
        messages={messages}
        loadingList={loadingList}
        loadingMessages={loadingMessages}
        sendingMessage={sendingMessage}
        onSelectConversation={handleSelectConversation}
        onSendMessage={handleSendMessage}
        onValidateCodOrder={handleValidateCodOrder}
        onRefresh={handleRefresh}
      />
    );
  }

  return (
    <SellerChatInbox
      title={t('dashboardPages.messages.title')}
      subtitle={t('dashboardPages.messages.subtitle')}
    />
  );
}
