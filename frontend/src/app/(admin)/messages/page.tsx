'use client';

import { ChatInbox } from '../../../components/chat/ChatInbox';

export default function AdminMessagesPage() {
  return (
    <ChatInbox
      mode="admin"
      title="Seller support messages"
      subtitle="Handle seller-to-hub-administrator conversations, reply in real time, and track open support threads."
    />
  );
}
