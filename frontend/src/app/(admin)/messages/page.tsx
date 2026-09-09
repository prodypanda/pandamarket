'use client';

import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { AdminChatInbox } from '@/components/chat/AdminChatInbox';
import { MessageSquare } from 'lucide-react';

export default function AdminMessagesPage() {
  const { adminTheme } = useAdminTheme();

  if (adminTheme === 'rego') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--rego-border,#dedede)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--rego-accent,#ad0505)]/10 text-[var(--rego-accent,#ad0505)]">
                <MessageSquare className="w-3.5 h-3.5" />
                ReGo Unified Mediation Console
              </span>
            </div>
            <h1 className="text-2xl font-black text-[var(--rego-fg,#111111)] tracking-tight mt-1">
              Messagerie & Arbitrage PandaMarket
            </h1>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Centre de traitement unifié des conversations vendeurs et acheteurs avec messagerie instantanée
            </p>
          </div>
        </div>

        <AdminChatInbox
          title="Superadmin Messages"
          subtitle="Handle seller and buyer support conversations from one elegant command inbox, reply in real time, and track open threads clearly."
        />
      </div>
    );
  }

  return (
    <AdminChatInbox
      title="Superadmin Messages"
      subtitle="Handle seller and buyer support conversations from one elegant command inbox, reply in real time, and track open threads clearly."
    />
  );
}
