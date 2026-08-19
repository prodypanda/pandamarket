'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import {
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Zap,
  PackageCheck,
  ChevronRight,
  Flame,
  CheckCircle2,
  FileText,
  Sliders,
  MessageSquare,
  Building2,
  Share2,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { getHubProductHref } from '@/lib/product-links';
import { ProductDescriptionRenderer } from '@/components/product/ProductDescription';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductVariantPurchasePanel } from '@/components/product/ProductVariantPurchasePanel';
import { SellerHoverCard } from '@/components/product/SellerHoverCard';
import { RecentlyViewedTracker } from '@/components/hub/RecentlyViewedTracker';
import { SponsoredAdsRail } from '@/components/hub/SponsoredAdsRail';
import { ContactSellerButton } from '@/components/chat/ContactSellerButton';
import { StoreFollowButton } from '@/components/store/StoreFollowButton';
import { ReviewSection } from '@/components/hub/ReviewSection';
import { WishlistButton } from '@/components/hub/WishlistButton';
import { ProductBundleDetails } from '@/components/product/ProductBundleDetails';
import { BundleCrossPromotionWidget } from '@/components/product/BundleCrossPromotionWidget';
import { DeliveryEstimatorWidget } from '@/components/product/DeliveryEstimatorWidget';
import { ProductSocialShare } from '@/components/product/ProductSocialShare';
import { ProductReassuranceBar } from '@/components/product/ProductReassuranceBar';
import { StickyProductCartBar } from '@/components/product/StickyProductCartBar';
import { getMarketplaceThemeClasses } from '@/lib/marketplace-theme';
import { getStorefrontWebsiteHref } from '@/lib/storefront-url';
import { getWholesalePricingFromMetadata } from '@/lib/cart-utils';
import { useLocale } from '@/contexts/LocaleContext';
import { DEFAULT_LOCALE, isValidLocale, type Locale } from '@/i18n/config';
import type { MarketplaceSettings } from '@/lib/marketplace-settings';
import type { SingleProductData, ProductImage } from './ProductDetailV1';

export interface ProductDetailV2Props {
  product: SingleProductData;
  similarProducts: SingleProductData[];
  ratingData: { average_rating: number; review_count: number } | null;
  marketplaceSettings: MarketplaceSettings;
  locale?: Locale | string;
  requestHost?: string | null;
}

function toNumber(price: SingleProductData['price']): number {
  const numericPrice = typeof price === 'number' ? price : Number(price);
  return Number.isFinite(numericPrice) ? numericPrice : 0;
}

function formatPrice(price: SingleProductData['price']): string {
  return `${toNumber(price).toFixed(3)} TND`;
}

function getImageUrl(image?: ProductImage): string | undefined {
  if (!image) return undefined;
  return typeof image === 'string' ? image : image.url;
}

function getCategorySearchHref(product: SingleProductData): string {
  return `/hub/search?category=${encodeURIComponent(product.marketplace_category_slug || product.category || '')}`;
}

