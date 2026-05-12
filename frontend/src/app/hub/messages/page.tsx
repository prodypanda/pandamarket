'use client';

import { HubFooter } from '../../../components/hub/HubFooter';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { ChatInbox } from '../../../components/chat/ChatInbox';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';

export default function BuyerMessagesPage() {
  const { settings, classes } = useMarketplaceTheme();

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar marketplaceName={settings.marketplace_name} marketplaceLogoUrl={settings.marketplace_logo_url} marketplaceTheme={settings.marketplace_theme} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ChatInbox
          mode="buyer"
          title="Mes messages"
          subtitle="Discutez directement avec les vendeurs ou contactez l'administration marketplace pour vos produits, commandes, livraisons et questions avant achat."
        />
      </main>
      <HubFooter {...settings} />
    </div>
  );
}
