const fs = require('fs');

let content = fs.readFileSync('src/components/hub/AliExpress2HomeContent.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { HubProductPagination } from './HubProductPagination';",
  `import { HubProductPagination } from './HubProductPagination';
import { useLocale } from '../../contexts/LocaleContext';
import { resolveHomeBlocks } from '../../lib/home-blocks';
import { BlockBanner, RecentlyViewedRail, isRtlLocale } from './home-template-shared';`
);

// 2. Component signature and setup
content = content.replace(
  "export function AliExpress2HomeContent({ trendingProducts, categories, marketplaceSettings }: AliExpress2HomeContentProps) {",
  `const MIDDLE_BLOCK_IDS = ['flash_deals', 'category_tiles', 'promo_bar', 'recommended', 'recently_viewed'];

export function AliExpress2HomeContent({ trendingProducts, categories, marketplaceSettings }: AliExpress2HomeContentProps) {
  const { t, locale } = useLocale();
  const dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  const { blocks, blockById, blockLimit } = resolveHomeBlocks(marketplaceSettings?.hub_homepage_blocks);
  const blockTitle = (id: string, defaultTitle: string) => blockById.get(id)?.title || defaultTitle;
`
);

// 3. Update block limits
content = content.replace(/const heroCategories = publicCategories\.slice\(0, 10\);/, "const heroCategories = publicCategories.slice(0, 10);");
content = content.replace(/const featuredCategories = publicCategories\.slice\(0, 8\);/, "const featuredCategories = publicCategories.slice(0, blockLimit('category_tiles', 8));");
content = content.replace(/const flashProducts = trendingProducts\.slice\(0, 6\);/, "const flashProducts = trendingProducts.slice(0, blockLimit('flash_deals', 6));");
content = content.replace(/const recommendedProducts = trendingProducts\.slice\(6, 16\);/, "const recommendedProducts = trendingProducts.slice(6, 6 + blockLimit('recommended', 10));");

// 4. Update i18n strings in setup
content = content.replace(/const bannerCtaLabel = [^;]+;/, "const bannerCtaLabel = marketplaceSettings?.hub_homepage_banner_cta_label?.trim() || t('nav.explore');");
content = content.replace(/const bannerTitle = [^;]+;/, "const bannerTitle = marketplaceSettings?.hub_homepage_banner_title?.trim() || marketplaceName;");
content = content.replace(/const bannerSubtitle = [^;]+;/, "const bannerSubtitle = marketplaceSettings?.hub_homepage_banner_subtitle?.trim() || tagline;");

// 5. RTL and Dark Mode classes
// main
content = content.replace(/<main className="bg-\[#09090b\] text-white">/, "<main className=\"bg-white dark:bg-[#09090b] text-gray-900 dark:text-white\" dir={dir}>");