export const ProductDetailV2: React.FC<ProductDetailV2Props> = ({
  product,
  similarProducts,
  ratingData,
  marketplaceSettings,
  locale,
  requestHost,
}) => {
  const { t, dir, locale: ctxLocale } = useLocale();
  const effectiveLocale: Locale = isValidLocale(locale) ? locale : isValidLocale(ctxLocale) ? ctxLocale : DEFAULT_LOCALE;
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews' | 'shipping'>('description');
  const [selectedWholesaleQty, setSelectedWholesaleQty] = useState<number | null>(null);

  const classes = getMarketplaceThemeClasses(marketplaceSettings.marketplace_theme);
  const isAliExpress = classes.isAliExpress;
  const accentHex = isAliExpress ? '#ff4747' : '#16C784';
  const accentText = classes.primaryText;
  const accentBgSoft = classes.primarySoft;

  const avgRating = ratingData?.average_rating ?? 0;
  const reviewCount = ratingData?.review_count ?? 0;

  const mainImage = product.thumbnail || getImageUrl(product.images?.[0]);
  const numericPrice = toNumber(product.price);
  const compareAtPriceNum = product.compare_at_price ? Number(product.compare_at_price) : null;
  const isDiscounted = compareAtPriceNum !== null && compareAtPriceNum > numericPrice;
  const savingsAmount = isDiscounted ? (compareAtPriceNum! - numericPrice).toFixed(3) : null;
  const discountPercent = isDiscounted
    ? Math.round(((compareAtPriceNum! - numericPrice) / compareAtPriceNum!) * 100)
    : null;

  const isPhysicalProduct = product.type === 'physical' || !product.type;
  const stockQty = product.inventory_quantity ?? 0;
  const urgencyThreshold = Number(marketplaceSettings.single_product_stock_urgency_threshold || 5);
  const showStockUrgency =
    Boolean(marketplaceSettings.single_product_show_stock_urgency !== false) &&
    isPhysicalProduct &&
    stockQty > 0 &&
    stockQty <= urgencyThreshold;

  const showStickyCart = Boolean(marketplaceSettings.single_product_sticky_cart_bar !== false);
  const showDeliveryEstimator = Boolean(marketplaceSettings.single_product_show_delivery_estimator !== false);
  const showShareButtons = Boolean(marketplaceSettings.single_product_show_share_buttons !== false);
  const showReassurance = Boolean(marketplaceSettings.single_product_show_reassurance !== false);
  const showLiveViews = Boolean(marketplaceSettings.single_product_show_live_views !== false);
  const showContactSeller = Boolean(marketplaceSettings.single_product_show_contact_seller !== false);

  // Deterministic seed for live view count based on product id
  const pseudoLiveViewCount = (product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 15) + 4;

  const storeHref = product.store_subdomain ? `/store/${encodeURIComponent(product.store_subdomain)}` : null;
  const sellerWebsiteHref = getStorefrontWebsiteHref({
    subdomain: product.store_subdomain,
    customDomain: product.store_custom_domain,
    currentHost: requestHost,
  });

  const wholesalePricing =
    product.store_seller_type === 'wholesaler' || product.store_seller_type === 'hybrid'
      ? getWholesalePricingFromMetadata(product.metadata)
      : null;

  return (
    <div dir={dir} data-testid="product-detail-v2" className="space-y-10">
      <RecentlyViewedTracker
        product={{
          id: product.id,
          title: product.title,
          price: numericPrice,
          thumbnail: mainImage || null,
          href: `/hub/products/${encodeURIComponent(product.id)}`,
        }}
      />

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100/80 bg-white/70 px-4 py-2.5 text-xs font-bold text-gray-500 shadow-2xs backdrop-blur-xs dark:border-white/10 dark:bg-white/5"
      >
        <Link href="/hub" className={`hover:text-emerald-700 dark:hover:text-emerald-400 transition ${classes.primaryTextHover}`}>
          Hub
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 rtl:rotate-180" />
        {product.category && (
          <>
            <Link
              href={getCategorySearchHref(product)}
              className={`hover:text-emerald-700 dark:hover:text-emerald-400 transition ${classes.primaryTextHover}`}
            >
              {product.category}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 rtl:rotate-180" />
          </>
        )}
        <span className="text-gray-900 dark:text-white truncate max-w-sm font-semibold">
          {product.title}
        </span>
      </nav>

      {/* 2-Column Asymmetric Modern Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] gap-8 lg:gap-10 items-start">
        {/* Left Column: Visual Gallery & Social Sharing */}
        <div className="space-y-5">
          <div className="rounded-3xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm dark:border-white/10 dark:bg-[#161a22]">
            <ProductGallery
              title={product.title}
              thumbnail={product.thumbnail}
              images={product.images}
              accentColor={accentHex}
              watermarkSettings={marketplaceSettings}
              storeName={product.store_name}
            />
          </div>

          {/* Social Share Bar */}
          {showShareButtons && (
            <ProductSocialShare
              title={product.title}
              price={numericPrice}
            />
          )}

          {/* Sponsored Rail Placement */}
          <SponsoredAdsRail
            placement="product.related"
            title="Recommandations Sponsorisées"
            locale={effectiveLocale}
            category={product.marketplace_category_slug || product.category}
          />
        </div>

        {/* Right Column: Sticky Purchase Hub & Trust Stack */}
        <div className="lg:sticky lg:top-24 space-y-6 rounded-3xl border border-gray-200/80 bg-white/95 p-6 sm:p-8 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#161a22]/95">
          {/* Top Badges & Live Social Proof */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {product.category && (
                <Link
                  href={getCategorySearchHref(product)}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 transition hover:bg-emerald-100"
                >
                  <span>{product.category}</span>
                </Link>
              )}
              {product.type === 'bundle' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  <span>Pack Promo</span>
                </span>
              )}
            </div>

            {/* Live Social Proof Badge */}
            {showLiveViews && (
              <div
                data-testid="live-views-badge"
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 animate-pulse"
              >
                <Flame className="h-3.5 w-3.5 text-rose-600 fill-rose-600" />
                <span>{t('productV2.liveViews', { count: pseudoLiveViewCount })}</span>
              </div>
            )}
          </div>

          {/* Product Title & Reference */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
              {product.title}
            </h1>
            {product.product_reference && (
              <p className="mt-1 text-xs font-semibold text-gray-400 dark:text-gray-400">
                {t('productV2.specs.reference')} : <span className="font-mono">{product.product_reference}</span>
              </p>
            )}
          </div>

          {/* Rating Summary */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(avgRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-200 dark:text-gray-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {avgRating > 0 ? avgRating.toFixed(1) : '5.0'} ({reviewCount} {t('productV2.tabs.reviews', { count: reviewCount })})
            </span>
          </div>

          {/* Price Hero Section with Dynamic Savings Calculation */}
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50/80 via-white to-gray-50/80 p-5 dark:border-white/10 dark:from-white/5 dark:via-white/5 dark:to-transparent">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                  Prix Marketplace
                </span>
                <div className="flex flex-wrap items-baseline gap-3 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatPrice(product.price)}
                  </span>
                  {isDiscounted && (
                    <span className="text-lg font-bold text-gray-400 line-through tabular-nums">
                      {formatPrice(product.compare_at_price!)}
                    </span>
                  )}
                </div>
              </div>

              {/* Savings & Discount Pill */}
              {isDiscounted && (
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white shadow-xs">
                    {t('productV2.discountOff', { pct: discountPercent! })}
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {t('productV2.saveAmount', { amount: savingsAmount! })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stock Urgency Meter */}
          {showStockUrgency && (
            <div
              data-testid="stock-urgency-meter"
              className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 space-y-2 dark:border-rose-900/40 dark:bg-rose-950/20"
            >
              <div className="flex items-center justify-between text-xs font-black text-rose-800 dark:text-rose-300">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-rose-600 fill-rose-600 animate-bounce" />
                  {t('productV2.lowStockUrgency', { count: stockQty })}
                </span>
                <span>{stockQty} / {urgencyThreshold}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-rose-200/80 dark:bg-rose-950/60">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, (stockQty / urgencyThreshold) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Wholesaler Interactive Pricing Calculator */}
          {wholesalePricing && wholesalePricing.price_tiers && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                  {t('productV2.wholesale.title')}
                </h4>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  {t('productV2.wholesale.minQuantity', { qty: wholesalePricing.min_quantity ?? 1 })}
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400">
                {t('productV2.wholesale.subtitle')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {wholesalePricing.price_tiers.map((tier) => (
                  <button
                    key={tier.min_quantity}
                    type="button"
                    onClick={() => setSelectedWholesaleQty(tier.min_quantity)}
                    className={`flex flex-col items-start rounded-xl p-2.5 text-start transition border ${
                      selectedWholesaleQty === tier.min_quantity
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-emerald-200 bg-white text-gray-800 hover:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase opacity-80">
                      {t('productV2.wholesale.buyBatch', { qty: tier.min_quantity })}
                    </span>
                    <span className="text-xs font-black tabular-nums mt-0.5">
                      {Number(tier.unit_price).toFixed(3)} TND
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bundle Content Breakdown (if pack product) */}
          {product.type === 'bundle' && product.bundle_items && product.bundle_items.length > 0 && (
            <ProductBundleDetails
              bundleItems={product.bundle_items}
              price={numericPrice}
              compareAtPrice={compareAtPriceNum}
              bundlePricingType={product.bundle_pricing_type}
              bundleDiscountValue={product.bundle_discount_value}
              storeSubdomain={product.store_subdomain}
            />
          )}

          {/* Tunisian Governorate Delivery Estimator */}
          {showDeliveryEstimator && (
            <DeliveryEstimatorWidget
              freeShippingEligible={numericPrice >= 100}
            />
          )}

          {/* Seller / Store Identity Card */}
          {product.store_name && (
            <div className="rounded-2xl border border-gray-200/80 bg-gray-50/70 p-4 space-y-3 dark:border-white/10 dark:bg-white/5">
              <SellerHoverCard
                name={product.store_name}
                href={storeHref}
                websiteHref={sellerWebsiteHref}
                isVerified={product.store_is_verified}
                sellerType={product.store_seller_type}
                status={product.store_status}
                createdAt={product.store_created_at}
                productCount={product.store_product_count}
                settings={product.store_settings}
                storeId={product.store_id}
                accentColor={accentHex}
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {showContactSeller && (
                  <ContactSellerButton
                    storeId={product.store_id}
                    productId={product.id}
                    subject={product.title}
                    isAliExpress={isAliExpress}
                  />
                )}
                <StoreFollowButton
                  storeId={product.store_id}
                  storeName={product.store_name}
                  variant="action_bar"
                  size="md"
                />
              </div>
            </div>
          )}

          {/* Variant Purchase Panel (Swatches, Quantity, Add to Cart, Buy Now) */}
          <div id="main-add-to-cart-btn" className="space-y-3">
            <ProductVariantPurchasePanel
              productId={product.id}
              title={product.title}
              slug={product.slug}
              category={product.category}
              marketplaceCategorySlug={product.marketplace_category_slug}
              basePrice={numericPrice}
              sellerType={product.store_seller_type}
              wholesalePricing={wholesalePricing}
              storeId={product.store_id}
              storeName={product.store_name || 'Store'}
              storeSubdomain={product.store_subdomain}
              productType={product.type}
              imageUrl={mainImage || null}
              inventoryQuantity={product.inventory_quantity}
              variants={product.variants}
              isAliExpress={isAliExpress}
            />
            <WishlistButton productId={product.id} size="md" />
          </div>

          {/* 4 Frosted-Glass Reassurance Cards */}
          {showReassurance && (
            <ProductReassuranceBar
              customItemsJson={marketplaceSettings.single_product_reassurance_items}
            />
          )}
        </div>
      </div>

      {/* Tabbed Content Navigation (Description, Specs, Reviews, Shipping) */}
      <section className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-white/10 dark:bg-[#161a22]">
        {/* Tab Buttons */}
        <div
          role="tablist"
          aria-label="Informations produit"
          className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4 dark:border-white/10"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'description'}
            onClick={() => setActiveTab('description')}
            data-testid="tab-btn-description"
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-black transition-all ${
              activeTab === 'description'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20 scale-[1.02]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{t('productV2.tabs.description')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'specs'}
            onClick={() => setActiveTab('specs')}
            data-testid="tab-btn-specs"
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-black transition-all ${
              activeTab === 'specs'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20 scale-[1.02]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>{t('productV2.tabs.specs')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reviews'}
            onClick={() => setActiveTab('reviews')}
            data-testid="tab-btn-reviews"
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-black transition-all ${
              activeTab === 'reviews'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20 scale-[1.02]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
            }`}
          >
            <Star className="h-4 w-4" />
            <span>{t('productV2.tabs.reviews', { count: reviewCount })}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'shipping'}
            onClick={() => setActiveTab('shipping')}
            data-testid="tab-btn-shipping"
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-black transition-all ${
              activeTab === 'shipping'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20 scale-[1.02]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>{t('productV2.tabs.shipping')}</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="pt-6">
          {/* Tab 1: Description */}
          {activeTab === 'description' && (
            <div role="tabpanel" data-testid="panel-description" className="space-y-4 animate-fadeIn">
              <ProductDescriptionRenderer value={product.description} />
            </div>
          )}

          {/* Tab 2: Technical Specifications */}
          {activeTab === 'specs' && (
            <div role="tabpanel" data-testid="panel-specs" className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    {t('productV2.specs.brand')}
                  </span>
                  <p className="mt-1 font-black text-gray-900 dark:text-white">
                    {product.store_name || 'Panda Store'}
                  </p>
                </div>
                {product.category && (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="block text-xs font-bold uppercase text-gray-400">
                      {t('productV2.specs.category')}
                    </span>
                    <p className="mt-1 font-black text-gray-900 dark:text-white">
                      {product.category}
                    </p>
                  </div>
                )}
                {product.product_reference && (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="block text-xs font-bold uppercase text-gray-400">
                      {t('productV2.specs.reference')}
                    </span>
                    <p className="mt-1 font-black text-gray-900 dark:text-white font-mono">
                      {product.product_reference}
                    </p>
                  </div>
                )}
                {product.attributes?.map((attr) => (
                  <div
                    key={`${attr.name}-${attr.value}`}
                    className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <span className="block text-xs font-bold uppercase text-gray-400">{attr.name}</span>
                    <p className="mt-1 font-black text-gray-900 dark:text-white">{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Customer Reviews */}
          {activeTab === 'reviews' && (
            <div role="tabpanel" data-testid="panel-reviews" className="animate-fadeIn">
              <ReviewSection productId={product.id} marketplaceTheme={marketplaceSettings.marketplace_theme} />
            </div>
          )}

          {/* Tab 4: Shipping & Returns FAQ */}
          {activeTab === 'shipping' && (
            <div role="tabpanel" data-testid="panel-shipping" className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-2 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-400">
                    <Truck className="h-4 w-4" />
                    <span>Délais de livraison</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t('productV2.shippingTab.domesticDelivery')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t('productV2.shippingTab.regionalDelivery')}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-2 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-400">
                    <RotateCcw className="h-4 w-4" />
                    <span>Paiements & Retours</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t('productV2.shippingTab.paymentMethods')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t('productV2.shippingTab.returnPolicy')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Cross-Sell Bundle Widget */}
      {product.type !== 'bundle' && (
        <BundleCrossPromotionWidget
          productId={product.id}
          storeSubdomain={product.store_subdomain}
          storeId={product.store_id}
        />
      )}

      {/* Similar Products Recommendation Rail */}
      {similarProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                {t('productV2.crossSell.similarProducts')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Découvrez des articles similaires sélectionnés pour vous.
              </p>
            </div>
            {product.category && (
              <Link
                href={getCategorySearchHref(product)}
                className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 transition"
              >
                <span>{t('productV2.crossSell.viewAllCategory')}</span>
                <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
            {similarProducts.map((p) => (
              <Link
                key={p.id}
                href={getHubProductHref(p)}
                className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-3 shadow-xs hover:shadow-lg transition-all duration-300 dark:border-white/10 dark:bg-[#161a22]"
              >
                <div className="aspect-square relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-white/5 mb-3">
                  {p.category && (
                    <span className="absolute start-2.5 top-2.5 z-10 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-black text-gray-800 shadow-xs dark:bg-[#161a22]/90 dark:text-white">
                      {p.category}
                    </span>
                  )}
                  {getImageUrl(p.images?.[0]) || p.thumbnail ? (
                    <div
                      role="img"
                      aria-label={p.title}
                      className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${getImageUrl(p.images?.[0]) || p.thumbnail})` }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold">
                      🛍️
                    </div>
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white line-clamp-2 group-hover:text-emerald-600 transition">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatPrice(p.price)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Floating Sticky Add-to-Cart Bar */}
      {showStickyCart && (
        <StickyProductCartBar
          title={product.title}
          price={numericPrice}
          compareAtPrice={compareAtPriceNum}
          thumbnail={mainImage}
          inStock={isPhysicalProduct ? stockQty > 0 : true}
          targetTriggerId="main-add-to-cart-btn"
        />
      )}
    </div>
  );
};
