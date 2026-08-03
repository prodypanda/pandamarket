'use client';

import { ChatInbox } from '../../../../components/chat/ChatInbox';
import { useLocale } from '@/contexts/LocaleContext';

export default function SellerMessagesPage() {
  const { t } = useLocale();

  return (
    <ChatInbox
      mode="seller"
      title={t('dashboardPages.messages.title')}
      subtitle={t('dashboardPages.messages.subtitle')}
    />
  );
}
