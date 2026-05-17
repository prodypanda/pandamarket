import { notFound } from 'next/navigation';
import { SafePageRenderer } from '../../../../components/page-builder/SafePageRenderer';
import { StorefrontMaintenancePage } from '../../../../components/store/StorefrontMaintenancePage';
import { getStoreThemeLogoSurface, type StoreSocialLinks } from '../../../../components/themes/shared';
import {
  PAGE_BUILDER_REVALIDATE_SECONDS,
  pageBuilderPageTag,
  pageBuilderStoreTag,
} from '../../../../lib/page-builder-cache';
import { getMarketplacePublicUrl, getMarketplaceSettings } from '../../../../lib/marketplace-settings';
import { selectLogoForSurface } from '../../../../lib/public-assets';
import { getStoreRouteContext } from '../../../../lib/store-routing';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '../../../../lib/themes';

const MAINTENANCE_PAGE_SLUG = 'maintenance';

interface StoreData {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  theme_id: ThemeId;
  shipping_mode?: string | null;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    themeCustomization?: ThemeCustomization;
    maintenance_message?: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    store_description?: string | null;
    description?: string | null;
    shipping_policy?: string | null;
    returns_policy?: string | null;
    payment_policy?: string | null;
    social?: StoreSocialLinks | null;
  };
}

interface StorePageData {
  id: string;
  html: string;
  css: string;
}

async function getStoreByHost(host: string): Promise<StoreData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(host)}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.store;
  } catch {
    return null;
  }
}

async function getPublishedMaintenancePage(storeId: string): Promise<StorePageData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/stores/${storeId}/pages/${MAINTENANCE_PAGE_SLUG}`,
      {
        next: {
          revalidate: PAGE_BUILDER_REVALIDATE_SECONDS,
          tags: [pageBuilderStoreTag(storeId), pageBuilderPageTag(storeId, MAINTENANCE_PAGE_SLUG)],
        },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.page || null;
  } catch {
    return null;
  }
}

export default async function StoreMaintenanceRoute({
  params,
}: {
  params: Promise<{ storeHost: string }>;
}) {
  const { storeHost } = await params;
  const decodedHost = decodeURIComponent(storeHost);
  const store = await getStoreByHost(decodedHost);
  if (!store || store.status !== 'maintenance') notFound();

  const [marketplaceSettings, maintenancePage] = await Promise.all([
    getMarketplaceSettings(),
    getPublishedMaintenancePage(store.id),
  ]);
  const activeTheme = themes[store.theme_id] || themes.classic;
  const themeCustomization = (store.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);
  const primaryColor = store.settings?.colors?.primary || themeCustomization?.customColors?.primary || resolvedColors.primary;
  const logoUrl = selectLogoForSurface({
    logo_url: store.settings?.logo_url,
    logo_dark_url: store.settings?.logo_dark_url,
    logo_light_url: store.settings?.logo_light_url,
  }, getStoreThemeLogoSurface(activeTheme.id));

  if (maintenancePage?.html) {
    const { storePathBase } = await getStoreRouteContext(storeHost);

    return (
      <main className={`min-h-screen ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: resolvedColors.background, color: resolvedColors.text }}>
        <SafePageRenderer
          html={maintenancePage.html}
          css={maintenancePage.css}
          analytics={{ storeId: store.id, pageId: maintenancePage.id, enabled: true }}
          dynamicContext={{
            storeName: store.name,
            storeDescription: store.description || store.settings?.store_description || store.settings?.description,
            storePathBase,
            primaryColor,
            logoUrl,
            contactEmail: store.settings?.contact_email,
            contactPhone: store.settings?.contact_phone,
            address: store.settings?.address,
            city: store.settings?.city,
            country: store.settings?.country,
            shippingMode: store.shipping_mode,
            shippingPolicy: store.settings?.shipping_policy,
            returnsPolicy: store.settings?.returns_policy,
            paymentPolicy: store.settings?.payment_policy,
            products: [],
          }}
        />
      </main>
    );
  }

  return (
    <StorefrontMaintenancePage
      storeName={store.name}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      maintenanceMessage={store.settings?.maintenance_message}
      social={store.settings?.social}
      contactEmail={store.settings?.contact_email}
      contactPhone={store.settings?.contact_phone}
      marketplaceName={marketplaceSettings.marketplace_name}
      marketplaceHref={getMarketplacePublicUrl(marketplaceSettings)}
      marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
      marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
      marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
    />
  );
}
