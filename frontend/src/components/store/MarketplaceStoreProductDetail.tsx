import Link from 'next/link';
import { BadgeCheck, ChevronRight, Heart, PackageCheck, ShieldCheck, Star, Truck } from 'lucide-react';
import { HubNavbar } from '../hub/HubNavbar';
import { HubFooter } from '../hub/HubFooter';
import { AddToCartButton } from '../hub/AddToCartButton';
import { ReviewSection } from '../hub/ReviewSection';
import { ProductDescriptionRenderer } from '../product/ProductDescription';
import { ProductGallery } from '../product/ProductGallery';
import { SellerHoverCard } from '../product/SellerHoverCard';
import { ContactSellerButton } from '../chat/ContactSellerButton';
import { InstantChatLauncher } from '../chat/InstantChatLauncher';
import { getMarketplaceThemeClasses, type MarketplaceThemeSettings } from '../../lib/marketplace-theme';
import { getStorefrontWebsiteHref } from '../../lib/storefront-url';
import { getMarketplaceStoreProductHref, type MarketplaceStoreData, type MarketplaceStoreProduct } from './MarketplaceStorefront';
import { getWholesalePricingFromMetadata } from '../../lib/cart-utils';
import { t as translate } from '../../i18n/utils';
import type { Locale } from '../../i18n/config';

interface MarketplaceProductDetail extends MarketplaceStoreProduct {
  type?: string | null;
  description?: string;
  product_reference?: string | null;
  tags?: string[];
  attributes?: { name: string; value: string }[];
  metadata?: Record<string, unknown> | null;
  inventory_quantity?: number;
  store_is_verified?: boolean | null;
  store_seller_type?: string | null;
  store_status?: string | null;
  store_settings?: Record<string, unknown> | null;
  store_created_at?: string | null;
  store_product_count?: string | number | null;
  status: string;
}

interface MarketplaceStoreProductDetailProps {
  storeHost: string;
  store: MarketplaceStoreData;
  product: MarketplaceProductDetail;
  relatedProducts: MarketplaceStoreProduct[];
  ratingData: { average_rating: number; review_count: number } | null;
  marketplaceSettings: MarketplaceThemeSettings;
  locale: Locale;
}

function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatPrice(price: unknown): string {
  return `${toNumber(price).toFixed(3)} TND`;
}

