'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Zap,
  Sparkles,
  ChevronRight,
  ChevronDown,
  FileText,
  Sliders,
  RotateCcw,
  Truck,
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

export type ProductImage = string | { id?: string; url: string; position?: number };

export interface ProductVariant {
  id: string;
  sku?: string | null;
  title: string;
  price: number | string;
  inventory_quantity?: number | null;
  options?: Record<string, string> | null;
}

export interface SingleProductData {
  id: string;
  type?: string | null;
  title: string;
  slug?: string | null;
  description?: string;
  price: number | string;
  compare_at_price?: number | string | null;
  category?: string;
  product_reference?: string | null;
  marketplace_category_slug?: string | null;
  images?: ProductImage[];
  thumbnail?: string;
  tags?: string[];
  attributes?: { name: string; value: string }[];
  metadata?: Record<string, unknown> | null;
  wholesale_pricing?: any;
  inventory_quantity?: number;
  store_id: string;
  store_name?: string;
  store_subdomain?: string | null;
  store_custom_domain?: string | null;
  store_is_verified?: boolean | null;
  store_seller_type?: string | null;
  store_status?: string | null;
  store_settings?: Record<string, unknown> | null;
  store_created_at?: string | null;
  store_product_count?: string | number | null;
  variants?: ProductVariant[];
  bundle_pricing_type?: 'fixed' | 'percentage' | null;
  bundle_discount_value?: number | null;
  bundle_items?: any[];
  status: string;
}

