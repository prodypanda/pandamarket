type StoreHomeProps = {
  params: {
    storeHost: string;
  };
};

import { notFound } from 'next/navigation';
import { themes, ThemeId } from '../../../lib/themes';
import { MinimalTheme } from '../../../components/themes/MinimalTheme';
import { ClassicTheme } from '../../../components/themes/ClassicTheme';
import { ModernTheme } from '../../../components/themes/ModernTheme';

// This is a mock database fetch. In a real application, you would
// fetch the store from the database or an API using the `storeHost`.
async function getStoreByHost(host: string) {
  // Simulate network request
  await new Promise(r => setTimeout(r, 100));

  // Determine theme based on subdomains for demonstration purposes:
  // "minimal.pandamarket.tn" -> minimal theme
  // "classic.pandamarket.tn" -> classic theme
  // "modern.pandamarket.tn" -> modern theme

  let themeId: ThemeId = 'modern';
  if (host.startsWith('minimal')) themeId = 'minimal';
  if (host.startsWith('classic')) themeId = 'classic';

  return {
    id: `store-${host}`,
    name: host.split('.')[0].toUpperCase() + ' Store',
    theme_id: themeId,
  };
}

export default async function StorePage({ params }: { params: { storeHost: string } }) {
  const { storeHost } = params;

  // Clean up the host if necessary (e.g., extracting subdomain or processing custom domain)
  const decodedHost = decodeURIComponent(storeHost);

  const store = await getStoreByHost(decodedHost);
  if (!store) {
    notFound();
  }

  const activeTheme = themes[store.theme_id] || themes['classic'];

  // Render the appropriate component based on the active theme
  switch (activeTheme.id) {
    case 'minimal':
      return <MinimalTheme theme={activeTheme} storeName={store.name} />;
    case 'classic':
      return <ClassicTheme theme={activeTheme} storeName={store.name} />;
    case 'modern':
      return <ModernTheme theme={activeTheme} storeName={store.name} />;
    default:
      return <ClassicTheme theme={activeTheme} storeName={store.name} />;
  }
}