function formatProductType(type?: string | null): string {
  if (!type) return 'Physical';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getImageUrl(image?: string | { url: string } | null): string {
  if (!image) return '';
  return typeof image === 'string' ? image : image.url;
}

export function MarketplaceStoreProductDetail({
  storeHost,
  store,
  product,
  relatedProducts,
  ratingData,
  marketplaceSettings,
  locale,
}: MarketplaceStoreProductDetailProps) {
  const classes = getMarketplaceThemeClasses(marketplaceSettings.marketplace_theme);
  const tx = (key: string, values?: Record<string, string | number>) => translate(locale, key, values);
  const isAliExpress = classes.isAliExpress;
  const accentHex = isAliExpress ? '#ff4747' : '#16C784';
  const storeHref = `/store/${encodeURIComponent(storeHost)}`;
  const sellerWebsiteHref = getStorefrontWebsiteHref({
    subdomain: store.subdomain,
    customDomain: store.custom_domain,
  });
  const productsHref = `${storeHref}/products`;
  const categoryHref = product.marketplace_category_slug
    ? `${productsHref}?category=${encodeURIComponent(product.marketplace_category_slug)}`
    : productsHref;
  const numericRating = toNumber(ratingData?.average_rating ?? 0);
  const reviewCount = toNumber(ratingData?.review_count ?? 0);
  const isPhysicalProduct = product.type === 'physical' || !product.type;
  const mainImage = product.thumbnail || getImageUrl(product.images?.[0]);
  const sellerType = product.store_seller_type ?? store.seller_type;
  const wholesalePricing = sellerType === 'wholesaler' || sellerType === 'hybrid'
    ? getWholesalePricingFromMetadata(product.metadata)
    : null;
  const cardClass = isAliExpress
    ? 'rounded-[2rem] border border-orange-100/80 bg-white shadow-xl shadow-orange-900/5'
    : 'rounded-[2rem] border border-gray-100 bg-white shadow-sm';
  const microCardClass = isAliExpress
    ? 'rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4'
    : 'rounded-2xl border border-gray-100 bg-gray-50 p-4';

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
        <nav className={`mb-8 flex items-center gap-2 rounded-full px-4 py-3 text-sm ${isAliExpress ? 'border border-orange-100 bg-white/80 text-gray-500 shadow-sm shadow-orange-900/5' : 'text-gray-500'}`}>
          <Link href="/hub" className={`font-bold transition-colors ${classes.primaryTextHover}`}>Hub</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={storeHref} className={`font-bold transition-colors ${classes.primaryTextHover}`}>{store.name}</Link>
          <ChevronRight className="h-4 w-4" />
          {product.category && (
            <>
              <Link href={categoryHref} className={`font-bold transition-colors ${classes.primaryTextHover}`}>{product.category}</Link>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
          <span className="max-w-xs truncate font-medium text-gray-900">{product.title}</span>
        </nav>

        <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className={isAliExpress ? 'rounded-[2rem] bg-white p-3 shadow-xl shadow-orange-900/5' : ''}>
            <ProductGallery title={product.title} thumbnail={product.thumbnail} images={product.images as { url: string }[]} emptyLabel="Pas d'image" accentColor={accentHex} />
          </div>

          <div className={`h-fit p-6 sm:p-8 lg:sticky lg:top-24 ${cardClass}`}>
            <div className="mb-4 flex flex-wrap gap-2">
              {product.category && (
                <Link href={categoryHref} className={`rounded-full px-3 py-1 text-xs font-black ${classes.primarySoft}`}>{product.category}</Link>
              )}
              <span className={`rounded-full px-3 py-1 text-xs font-black ${isAliExpress ? 'bg-[#fff1e8] text-[#7a2d11]' : 'bg-gray-100 text-gray-600'}`}>{product.status}</span>
            </div>

            <h1 className="mb-3 text-3xl font-black leading-tight text-gray-900 sm:text-4xl">{product.title}</h1>

            <div className={`mb-5 inline-flex flex-wrap items-center gap-2 rounded-full px-3 py-2 ${isAliExpress ? 'bg-orange-50 text-[#7a2d11]' : 'bg-gray-50 text-gray-600'}`}>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-5 w-5 ${star <= Math.round(numericRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-sm font-bold">({reviewCount} avis)</span>
            </div>

            <div className={`mb-6 rounded-[1.75rem] p-5 ${isAliExpress ? 'border border-orange-100 bg-gradient-to-br from-[#fff7f2] via-white to-white' : 'border border-gray-100 bg-gray-50'}`}>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Marketplace price</p>
              <p className={`mt-1 text-4xl font-black sm:text-5xl ${classes.primaryText}`}>{formatPrice(product.price)}</p>
            </div>
            {wholesalePricing && (
              <div className={`mb-6 rounded-[1.75rem] p-5 ${isAliExpress ? 'border border-orange-100 bg-orange-50/70' : 'border border-emerald-100 bg-emerald-50/70'}`}>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{tx('productWholesale.publicTitle')}</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">
                  {tx('productWholesale.publicSubtitle')}
                </p>
                <p className={`mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black ${classes.primaryText}`}>
                  {tx('productWholesale.minimumQuantity')}: {wholesalePricing.min_quantity}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {wholesalePricing.price_tiers?.map((tier) => (
                    <div key={tier.min_quantity} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-sm">
                      <span className="block text-xs font-black uppercase text-gray-400">
                        {tx('productWholesale.tierLine', { quantity: tier.min_quantity })}
                      </span>
                      <span className={classes.primaryText}>
                        {tx('productWholesale.unitPriceLine', { price: Number(tier.unit_price).toFixed(3) })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6 space-y-3">
              <SellerHoverCard
                name={store.name}
                href={storeHref}
                websiteHref={sellerWebsiteHref}
                isVerified={product.store_is_verified ?? store.is_verified}
                sellerType={product.store_seller_type ?? store.seller_type}
                status={product.store_status ?? store.status}
                createdAt={product.store_created_at ?? store.created_at}
                productCount={product.store_product_count}
                settings={product.store_settings || store.settings}
                accentColor={accentHex}
              />
              <ContactSellerButton
                storeId={store.id}
                productId={product.id}
                subject={product.title}
                isAliExpress={isAliExpress}
              />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={microCardClass}>
                <span className="block text-xs font-bold uppercase tracking-wide text-gray-400">Type</span>
                <span className="mt-1 block font-bold text-gray-900">{formatProductType(product.type)}</span>
              </div>
              {product.product_reference && (
                <div className={microCardClass}>
                  <span className="block text-xs font-bold uppercase tracking-wide text-gray-400">Reference</span>
                  <span className="mt-1 block font-bold text-gray-900">{product.product_reference}</span>
                </div>
              )}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={`rounded-2xl p-4 ${isAliExpress ? 'bg-orange-50/70 text-[#7a2d11]' : 'bg-gray-50 text-gray-700'}`}>
                <ShieldCheck className={`mb-2 h-5 w-5 ${classes.primaryText}`} />
                <p className="text-xs font-black">Buyer protection</p>
                <p className="mt-0.5 text-[11px] text-gray-500">Secure marketplace checkout</p>
              </div>
              <div className={`rounded-2xl p-4 ${isAliExpress ? 'bg-orange-50/70 text-[#7a2d11]' : 'bg-gray-50 text-gray-700'}`}>
                <Truck className={`mb-2 h-5 w-5 ${classes.primaryText}`} />
                <p className="text-xs font-black">Seller delivery</p>
                <p className="mt-0.5 text-[11px] text-gray-500">Fulfilled by {store.name}</p>
              </div>
            </div>

            {isPhysicalProduct && product.inventory_quantity !== undefined && (
              <p className={`mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${product.inventory_quantity > 0 ? classes.primarySoft : 'bg-red-50 text-red-600'}`}>
                <PackageCheck className="h-4 w-4" />
                {product.inventory_quantity > 0 ? `${product.inventory_quantity} disponibles` : 'Rupture de stock'}
              </p>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className={`rounded-full px-3 py-1 text-xs font-bold ${isAliExpress ? 'bg-orange-50 text-[#7a2d11]' : 'bg-gray-100 text-gray-600'}`}>{tag}</span>
                ))}
              </div>
            )}

            <div className={`flex items-center gap-3 rounded-[1.75rem] p-3 ${isAliExpress ? 'bg-[#fff7f2]' : 'bg-gray-50'}`}>
              <AddToCartButton
                product_id={product.id}
                title={product.title}
                slug={product.slug}
                category={product.category}
                marketplace_category_slug={product.marketplace_category_slug}
                price={toNumber(product.price)}
                seller_type={sellerType}
                wholesale_pricing={wholesalePricing}
                store_id={store.id}
                store_name={store.name}
                store_subdomain={store.subdomain}
                product_type={product.type}
                image_url={mainImage || null}
                maxQuantity={product.inventory_quantity}
              />
              <button aria-label="Add to wishlist" className="rounded-xl border border-gray-300 bg-white p-3 transition-colors hover:bg-gray-50">
                <Heart className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className={`mb-10 p-6 sm:p-8 ${cardClass}`}>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-gray-900">
            <BadgeCheck className={`h-5 w-5 ${classes.primaryText}`} /> Description
          </h2>
          <ProductDescriptionRenderer value={product.description} />
        </div>

        {product.attributes && product.attributes.length > 0 && (
          <div className={`mb-10 p-6 sm:p-8 ${cardClass}`}>
            <h2 className="mb-4 text-xl font-black text-gray-900">Product details</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {product.attributes.map((attribute) => (
                <div key={`${attribute.name}-${attribute.value}`} className={microCardClass}>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{attribute.name}</p>
                  <p className="mt-1 font-semibold text-gray-900">{attribute.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`mb-16 p-6 sm:p-8 ${cardClass}`}>
          <h2 className="mb-6 text-xl font-black text-gray-900">Avis clients ({reviewCount})</h2>
          <ReviewSection productId={product.id} marketplaceTheme={marketplaceSettings.marketplace_theme} />
        </div>

        {relatedProducts.length > 0 && (
          <section>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">More from {store.name}</h2>
                <p className="mt-1 text-sm text-gray-500">Other marketplace products from this seller.</p>
              </div>
              <Link href={productsHref} className={`text-sm font-bold ${classes.primaryText} ${classes.primaryTextHover}`}>View seller products</Link>
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {relatedProducts.map((relatedProduct) => {
                const imageUrl = relatedProduct.thumbnail || getImageUrl(relatedProduct.images?.[0]);
                return (
                  <Link key={relatedProduct.id} href={getMarketplaceStoreProductHref(storeHost, relatedProduct)} className={`group overflow-hidden ${classes.card}`}>
                    <div className={`relative aspect-square overflow-hidden ${isAliExpress ? 'bg-orange-50' : 'bg-gray-100'}`}>
                      {imageUrl ? (
                        <div
                          aria-label={relatedProduct.title}
                          role="img"
                          className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{ backgroundImage: `url(${imageUrl})` }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">No Image</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className={`mb-1 line-clamp-2 text-sm font-bold text-gray-900 transition-colors ${classes.primaryTextHover}`}>{relatedProduct.title}</h3>
                      <p className={`font-black ${classes.primaryText}`}>{formatPrice(relatedProduct.price)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
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
