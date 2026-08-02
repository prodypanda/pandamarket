import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { themes, type ThemeId, type ThemeCustomization, resolveThemeColors } from '../../../../lib/themes';
import { renderStorefrontTheme } from '../../../../components/themes/ThemeWrapper';
import { getStoreRouteContext } from '@/lib/store-routing';
import { getStoreThemeLogoSurface, type StoreSocialLinks } from '../../../../components/themes/shared';
import { selectLogoForSurface } from '../../../../lib/public-assets';
import { StorefrontPreviewBar } from '../../../../components/store/StorefrontPreviewBar';

export const metadata: Metadata = {
  title: 'Aperçu du thème | PandaMarket',
  robots: {
    index: false,
    follow: false,
  },
};

interface PageSearchParams {
  token?: string | string[];
  mode?: string | string[];
}

function getParam(param: string | string[] | undefined): string | undefined {
  return Array.isArray(param) ? param[0] : param;
}

interface StoreData {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  theme_id: ThemeId;
  live_theme_id?: ThemeId;
  status: string;
  is_verified: boolean;
  settings?: {
    themeCustomization?: ThemeCustomization;
    liveThemeCustomization?: ThemeCustomization;
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    favicon_url?: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    address?: string;
    city?: string;
    country?: string;
    map_embed_url?: string | null;
    social?: StoreSocialLinks | null;
    [key: string]: unknown;
  };
}

async function getPreviewData(storeHost: string, token: string) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';

    // First resolve store host to store ID
    const hostRes = await fetch(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`, {
      cache: 'no-store',
    });
    if (!hostRes.ok) return null;
    const hostData = await hostRes.json();
    const storeId = hostData.store?.id;
    if (!storeId) return null;

    // Fetch theme preview payload
    const previewRes = await fetch(`${backendUrl}/api/pd/stores/${storeId}/theme-preview?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    if (!previewRes.ok) return null;
    const previewData = await previewRes.json();

    // Fetch live products and navigation
    const [productsRes, navRes, settingsRes] = await Promise.all([
      fetch(`${backendUrl}/api/pd/products/public?store_id=${storeId}&limit=100`, { cache: 'no-store' }),
      fetch(`${backendUrl}/api/pd/stores/storefront/v1/navigation?store_id=${storeId}`, { cache: 'no-store' }),
      fetch(`${backendUrl}/api/pd/marketplace/settings`, { cache: 'no-store' }),
    ]);

    const productsData = productsRes.ok ? await productsRes.json() : {};
    const navData = navRes.ok ? await navRes.json() : {};
    const settingsData = settingsRes.ok ? await settingsRes.json() : {};

    return {
      store: previewData.store as StoreData,
      products: productsData.data || [],
      navigation: navData.navigation || navData.data || undefined,
      marketplaceSettings: settingsData.data || {},
    };
  } catch {
    return null;
  }
}

export default async function ThemePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeHost: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { storeHost } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = getParam(resolvedSearchParams?.token);
  const modeParam = getParam(resolvedSearchParams?.mode) || 'draft';

  if (!token) {
    notFound();
  }

  const decodedHost = decodeURIComponent(storeHost);
  const data = await getPreviewData(decodedHost, token);

  if (!data || !data.store) {
    notFound();
  }

  const { store, products, navigation, marketplaceSettings } = data;
  const { storePathBase } = await getStoreRouteContext(storeHost);

  // Resolve draft vs live theme settings based on mode query
  const isLiveMode = modeParam === 'live';
  const effectiveThemeId = isLiveMode ? (store.live_theme_id || store.theme_id) : store.theme_id;
  const effectiveCustomization = isLiveMode
    ? (store.settings?.liveThemeCustomization || {})
    : (store.settings?.themeCustomization || {});

  const activeTheme = themes[effectiveThemeId] || themes.classic;
  const resolvedColors = resolveThemeColors(activeTheme, effectiveCustomization);

  const branding = {
    store_id: store.id,
    store_host: storeHost,
    primary_color:
      store.settings?.colors?.primary ||
      effectiveCustomization?.customColors?.primary ||
      resolvedColors.primary,
    secondary_color:
      store.settings?.colors?.secondary ||
      effectiveCustomization?.customColors?.secondary ||
      resolvedColors.secondary,
    logo_url: selectLogoForSurface(
      {
        logo_url: store.settings?.logo_url as string | undefined,
        logo_dark_url: store.settings?.logo_dark_url as string | undefined,
        logo_light_url: store.settings?.logo_light_url as string | undefined,
      },
      getStoreThemeLogoSurface(activeTheme.id),
    ),
    logo_light_url: store.settings?.logo_light_url as string | undefined,
    logo_dark_url: store.settings?.logo_dark_url as string | undefined,
    favicon_url: store.settings?.favicon_url as string | undefined,
    themeCustomization: effectiveCustomization,
    store_path_base: storePathBase,
    marketplace_name: marketplaceSettings.marketplace_name,
    marketplace_logo_url: marketplaceSettings.marketplace_logo_url,
    marketplace_logo_light_url: marketplaceSettings.marketplace_logo_light_url,
    marketplace_logo_dark_url: marketplaceSettings.marketplace_logo_dark_url,
    contact_email: store.settings?.contact_email,
    contact_phone: store.settings?.contact_phone,
    address: store.settings?.address,
    city: store.settings?.city,
    country: store.settings?.country,
    map_embed_url: store.settings?.map_embed_url,
    social: store.settings?.social,
  };

  const themeProps = {
    theme: activeTheme,
    storeName: store.name,
    products,
    branding,
    navigation,
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <StorefrontPreviewBar
        storeName={store.name}
        themeName={activeTheme.name}
        token={token}
        mode={modeParam === 'live' ? 'live' : 'draft'}
      >
        {renderStorefrontTheme(themeProps)}
      </StorefrontPreviewBar>
    </div>
  );
}
