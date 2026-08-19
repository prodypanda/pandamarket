import React from 'react';
import { HubNavbar } from '../hub/HubNavbar';
import { HubFooter } from '../hub/HubFooter';
import { InstantChatLauncher } from '../chat/InstantChatLauncher';
import { ProductDetailV1, type SingleProductData } from '../product/ProductDetailV1';
import { ProductDetailV2 } from '../product/ProductDetailV2';
import { getMarketplaceThemeClasses } from '../../lib/marketplace-theme';
import type { MarketplaceSettings } from '../../lib/marketplace-settings';
import type { MarketplaceStoreData, MarketplaceStoreProduct } from './MarketplaceStorefront';
import type { Locale } from '../../i18n/config';

interface MarketplaceProductDetail extends MarketplaceStoreProduct {
  type?: string | null;
  description?: string;
  product_reference?: string | null;
  tags?: string[];
  attributes?: { name: string; value: string }[];
  metadata?: Record<string, unknown> | null;
  wholesale_pricing?: any;
  inventory_quantity?: number;
  store_is_verified?: boolean | null;
  store_seller_type?: string | null;
  store_status?: string | null;
  store_settings?: Record<string, unknown> | null;
  store_created_at?: string | null;
  store_product_count?: string | number | null;
  variants?: any[];
  bundle_pricing_type?: 'fixed' | 'percentage' | null;
  bundle_discount_value?: number | null;
  bundle_items?: any[];
  status: string;
}

export interface MarketplaceStoreProductDetailProps {
  storeHost: string;
  store: MarketplaceStoreData;
  product: MarketplaceProductDetail;
  relatedProducts: MarketplaceStoreProduct[];
  ratingData: { average_rating: number; review_count: number } | null;
  marketplaceSettings: MarketplaceSettings;
  locale?: Locale;
  currentHost?: string | null;
  previewVersion?: string;
}

export function MarketplaceStoreProductDetail({
  storeHost: _storeHost,
  store,
  product,
  relatedProducts,
  ratingData,
  marketplaceSettings,
  locale = 'fr',
  currentHost,
  previewVersion,
}: MarketplaceStoreProductDetailProps) {
  const classes = getMarketplaceThemeClasses(marketplaceSettings.marketplace_theme);

  const formattedProduct: SingleProductData = {
    id: product.id,
    type: product.type || 'physical',
    title: product.title,
    slug: product.slug,
    description: product.description || '',
    price: product.price,
    compare_at_price: product.compare_at_price ?? null,
    category: product.category || undefined,
    product_reference: product.product_reference ?? null,
    marketplace_category_slug: product.marketplace_category_slug ?? null,
    thumbnail: product.thumbnail || (typeof product.images?.[0] === 'string' ? product.images[0] : (product.images?.[0] as any)?.url) || undefined,
    images: (product.images || []).map((img: any) => typeof img === 'string' ? { id: img, url: img } : img),
    tags: product.tags || [],
    attributes: product.attributes || [],
    metadata: product.metadata || null,
    wholesale_pricing: (product as any).wholesale_pricing || (product.metadata as any)?.wholesale_pricing || null,
    inventory_quantity: product.inventory_quantity,
    store_id: store.id,
    store_name: product.store_name || store.name,
    store_subdomain: store.subdomain,
    store_custom_domain: store.custom_domain,
    store_is_verified: product.store_is_verified ?? store.is_verified,
    store_seller_type: product.store_seller_type ?? store.seller_type,
    store_status: product.store_status ?? store.status,
    store_settings: (product.store_settings || store.settings) as any,
    store_created_at: product.store_created_at ?? (store.created_at ? String(store.created_at) : null),
    store_product_count: product.store_product_count ?? (store as any).product_count ?? null,
    variants: (product as any).variants || [],
    bundle_pricing_type: product.bundle_pricing_type,
    bundle_discount_value: product.bundle_discount_value,
    bundle_items: product.bundle_items || [],
    status: product.status || 'published',
  };

  const formattedSimilarProducts: SingleProductData[] = (relatedProducts || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: p.price,
    compare_at_price: p.compare_at_price ?? null,
    thumbnail: p.thumbnail || (typeof p.images?.[0] === 'string' ? p.images[0] : (p.images?.[0] as any)?.url),
    category: p.category || undefined,
    marketplace_category_slug: p.marketplace_category_slug ?? null,
    store_name: p.store_name || store.name,
    store_id: p.store_id || store.id,
    store_subdomain: store.subdomain,
    store_custom_domain: store.custom_domain,
    status: p.status || 'published',
  }));

  const activeVersion =
    previewVersion === 'v2'
      ? 'v2_modern_showcase'
      : previewVersion === 'v1'
      ? 'v1_classic'
      : marketplaceSettings.single_product_page_version || 'v1_classic';

  const isV2 = activeVersion === 'v2_modern_showcase';

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
        marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
        marketplaceTheme={marketplaceSettings.marketplace_theme}
        showInstantChat={false}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="sr-only" aria-hidden="true">More from {store.name}</div>
        {isV2 ? (
          <ProductDetailV2
            product={formattedProduct}
            similarProducts={formattedSimilarProducts}
            ratingData={ratingData}
            marketplaceSettings={marketplaceSettings}
            locale={locale}
            requestHost={currentHost}
          />
        ) : (
          <ProductDetailV1
            product={formattedProduct}
            similarProducts={formattedSimilarProducts}
            ratingData={ratingData}
            marketplaceSettings={marketplaceSettings}
            locale={locale}
            requestHost={currentHost}
          />
        )}
      </main>

      <HubFooter {...marketplaceSettings} />
      <InstantChatLauncher
        marketplaceTheme={marketplaceSettings.marketplace_theme}
        storeContext={{
          storeId: store.id,
          storeName: store.name,
          productId: product.id,
          productTitle: product.title,
        }}
      />
    </div>
  );
}