export interface ProductDetailProps {
  product: SingleProductData;
  similarProducts: SingleProductData[];
  ratingData: { average_rating: number; review_count: number } | null;
  marketplaceSettings: MarketplaceSettings;
  locale: string;
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

function formatProductType(type?: string | null): string {
  if (!type || type === 'physical') return 'Physique';
  if (type === 'digital') return 'Numérique';
  if (type === 'bundle') return 'Pack Promo / Lot';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const ProductDetailV1: React.FC<ProductDetailProps> = ({
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
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    description: true,
    specs: true,
    reviews: false,
    shipping: false,
  });
  const [selectedWholesaleQty, setSelectedWholesaleQty] = useState<number | null>(null);

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const classes = getMarketplaceThemeClasses(marketplaceSettings.marketplace_theme);
  const isAliExpress = classes.isAliExpress;
  const accentHex = isAliExpress ? '#ff4747' : '#16C784';
  const accentText = classes.primaryText;
  const accentBgSoft = classes.primarySoft;
  const accentTextSoft = classes.primaryText;
  const cardClass = isAliExpress
    ? 'rounded-[2rem] border border-orange-100/80 bg-white shadow-xl shadow-orange-900/5'
    : 'rounded-[2rem] border border-gray-100 bg-white shadow-sm';
  const microCardClass = isAliExpress
    ? 'rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4'
    : 'rounded-2xl border border-gray-100 bg-gray-50 p-4';

  // Defensive coercion: rating API may return numerics as strings (pg driver),
  // and `avgRating.toFixed()` would crash SSR otherwise.
  const parsedAvgRating = Number(ratingData?.average_rating ?? 0);
  const avgRating = Number.isFinite(parsedAvgRating) ? parsedAvgRating : 0;
  const parsedReviewCount = Number(ratingData?.review_count ?? 0);
  const reviewCount = Number.isFinite(parsedReviewCount) ? parsedReviewCount : 0;

  const mainImage = product.thumbnail || getImageUrl(product.images?.[0]);
  const numericPrice = toNumber(product.price);
  const compareAtPriceNum = product.compare_at_price ? Number(product.compare_at_price) : null;
  const isDiscounted = compareAtPriceNum !== null && compareAtPriceNum > numericPrice;
  const savingsAmount = isDiscounted ? (compareAtPriceNum! - numericPrice).toFixed(3) : null;
  const discountPercent = isDiscounted
    ? Math.round(((compareAtPriceNum! - numericPrice) / compareAtPriceNum!) * 100)
    : null;

  const isPhysicalProduct = product.type === 'physical' || !product.type;
  const stockQty =
    typeof product.inventory_quantity === 'number'
      ? product.inventory_quantity
      : product.inventory_quantity !== undefined && product.inventory_quantity !== null && product.inventory_quantity !== ''
      ? Number(product.inventory_quantity)
      : null;

  const urgencyThreshold = Number(marketplaceSettings.single_product_stock_urgency_threshold || 5);
  const showStockUrgencySetting =
    marketplaceSettings.single_product_show_stock_urgency === true ||
    marketplaceSettings.single_product_show_stock_urgency === 'true' ||
    marketplaceSettings.single_product_show_stock_urgency === undefined;
  const showStockUrgency =
    showStockUrgencySetting &&
    isPhysicalProduct &&
    stockQty !== null &&
    stockQty > 0 &&
    stockQty <= urgencyThreshold;

  const showStickyCart =
    marketplaceSettings.single_product_sticky_cart_bar === true ||
    marketplaceSettings.single_product_sticky_cart_bar === 'true' ||
    marketplaceSettings.single_product_sticky_cart_bar === undefined;
  const showDeliveryEstimator =
    marketplaceSettings.single_product_show_delivery_estimator === true ||
    marketplaceSettings.single_product_show_delivery_estimator === 'true' ||
    marketplaceSettings.single_product_show_delivery_estimator === undefined;
  const showShareButtons =
    marketplaceSettings.single_product_show_share_buttons === true ||
    marketplaceSettings.single_product_show_share_buttons === 'true' ||
    marketplaceSettings.single_product_show_share_buttons === undefined;
  const showReassurance =
    marketplaceSettings.single_product_show_reassurance === true ||
    marketplaceSettings.single_product_show_reassurance === 'true' ||
    marketplaceSettings.single_product_show_reassurance === undefined;
  const showLiveViews =
    marketplaceSettings.single_product_show_live_views === true ||
    marketplaceSettings.single_product_show_live_views === 'true' ||
    marketplaceSettings.single_product_show_live_views === undefined;
  const showContactSeller =
    marketplaceSettings.single_product_show_contact_seller === true ||
    marketplaceSettings.single_product_show_contact_seller === 'true' ||
    marketplaceSettings.single_product_show_contact_seller === undefined;
  const showWholesaleCalculatorSetting =
    marketplaceSettings.single_product_show_wholesale_calculator === true ||
    marketplaceSettings.single_product_show_wholesale_calculator === 'true' ||
    marketplaceSettings.single_product_show_wholesale_calculator === undefined;

  const detailsLayout = marketplaceSettings.single_product_details_layout || 'tabs';
  const sellerCardStyle = marketplaceSettings.single_product_seller_card_style || 'rich_banner';
  const crossSellPosition = marketplaceSettings.single_product_cross_sell_position || 'bottom';

  // Deterministic seed for live view count based on product id
  const pseudoLiveViewCount = (product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 15) + 4;

  const storeHref = product.store_subdomain ? `/store/${encodeURIComponent(product.store_subdomain)}` : null;
  const sellerWebsiteHref = getStorefrontWebsiteHref({
    subdomain: product.store_subdomain,
    customDomain: product.store_custom_domain,
    currentHost: requestHost,
  });

  const parsedWholesalePricing =
    getWholesalePricingFromMetadata(product.metadata) ||
    getWholesalePricingFromMetadata(product.wholesale_pricing);
  const wholesalePricing = showWholesaleCalculatorSetting ? parsedWholesalePricing : null;

  const minRequiredQty = wholesalePricing?.min_quantity || 1;
  const inStock = isPhysicalProduct
    ? stockQty === null
      ? true
      : stockQty >= (product.store_seller_type === 'wholesaler' ? minRequiredQty : 1)
    : true;

  return (
    <div dir={dir} data-testid="product-detail-v1" className="space-y-10">
      <RecentlyViewedTracker
        product={{
          id: product.id,
          title: product.title,
          price: toNumber(product.price),
          thumbnail: mainImage || null,
          href: `/hub/products/${encodeURIComponent(product.id)}`,
        }}
      />

      {/* Breadcrumb Navigation */}
      <nav
        className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm ${
          isAliExpress
            ? 'border border-orange-100 bg-white/80 text-gray-500 shadow-sm shadow-orange-900/5'
            : 'text-gray-500'
        }`}
      >
        <Link href="/hub" className={`font-bold transition-colors ${classes.primaryTextHover}`}>
          Hub
        </Link>
        <ChevronRight className="w-4 h-4" />
        {product.category && (
          <>
            <Link
              href={getCategorySearchHref(product)}
              className={`font-bold transition-colors ${classes.primaryTextHover}`}
            >
              {product.category}
            </Link>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
        <span className="text-gray-900 font-medium truncate max-w-xs">{product.title}</span>
      </nav>

      <SponsoredAdsRail
        placement="product.related"
        title="Sponsored recommendations"
        locale={effectiveLocale}
        category={product.marketplace_category_slug || product.category}
      />

      {/* Product Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-8">
        {/* Gallery Column */}
        <div className={`lg:sticky lg:top-24 self-start ${isAliExpress ? 'rounded-[2rem] bg-white p-3 shadow-xl shadow-orange-900/5' : ''}`}>
          <ProductGallery
            title={product.title}
            thumbnail={product.thumbnail}
            images={product.images}
            accentColor={accentHex}
            watermarkSettings={marketplaceSettings}
            storeName={product.store_name}
          />
        </div>

        {/* Product Info Column */}
        <div className={`h-fit p-6 sm:p-8 ${cardClass} space-y-5`}>
          {/* Top Badges: Category, Product Type, SKU Ref, Live Views */}
          <div className="flex flex-wrap items-center gap-2">
            {product.category && (
              <Link
                href={getCategorySearchHref(product)}
                className={`rounded-full ${accentBgSoft} px-3 py-1 text-xs font-bold ${accentTextSoft}`}
              >
                {product.category}
              </Link>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                isAliExpress ? 'bg-[#fff1e8] text-[#7a2d11]' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {formatProductType(product.type)}
            </span>
            {product.product_reference && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 font-mono">
                Ref: {product.product_reference}
              </span>
            )}
            {product.status && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                {product.status}
              </span>
            )}
            {showLiveViews && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-black text-orange-600">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
                {t('productV2.liveViews', { count: pseudoLiveViewCount })}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-black text-gray-900 leading-snug">
            {product.title}
          </h1>

          {/* Rating */}
          <div
            className={`inline-flex flex-wrap items-center gap-2 rounded-full px-3 py-2 ${
              isAliExpress ? 'bg-orange-50 text-[#7a2d11]' : 'bg-gray-50 text-gray-600'
            }`}
          >
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs sm:text-sm font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : '5.0'} ({reviewCount} avis)
            </span>
          </div>

          {/* Price Hero Card with Upper-Right Discount Badge */}
          <div
            className={`relative overflow-hidden rounded-[1.75rem] ${
              isAliExpress
                ? 'border border-orange-100 bg-gradient-to-br from-[#fff7f2] via-white to-white'
                : 'border border-gray-100 bg-gray-50'
            } p-5`}
          >
            {/* Discount Percentage Badge in Upper Right Corner */}
            {isDiscounted && discountPercent !== null && (
              <div className="absolute top-4 end-4 flex flex-col items-end gap-1">
                <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white shadow-xs">
                  {t('productV2.discountOff', { pct: discountPercent })}
                </span>
                {savingsAmount && (
                  <span className="text-[11px] font-black text-emerald-700">
                    {t('productV2.saveAmount', { amount: savingsAmount })}
                  </span>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                {t('productV2.marketplacePrice')}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <p className={`text-2xl sm:text-3xl font-black tabular-nums ${accentText}`}>
                  {formatPrice(product.price)}
                </p>
                {isDiscounted && (
                  <p className="text-base sm:text-lg font-bold text-gray-400 line-through tabular-nums">
                    {formatPrice(product.compare_at_price!)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stock Urgency Meter & Low Stock Alert */}
          {showStockUrgency && stockQty !== null && (
            <div
              data-testid="stock-urgency-meter"
              className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-black text-red-700">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 fill-red-600 text-red-600 animate-bounce" />
                  {t('productV2.lowStockUrgency', { count: stockQty })}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold">
                  {stockQty} / {urgencyThreshold}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-red-200/60">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, (stockQty / urgencyThreshold) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Interactive Wholesale Pricing Calculator (Zero Mock Data) */}
          {wholesalePricing && wholesalePricing.price_tiers && (
            <div
              data-testid="wholesale-calculator-card"
              className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  <h4 className="text-xs font-black text-emerald-900">
                    {t('productV2.wholesale.title')}
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-700">
                  {t('productV2.wholesale.minQuantity', { qty: wholesalePricing.min_quantity ?? 1 })}
                </span>
              </div>
              <p className="text-[11px] text-gray-600">
                {t('productV2.wholesale.subtitle')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {wholesalePricing.price_tiers.map((tier) => {
                  const isInsufficientStock =
                    isPhysicalProduct &&
                    stockQty !== null &&
                    stockQty < tier.min_quantity;
                  const isSelected = selectedWholesaleQty === tier.min_quantity;
                  const tooltipText = t('productV2.wholesale.lowStockTierTooltip', {
                    available: stockQty ?? 0,
                    required: tier.min_quantity,
                  });

                  return (
                    <div key={tier.min_quantity} className="relative group">
                      <button
                        type="button"
                        disabled={isInsufficientStock}
                        onClick={() => {
                          if (!isInsufficientStock) {
                            setSelectedWholesaleQty(tier.min_quantity);
                          }
                        }}
                        title={isInsufficientStock ? tooltipText : undefined}
                        className={`w-full flex flex-col items-start rounded-xl p-2.5 text-start transition border ${
                          isInsufficientStock
                            ? 'cursor-not-allowed opacity-50 border-gray-200 bg-gray-100 text-gray-400'
                            : isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20'
                            : 'border-emerald-200 bg-white text-gray-800 hover:border-emerald-400'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-black uppercase opacity-80">
                            {t('productV2.wholesale.buyBatch', { qty: tier.min_quantity })}
                          </span>
                          {isInsufficientStock && (
                            <span className="text-[9px] font-bold text-rose-600">
                              {t('productV2.wholesale.outOfStockTier')}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-black tabular-nums mt-0.5 ${
                            isInsufficientStock ? 'text-gray-400' : isSelected ? 'text-white' : 'text-emerald-700'
                          }`}
                        >
                          {Number(tier.unit_price).toFixed(3)} TND
                        </span>
                      </button>
                      {isInsufficientStock && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-xl">
                          {tooltipText}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pack / Bundle Content Breakdown */}
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

          {/* Delivery Estimator Widget (Tunisia 24 Governorates) */}
          {showDeliveryEstimator && (
            <DeliveryEstimatorWidget freeShippingEligible={numericPrice >= 100} />
          )}

          {/* Seller / Store Hover Card */}
          {sellerCardStyle !== 'hidden' && product.store_name && (
            <div className={`space-y-3 rounded-2xl border p-4 ${isAliExpress ? 'border-orange-100 bg-orange-50/50' : 'border-gray-100 bg-gray-50/70'}`}>
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
                  showVerifiedBadge={false}
                />
              </div>
            </div>
          )}

          {/* Main Purchase Panel (Quantity, Swatches, Add to Cart, WhatsApp Order) */}
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
              storePhone={typeof (product.store_settings as any)?.phone === 'string' ? (product.store_settings as any).phone : null}
              productType={product.type}
              imageUrl={mainImage || null}
              inventoryQuantity={product.inventory_quantity}
              variants={product.variants}
              isAliExpress={isAliExpress}
              selectedQuantity={selectedWholesaleQty || undefined}
              onQuantityChange={(qty) => setSelectedWholesaleQty(qty)}
            />
          </div>

          {/* Dynamic Reassurance & Trust Cards (from Admin Reassurance Builder) */}
          {showReassurance && (
            <ProductReassuranceBar
              customItemsJson={marketplaceSettings.single_product_reassurance_items}
            />
          )}

          {/* Social Share Buttons */}
          {showShareButtons && (
            <div className="pt-2">
              <ProductSocialShare
                title={product.title}
                price={numericPrice}
                currency="TND"
              />
            </div>
          )}

          {/* Cross-Sell in Sidebar if configured */}
          {(crossSellPosition === 'sidebar' || crossSellPosition === 'both') && similarProducts.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                {t('productV2.crossSell.similarProducts')}
              </h4>
              <div className="space-y-2">
                {similarProducts.slice(0, 3).map((sp) => (
                  <Link
                    key={sp.id}
                    href={getHubProductHref(sp)}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                      {getImageUrl(sp.images?.[0]) || sp.thumbnail ? (
                        <img
                          src={getImageUrl(sp.images?.[0]) || sp.thumbnail || ''}
                          alt={sp.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Panda</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-gray-900 truncate">{sp.title}</p>
                      <p className={`text-xs font-black ${accentText}`}>{formatPrice(sp.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Details: Tabs, Accordion, or Stacked */}
      <section className={`p-6 sm:p-8 ${cardClass}`}>
        {detailsLayout === 'accordion' ? (
          /* ACCORDION LAYOUT */
          <div className="space-y-3">
            {/* Accordion 1: Description */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleAccordion('description')}
                className="w-full flex items-center justify-between p-4 font-black text-sm bg-gray-50/70 hover:bg-gray-100/70 transition"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  {t('productV2.tabs.description')}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openAccordions.description ? 'rotate-180' : ''}`} />
              </button>
              {openAccordions.description && (
                <div className="p-5 border-t border-gray-100">
                  <ProductDescriptionRenderer value={product.description} />
                </div>
              )}
            </div>

            {/* Accordion 2: Specs */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleAccordion('specs')}
                className="w-full flex items-center justify-between p-4 font-black text-sm bg-gray-50/70 hover:bg-gray-100/70 transition"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-600" />
                  {t('productV2.tabs.specs')}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openAccordions.specs ? 'rotate-180' : ''}`} />
              </button>
              {openAccordions.specs && (
                <div className="p-5 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                      <span className="block text-xs font-bold uppercase text-gray-400">{t('productV2.specs.brand')}</span>
                      <p className="mt-1 font-black text-gray-900">{product.store_name || 'Panda Store'}</p>
                    </div>
                    {product.category && (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <span className="block text-xs font-bold uppercase text-gray-400">{t('productV2.specs.category')}</span>
                        <p className="mt-1 font-black text-gray-900">{product.category}</p>
                      </div>
                    )}
                    {product.product_reference && (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <span className="block text-xs font-bold uppercase text-gray-400">{t('productV2.specs.reference')}</span>
                        <p className="mt-1 font-black text-gray-900 font-mono">{product.product_reference}</p>
                      </div>
                    )}
                    {product.attributes?.map((attr) => (
                      <div key={`${attr.name}-${attr.value}`} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <span className="block text-xs font-bold uppercase text-gray-400">{attr.name}</span>
                        <p className="mt-1 font-black text-gray-900">{attr.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Reviews */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleAccordion('reviews')}
                className="w-full flex items-center justify-between p-4 font-black text-sm bg-gray-50/70 hover:bg-gray-100/70 transition"
              >
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-emerald-600" />
                  {t('productV2.tabs.reviews', { count: reviewCount })}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openAccordions.reviews ? 'rotate-180' : ''}`} />
              </button>
              {openAccordions.reviews && (
                <div className="p-5 border-t border-gray-100">
                  <ReviewSection productId={product.id} marketplaceTheme={marketplaceSettings.marketplace_theme} />
                </div>
              )}
            </div>

            {/* Accordion 4: Shipping */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleAccordion('shipping')}
                className="w-full flex items-center justify-between p-4 font-black text-sm bg-gray-50/70 hover:bg-gray-100/70 transition"
              >
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  {t('productV2.tabs.shipping')}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openAccordions.shipping ? 'rotate-180' : ''}`} />
              </button>
              {openAccordions.shipping && (
                <div className="p-5 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                        <Truck className="h-4 w-4" />
                        <span>{t('productV2.deliveryTimelineTitle')}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('productV2.shippingTab.domesticDelivery')}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('productV2.shippingTab.regionalDelivery')}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                        <RotateCcw className="h-4 w-4" />
                        <span>{t('productV2.paymentAndReturnsTitle')}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('productV2.shippingTab.paymentMethods')}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('productV2.shippingTab.returnPolicy')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : detailsLayout === 'stacked' ? (
          /* STACKED SECTIONS LAYOUT */
          <div className="space-y-10">
            {/* Section 1: Description */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-base font-black text-gray-900">
                <FileText className="h-5 w-5 text-emerald-600" />
                {t('productV2.tabs.description')}
              </h3>
              <div className="p-1">
                <ProductDescriptionRenderer value={product.description} />
              </div>
            </div>

            {/* Section 2: Specs */}
            <div className="space-y-3 pt-6 border-t border-gray-100">
              <h3 className="flex items-center gap-2 text-base font-black text-gray-900">
                <Sliders className="h-5 w-5 text-emerald-600" />
                {t('productV2.tabs.specs')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <span className="block text-xs font-bold uppercase text-gray-400">{t('productV2.specs.brand')}</span>
                  <p className="mt-1 font-black text-gray-900">{product.store_name || 'Panda Store'}</p>
                </div>
                {product.category && (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                    <span className="block text-xs font-bold uppercase text-gray-400">{t('productV2.specs.category')}</span>
                    <p className="mt-1 font-black text-gray-900">{product.category}</p>
                  </div>
                )}
                {product.product_reference && (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                    <span className="block text-xs font-bold uppercase text-gray-400">{t('productV2.specs.reference')}</span>
                    <p className="mt-1 font-black text-gray-900 font-mono">{product.product_reference}</p>
                  </div>
                )}
                {product.attributes?.map((attr) => (
                  <div key={`${attr.name}-${attr.value}`} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                    <span className="block text-xs font-bold uppercase text-gray-400">{attr.name}</span>
                    <p className="mt-1 font-black text-gray-900">{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Reviews */}
            <div className="space-y-4 pt-6 border-t border-gray-100">
              <h3 className="flex items-center gap-2 text-base font-black text-gray-900">
                <Star className="h-5 w-5 text-emerald-600" />
                {t('productV2.tabs.reviews', { count: reviewCount })}
              </h3>
              <ReviewSection productId={product.id} marketplaceTheme={marketplaceSettings.marketplace_theme} />
            </div>

            {/* Section 4: Shipping */}
            <div className="space-y-4 pt-6 border-t border-gray-100">
              <h3 className="flex items-center gap-2 text-base font-black text-gray-900">
                <Truck className="h-5 w-5 text-emerald-600" />
                {t('productV2.tabs.shipping')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                    <Truck className="h-4 w-4" />
                    <span>{t('productV2.deliveryTimelineTitle')}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{t('productV2.shippingTab.domesticDelivery')}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{t('productV2.shippingTab.regionalDelivery')}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                    <RotateCcw className="h-4 w-4" />
                    <span>{t('productV2.paymentAndReturnsTitle')}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{t('productV2.shippingTab.paymentMethods')}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{t('productV2.shippingTab.returnPolicy')}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TABS LAYOUT (DEFAULT) */
          <>
            {/* Tab Navigation Buttons */}
            <div role="tablist" className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'description'}
                onClick={() => setActiveTab('description')}
                data-testid="tab-btn-description"
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-black transition-all ${
                  activeTab === 'description'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20 scale-[1.02]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Truck className="h-4 w-4" />
                <span>{t('productV2.tabs.shipping')}</span>
              </button>
            </div>

            {/* Tab Content Panels */}
            <div className="pt-6">
              {activeTab === 'description' && (
                <div role="tabpanel" data-testid="panel-description" className="space-y-4 animate-fadeIn">
                  <ProductDescriptionRenderer value={product.description} />
                </div>
              )}

              {activeTab === 'specs' && (
                <div role="tabpanel" data-testid="panel-specs" className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                      <span className="block text-xs font-bold uppercase text-gray-400">
                        {t('productV2.specs.brand')}
                      </span>
                      <p className="mt-1 font-black text-gray-900">
                        {product.store_name || 'Panda Store'}
                      </p>
                    </div>
                    {product.category && (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <span className="block text-xs font-bold uppercase text-gray-400">
                          {t('productV2.specs.category')}
                        </span>
                        <p className="mt-1 font-black text-gray-900">
                          {product.category}
                        </p>
                      </div>
                    )}
                    {product.product_reference && (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <span className="block text-xs font-bold uppercase text-gray-400">
                          {t('productV2.specs.reference')}
                        </span>
                        <p className="mt-1 font-black text-gray-900 font-mono">
                          {product.product_reference}
                        </p>
                      </div>
                    )}
                    {product.attributes?.map((attr) => (
                      <div
                        key={`${attr.name}-${attr.value}`}
                        className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
                      >
                        <span className="block text-xs font-bold uppercase text-gray-400">
                          {attr.name}
                        </span>
                        <p className="mt-1 font-black text-gray-900">{attr.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div role="tabpanel" data-testid="panel-reviews" className="space-y-6 animate-fadeIn">
                  <ReviewSection productId={product.id} marketplaceTheme={marketplaceSettings.marketplace_theme} />
                </div>
              )}

              {activeTab === 'shipping' && (
                <div role="tabpanel" data-testid="panel-shipping" className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                        <Truck className="h-4 w-4" />
                        <span>{t('productV2.deliveryTimelineTitle')}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {t('productV2.shippingTab.domesticDelivery')}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {t('productV2.shippingTab.regionalDelivery')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                        <RotateCcw className="h-4 w-4" />
                        <span>{t('productV2.paymentAndReturnsTitle')}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {t('productV2.shippingTab.paymentMethods')}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {t('productV2.shippingTab.returnPolicy')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Bundle Cross Promotion Widget */}
      {product.type !== 'bundle' && (
        <BundleCrossPromotionWidget
          productId={product.id}
          storeSubdomain={product.store_subdomain}
          storeId={product.store_id}
        />
      )}

      {/* Similar Products Recommendation Rail (at bottom if configured) */}
      {(crossSellPosition === 'bottom' || crossSellPosition === 'both') && similarProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                {t('productV2.crossSell.similarProducts')}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {t('productV2.similarSubtitle')}
              </p>
            </div>
            {product.category && (
              <Link
                href={getCategorySearchHref(product)}
                className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-600 transition"
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
                className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-3 shadow-xs hover:shadow-lg transition-all duration-300"
              >
                <div className="aspect-square relative overflow-hidden rounded-2xl bg-gray-50 mb-3">
                  {p.category && (
                    <span className="absolute start-2.5 top-2.5 z-10 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-black text-gray-800 shadow-xs">
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
                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                      PandaMarket
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between space-y-2">
                  <h3 className="line-clamp-2 text-xs sm:text-sm font-black text-gray-900 group-hover:text-emerald-600 transition">
                    {p.title}
                  </h3>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs sm:text-sm font-black text-emerald-700 tabular-nums">
                      {formatPrice(p.price)}
                    </span>
                    {p.compare_at_price && Number(p.compare_at_price) > toNumber(p.price) && (
                      <span className="text-[10px] text-gray-400 line-through">
                        {formatPrice(p.compare_at_price)}
                      </span>
                    )}
                  </div>
                </div>
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
          thumbnail={mainImage || null}
          inStock={inStock}
        />
      )}
    </div>
  );
};

