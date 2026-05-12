'use client';

import { ChatInbox } from '../../../../components/chat/ChatInbox';

export default function SellerMessagesPage() {
  return (
    <ChatInbox
      mode="seller"
      title="Message center"
      subtitle="Manage buyer conversations and private hub administrator support threads from one robust seller inbox."
    />
  );
}
