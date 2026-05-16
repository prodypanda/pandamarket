'use client';

import { ChatInbox } from '../../../components/chat/ChatInbox';

export default function AdminMessagesPage() {
  return (
    <ChatInbox
      mode="admin"
      title="Superadmin Messages"
      subtitle="Handle seller and buyer support conversations from one elegant command inbox, reply in real time, and track open threads clearly."
    />
  );
}
