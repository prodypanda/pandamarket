const fs = require('fs');
const path = require('path');

const hubDir = path.join(__dirname, '../frontend/src/components/hub');

const physicalToLogical = {
  'ml-': 'ms-',
  'mr-': 'me-',
  'pl-': 'ps-',
  'pr-': 'pe-',
  'left-': 'start-',
  'right-': 'end-',
  'text-left': 'text-start',
  'text-right': 'text-end',
  'border-l-': 'border-s-',
  'border-r-': 'border-e-',
  'rounded-l-': 'rounded-s-',
  'rounded-r-': 'rounded-e-',
  'rounded-tl-': 'rounded-ss-',
  'rounded-tr-': 'rounded-se-',
  'rounded-bl-': 'rounded-es-',
  'rounded-br-': 'rounded-ee-',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Replace RTL physical properties
  Object.keys(physicalToLogical).forEach(physical => {
    const logical = physicalToLogical[physical];
    // We want to replace word boundaries. e.g. " ml-2 " to " ms-2 "
    // Also "text-left" to "text-start"
    const regex = new RegExp(`(?<=[\\s"'\\\`])(${physical})([a-zA-Z0-9.\\[\\]]+)`, 'g');
    content = content.replace(regex, (match, p1, p2) => {
      // exception: arrow-right or similar? The regex checks for space/quote before it.
      return logical + p2;
    });
  });

  // 2. Translations & hardcoded strings
  // Simple heuristic for Alibaba, Amazon, AliExpress: find pure text nodes and replace.
  // Actually, we'll manually replace known strings for safety, or just leave this to a more targeted replace.
  // We'll replace common ones in Alibaba/Amazon/AliExpress
  
  if (path.basename(filePath) === 'AlibabaHomeContent.tsx' || 
      path.basename(filePath) === 'AmazonHomeContent.tsx' ||
      path.basename(filePath) === 'AliExpressHomeContent.tsx') {
    
    // Add useLocale import if missing
    if (!content.includes('useLocale')) {
      content = content.replace(
        "import { useMarketplaceSettings } from '@/components/store/MarketplaceSettingsProvider';",
        "import { useMarketplaceSettings } from '@/components/store/MarketplaceSettingsProvider';\nimport { useLocale } from '@/components/Providers';"
      );
    }
    
    // Add t to component if missing
    if (content.includes('const { marketplaceSettings } = useMarketplaceSettings();') && !content.includes('const { t, dir } = useLocale();')) {
      content = content.replace(
        'const { marketplaceSettings } = useMarketplaceSettings();',
        'const { marketplaceSettings } = useMarketplaceSettings();\n  const { t, dir } = useLocale();'
      );
    }

    // Replace basic English strings 
    const stringReplacements = {
      '>Deal<': ">{t('hub.deal') || 'Deal'}<",
      '>No image<': ">{t('hub.noImage') || 'No image'}<",
      '>On-time delivery & quality protection<': ">{t('hub.alibaba.protection') || 'On-time delivery & quality protection'}<",
      '>Verified factory OEM/ODM capacity<': ">{t('hub.alibaba.capacity') || 'Verified factory OEM/ODM capacity'}<",
      '>Start Selling Today<': ">{t('nav.startSelling') || 'Start Selling Today'}<",
      '>Open your store on the marketplace and reach thousands of buyers across Tunisia.<': ">{t('hub.startSellingDesc') || 'Open your store on the marketplace and reach thousands of buyers across Tunisia.'}<",
      '>Open Your Store<': ">{t('nav.startSelling') || 'Open Your Store'}<",
      '>View All<': ">{t('nav.viewAll') || 'View All'}<",
      '>See More<': ">{t('nav.seeMore') || 'See More'}<",
      '>Shop by Category<': ">{t('hub.sections.categories') || 'Shop by Category'}<",
      '>Flash Deals<': ">{t('hub.sections.flashDeals') || 'Flash Deals'}<",
      '>Just For You<': ">{t('hub.sections.trending') || 'Just For You'}<",
      '>Limited time offers - Best prices<': ">{t('hub.sections.flashDealsDesc') || 'Limited time offers - Best prices'}<",
      '>Explore our curated collections<': ">{t('hub.sections.categoriesDesc') || 'Explore our curated collections'}<",
      '>Handpicked recommendations<': ">{t('hub.sections.trendingDesc') || 'Handpicked recommendations'}<",
      '>Top Ranking<': ">{t('hub.alibaba.topRanking') || 'Top Ranking'}<",
      '>New Arrivals<': ">{t('hub.alibaba.newArrivals') || 'New Arrivals'}<",
      '>Savings Spotlight<': ">{t('hub.alibaba.savings') || 'Savings Spotlight'}<",
      '>Source Now<': ">{t('hub.alibaba.sourceNow') || 'Source Now'}<",
      '>Browse All<': ">{t('nav.explore') || 'Browse All'}<",
      '"New Arrivals"': "t('hub.alibaba.newArrivals') || 'New Arrivals'",
      '"Top Ranking"': "t('hub.alibaba.topRanking') || 'Top Ranking'",
      '"Savings Spotlight"': "t('hub.alibaba.savings') || 'Savings Spotlight'",
    };

    Object.keys(stringReplacements).forEach(key => {
      content = content.split(key).join(stringReplacements[key]);
    });
    
    // Fix image tag in components
    // Replace <img ... /> with <Image ... />
    if (content.includes('<img ')) {
       // Note: replacing img with Image requires width/height or fill.
       // The user prompt says "Migrate raw <img> tags to next/image or implement lazy loading".
       // Adding loading="lazy" is safer than <Image> if dimensions aren't static.
       content = content.replace(/<img /g, '<img loading="lazy" ');
       // remove double lazy if exists
       content = content.replace(/loading="lazy" loading="lazy"/g, 'loading="lazy"');
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
}

fs.readdirSync(hubDir).forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    processFile(path.join(hubDir, file));
  }
});
