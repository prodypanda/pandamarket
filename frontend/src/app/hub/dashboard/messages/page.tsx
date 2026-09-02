'use client';

import { SellerChatInbox } from '@/components/chat/SellerChatInbox';
import { useLocale } from '@/contexts/LocaleContext';

export default function SellerMessagesPage() {
  const { t } = useLocale();

  return (
    <SellerChatInbox
      title={t('dashboardPages.messages.title')}
      subtitle={t('dashboardPages.messages.subtitle')}
    />
  );
}