// Replace text-white/20 -> text-gray-500 dark:text-white/50 (contrast)
content = content.replace(/text-white\/20/g, "text-gray-500 dark:text-white/60");
content = content.replace(/text-white\/30/g, "text-gray-600 dark:text-white/70");
content = content.replace(/text-white\/40/g, "text-gray-700 dark:text-white/80");
content = content.replace(/text-white\/50/g, "text-gray-700 dark:text-white/80");
content = content.replace(/text-white\/60/g, "text-gray-800 dark:text-white/90");
content = content.replace(/text-white\/70/g, "text-gray-800 dark:text-white/90");
content = content.replace(/text-white\/80/g, "text-gray-900 dark:text-white");
content = content.replace(/text-white\/90/g, "text-gray-900 dark:text-white");
// Except where text-white is explicit on buttons
content = content.replace(/text-white"/g, 'text-white"');

// Fix RTL
content = content.replace(/-left-40/g, "-start-40");
content = content.replace(/-right-20/g, "-end-20");
content = content.replace(/left-1\/2/g, "start-1/2");
content = content.replace(/-translate-x-1\/2/g, "rtl:translate-x-1/2 ltr:-translate-x-1/2");
content = content.replace(/left-3/g, "start-3");
content = content.replace(/right-3/g, "end-3");
content = content.replace(/ml-1\.5/g, "ms-1.5");
content = content.replace(/pl-5/g, "ps-5");

// Deal card dark mode lock
content = content.replace(/bg-\[#18181b\]\/60/g, "bg-gray-100/60 dark:bg-[#18181b]/60");
content = content.replace(/bg-black\/20/g, "bg-gray-200 dark:bg-black/20");
content = content.replace(/from-\[#18181b\]/g, "from-gray-100 dark:from-[#18181b]");
content = content.replace(/bg-white\/\[0\.03\]/g, "bg-gray-100 dark:bg-white/[0.03]");
content = content.replace(/bg-white\/\[0\.02\]/g, "bg-gray-50 dark:bg-white/[0.02]");
content = content.replace(/bg-white\/\[0\.04\]/g, "bg-gray-100 dark:bg-white/[0.04]");
content = content.replace(/bg-white\/5/g, "bg-gray-100 dark:bg-white/5");
content = content.replace(/bg-white\/10/g, "bg-gray-200 dark:bg-white/10");
content = content.replace(/border-white\/\[0\.06\]/g, "border-gray-200 dark:border-white/[0.06]");
content = content.replace(/border-white\/\[0\.08\]/g, "border-gray-200 dark:border-white/[0.08]");
content = content.replace(/border-white\/10/g, "border-gray-200 dark:border-white/10");

content = content.replace(/text-white/g, "text-gray-900 dark:text-white");
// Revert text-gray-900 where it should actually be white (inside gradients)
content = content.replace(/<span className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-\[#ff4747\] to-\[#ff8a00\] px-5 py-3 text-sm font-black text-gray-900 dark:text-white/g, '<span className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4747] to-[#ff8a00] px-5 py-3 text-sm font-black text-white');
content = content.replace(/<span className="text-xl font-black bg-gradient-to-r from-\[#ff4747\] to-\[#ff8a00\] bg-clip-text text-transparent">\{formatPrice\(product\.price\)\}<\/span>\n\s*<span className="ms-1\.5 text-xs font-bold text-gray-700 dark:text-white\/80">\{currency\}<\/span>/, '<span className="text-xl font-black bg-gradient-to-r from-[#ff4747] to-[#ff8a00] bg-clip-text text-transparent">{formatPrice(product.price)}</span>\n            <span className="ms-1.5 text-xs font-bold text-gray-500 dark:text-white/40">{currency}</span>');
content = content.replace(/fill-gray-900 dark:fill-white/g, "fill-white");
content = content.replace(/text-gray-900 dark:text-white shadow-lg/g, "text-white shadow-lg");

// 6. Section block visibility and translation
// FLASH DEALS
content = content.replace(/<section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">/, `{blockById.get('flash_deals')?.enabled !== false && (<section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">`);
content = content.replace(/<h2 className="text-xl font-black text-gray-900 dark:text-white">Flash Deals<\/h2>/, '<h2 className="text-xl font-black text-gray-900 dark:text-white">{blockTitle("flash_deals", t("hub.sections.flashDeals"))}</h2>');
content = content.replace(/<\/section>\n\n\s*\{\/\* ═══════════════════════════════════════\n\s*FEATURED CATEGORIES/m, "</section>)}\n\n      {/* ═══════════════════════════════════════\n          FEATURED CATEGORIES");

// FEATURED CATEGORIES
content = content.replace(/<section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">/, `{blockById.get('category_tiles')?.enabled !== false && (<section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">`);
content = content.replace(/<h2 className="text-xl font-black text-gray-900 dark:text-white">Shop by Category<\/h2>/, '<h2 className="text-xl font-black text-gray-900 dark:text-white">{blockTitle("category_tiles", t("hub.sections.categories"))}</h2>');
content = content.replace(/<\/section>\n\n\s*\{\/\* ═══════════════════════════════════════\n\s*PROMO BANNER/m, "</section>)}\n\n      {/* ═══════════════════════════════════════\n          PROMO BANNER");

// PROMO BANNER
content = content.replace(/<section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">/, `{blockById.get('promo_bar')?.enabled !== false && (<section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">`);
content = content.replace(/<\/section>\n\n\s*\{\/\* ═══════════════════════════════════════\n\s*RECOMMENDED/m, "</section>)}\n\n      {/* ═══════════════════════════════════════\n          RECOMMENDED");

// RECOMMENDED
content = content.replace(/<section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">/, `{blockById.get('recommended')?.enabled !== false && (<section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">`);
content = content.replace(/<h2 className="text-xl font-black text-gray-900 dark:text-white">Just For You<\/h2>/, '<h2 className="text-xl font-black text-gray-900 dark:text-white">{blockTitle("recommended", t("hub.sections.trending"))}</h2>');
content = content.replace(/<\/section>\n\n\s*\{\/\* ═══════════════════════════════════════\n\s*SELLER CTA/m, "</section>)}\n\n      {blockById.get('recently_viewed')?.enabled !== false && <RecentlyViewedRail />}\n\n      {/* ═══════════════════════════════════════\n          SELLER CTA");

// Fix translated texts
content = content.replace(/Super Deal Marketplace/g, "{t('hub.hero.title') || 'Super Deal'}");
content = content.replace(/Live deals/g, "{t('hub.hero.subtitle') || 'Live deals'}");
content = content.replace(/Search products, stores, categories\.\.\./g, "{t('nav.searchPlaceholder')}");
content = content.replace(/Flash deals/g, "{t('hub.sections.flashDeals')}");
content = content.replace(/Categories/g, "{t('hub.sections.categories')}");
content = content.replace(/Verified sellers/g, "{t('hub.valueProps.verified.title')}");
content = content.replace(/Top Categories/g, "{t('hub.sections.categories')}");
content = content.replace(/Browse All/g, "{t('nav.explore')}");
content = content.replace(/Buyer Protection/g, "{t('hub.valueProps.payment.title')}");
content = content.replace(/Fast Delivery/g, "{t('hub.valueProps.fast.title')}");
content = content.replace(/24\/7 Support/g, "{t('hub.valueProps.support.title') || '24/7 Support'}");
content = content.replace(/View All/g, "{t('nav.explore')}");
content = content.replace(/See More/g, "{t('nav.explore')}");
content = content.replace(/Start Selling Today/g, "{t('nav.startSelling')}");
content = content.replace(/Open Your Store/g, "{t('nav.startSelling')}");

fs.writeFileSync('src/components/hub/AliExpress2HomeContent.tsx', content);
